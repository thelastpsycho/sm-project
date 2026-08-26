// Single source of truth for "now" in Bali time.
//
// The app is used at The Anvaya Bali, so every "today" / "current month" the UI
// derives must be the Bali wall-clock day — not the device's local day and not
// UTC. Bali (WITA) is a fixed UTC+8 offset with no daylight saving, so a plain
// offset shift is exact.
//
// This only governs *derived* current-date logic (today marker, default booking
// date, overdue/past checks, the month the chart opens on). Stored createdAt/
// updatedAt timestamps remain absolute instants and are never shifted here.

const BALI_OFFSET_MS = 8 * 60 * 60 * 1000

/** The given instant (default: now) shifted so its UTC fields read as Bali wall-clock. */
function baliShifted(at: Date | number = Date.now()): Date {
  const ms = typeof at === 'number' ? at : at.getTime()
  return new Date(ms + BALI_OFFSET_MS)
}

/** Current Bali calendar day as 'YYYY-MM-DD'. */
export function baliToday(): string {
  return baliShifted().toISOString().slice(0, 10)
}

/** Bali calendar parts for the given instant (monthIndex is 0-based, for `new Date`/month state). */
export function baliDateParts(at: Date | number = Date.now()): {
  year: number
  monthIndex: number
  day: number
} {
  const d = baliShifted(at)
  return { year: d.getUTCFullYear(), monthIndex: d.getUTCMonth(), day: d.getUTCDate() }
}

/** Convert an absolute instant to its Bali calendar day as 'YYYY-MM-DD'. */
export function toBaliISO(at: Date | number): string {
  return baliShifted(at).toISOString().slice(0, 10)
}
