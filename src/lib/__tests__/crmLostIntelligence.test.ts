import { describe, expect, it } from 'vitest'
import { buildLostDealIntelligence } from '../crmLostIntelligence'
import type { Deal, PipelineEvent } from '@/types/crm'

function makeDeal(overrides: Partial<Deal> = {}): Deal {
  return {
    id: 'd1',
    company: 'Acme Corp',
    segment: 'MICE',
    leadSource: 'Email',
    ownerId: 'owner@example.com',
    ownerName: 'Owner',
    stage: 'Lost',
    reasonWonLost: 'Budget Constrain',
    totalRevenue: 100_000_000,
    arrivalDate: '2026-10-20',
    checkoutDate: '2026-10-22',
    currency: 'IDR',
    createdAt: new Date('2026-09-01'),
    updatedAt: new Date('2026-09-17'),
    ...overrides
  }
}

function lostEvent(overrides: Partial<PipelineEvent> = {}): PipelineEvent {
  return {
    id: 'e1',
    dealId: 'd1',
    company: 'Acme Corp',
    type: 'stage',
    from: 'Negotiation',
    to: 'Lost',
    byId: 'owner@example.com',
    byName: 'Owner',
    at: new Date('2026-09-17T08:00:00Z'),
    ...overrides
  }
}

describe('buildLostDealIntelligence', () => {
  it('only analyzes Lost deals', () => {
    const result = buildLostDealIntelligence([
      makeDeal({ id: 'lost' }),
      makeDeal({ id: 'open', stage: 'Proposal' })
    ])
    expect(result.summary.lostCount).toBe(1)
    expect(result.deals.map(item => item.deal.id)).toEqual(['lost'])
  })

  it('groups loss reasons and values', () => {
    const result = buildLostDealIntelligence([
      makeDeal({ id: 'a', reasonWonLost: 'Budget Constrain', totalRevenue: 100_000_000 }),
      makeDeal({ id: 'b', reasonWonLost: 'Budget Constrain', totalRevenue: 50_000_000 }),
      makeDeal({ id: 'c', reasonWonLost: 'Lose to other hotel', totalRevenue: 75_000_000 })
    ])

    expect(result.summary.totalLostValue).toBe(225_000_000)
    expect(result.summary.topReason?.label).toBe('Budget Constrain')
    expect(result.summary.topReason?.count).toBe(2)
    expect(result.byReason[0]?.value).toBe(150_000_000)
  })

  it('shows unknown reason when a lost reason is missing', () => {
    const result = buildLostDealIntelligence([makeDeal({ reasonWonLost: '' })])
    expect(result.byReason[0]?.label).toBe('Unknown / not recorded')
    expect(result.summary.knownReasonRate).toBe(0)
  })

  it('derives stage of loss from pipeline events', () => {
    const deal = makeDeal({ id: 'd1' })
    const result = buildLostDealIntelligence([deal], [lostEvent()])
    expect(result.deals[0]?.lostFrom).toBe('Negotiation')
    expect(result.byLostStage[0]?.label).toBe('From Negotiation')
  })

  it('groups by segment and lead source', () => {
    const result = buildLostDealIntelligence([
      makeDeal({ id: 'a', segment: 'MICE', leadSource: 'Email' }),
      makeDeal({ id: 'b', segment: 'Wedding', leadSource: 'Whatsapp' }),
      makeDeal({ id: 'c', segment: 'MICE', leadSource: 'Email' })
    ])
    expect(result.bySegment[0]?.label).toBe('MICE')
    expect(result.bySegment[0]?.count).toBe(2)
    expect(result.bySource[0]?.label).toBe('Email')
    expect(result.bySource[0]?.count).toBe(2)
  })
})
