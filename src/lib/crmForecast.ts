import type { Deal, DealStage } from '../types/crm.js'

// Shared reporting defaults. Keep all forecast surfaces on the same assumptions.
export const STAGE_PROBABILITY: Readonly<Record<DealStage, number>> = Object.freeze({
  New: 0.1,
  Proposal: 0.3,
  Negotiation: 0.5,
  Contract: 0.8,
  Confirmed: 1,
  Lost: 0
})

/** Forecast only open business, using its proposed value (not stale booked revenue). */
export function weightedDealValue(deal: Deal): number {
  const stage = deal.stage ?? 'New'
  if (stage === 'Confirmed' || stage === 'Lost') return 0
  return (deal.totalRevenue ?? 0) * (STAGE_PROBABILITY[stage] ?? 0)
}

export function weightedForecast(deals: readonly Deal[]): number {
  return deals.reduce((total, deal) => total + weightedDealValue(deal), 0)
}
