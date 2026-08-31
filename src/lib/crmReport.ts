// Framework-agnostic pipeline REPORTING engine.
// Imported by BOTH the Vue app (report page, future) and the Vercel cron functions
// (daily + weekly email reports), so — like `crmAlerts.ts` — it must stay free of Vue,
// Firestore and `@/` path aliases: pure functions over plain data, relative imports only.

import type { Deal, DealStage, PipelineEvent } from '../types/crm.js'
import type { Alert } from './crmAlerts.js'
import { computeDealAlerts, DEFAULT_ALERT_CONFIG } from './crmAlerts.js'
import { toBaliISO } from './time.js'

// ---- tiny helpers (kept inline to avoid pulling `@/`-aliased crmUtils into the api build) ----

/** Derived outcome from the single stage axis. Confirmed → won, Lost → lost, else open. */
function outcome(deal: Pick<Deal, 'stage'>): 'open' | 'won' | 'lost' {
  const stage = (deal.stage ?? 'New') as DealStage
  if (stage === 'Confirmed') return 'won'
  if (stage === 'Lost') return 'lost'
  return 'open'
}

/** The value to attribute to a deal: booked value for won deals, else the estimate. */
function dealValue(deal: Deal): number {
  return outcome(deal) === 'won' ? deal.actualRevenue ?? deal.totalRevenue ?? 0 : deal.totalRevenue ?? 0
}

/** Compact IDR-style money formatting (no decimals). Mirrors crmUtils.formatMoney. */
export function formatMoney(value?: number, currency = 'IDR'): string {
  if (value == null) return '—'
  return `${currency} ${Math.round(value).toLocaleString('en-US')}`
}

// Stage win-probability for the weighted forecast (ported from PipelineReport.vue).
const STAGE_PROB: Record<DealStage, number> = {
  New: 0.1,
  Proposal: 0.3,
  Negotiation: 0.5,
  Contract: 0.8,
  Confirmed: 1,
  Lost: 0
}

// ---- KPIs (snapshot over whatever deal set is passed in) ----

export interface Kpis {
  count: number
  open: number
  openValue: number
  won: number
  wonValue: number
  lost: number
  lostValue: number
  totalValue: number
  winRateCount: number // won / (won + lost), by count
  winRateValue: number // wonValue / decidedValue
  weighted: number // stage-probability-weighted open forecast
  avgDeal: number
}

export function computeKpis(deals: Deal[]): Kpis {
  const open = deals.filter(d => outcome(d) === 'open')
  const won = deals.filter(d => outcome(d) === 'won')
  const lost = deals.filter(d => outcome(d) === 'lost')
  const sum = (list: Deal[]) => list.reduce((s, d) => s + dealValue(d), 0)
  const wonValue = sum(won)
  const lostValue = sum(lost)
  const decided = won.length + lost.length
  const decidedValue = wonValue + lostValue
  const totalValue = sum(deals)
  const weighted = open.reduce(
    (s, d) => s + (d.totalRevenue ?? 0) * (STAGE_PROB[(d.stage ?? 'New') as DealStage] ?? 0),
    0
  )
  return {
    count: deals.length,
    open: open.length,
    openValue: sum(open),
    won: won.length,
    wonValue,
    lost: lost.length,
    lostValue,
    totalValue,
    winRateCount: decided ? won.length / decided : 0,
    winRateValue: decidedValue ? wonValue / decidedValue : 0,
    weighted,
    avgDeal: deals.length ? totalValue / deals.length : 0
  }
}

// ---- Stage funnel (point-in-time counts + value per stage) ----

export interface StageRow {
  stage: DealStage
  count: number
  value: number
}

export function stageFunnel(deals: Deal[]): StageRow[] {
  const order: DealStage[] = ['New', 'Proposal', 'Negotiation', 'Contract', 'Confirmed', 'Lost']
  return order.map(stage => {
    const inStage = deals.filter(d => (d.stage ?? 'New') === stage)
    return { stage, count: inStage.length, value: inStage.reduce((s, d) => s + dealValue(d), 0) }
  })
}

// ---- Owner leaderboard ----

export interface OwnerRow {
  owner: string
  count: number
  value: number
  won: number
  wonValue: number
  winRate: number
}

export function ownerLeaderboard(deals: Deal[]): OwnerRow[] {
  const map = new Map<string, OwnerRow>()
  for (const d of deals) {
    const owner = d.ownerName || d.ownerId || 'Unassigned'
    let r = map.get(owner)
    if (!r) {
      r = { owner, count: 0, value: 0, won: 0, wonValue: 0, winRate: 0 }
      map.set(owner, r)
    }
    r.count++
    r.value += dealValue(d)
    const o = outcome(d)
    if (o === 'won') {
      r.won++
      r.wonValue += dealValue(d)
    }
  }
  for (const r of map.values()) {
    const decided = deals.filter(
      d => (d.ownerName || d.ownerId || 'Unassigned') === r.owner && outcome(d) !== 'open'
    ).length
    r.winRate = decided ? r.won / decided : 0
  }
  return [...map.values()].sort((a, b) => b.value - a.value)
}

// ---- Attention list: alerts + upcoming arrivals ----

export interface Attention {
  alerts: Alert[] // aging / stuck / action-due / arrival-risk, most-urgent first
  upcomingArrivals: Deal[] // open deals arriving within the next `withinDays` days
}

const SEVERITY_RANK: Record<Alert['severity'], number> = { danger: 0, warning: 1, info: 2 }

export function attentionList(deals: Deal[], now: Date = new Date(), withinDays = 14): Attention {
  const alerts = deals
    .flatMap(d => computeDealAlerts(d, DEFAULT_ALERT_CONFIG, now))
    .sort((a, b) => {
      const s = SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]
      return s !== 0 ? s : b.since.localeCompare(a.since)
    })
  const lo = toBaliISO(now)
  const hi = toBaliISO(now.getTime() + withinDays * 86_400_000)
  const upcomingArrivals = deals
    .filter(d => outcome(d) === 'open' && d.arrivalDate && d.arrivalDate >= lo && d.arrivalDate <= hi)
    .sort((a, b) => (a.arrivalDate ?? '').localeCompare(b.arrivalDate ?? ''))
  return { alerts, upcomingArrivals }
}

// ---- Window activity from pipelineEvents (the reliable won/lost/booked source) ----

export interface WindowActivity {
  newCount: number // deals created in the window (type: 'created')
  wonCount: number
  wonValue: number // sum of valueAtChange for stage → Confirmed
  lostCount: number
  lostValue: number // sum of valueAtChange for stage → Lost
}

/**
 * Aggregate pipeline events whose `at` falls in `[startMs, endMs)`. Pass `dealIds` to scope
 * to one rep's deals (events carry `dealId`, not owner) — omit for a team-wide roll-up.
 */
export function activityInWindow(
  events: PipelineEvent[],
  startMs: number,
  endMs: number,
  dealIds?: Set<string>
): WindowActivity {
  const act: WindowActivity = { newCount: 0, wonCount: 0, wonValue: 0, lostCount: 0, lostValue: 0 }
  for (const e of events) {
    const t = e.at instanceof Date ? e.at.getTime() : new Date(e.at as any).getTime()
    if (isNaN(t) || t < startMs || t >= endMs) continue
    if (dealIds && !dealIds.has(e.dealId)) continue
    if (e.type === 'created') act.newCount++
    if (e.to === 'Confirmed') {
      act.wonCount++
      act.wonValue += e.valueAtChange ?? 0
    } else if (e.to === 'Lost') {
      act.lostCount++
      act.lostValue += e.valueAtChange ?? 0
    }
  }
  return act
}
