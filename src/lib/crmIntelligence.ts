import type { Deal, DealStage } from '@/types/crm'
import { DEFAULT_ALERT_CONFIG } from '@/lib/crmAlerts'

export type IntelligenceHealth = 'hot' | 'healthy' | 'attention' | 'at-risk' | 'stale'
export type DueState = 'overdue' | 'today' | 'soon' | 'none'

export const STAGE_PROBABILITY: Record<DealStage, number> = {
  New: 0.15,
  Proposal: 0.35,
  Negotiation: 0.6,
  Contract: 0.8,
  Confirmed: 1,
  Lost: 0
}

export interface DealIntelligence {
  deal: Deal
  priorityScore: number
  riskScore: number
  probability: number
  weightedValue: number
  health: IntelligenceHealth
  healthLabel: string
  recommendedAction: string
  reasons: string[]
  dueState: DueState
  daysIdle: number
  daysInStage: number
  isHot: boolean
  isAtRisk: boolean
  isStale: boolean
}

export interface PipelineIntelligenceSummary {
  hotCount: number
  atRiskCount: number
  staleCount: number
  weightedForecast: number
  openValue: number
  attentionValue: number
}

export interface PipelineIntelligenceResult {
  items: DealIntelligence[]
  summary: PipelineIntelligenceSummary
}

function clamp(value: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, Math.round(value)))
}

function toDate(value: unknown): Date | null {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value as string)
  return Number.isNaN(date.getTime()) ? null : date
}

function startOfDay(date: Date): Date {
  const copy = new Date(date)
  copy.setHours(0, 0, 0, 0)
  return copy
}

function daysBetween(later: Date, earlier: Date): number {
  return Math.floor((later.getTime() - earlier.getTime()) / 86_400_000)
}

function stageOf(deal: Deal): DealStage {
  return (deal.stage ?? 'New') as DealStage
}

function dealValue(deal: Deal): number {
  return deal.actualRevenue ?? deal.totalRevenue ?? 0
}

function isOpen(deal: Deal): boolean {
  const stage = stageOf(deal)
  return stage !== 'Confirmed' && stage !== 'Lost'
}

function dueStateFor(deal: Deal, now: Date): DueState {
  if (!deal.actionDueDate) return 'none'
  const due = toDate(deal.actionDueDate)
  if (!due) return 'none'
  const delta = daysBetween(startOfDay(due), startOfDay(now))
  if (delta < 0) return 'overdue'
  if (delta === 0) return 'today'
  if (delta <= DEFAULT_ALERT_CONFIG.actionDueSoonDays) return 'soon'
  return 'none'
}

function nextActionFor(deal: Deal, dueState: DueState, daysInStage: number, daysIdle: number): string {
  if (dueState === 'overdue') return deal.nextAction ? `Complete overdue action: ${deal.nextAction}` : 'Contact the client today'
  if (dueState === 'today') return deal.nextAction ? deal.nextAction : 'Follow up with the client today'
  if (daysIdle >= DEFAULT_ALERT_CONFIG.untouchedDays) return 'Re-engage the client and confirm the decision timeline'

  const stage = stageOf(deal)
  const sla = DEFAULT_ALERT_CONFIG.stageSlaDays[stage]
  if (sla != null && daysInStage >= sla) {
    if (stage === 'New') return 'Qualify the opportunity and set a next action'
    if (stage === 'Proposal') return 'Follow up on the proposal and clarify any blockers'
    if (stage === 'Negotiation') return 'Confirm open commercial points and agree the next decision date'
    if (stage === 'Contract') return 'Confirm contract status and remaining approval steps'
  }

  if (!deal.nextAction) return 'Set a clear next action and due date'
  return deal.nextAction
}

function buildDealIntelligence(deal: Deal, now: Date): DealIntelligence | null {
  if (!isOpen(deal)) return null

  const stage = stageOf(deal)
  const value = dealValue(deal)
  const updated = toDate(deal.updatedAt) ?? toDate(deal.createdAt) ?? now
  const entered = toDate(deal.stageEnteredAt) ?? toDate(deal.createdAt) ?? updated
  const daysIdle = Math.max(0, daysBetween(now, updated))
  const daysInStage = Math.max(0, daysBetween(now, entered))
  const dueState = dueStateFor(deal, now)
  const reasons: string[] = []

  let risk = 10
  let priority = 20 + STAGE_PROBABILITY[stage] * 30

  if (value > 0) {
    const valueBoost = Math.min(20, Math.log10(Math.max(value, 1)) * 2)
    priority += valueBoost
  }

  if (dueState === 'overdue') {
    risk += 35
    priority += 30
    reasons.push('A scheduled next action is overdue.')
  } else if (dueState === 'today') {
    risk += 18
    priority += 24
    reasons.push('A scheduled next action is due today.')
  } else if (dueState === 'soon') {
    risk += 8
    priority += 12
    reasons.push('A scheduled next action is approaching.')
  }

  if (daysIdle >= DEFAULT_ALERT_CONFIG.untouchedDays * 2) {
    risk += 35
    priority += 18
    reasons.push(`No recorded activity for ${daysIdle} days.`)
  } else if (daysIdle >= DEFAULT_ALERT_CONFIG.untouchedDays) {
    risk += 22
    priority += 12
    reasons.push(`No recorded activity for ${daysIdle} days.`)
  }

  const sla = DEFAULT_ALERT_CONFIG.stageSlaDays[stage]
  if (sla != null && daysInStage >= sla * 2) {
    risk += 28
    priority += 16
    reasons.push(`${daysInStage} days in ${stage}, more than twice the target stage time.`)
  } else if (sla != null && daysInStage >= sla) {
    risk += 16
    priority += 10
    reasons.push(`${daysInStage} days in ${stage}, beyond the target stage time.`)
  }

  const arrival = toDate(deal.arrivalDate)
  if (arrival) {
    const daysToArrival = daysBetween(startOfDay(arrival), startOfDay(now))
    if (daysToArrival >= 0 && daysToArrival <= 3) {
      risk += 28
      priority += 24
      reasons.push(`Arrival is in ${daysToArrival === 0 ? 'less than a day' : `${daysToArrival} days`} and the deal is still open.`)
    } else if (daysToArrival > 3 && daysToArrival <= DEFAULT_ALERT_CONFIG.arrivalWithinDays) {
      risk += 12
      priority += 14
      reasons.push(`Arrival is within ${daysToArrival} days.`)
    }
  }

  if (!deal.nextAction) {
    risk += 12
    reasons.push('No next action has been recorded.')
  }
  if (!deal.actionDueDate) risk += 5
  if (!deal.ownerId && !deal.ownerName) {
    risk += 10
    reasons.push('The deal is currently unassigned.')
  }

  if (reasons.length === 0) {
    if (stage === 'Negotiation' || stage === 'Contract') reasons.push(`The deal has progressed to ${stage} with no immediate risk flags.`)
    else reasons.push('The deal is active with no immediate risk flags.')
  }

  const riskScore = clamp(risk)
  const priorityScore = clamp(priority)
  const isStale = daysIdle >= DEFAULT_ALERT_CONFIG.untouchedDays
  const isAtRisk = riskScore >= 55
  const isHot = !isAtRisk && !isStale && priorityScore >= 65 && (stage === 'Proposal' || stage === 'Negotiation' || stage === 'Contract')

  let health: IntelligenceHealth = 'healthy'
  let healthLabel = 'Healthy'
  if (isAtRisk) {
    health = 'at-risk'
    healthLabel = 'At risk'
  } else if (isStale) {
    health = 'stale'
    healthLabel = 'Stale'
  } else if (isHot) {
    health = 'hot'
    healthLabel = 'Hot'
  } else if (riskScore >= 35 || dueState === 'today' || dueState === 'soon') {
    health = 'attention'
    healthLabel = 'Attention'
  }

  const probability = STAGE_PROBABILITY[stage]

  return {
    deal,
    priorityScore,
    riskScore,
    probability,
    weightedValue: value * probability,
    health,
    healthLabel,
    recommendedAction: nextActionFor(deal, dueState, daysInStage, daysIdle),
    reasons,
    dueState,
    daysIdle,
    daysInStage,
    isHot,
    isAtRisk,
    isStale
  }
}

export function buildPipelineIntelligence(deals: Deal[], now = new Date()): PipelineIntelligenceResult {
  const items = deals
    .map(deal => buildDealIntelligence(deal, now))
    .filter((item): item is DealIntelligence => item !== null)
    .sort((a, b) => {
      const priority = b.priorityScore - a.priorityScore
      if (priority !== 0) return priority
      const risk = b.riskScore - a.riskScore
      if (risk !== 0) return risk
      return dealValue(b.deal) - dealValue(a.deal)
    })

  const openValue = items.reduce((sum, item) => sum + dealValue(item.deal), 0)
  const attentionItems = items.filter(item => item.isAtRisk || item.isStale || item.dueState === 'overdue' || item.dueState === 'today')

  return {
    items,
    summary: {
      hotCount: items.filter(item => item.isHot).length,
      atRiskCount: items.filter(item => item.isAtRisk).length,
      staleCount: items.filter(item => item.isStale).length,
      weightedForecast: items.reduce((sum, item) => sum + item.weightedValue, 0),
      openValue,
      attentionValue: attentionItems.reduce((sum, item) => sum + dealValue(item.deal), 0)
    }
  }
}
