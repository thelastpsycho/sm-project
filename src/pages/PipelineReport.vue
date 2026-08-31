<template>
  <div class="min-h-screen bg-white dark:bg-sm-bg-dark">
    <div class="max-w-[1100px] mx-auto lg:mx-0 px-6 lg:px-12 pt-10 lg:pt-9 pb-32">
    <!-- Header -->
    <div class="flex items-start justify-between gap-3">
      <div class="flex items-start gap-2 min-w-0">
        <button
          class="no-print p-2 -ml-2 rounded-full hover:bg-sm-surface dark:hover:bg-white/5 text-sm-ink dark:text-white lg:hidden"
          @click="router.push('/crm')"
        >
          <ArrowLeftIcon class="w-5 h-5" />
        </button>
        <div class="min-w-0">
          <span class="sm-eyebrow">Pipeline report<span v-if="activeFilterCount"> · filtered</span></span>
          <h1 class="sm-display text-display mt-2 truncate">{{ formatMoney(kpis.totalValue) }}</h1>
          <p class="mt-1.5 text-sm text-sm-muted truncate">{{ deals.length }} deals · all owners</p>
        </div>
      </div>
      <button
        class="no-print inline-flex items-center gap-1.5 text-sm font-bold text-sm-primary shrink-0"
        @click="printReport"
      >
        <PrinterIcon class="w-4 h-4" />
        <span class="hidden sm:inline">Print / PDF</span>
      </button>
    </div>

    <!-- Filter bar -->
    <div class="no-print mt-4 rounded-xl border border-sm-line dark:border-white/10 p-2">
      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 items-center">
        <SmSelect v-model="filters.owner" :options="ownerOptions" size="sm" />
        <SmSelect v-model="filters.segment" :options="segmentOptions" size="sm" />
        <SmSelect v-model="filters.dateField" :options="dateFieldOptions" size="sm" />
        <SmSelect v-model="filters.range" :options="rangeOptions" size="sm" />
        <template v-if="filters.range === 'custom'">
          <SmInput v-model="filters.from" type="date" size="sm" />
          <SmInput v-model="filters.to" type="date" size="sm" />
        </template>
        <SmButton variant="ghost" size="sm" :disabled="!activeFilterCount" @click="clearFilters">Clear</SmButton>
      </div>
      <p v-if="rangeLabel" class="mt-1.5 text-eyebrow text-sm-muted truncate">{{ rangeLabel }}</p>
    </div>

    <!-- Loading / empty -->
    <div v-if="store.loading && !store.deals.length" class="text-center py-16 text-sm-faint">Loading…</div>
    <div v-else-if="!store.deals.length" class="text-center py-16 text-sm-faint">
      No deals yet. Import your pipeline from the board first.
    </div>

    <template v-else>
      <!-- KPI row -->
      <div class="mt-8 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-x-8 gap-y-6">
        <div v-for="c in kpiCards" :key="c.label">
          <p class="sm-eyebrow truncate">{{ c.label }}</p>
          <p class="mt-1.5 text-xl font-extrabold tracking-[-0.02em] leading-tight truncate" :class="c.accent">{{ c.value }}</p>
          <p class="text-eyebrow text-sm-faint truncate">{{ c.sub }}</p>
        </div>
      </div>

      <!-- Value by outcome -->
      <section class="mt-10 pt-8 border-t border-sm-line dark:border-white/10">
        <h2 class="sm-eyebrow">Value by outcome</h2>
        <div class="mt-4 space-y-3">
          <div v-for="r in byOutcome" :key="r.key">
            <div class="flex items-baseline justify-between text-xsm">
              <span class="font-bold text-sm-ink dark:text-white">{{ outcomeLabel[r.key] ?? r.key }}</span>
              <span class="text-sm-muted">{{ r.count }} deals · {{ formatMoney(r.value) }}</span>
            </div>
            <div class="mt-2 h-1 rounded-full bg-sm-hair dark:bg-white/10 overflow-hidden">
              <div class="h-full rounded-full" :class="outcomeClass(r.key)" :style="{ width: pct(r.value, kpis.totalValue) + '%' }"></div>
            </div>
          </div>
        </div>
      </section>

      <!-- Funnel by stage -->
      <section class="mt-10 pt-8 border-t border-sm-line dark:border-white/10">
        <h2 class="sm-eyebrow">Funnel by stage</h2>
        <div class="mt-4 space-y-3">
          <div v-for="r in byStage" :key="r.key">
            <div class="flex items-baseline justify-between text-xsm">
              <span class="font-bold text-sm-ink dark:text-white">{{ r.key }}</span>
              <span class="text-sm-muted">{{ r.count }} deals · {{ formatMoney(r.value) }}</span>
            </div>
            <div class="mt-2 h-2 rounded-[3px] bg-sm-surface dark:bg-white/5 overflow-hidden">
              <div
                class="h-full bg-sm-ink dark:bg-white"
                :style="{ width: Math.max(pct(r.count, maxStageCount), r.count ? 4 : 0) + '%' }"
              ></div>
            </div>
          </div>
        </div>
      </section>

      <!-- Segment / Source performance -->
      <section
        v-for="tbl in [{ title: 'Performance by segment', rows: bySegment, name: 'Segment' }, { title: 'Performance by lead source', rows: bySource, name: 'Source' }]"
        :key="tbl.title"
        class="mt-10 pt-8 border-t border-sm-line dark:border-white/10"
      >
        <h2 class="sm-eyebrow">{{ tbl.title }}</h2>
        <div class="overflow-x-auto mt-3">
          <table class="w-full text-xsm">
            <thead>
              <tr class="sm-eyebrow text-left border-b border-sm-line dark:border-white/10">
                <th class="pb-2.5 font-extrabold">{{ tbl.name }}</th>
                <th class="pb-2.5 font-extrabold text-right">Deals</th>
                <th class="pb-2.5 font-extrabold text-right">Value</th>
                <th class="pb-2.5 font-extrabold text-right">Won</th>
                <th class="pb-2.5 font-extrabold text-right">Lost</th>
                <th class="pb-2.5 font-extrabold text-right">Win&nbsp;%</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="r in tbl.rows" :key="r.key" class="border-b border-sm-hair dark:border-white/5">
                <td class="py-2.5 font-bold text-sm-ink dark:text-white">{{ r.key }}</td>
                <td class="py-2.5 text-right text-sm-muted">{{ r.count }}</td>
                <td class="py-2.5 text-right text-sm-ink-soft dark:text-gray-300 tabular-nums">{{ formatMoney(r.value) }}</td>
                <td class="py-2.5 text-right text-sm-won">{{ r.won }}</td>
                <td class="py-2.5 text-right text-sm-bad">{{ r.lost }}</td>
                <td class="py-2.5 text-right font-bold" :class="winRateColor(r.winRate)">{{ fmtPct(r.winRate) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- Owner leaderboard -->
      <section class="mt-10 pt-8 border-t border-sm-line dark:border-white/10">
        <h2 class="sm-eyebrow">Sales owner leaderboard</h2>
        <div class="mt-4 space-y-4">
          <div v-for="(r, i) in byOwner" :key="r.key">
            <div class="flex items-baseline justify-between text-xsm">
              <span class="font-bold text-sm-ink dark:text-white">
                <span class="text-sm-faint mr-1">{{ i + 1 }}.</span>{{ r.key }}
              </span>
              <span class="text-sm-muted">
                {{ r.count }} deals · won {{ formatMoney(r.wonValue) }} ·
                <span :class="winRateColor(r.winRate)">{{ fmtPct(r.winRate) }} win</span>
              </span>
            </div>
            <div class="mt-2 h-1.5 rounded-full bg-sm-hair dark:bg-white/10 overflow-hidden">
              <div class="h-full rounded-full bg-sm-ink dark:bg-white" :style="{ width: pct(r.value, maxOwnerValue) + '%' }"></div>
            </div>
          </div>
        </div>
      </section>

      <!-- Lost reasons -->
      <section v-if="lostReasons.length" class="mt-10 pt-8 border-t border-sm-line dark:border-white/10">
        <h2 class="sm-eyebrow">Why deals are lost</h2>
        <p class="mt-1 text-xsm text-sm-muted">{{ kpis.lost }} lost deals · {{ formatMoney(kpis.lostValue) }} value forfeited</p>
        <div class="mt-4 space-y-3">
          <div v-for="r in lostReasons" :key="r.key">
            <div class="flex items-baseline justify-between text-xsm">
              <span class="font-bold text-sm-ink dark:text-white">{{ r.key }}</span>
              <span class="text-sm-muted">{{ r.count }} · {{ formatMoney(r.value) }}</span>
            </div>
            <div class="mt-2 h-1 rounded-full bg-sm-hair dark:bg-white/10 overflow-hidden">
              <div class="h-full rounded-full bg-sm-bad" :style="{ width: pct(r.count, maxReasonCount) + '%' }"></div>
            </div>
          </div>
        </div>
      </section>

      <!-- Monthly trend -->
      <section v-if="byMonth.length" class="mt-10 pt-8 border-t border-sm-line dark:border-white/10">
        <h2 class="sm-eyebrow">Deals by arrival month</h2>
        <p class="mt-1 text-xsm text-sm-muted">Value of events by month (won portion in green).</p>
        <div class="mt-4 flex items-end gap-1.5 overflow-x-auto scr pb-1" style="min-height: 8rem">
          <div v-for="m in byMonth" :key="m.key" class="shrink-0 w-10 flex flex-col items-center gap-1">
            <div class="w-full h-24 flex flex-col justify-end rounded-t-md bg-sm-surface dark:bg-white/5 overflow-hidden relative">
              <div class="w-full bg-sm-ink/70 dark:bg-white/50" :style="{ height: pct(m.value, maxMonthValue) + '%' }"></div>
              <div class="w-full bg-sm-won absolute bottom-0" :style="{ height: pct(m.won, maxMonthValue) + '%' }"></div>
            </div>
            <span class="text-2xs text-sm-faint whitespace-nowrap">{{ monthLabel(m.key) }}</span>
            <span class="text-2xs font-bold text-sm-ink-soft dark:text-gray-300">{{ m.count }}</span>
          </div>
        </div>
      </section>

      <!-- Top deals -->
      <section class="mt-10 pt-8 border-t border-sm-line dark:border-white/10">
        <h2 class="sm-eyebrow">Top 10 deals by value</h2>
        <div class="mt-2">
          <div v-for="(d, i) in topDeals" :key="d.id" class="flex items-center gap-3 py-2.5 border-t border-sm-hair dark:border-white/5">
            <span class="text-xs text-sm-faint w-5 text-right">{{ i + 1 }}</span>
            <span class="w-1.5 h-1.5 rounded-full shrink-0" :class="stageClass(d.stage ?? 'New')"></span>
            <div class="min-w-0 flex-1">
              <p class="text-sm font-bold text-sm-ink dark:text-white truncate">{{ d.company }}</p>
              <p class="text-eyebrow text-sm-muted truncate">{{ d.segment }} · {{ d.stage ?? 'New' }} · {{ d.ownerName || 'Unassigned' }}</p>
            </div>
            <span class="text-sm font-bold text-sm-ink dark:text-white tabular-nums shrink-0">{{ formatMoney(d.actualRevenue ?? d.totalRevenue, d.currency) }}</span>
          </div>
        </div>
      </section>

      <!-- Action items -->
      <section class="mt-10 pt-8 border-t border-sm-line dark:border-white/10 grid sm:grid-cols-2 gap-8">
        <div>
          <h2 class="sm-eyebrow !text-sm-bad">Overdue actions · {{ overdue.length }}</h2>
          <p v-if="!overdue.length" class="mt-2 text-xs text-sm-faint">Nothing overdue.</p>
          <div v-else class="mt-2">
            <div v-for="d in overdue" :key="d.id" class="py-2.5 border-t border-sm-hair dark:border-white/5">
              <div class="flex items-center justify-between gap-2">
                <p class="text-sm font-bold text-sm-ink dark:text-white truncate">{{ d.company }}</p>
                <span class="text-eyebrow font-bold text-sm-bad shrink-0">{{ formatDate(d.actionDueDate) }}</span>
              </div>
              <p class="text-eyebrow text-sm-muted truncate">{{ d.nextAction || 'No action noted' }} · {{ d.ownerName || 'Unassigned' }}</p>
            </div>
          </div>
        </div>

        <div>
          <h2 class="sm-eyebrow">Upcoming actions · {{ upcoming.length }}</h2>
          <p v-if="!upcoming.length" class="mt-2 text-xs text-sm-faint">No actions due in the next 30 days.</p>
          <div v-else class="mt-2">
            <div v-for="d in upcoming" :key="d.id" class="py-2.5 border-t border-sm-hair dark:border-white/5">
              <div class="flex items-center justify-between gap-2">
                <p class="text-sm font-bold text-sm-ink dark:text-white truncate">{{ d.company }}</p>
                <span class="text-eyebrow text-sm-muted shrink-0">{{ formatDate(d.actionDueDate) }}</span>
              </div>
              <p class="text-eyebrow text-sm-muted truncate">{{ d.nextAction || 'No action noted' }} · {{ d.ownerName || 'Unassigned' }}</p>
            </div>
          </div>
        </div>
      </section>
    </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, computed, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeftIcon, PrinterIcon } from '@heroicons/vue/24/outline'
import SmSelect from '@/components/ui/SmSelect.vue'
import SmInput from '@/components/ui/SmInput.vue'
import SmButton from '@/components/ui/SmButton.vue'
import { useCrmStore } from '@/stores/crm'
import { DEAL_OUTCOMES, DEAL_STAGES } from '@/types/crm'
import type { Deal, DealStage } from '@/types/crm'
import { formatMoney, formatDate, isOverdue, dealOutcome, wonRevenue } from '@/lib/crmUtils'
import { baliToday, toBaliISO } from '@/lib/time'
import { RANGE_OPTIONS, presetRange, type RangePreset } from '@/lib/dateRange'
import userData from '@/user.json'
import { useHead } from '@vueuse/head'

useHead({
  title: 'Pipeline Report',
  meta: [
    {
      name: 'description',
      content: 'Filter and analyze sales pipeline performance across owners, stages, and date ranges for The Anvaya Beach Resort Bali.'
    }
  ]
})

const store = useCrmStore()
const router = useRouter()

// ---- Filters ----
type DateField = 'arrivalDate' | 'leadDate' | 'checkoutDate'
const filters = reactive({
  owner: '',
  segment: '',
  dateField: 'arrivalDate' as DateField,
  range: 'all' as RangePreset,
  from: '',
  to: ''
})
const rangeOptions = RANGE_OPTIONS

watch(
  () => filters.range,
  range => {
    if (range === 'custom') return
    const resolved = presetRange(range)
    filters.from = resolved?.from ?? ''
    filters.to = resolved?.to ?? ''
  },
  { immediate: true }
)

const rangeLabel = computed(() => {
  if (filters.range === 'all') return 'All dates'
  if (filters.from && filters.to) return `${formatDate(filters.from)} – ${formatDate(filters.to)}`
  if (filters.from) return `From ${formatDate(filters.from)}`
  if (filters.to) return `Until ${formatDate(filters.to)}`
  return ''
})

function clearFilters() {
  filters.owner = ''
  filters.segment = ''
  filters.dateField = 'arrivalDate'
  filters.range = 'all'
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
// A deal's counted value: actual booked amount once won, otherwise the estimate.
const val = (d: Deal) => (dealOutcome(d) === 'won' ? wonRevenue(d) : d.totalRevenue ?? 0)
const sum = (arr: Deal[]) => arr.reduce((s, d) => s + val(d), 0)
const isOpen = (d: Deal) => dealOutcome(d) === 'open'
function pct(v: number, max: number): number {
  return max > 0 ? Math.round((v / max) * 100) : 0
}
function fmtPct(x: number): string {
  return `${Math.round(x * 100)}%`
}
function winRateColor(x: number): string {
  if (x >= 0.5) return 'text-sm-won'
  if (x >= 0.25) return 'text-sm-warn'
  return 'text-sm-bad'
}

// Stage win-probability for the weighted forecast (only open stages are weighted).
const STAGE_PROB: Record<DealStage, number> = {
  New: 0.1,
  Proposal: 0.3,
  Negotiation: 0.5,
  Contract: 0.8,
  Confirmed: 1,
  Lost: 0
}

// ---- KPIs ----
const kpis = computed(() => {
  const all = deals.value
  const open = all.filter(isOpen)
  const won = all.filter(d => dealOutcome(d) === 'won')
  const lost = all.filter(d => dealOutcome(d) === 'lost')
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
  { label: 'Total Pipeline', value: formatMoney(kpis.value.totalValue), sub: `${kpis.value.count} deals`, accent: 'text-sm-ink dark:text-white' },
  { label: 'Open Pipeline', value: formatMoney(kpis.value.openValue), sub: `${kpis.value.open} active/idle`, accent: 'text-sm-primary' },
  { label: 'Weighted Forecast', value: formatMoney(kpis.value.weighted), sub: 'stage-adjusted', accent: 'text-sm-ink dark:text-white' },
  { label: 'Won', value: formatMoney(kpis.value.wonValue), sub: `${kpis.value.won} deals`, accent: 'text-sm-won' },
  { label: 'Lost', value: formatMoney(kpis.value.lostValue), sub: `${kpis.value.lost} deals`, accent: 'text-sm-bad' },
  { label: 'Win Rate (count)', value: fmtPct(kpis.value.winRateCount), sub: `${kpis.value.won}/${kpis.value.won + kpis.value.lost} decided`, accent: 'text-sm-ink dark:text-white' },
  { label: 'Win Rate (value)', value: fmtPct(kpis.value.winRateValue), sub: 'won ÷ decided value', accent: 'text-sm-ink dark:text-white' },
  { label: 'Avg Deal Size', value: formatMoney(kpis.value.avgDeal), sub: 'all deals', accent: 'text-sm-ink dark:text-white' },
  { label: 'Room Nights', value: kpis.value.roomNights.toLocaleString('en-US'), sub: 'total potential', accent: 'text-sm-ink dark:text-white' },
  { label: 'Avg Proposed ADR', value: formatMoney(kpis.value.avgADR), sub: 'where quoted', accent: 'text-sm-ink dark:text-white' }
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
    r.value += val(d)
    const outcome = dealOutcome(d)
    if (outcome === 'won') {
      r.won++
      r.wonValue += val(d)
    } else if (outcome === 'lost') {
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

const byOutcome = computed(() => breakdown(d => dealOutcome(d), DEAL_OUTCOMES))
const byStage = computed(() => breakdown(d => d.stage ?? 'New', DEAL_STAGES))
const bySegment = computed(() => breakdown(d => d.segment))
const bySource = computed(() => breakdown(d => d.leadSource))
const byOwner = computed(() => breakdown(d => d.ownerName || 'Unassigned'))

const maxStageCount = computed(() => Math.max(1, ...byStage.value.map(r => r.count)))
const maxOwnerValue = computed(() => Math.max(1, ...byOwner.value.map(r => r.value)))

const lostReasons = computed(() => {
  const map = new Map<string, { key: string; count: number; value: number }>()
  for (const d of deals.value.filter(x => dealOutcome(x) === 'lost')) {
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
    r.value += val(d)
    if (dealOutcome(d) === 'won') r.won += val(d)
  }
  return [...map.values()].sort((a, b) => a.key.localeCompare(b.key))
})
const maxMonthValue = computed(() => Math.max(1, ...byMonth.value.map(r => r.value)))

const topDeals = computed(() => [...deals.value].sort((a, b) => val(b) - val(a)).slice(0, 10))

const overdue = computed(() =>
  deals.value
    .filter(d => isOpen(d) && isOverdue(d.actionDueDate))
    .sort((a, b) => (a.actionDueDate ?? '').localeCompare(b.actionDueDate ?? ''))
)
const upcoming = computed(() => {
  const lo = baliToday()
  const hi = toBaliISO(Date.now() + 30 * 86_400_000)
  return deals.value
    .filter(d => isOpen(d) && d.actionDueDate && d.actionDueDate >= lo && d.actionDueDate <= hi)
    .sort((a, b) => (a.actionDueDate ?? '').localeCompare(b.actionDueDate ?? ''))
})

// ---- Colors ----
const outcomeColor: Record<string, string> = {
  open: 'bg-sm-primary',
  won: 'bg-sm-won',
  lost: 'bg-sm-bad'
}
const outcomeLabel: Record<string, string> = { open: 'Open', won: 'Won', lost: 'Lost' }
const stageColor: Record<string, string> = {
  New: 'bg-sm-muted',
  Proposal: 'bg-sm-primary',
  Negotiation: 'bg-sm-warn',
  Contract: 'bg-sm-wed',
  Confirmed: 'bg-sm-won',
  Lost: 'bg-sm-bad'
}
function outcomeClass(k: string): string {
  return outcomeColor[k] ?? 'bg-gray-400'
}
function stageClass(k: string): string {
  return stageColor[k] ?? 'bg-gray-400'
}

const statusDonut = computed(() => {
  const rows = byOutcome.value
  const total = rows.reduce((s, r) => s + r.value, 0) || 1
  const hex: Record<string, string> = { open: '#3b82f6', won: '#22c55e', lost: '#ef4444' }
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
  store.subscribe()
})
</script>

<style>
@media print {
  .no-print {
    display: none !important;
  }
}
</style>
