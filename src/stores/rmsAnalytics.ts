// Caches the RMS /room-types lookup (companies, markets, nationalities, roomTypes,
// labels) once for the session — the one piece of the Company Analytics page that's
// genuinely shared/global rather than page-local. Filter state, pace/reports data and
// fetch orchestration live in the page itself (src/pages/CompanyAnalytics.vue), since
// nothing else in the app uses them.

import { defineStore } from 'pinia'
import { ref } from 'vue'
import { fetchRoomTypes } from '@/lib/rmsApi'
import type { RmsRoomTypesResponse } from '@/types/rms'

export const useRmsAnalyticsStore = defineStore('rmsAnalytics', () => {
  const lookup = ref<RmsRoomTypesResponse | null>(null)
  const lookupLoading = ref(false)
  const lookupError = ref<string | null>(null)

  async function loadLookup(force = false): Promise<void> {
    if (lookup.value && !force) return
    lookupLoading.value = true
    lookupError.value = null
    try {
      lookup.value = await fetchRoomTypes()
    } catch (err) {
      lookupError.value = err instanceof Error ? err.message : 'Failed to load companies.'
    } finally {
      lookupLoading.value = false
    }
  }

  return { lookup, lookupLoading, lookupError, loadLookup }
})
