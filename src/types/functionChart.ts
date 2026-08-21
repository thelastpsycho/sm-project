// Types + constants for the Function Chart (venue booking) feature.

export const FUNCTION_STATUSES = ['definite', 'tentative', 'waitingList', 'foc'] as const
export type FunctionStatus = (typeof FUNCTION_STATUSES)[number]

/** Display label + accent color per status. Colors read on both light and dark themes. */
export const STATUS_META: Record<FunctionStatus, { label: string; color: string }> = {
  definite: { label: 'Definite', color: '#059669' }, // emerald
  tentative: { label: 'Tentative', color: '#D97706' }, // amber
  waitingList: { label: 'Waiting List', color: '#2563EB' }, // blue
  foc: { label: 'FOC', color: '#7C3AED' } // violet
}

/**
 * Pastel Tailwind classes per status (soft tinted bg + colored left border + dark
 * readable text, with dark-mode variants). Full literal strings so Tailwind's JIT
 * scanner keeps them. `block` is for the grid cell, `chip` for status pills, `dot`
 * for the legend swatch.
 */
export const STATUS_STYLE: Record<FunctionStatus, { block: string; chip: string; dot: string }> = {
  definite: {
    block: 'bg-emerald-50 text-emerald-900 border-emerald-500 dark:bg-emerald-500/15 dark:text-emerald-100',
    chip: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200',
    dot: 'bg-emerald-500'
  },
  tentative: {
    block: 'bg-amber-50 text-amber-900 border-amber-500 dark:bg-amber-500/15 dark:text-amber-100',
    chip: 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200',
    dot: 'bg-amber-500'
  },
  waitingList: {
    block: 'bg-blue-50 text-blue-900 border-blue-500 dark:bg-blue-500/15 dark:text-blue-100',
    chip: 'bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-200',
    dot: 'bg-blue-500'
  },
  foc: {
    block: 'bg-violet-50 text-violet-900 border-violet-500 dark:bg-violet-500/15 dark:text-violet-100',
    chip: 'bg-violet-100 text-violet-800 dark:bg-violet-500/20 dark:text-violet-200',
    dot: 'bg-violet-500'
  }
}

export interface FunctionBooking {
  id: string
  salesOwner: string
  company: string
  eventName: string
  pax: number
  venues: string[] // one atomic room, or several adjacent rooms for a combined booking
  status: FunctionStatus
  startDate: string // YYYY-MM-DD
  endDate: string // YYYY-MM-DD (== startDate for single-day)
  note?: string
  createdAt: Date
  updatedAt: Date
}

/** Payload for creating a booking (server fills id + timestamps). */
export type NewFunctionBooking = Omit<FunctionBooking, 'id' | 'createdAt' | 'updatedAt'>
