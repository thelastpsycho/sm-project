// Shared plumbing for the cron report jobs (daily notify + weekly report).
// `_`-prefixed so Vercel does NOT treat this as a routable serverless function.

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getApps, initializeApp, cert } from 'firebase-admin/app'
import { getFirestore, type Firestore } from 'firebase-admin/firestore'
import * as nodemailer from 'nodemailer'
import type { Deal, PipelineEvent } from '../../src/types/crm'
import type { Alert } from '../../src/lib/crmAlerts'

// ---- Firebase Admin ----

export function db(): Firestore {
  if (!getApps().length) {
    const svc = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '{}')
    initializeApp({ credential: cert(svc) })
  }
  return getFirestore()
}

/** Load all deals, mapping Firestore Timestamps to JS Dates. */
export async function loadDeals(store: Firestore): Promise<Deal[]> {
  const snap = await store.collection('deals').get()
  return snap.docs.map(d => {
    const data = d.data() as Record<string, any>
    return {
      id: d.id,
      ...data,
      createdAt: data.createdAt?.toDate?.() ?? new Date(0),
      updatedAt: data.updatedAt?.toDate?.() ?? new Date(0)
    } as Deal
  })
}

/** Load pipeline events at/after `startMs` (the reliable won/lost/booked history). */
export async function loadEventsSince(store: Firestore, startMs: number): Promise<PipelineEvent[]> {
  const snap = await store.collection('pipelineEvents').where('at', '>=', new Date(startMs)).get()
  return snap.docs.map(d => {
    const data = d.data() as Record<string, any>
    return { id: d.id, ...data, at: data.at?.toDate?.() ?? new Date(0) } as PipelineEvent
  })
}

// ---- Cron auth ----

/** Guard against public access. Returns true if authorized; writes 401 and returns false if not. */
export function authorized(req: VercelRequest, res: VercelResponse): boolean {
  const secret = process.env.CRON_SECRET
  if (secret && req.headers['authorization'] !== `Bearer ${secret}`) {
    res.status(401).json({ error: 'Unauthorized' })
    return false
  }
  return true
}

// ---- Email (Gmail SMTP) ----

// Absolute base for links inside emails (email clients can't resolve relative paths).
export const APP_URL = (
  process.env.APP_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '')
).replace(/\/$/, '')

let cachedTransport: nodemailer.Transporter | null | undefined
/** Cached Gmail transport, or null when credentials aren't configured (jobs still run). */
export function mailer(): nodemailer.Transporter | null {
  if (cachedTransport !== undefined) return cachedTransport
  const user = process.env.GMAIL_USER
  const pass = process.env.GMAIL_APP_PASSWORD
  cachedTransport =
    user && pass
      ? nodemailer.createTransport({ service: 'gmail', auth: { user, pass } })
      : null
  return cachedTransport
}

export async function sendMail(
  transport: nodemailer.Transporter,
  to: string,
  subject: string,
  html: string,
  text: string
): Promise<void> {
  await transport.sendMail({ from: `Pipeline <${process.env.GMAIL_USER}>`, to, subject, html, text })
}

// ---- HTML primitives (shared look across daily + weekly reports) ----

export const SEVERITY_COLOR: Record<'danger' | 'warning' | 'info', string> = {
  danger: '#dc2626',
  warning: '#d97706',
  info: '#2563eb'
}

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string
  )
}

/** Wrap section/body HTML in the standard centered email container. */
export function shell(heading: string, intro: string, bodyHtml: string): string {
  return `<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:600px;margin:0 auto;color:#111">
    <h2 style="margin:0 0 4px">${escapeHtml(heading)}</h2>
    <p style="color:#555;margin:0 0 20px">${escapeHtml(intro)}</p>
    ${bodyHtml}
    ${APP_URL ? button(`${APP_URL}/crm`, 'Open your pipeline') : ''}
    <p style="color:#999;font-size:12px;margin-top:24px">You're receiving this because you have active deals in the pipeline.</p>
  </div>`
}

/** A titled section block. */
export function section(title: string, innerHtml: string): string {
  return `<div style="margin:0 0 20px">
    <h3 style="margin:0 0 8px;font-size:15px;color:#111">${escapeHtml(title)}</h3>
    ${innerHtml}
  </div>`
}

/** A row of stat tiles, e.g. [{label:'Won', value:'3'}, …]. */
export function statRow(stats: Array<{ label: string; value: string }>): string {
  const cells = stats
    .map(
      s => `<td style="padding:10px 12px;border:1px solid #eee;border-radius:8px;text-align:center">
        <div style="font-size:18px;font-weight:700;color:#111">${escapeHtml(s.value)}</div>
        <div style="font-size:11px;color:#777;text-transform:uppercase;letter-spacing:.03em;margin-top:2px">${escapeHtml(s.label)}</div>
      </td>`
    )
    .join('<td style="width:8px"></td>')
  return `<table style="width:100%;border-collapse:separate;border-spacing:0"><tr>${cells}</tr></table>`
}

export function button(href: string, label: string): string {
  return `<p style="margin:20px 0"><a href="${href}" style="background:#111;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none;font-size:14px">${escapeHtml(label)}</a></p>`
}

/** A table of alerts (severity dot + linked company + message), or an all-clear line. */
export function alertTable(alerts: Alert[]): string {
  if (!alerts.length) {
    return `<p style="color:#16a34a;font-size:14px;margin:0">✅ Nothing needs attention.</p>`
  }
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
  return `<table style="width:100%;border-collapse:collapse;border:1px solid #eee;border-radius:8px;overflow:hidden">${rows}</table>`
}
