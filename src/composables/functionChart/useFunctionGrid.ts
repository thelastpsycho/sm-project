import { computed, type Ref } from 'vue'
import { VENUE_STRUCTURE, canonicalVenue } from '@/lib/functionChartVenues'
import { STATUS_STYLE } from '@/types/functionChart'
import type { FunctionBooking } from '@/types/functionChart'

// Grid geometry (px). Exported so the drag composable can map pointer offsets
// back to day columns / room rows.
export const COL_W = 158
export const ROW_H = 44
export const NAME_W = 214

const DOW = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']

// Static row scaffolding: grid row number for each venue (its position in
// VENUE_STRUCTURE + a header offset), plus the inverse lookup used by drag.
export const rowByVenue = new Map<string, number>()
export const venueByRow = new Map<number, string>()
VENUE_STRUCTURE.forEach((row, li) => {
  if (row.type === 'venue') {
    rowByVenue.set(row.label, li + 2)
    venueByRow.set(li + 2, row.label)
  }
})

export interface DayCol {
  date: string
  num: string
  dow: string
  isWeekend: boolean
  isToday: boolean
}

/**
 * Derived geometry + booking layout for the visible month's desktop grid.
 * `matches` (search/status filter) and `conflictIds` are injected so the page
 * owns filter state while the grid stays a pure projection of it.
 */
export function useFunctionGrid(opts: {
  functions: Ref<FunctionBooking[]>
  year: Ref<number>
  monthIndex: Ref<number>
  todayISO: Ref<string>
  matches: (f: FunctionBooking) => boolean
  conflictIds: Ref<Set<string>>
}) {
  const { functions, year, monthIndex, todayISO, matches, conflictIds } = opts

  const days = computed<DayCol[]>(() => {
    const m = monthIndex.value
    const count = new Date(year.value, m + 1, 0).getDate()
    const mm = String(m + 1).padStart(2, '0')
    const out: DayCol[] = []
    for (let day = 1; day <= count; day++) {
      const date = `${year.value}-${mm}-${String(day).padStart(2, '0')}`
      const dow = new Date(year.value, m, day).getDay()
      out.push({ date, num: String(day), dow: DOW[dow]!, isWeekend: dow === 0 || dow === 6, isToday: date === todayISO.value })
    }
    return out
  })

  const monthStart = computed(() => days.value[0]!.date)
  const monthEnd = computed(() => days.value[days.value.length - 1]!.date)

  const gridStyle = computed(
    () =>
      `display:grid;grid-template-columns:${NAME_W}px repeat(${days.value.length},${COL_W}px);` +
      `grid-auto-rows:minmax(${ROW_H}px,auto);align-items:stretch;width:max-content;min-width:100%`
  )

  function dayNum(dateStr: string): number {
    return parseInt(dateStr.slice(8, 10), 10) - 1
  }

  // Bookings that touch the visible month, indexed by each room they occupy (a
  // combined booking appears under every one of its rooms — used for per-row counts + stats).
  const byVenue = computed(() => {
    const map = new Map<string, FunctionBooking[]>()
    for (const f of functions.value) {
      if (f.endDate < monthStart.value || f.startDate > monthEnd.value) continue
      for (const raw of f.venues) {
        const v = canonicalVenue(raw) ?? raw
        const arr = map.get(v) ?? map.set(v, []).get(v)!
        arr.push(f)
      }
    }
    return map
  })

  // Row scaffolding: category headers + venue name cells (+ per-venue booking count).
  const lines = computed(() =>
    VENUE_STRUCTURE.map((row, li) => {
      const gridRow = li + 2
      if (row.type === 'cat') {
        return { kind: 'cat' as const, key: 'cat' + li, label: row.label, row: gridRow }
      }
      const count = byVenue.value.get(row.label)?.length ?? 0
      return {
        kind: 'venue' as const,
        key: 'v' + li,
        label: row.label,
        row: gridRow,
        count: count ? String(count) : ''
      }
    })
  )

  // Booking blocks, positioned once each. A block spans its day range (columns) and,
  // for a combined booking, the contiguous rooms it occupies (rows).
  const bookingBlocks = computed(() => {
    const lastIdx = days.value.length - 1
    const out = []
    for (const f of functions.value) {
      if (f.endDate < monthStart.value || f.startDate > monthEnd.value) continue
      const rows = f.venues
        .map((v) => rowByVenue.get(canonicalVenue(v) ?? v))
        .filter((r): r is number => r != null)
      if (!rows.length) continue
      const rowStart = Math.min(...rows)
      const rowEnd = Math.max(...rows)
      const start = f.startDate <= monthStart.value ? 0 : dayNum(f.startDate)
      const end = f.endDate >= monthEnd.value ? lastIdx : dayNum(f.endDate)
      out.push({
        key: f.id,
        title: f.eventName || '(untitled)',
        company: f.company,
        pax: f.pax || 0,
        owner: f.salesOwner,
        blockClass: STATUS_STYLE[f.status].block,
        status: f.status,
        on: matches(f),
        conflict: conflictIds.value.has(f.id),
        colStart: start + 2,
        colSpan: end - start + 1,
        rowStart,
        rowSpan: rowEnd - rowStart + 1,
        booking: f
      })
    }
    return out
  })

  const stats = computed(() => {
    let slots = 0
    const venues = new Set<string>()
    const seen = new Set<string>() // dedupe combined bookings across their rooms
    for (const [venue, bookings] of byVenue.value) {
      for (const f of bookings) {
        if (!matches(f)) continue
        venues.add(venue)
        seen.add(f.id)
        // Each room-row contributes its own day span to slot usage.
        const start = f.startDate <= monthStart.value ? 0 : dayNum(f.startDate)
        const end = f.endDate >= monthEnd.value ? days.value.length - 1 : dayNum(f.endDate)
        slots += end - start + 1
      }
    }
    const denom = days.value.length * VENUE_STRUCTURE.filter((r) => r.type === 'venue').length
    return {
      functions: String(seen.size),
      venues: String(venues.size),
      occupancy: (denom ? Math.round((100 * slots) / denom) : 0) + '%'
    }
  })

  return {
    days,
    monthStart,
    monthEnd,
    gridStyle,
    dayNum,
    byVenue,
    lines,
    bookingBlocks,
    stats
  }
}
