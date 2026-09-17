// Framework-agnostic duplicate-deal detection. Same convention as `crmAlerts.ts` /
// `crmReport.ts` — pure functions, relative imports only, no Vue/Firestore — so it can
// be shared by the in-app creation-time check and (later) a cron/report surface.

import type { Deal } from '../types/crm.js'

export function normalizeCompany(name: string): string {
  return (name ?? '').trim().toLowerCase()
}

function toTime(v?: string): number | null {
  if (!v) return null
  const t = new Date(v).getTime()
  return Number.isNaN(t) ? null : t
}

/** Whether two date ranges overlap. False (not a match) if either range is incomplete. */
export function datesOverlap(aStart?: string, aEnd?: string, bStart?: string, bEnd?: string): boolean {
  const as = toTime(aStart)
  const ae = toTime(aEnd)
  const bs = toTime(bStart)
  const be = toTime(bEnd)
  if (as == null || ae == null || bs == null || be == null) return false
  return as <= be && bs <= ae
}

export interface DuplicateCandidate {
  company: string
  arrivalDate?: string
  checkoutDate?: string
}

export interface DuplicateOptions {
  excludeId?: string
  // Match against Lost deals too. Default false — a Lost deal isn't an active
  // double-booking risk, but the creation-time warning opts in (see CRM.vue) since a
  // rep may not realize a similar deal was already lost and be re-entering it.
  includeLost?: boolean
}

/** Same-company (case/whitespace-insensitive) + overlapping stay dates. */
export function findDuplicates(candidate: DuplicateCandidate, pool: Deal[], opts: DuplicateOptions = {}): Deal[] {
  const company = normalizeCompany(candidate.company)
  if (!company) return []
  return pool.filter(d => {
    if (opts.excludeId && d.id === opts.excludeId) return false
    if (!opts.includeLost && (d.stage ?? 'New') === 'Lost') return false
    if (normalizeCompany(d.company) !== company) return false
    return datesOverlap(candidate.arrivalDate, candidate.checkoutDate, d.arrivalDate, d.checkoutDate)
  })
}

/**
 * Duplicate matches across the whole pipeline (excludes Lost deals on both sides —
 * a closed deal isn't a live double-booking risk, unlike the creation-time check).
 * Returns a map of dealId -> the other deals it matches.
 */
export function computeDuplicateMatches(deals: Deal[]): Map<string, Deal[]> {
  const pool = deals.filter(d => (d.stage ?? 'New') !== 'Lost')
  const map = new Map<string, Deal[]>()
  for (const deal of pool) {
    const matches = findDuplicates(deal, pool, { excludeId: deal.id, includeLost: true })
    if (matches.length) map.set(deal.id, matches)
  }
  return map
}
