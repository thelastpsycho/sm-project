import { computed, type Ref } from 'vue'
import { canonicalVenue } from '@/lib/functionChartVenues'
import type { FunctionBooking } from '@/types/functionChart'

/**
 * Ids of bookings that clash with another booking: same room (canonical venue)
 * AND overlapping date range. Computed across ALL functions (a conflict can span
 * months), so the marker is stable regardless of which month is in view.
 *
 * Per room we sort by start and sweep once, grouping bookings into merged
 * clusters — every member of a cluster of size ≥ 2 provably overlaps at least
 * one other member, so the whole cluster is flagged. This is O(n log n) per
 * room rather than the O(n²) pairwise comparison it replaces.
 */
export function useConflicts(functions: Ref<FunctionBooking[]>) {
  const conflictIds = computed(() => {
    const byRoom = new Map<string, { id: string; start: string; end: string }[]>()
    for (const f of functions.value) {
      for (const raw of f.venues) {
        const v = canonicalVenue(raw) ?? raw
        const arr = byRoom.get(v) ?? byRoom.set(v, []).get(v)!
        arr.push({ id: f.id, start: f.startDate, end: f.endDate })
      }
    }

    const set = new Set<string>()
    for (const arr of byRoom.values()) {
      arr.sort((a, b) => (a.start < b.start ? -1 : a.start > b.start ? 1 : 0))
      let clusterMaxEnd = ''
      let cluster: { id: string }[] = []
      const flush = () => {
        if (cluster.length > 1) for (const c of cluster) set.add(c.id)
        cluster = []
        clusterMaxEnd = ''
      }
      for (const cur of arr) {
        // A gap (start after every earlier end) closes the current cluster.
        if (cluster.length && cur.start > clusterMaxEnd) flush()
        cluster.push(cur)
        if (cur.end > clusterMaxEnd) clusterMaxEnd = cur.end
      }
      flush()
    }
    return set
  })

  return { conflictIds }
}
