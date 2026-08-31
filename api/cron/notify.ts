import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getMessaging } from 'firebase-admin/messaging'
import { computeUserAlerts, DEFAULT_ALERT_CONFIG } from '../../src/lib/crmAlerts.js'
import { activityInWindow } from '../../src/lib/crmReport.js'
import { baliToday, baliDayWindow, toBaliISO } from '../../src/lib/time.js'
import type { Deal } from '../../src/types/crm.js'
import {
  db,
  loadDeals,
  loadEventsSince,
  loadRoleMatrix,
  roleGrants,
  authorized,
  mailer,
  sendMail,
  APP_URL,
  shell,
  section,
  statRow,
  alertTable
} from './_shared.js'

/** Small "today's numbers" block shown above the alerts in the daily email. */
function buildDaily(name: string, stats: { created: number; won: number; due: number }, alerts: ReturnType<typeof computeUserAlerts>) {
  const count = alerts.length
  const subject = `Your pipeline: ${count} deal${count === 1 ? '' : 's'} need${count === 1 ? 's' : ''} attention`
  const statsBlock = section(
    "Today's numbers",
    statRow([
      { label: 'Created today', value: String(stats.created) },
      { label: 'Won today', value: String(stats.won) },
      { label: 'Actions due today', value: String(stats.due) }
    ])
  )
  const alertsBlock = section('Needs attention', alertTable(alerts))
  const html = shell(
    `Hi ${name || 'there'},`,
    `Here's your pipeline for today — ${count} item${count === 1 ? '' : 's'} that need a look.`,
    statsBlock + alertsBlock
  )
  const text =
    `Hi ${name || 'there'},\n\n` +
    `Today: ${stats.created} created · ${stats.won} won · ${stats.due} actions due.\n\n` +
    (count ? alerts.map(a => `• ${a.company}: ${a.message}`).join('\n') : 'Nothing needs attention.') +
    (APP_URL ? `\n\nOpen your pipeline: ${APP_URL}/crm` : '')
  return { subject, html, text }
}

/**
 * Daily Vercel Cron job: per-rep pipeline digest — a "today's numbers" summary plus the
 * user's active alerts — delivered by email (any active user) and push (token holders).
 * Guarded by CRON_SECRET.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!authorized(req, res)) return

  const store = db()
  const now = new Date()
  const today = baliToday()
  const day = baliDayWindow(now)

  const deals: Deal[] = await loadDeals(store)
  const todaysEvents = await loadEventsSince(store, day.startMs)
  const matrix = await loadRoleMatrix(store)
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

    const mine = deals.filter(d => d.ownerId === email)
    const alerts = computeUserAlerts(deals, email, DEFAULT_ALERT_CONFIG, now)

    // Today's numbers for this rep.
    const myDealIds = new Set(mine.map(d => d.id))
    const wonToday = activityInWindow(todaysEvents, day.startMs, day.endMs, myDealIds).wonCount
    const stats = {
      created: mine.filter(d => toBaliISO(d.createdAt) === today).length,
      won: wonToday,
      due: mine.filter(d => d.actionDueDate === today && (d.stage ?? 'New') !== 'Confirmed' && (d.stage ?? 'New') !== 'Lost').length
    }

    const hasContent = alerts.length > 0 || stats.created > 0 || stats.won > 0 || stats.due > 0

    // 1. Email digest — only for roles granted `reports:daily`, and only when there's
    //    something to report. Push (below) stays independent of this permission.
    if (transport && hasContent && roleGrants(matrix, u, 'reports:daily')) {
      try {
        const { subject, html, text } = buildDaily(u.name || '', stats, alerts)
        await sendMail(transport, email, subject, html, text)
        emailsSent++
      } catch (err) {
        console.error(`Failed to email ${email}:`, err)
      }
    }

    // 2. Push — only for users who registered a device token, and only when there are alerts.
    const tokens: string[] = Array.isArray(u.fcmTokens) ? u.fcmTokens : []
    if (tokens.length === 0 || alerts.length === 0) continue

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
