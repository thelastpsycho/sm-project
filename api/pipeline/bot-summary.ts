// Compact pipeline snapshot for the Telegram chat bot (n8n AI Agent).
// Pre-aggregates everything server-side so the LLM only ever sees a small JSON
// blob instead of raw deal dumps — keeps every chat turn cheap regardless of
// how many deals/events exist. Guarded by PIPELINE_BOT_SECRET (mirrors CRON_SECRET).

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { computeKpis, stageFunnel, activityInWindow, attentionList } from '../../src/lib/crmReport.js'
import { baliToday, baliDateParts, baliDayWindow, baliWeekWindow, baliMonthWindow } from '../../src/lib/time.js'
import type { Deal, PipelineEvent } from '../../src/types/crm.js'
import { db, loadDeals, loadEventsSince } from '../cron/_shared.js'
import { botAuthorized, outcome, dealValue } from './_shared.js'

/** Deals whose arrivalDate falls within a given calendar month, split by outcome. */
function monthArrivals(deals: Deal[], year: number, monthIndex: number) {
  const start = `${year}-${String(monthIndex + 1).padStart(2, '0')}-01`
  const end = new Date(Date.UTC(year, monthIndex + 1, 1)).toISOString().slice(0, 10)
  const inMonth = deals.filter(d => d.arrivalDate && d.arrivalDate >= start && d.arrivalDate < end)
  const rooms = (l: Deal[]) => l.reduce((s, d) => s + (d.rooms ?? 0), 0)
  const value = (l: Deal[]) => l.reduce((s, d) => s + dealValue(d), 0)
  const won = inMonth.filter(d => outcome(d) === 'won')
  const open = inMonth.filter(d => outcome(d) === 'open')
  const lost = inMonth.filter(d => outcome(d) === 'lost')
  return {
    month: start.slice(0, 7),
    confirmed: { count: won.length, rooms: rooms(won), revenue: value(won) },
    pipeline: { count: open.length, rooms: rooms(open), revenue: value(open) },
    lost: lost.length
  }
}

/** Company names for pipeline events of type 'created' inside [startMs, endMs). */
function leadsCreatedInWindow(events: PipelineEvent[], startMs: number, endMs: number): string[] {
  return events
    .filter(e => e.type === 'created')
    .filter(e => {
      const t = e.at instanceof Date ? e.at.getTime() : new Date(e.at as any).getTime()
      return t >= startMs && t < endMs
    })
    .map(e => e.company)
}

/** Deals created inside [startMs, endMs), grouped by owner — count/value/won for that window. */
function ownerActivity(deals: Deal[], startMs: number, endMs: number) {
  const inWindow = deals.filter(d => {
    const t = d.createdAt instanceof Date ? d.createdAt.getTime() : new Date(d.createdAt as any).getTime()
    return t >= startMs && t < endMs
  })
  const map = new Map<string, { owner: string; count: number; value: number; won: number; wonValue: number }>()
  for (const d of inWindow) {
    const owner = d.ownerName || d.ownerId || 'Unassigned'
    const r = map.get(owner) ?? { owner, count: 0, value: 0, won: 0, wonValue: 0 }
    r.count++
    r.value += dealValue(d)
    if (outcome(d) === 'won') {
      r.won++
      r.wonValue += dealValue(d)
    }
    map.set(owner, r)
  }
  return [...map.values()].sort((a, b) => b.count - a.count)
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!botAuthorized(req, res)) return

  const store = db()
  const now = new Date()
  const { year, monthIndex } = baliDateParts(now)

  const day = baliDayWindow(now)
  const yesterday = baliDayWindow(now.getTime() - 86_400_000)
  const week = baliWeekWindow(now)
  const priorWeek = baliWeekWindow(now.getTime() - 7 * 86_400_000)
  const thisMonth = baliMonthWindow(now)
  const lastMonth = baliMonthWindow(now, -1)

  // One events read covers every window above (lastMonth.startMs is the oldest bound).
  const [deals, events]: [Deal[], PipelineEvent[]] = await Promise.all([
    loadDeals(store),
    loadEventsSince(store, lastMonth.startMs)
  ])

  const kpis = computeKpis(deals)
  const att = attentionList(deals, now, 14)

  const windowBlock = (startMs: number, endMs: number) => ({
    ...activityInWindow(events, startMs, endMs),
    companies: leadsCreatedInWindow(events, startMs, endMs).slice(0, 20)
  })

  const arrivalsByMonth = [-1, 0, 1, 2, 3].map(offset => {
    const d = new Date(Date.UTC(year, monthIndex + offset, 1))
    return monthArrivals(deals, d.getUTCFullYear(), d.getUTCMonth())
  })

  res.status(200).json({
    today: baliToday(),
    kpis: {
      open: kpis.open,
      openValue: kpis.openValue,
      won: kpis.won,
      wonValue: kpis.wonValue,
      lost: kpis.lost,
      lostValue: kpis.lostValue,
      winRateValue: kpis.winRateValue,
      weightedForecast: kpis.weighted,
      avgDeal: kpis.avgDeal
    },
    stageFunnel: stageFunnel(deals),
    activity: {
      today: windowBlock(day.startMs, day.endMs),
      yesterday: windowBlock(yesterday.startMs, yesterday.endMs),
      thisWeek: windowBlock(week.startMs, week.endMs),
      lastWeek: windowBlock(priorWeek.startMs, priorWeek.endMs),
      thisMonth: windowBlock(thisMonth.startMs, thisMonth.endMs),
      lastMonth: windowBlock(lastMonth.startMs, lastMonth.endMs)
    },
    ownersThisMonth: ownerActivity(deals, thisMonth.startMs, thisMonth.endMs),
    arrivalsByMonth,
    attention: {
      alertCount: att.alerts.length,
      topAlerts: att.alerts.slice(0, 8).map(a => ({ company: a.company, message: a.message, severity: a.severity })),
      upcomingArrivals: att.upcomingArrivals.slice(0, 10).map(d => ({
        company: d.company,
        arrivalDate: d.arrivalDate,
        rooms: d.rooms ?? 0,
        stage: d.stage ?? 'New',
        value: dealValue(d)
      }))
    },
    currency: deals[0]?.currency || 'IDR'
  })
}
