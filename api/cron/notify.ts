import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getApps, initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { getMessaging } from 'firebase-admin/messaging'
import * as nodemailer from 'nodemailer'
import { computeUserAlerts, DEFAULT_ALERT_CONFIG } from '../../src/lib/crmAlerts'
import type { Alert } from '../../src/lib/crmAlerts'
import type { Deal } from '../../src/types/crm'

function db() {
  if (!getApps().length) {
    const svc = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '{}')
    initializeApp({ credential: cert(svc) })
  }
  return getFirestore()
}

// Absolute base for links inside the email (push uses relative links, but email
// clients need a full URL). Set APP_URL in Vercel; falls back to the deploy URL.
const APP_URL = (
  process.env.APP_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '')
).replace(/\/$/, '')

// Gmail SMTP transport, built once. Returns null if credentials aren't configured
// yet, so the cron still runs (push only) until GMAIL_USER/GMAIL_APP_PASSWORD are set.
let cachedTransport: nodemailer.Transporter | null | undefined
function mailer(): nodemailer.Transporter | null {
  if (cachedTransport !== undefined) return cachedTransport
  const user = process.env.GMAIL_USER
  const pass = process.env.GMAIL_APP_PASSWORD
  cachedTransport =
    user && pass
      ? nodemailer.createTransport({ service: 'gmail', auth: { user, pass } })
      : null
  return cachedTransport
}

const SEVERITY_COLOR: Record<Alert['severity'], string> = {
  danger: '#dc2626',
  warning: '#d97706',
  info: '#2563eb'
}

/** Build the per-user daily digest email (HTML + plain-text fallback). */
function buildDigest(name: string, alerts: Alert[]): { subject: string; html: string; text: string } {
  const count = alerts.length
  const subject = `Your pipeline: ${count} deal${count === 1 ? '' : 's'} need${count === 1 ? 's' : ''} attention`

  const rows = alerts
    .map(a => {
      const href = APP_URL ? `${APP_URL}/crm?deal=${a.dealId}` : '#'
      return `<tr>
        <td style="padding:10px 12px;border-bottom:1px solid #eee;vertical-align:top">
          <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${SEVERITY_COLOR[a.severity]};margin-right:8px"></span>
          <a href="${href}" style="color:#111;text-decoration:none;font-weight:600">${escapeHtml(a.company)}</a>
          <div style="color:#555;font-size:13px;margin-top:2px">${escapeHtml(a.message)}</div>
        </td>
      </tr>`
    })
    .join('')

  const html = `<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:560px;margin:0 auto;color:#111">
    <h2 style="margin:0 0 4px">Hi ${escapeHtml(name || 'there')},</h2>
    <p style="color:#555;margin:0 0 16px">Here's your pipeline for today — ${count} item${count === 1 ? '' : 's'} that need a look.</p>
    <table style="width:100%;border-collapse:collapse;border:1px solid #eee;border-radius:8px;overflow:hidden">${rows}</table>
    ${APP_URL ? `<p style="margin:20px 0"><a href="${APP_URL}/crm" style="background:#111;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none;font-size:14px">Open your pipeline</a></p>` : ''}
    <p style="color:#999;font-size:12px;margin-top:24px">You're receiving this because you have active deals in the pipeline.</p>
  </div>`

  const text =
    `Hi ${name || 'there'},\n\nYour pipeline today — ${count} item(s):\n\n` +
    alerts.map(a => `• ${a.company}: ${a.message}`).join('\n') +
    (APP_URL ? `\n\nOpen your pipeline: ${APP_URL}/crm` : '')

  return { subject, html, text }
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string
  )
}

/**
 * Daily Vercel Cron job: compute each active user's pipeline alerts and push them.
 * Guarded by CRON_SECRET (Vercel Cron sends it as `Authorization: Bearer <secret>`).
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const secret = process.env.CRON_SECRET
  if (secret && req.headers['authorization'] !== `Bearer ${secret}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const store = db()
  const now = new Date()

  const dealsSnap = await store.collection('deals').get()
  const deals: Deal[] = dealsSnap.docs.map(d => {
    const data = d.data() as Record<string, any>
    return {
      id: d.id,
      ...data,
      createdAt: data.createdAt?.toDate?.() ?? new Date(0),
      updatedAt: data.updatedAt?.toDate?.() ?? new Date(0)
    } as Deal
  })

  const usersSnap = await store.collection('users').get()
  const messaging = getMessaging()
  const transport = mailer()
  let usersNotified = 0
  let messagesSent = 0
  let emailsSent = 0

  for (const userDoc of usersSnap.docs) {
    const u = userDoc.data() as Record<string, any>
    if ((u.status || 'active') === 'disabled') continue
    const email: string = u.email
    if (!email) continue

    const alerts = computeUserAlerts(deals, email, DEFAULT_ALERT_CONFIG, now)
    if (alerts.length === 0) continue

    // 1. Email digest — reaches any active user with alerts (no device token needed).
    if (transport) {
      try {
        const { subject, html, text } = buildDigest(u.name || '', alerts)
        await transport.sendMail({
          from: `Pipeline <${process.env.GMAIL_USER}>`,
          to: email,
          subject,
          html,
          text
        })
        emailsSent++
      } catch (err) {
        console.error(`Failed to email ${email}:`, err)
      }
    }

    // 2. Push — only for users who registered a device token.
    const tokens: string[] = Array.isArray(u.fcmTokens) ? u.fcmTokens : []
    if (tokens.length === 0) continue

    const top = alerts[0]
    const link = `/crm?deal=${top.dealId}`
    const resp = await messaging.sendEachForMulticast({
      tokens,
      notification: {
        title: `${alerts.length} pipeline alert${alerts.length === 1 ? '' : 's'}`,
        body: top.message
      },
      data: { url: link },
      webpush: { fcmOptions: { link } }
    })
    messagesSent += resp.successCount
    usersNotified++

    // Prune tokens that are no longer valid.
    const invalid: string[] = []
    resp.responses.forEach((r, i) => {
      if (!r.success) {
        const code = r.error?.code || ''
        if (
          code.includes('registration-token-not-registered') ||
          code.includes('invalid-registration-token') ||
          code.includes('invalid-argument')
        ) {
          invalid.push(tokens[i])
        }
      }
    })
    if (invalid.length) {
      await userDoc.ref.update({ fcmTokens: tokens.filter(t => !invalid.includes(t)) })
    }
  }

  return res.status(200).json({ ok: true, usersNotified, messagesSent, emailsSent })
}
