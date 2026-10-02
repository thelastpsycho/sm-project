import { describe, expect, it } from 'vitest'
import { ref } from 'vue'
import { computeKpis } from '../crmReport'
import { weightedForecast } from '../crmForecast'
import { buildPipelineIntelligence } from '../crmIntelligence'
import { paginate } from '../pagination'
import { searchablePages } from '../nav'
import { useDraftState } from '@/composables/useDraftState'
import type { Deal } from '@/types/crm'

const deal = (id: number, overrides: Partial<Deal> = {}): Deal => ({
  id: String(id), company: `Company ${id}`, ownerId: 'qa@example.com', ownerName: 'QA',
  segment: 'MICE', leadSource: 'Email', currency: 'IDR', stage: 'Proposal',
  totalRevenue: 100_000_000, createdAt: new Date('2026-10-01'), updatedAt: new Date('2026-10-01'),
  ...overrides
})

describe('shared forecasts with display pagination', () => {
  it('matches intelligence across open stages, legacy stages and stale actual revenue', () => {
    const deals = [deal(1, { stage: 'New' }), deal(2), deal(3, { stage: 'Negotiation' }),
      deal(4, { stage: 'Contract' }), deal(5, { stage: undefined }),
      deal(6, { actualRevenue: 900_000_000 }), deal(7, { totalRevenue: undefined }),
      deal(8, { stage: 'Confirmed' }), deal(9, { stage: 'Lost' })]
    expect(weightedForecast(deals)).toBe(210_000_000)
    expect(computeKpis(deals).weighted).toBe(weightedForecast(deals))
    expect(buildPipelineIntelligence(deals).summary.weightedForecast).toBe(weightedForecast(deals))
  })

  it('keeps all deals in forecasts while rendering one page, including the final page', () => {
    const deals = Array.from({ length: 63 }, (_, i) => deal(i))
    expect(paginate(deals, 1).items).toHaveLength(25)
    const last = paginate(deals, 3)
    expect(last.items.map(d => d.id)).toEqual(deals.slice(50).map(d => d.id))
    expect([last.from, last.to, last.total]).toEqual([51, 63, 63])
    expect(weightedForecast(deals)).toBe(1_890_000_000)
    expect(deals).toHaveLength(63)
  })

  it('clamps pages after a filter/deletion and handles empty collections', () => {
    expect(paginate([deal(1)], 9).page).toBe(1)
    expect(paginate([], 9)).toMatchObject({ items: [], page: 1, from: 0, to: 0 })
    expect(paginate([deal(1)], -1).items).toHaveLength(1)
  })
})

describe('permission-aware page search', () => {
  it('includes pipeline and function chart from navigation', () => {
    const pages = searchablePages(() => true)
    expect(pages.some(p => p.path === '/crm')).toBe(true)
    expect(pages.some(p => p.path === '/function-chart')).toBe(true)
    expect(pages.some(p => p.path === '/tactical-offer')).toBe(true)
  })
  it('does not show inaccessible nested pages', () => {
    const pages = searchablePages(p => p === 'pipeline:view')
    expect(pages.some(p => p.path === '/crm/calendar')).toBe(true)
    expect(pages.some(p => p.path === '/crm/report')).toBe(false)
    expect(pages.some(p => p.path === '/users')).toBe(false)
  })
})

describe('RFP draft state', () => {
  it('tracks nested changes and clears dirty state only for the acknowledged snapshot', () => {
    const form = ref({ company: 'Acme', rooms: { count: 10 } })
    const state = useDraftState(form)
    expect(state.dirty.value).toBe(false)
    form.value.rooms.count = 20
    const saving = JSON.stringify(form.value)
    form.value.company = 'Edited during save'
    state.markSaved(saving)
    expect(state.dirty.value).toBe(true)
    state.markSaved(JSON.stringify(form.value))
    expect(state.dirty.value).toBe(false)
    expect(state.savedAt.value).toBeInstanceOf(Date)
  })
  it('retains unsaved changes when a save is not acknowledged', () => {
    const form = ref({ company: 'Acme' })
    const state = useDraftState(form)
    form.value.company = 'Unsaved'
    expect(state.dirty.value).toBe(true)
    expect(state.savedAt.value).toBeNull()
  })
})
