import { describe, expect, it } from 'vitest'
import { assessDealDataQuality, buildDataQualityIntelligence } from '../crmDataQuality'
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
    arrivalDate: '2026-10-20',
    checkoutDate: '2026-10-22',
    totalRevenue: 100_000_000,
    nextAction: 'Follow up',
    actionDueDate: '2026-09-20',
    currency: 'IDR',
    createdAt: new Date('2026-09-01'),
    updatedAt: new Date('2026-09-17'),
    ...overrides
  }
}

describe('assessDealDataQuality', () => {
  it('scores a complete open deal at 100', () => {
    const result = assessDealDataQuality(makeDeal())
    expect(result.score).toBe(100)
    expect(result.issues).toEqual([])
  })

  it('flags missing owner, revenue and next action as critical issues', () => {
    const result = assessDealDataQuality(makeDeal({
      ownerId: '', ownerName: '', totalRevenue: 0, nextAction: '', actionDueDate: ''
    }))
    expect(result.issues.map(i => i.type)).toEqual(expect.arrayContaining([
      'missing-owner', 'missing-revenue', 'missing-next-action', 'missing-action-due'
    ]))
    expect(result.issues.filter(i => i.severity === 'danger').length).toBeGreaterThanOrEqual(3)
    expect(result.score).toBeLessThan(60)
  })

  it('does not require next action fields after a deal is closed', () => {
    const result = assessDealDataQuality(makeDeal({ stage: 'Confirmed', nextAction: '', actionDueDate: '' }))
    expect(result.issues.some(i => i.type === 'missing-next-action')).toBe(false)
    expect(result.issues.some(i => i.type === 'missing-action-due')).toBe(false)
  })

  it('requires a lost reason for Lost deals', () => {
    const result = assessDealDataQuality(makeDeal({ stage: 'Lost', reasonWonLost: '' }))
    expect(result.issues.some(i => i.type === 'missing-lost-reason')).toBe(true)
  })
})

describe('buildDataQualityIntelligence', () => {
  it('summarizes average score and common issues', () => {
    const complete = makeDeal({ id: 'complete' })
    const weak = makeDeal({ id: 'weak', ownerId: '', ownerName: '', leadSource: '' })
    const result = buildDataQualityIntelligence([complete, weak])

    expect(result.summary.completeCount).toBe(1)
    expect(result.summary.needsAttentionCount).toBe(1)
    expect(result.summary.criticalCount).toBe(1)
    expect(result.summary.averageScore).toBeLessThan(100)
    expect(result.summary.issueCounts[0]?.count).toBeGreaterThan(0)
    expect(result.items[0]?.deal.id).toBe('weak')
  })
})
