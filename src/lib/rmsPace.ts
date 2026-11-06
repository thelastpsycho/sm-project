// Pace bucketing + Chart.js shaping — ported from the Revenue Console frontend
// (utils/rms.ts: paceBuckets/paceChartTable/paceChartData/PACE_CHART_OPTIONS) so the
// "Pace vs last year" chart and its summary table compute identically.

import type { ChartOptions, ChartTypeRegistry } from 'chart.js'
import type { RmsPaceRow } from '@/types/rms'
import { ratio } from './rmsFormat'

export type RevenueBasis = 'gross' | 'net'
export type ChartView = 'daily' | 'weekly' | 'monthly'

export const addDays = (iso: string, n: number): string => {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

export const sumKnown = (values: (number | null)[]): number | null =>
  values.some(v => v == null) ? null : values.reduce<number>((s, v) => s + (v ?? 0), 0)

/** Current-period rooms, nulled out when the day's quality says not to trust it. */
export const currentRooms = (r: RmsPaceRow): number | null => (r.currentQuality === 'unavailable' ? null : r.rooms)
export const revenueFor = (r: RmsPaceRow, basis: RevenueBasis): number => (basis === 'gross' ? r.revenue : r.netRevenue)
export const pickupRevenueFor = (r: RmsPaceRow, basis: RevenueBasis): number | null =>
  basis === 'gross' ? r.pickupRevenue : r.pickupNetRevenue

export interface PaceBucket {
  key: string
  rooms: number | null
  comparison: number | null
  revenue: number | null
  comparisonRevenue: number | null
  adr: number | null
  comparisonAdr: number | null
  budgetRooms: number | null
  budgetRevenue: number | null
  budgetAdr: number | null
}

export function paceBuckets(rows: RmsPaceRow[], chartView: ChartView, basis: RevenueBasis): PaceBucket[] {
  const m = new Map<string, RmsPaceRow[]>()
  for (const r of rows) {
    let key = r.date
    if (chartView === 'monthly') key = key.slice(0, 7)
    if (chartView === 'weekly') key = addDays(key, -((new Date(`${key}T00:00:00Z`).getUTCDay() + 6) % 7))
    m.set(key, [...(m.get(key) || []), r])
  }
  return [...m.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, rs]) => {
      const bucketRevenue = sumKnown(rs.map(r => (currentRooms(r) == null ? null : revenueFor(r, basis))))
      const bucketIdrRooms = rs.reduce((s, r) => s + r.idrRooms, 0)
      const bucketComparisonRevenue = sumKnown(rs.map(r => (basis === 'gross' ? r.stlyRevenue : r.stlyNetRevenue)))
      const bucketStlyIdrRooms = sumKnown(rs.map(r => r.stlyIdrRooms))
      const bucketBudgetRooms = sumKnown(rs.map(r => r.budgetRooms))
      const bucketBudgetRevenue = sumKnown(rs.map(r => r.budgetRevenue))
      return {
        key,
        rooms: sumKnown(rs.map(currentRooms)),
        comparison: sumKnown(rs.map(r => r.stlyRooms)),
        revenue: bucketRevenue,
        comparisonRevenue: bucketComparisonRevenue,
        adr: ratio(bucketRevenue, bucketIdrRooms),
        comparisonAdr: ratio(bucketComparisonRevenue, bucketStlyIdrRooms),
        budgetRooms: bucketBudgetRooms,
        budgetRevenue: bucketBudgetRevenue,
        budgetAdr: ratio(bucketBudgetRevenue, bucketBudgetRooms)
      }
    })
}

export function paceChartTable(buckets: PaceBucket[], rows: RmsPaceRow[]) {
  const totalRevenue = sumKnown(buckets.map(x => x.revenue))
  const totalComparisonRevenue = sumKnown(buckets.map(x => x.comparisonRevenue))
  const totalIdrRooms = rows.reduce((s, r) => s + r.idrRooms, 0)
  const totalStlyIdrRooms = sumKnown(rows.map(r => r.stlyIdrRooms))
  const totalBudgetRooms = sumKnown(buckets.map(x => x.budgetRooms))
  const totalBudgetRevenue = sumKnown(buckets.map(x => x.budgetRevenue))
  return {
    buckets,
    totals: {
      rooms: sumKnown(buckets.map(x => x.rooms)),
      comparison: sumKnown(buckets.map(x => x.comparison)),
      revenue: totalRevenue,
      comparisonRevenue: totalComparisonRevenue,
      adr: ratio(totalRevenue, totalIdrRooms),
      comparisonAdr: ratio(totalComparisonRevenue, totalStlyIdrRooms),
      budgetRooms: totalBudgetRooms,
      budgetRevenue: totalBudgetRevenue,
      budgetAdr: ratio(totalBudgetRevenue, totalBudgetRooms)
    }
  }
}

export function paceChartData(buckets: PaceBucket[], compareWithBudget: boolean) {
  return {
    labels: buckets.map(b => b.key),
    datasets: [
      {
        type: 'bar' as const,
        label: 'OTB room nights',
        data: buckets.map(b => b.rooms),
        backgroundColor: '#1C1C1E',
        yAxisID: 'rooms',
        order: 2
      },
      compareWithBudget
        ? {
            type: 'bar' as const,
            label: 'Budget nights (gross)',
            data: buckets.map(b => b.budgetRooms),
            backgroundColor: '#fcd34d',
            yAxisID: 'rooms',
            order: 2
          }
        : {
            type: 'bar' as const,
            label: 'Comparison nights',
            data: buckets.map(b => b.comparison),
            backgroundColor: '#c7ccd6',
            yAxisID: 'rooms',
            order: 2
          },
      {
        type: 'line' as const,
        label: 'IDR ADR',
        data: buckets.map(b => b.adr),
        borderColor: '#1E9E4A',
        yAxisID: 'adr',
        order: 1
      },
      compareWithBudget
        ? {
            type: 'line' as const,
            label: 'Budget ADR (gross)',
            data: buckets.map(b => b.budgetAdr),
            borderColor: '#C77700',
            borderDash: [4, 4],
            yAxisID: 'adr',
            order: 1
          }
        : {
            type: 'line' as const,
            label: 'Comparison ADR',
            data: buckets.map(b => b.comparisonAdr),
            borderColor: '#9ca3af',
            borderDash: [4, 4],
            yAxisID: 'adr',
            order: 1
          }
    ]
  }
}

export const PACE_CHART_OPTIONS: ChartOptions<keyof ChartTypeRegistry> = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: { mode: 'index', intersect: false },
  scales: {
    rooms: {
      position: 'left',
      beginAtZero: true,
      title: { display: true, text: 'Room nights' }
    },
    adr: {
      position: 'right',
      min: 1000000,
      grid: { drawOnChartArea: false },
      title: { display: true, text: 'ADR (IDR)' }
    }
  }
}
