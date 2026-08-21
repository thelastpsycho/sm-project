// Function Chart logic — originally ported from the standalone deck component
// (Function Chart/Function Charting.dc.html). Framework-free so it can be
// unit-tested and reused. `parse` + `buildMonth` are now used only by the
// one-time migration that seeds structured bookings from the legacy spreadsheet
// JSON (see buildSeedBookings + src/stores/functionChart.ts).

export interface Day {
  col: string
  n: number
  serial: number
  dow: string
  date: string // YYYY-MM-DD
}

export interface Row {
  type: 'cat' | 'venue'
  label: string
  cells?: Record<string, string>
}

export interface Month {
  month: string
  days: Day[]
  rows: Row[]
  notes: Record<string, string>
}

/** A run of consecutive identical cells in one venue row, merged into one booking. */
export interface Block {
  norm: string
  text: string
  start: number // day index (into month.days)
  end: number // inclusive day index
  refs: string[] // spreadsheet refs, e.g. ["P17","Q17"]
  title: string
  pic: string
  pax: string
  venue: string
  note: string
}

export type Line =
  | { kind: 'cat'; label: string }
  | { kind: 'venue'; label: string; blocks: Block[] }

export interface BuiltMonth {
  days: Day[]
  lines: Line[]
}

/**
 * Stable PIC -> accent hue. Replaces the source's cream/green pastel pairs with
 * a categorical palette (Tailwind -600 hues) that reads on both the light
 * (`sm-bg`) and dark (`sm-bg-dark`) app themes. Used for the block's left
 * accent bar and the solid PIC chip; block body text stays theme-colored.
 */
const PIC_COLORS: Record<string, string> = {
  LINDA: '#0D9488', // teal
  AMMA: '#9333EA', // purple
  RISKA: '#EA580C', // orange
  KERNI: '#2563EB', // blue
  DONI: '#16A34A', // green
  ANDI: '#DB2777', // pink
  WINDA: '#CA8A04', // amber
  TRIA: '#0891B2' // cyan
}
const FALLBACK_COLOR = '#64748B' // slate

export function picColor(pic: string): string {
  const key = Object.keys(PIC_COLORS).find((k) => pic.indexOf(k) === 0)
  return key ? PIC_COLORS[key]! : FALLBACK_COLOR
}

/** Split a raw cell like "FDM BPJS Rafiro 45 Pax - Amma" into title / PIC / pax. */
export function parse(text: string): { title: string; pic: string; pax: string } {
  let title = text
  let pic = ''
  let pax = ''
  const dash = text.lastIndexOf(' - ')
  if (dash > 0) {
    const tail = text.slice(dash + 3).trim()
    if (tail.length <= 22 && !/\d{2,}/.test(tail)) {
      pic = tail.toUpperCase()
      title = text.slice(0, dash).trim()
    }
  }
  const m = title.match(/(\d+)\s*(pax|kamar|rooms?|room)\b/i)
  if (m) {
    pax = m[1] + ' ' + (/pax/i.test(m[2] ?? '') ? 'pax' : 'rooms')
  }
  return { title, pic, pax }
}

/**
 * Build one month into positioned lines: category headers and venue rows, each
 * venue row's cells merged into consecutive-day blocks with parsed metadata.
 */
export function buildMonth(month: Month): BuiltMonth {
  const days = month.days
  const idx: Record<string, number> = {}
  days.forEach((d, i) => {
    idx[d.col] = i
  })

  const lines: Line[] = []
  month.rows.forEach((row, ri) => {
    const rowNum = 7 + ri
    if (row.type === 'cat') {
      lines.push({ kind: 'cat', label: row.label })
      return
    }
    const cells = row.cells || {}
    const cols = Object.keys(cells)
      .filter((c) => idx[c] !== undefined)
      .sort((a, b) => idx[a]! - idx[b]!)

    const blocks: Block[] = []
    let cur: Block | null = null
    cols.forEach((col) => {
      const text = cells[col] ?? ''
      const dayIdx = idx[col]!
      const norm = text.replace(/\s+/g, ' ').trim().toLowerCase()
      if (cur && cur.norm === norm && dayIdx === cur.end + 1) {
        cur.end = dayIdx
        cur.refs.push(col + rowNum)
        return
      }
      cur = {
        norm,
        text,
        start: dayIdx,
        end: dayIdx,
        refs: [col + rowNum],
        title: '',
        pic: '',
        pax: '',
        venue: row.label,
        note: ''
      }
      blocks.push(cur)
    })

    blocks.forEach((b) => {
      const p = parse(b.text)
      b.title = p.title
      b.pic = p.pic
      b.pax = p.pax
      b.note = month.notes[b.refs[0]!] || ''
    })

    lines.push({ kind: 'venue', label: row.label, blocks })
  })

  return { days, lines }
}

/**
 * One-time migration: flatten the legacy spreadsheet JSON (months of venue×day
 * cells) into structured bookings. Each merged block becomes one booking; the
 * free-text title carries the event name, PIC becomes the sales owner, pax is
 * parsed, and the day span becomes start/end dates. Status can't be inferred
 * from the source, so callers default it (Tentative). Venues are resolved to
 * canonical labels; blocks on unknown venues are skipped.
 */
export function buildSeedBookings(
  months: Month[],
  resolveVenue: (raw: string) => string | null,
  defaultStatus: string
): Array<{
  salesOwner: string
  company: string
  eventName: string
  pax: number
  venues: string[]
  status: string
  startDate: string
  endDate: string
  note: string
}> {
  const out: ReturnType<typeof buildSeedBookings> = []
  for (const month of months) {
    const built = buildMonth(month)
    for (const line of built.lines) {
      if (line.kind !== 'venue') continue
      const venue = resolveVenue(line.label)
      if (!venue) continue
      for (const b of line.blocks) {
        const paxNum = parseInt(b.pax, 10)
        out.push({
          salesOwner: b.pic,
          company: '',
          eventName: b.title,
          pax: Number.isFinite(paxNum) ? paxNum : 0,
          venues: [venue],
          status: defaultStatus,
          startDate: built.days[b.start]!.date,
          endDate: built.days[b.end]!.date,
          note: b.note
        })
      }
    }
  }
  return out
}
