// Shared date-range presets for report/filter bars (used by CRM.vue and PipelineReport.vue).
import { baliToday } from './time'

export type RangePreset =
  | 'all'
  | 'today'
  | 'yesterday'
  | 'thisWeek'
  | 'lastWeek'
  | 'last7'
  | 'mtd'
  | 'lastMonth'
  | 'last30'
  | 'thisYear'
  | 'lastYear'
  | 'custom'

export const RANGE_OPTIONS: { value: RangePreset; label: string }[] = [
  { value: 'all', label: 'All period' },
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'thisWeek', label: 'This week' },
  { value: 'lastWeek', label: 'Last week' },
  { value: 'last7', label: 'Last 7 days' },
  { value: 'mtd', label: 'Month to date' },
  { value: 'lastMonth', label: 'Last month' },
  { value: 'last30', label: 'Last 30 days' },
  { value: 'thisYear', label: 'Year to date' },
  { value: 'lastYear', label: 'Last year' },
  { value: 'custom', label: 'Custom' }
]

function isoAddDays(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number) as [number, number, number]
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10)
}
function isoWeekday(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number) as [number, number, number]
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay() // 0=Sun … 6=Sat
}
function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

/**
 * Resolves a preset to an inclusive [from, to] date range, anchored on Bali "today".
 * Returns null for presets that don't derive a fixed range ('all', 'custom').
 */
export function presetRange(preset: RangePreset): { from: string; to: string } | null {
  const today = baliToday()
  switch (preset) {
    case 'today':
      return { from: today, to: today }
    case 'yesterday': {
      const y = isoAddDays(today, -1)
      return { from: y, to: y }
    }
    case 'thisWeek': {
      const monday = isoAddDays(today, -((isoWeekday(today) + 6) % 7))
      return { from: monday, to: today }
    }
    case 'lastWeek': {
      const thisMonday = isoAddDays(today, -((isoWeekday(today) + 6) % 7))
      return { from: isoAddDays(thisMonday, -7), to: isoAddDays(thisMonday, -1) }
    }
    case 'last7':
      return { from: isoAddDays(today, -6), to: today }
    case 'mtd':
      return { from: `${today.slice(0, 7)}-01`, to: today }
    case 'lastMonth': {
      const [ty, tm] = today.split('-').map(Number) as [number, number, number]
      const first = new Date(Date.UTC(ty, tm - 2, 1))
      const lmYear = first.getUTCFullYear()
      const lmMonthIndex0 = first.getUTCMonth()
      const lastDay = new Date(Date.UTC(lmYear, lmMonthIndex0 + 1, 0)).getUTCDate()
      const ym = `${lmYear}-${pad2(lmMonthIndex0 + 1)}`
      return { from: `${ym}-01`, to: `${ym}-${pad2(lastDay)}` }
    }
    case 'last30':
      return { from: isoAddDays(today, -29), to: today }
    case 'thisYear':
      return { from: `${today.slice(0, 4)}-01-01`, to: today }
    case 'lastYear': {
      const y = Number(today.slice(0, 4)) - 1
      return { from: `${y}-01-01`, to: `${y}-12-31` }
    }
    default:
      return null
  }
}
