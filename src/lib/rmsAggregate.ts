// Pure aggregation over RMS pace/reports data — quality-aware: unavailable figures
// never contribute to a total, and a total that includes any estimated row is itself
// marked estimated (so the KPI/chart UI can badge it).

import type { RmsPaceRow, RmsQuality } from '@/types/rms'
import { formatShortDateNoYear } from './dateFormat'
import { isRenderable, rollupQuality } from './rmsQuality'

export interface Quantified {
  value: number
  quality: RmsQuality
}

interface Quantifiable {
  value: number | null
  quality: RmsQuality
}

function sumQuantified(items: Quantifiable[]): Quantified {
  const included = items.filter((i): i is Quantifiable & { value: number } => isRenderable(i.quality) && i.value != null)
  const total = included.reduce((sum, i) => sum + i.value, 0)
  return { value: total, quality: rollupQuality(included.map(i => i.quality)) }
}

export interface PaceTotals {
  rooms: Quantified
  revenue: Quantified
  netRevenue: Quantified
  pickupRooms: Quantified
  pickupRevenue: Quantified
}

export function aggregatePace(rows: RmsPaceRow[]): PaceTotals {
  return {
    rooms: sumQuantified(rows.map(r => ({ value: r.rooms, quality: r.currentQuality }))),
    revenue: sumQuantified(rows.map(r => ({ value: r.revenue, quality: r.currentQuality }))),
    netRevenue: sumQuantified(rows.map(r => ({ value: r.netRevenue, quality: r.currentQuality }))),
    pickupRooms: sumQuantified(rows.map(r => ({ value: r.pickupRooms, quality: r.pickupQuality }))),
    pickupRevenue: sumQuantified(rows.map(r => ({ value: r.pickupRevenue, quality: r.pickupQuality })))
  }
}

export type PaceGranularity = 'day' | 'week' | 'month'

export interface PacePeriod {
  key: string
  label: string
  rooms: Quantified
  revenue: Quantified
  /** Same time last year, on-the-books at the equivalent lead time — the conventional "pace" comparison. */
  stlyRooms: Quantified
  stlyRevenue: Quantified
}

function summarizeRows(rows: RmsPaceRow[]): Omit<PacePeriod, 'key' | 'label'> {
  return {
    rooms: sumQuantified(rows.map(r => ({ value: r.rooms, quality: r.currentQuality }))),
    revenue: sumQuantified(rows.map(r => ({ value: r.revenue, quality: r.currentQuality }))),
    stlyRooms: sumQuantified(rows.map(r => ({ value: r.stlyRooms, quality: r.comparisonQuality }))),
    stlyRevenue: sumQuantified(rows.map(r => ({ value: r.stlyRevenue, quality: r.comparisonQuality })))
  }
}

/** Monday of the ISO week containing the given 'YYYY-MM-DD' date. */
function weekStart(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number) as [number, number, number]
  const date = new Date(Date.UTC(y, m - 1, d))
  const dow = date.getUTCDay() // 0=Sun..6=Sat
  date.setUTCDate(date.getUTCDate() - ((dow + 6) % 7))
  return date.toISOString().slice(0, 10)
}

function periodKeyAndLabel(dateStr: string, granularity: PaceGranularity): { key: string; label: string } {
  if (granularity === 'month') {
    const key = dateStr.slice(0, 7)
    return { key, label: key }
  }
  if (granularity === 'week') {
    const start = weekStart(dateStr)
    return { key: start, label: formatShortDateNoYear(start) }
  }
  return { key: dateStr, label: formatShortDateNoYear(dateStr) }
}

/** Buckets daily /pace rows into day/week/month periods, summing each bucket's current + stly figures. */
export function aggregatePaceByPeriod(rows: RmsPaceRow[], granularity: PaceGranularity): PacePeriod[] {
  const buckets = new Map<string, { label: string; rows: RmsPaceRow[] }>()
  for (const row of rows) {
    const { key, label } = periodKeyAndLabel(row.date, granularity)
    const bucket = buckets.get(key) ?? { label, rows: [] }
    bucket.rows.push(row)
    buckets.set(key, bucket)
  }
  return Array.from(buckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, bucket]) => ({ key, label: bucket.label, ...summarizeRows(bucket.rows) }))
}

/** Same shape as a PacePeriod, summed across every row regardless of granularity — the "TOTAL" column. */
export function aggregatePaceTotal(rows: RmsPaceRow[]): Omit<PacePeriod, 'key' | 'label'> {
  return summarizeRows(rows)
}

/** Average Daily Rate = revenue / rooms. Null (not zero) when either side is unavailable or rooms is 0, so it renders as unavailable rather than a fake $0. */
export function computeAdr(revenue: Quantified, rooms: Quantified): Quantified | null {
  if (!isRenderable(revenue.quality) || !isRenderable(rooms.quality) || rooms.value <= 0) return null
  return { value: revenue.value / rooms.value, quality: rollupQuality([revenue.quality, rooms.quality]) }
}

/** Percent change of current vs a base period; null when the base is 0 (undefined growth). */
export function pctDelta(current: number, base: number): number | null {
  if (base === 0) return null
  return ((current - base) / base) * 100
}
