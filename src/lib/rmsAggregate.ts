// Pure aggregation over RMS pace/reports data — quality-aware: unavailable figures
// never contribute to a total, and a total that includes any estimated row is itself
// marked estimated (so the KPI/chart UI can badge it).

import type { RmsMarketTrendPoint, RmsPaceRow, RmsQuality } from '@/types/rms'
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

export interface TrendPoint {
  date: string
  rooms: Quantified
  revenue: Quantified
}

/**
 * marketTrend[] carries one row per market/group per date, with no per-row quality —
 * /reports has a single report-wide `quality` covering every row's current-period
 * figures instead. Sum across markets so a company-filtered query still gets one
 * point per date, tagged with that report-wide quality.
 */
export function aggregateMarketTrend(points: RmsMarketTrendPoint[], quality: RmsQuality): TrendPoint[] {
  const byDate = new Map<string, RmsMarketTrendPoint[]>()
  for (const p of points) {
    const group = byDate.get(p.date) ?? []
    group.push(p)
    byDate.set(p.date, group)
  }
  return Array.from(byDate.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, group]) => ({
      date,
      rooms: sumQuantified(group.map(g => ({ value: g.rooms, quality }))),
      revenue: sumQuantified(group.map(g => ({ value: g.revenue, quality })))
    }))
}
