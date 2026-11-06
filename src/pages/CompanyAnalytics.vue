<template>
  <div class="min-h-screen bg-white dark:bg-sm-bg-dark">
    <div class="max-w-[1280px] mx-auto px-6 lg:px-12 pt-10 lg:pt-9 pb-32">
      <!-- Header -->
      <div>
        <span class="sm-eyebrow">Revenue Console · RMS</span>
        <h1 class="sm-display text-display mt-2">Company Analytics</h1>
        <p class="mt-1.5 text-sm text-sm-muted max-w-2xl">
          Length of stay, nationality, booking behaviour, pace & pickups and production — filterable to one or more companies.
        </p>
      </div>

      <!-- Filter bar -->
      <form class="mt-4 rounded-xl border border-sm-line dark:border-white/10 p-3 relative flex flex-wrap items-end gap-3" @submit.prevent="apply">
        <div ref="dateMenuRef" class="relative">
          <span class="block sm-eyebrow mb-2">Stay dates</span>
          <button type="button" class="sm-filter-trigger" :aria-expanded="dateMenuOpen" @click="dateMenuOpen = !dateMenuOpen">
            <CalendarDaysIcon class="w-3.5 h-3.5 text-sm-faint" />
            {{ shortDayYear(filters.start) }} – {{ shortDayYear(filters.end) }}
          </button>
          <div v-if="dateMenuOpen" class="absolute left-0 top-full z-30 mt-1 w-72 space-y-3 rounded-lg border border-sm-line dark:border-white/10 bg-white dark:bg-sm-card-dark shadow-lg p-3">
            <div class="grid grid-cols-3 gap-1.5">
              <button type="button" class="sm-flat-btn" @click="thisMonth">This month</button>
              <button type="button" class="sm-flat-btn" @click="applyDatePreset(3)">3 months</button>
              <button type="button" class="sm-flat-btn" @click="applyDatePreset(5)">5 months</button>
            </div>
            <div class="border-t border-sm-hair dark:border-white/5 pt-3 space-y-2">
              <span class="block sm-eyebrow">Custom range</span>
              <div class="grid grid-cols-2 gap-2">
                <SmInput v-model="filters.start" type="date" label="From" size="sm" />
                <SmInput v-model="filters.end" type="date" label="To" size="sm" />
              </div>
              <div class="flex justify-end">
                <SmButton size="sm" :disabled="!filters.start || !filters.end" @click="dateMenuOpen = false">Done</SmButton>
              </div>
            </div>
          </div>
        </div>

        <div class="w-36">
          <SmSelect v-model="filters.roomType" :options="roomTypeOptions" label="Room type" placeholder="All room types" size="sm" />
        </div>
        <div class="w-40">
          <SmSelect v-model="filters.marketId" :options="marketOptions" label="Market" placeholder="All markets" size="sm" />
        </div>
        <div class="w-56">
          <SmMultiSelect v-model="filters.companyIds" :options="companyOptions" label="Company" placeholder="All companies" :empty-label="store.lookupLoading ? 'Loading…' : 'No companies found'" size="sm" />
        </div>
        <div class="w-56">
          <SmMultiSelect v-model="filters.nationalityIds" :options="nationalityOptions" label="Nationality" placeholder="All nationalities" size="sm" />
        </div>
        <div class="w-40">
          <SmSelect v-model="filters.group" :options="bookingTypeOptions" label="Booking type" size="sm" />
        </div>
        <div class="w-48">
          <SmSelect v-model="compareSelection" :options="compareOptions" label="Compare with" size="sm" />
        </div>
        <div v-if="compareSelection === 'custom'" class="w-40">
          <SmInput v-model="filters.comparisonStart" type="date" label="Comparison begins" required size="sm" />
        </div>
        <div class="w-32">
          <SmSelect :model-value="String(filters.pickupDays)" :options="pickupOptions" label="Pickup window" size="sm" @update:model-value="v => (filters.pickupDays = Number(v))" />
        </div>
        <div class="w-40">
          <SmSelect v-model="basis" :options="basisOptions" label="Revenue basis" size="sm" />
        </div>
        <SmButton size="sm" type="submit" :class="dirty ? 'ring-2 ring-sm-warn/50' : ''">{{ dirty ? 'Apply changes' : 'Apply' }}</SmButton>
      </form>

      <!-- Tabs -->
      <nav class="mt-6 flex gap-1 border-b border-sm-line dark:border-white/10" role="tablist" aria-label="Company analytics sections">
        <button
          v-for="t in tabs"
          :key="t.id"
          type="button"
          role="tab"
          class="px-3 py-2 text-xsm font-bold border-b-2 -mb-px transition-colors"
          :class="tab === t.id ? 'border-sm-ink dark:border-white text-sm-ink dark:text-white' : 'border-transparent text-sm-muted hover:text-sm-ink dark:hover:text-white'"
          :aria-selected="tab === t.id"
          @click="selectTab(t.id)"
        >
          {{ t.label }}
        </button>
      </nav>

      <p v-if="error" role="alert" class="mt-4 text-sm text-sm-bad">{{ error }}</p>

      <div v-if="!loaded" class="text-center py-16 text-sm-faint">Choose your filters, then click Apply to load analytics.</div>

      <div v-else class="mt-6">
        <PaceTab
          v-if="tab === 'pace' && loaded"
          :loading="paceLoading"
          :rows="paceRows"
          :basis="basis"
          :pickup-days="loaded.pickupDays"
          :compare-with-budget="loaded.compareWith === 'budget'"
        />
        <LengthOfStayTab v-if="tab === 'lengthOfStay' && loaded" :loading="reportsLoading" :behaviour="reports?.behaviour ?? null" :quality="reports?.quality ?? 'unavailable'" />
        <NationalityTab v-if="tab === 'nationality' && loaded" :loading="reportsLoading" :rows="reports?.production?.nationality ?? []" :basis="basis" />
        <BehaviourTab
          v-if="tab === 'behaviour' && loaded"
          :loading="reportsLoading"
          :behaviour="reports?.behaviour ?? null"
          :quality="reports?.quality ?? 'unavailable'"
          :date-basis="dateBasis"
          :export-range="loaded ? { start: loaded.start, end: loaded.end } : null"
          @update:date-basis="v => (dateBasis = v)"
        />
        <ProductionTab
          v-if="tab === 'business' && loaded"
          :loading="reportsLoading"
          :production="reports?.production ?? null"
          :market-trend="reports?.marketTrend ?? []"
          :unavailable="reports?.unavailable ?? []"
          :quality="reports?.quality ?? 'unavailable'"
          :basis="basis"
          :compare-with-budget="loaded.compareWith === 'budget'"
          :pickup-days="loaded.pickupDays"
          :labels="store.lookup?.labels ?? {}"
          :export-range="loaded ? { start: loaded.start, end: loaded.end } : null"
          @drilldown="drilldownGroup"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useHead } from '@vueuse/head'
import { CalendarDaysIcon } from '@heroicons/vue/24/outline'
import SmSelect from '@/components/ui/SmSelect.vue'
import SmInput from '@/components/ui/SmInput.vue'
import SmButton from '@/components/ui/SmButton.vue'
import SmMultiSelect from '@/components/ui/SmMultiSelect.vue'
import PaceTab from '@/components/analytics/PaceTab.vue'
import LengthOfStayTab from '@/components/analytics/LengthOfStayTab.vue'
import NationalityTab from '@/components/analytics/NationalityTab.vue'
import BehaviourTab from '@/components/analytics/BehaviourTab.vue'
import ProductionTab from '@/components/analytics/ProductionTab.vue'
import { useRmsAnalyticsStore } from '@/stores/rmsAnalytics'
import { fetchPace, fetchReports } from '@/lib/rmsApi'
import { shortDayYear } from '@/lib/rmsFormat'
import { baliToday } from '@/lib/time'
import type { RmsComparisonMode, RmsDateBasis, RmsGroupMode, RmsPaceRow, RmsReportsResponse } from '@/types/rms'

useHead({
  title: 'Company Analytics',
  meta: [
    {
      name: 'description',
      content: 'Length of stay, nationality, booking behaviour, pace & pickups and production from the Revenue Console RMS for The Anvaya Beach Resort Bali.'
    }
  ]
})

const store = useRmsAnalyticsStore()
const route = useRoute()
const router = useRouter()

const addDays = (iso: string, n: number): string => {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

const tabs = [
  { id: 'lengthOfStay', label: 'Length of stay' },
  { id: 'nationality', label: 'Nationality' },
  { id: 'behaviour', label: 'Booking behaviour' },
  { id: 'pace', label: 'Pace & pickups' },
  { id: 'business', label: 'Production' }
] as const
type TabId = (typeof tabs)[number]['id']

const STORAGE_KEY = 'rc:rms-company-analytics'
function loadStoredFilters(): Record<string, string> | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}
function saveStoredFilters(value: Record<string, string | undefined>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
  } catch {
    // ignore — private browsing / full quota just means nothing persists
  }
}
const stored = loadStoredFilters() || {}
const query = (k: string, fallback = ''): string => (typeof route.query[k] === 'string' ? String(route.query[k]) : (stored[k] ?? fallback))

const tab = ref<TabId>(tabs.some(t => t.id === query('tab')) ? (query('tab') as TabId) : 'lengthOfStay')
const basis = ref<'gross' | 'net'>(query('basis') === 'net' ? 'net' : 'gross')
const dateBasis = ref<RmsDateBasis>('stay')

interface CompanyFilters {
  start: string
  end: string
  roomType: string
  marketId: string
  companyIds: string[]
  nationalityIds: string[]
  group: RmsGroupMode | ''
  comparison: RmsComparisonMode
  comparisonStart: string
  compareWith: 'yoy' | 'budget'
  pickupDays: number
}
const filters = reactive<CompanyFilters>({
  start: query('start', baliToday()),
  end: query('end', addDays(baliToday(), 29)),
  roomType: query('roomType'),
  marketId: query('marketId'),
  companyIds: query('companyIds') ? query('companyIds').split(',').filter(Boolean) : [],
  nationalityIds: query('nationalityIds') ? query('nationalityIds').split(',').filter(Boolean) : [],
  group: (query('group') as RmsGroupMode | '') || '',
  comparison: (query('comparison', 'weekday') as RmsComparisonMode) || 'weekday',
  comparisonStart: query('comparisonStart'),
  compareWith: query('compareWith') === 'budget' ? 'budget' : 'yoy',
  pickupDays: Number(query('pickupDays', '7'))
})
const loaded = ref<CompanyFilters | null>(null)
const error = ref('')

const dirty = computed(() => loaded.value != null && JSON.stringify(filters) !== JSON.stringify(loaded.value))
const compareSelection = computed<string>({
  get: () => (filters.compareWith === 'budget' ? 'budget' : filters.comparison),
  set: value => {
    if (value === 'budget') {
      filters.compareWith = 'budget'
    } else {
      filters.compareWith = 'yoy'
      filters.comparison = value as RmsComparisonMode
    }
  }
})

const roomTypeOptions = computed(() => (store.lookup?.roomTypes ?? []).map(r => ({ value: r, label: store.lookup?.labels[r] || r })))
const marketOptions = computed(() => (store.lookup?.markets ?? []).map(m => ({ value: String(m.id), label: m.name })))
const companyOptions = computed(() => (store.lookup?.companies ?? []).map(c => ({ value: String(c.id), label: c.name })))
const nationalityOptions = computed(() => (store.lookup?.nationalities ?? []).map(n => ({ value: String(n.id), label: n.name })))
const bookingTypeOptions = [
  { value: '', label: 'FIT + Group' },
  { value: 'fit', label: 'FIT only' },
  { value: 'group', label: 'Group only' }
]
const compareOptions = [
  { value: 'weekday', label: 'Same weekday last year' },
  { value: 'calendar', label: 'Same date last year' },
  { value: 'custom', label: 'Matched event / holiday' },
  { value: 'budget', label: 'Budget (gross)' }
]
const pickupOptions = [1, 3, 7, 14, 30].map(d => ({ value: String(d), label: `${d} ${d === 1 ? 'day' : 'days'}` }))
const basisOptions = [
  { value: 'gross', label: 'Gross IDR' },
  { value: 'net', label: 'Estimated net IDR' }
]

function saveUrl(): void {
  const f = loaded.value || filters
  const q: Record<string, string | undefined> = {
    start: f.start,
    end: f.end,
    roomType: f.roomType || undefined,
    marketId: f.marketId || undefined,
    companyIds: f.companyIds.length ? f.companyIds.join(',') : undefined,
    nationalityIds: f.nationalityIds.length ? f.nationalityIds.join(',') : undefined,
    group: f.group || undefined,
    comparison: f.comparison,
    comparisonStart: f.comparison === 'custom' ? f.comparisonStart : undefined,
    compareWith: f.compareWith,
    pickupDays: String(f.pickupDays),
    tab: tab.value,
    basis: basis.value
  }
  router.replace({ query: q })
  saveStoredFilters(q)
}
function selectTab(id: TabId): void {
  tab.value = id
  saveUrl()
}
watch(basis, saveUrl)

function apply(): void {
  if (!filters.start || !filters.end || filters.end < filters.start || (Date.parse(filters.end) - Date.parse(filters.start)) / 86400000 >= 366) {
    error.value = 'Choose a valid range of at most 366 days.'
    return
  }
  if (filters.compareWith !== 'budget' && filters.comparison === 'custom' && !filters.comparisonStart) {
    error.value = 'Choose a comparison start date.'
    return
  }
  error.value = ''
  loaded.value = { ...filters, companyIds: [...filters.companyIds], nationalityIds: [...filters.nationalityIds] }
  saveUrl()
}

function drilldownGroup(dimension: string, id: string): void {
  if (loaded.value) Object.assign(filters, loaded.value)
  if (dimension === 'market') filters.marketId = id
  else if (dimension === 'company') filters.companyIds = [id]
  else if (dimension === 'nationality') filters.nationalityIds = [id]
  else if (dimension === 'group') filters.group = id as RmsGroupMode
  else filters.roomType = id
  tab.value = 'pace'
  apply()
}

// ---- /pace (Pace & pickups tab only — always stay-date based) ----
const paceRows = ref<RmsPaceRow[]>([])
const paceLoading = ref(false)
let paceRequestId = 0
async function loadPace(f: CompanyFilters): Promise<void> {
  const id = ++paceRequestId
  paceLoading.value = true
  try {
    const rows = await fetchPace({
      start: f.start,
      end: f.end,
      roomType: f.roomType || undefined,
      marketId: f.marketId || undefined,
      companyIds: f.companyIds.length ? f.companyIds.join(',') : undefined,
      nationalityIds: f.nationalityIds.length ? f.nationalityIds.join(',') : undefined,
      group: f.group || undefined,
      pickupDays: f.pickupDays,
      comparison: f.comparison,
      comparisonStart: f.comparisonStart || undefined
    })
    if (id === paceRequestId) paceRows.value = rows
  } catch (err) {
    if (id === paceRequestId) error.value = err instanceof Error ? err.message : 'Could not load pace'
  } finally {
    if (id === paceRequestId) paceLoading.value = false
  }
}
watch(loaded, f => {
  if (f) void loadPace(f)
})

// ---- /reports (shared by the other 4 tabs — honors dateBasis) ----
const reports = ref<RmsReportsResponse | null>(null)
const reportsLoading = ref(false)
let reportsRequestId = 0
async function loadReports(f: CompanyFilters, basisForDates: RmsDateBasis): Promise<void> {
  const id = ++reportsRequestId
  reportsLoading.value = true
  try {
    const data = await fetchReports({
      start: f.start,
      end: f.end,
      roomType: f.roomType || undefined,
      marketId: f.marketId || undefined,
      companyIds: f.companyIds.length ? f.companyIds.join(',') : undefined,
      nationalityIds: f.nationalityIds.length ? f.nationalityIds.join(',') : undefined,
      group: f.group || undefined,
      pickupDays: f.pickupDays,
      comparison: f.comparison,
      comparisonStart: f.comparisonStart || undefined,
      dateBasis: basisForDates
    })
    if (id === reportsRequestId) reports.value = data
  } catch (err) {
    if (id === reportsRequestId) error.value = err instanceof Error ? err.message : 'Could not load grouped reports'
  } finally {
    if (id === reportsRequestId) reportsLoading.value = false
  }
}
watch([loaded, dateBasis], ([f, db]) => {
  if (f) void loadReports(f, db)
})

// ---- Stay-dates dropdown ----
const dateMenuOpen = ref(false)
const dateMenuRef = ref<HTMLElement | null>(null)
function onClickOutside(e: MouseEvent): void {
  if (dateMenuOpen.value && dateMenuRef.value && !dateMenuRef.value.contains(e.target as Node)) dateMenuOpen.value = false
}
function applyDatePreset(months: number): void {
  const today = baliToday()
  const d = new Date(`${today}T00:00:00Z`)
  filters.start = addDays(today, -(d.getUTCDate() - 1))
  const end = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + months, 0))
  filters.end = end.toISOString().slice(0, 10)
  dateMenuOpen.value = false
}
function thisMonth(): void {
  const today = baliToday()
  filters.start = `${today.slice(0, 7)}-01`
  filters.end = addDays(new Date(Date.UTC(Number(today.slice(0, 4)), Number(today.slice(5, 7)), 1)).toISOString().slice(0, 10), -1)
  dateMenuOpen.value = false
  apply()
}

// Only the company picker needs data up front — pace/reports wait for the user to
// actually apply a filter, rather than firing a request on every page visit.
onMounted(() => {
  document.addEventListener('mousedown', onClickOutside)
  store.loadLookup()
})
onBeforeUnmount(() => {
  document.removeEventListener('mousedown', onClickOutside)
})
</script>
