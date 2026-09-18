// Function-space/venue availability lookup for the Telegram chat bot's AI Agent,
// exposed as an n8n AI Tool — answers "is the ballroom free on 3 Nov" / "what venues
// are free on 4 Nov". This is the Function Chart feature (src/types/functionChart.ts,
// `functions` Firestore collection) — entirely separate from the sales pipeline deals.

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { db } from '../cron/_shared.js'
import { botAuthorized } from './_shared.js'
import { VENUE_STRUCTURE, VENUE_LIST, canonicalVenue } from '../../src/lib/functionChartVenues.js'
import type { FunctionStatus } from '../../src/types/functionChart.js'

interface Booking {
  eventName: string
  company: string
  status: FunctionStatus
  venues: string[]
  startDate: string
  endDate: string
}

/** Category label -> the venue labels under it, in VENUE_STRUCTURE order. */
function categoryMap(): Map<string, string[]> {
  const map = new Map<string, string[]>()
  let current: string | null = null
  for (const row of VENUE_STRUCTURE) {
    if (row.type === 'cat') {
      current = row.label
      map.set(current, [])
    } else if (current) {
      map.get(current)!.push(row.label)
    }
  }
  return map
}

const norm = (s: string) => s.trim().toLowerCase()

/** Resolve a free-text venue/category query to the concrete venue labels it refers to. Empty query = every venue. */
function resolveVenues(query: string): string[] {
  if (!query) return VENUE_LIST
  const canon = canonicalVenue(query)
  if (canon) return [canon]
  const nq = norm(query)
  for (const [cat, venues] of categoryMap()) {
    if (norm(cat).includes(nq) || nq.includes(norm(cat))) return venues
  }
  // Fuzzy fallback: venue labels containing the query as a substring (e.g. "anvaya" -> Anvaya 1/2/3).
  return VENUE_LIST.filter(v => norm(v).includes(nq))
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!botAuthorized(req, res)) return

  const date = String(req.query.date ?? '').trim()
  if (!date) {
    res.status(400).json({ error: 'date query param required (YYYY-MM-DD)' })
    return
  }
  const endDate = String(req.query.endDate ?? date).trim()
  const venueQuery = String(req.query.venue ?? '').trim()

  const matchedVenues = resolveVenues(venueQuery)
  if (venueQuery && matchedVenues.length === 0) {
    res.status(200).json({
      date,
      endDate,
      requestedVenue: venueQuery,
      matchedVenues: [],
      availability: [],
      note: 'No venue or category matched that name.'
    })
    return
  }

  const store = db()
  const snap = await store.collection('functions').get()
  const bookings: Booking[] = snap.docs
    .map(d => {
      const data = d.data() as Record<string, any>
      return {
        eventName: data.eventName ?? '',
        company: data.company ?? '',
        status: (data.status ?? 'tentative') as FunctionStatus,
        venues: Array.isArray(data.venues) ? data.venues : data.venue ? [data.venue] : [],
        startDate: data.startDate ?? '',
        endDate: data.endDate ?? data.startDate ?? ''
      }
    })
    // Overlaps the requested [date, endDate] range.
    .filter(f => f.startDate <= endDate && f.endDate >= date)

  const availability = matchedVenues.map(venue => {
    const clashes = bookings.filter(b => b.venues.some(v => (canonicalVenue(v) ?? v) === venue))
    return {
      venue,
      free: clashes.length === 0,
      bookings: clashes.map(b => ({
        eventName: b.eventName,
        company: b.company,
        status: b.status,
        startDate: b.startDate,
        endDate: b.endDate
      }))
    }
  })

  res.status(200).json({
    date,
    endDate,
    requestedVenue: venueQuery || null,
    matchedVenues,
    availability
  })
}
