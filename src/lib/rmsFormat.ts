// Formatting primitives for the RMS analytics page — ported from the Revenue
// Console's own frontend (utils/rms.ts) so the numbers read identically. Missing
// values render as an em dash rather than 0 or blank.

export const EMPTY = '—'

export function num(v: number | null | undefined): string {
  return v == null ? EMPTY : v.toLocaleString('en-US', { maximumFractionDigits: 1 })
}

export function money(v: number | null | undefined): string {
  return v == null ? EMPTY : `IDR ${Math.round(v).toLocaleString('en-US')}`
}

/** Compact IDR for dense tables (6.3B, 2.17M, 850K); pair with money() as a title/tooltip. */
export function moneyShort(v: number | null | undefined): string {
  if (v == null) return EMPTY
  const a = Math.abs(v)
  if (a >= 1e9) return `${(v / 1e9).toFixed(a >= 1e10 ? 1 : 2)}B`
  if (a >= 1e6) return `${(v / 1e6).toFixed(a >= 1e7 ? 1 : 2)}M`
  if (a >= 1e3) return `${Math.round(v / 1e3)}K`
  return String(Math.round(v))
}

export function signed(v: number | null | undefined): string {
  return v == null ? EMPTY : `${v > 0 ? '+' : ''}${num(v)}`
}

export function percent(v: number | null | undefined): string {
  return v == null ? EMPTY : `${v.toFixed(1)}%`
}

export function pctDiff(cur: number | null, prev: number | null): number | null {
  return cur == null || prev == null || !prev ? null : ((cur - prev) / prev) * 100
}

export function pctLabel(v: number | null): string {
  return v == null ? EMPTY : `${v > 0 ? '+' : ''}${v.toFixed(1)}%`
}

/** Tailwind class for a signed delta, using sm-project's semantic tokens (not raw emerald/rose). */
export function signClass(v: number | null | undefined): string {
  return v == null ? '' : v > 0 ? 'text-sm-won' : v < 0 ? 'text-sm-bad' : ''
}

export function ratio(a: number | null | undefined, b: number | null | undefined): number | null {
  return a == null || !b ? null : a / b
}

export function difference(a: number | null | undefined, b: number | null | undefined): number | null {
  return a == null || b == null ? null : a - b
}

/** 'Fri, 1 Nov 2026'. */
export function dayLabel(v: string): string {
  return new Date(`${v}T00:00:00Z`).toLocaleDateString('en-GB', {
    timeZone: 'UTC',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
}

/** '1 Nov 2026'. */
export function shortDayYear(v: string): string {
  if (!v) return '–'
  return new Date(`${v}T00:00:00Z`).toLocaleDateString('en-GB', { timeZone: 'UTC', day: 'numeric', month: 'short', year: 'numeric' })
}

/** A tile's "vs LY" / "vs budget" sub-line: signed %, direction-colored, with the comparison figure in parentheses. */
export function vsLabel(
  cur: number | null,
  comparison: number | null,
  fmt: (v: number | null) => string,
  label = 'vs LY'
): { text: string; tone: string } {
  if (cur == null) return { text: `${label} ${EMPTY}`, tone: '' }
  const d = pctDiff(cur, comparison)
  return { text: `${pctLabel(d)} ${label} (${fmt(comparison)})`, tone: signClass(d) }
}
