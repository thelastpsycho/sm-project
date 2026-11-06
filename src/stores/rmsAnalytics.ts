import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { fetchPace, fetchReports, fetchRoomTypes } from '@/lib/rmsApi'
import { baliToday } from '@/lib/time'
import type { RmsDateBasis, RmsPaceRow, RmsReportsResponse, RmsRoomTypesResponse } from '@/types/rms'

function daysAgo(n: number): string {
  const [y, m, d] = baliToday().split('-').map(Number) as [number, number, number]
  return new Date(Date.UTC(y, m - 1, d - n)).toISOString().slice(0, 10)
}

/** Matches /pace's own default; passed explicitly so /reports' pickup bucket ('7') is guaranteed present regardless of its default. */
export const PICKUP_DAYS = 7

export const useRmsAnalyticsStore = defineStore('rmsAnalytics', () => {
  // Lookup payload (companies, markets, nationalities, roomTypes, labels) — fetched
  // once and cached for the life of the session; the company picker reads off it.
  const lookup = ref<RmsRoomTypesResponse | null>(null)
  const lookupLoading = ref(false)
  const lookupError = ref<string | null>(null)

  // Filters
  const selectedCompanyIds = ref<string[]>([])
  const rangeStart = ref(daysAgo(29))
  const rangeEnd = ref(baliToday())
  // /reports-only filter (the RMS API doesn't accept dateBasis on /pace).
  const dateBasis = ref<RmsDateBasis>('stay')

  // /pace
  const paceRows = ref<RmsPaceRow[]>([])
  const paceLoading = ref(false)
  const paceError = ref<string | null>(null)

  // /reports
  const reports = ref<RmsReportsResponse | null>(null)
  const reportsLoading = ref(false)
  const reportsError = ref<string | null>(null)

  // Company ids are numbers on /room-types; the query param and the multi-select's
  // v-model both work in strings, so stringify once here.
  const companyOptions = computed(() =>
    (lookup.value?.companies ?? []).map(c => ({ value: String(c.id), label: c.name }))
  )

  const companyIdsParam = computed(() =>
    selectedCompanyIds.value.length ? selectedCompanyIds.value.join(',') : undefined
  )

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

  async function loadPace(): Promise<void> {
    paceLoading.value = true
    paceError.value = null
    try {
      paceRows.value = await fetchPace({
        start: rangeStart.value,
        end: rangeEnd.value,
        companyIds: companyIdsParam.value,
        pickupDays: PICKUP_DAYS
      })
    } catch (err) {
      paceError.value = err instanceof Error ? err.message : 'Failed to load pace data.'
    } finally {
      paceLoading.value = false
    }
  }

  async function loadReports(): Promise<void> {
    reportsLoading.value = true
    reportsError.value = null
    try {
      reports.value = await fetchReports({
        start: rangeStart.value,
        end: rangeEnd.value,
        companyIds: companyIdsParam.value,
        pickupDays: PICKUP_DAYS,
        dateBasis: dateBasis.value
      })
    } catch (err) {
      reportsError.value = err instanceof Error ? err.message : 'Failed to load reports data.'
    } finally {
      reportsLoading.value = false
    }
  }

  /** Refetches /pace and /reports for the current filters. Call after changing companies/range. */
  async function refresh(): Promise<void> {
    await Promise.all([loadPace(), loadReports()])
  }

  function setCompanies(ids: string[]): void {
    selectedCompanyIds.value = ids
  }

  function setRange(start: string, end: string): void {
    rangeStart.value = start
    rangeEnd.value = end
  }

  function setDateBasis(basis: RmsDateBasis): void {
    dateBasis.value = basis
  }

  return {
    lookup,
    lookupLoading,
    lookupError,
    companyOptions,
    selectedCompanyIds,
    rangeStart,
    rangeEnd,
    dateBasis,
    paceRows,
    paceLoading,
    paceError,
    reports,
    reportsLoading,
    reportsError,
    loadLookup,
    loadPace,
    loadReports,
    refresh,
    setCompanies,
    setRange,
    setDateBasis
  }
})
