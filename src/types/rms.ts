// Types for the Revenue Console's read-only RMS API, as proxied by api/rms/*.
// Verified against a live response (2026-11-06) rather than guessed from the spec
// prose alone — a few things diverge from the written description:
//  - company/market/nationality ids are numbers on /room-types but STRINGS on
//    /reports' production rows (which also carry their own `name`, so no join is
//    needed to render them).
//  - roomTypes is a flat array of codes (e.g. 'ASP'); `labels` maps code -> display name.
//  - /reports has no per-row quality for the *current* figures — one report-wide
//    `quality` covers every production/marketTrend row's rooms/revenue/idrRooms/
//    netRevenue. Each row's `comparison` sub-object has its own `comparisonQuality`.
//    `pickup` is rooms-only (no pickup revenue at this level), keyed by day-bucket
//    ('1'/'7'/'30' always present, plus the requested pickupDays if different), each
//    bucket with its own quality.
//
// Every numeric figure is paired with a quality flag: 'observed' (real snapshot),
// 'estimated' (reconstructed before the booking-events cache existed), or
// 'unavailable' (null — never render it).

export type RmsQuality = 'observed' | 'estimated' | 'unavailable'

export interface RmsChannel {
  id: string
  name: string
}

export interface RmsLookupItem {
  id: number
  name: string
}

export interface RmsRoomTypesResponse {
  channels: RmsChannel[]
  companies: RmsLookupItem[]
  markets: RmsLookupItem[]
  nationalities: RmsLookupItem[]
  /** Room type codes, e.g. 'ASP' — look up the display name in `labels`. */
  roomTypes: string[]
  labels: Record<string, string>
}

export interface RmsPaceRow {
  date: string
  /** The comparison date this row is matched against (same weekday/calendar date/custom offset last year, depending on `comparison`). */
  lyDate: string
  /** Always a number (never null) — gate on `currentQuality` before trusting/rendering it. */
  rooms: number
  idrRooms: number
  revenue: number
  netRevenue: number
  pickupRooms: number | null
  pickupRevenue: number | null
  pickupNetRevenue: number | null
  newRooms: number | null
  cancelledRooms: number | null
  amendedRooms: number | null
  stlyRooms: number | null
  stlyIdrRooms: number | null
  stlyRevenue: number | null
  stlyNetRevenue: number | null
  lyFinalRooms: number | null
  lyFinalRevenue: number | null
  /** Segment budget for this day — null once filtered by room type/company/channel (no such dimension on budgets). */
  budgetRooms: number | null
  budgetRevenue: number | null
  /** Quality of rooms/idrRooms/revenue/netRevenue. */
  currentQuality: RmsQuality
  /** Quality of the stly/lyFinal comparison figures. */
  comparisonQuality: RmsQuality
  /** Quality of pickupRooms/pickupRevenue/pickupNetRevenue. */
  pickupQuality: RmsQuality
}

export type RmsPaceResponse = RmsPaceRow[] | { rows: RmsPaceRow[] }

export interface RmsPickupBucket {
  rooms: number
  quality: RmsQuality
}

/** One row of a /reports production breakdown (company, market, roomType, ...) — the dimension's id/name plus current-period + comparison-period aggregates. */
export interface RmsProductionRow {
  id: string
  name: string
  rooms: number
  idrRooms: number
  revenue: number
  netRevenue: number
  newRooms: number
  cancelledRooms: number
  amendedRooms: number
  /** Segment budget — null once filtered by company/room type/channel (no such dimension on budgets). */
  budget: { rooms: number; revenue: number } | null
  comparison: { rooms: number; idrRooms: number; revenue: number; netRevenue: number }
  comparisonQuality: RmsQuality
  /** Keyed by pickup-day bucket ('1', '7', '30', and the requested pickupDays). Rooms only — no pickup revenue at this level. */
  pickup: Record<string, RmsPickupBucket>
}

export interface RmsMarketTrendPoint {
  date: string
  id: string
  name: string
  rooms: number
  idrRooms: number
  revenue: number
  netRevenue: number
}

export interface RmsBehaviourBucket {
  label: string
  bookings: number
}

export interface RmsBehaviour {
  dateBasis: string
  bookings: number
  allBookings: number
  invalidLeadTime: number
  averageLeadTime: number
  averageLengthOfStay: number
  leadTime: RmsBehaviourBucket[]
  lengthOfStay: RmsBehaviourBucket[]
  weekdays: { label: string; arrivals: number; booked: number }[]
  losses: { id: string; name: string; bookings: number; cancelled: number; noShows: number }[]
}

export interface RmsReportsResponse {
  start: string
  end: string
  /** Report-wide quality for every production/marketTrend row's current-period figures. */
  quality: RmsQuality
  production: {
    company: RmsProductionRow[]
    group: RmsProductionRow[]
    market: RmsProductionRow[]
    nationality: RmsProductionRow[]
    ratePlan: RmsProductionRow[]
    roomType: RmsProductionRow[]
  }
  marketTrend: RmsMarketTrendPoint[]
  behaviour: RmsBehaviour
  /** Report sections that couldn't be computed for this filter set, with why. */
  unavailable: { report: string; reason: string }[]
}

export interface RmsApiError {
  status: 'error'
  message: string
}

export type RmsComparisonMode = 'weekday' | 'calendar' | 'custom'
export type RmsGroupMode = 'fit' | 'group'
export type RmsDateBasis = 'stay' | 'booking'
/** Client-side only — which comparison to *display* (LY from `comparison`, or the budget fields already in every response). Never sent to the API. */
export type RmsCompareWith = 'yoy' | 'budget'

export interface RmsFilterParams {
  start: string
  end: string
  companyIds?: string
  roomType?: string
  marketId?: string
  nationalityIds?: string
  channels?: string
  group?: RmsGroupMode
  pickupDays?: number
  comparison?: RmsComparisonMode
  /** Required (400 without it) when comparison === 'custom'. */
  comparisonStart?: string
}

export interface RmsReportsParams extends RmsFilterParams {
  dateBasis?: RmsDateBasis
}
