// Shared short-date formatting for the RFP / tactical-offer UI surfaces — previously
// copy-pasted identically (or near-identically) into DateRangePicker.vue, ReviewModal.vue,
// TacticalOffer.vue, RFP.vue and RFPHistory.vue. Distinct from crmUtils.formatDate (the
// CRM's en-GB "19 Jan 2026" format) and time.ts (Bali-calendar day arithmetic) — those
// serve a different domain and are left as-is.

/** 'Jan 19, 2026' for a date-constructible string; '' if empty/invalid. */
export function formatShortDate(dateString?: string): string {
  if (!dateString) return ''
  const d = new Date(dateString)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

/** 'Jan 19' (no year) — the compact label used on the RFP form's date pickers. */
export function formatShortDateNoYear(dateString?: string): string {
  if (!dateString) return ''
  const d = new Date(dateString)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

/** 'Jan 19, 3:45 PM' from a Firestore Timestamp (or any Date-constructible value). */
export function formatTimestampShort(value: { toDate?: () => Date } | string | number | null | undefined): string {
  if (!value) return ''
  const date = typeof value === 'object' && typeof (value as { toDate?: () => Date }).toDate === 'function'
    ? (value as { toDate: () => Date }).toDate()
    : new Date(value as string | number)
  if (isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(date)
}
