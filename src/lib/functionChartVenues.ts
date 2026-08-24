// Canonical venue structure for The Anvaya Bali, derived from the union of all
// months in the original chart. Fixed reference data (not user-editable), used
// for the chart's row layout and the booking form's venue dropdown.

export interface VenueRow {
  type: 'cat' | 'venue'
  label: string
}

export const VENUE_STRUCTURE: VenueRow[] = [
  { type: 'cat', label: 'MEETING ROOM 2nd' },
  { type: 'venue', label: 'KEMIRI' },
  { type: 'venue', label: 'KESUNA' },
  { type: 'venue', label: 'KELAPA' },
  { type: 'venue', label: 'KEMANGI' },
  { type: 'cat', label: 'MEETING ROOM 1st' },
  { type: 'venue', label: 'JEPUN' },
  { type: 'venue', label: 'PUCUK' },
  { type: 'venue', label: 'CELAGI' },
  { type: 'venue', label: 'CEMARA' },
  { type: 'venue', label: 'CEPAKA' },
  { type: 'cat', label: 'BALLROOM' },
  { type: 'venue', label: 'ANVAYA 1' },
  { type: 'venue', label: 'ANVAYA 2' },
  { type: 'venue', label: 'ANVAYA 3' },
  { type: 'venue', label: 'RUANG KACE' },
  { type: 'venue', label: 'SECRETARIAT 2' },
  { type: 'venue', label: 'HOLDING VIP' },
  { type: 'venue', label: 'CONCIERGE DELUXE' },
  { type: 'cat', label: 'RESTAURANT' },
  { type: 'venue', label: 'KUNYIT RESTAURANT' },
  { type: 'venue', label: 'KUNYIT PAVILLION' },
  { type: 'venue', label: 'KUNYIT PDR' },
  { type: 'venue', label: 'SANDS RESTAURANT' },
  { type: 'venue', label: 'SANDS PAVILLION' },
  { type: 'venue', label: 'SANDS DECK' },
  { type: 'venue', label: 'SANDS PDR' },
  { type: 'venue', label: 'WINE CELAR' },
  { type: 'cat', label: 'OTHERS' },
  { type: 'venue', label: 'ANVAYA BEACH' },
  { type: 'venue', label: 'LEISURE DECK' },
  { type: 'venue', label: 'POOL SIDE' },
  { type: 'venue', label: 'EARLY BREAKFAST LOUNGE' },
  { type: 'venue', label: 'DEPARTURE LOUNGE' },
  { type: 'venue', label: 'OCC' }
]

/** Ordered list of venue labels (no category headers). */
export const VENUE_LIST: string[] = VENUE_STRUCTURE.filter((r) => r.type === 'venue').map((r) => r.label)

const norm = (s: string) => s.trim().toUpperCase().replace(/\s+/g, ' ')

// Case-insensitive lookup so migrated data with inconsistent casing (e.g. "CELAGi")
// resolves to the canonical label.
const CANON_BY_NORM = new Map<string, string>(VENUE_LIST.map((v) => [norm(v), v]))

// Aliases for retired/renamed venues, remapped onto a surviving room so their
// existing bookings are preserved rather than dropped. BUSINESS CENTER was merged
// into RUANG KACE, which was itself renamed from SECRETARIAT 1.
const VENUE_ALIASES: Record<string, string> = {
  'BUSINESS CENTER': 'RUANG KACE',
  'SECRETARIAT 1': 'RUANG KACE'
}

/** Resolve a raw venue label to its canonical form, or null if unknown. */
export function canonicalVenue(raw: string): string | null {
  const key = norm(raw)
  const aliased = VENUE_ALIASES[key]
  return CANON_BY_NORM.get(aliased ? norm(aliased) : key) ?? null
}

// ---------------------------------------------------------------------------
// Combinable venues
//
// Some rooms can be booked together, but only in physically adjacent runs. A
// booking that spans several rooms stores them all in `venues`; a valid multi-
// room selection is a *contiguous slice* of one group (so Ballroom 1+2 and 2+3
// are allowed, 1+3 is not — Anvaya 2 sits between them). Room order below is the
// physical adjacency order and MUST match their row order in VENUE_STRUCTURE.
// ---------------------------------------------------------------------------

export interface ComboGroup {
  rooms: string[] // adjacent rooms, in physical order
  comboLabel?: string // name for the full-group booking, e.g. 'GRAND BALLROOM'
}

export const COMBO_GROUPS: ComboGroup[] = [
  { rooms: ['KEMIRI', 'KESUNA'] },
  { rooms: ['KELAPA', 'KEMANGI'] },
  { rooms: ['JEPUN', 'PUCUK'] },
  { rooms: ['CELAGI', 'CEMARA', 'CEPAKA'] },
  { rooms: ['ANVAYA 1', 'ANVAYA 2', 'ANVAYA 3'], comboLabel: 'GRAND BALLROOM' },
  { rooms: ['SANDS PAVILLION', 'SANDS DECK'] }
]

const GROUP_BY_ROOM = new Map<string, ComboGroup>()
for (const g of COMBO_GROUPS) for (const r of g.rooms) GROUP_BY_ROOM.set(r, g)

/** The combinable group a room belongs to, or null if it can't be combined. */
export function comboGroupOf(room: string): ComboGroup | null {
  return GROUP_BY_ROOM.get(room) ?? null
}

/**
 * Valid booking selection = a single room, or a contiguous slice of one combo
 * group. Empty, cross-group, or gapped selections (e.g. Ballroom 1+3) are invalid.
 */
export function isValidVenueSelection(rooms: string[]): boolean {
  if (rooms.length === 0) return false
  if (rooms.length === 1) return true
  const g = comboGroupOf(rooms[0]!)
  if (!g) return false
  const positions = rooms.map((r) => g.rooms.indexOf(r))
  if (positions.some((p) => p < 0)) return false // some room not in this group
  positions.sort((a, b) => a - b)
  for (let i = 1; i < positions.length; i++) {
    if (positions[i]! !== positions[i - 1]! + 1) return false // gap -> not contiguous
  }
  return true
}

/**
 * Human label for a set of rooms: a single room as-is, a full group as its combo
 * label (e.g. 'GRAND BALLROOM'), otherwise the rooms joined with a shared prefix
 * collapsed ('ANVAYA 1' + 'ANVAYA 2' -> 'ANVAYA 1 + 2', 'CELAGI + CEMARA').
 */
export function comboName(rooms: string[]): string {
  if (rooms.length === 0) return ''
  if (rooms.length === 1) return rooms[0]!
  const g = comboGroupOf(rooms[0]!)
  const ordered = g ? [...rooms].sort((a, b) => g.rooms.indexOf(a) - g.rooms.indexOf(b)) : [...rooms]
  if (g?.comboLabel && ordered.length === g.rooms.length) return g.comboLabel
  const parts = ordered.map((r) => r.split(' '))
  const firstWord = parts[0]![0]!
  if (parts.every((p) => p.length > 1 && p[0] === firstWord)) {
    return firstWord + ' ' + parts.map((p) => p.slice(1).join(' ')).join(' + ')
  }
  return ordered.join(' + ')
}
