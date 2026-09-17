import { describe, expect, it } from 'vitest'
import { buildPipelineIntelligence, STAGE_PROBABILITY } from '../crmIntelligence'
import type { Deal } from '@/types/crm'

function makeDeal(overrides: Partial<Deal> = {}): Deal {
  return {
    id: 'd1',
    company: 'Acme Corp',
    segment: 'MICE',
    leadSource: 'Email',
    ownerId: 'owner@example.com',
    ownerName: 'Owner',
    stage: 'Proposal',
    stageEnteredAt: '2026-09-15T00:00:00.000Z',
    arrivalDate: '2026-10-20',
    checkoutDate: '2026-10-22',
    totalRevenue: 100_000_000,
    nextAction: 'Follow up proposal',
    actionDueDate: '2026-09-20',
    currency: 'IDR',
    createdAt: new Date('2026-09-10T00:00:00.000Z'),
    updatedAt: new Date('2026-09-16T00:00:00.000Z'),
    ...overrides
  }
}

const NOW = new Date('2026-09-17T08:00:00.000Z')

describe('buildPipelineIntelligence', () => {
  it('excludes Confirmed and Lost deals from active intelligence', () => {
    const deals = [
      makeDeal({ id: 'open' }),
      makeDeal({ id: 'won', stage: 'Confirmed' }),
      makeDeal({ id: 'lost', stage: 'Lost' })
    ]

    const result = buildPipelineIntelligence(deals, NOW)
    expect(result.items.map(item => item.deal.id)).toEqual(['open'])
  })

  it('uses stage probability for weighted forecast', () => {
    const proposal = makeDeal({ id: 'proposal', stage: 'Proposal', totalRevenue: 100_000_000 })
    const negotiation = makeDeal({ id: 'negotiation', stage: 'Negotiation', totalRevenue: 200_000_000 })

    const result = buildPipelineIntelligence([proposal, negotiation], NOW)
    const expected = 100_000_000 * STAGE_PROBABILITY.Proposal + 200_000_000 * STAGE_PROBABILITY.Negotiation

    expect(result.summary.openValue).toBe(300_000_000)
    expect(result.summary.weightedForecast).toBe(expected)
  })

  it('marks overdue actions as urgent and recommends completing them', () => {
    const deal = makeDeal({
      actionDueDate: '2026-09-15',
      nextAction: 'Call decision maker',
      updatedAt: new Date('2026-09-16T00:00:00.000Z')
    })

    const item = buildPipelineIntelligence([deal], NOW).items[0]!
    expect(item.dueState).toBe('overdue')
    expect(item.priorityScore).toBeGreaterThanOrEqual(70)
    expect(item.riskScore).toBeGreaterThanOrEqual(40)
    expect(item.recommendedAction).toBe('Complete overdue action: Call decision maker')
    expect(item.reasons.some(reason => reason.includes('overdue'))).toBe(true)
  })

  it('marks untouched deals as stale after the configured inactivity window', () => {
    const deal = makeDeal({
      updatedAt: new Date('2026-09-08T00:00:00.000Z'),
      actionDueDate: '2026-09-25'
    })

    const item = buildPipelineIntelligence([deal], NOW).items[0]!
    expect(item.isStale).toBe(true)
    expect(item.health).toBe('stale')
    expect(item.daysIdle).toBeGreaterThanOrEqual(7)
    expect(item.recommendedAction).toContain('Re-engage')
  })

  it('flags same-company overlapping stays as duplicate intelligence', () => {
    const a = makeDeal({
      id: 'a',
      company: 'Acme Corp',
      arrivalDate: '2026-10-20',
      checkoutDate: '2026-10-23'
    })
    const b = makeDeal({
      id: 'b',
      company: ' ACME CORP ',
      arrivalDate: '2026-10-22',
      checkoutDate: '2026-10-25'
    })

    const result = buildPipelineIntelligence([a, b], NOW)
    expect(result.summary.duplicateCount).toBe(2)
    expect(result.items.every(item => item.isDuplicate)).toBe(true)
    expect(result.items.every(item => item.reasons.some(reason => reason.includes('Possible duplicate')))).toBe(true)
  })

  it('does not flag back-to-back stays as duplicates', () => {
    const a = makeDeal({
      id: 'a',
      company: 'Acme Corp',
      arrivalDate: '2026-10-20',
      checkoutDate: '2026-10-22'
    })
    const b = makeDeal({
      id: 'b',
      company: 'Acme Corp',
      arrivalDate: '2026-10-22',
      checkoutDate: '2026-10-25'
    })

    const result = buildPipelineIntelligence([a, b], NOW)
    expect(result.summary.duplicateCount).toBe(0)
    expect(result.items.every(item => !item.isDuplicate)).toBe(true)
  })

  it('sorts higher-priority deals ahead of lower-priority deals', () => {
    const quiet = makeDeal({
      id: 'quiet',
      stage: 'New',
      totalRevenue: 10_000_000,
      actionDueDate: '2026-09-30',
      updatedAt: new Date('2026-09-17T00:00:00.000Z')
    })
    const urgent = makeDeal({
      id: 'urgent',
      stage: 'Negotiation',
      totalRevenue: 250_000_000,
      actionDueDate: '2026-09-15',
      updatedAt: new Date('2026-09-10T00:00:00.000Z')
    })

    const result = buildPipelineIntelligence([quiet, urgent], NOW)
    expect(result.items[0]?.deal.id).toBe('urgent')
    expect(result.items[0]!.priorityScore).toBeGreaterThan(result.items[1]!.priorityScore)
  })
})
