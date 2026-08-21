<template>
  <SmPage max-width="full" with-bottom-nav-padding>
    <!-- Header -->
    <div class="flex items-start justify-between gap-3 mb-4">
      <div class="flex items-center gap-2 min-w-0">
        <button
          class="no-print p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/5 text-gray-500"
          @click="router.push('/crm')"
        >
          <ArrowLeftIcon class="w-5 h-5" />
        </button>
        <div class="min-w-0">
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Pipeline Report</h1>
          <p class="text-sm text-gray-500 dark:text-gray-400 truncate">
            {{ deals.length }} deals
            <span v-if="activeFilterCount"> · filtered</span>
            · {{ formatMoney(kpis.totalValue) }} total
          </p>
        </div>
      </div>
      <button
        class="no-print inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-300"
        @click="printReport"
      >
        <PrinterIcon class="w-4 h-4" />
        <span class="hidden sm:inline">Print / PDF</span>
      </button>
    </div>

    <!-- Filter bar -->
    <div class="no-print mb-5 rounded-2xl border border-gray-100 dark:border-white/10 bg-white dark:bg-sm-card-dark p-4 space-y-3">
      <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
        <SmSelect v-model="filters.owner" :options="ownerOptions" label="Owner" size="sm" />
        <SmSelect v-model="filters.segment" :options="segmentOptions" label="Segment" size="sm" />
        <SmSelect v-model="filters.dateField" :options="dateFieldOptions" label="Date field" size="sm" />
        <SmInput v-model="filters.from" type="date" label="From" size="sm" />
        <SmInput v-model="filters.to" type="date" label="To" size="sm" />
        <div class="flex items-end">
          <SmButton variant="ghost" size="sm" :disabled="!activeFilterCount" @click="clearFilters">Clear</SmButton>
        </div>
      </div>
    </div>

    <!-- Loading / empty -->
    <div v-if="store.loading && !store.deals.length" class="text-center py-16 text-gray-400">Loading…</div>
    <div v-else-if="!store.deals.length" class="text-center py-16 text-gray-400">
      No deals yet. Import your pipeline from the board first.
    </div>

    <template v-else>
      <!-- KPI cards -->
      <div class="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-5 gap-2 mb-5">
        <div
          v-for="c in kpiCards"
          :key="c.label"
          class="rounded-2xl border border-gray-100 dark:border-white/10 bg-white dark:bg-sm-card-dark px-3 py-3"
        >
          <p class="text-[11px] font-medium text-gray-500 dark:text-gray-400 truncate">{{ c.label }}</p>
          <p class="mt-1 text-lg font-bold leading-tight truncate" :class="c.accent">{{ c.value }}</p>
          <p class="text-[11px] text-gray-400 truncate">{{ c.sub }}</p>
        </div>
      </div>

      <div class="space-y-4">
        <!-- Status split (donut + table) -->
        <section class="rounded-2xl border border-gray-100 dark:border-white/10 bg-white dark:bg-sm-card-dark p-4">
          <h2 class="text-sm font-semibold text-gray-900 dark:text-white mb-3">Pipeline value by status</h2>
          <div class="flex flex-col sm:flex-row items-center gap-5">
            <div class="relative shrink-0">
              <div class="w-36 h-36 rounded-full" :style="{ background: statusDonut }"></div>
              <div class="absolute inset-6 rounded-full bg-white dark:bg-sm-card-dark flex flex-col items-center justify-center">
                <span class="text-[11px] text-gray-400">Total</span>
                <span class="text-xs font-bold text-gray-900 dark:text-white text-center px-1">{{ formatMoney(kpis.totalValue) }}</span>
              </div>
            </div>
            <div class="flex-1 w-full space-y-2">
              <div v-for="r in byStatus" :key="r.key" class="flex items-center gap-2 text-xs">
                <span class="w-2.5 h-2.5 rounded-full shrink-0" :class="statusClass(r.key)"></span>
                <span class="font-medium text-gray-700 dark:text-gray-200 w-16">{{ r.key }}</span>
                <span class="text-gray-400 w-10 text-right">{{ r.count }}</span>
                <div class="flex-1 h-2 rounded-full bg-gray-100 dark:bg-white/5 overflow-hidden">
                  <div class="h-full rounded-full" :class="statusClass(r.key)" :style="{ width: pct(r.value, kpis.totalValue) + '%' }"></div>
                </div>
                <span class="text-gray-600 dark:text-gray-300 w-28 text-right tabular-nums">{{ formatMoney(r.value) }}</span>
              </div>
            </div>
          </div>
        </section>

        <!-- Stage funnel -->
        <section class="rounded-2xl border border-gray-100 dark:border-white/10 bg-white dark:bg-sm-card-dark p-4">
          <h2 class="text-sm font-semibold text-gray-900 dark:text-white mb-1">Funnel by stage</h2>
          <p class="text-[11px] text-gray-400 mb-3">All deals distributed across the sales stages.</p>
          <div class="space-y-2">
            <div v-for="r in byStage" :key="r.key">
              <div class="flex items-center justify-between text-xs mb-1">
                <span class="font-medium text-gray-700 dark:text-gray-200">{{ r.key }}</span>
                <span class="text-gray-500">{{ r.count }} deals · {{ formatMoney(r.value) }}</span>
              </div>
              <div class="h-6 rounded-lg bg-gray-100 dark:bg-white/5 overflow-hidden">
                <div
                  class="h-full rounded-lg flex items-center justify-end pr-2 text-[10px] font-semibold text-white/90"
                  :class="stageClass(r.key)"
                  :style="{ width: Math.max(pct(r.count, maxStageCount), r.count ? 8 : 0) + '%' }"
                >
                  <span v-if="r.count">{{ fmtPct(r.count / (kpis.count || 1)) }}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- Segment / Source performance -->
        <section
          v-for="tbl in [{ title: 'Performance by segment', rows: bySegment, name: 'Segment' }, { title: 'Performance by lead source', rows: bySource, name: 'Source' }]"
          :key="tbl.title"
          class="rounded-2xl border border-gray-100 dark:border-white/10 bg-white dark:bg-sm-card-dark p-4"
        >
          <h2 class="text-sm font-semibold text-gray-900 dark:text-white mb-3">{{ tbl.title }}</h2>
          <div class="overflow-x-auto">
            <table class="w-full text-xs">
              <thead>
                <tr class="text-gray-400 text-left">
                  <th class="font-medium pb-2">{{ tbl.name }}</th>
                  <th class="font-medium pb-2 text-right">Deals</th>
                  <th class="font-medium pb-2 text-right">Value</th>
                  <th class="font-medium pb-2 text-right">Won</th>
                  <th class="font-medium pb-2 text-right">Lost</th>
                  <th class="font-medium pb-2 text-right">Win&nbsp;%</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="r in tbl.rows" :key="r.key" class="border-t border-gray-50 dark:border-white/5">
                  <td class="py-2 font-medium text-gray-700 dark:text-gray-200">{{ r.key }}</td>
                  <td class="py-2 text-right text-gray-500">{{ r.count }}</td>
                  <td class="py-2 text-right text-gray-700 dark:text-gray-300 tabular-nums">{{ formatMoney(r.value) }}</td>
                  <td class="py-2 text-right text-green-600">{{ r.won }}</td>
                  <td class="py-2 text-right text-red-500">{{ r.lost }}</td>
                  <td class="py-2 text-right font-semibold" :class="winRateColor(r.winRate)">{{ fmtPct(r.winRate) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <!-- Owner leaderboard -->
        <section class="rounded-2xl border border-gray-100 dark:border-white/10 bg-white dark:bg-sm-card-dark p-4">
          <h2 class="text-sm font-semibold text-gray-900 dark:text-white mb-3">Sales owner leaderboard</h2>
          <div class="space-y-3">
            <div v-for="(r, i) in byOwner" :key="r.key">
              <div class="flex items-center justify-between text-xs mb-1">
                <span class="font-medium text-gray-700 dark:text-gray-200">
                  <span class="text-gray-400 mr-1">{{ i + 1 }}.</span>{{ r.key }}
                </span>
                <span class="text-gray-500">
                  {{ r.count }} deals · won {{ formatMoney(r.wonValue) }} ·
                  <span :class="winRateColor(r.winRate)">{{ fmtPct(r.winRate) }} win</span>
                </span>
              </div>
              <div class="h-2.5 rounded-full bg-gray-100 dark:bg-white/5 overflow-hidden">
                <div class="h-full rounded-full bg-sm-primary" :style="{ width: pct(r.value, maxOwnerValue) + '%' }"></div>
              </div>
              <p class="text-[11px] text-gray-400 mt-0.5">Total pipeline {{ formatMoney(r.value) }}</p>
            </div>
          </div>
        </section>

        <!-- Lost reasons -->
        <section v-if="lostReasons.length" class="rounded-2xl border border-gray-100 dark:border-white/10 bg-white dark:bg-sm-card-dark p-4">
          <h2 class="text-sm font-semibold text-gray-900 dark:text-white mb-1">Why deals are lost</h2>
          <p class="text-[11px] text-gray-400 mb-3">{{ kpis.lost }} lost deals · {{ formatMoney(kpis.lostValue) }} value forfeited</p>
          <div class="space-y-2">
            <div v-for="r in lostReasons" :key="r.key">
              <div class="flex items-center justify-between text-xs mb-1">
                <span class="font-medium text-gray-700 dark:text-gray-200">{{ r.key }}</span>
                <span class="text-gray-500">{{ r.count }} · {{ formatMoney(r.value) }}</span>
              </div>
              <div class="h-2 rounded-full bg-gray-100 dark:bg-white/5 overflow-hidden">
                <div class="h-full rounded-full bg-red-500" :style="{ width: pct(r.count, maxReasonCount) + '%' }"></div>
              </div>
            </div>
          </div>
        </section>

        <!-- Monthly trend -->
        <section v-if="byMonth.length" class="rounded-2xl border border-gray-100 dark:border-white/10 bg-white dark:bg-sm-card-dark p-4">
          <h2 class="text-sm font-semibold text-gray-900 dark:text-white mb-1">Deals by arrival month</h2>
          <p class="text-[11px] text-gray-400 mb-3">Value of events by month (won portion in green).</p>
          <div class="flex items-end gap-1.5 overflow-x-auto pb-1" style="min-height: 8rem">
            <div v-for="m in byMonth" :key="m.key" class="shrink-0 w-10 flex flex-col items-center gap-1">
              <div class="w-full h-24 flex flex-col justify-end rounded-t-md bg-gray-100 dark:bg-white/5 overflow-hidden relative">
                <div class="w-full bg-sm-primary/70" :style="{ height: pct(m.value, maxMonthValue) + '%' }"></div>
                <div class="w-full bg-green-500 absolute bottom-0" :style="{ height: pct(m.won, maxMonthValue) + '%' }"></div>
              </div>
              <span class="text-[9px] text-gray-400 whitespace-nowrap">{{ monthLabel(m.key) }}</span>
              <span class="text-[9px] font-medium text-gray-600 dark:text-gray-300">{{ m.count }}</span>
            </div>
          </div>
        </section>

        <!-- Top deals -->
        <section class="rounded-2xl border border-gray-100 dark:border-white/10 bg-white dark:bg-sm-card-dark p-4">
          <h2 class="text-sm font-semibold text-gray-900 dark:text-white mb-3">Top 10 deals by value</h2>
          <div class="divide-y divide-gray-50 dark:divide-white/5">
            <div v-for="(d, i) in topDeals" :key="d.id" class="flex items-center gap-3 py-2">
              <span class="text-xs text-gray-400 w-5 text-right">{{ i + 1 }}</span>
              <span class="w-2 h-2 rounded-full shrink-0" :class="statusClass(d.status)"></span>
              <div class="min-w-0 flex-1">
                <p class="text-sm font-medium text-gray-900 dark:text-white truncate">{{ d.company }}</p>
                <p class="text-[11px] text-gray-400 truncate">{{ d.segment }} · {{ d.stage ?? 'New' }} · {{ d.ownerName || 'Unassigned' }}</p>
              </div>
              <span class="text-xs font-semibold text-gray-800 dark:text-gray-100 tabular-nums shrink-0">{{ formatMoney(d.totalRevenue, d.currency) }}</span>
            </div>
          </div>
        </section>

        <!-- Action items -->
        <section class="grid sm:grid-cols-2 gap-4">
          <div class="rounded-2xl border border-red-100 dark:border-red-900/30 bg-white dark:bg-sm-card-dark p-4">
            <h2 class="text-sm font-semibold text-red-600 dark:text-red-400 mb-3">Overdue actions ({{ overdue.length }})</h2>
            <p v-if="!overdue.length" class="text-xs text-gray-400">Nothing overdue. 🎉</p>
            <div v-else class="divide-y divide-gray-50 dark:divide-white/5">
              <div v-for="d in overdue" :key="d.id" class="py-2">
                <div class="flex items-center justify-between gap-2">
                  <p class="text-sm font-medium text-gray-900 dark:text-white truncate">{{ d.company }}</p>
                  <span class="text-[11px] text-red-500 shrink-0">{{ formatDate(d.actionDueDate) }}</span>
                </div>
                <p class="text-[11px] text-gray-400 truncate">{{ d.nextAction || 'No action noted' }} · {{ d.ownerName || 'Unassigned' }}</p>
              </div>
            </div>
          </div>

          <div class="rounded-2xl border border-gray-100 dark:border-white/10 bg-white dark:bg-sm-card-dark p-4">
            <h2 class="text-sm font-semibold text-gray-900 dark:text-white mb-3">Upcoming actions ({{ upcoming.length }})</h2>
            <p v-if="!upcoming.length" class="text-xs text-gray-400">No actions due in the next 30 days.</p>
            <div v-else class="divide-y divide-gray-50 dark:divide-white/5">
              <div v-for="d in upcoming" :key="d.id" class="py-2">
                <div class="flex items-center justify-between gap-2">
                  <p class="text-sm font-medium text-gray-900 dark:text-white truncate">{{ d.company }}</p>
                  <span class="text-[11px] text-gray-500 shrink-0">{{ formatDate(d.actionDueDate) }}</span>
                </div>
                <p class="text-[11px] text-gray-400 truncate">{{ d.nextAction || 'No action noted' }} · {{ d.ownerName || 'Unassigned' }}</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </template>
  </SmPage>
</template>

<script setup lang="ts">
import { reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeftIcon, PrinterIcon } from '@heroicons/vue/24/outline'
import SmPage from '@/components/ui/SmPage.vue'
import SmSelect from '@/components/ui/SmSelect.vue'
import SmInput from '@/components/ui/SmInput.vue'
import SmButton from '@/components/ui/SmButton.vue'
import { useCrmStore } from '@/stores/crm'
import { DEAL_STATUSES, DEAL_STAGES } from '@/types/crm'
import type { Deal, DealStage } from '@/types/crm'
import { formatMoney, formatDate, isOverdue } from '@/lib/crmUtils'
import userData from '@/user.json'

const store = useCrmStore()
const router = useRouter()

// ---- Filters ----
type DateField = 'arrivalDate' | 'leadDate' | 'checkoutDate'
const filters = reactive({
  owner: '',
  segment: '',
  dateField: 'arrivalDate' as DateField,
  from: '',
  to: ''
})
function clearFilters() {
  filters.owner = ''
  filters.segment = ''
  filters.dateField = 'arrivalDate'
  filters.from = ''
  filters.to = ''
}
const activeFilterCount = computed(() => {
  let n = 0
  if (filters.owner) n++
  if (filters.segment) n++
  if (filters.from || filters.to) n++
  return n
})

// List every team member plus any owner that appears in the pipeline. The deal
// count is shown in the label so an empty result (e.g. "Purnama (0)") reads as
// expected rather than a broken filter. Sorted by deal count, then name.
const ownerOptions = computed(() => {
  const counts = new Map<string, number>()
  store.deals.forEach(d => {
    const n = d.ownerName || 'Unassigned'
    counts.set(n, (counts.get(n) ?? 0) + 1)
  })
  const names = new Set<string>(userData.map(u => u.name))
  counts.forEach((_, n) => names.add(n))
  const list = [...names].sort(
    (a, b) => (counts.get(b) ?? 0) - (counts.get(a) ?? 0) || a.localeCompare(b)
  )
  return [
    { value: '', label: 'All owners' },
    ...list.map(n => ({ value: n, label: `${n} (${counts.get(n) ?? 0})` }))
  ]
})
const segmentOptions = computed(() => {
  const set = new Set<string>()
  store.deals.forEach(d => d.segment && set.add(d.segment))
  return [{ value: '', label: 'All segments' }, ...[...set].sort().map(s => ({ value: s, label: s }))]
})
const dateFieldOptions = [
  { value: 'arrivalDate', label: 'Arrival date' },
  { value: 'leadDate', label: 'Lead date' },
  { value: 'checkoutDate', label: 'Check-out date' }
]

const deals = computed<Deal[]>(() =>
  store.deals.filter(d => {
    if (filters.owner && (d.ownerName || 'Unassigned') !== filters.owner) return false
    if (filters.segment && d.segment !== filters.segment) return false
    if (filters.from || filters.to) {
      const v = d[filters.dateField]
      if (!v) return false
      if (filters.from && v < filters.from) return false
      if (filters.to && v > filters.to) return false
    }
    return true
  })
)

// ---- Helpers ----
const sum = (arr: Deal[]) => arr.reduce((s, d) => s + (d.totalRevenue ?? 0), 0)
const isOpen = (d: Deal) => d.status === 'Active' || d.status === 'Idle'
function pct(v: number, max: number): number {
  return max > 0 ? Math.round((v / max) * 100) : 0
}
function fmtPct(x: number): string {
  return `${Math.round(x * 100)}%`
}
function winRateColor(x: number): string {
  if (x >= 0.5) return 'text-green-600'
  if (x >= 0.25) return 'text-amber-600'
  return 'text-red-500'
}

// Stage win-probability for the weighted forecast.
const STAGE_PROB: Record<DealStage, number> = {
  New: 0.1,
  Proposal: 0.3,
  Negotiation: 0.5,
  Contract: 0.8,
  Confirmed: 0.95
}

// ---- KPIs ----
const kpis = computed(() => {
  const all = deals.value
  const open = all.filter(isOpen)
  const won = all.filter(d => d.status === 'Win')
  const lost = all.filter(d => d.status === 'Lost')
  const wonValue = sum(won)
  const lostValue = sum(lost)
  const decided = won.length + lost.length
  const decidedValue = wonValue + lostValue
  const weighted = open.reduce(
    (s, d) => s + (d.totalRevenue ?? 0) * (STAGE_PROB[(d.stage ?? 'New') as DealStage] ?? 0),
    0
  )
  const roomNights = all.reduce((s, d) => s + (d.roomNights ?? 0), 0)
  const adrDeals = all.filter(d => d.proposedADR)
  const avgADR = adrDeals.length ? adrDeals.reduce((s, d) => s + (d.proposedADR ?? 0), 0) / adrDeals.length : 0
  const totalValue = sum(all)
  return {
    count: all.length,
    open: open.length,
    openValue: sum(open),
    won: won.length,
    wonValue,
    lost: lost.length,
    lostValue,
    totalValue,
    winRateCount: decided ? won.length / decided : 0,
    winRateValue: decidedValue ? wonValue / decidedValue : 0,
    weighted,
    avgDeal: all.length ? totalValue / all.length : 0,
    roomNights,
    avgADR
  }
})

const kpiCards = computed(() => [
  { label: 'Total Pipeline', value: formatMoney(kpis.value.totalValue), sub: `${kpis.value.count} deals`, accent: 'text-gray-900 dark:text-white' },
  { label: 'Open Pipeline', value: formatMoney(kpis.value.openValue), sub: `${kpis.value.open} active/idle`, accent: 'text-blue-600' },
  { label: 'Weighted Forecast', value: formatMoney(kpis.value.weighted), sub: 'stage-adjusted', accent: 'text-indigo-600' },
  { label: 'Won', value: formatMoney(kpis.value.wonValue), sub: `${kpis.value.won} deals`, accent: 'text-green-600' },
  { label: 'Lost', value: formatMoney(kpis.value.lostValue), sub: `${kpis.value.lost} deals`, accent: 'text-red-500' },
  { label: 'Win Rate (count)', value: fmtPct(kpis.value.winRateCount), sub: `${kpis.value.won}/${kpis.value.won + kpis.value.lost} decided`, accent: 'text-gray-900 dark:text-white' },
  { label: 'Win Rate (value)', value: fmtPct(kpis.value.winRateValue), sub: 'won ÷ decided value', accent: 'text-gray-900 dark:text-white' },
  { label: 'Avg Deal Size', value: formatMoney(kpis.value.avgDeal), sub: 'all deals', accent: 'text-gray-900 dark:text-white' },
  { label: 'Room Nights', value: kpis.value.roomNights.toLocaleString('en-US'), sub: 'total potential', accent: 'text-gray-900 dark:text-white' },
  { label: 'Avg Proposed ADR', value: formatMoney(kpis.value.avgADR), sub: 'where quoted', accent: 'text-gray-900 dark:text-white' }
])

// ---- Breakdowns ----
interface Row {
  key: string
  count: number
  value: number
  won: number
  wonValue: number
  lost: number
  lostValue: number
  winRate: number
}
function breakdown(keyFn: (d: Deal) => string, order?: readonly string[]): Row[] {
  const map = new Map<string, Row>()
  for (const d of deals.value) {
    const k = keyFn(d) || '—'
    let r = map.get(k)
    if (!r) {
      r = { key: k, count: 0, value: 0, won: 0, wonValue: 0, lost: 0, lostValue: 0, winRate: 0 }
      map.set(k, r)
    }
    r.count++
    r.value += d.totalRevenue ?? 0
    if (d.status === 'Win') {
      r.won++
      r.wonValue += d.totalRevenue ?? 0
    } else if (d.status === 'Lost') {
      r.lost++
      r.lostValue += d.totalRevenue ?? 0
    }
  }
  for (const r of map.values()) {
    const dec = r.won + r.lost
    r.winRate = dec ? r.won / dec : 0
  }
  const rows = [...map.values()]
  if (order) rows.sort((a, b) => order.indexOf(a.key) - order.indexOf(b.key))
  else rows.sort((a, b) => b.value - a.value)
  return rows
}

const byStatus = computed(() => breakdown(d => d.status, DEAL_STATUSES))
const byStage = computed(() => breakdown(d => d.stage ?? 'New', DEAL_STAGES))
const bySegment = computed(() => breakdown(d => d.segment))
const bySource = computed(() => breakdown(d => d.leadSource))
const byOwner = computed(() => breakdown(d => d.ownerName || 'Unassigned'))

const maxStageCount = computed(() => Math.max(1, ...byStage.value.map(r => r.count)))
const maxOwnerValue = computed(() => Math.max(1, ...byOwner.value.map(r => r.value)))

const lostReasons = computed(() => {
  const map = new Map<string, { key: string; count: number; value: number }>()
  for (const d of deals.value.filter(x => x.status === 'Lost')) {
    const k = d.reasonWonLost || 'Unspecified'
    let r = map.get(k)
    if (!r) {
      r = { key: k, count: 0, value: 0 }
      map.set(k, r)
    }
    r.count++
    r.value += d.totalRevenue ?? 0
  }
  return [...map.values()].sort((a, b) => b.count - a.count)
})
const maxReasonCount = computed(() => Math.max(1, ...lostReasons.value.map(r => r.count)))

const byMonth = computed(() => {
  const map = new Map<string, { key: string; count: number; value: number; won: number }>()
  for (const d of deals.value) {
    const iso = d.arrivalDate
    if (!iso) continue
    const k = iso.slice(0, 7) // YYYY-MM
    let r = map.get(k)
    if (!r) {
      r = { key: k, count: 0, value: 0, won: 0 }
      map.set(k, r)
    }
    r.count++
    r.value += d.totalRevenue ?? 0
    if (d.status === 'Win') r.won += d.totalRevenue ?? 0
  }
  return [...map.values()].sort((a, b) => a.key.localeCompare(b.key))
})
const maxMonthValue = computed(() => Math.max(1, ...byMonth.value.map(r => r.value)))

const topDeals = computed(() => [...deals.value].sort((a, b) => (b.totalRevenue ?? 0) - (a.totalRevenue ?? 0)).slice(0, 10))

const overdue = computed(() =>
  deals.value
    .filter(d => isOpen(d) && isOverdue(d.actionDueDate))
    .sort((a, b) => (a.actionDueDate ?? '').localeCompare(b.actionDueDate ?? ''))
)
const upcoming = computed(() => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const in30 = new Date(today)
  in30.setDate(in30.getDate() + 30)
  const toIso = (d: Date) => d.toISOString().slice(0, 10)
  const lo = toIso(today)
  const hi = toIso(in30)
  return deals.value
    .filter(d => isOpen(d) && d.actionDueDate && d.actionDueDate >= lo && d.actionDueDate <= hi)
    .sort((a, b) => (a.actionDueDate ?? '').localeCompare(b.actionDueDate ?? ''))
})

// ---- Colors ----
const statusColor: Record<string, string> = {
  Active: 'bg-blue-500',
  Idle: 'bg-amber-500',
  Win: 'bg-green-500',
  Lost: 'bg-red-500'
}
const stageColor: Record<string, string> = {
  New: 'bg-gray-400',
  Proposal: 'bg-blue-500',
  Negotiation: 'bg-amber-500',
  Contract: 'bg-purple-500',
  Confirmed: 'bg-green-500'
}
function statusClass(k: string): string {
  return statusColor[k] ?? 'bg-gray-400'
}
function stageClass(k: string): string {
  return stageColor[k] ?? 'bg-gray-400'
}

const statusDonut = computed(() => {
  const rows = byStatus.value
  const total = rows.reduce((s, r) => s + r.value, 0) || 1
  const hex: Record<string, string> = { Active: '#3b82f6', Idle: '#f59e0b', Win: '#22c55e', Lost: '#ef4444' }
  let acc = 0
  const stops = rows
    .filter(r => r.value > 0)
    .map(r => {
      const start = (acc / total) * 360
      acc += r.value
      const end = (acc / total) * 360
      return `${hex[r.key] ?? '#9ca3af'} ${start}deg ${end}deg`
    })
    .join(', ')
  return `conic-gradient(${stops || '#e5e7eb 0deg 360deg'})`
})

function monthLabel(k: string): string {
  const [y, m] = k.split('-')
  const d = new Date(Number(y), Number(m) - 1, 1)
  return d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' })
}

function printReport() {
  window.print()
}

onMounted(() => {
  if (!store.deals.length && !store.loading) store.loadDeals()
})
</script>

<style>
@media print {
  .no-print {
    display: none !important;
  }
}
</style>
