import { describe, expect, it } from 'vitest'
import { computeDealAnomalies, computeStageBaselines, DEFAULT_ANOMALY_CONFIG } from '../crmAnomalies'
import type { Deal, DealStage, PipelineEvent } from '@/types/crm'

function makeDeal(overrides: Partial<Deal> = {}): Deal {
  return {
    id: 'd1',
    company: 'Acme Corp',
    segment: 'MICE',
    leadSource: 'Email',
    ownerId: 'owner@example.com',
    ownerName: 'Owner',
    stage: 'Negotiation',
    stageEnteredAt: '2026-01-01T00:00:00.000Z',
    currency: 'IDR',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides
  }
}

let seq = 0
function makeEvent(overrides: Partial<PipelineEvent> = {}): PipelineEvent {
  seq += 1
  return {
    id: `e${seq}`,
    dealId: 'd1',
    company: 'Acme Corp',
    type: 'stage',
    to: 'Negotiation' as DealStage,
    byId: 'owner@example.com',
    byName: 'Owner',
    at: new Date('2026-01-01'),
    ...overrides
  }
}

function daysAfter(base: string, days: number): Date {
  return new Date(new Date(base).getTime() + days * 86_400_000)
}

describe('computeStageBaselines', () => {
  it('computes the median dwell time per (segment, stage) with an odd sample count', () => {
    const base = '2026-01-01T00:00:00.000Z'
    const deals = [makeDeal({ id: 'a' }), makeDeal({ id: 'b' }), makeDeal({ id: 'c' })]
    const durations = [2, 4, 6]
    const events = deals.flatMap((deal, i) => [
      makeEvent({ dealId: deal.id, type: 'created', to: 'New', at: new Date(base) }),
      makeEvent({ dealId: deal.id, type: 'stage', from: 'New', to: 'Proposal', at: daysAfter(base, durations[i]!) })
    ])
    const baselines = computeStageBaselines(deals, events)
    const newBaseline = baselines.find(b => b.segment === 'MICE' && b.stage === 'New')
    expect(newBaseline?.days).toBe(4)
    expect(newBaseline?.sampleSize).toBe(3)
  })

  it('computes the median with an even sample count (average of the two middle values)', () => {
    const base = '2026-01-01T00:00:00.000Z'
    const deals = [makeDeal({ id: 'a' }), makeDeal({ id: 'b' })]
    const durations = [2, 4]
    const events = deals.flatMap((deal, i) => [
      makeEvent({ dealId: deal.id, type: 'created', to: 'New', at: new Date(base) }),
      makeEvent({ dealId: deal.id, type: 'stage', from: 'New', to: 'Proposal', at: daysAfter(base, durations[i]!) })
    ])
    const baselines = computeStageBaselines(deals, events)
    const newBaseline = baselines.find(b => b.segment === 'MICE' && b.stage === 'New')
    expect(newBaseline?.days).toBe(3)
  })

  it('excludes durations that end in a terminal stage', () => {
    const base = '2026-01-01T00:00:00.000Z'
    const deal = makeDeal({ id: 'a' })
    const events = [
      makeEvent({ dealId: 'a', type: 'created', to: 'New', at: new Date(base) }),
      makeEvent({ dealId: 'a', type: 'stage', from: 'New', to: 'Lost', at: daysAfter(base, 3) })
    ]
    const baselines = computeStageBaselines([deal], events)
    // The only duration recorded is for 'New' (curr.to on the first event); the second
    // event's `to` is terminal (Lost) so it never starts a duration of its own.
    expect(baselines.find(b => b.stage === 'Lost')).toBeUndefined()
    expect(baselines.find(b => b.stage === 'New')?.days).toBe(3)
  })
})

describe('computeDealAnomalies', () => {
  it('flags a deal reopened at or above the threshold', () => {
    const deal = makeDeal()
    const events = [
      makeEvent({ type: 'reopened', from: 'Lost', to: 'New' }),
      makeEvent({ type: 'reopened', from: 'Lost', to: 'New' })
    ]
    const anomalies = computeDealAnomalies(deal, events, [])
    expect(anomalies.some(a => a.type === 'reopened')).toBe(true)
  })

  it('does not flag reopened below the threshold', () => {
    const deal = makeDeal()
    const events = [makeEvent({ type: 'reopened', from: 'Lost', to: 'New' })]
    const anomalies = computeDealAnomalies(deal, events, [])
    expect(anomalies.some(a => a.type === 'reopened')).toBe(false)
  })

  it('flags a sharp value drop between consecutive snapshots', () => {
    const deal = makeDeal()
    const events = [
      makeEvent({ at: new Date('2026-01-01'), valueAtChange: 1_000_000 }),
      makeEvent({ at: new Date('2026-01-05'), valueAtChange: 600_000 })
    ]
    const anomalies = computeDealAnomalies(deal, events, [])
    expect(anomalies.some(a => a.type === 'value-drop')).toBe(true)
  })

  it('does not flag a small value change', () => {
    const deal = makeDeal()
    const events = [
      makeEvent({ at: new Date('2026-01-01'), valueAtChange: 1_000_000 }),
      makeEvent({ at: new Date('2026-01-05'), valueAtChange: 950_000 })
    ]
    const anomalies = computeDealAnomalies(deal, events, [])
    expect(anomalies.some(a => a.type === 'value-drop')).toBe(false)
  })

  it('flags a deal stuck far longer than its segment baseline', () => {
    const now = new Date('2026-02-01T00:00:00.000Z')
    const deal = makeDeal({ stage: 'Negotiation', stageEnteredAt: '2026-01-01T00:00:00.000Z' }) // 31 days in stage
    const baselines = [{ segment: 'MICE', stage: 'Negotiation' as DealStage, days: 5, sampleSize: 5 }]
    const anomalies = computeDealAnomalies(deal, [], baselines, DEFAULT_ANOMALY_CONFIG, now)
    expect(anomalies.some(a => a.type === 'segment-stuck')).toBe(true)
  })

  it('does not flag when the baseline has too few samples to trust', () => {
    const now = new Date('2026-02-01T00:00:00.000Z')
    const deal = makeDeal({ stage: 'Negotiation', stageEnteredAt: '2026-01-01T00:00:00.000Z' })
    const baselines = [{ segment: 'MICE', stage: 'Negotiation' as DealStage, days: 5, sampleSize: 1 }]
    const anomalies = computeDealAnomalies(deal, [], baselines, DEFAULT_ANOMALY_CONFIG, now)
    expect(anomalies.some(a => a.type === 'segment-stuck')).toBe(false)
  })

  it('does not flag a closed-stage deal for segment-stuck', () => {
    const now = new Date('2026-02-01T00:00:00.000Z')
    const deal = makeDeal({ stage: 'Confirmed', stageEnteredAt: '2026-01-01T00:00:00.000Z' })
    const baselines = [{ segment: 'MICE', stage: 'Confirmed' as DealStage, days: 5, sampleSize: 5 }]
    const anomalies = computeDealAnomalies(deal, [], baselines, DEFAULT_ANOMALY_CONFIG, now)
    expect(anomalies.some(a => a.type === 'segment-stuck')).toBe(false)
  })
})
