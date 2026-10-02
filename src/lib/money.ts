// Zero-dependency money formatting, split out of crmUtils.ts so it can also be
// imported (via a relative path, no `@/` alias) by crmReport.ts for the Vercel
// cron functions, which can't resolve `@/`-aliased imports in their build.

/** Compact IDR-style money formatting (no decimals). */
export function formatMoney(value?: number, currency = 'IDR'): string {
  if (value == null) return '—'
  return `${currency} ${Math.round(value).toLocaleString('en-US')}`
}
