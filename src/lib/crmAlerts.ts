// Framework-agnostic pipeline alert engine.
// Imported by BOTH the Vue app (in-app inbox) and the Vercel cron function (push),
// so it must stay free of Vue/Firestore imports — pure functions over plain data.

import type { Deal, DealStage } from '../types/crm.js'

export type AlertType = 'untouched' | 'stuck' | 'action-due' | 'arrival-risk'
export type AlertSeverity = 'info' | 'warning' | 'danger'

export interface Alert {
  id: string // stable: `${dealId}:${type}`
  type: AlertType
  severity: AlertSeverity
  dealId: string
  company: string
  message: string
  since: string // ISO — when the underlying condition began (drives unread compares)
}

export interface AlertConfig {
  untouchedDays: number // no update for this many days → "untouched"
  arrivalWithinDays: number // arrival this close but not Confirmed → "arrival-risk"
  actionDueSoonDays: number // next action due within this many days → warning
  stageSlaDays: Partial<Record<DealStage, number>> // max days a deal should sit in a stage
}

export const DEFAULT_ALERT_CONFIG: AlertConfig = {
  untouchedDays: 7,
  arrivalWithinDays: 14,
  actionDueSoonDays: 2,
  stageSlaDays: { New: 5, Proposal: 7, Negotiation: 7, Contract: 5 }
}

// ---- date helpers ----
function toDate(v: unknown): Date | null {
  if (!v) return null
  const d = v instanceof Date ? v : new Date(v as string)
  return isNaN(d.getTime()) ? null : d
}
function daysBetween(a: Date, b: Date): number {
  return Math.floor((a.getTime() - b.getTime()) / 86_400_000)
}
function startOfDay(d: Date): Date {
  const c = new Date(d)
  c.setHours(0, 0, 0, 0)
  return c
}

// A deal is "closed" once it reaches a terminal stage (Confirmed = won, Lost) — no nudges needed.
function isClosed(deal: Deal): boolean {
  const stage = deal.stage ?? 'New'
  return stage === 'Confirmed' || stage === 'Lost'
}

/** Compute all active alerts for a single deal at time `now`. */
export function computeDealAlerts(deal: Deal, cfg: AlertConfig, now: Date): Alert[] {
  const alerts: Alert[] = []
  if (isClosed(deal)) return alerts
  const company = deal.company || 'Untitled deal'

  // 1. Untouched — no update for N+ days.
  const updated = toDate(deal.updatedAt)
  if (updated) {
    const idle = daysBetween(now, updated)
    if (idle >= cfg.untouchedDays) {
      alerts.push({
        id: `${deal.id}:untouched`,
        type: 'untouched',
        severity: idle >= cfg.untouchedDays * 2 ? 'danger' : 'warning',
        dealId: deal.id,
        company,
        message: `No activity on “${company}” for ${idle} days.`,
        since: updated.toISOString()
      })
    }
  }

  // 2. Stuck in stage — beyond the stage SLA and not yet Confirmed.
  const stage = (deal.stage ?? 'New') as DealStage
  if (stage !== 'Confirmed') {
    const sla = cfg.stageSlaDays[stage]
    const enteredStage = toDate(deal.stageEnteredAt) ?? toDate(deal.createdAt)
    if (sla != null && enteredStage) {
      const inStage = daysBetween(now, enteredStage)
      if (inStage >= sla) {
        alerts.push({
          id: `${deal.id}:stuck`,
          type: 'stuck',
          severity: inStage >= sla * 2 ? 'danger' : 'warning',
          dealId: deal.id,
          company,
          message: `“${company}” has been in ${stage} for ${inStage} days.`,
          since: enteredStage.toISOString()
        })
      }
    }
  }

  // 3. Action due / overdue.
  const due = toDate(deal.actionDueDate)
  if (deal.nextAction && due) {
    const daysToDue = daysBetween(startOfDay(due), startOfDay(now)) // >0 future, <0 past
    if (daysToDue < 0) {
      alerts.push({
        id: `${deal.id}:action-due`,
        type: 'action-due',
        severity: 'danger',
        dealId: deal.id,
        company,
        message: `Overdue: “${deal.nextAction}” for ${company}.`,
        since: due.toISOString()
      })
    } else if (daysToDue <= cfg.actionDueSoonDays) {
      alerts.push({
        id: `${deal.id}:action-due`,
        type: 'action-due',
        severity: 'warning',
        dealId: deal.id,
        company,
        message: `Due ${daysToDue === 0 ? 'today' : `in ${daysToDue}d`}: “${deal.nextAction}” for ${company}.`,
        since: due.toISOString()
      })
    }
  }

  // 4. Arrival near, not Confirmed.
  const arrival = toDate(deal.arrivalDate)
  if (arrival && stage !== 'Confirmed') {
    const daysToArrival = daysBetween(startOfDay(arrival), startOfDay(now))
    if (daysToArrival >= 0 && daysToArrival <= cfg.arrivalWithinDays) {
      alerts.push({
        id: `${deal.id}:arrival-risk`,
        type: 'arrival-risk',
        severity: daysToArrival <= 3 ? 'danger' : 'warning',
        dealId: deal.id,
        company,
        message: `“${company}” arrives ${daysToArrival === 0 ? 'today' : `in ${daysToArrival}d`} but isn't Confirmed.`,
        since: startOfDay(now).toISOString()
      })
    }
  }

  return alerts
}

const SEVERITY_RANK: Record<AlertSeverity, number> = { danger: 0, warning: 1, info: 2 }

/** All alerts for the deals owned by `userEmail`, most-urgent first. */
export function computeUserAlerts(
  deals: Deal[],
  userEmail: string,
  cfg: AlertConfig = DEFAULT_ALERT_CONFIG,
  now: Date = new Date()
): Alert[] {
  const mine = deals.filter(d => d.ownerId === userEmail)
  const alerts = mine.flatMap(d => computeDealAlerts(d, cfg, now))
  return alerts.sort((a, b) => {
    const s = SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]
    return s !== 0 ? s : b.since.localeCompare(a.since)
  })
}

/** Count of alerts newer than the user's last "seen" timestamp. */
export function countUnread(alerts: Alert[], seenAtIso?: string | null): number {
  if (!seenAtIso) return alerts.length
  return alerts.filter(a => a.since > seenAtIso).length
}
