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

/** The Bali calendar day containing `at`, as absolute instants `[startMs, endMs)`. */
export function baliDayWindow(at: Date | number = Date.now()): { startMs: number; endMs: number } {
  const { year, monthIndex, day } = baliDateParts(at)
  const startMs = Date.UTC(year, monthIndex, day) - BALI_OFFSET_MS // Bali-midnight as an instant
  return { startMs, endMs: startMs + 86_400_000 }
}

/**
 * The most-recently-completed Bali week as absolute instants: `[startMs, endMs)` where
 * `endMs` is the start of the current Bali **Monday** (00:00 WITA) and `startMs` is the
 * Monday before that. Run on a Monday morning it yields the full previous Mon–Sun week.
 * Returned as absolute instants so they compare directly against Firestore `at` timestamps.
 */
export function baliWeekWindow(at: Date | number = Date.now()): { startMs: number; endMs: number } {
  const { year, monthIndex, day } = baliDateParts(at)
  const utcMidnight = Date.UTC(year, monthIndex, day) // UTC midnight of the Bali calendar date
  const weekday = new Date(utcMidnight).getUTCDay() // 0=Sun … 1=Mon … 6=Sat
  const daysSinceMonday = (weekday + 6) % 7
  const mondayUtcMidnight = utcMidnight - daysSinceMonday * 86_400_000
  const endMs = mondayUtcMidnight - BALI_OFFSET_MS // Bali-midnight Monday as an absolute instant
  return { startMs: endMs - 7 * 86_400_000, endMs }
}
