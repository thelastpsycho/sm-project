// Pipeline revenue calculations and formatting helpers.

import type { Deal } from '@/types/crm'

// Users allowed to delete leads on the shared board (admin-only action).
export const DELETE_ADMIN_EMAILS = ['andikrisnatha@theanvayabali.com']
export function canDeleteDeals(email?: string | null): boolean {
  return !!email && DELETE_ADMIN_EMAILS.includes(email)
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
