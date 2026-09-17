import type { Deal } from '../types/crm.js'

export type DataQualityIssueType =
  | 'missing-owner'
  | 'missing-lead-source'
  | 'missing-segment'
  | 'missing-arrival'
  | 'missing-checkout'
  | 'missing-revenue'
  | 'missing-next-action'
  | 'missing-action-due'
  | 'missing-lost-reason'

export interface DataQualityIssue {
  type: DataQualityIssueType
  label: string
  weight: number
  severity: 'warning' | 'danger'
}

export interface DealDataQuality {
  deal: Deal
  score: number
  issues: DataQualityIssue[]
}

export interface DataQualitySummary {
  averageScore: number
  completeCount: number
  needsAttentionCount: number
  criticalCount: number
  issueCounts: Array<{ type: DataQualityIssueType; label: string; count: number }>
}

export interface DataQualityResult {
  items: DealDataQuality[]
  summary: DataQualitySummary
}

const ISSUE_META: Record<DataQualityIssueType, Omit<DataQualityIssue, 'type'>> = {
  'missing-owner': { label: 'Missing owner', weight: 20, severity: 'danger' },
  'missing-lead-source': { label: 'Missing lead source', weight: 8, severity: 'warning' },
  'missing-segment': { label: 'Missing segment', weight: 8, severity: 'warning' },
  'missing-arrival': { label: 'Missing arrival date', weight: 12, severity: 'warning' },
  'missing-checkout': { label: 'Missing checkout date', weight: 8, severity: 'warning' },
  'missing-revenue': { label: 'Missing pipeline value', weight: 15, severity: 'danger' },
  'missing-next-action': { label: 'Missing next action', weight: 15, severity: 'danger' },
  'missing-action-due': { label: 'Missing action due date', weight: 10, severity: 'warning' },
  'missing-lost-reason': { label: 'Missing lost reason', weight: 20, severity: 'danger' }
}

function issue(type: DataQualityIssueType): DataQualityIssue {
  return { type, ...ISSUE_META[type] }
}

function blank(value: unknown): boolean {
  return value == null || (typeof value === 'string' && value.trim() === '')
}

export function assessDealDataQuality(deal: Deal): DealDataQuality {
  const issues: DataQualityIssue[] = []
  const stage = deal.stage ?? 'New'
  const open = stage !== 'Confirmed' && stage !== 'Lost'

  if (blank(deal.ownerId) && blank(deal.ownerName)) issues.push(issue('missing-owner'))
  if (blank(deal.leadSource)) issues.push(issue('missing-lead-source'))
  if (blank(deal.segment)) issues.push(issue('missing-segment'))
  if (blank(deal.arrivalDate)) issues.push(issue('missing-arrival'))
  if (blank(deal.checkoutDate)) issues.push(issue('missing-checkout'))

  const value = deal.actualRevenue ?? deal.totalRevenue
  if (value == null || value <= 0) issues.push(issue('missing-revenue'))

  if (open) {
    if (blank(deal.nextAction)) issues.push(issue('missing-next-action'))
    if (blank(deal.actionDueDate)) issues.push(issue('missing-action-due'))
  }

  if (stage === 'Lost' && blank(deal.reasonWonLost)) issues.push(issue('missing-lost-reason'))

  const score = Math.max(0, 100 - issues.reduce((sum, item) => sum + item.weight, 0))
  return { deal, score, issues }
}

export function buildDataQualityIntelligence(deals: Deal[]): DataQualityResult {
  const items = deals
    .map(assessDealDataQuality)
    .sort((a, b) => a.score - b.score || b.issues.length - a.issues.length || a.deal.company.localeCompare(b.deal.company))

  const counts = new Map<DataQualityIssueType, number>()
  for (const item of items) {
    for (const current of item.issues) counts.set(current.type, (counts.get(current.type) ?? 0) + 1)
  }

  const averageScore = items.length
    ? Math.round(items.reduce((sum, item) => sum + item.score, 0) / items.length)
    : 100

  return {
    items,
    summary: {
      averageScore,
      completeCount: items.filter(item => item.issues.length === 0).length,
      needsAttentionCount: items.filter(item => item.issues.length > 0).length,
      criticalCount: items.filter(item => item.issues.some(current => current.severity === 'danger')).length,
      issueCounts: Array.from(counts.entries())
        .map(([type, count]) => ({ type, label: ISSUE_META[type].label, count }))
        .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    }
  }
}
