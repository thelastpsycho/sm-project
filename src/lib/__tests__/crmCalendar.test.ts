import { describe, expect, it } from 'vitest'
import {
  addCalendarDays,
  buildPipelineCalendarEvents,
  monthCalendarDays,
  startOfCalendarWeek
} from '../crmCalendar'
import type { Deal, PipelineEvent } from '@/types/crm'

function makeDeal(overrides: Partial<Deal> = {}): Deal {
  return {
    id: 'd1',
    company: 'Acme Corp',
    segment: 'MICE',
    leadSource: 'Email',
    ownerId: 'owner@example.com',
    ownerName: 'Owner',
    stage: 'Proposal',
    leadDate: '2026-09-10',
    arrivalDate: '2026-09-20',
    checkoutDate: '2026-09-22',
    totalRevenue: 100_000_000,
    nextAction: 'Follow up proposal',
    actionDueDate: '2026-09-17',
    currency: 'IDR',
    createdAt: new Date('2026-09-10T00:00:00Z'),
    updatedAt: new Date('2026-09-16T00:00:00Z'),
    ...overrides
  }
}

function makeEvent(overrides: Partial<PipelineEvent> = {}): PipelineEvent {
  return {
    id: 'e1',
    dealId: 'd1',
    company: 'Acme Corp',
    type: 'stage',
    from: 'New',
    to: 'Proposal',
    byId: 'owner@example.com',
    byName: 'Owner',
    at: new Date('2026-09-16T20:30:00Z'),
    ...overrides
  }
}

const TODAY = '2026-09-17'

describe('buildPipelineCalendarEvents', () => {
  it('derives action, arrival, checkout and lead events from an open deal', () => {
    const events = buildPipelineCalendarEvents([makeDeal()], [], TODAY)
    expect(events.map(event => event.type)).toEqual(['lead', 'action', 'arrival', 'checkout'])
    expect(events.find(event => event.type === 'action')?.title).toBe('Follow up proposal')
  })

  it('does not schedule follow-up actions for closed deals', () => {
    const confirmed = makeDeal({ id: 'won', stage: 'Confirmed' })
    const lost = makeDeal({ id: 'lost', stage: 'Lost' })
    const events = buildPipelineCalendarEvents([confirmed, lost], [], TODAY)
    expect(events.some(event => event.type === 'action')).toBe(false)
    expect(events.filter(event => event.type === 'arrival')).toHaveLength(2)
  })

  it('marks overdue and due-today actions correctly', () => {
    const overdue = makeDeal({ id: 'late', actionDueDate: '2026-09-15' })
    const today = makeDeal({ id: 'today', actionDueDate: TODAY })
    const events = buildPipelineCalendarEvents([overdue, today], [], TODAY)
    const lateEvent = events.find(event => event.dealId === 'late' && event.type === 'action')!
    const todayEvent = events.find(event => event.dealId === 'today' && event.type === 'action')!
    expect(lateEvent.overdue).toBe(true)
    expect(todayEvent.dueToday).toBe(true)
  })

  it('adds commercial pressure for open deals close to arrival', () => {
    const critical = makeDeal({ id: 'critical', arrivalDate: '2026-09-22' })
    const attention = makeDeal({ id: 'attention', arrivalDate: '2026-09-28' })
    const normal = makeDeal({ id: 'normal', arrivalDate: '2026-10-20' })
    const events = buildPipelineCalendarEvents([critical, attention, normal], [], TODAY)
    expect(events.find(event => event.dealId === 'critical' && event.type === 'arrival')?.commercialPressure).toBe('critical')
    expect(events.find(event => event.dealId === 'attention' && event.type === 'arrival')?.commercialPressure).toBe('attention')
    expect(events.find(event => event.dealId === 'normal' && event.type === 'arrival')?.commercialPressure).toBeNull()
  })

  it('flags an open arrival when no follow-up date is scheduled', () => {
    const deal = makeDeal({ actionDueDate: undefined, nextAction: undefined })
    const arrival = buildPipelineCalendarEvents([deal], [], TODAY).find(event => event.type === 'arrival')!
    expect(arrival.missingNextAction).toBe(true)
  })

  it('converts pipeline activity timestamps to Bali calendar dates', () => {
    const activity = buildPipelineCalendarEvents([makeDeal()], [makeEvent()], TODAY)
      .find(event => event.type === 'activity')!
    expect(activity.date).toBe('2026-09-17')
    expect(activity.title).toBe('New → Proposal')
  })
})

describe('calendar date helpers', () => {
  it('uses Monday as the first day of the week', () => {
    expect(startOfCalendarWeek('2026-09-17')).toBe('2026-09-14')
  })

  it('adds calendar days without local timezone drift', () => {
    expect(addCalendarDays('2026-09-30', 1)).toBe('2026-10-01')
  })

  it('creates a six-week month grid', () => {
    const days = monthCalendarDays(2026, 8)
    expect(days).toHaveLength(42)
    expect(days[0]).toBe('2026-08-31')
    expect(days[41]).toBe('2026-10-11')
  })
})
