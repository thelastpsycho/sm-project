<template>
  <div class="min-h-screen bg-white dark:bg-sm-bg-dark">
    <div class="max-w-[1100px] mx-auto lg:mx-0 px-6 lg:px-12 pt-10 lg:pt-9 pb-32">
      <!-- Header -->
      <div>
        <span class="sm-eyebrow">Revenue Console · RMS</span>
        <h1 class="sm-display text-display mt-2">Company Analytics</h1>
        <p class="mt-1.5 text-sm text-sm-muted">
          {{ rangeLabel }}<span v-if="store.selectedCompanyIds.length"> · {{ store.selectedCompanyIds.length }} companies</span>
        </p>
      </div>

      <!-- Filter bar -->
      <div class="mt-4 rounded-xl border border-sm-line dark:border-white/10 p-3">
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 items-end">
          <div class="lg:col-span-2">
            <SmMultiSelect
              v-model="localCompanyIds"
              :options="store.companyOptions"
              label="Companies"
              placeholder="All companies"
              :empty-label="store.lookupLoading ? 'Loading…' : 'No companies found'"
              size="sm"
            />
          </div>
          <SmSelect v-model="rangePreset" :options="rangeOptions" label="Date range" size="sm" />
          <template v-if="rangePreset === 'custom'">
            <SmInput v-model="customFrom" type="date" label="From" size="sm" />
            <SmInput v-model="customTo" type="date" label="To" size="sm" />
          </template>
          <div>
            <SmSelect v-model="localDateBasis" :options="dateBasisOptions" label="Date basis" size="sm" />
            <p class="mt-1 text-2xs text-sm-faint">Breakdown & trend only</p>
          </div>
          <SmButton size="sm" :disabled="loading" @click="applyFilters">Apply</SmButton>
        </div>
        <p v-if="pendingRangeLabel" class="mt-2 text-eyebrow text-sm-muted">{{ pendingRangeLabel }}</p>
      </div>

      <p v-if="anyError" class="mt-4 text-sm text-sm-bad">{{ anyError }}</p>

      <div v-if="!hasLoadedOnce" class="text-center py-16 text-sm-faint">
        <p v-if="loading">Loading…</p>
        <p v-else>Choose your companies and date range, then click Apply to load analytics.</p>
      </div>

      <template v-else>
        <!-- KPI row -->
        <div class="mt-8 grid grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-6 transition-opacity" :class="{ 'opacity-50': loading }">
          <div>
            <p class="sm-eyebrow">Rooms</p>
            <p class="mt-1.5 text-xl font-extrabold tracking-[-0.02em] leading-tight">
              <QualityValue :value="totals.rooms.value" :quality="totals.rooms.quality" :format="fmtRooms" />
            </p>
            <p class="text-eyebrow text-sm-faint">room-nights</p>
          </div>
          <div>
            <p class="sm-eyebrow">Revenue</p>
            <p class="mt-1.5 text-xl font-extrabold tracking-[-0.02em] leading-tight text-sm-primary">
              <QualityValue :value="totals.revenue.value" :quality="totals.revenue.quality" :format="fmtMoney" />
            </p>
            <p class="text-eyebrow text-sm-faint">gross</p>
          </div>
          <div>
            <p class="sm-eyebrow">Net revenue</p>
            <p class="mt-1.5 text-xl font-extrabold tracking-[-0.02em] leading-tight">
              <QualityValue :value="totals.netRevenue.value" :quality="totals.netRevenue.quality" :format="fmtMoney" />
            </p>
            <p class="text-eyebrow text-sm-faint">after tax/service/breakfast</p>
          </div>
          <div>
            <p class="sm-eyebrow">Pickup ({{ pickupDays }}d)</p>
            <p class="mt-1.5 text-xl font-extrabold tracking-[-0.02em] leading-tight">
              <QualityValue :value="totals.pickupRooms.value" :quality="totals.pickupRooms.quality" :format="fmtRooms" />
            </p>
            <p class="text-eyebrow text-sm-faint">
              <QualityValue :value="totals.pickupRevenue.value" :quality="totals.pickupRevenue.quality" :format="fmtMoney" />
            </p>
          </div>
        </div>

        <!-- Pace vs last year -->
        <section class="mt-10 pt-8 border-t border-sm-line dark:border-white/10 transition-opacity" :class="{ 'opacity-50': loading }">
          <PaceChart :rows="store.paceRows" />
        </section>

        <!-- Company breakdown -->
        <section class="mt-10 pt-8 border-t border-sm-line dark:border-white/10">
          <h2 class="sm-eyebrow">Company breakdown</h2>
          <div class="overflow-x-auto mt-3 transition-opacity" :class="{ 'opacity-50': loading }">
            <table class="w-full text-xsm">
              <thead>
                <tr class="sm-eyebrow text-left border-b border-sm-line dark:border-white/10">
                  <th class="pb-2.5 font-extrabold">Company</th>
                  <th class="pb-2.5 font-extrabold text-right">Rooms</th>
                  <th class="pb-2.5 font-extrabold text-right">Revenue</th>
                  <th class="pb-2.5 font-extrabold text-right">Pickup rooms ({{ pickupDays }}d)</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in companyRows" :key="row.id" class="border-b border-sm-hair dark:border-white/5">
                  <td class="py-2.5 font-bold text-sm-ink dark:text-white">{{ row.name }}</td>
                  <td class="py-2.5 text-right text-sm-muted"><QualityValue :value="row.rooms" :quality="currentQuality" :format="fmtRooms" /></td>
                  <td class="py-2.5 text-right text-sm-muted"><QualityValue :value="row.revenue" :quality="currentQuality" :format="fmtMoney" /></td>
                  <td class="py-2.5 text-right text-sm-muted">
                    <QualityValue
                      :value="row.pickup[String(pickupDays)]?.rooms ?? null"
                      :quality="row.pickup[String(pickupDays)]?.quality ?? 'unavailable'"
                      :format="fmtRooms"
                    />
                  </td>
                </tr>
                <tr v-if="!companyRows.length">
                  <td colspan="4" class="py-8 text-center text-sm-faint">No company production for this selection.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useHead } from '@vueuse/head'
import SmSelect from '@/components/ui/SmSelect.vue'
import SmInput from '@/components/ui/SmInput.vue'
import SmButton from '@/components/ui/SmButton.vue'
import SmMultiSelect from '@/components/ui/SmMultiSelect.vue'
import QualityValue from '@/components/analytics/QualityValue.vue'
import PaceChart from '@/components/analytics/PaceChart.vue'
import { PICKUP_DAYS, useRmsAnalyticsStore } from '@/stores/rmsAnalytics'
import { aggregatePace } from '@/lib/rmsAggregate'
import { formatMoney } from '@/lib/money'
import { formatShortDate } from '@/lib/dateFormat'
import { RANGE_OPTIONS, presetRange, type RangePreset } from '@/lib/dateRange'
import type { RmsDateBasis } from '@/types/rms'

useHead({
  title: 'Company Analytics',
  meta: [
    {
      name: 'description',
      content: 'Company-level rooms, revenue and pickup pace from the Revenue Console RMS for The Anvaya Beach Resort Bali.'
    }
  ]
})

const store = useRmsAnalyticsStore()

const fmtMoney = (n: number) => formatMoney(n)
const fmtRooms = (n: number) => Math.round(n).toLocaleString('en-US')
const pickupDays = PICKUP_DAYS

// ---- Filters (local until Apply) ----
const localCompanyIds = ref<string[]>([])
const rangeOptions = RANGE_OPTIONS.filter(o => o.value !== 'all')
const rangePreset = ref<RangePreset>('last30')
const customFrom = ref(store.rangeStart)
const customTo = ref(store.rangeEnd)
const dateBasisOptions = [
  { value: 'stay', label: 'Stay date' },
  { value: 'booking', label: 'Booking date' }
]
const localDateBasis = ref<RmsDateBasis>('stay')

watch(
  rangePreset,
  preset => {
    if (preset === 'custom') return
    const resolved = presetRange(preset)
    if (resolved) {
      customFrom.value = resolved.from
      customTo.value = resolved.to
    }
  },
  { immediate: true }
)

const rangeLabel = computed(() => `${formatShortDate(store.rangeStart)} – ${formatShortDate(store.rangeEnd)}`)
// Live preview of what Apply will fetch — updates as soon as a preset resolves or a custom date changes.
const pendingRangeLabel = computed(() =>
  customFrom.value && customTo.value ? `Will apply: ${formatShortDate(customFrom.value)} – ${formatShortDate(customTo.value)}` : ''
)

const loading = computed(() => store.paceLoading || store.reportsLoading)
const hasLoadedOnce = ref(false)
const anyError = computed(() => store.lookupError || store.paceError || store.reportsError)

async function applyFilters(): Promise<void> {
  store.setCompanies(localCompanyIds.value)
  store.setRange(customFrom.value, customTo.value)
  store.setDateBasis(localDateBasis.value)
  await store.refresh()
  hasLoadedOnce.value = true
}

// Only the company picker needs data up front — pace/reports wait for the user to
// actually apply a filter, rather than firing a request on every page visit.
onMounted(() => {
  store.loadLookup()
})

// ---- KPI totals (from /pace) ----
const totals = computed(() => aggregatePace(store.paceRows))

// ---- Company breakdown (from /reports) ----
// /reports has no per-row quality for current-period figures — one report-wide
// flag covers rooms/revenue on every row (each row's `comparison` block carries
// its own comparisonQuality instead, which this page doesn't surface).
const companyRows = computed(() => store.reports?.production?.company ?? [])
const currentQuality = computed(() => store.reports?.quality ?? 'unavailable')
</script>
