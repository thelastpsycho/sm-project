import { ref, type Ref } from 'vue'
import { canonicalVenue, comboName, isValidVenueSelection } from '@/lib/functionChartVenues'
import { COL_W, ROW_H, rowByVenue, venueByRow } from './useFunctionGrid'
import type { FunctionBooking } from '@/types/functionChart'

type MovePatch = { startDate: string; endDate: string; venues: string[] }

function shiftISO(iso: string, days: number): string {
  return new Date(Date.parse(iso + 'T00:00:00Z') + days * 86400000).toISOString().slice(0, 10)
}
function diffDays(a: string, b: string): number {
  return Math.round((Date.parse(a + 'T00:00:00Z') - Date.parse(b + 'T00:00:00Z')) / 86400000)
}

/**
 * Drag & drop rescheduling for the desktop grid. Dragging a booking block onto a
 * day/venue cell shifts the whole booking there, preserving its duration (day
 * span) and room shape (number/adjacency of rooms). A move is staged in
 * `pendingMove` and surfaces any conflicts before it's written — the block never
 * moves until confirmed. Gated behind `canEdit`.
 */
export function useDragReschedule(opts: {
  functions: Ref<FunctionBooking[]>
  canEdit: Ref<boolean>
  fmt: (iso: string) => string
  updateFunction: (id: string, patch: Partial<FunctionBooking>) => Promise<void>
}) {
  const { functions, canEdit, fmt, updateFunction } = opts

  const draggingId = ref('')
  const dragOverKey = ref('')
  let grabDayOffset = 0 // which day column within the block the pointer grabbed (0-based)
  let grabRowOffset = 0 // which room row within the block the pointer grabbed (0-based)

  const pendingMove = ref<{
    id: string
    patch: MovePatch
    message: string
    conflicts: FunctionBooking[]
  } | null>(null)
  const moveSaving = ref(false)

  // Shift every room of a booking by `rowDelta` grid rows. Returns null if any
  // room would land out of bounds or on a category header row.
  function venuesForRowShift(f: FunctionBooking, rowDelta: number): string[] | null {
    if (rowDelta === 0) return [...f.venues]
    const out: string[] = []
    for (const v of f.venues) {
      const cur = rowByVenue.get(canonicalVenue(v) ?? v)
      if (cur == null) return null
      const label = venueByRow.get(cur + rowDelta)
      if (!label) return null
      out.push(label)
    }
    return out
  }

  // Other bookings that share a venue AND overlap the proposed date range.
  function findConflicts(id: string, venues: string[], start: string, end: string): FunctionBooking[] {
    const canon = new Set(venues.map((v) => canonicalVenue(v) ?? v))
    return functions.value.filter(
      (f) =>
        f.id !== id &&
        f.startDate <= end &&
        f.endDate >= start &&
        f.venues.some((v) => canon.has(canonicalVenue(v) ?? v))
    )
  }

  function onBlockDragStart(e: DragEvent, b: { key: string; colSpan: number; rowSpan: number }) {
    if (!canEdit.value) {
      e.preventDefault()
      return
    }
    draggingId.value = b.key
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    grabDayOffset = Math.min(b.colSpan - 1, Math.max(0, Math.floor((e.clientX - rect.left) / COL_W)))
    grabRowOffset = Math.min(b.rowSpan - 1, Math.max(0, Math.floor((e.clientY - rect.top) / ROW_H)))
    if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move'
  }

  function onBlockDragEnd() {
    draggingId.value = ''
    dragOverKey.value = ''
  }

  function onCellDragOver(line: { key: string }, d: { date: string }) {
    if (!draggingId.value) return
    dragOverKey.value = line.key + '|' + d.date
  }

  function onCellDrop(line: { row: number }, d: { date: string }) {
    const id = draggingId.value
    draggingId.value = ''
    dragOverKey.value = ''
    if (!id || !canEdit.value) return
    const f = functions.value.find((x) => x.id === id)
    if (!f) return

    const rows = f.venues
      .map((v) => rowByVenue.get(canonicalVenue(v) ?? v))
      .filter((r): r is number => r != null)
    if (!rows.length) return
    const rowStart = Math.min(...rows)

    // Map the grabbed cell of the block onto the drop cell.
    const newStart = shiftISO(d.date, -grabDayOffset)
    const dateDelta = diffDays(newStart, f.startDate)
    const rowDelta = line.row - (rowStart + grabRowOffset)
    if (dateDelta === 0 && rowDelta === 0) return

    const newVenues = venuesForRowShift(f, rowDelta)
    if (!newVenues) return // out of bounds or crosses a category header row
    if (newVenues.length > 1 && !isValidVenueSelection(newVenues)) return // broke a combo run

    const patch: MovePatch = {
      startDate: shiftISO(f.startDate, dateDelta),
      endDate: shiftISO(f.endDate, dateDelta),
      venues: newVenues
    }
    const conflicts = findConflicts(id, patch.venues, patch.startDate, patch.endDate)

    const venueLabel = comboName(patch.venues)
    const dateLabel = patch.startDate === patch.endDate ? fmt(patch.startDate) : `${fmt(patch.startDate)} – ${fmt(patch.endDate)}`
    let message = `Move “${f.eventName || '(untitled)'}” to ${venueLabel} on ${dateLabel}?`
    if (conflicts.length) {
      const names = conflicts
        .slice(0, 3)
        .map((c) => `${c.eventName || '(untitled)'} (${comboName(c.venues)})`)
        .join(', ')
      message =
        `${venueLabel} already has ${conflicts.length} booking${conflicts.length > 1 ? 's' : ''} on ${dateLabel}: ` +
        `${names}${conflicts.length > 3 ? '…' : ''}. Move here anyway?`
    }

    pendingMove.value = { id, patch, message, conflicts }
  }

  async function applyMove() {
    const move = pendingMove.value
    if (!move || !canEdit.value) return
    moveSaving.value = true
    try {
      await updateFunction(move.id, move.patch)
      pendingMove.value = null
    } catch {
      // store surfaces the error; keep the dialog open for retry
    } finally {
      moveSaving.value = false
    }
  }

  function cancelMove() {
    pendingMove.value = null // booking stays put — nothing was written
  }

  return {
    draggingId,
    dragOverKey,
    pendingMove,
    moveSaving,
    onBlockDragStart,
    onBlockDragEnd,
    onCellDragOver,
    onCellDrop,
    applyMove,
    cancelMove
  }
}
