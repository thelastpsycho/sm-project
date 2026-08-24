// Pipeline revenue calculations, permissions, and formatting helpers.

import type { Deal, DealOutcome, DealStage } from '@/types/crm'
import type { UserRole } from '@/types/user'
import { roleHas } from '@/lib/roles'
import { DEFAULT_ALERT_CONFIG } from '@/lib/crmAlerts'

/**
 * Derived outcome of a deal from its stage (the single pipeline axis).
 * Confirmed → won, Lost → lost, everything else → open. Never stored.
 */
export function dealOutcome(deal: Pick<Deal, 'stage'>): DealOutcome {
  const stage = (deal.stage ?? 'New') as DealStage
  if (stage === 'Confirmed') return 'won'
  if (stage === 'Lost') return 'lost'
  return 'open'
}

/** True while the deal is still in play (not won/lost). */
export function isDealOpen(deal: Pick<Deal, 'stage'>): boolean {
  return dealOutcome(deal) === 'open'
}

/**
 * A deal is "idle" when it's still open but hasn't been touched for `untouchedDays`.
 * Replaces the old manually-set Idle status — now derived from `updatedAt`.
 */
export function isDealIdle(
  deal: Pick<Deal, 'stage' | 'updatedAt'>,
  now: Date = new Date(),
  untouchedDays: number = DEFAULT_ALERT_CONFIG.untouchedDays
): boolean {
  if (!isDealOpen(deal)) return false
  const updated = deal.updatedAt instanceof Date ? deal.updatedAt : new Date(deal.updatedAt as any)
  if (isNaN(updated.getTime())) return false
  return (now.getTime() - updated.getTime()) / 86_400_000 >= untouchedDays
}

/** Revenue to count for a won deal — the actual booked value, or the estimate as fallback. */
export function wonRevenue(deal: Pick<Deal, 'actualRevenue' | 'totalRevenue'>): number {
  return deal.actualRevenue ?? deal.totalRevenue ?? 0
}

// Admin allow-list — kept as a fallback so admin access still works before/if the
// `users` collection role isn't populated yet (e.g. mid-migration).
export const ADMIN_EMAILS = ['andikrisnatha@theanvayabali.com']
// Back-compat alias (delete was the original admin-only action).
export const DELETE_ADMIN_EMAILS = ADMIN_EMAILS

// The minimal shape of the signed-in user these checks need.
export type SessionUserLike = { email?: string | null; role?: string | null } | null | undefined

/** Resolve the effective role, honoring the admin email allow-list fallback. */
export function effectiveRole(user: SessionUserLike): UserRole {
  if (isAdmin(user)) return 'admin'
  return ((user?.role as UserRole) ?? 'sales')
}

/** Admin = role 'admin' (from the users collection) or the email allow-list fallback. */
export function isAdmin(user: SessionUserLike): boolean {
  if (!user) return false
  if (user.role === 'admin') return true
  return !!user.email && ADMIN_EMAILS.includes(user.email)
}

/** Whether the user's role may create leads (`pipeline:create`). */
export function canCreateDeal(user: SessionUserLike): boolean {
  return roleHas(effectiveRole(user), 'pipeline:create')
}

/** Whether the user's role may delete leads (`pipeline:delete`; server-enforced). */
export function canDeleteDeals(user: SessionUserLike): boolean {
  return roleHas(effectiveRole(user), 'pipeline:delete')
}

/**
 * Edit rights on a lead:
 *  - anyone with `pipeline:edit` can edit any lead (server-enforced via editAll claim);
 *  - with `pipeline:edit-own`, the sales owner (matched by email) edits their own lead,
 *    and an unassigned lead (no owner) can be edited/claimed;
 *  - without either permission, the lead is read-only.
 * Own-editing is a client gate; firestore.rules still enforces owner/unassigned writes.
 */
export function canEditDeal(user: SessionUserLike, deal: Pick<Deal, 'ownerId'>): boolean {
  const role = effectiveRole(user)
  if (roleHas(role, 'pipeline:edit')) return true
  if (!roleHas(role, 'pipeline:edit-own')) return false
  if (!deal.ownerId) return true
  return !!user?.email && deal.ownerId === user.email
}

/** Room Nights = No. of Rooms × Nights */
export function computeRoomNights(rooms?: number, nights?: number): number | undefined {
  if (rooms == null || nights == null) return undefined
  return rooms * nights
}

/** Estimated Room Revenue = Room Nights × Proposed ADR */
export function computeRoomRevenue(roomNights?: number, adr?: number): number | undefined {
  if (roomNights == null || adr == null) return undefined
  return roomNights * adr
}

/** Total Revenue Potential = Estimated Room Revenue + F&B / Ancillary */
export function computeTotalRevenue(roomRevenue?: number, fbAncillary?: number): number | undefined {
  const a = roomRevenue ?? 0
  const b = fbAncillary ?? 0
  if (roomRevenue == null && fbAncillary == null) return undefined
  return a + b
}

/**
 * Recalculate the derived revenue fields from the raw inputs.
 * When `manualRevenue` is set, the derived values are left untouched.
 */
export function applyRevenueCalc<T extends Partial<Deal>>(deal: T): T {
  if (deal.manualRevenue) return deal
  const roomNights = computeRoomNights(deal.rooms, deal.nights)
  const estimatedRoomRevenue = computeRoomRevenue(roomNights, deal.proposedADR)
  const totalRevenue = computeTotalRevenue(estimatedRoomRevenue, deal.fbAncillary)
  return { ...deal, roomNights, estimatedRoomRevenue, totalRevenue }
}

/** Compact IDR-style money formatting (no decimals). */
export function formatMoney(value?: number, currency = 'IDR'): string {
  if (value == null) return '—'
  return `${currency} ${Math.round(value).toLocaleString('en-US')}`
}

/** True when an action due date is in the past (compared by calendar day). */
export function isOverdue(actionDueDate?: string): boolean {
  if (!actionDueDate) return false
  const due = new Date(actionDueDate)
  if (isNaN(due.getTime())) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return due < today
}

/** Short human date, e.g. "19 Jan 2026". */
export function formatDate(iso?: string): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}
