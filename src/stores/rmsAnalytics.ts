// Caches the RMS /room-types lookup (companies, markets, nationalities, roomTypes,
// labels) once for the session — the one piece of the Company Analytics page that's
// genuinely shared/global rather than page-local. Filter state, pace/reports data and
// fetch orchestration live in the page itself (src/pages/CompanyAnalytics.vue), since
// nothing else in the app uses them.
//
// Also cached to localStorage: a cold Vercel function has to do a full RMS login
// round-trip before it can even serve this lookup (see api/rms/_shared.ts), so a plain
// in-memory cache still means every fresh page load eats that latency. Stale-while-
// revalidate here lets the dropdown render instantly from the last known list while a
// background fetch quietly refreshes it.

import { defineStore } from 'pinia'
import { ref } from 'vue'
import { fetchRoomTypes } from '@/lib/rmsApi'
import type { RmsRoomTypesResponse } from '@/types/rms'

const CACHE_KEY = 'rc:rms-lookup-cache'
const CACHE_TTL_MS = 20 * 60 * 1000 // companies/markets/nationalities change rarely

function readCache(): RmsRoomTypesResponse | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const { data, fetchedAt } = JSON.parse(raw)
    if (typeof fetchedAt !== 'number' || Date.now() - fetchedAt > CACHE_TTL_MS) return null
    return data as RmsRoomTypesResponse
  } catch {
    return null
  }
}

function writeCache(data: RmsRoomTypesResponse): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ data, fetchedAt: Date.now() }))
  } catch {
    // ignore — private browsing / full quota just means nothing persists
  }
}

export const useRmsAnalyticsStore = defineStore('rmsAnalytics', () => {
  const lookup = ref<RmsRoomTypesResponse | null>(null)
  const lookupLoading = ref(false)
  const lookupError = ref<string | null>(null)

  async function loadLookup(force = false): Promise<void> {
    if (lookup.value && !force) return

    const cached = force ? null : readCache()
    if (cached) lookup.value = cached
    else lookupLoading.value = true
    lookupError.value = null

    try {
      const fresh = await fetchRoomTypes()
      lookup.value = fresh
      writeCache(fresh)
    } catch (err) {
      if (!cached) lookupError.value = err instanceof Error ? err.message : 'Failed to load companies.'
    } finally {
      lookupLoading.value = false
    }
  }

  return { lookup, lookupLoading, lookupError, loadLookup }
})
