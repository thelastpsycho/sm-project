import type { VercelRequest, VercelResponse } from '@vercel/node'
import {
  computeKpis,
  ownerLeaderboard,
  attentionList,
  activityInWindow,
  formatMoney,
  type WindowActivity,
  type Kpis,
  type OwnerRow,
  type Attention
} from '../../src/lib/crmReport.js'
import { baliWeekWindow } from '../../src/lib/time.js'
import type { Deal, PipelineEvent } from '../../src/types/crm'
import {
  db,
  loadDeals,
  loadEventsSince,
  authorized,
  mailer,
  sendMail,
  APP_URL,
  escapeHtml,
  shell,
  section,
  statRow,
  alertTable
} from './_shared.js'

// Team-report recipients: managers/admins (plus the admin-email fallback, mirrored from
// crmUtils.ADMIN_EMAILS — which can't be imported here because of its `@/` alias chain).
const ADMIN_EMAILS = ['andikrisnatha@theanvayabali.com']
function isTeamRecipient(u: Record<string, any>): boolean {
  const role = u.role
  return role === 'manager' || role === 'admin' || (u.email && ADMIN_EMAILS.includes(u.email))
}

const pct = (x: number) => `${Math.round(x * 100)}%`

function activityBlock(title: string, act: WindowActivity): string {
  return section(
    title,
    statRow([
      { label: 'New', value: String(act.newCount) },
      { label: 'Won', value: String(act.wonCount) },
      { label: 'Lost', value: String(act.lostCount) },
      { label: 'Booked', value: formatMoney(act.wonValue) }
    ])
  )
}

function healthBlock(title: string, k: Kpis): string {
  return section(
    title,
    statRow([
      { label: 'Open value', value: formatMoney(k.openValue) },
      { label: 'Forecast', value: formatMoney(k.weighted) },
      { label: 'Win rate', value: pct(k.winRateValue) }
    ])
  )
}

function attentionBlock(att: Attention): string {
  const arrivals = att.upcomingArrivals.length
    ? `<p style="font-size:13px;color:#555;margin:8px 0 0">Arriving soon: ${att.upcomingArrivals
        .slice(0, 8)
        .map(d => escapeHtml(d.company))
        .join(', ')}</p>`
    : ''
  return section('Needs attention', alertTable(att.alerts.slice(0, 12)) + arrivals)
}

function leaderboardBlock(rows: OwnerRow[]): string {
  const body = rows
    .slice(0, 12)
    .map(
      r => `<tr>
        <td style="padding:8px 10px;border-bottom:1px solid #eee">${escapeHtml(r.owner)}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #eee;text-align:right">${r.count}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #eee;text-align:right">${escapeHtml(formatMoney(r.value))}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #eee;text-align:right">${r.won}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #eee;text-align:right">${pct(r.winRate)}</td>
      </tr>`
    )
    .join('')
  const head = `<tr>
    <th style="text-align:left;padding:8px 10px;font-size:11px;color:#777;text-transform:uppercase">Owner</th>
    <th style="text-align:right;padding:8px 10px;font-size:11px;color:#777;text-transform:uppercase">Deals</th>
    <th style="text-align:right;padding:8px 10px;font-size:11px;color:#777;text-transform:uppercase">Value</th>
    <th style="text-align:right;padding:8px 10px;font-size:11px;color:#777;text-transform:uppercase">Won</th>
    <th style="text-align:right;padding:8px 10px;font-size:11px;color:#777;text-transform:uppercase">Win %</th>
  </tr>`
  return section(
    'Owner leaderboard',
    `<table style="width:100%;border-collapse:collapse;border:1px solid #eee;border-radius:8px;overflow:hidden">${head}${body}</table>`
  )
}

function buildRepWeekly(name: string, act: WindowActivity, k: Kpis, att: Attention) {
  const subject = `Your week: ${act.wonCount} won · ${k.open} open · ${formatMoney(k.openValue)}`
  const html = shell(
    `Hi ${name || 'there'},`,
    "Here's how your pipeline moved last week.",
    activityBlock("This week's activity", act) + healthBlock('Pipeline health', k) + attentionBlock(att)
  )
  const text =
    `Hi ${name || 'there'},\n\nLast week: ${act.newCount} new · ${act.wonCount} won · ${act.lostCount} lost · ${formatMoney(act.wonValue)} booked.\n` +
    `Open value ${formatMoney(k.openValue)} · forecast ${formatMoney(k.weighted)} · win rate ${pct(k.winRateValue)}.` +
    (APP_URL ? `\n\nOpen your pipeline: ${APP_URL}/crm` : '')
  return { subject, html, text }
}

function buildTeamWeekly(
  name: string,
  personal: { act: WindowActivity; k: Kpis },
  team: { act: WindowActivity; k: Kpis; att: Attention; board: OwnerRow[] }
) {
  const subject = `Team week: ${team.act.wonCount} won · ${team.act.lostCount} lost · ${formatMoney(team.act.wonValue)} booked`
  const personalBlock = section(
    'Your week',
    statRow([
      { label: 'Won', value: String(personal.act.wonCount) },
      { label: 'Open value', value: formatMoney(personal.k.openValue) }
    ])
  )
  const html = shell(
    `Hi ${name || 'there'},`,
    "Here's the team's pipeline for last week.",
    personalBlock +
      activityBlock("Team activity", team.act) +
      healthBlock('Team pipeline health', team.k) +
      leaderboardBlock(team.board) +
      attentionBlock(team.att)
  )
  const text =
    `Hi ${name || 'there'},\n\nTeam last week: ${team.act.newCount} new · ${team.act.wonCount} won · ${team.act.lostCount} lost · ${formatMoney(team.act.wonValue)} booked.\n` +
    `Team open value ${formatMoney(team.k.openValue)} · forecast ${formatMoney(team.k.weighted)} · win rate ${pct(team.k.winRateValue)}.\n\n` +
    'Leaderboard:\n' +
    team.board
      .slice(0, 12)
      .map(r => `• ${r.owner}: ${r.count} deals, ${formatMoney(r.value)}, ${r.won} won (${pct(r.winRate)})`)
      .join('\n') +
    (APP_URL ? `\n\nOpen your pipeline: ${APP_URL}/crm` : '')
  return { subject, html, text }
}

/**
 * Weekly Vercel Cron job (Monday morning): emails a summary of the just-completed Bali week.
 * Reps get their own; managers/admins get a team-wide roll-up (with a personal section on
 * top, so nobody receives two). Email only — push stays for the daily urgent alerts.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!authorized(req, res)) return

  const store = db()
  const now = new Date()
  const { startMs, endMs } = baliWeekWindow(now)

  const deals: Deal[] = await loadDeals(store)
  const events: PipelineEvent[] = await loadEventsSince(store, startMs)
  const usersSnap = await store.collection('users').get()
  const transport = mailer()
  if (!transport) return res.status(200).json({ ok: true, emailsSent: 0, note: 'Email not configured' })

  // Team-wide aggregates (computed once, reused for every manager/admin).
  const teamAct = activityInWindow(events, startMs, endMs)
  const teamKpis = computeKpis(deals)
  const teamAtt = attentionList(deals, now)
  const board = ownerLeaderboard(deals)

  let emailsSent = 0

  for (const userDoc of usersSnap.docs) {
    const u = userDoc.data() as Record<string, any>
    if ((u.status || 'active') === 'disabled') continue
    const email: string = u.email
    if (!email) continue

    const mine = deals.filter(d => d.ownerId === email)
    const myIds = new Set(mine.map(d => d.id))
    const myAct = activityInWindow(events, startMs, endMs, myIds)
    const myKpis = computeKpis(mine)

    const msg = isTeamRecipient(u)
      ? buildTeamWeekly(u.name || '', { act: myAct, k: myKpis }, { act: teamAct, k: teamKpis, att: teamAtt, board })
      : buildRepWeekly(u.name || '', myAct, myKpis, attentionList(mine, now))

    try {
      await sendMail(transport, email, msg.subject, msg.html, msg.text)
      emailsSent++
    } catch (err) {
      console.error(`Failed to email ${email}:`, err)
    }
  }

  return res.status(200).json({ ok: true, emailsSent })
}
