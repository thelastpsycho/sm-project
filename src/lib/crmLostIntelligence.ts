import type { Deal, DealStage, PipelineEvent } from '../types/crm.js'

export interface LostBreakdownRow {
  key: string
  label: string
  count: number
  value: number
  share: number
}

export interface LostDealInsight {
  deal: Deal
  lostFrom?: DealStage
  lostAt?: Date
  value: number
}

export interface LostDealSummary {
  lostCount: number
  totalLostValue: number
  averageLostValue: number
  knownReasonRate: number
  topReason?: LostBreakdownRow
}

export interface LostDealIntelligenceResult {
  deals: LostDealInsight[]
  summary: LostDealSummary
  byReason: LostBreakdownRow[]
  bySegment: LostBreakdownRow[]
  bySource: LostBreakdownRow[]
  byLostStage: LostBreakdownRow[]
}

function valueOf(deal: Deal): number {
  return deal.actualRevenue ?? deal.totalRevenue ?? 0
}

function textOr(value: string | undefined, fallback: string): string {
  const text = value?.trim()
  return text ? text : fallback
}

function makeBreakdown(
  deals: LostDealInsight[],
  keyOf: (item: LostDealInsight) => string,
  labelOf?: (key: string) => string
): LostBreakdownRow[] {
  const rows = new Map<string, { count: number; value: number }>()
  for (const item of deals) {
    const key = keyOf(item)
    const current = rows.get(key) ?? { count: 0, value: 0 }
    current.count += 1
    current.value += item.value
    rows.set(key, current)
  }

  const total = deals.length || 1
  return Array.from(rows.entries())
    .map(([key, row]) => ({
      key,
      label: labelOf ? labelOf(key) : key,
      count: row.count,
      value: row.value,
      share: row.count / total
    }))
    .sort((a, b) => b.count - a.count || b.value - a.value || a.label.localeCompare(b.label))
}

function findLostEvent(deal: Deal, events: PipelineEvent[]): PipelineEvent | undefined {
  return events
    .filter(event => event.dealId === deal.id && event.to === 'Lost')
    .sort((a, b) => b.at.getTime() - a.at.getTime())[0]
}

export function buildLostDealIntelligence(
  deals: Deal[],
  events: PipelineEvent[] = []
): LostDealIntelligenceResult {
  const lostDeals: LostDealInsight[] = deals
    .filter(deal => (deal.stage ?? 'New') === 'Lost')
    .map(deal => {
      const lostEvent = findLostEvent(deal, events)
      return {
        deal,
        lostFrom: lostEvent?.from,
        lostAt: lostEvent?.at,
        value: valueOf(deal)
      }
    })

  const byReason = makeBreakdown(
    lostDeals,
    item => textOr(item.deal.reasonWonLost, 'Unknown / not recorded')
  )
  const bySegment = makeBreakdown(
    lostDeals,
    item => textOr(item.deal.segment, 'Unknown segment')
  )
  const bySource = makeBreakdown(
    lostDeals,
    item => textOr(item.deal.leadSource, 'Unknown source')
  )
  const byLostStage = makeBreakdown(
    lostDeals,
    item => item.lostFrom ?? 'Unknown stage',
    key => key === 'Unknown stage' ? key : `From ${key}`
  )

  const totalLostValue = lostDeals.reduce((sum, item) => sum + item.value, 0)
  const knownReasons = lostDeals.filter(item => Boolean(item.deal.reasonWonLost?.trim())).length

  return {
    deals: lostDeals,
    summary: {
      lostCount: lostDeals.length,
      totalLostValue,
      averageLostValue: lostDeals.length ? totalLostValue / lostDeals.length : 0,
      knownReasonRate: lostDeals.length ? knownReasons / lostDeals.length : 1,
      topReason: byReason[0]
    },
    byReason,
    bySegment,
    bySource,
    byLostStage
  }
}
