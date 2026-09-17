import type { Deal, DealStage, PipelineEvent } from '@/types/crm'
import { toBaliISO } from '@/lib/time'

export type PipelineCalendarEventType = 'action' | 'arrival' | 'checkout' | 'lead' | 'activity'
export type PipelineCalendarOutcome = 'open' | 'won' | 'lost'
export type CommercialPressure = 'critical' | 'attention' | null

export interface PipelineCalendarEvent {
  id: string
  dealId: string
  type: PipelineCalendarEventType
  date: string
  title: string
  company: string
  groupName?: string
  ownerId: string
  ownerName: string
  segment: string
  stage: DealStage
  outcome: PipelineCalendarOutcome
  value: number
  currency: string
  overdue: boolean
  dueToday: boolean
  commercialPressure: CommercialPressure
  daysToArrival?: number
  missingNextAction: boolean
}

const DAY_MS = 86_400_000

function stageOf(deal: Deal): DealStage {
  return deal.stage ?? 'New'
}

function outcomeOf(stage: DealStage): PipelineCalendarOutcome {
  if (stage === 'Confirmed') return 'won'
  if (stage === 'Lost') return 'lost'
  return 'open'
}

function valueOf(deal: Deal): number {
  return deal.actualRevenue ?? deal.totalRevenue ?? 0
}

function parseDateOnly(iso: string): number {
  return Date.parse(`${iso}T00:00:00Z`)
}

export function diffCalendarDays(fromIso: string, toIso: string): number {
  return Math.round((parseDateOnly(toIso) - parseDateOnly(fromIso)) / DAY_MS)
}

export function addCalendarDays(iso: string, days: number): string {
  return new Date(parseDateOnly(iso) + days * DAY_MS).toISOString().slice(0, 10)
}

export function startOfCalendarWeek(iso: string): string {
  const date = new Date(parseDateOnly(iso))
  const mondayOffset = (date.getUTCDay() + 6) % 7
  return addCalendarDays(iso, -mondayOffset)
}

export function monthCalendarDays(year: number, monthIndex: number): string[] {
  const first = `${year}-${String(monthIndex + 1).padStart(2, '0')}-01`
  const start = startOfCalendarWeek(first)
  return Array.from({ length: 42 }, (_, index) => addCalendarDays(start, index))
}

function baseEvent(
  deal: Deal,
  type: PipelineCalendarEventType,
  date: string,
  title: string,
  today: string
): PipelineCalendarEvent {
  const stage = stageOf(deal)
  const open = outcomeOf(stage) === 'open'
  const daysToArrival = deal.arrivalDate ? diffCalendarDays(today, deal.arrivalDate) : undefined
  const commercialPressure: CommercialPressure = open && daysToArrival != null && daysToArrival >= 0
    ? daysToArrival <= 7
      ? 'critical'
      : daysToArrival <= 14
        ? 'attention'
        : null
    : null

  return {
    id: `${type}:${deal.id}:${date}`,
    dealId: deal.id,
    type,
    date,
    title,
    company: deal.company,
    groupName: deal.groupName,
    ownerId: deal.ownerId,
    ownerName: deal.ownerName,
    segment: deal.segment,
    stage,
    outcome: outcomeOf(stage),
    value: valueOf(deal),
    currency: deal.currency,
    overdue: type === 'action' && date < today,
    dueToday: type === 'action' && date === today,
    commercialPressure,
    daysToArrival,
    missingNextAction: open && !deal.actionDueDate
  }
}

function activityTitle(event: PipelineEvent): string {
  if (event.type === 'created') return 'Lead created'
  if (event.type === 'reopened') return `Reopened → ${event.to}`
  if (event.to === 'Confirmed') return 'Confirmed'
  if (event.to === 'Lost') return event.reason ? `Lost — ${event.reason}` : 'Lost'
  return event.from ? `${event.from} → ${event.to}` : `Moved to ${event.to}`
}

export function buildPipelineCalendarEvents(
  deals: Deal[],
  events: PipelineEvent[] = [],
  today: string
): PipelineCalendarEvent[] {
  const result: PipelineCalendarEvent[] = []
  const byId = new Map(deals.map(deal => [deal.id, deal]))

  for (const deal of deals) {
    const stage = stageOf(deal)
    const open = outcomeOf(stage) === 'open'

    if (open && deal.actionDueDate) {
      result.push(baseEvent(deal, 'action', deal.actionDueDate, deal.nextAction?.trim() || 'Follow up', today))
    }
    if (deal.arrivalDate) {
      result.push(baseEvent(deal, 'arrival', deal.arrivalDate, 'Arrival', today))
    }
    if (deal.checkoutDate) {
      result.push(baseEvent(deal, 'checkout', deal.checkoutDate, 'Checkout', today))
    }
    if (deal.leadDate) {
      result.push(baseEvent(deal, 'lead', deal.leadDate, 'Lead created', today))
    }
  }

  for (const event of events) {
    const deal = byId.get(event.dealId)
    if (!deal) continue
    const date = toBaliISO(event.at)
    const item = baseEvent(deal, 'activity', date, activityTitle(event), today)
    item.id = `activity:${event.id}`
    result.push(item)
  }

  return result.sort((a, b) => a.date.localeCompare(b.date) || a.company.localeCompare(b.company) || a.type.localeCompare(b.type))
}
