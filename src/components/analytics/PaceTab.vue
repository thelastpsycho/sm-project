
<!-- "Pace & pickups" tab: Chart.js combo chart (bars + ADR lines, dual axis) with a
     period summary table, plus a day-by-day pickup table. Ported from the Revenue
     Console frontend's RmsPaceTab.vue. -->
<template>
  <div class="space-y-4">
    <RmsCard title="Pace vs last year" :description="chartDescription">
      <template #actions>
        <div class="flex rounded-full border border-sm-line dark:border-white/10 p-0.5 text-xsm">
          <button
            v-for="v in views"
            :key="v.id"
            type="button"
            class="px-3 py-1 rounded-full font-bold capitalize transition-colors"
            :class="chartView === v.id ? 'bg-sm-ink text-white dark:bg-white dark:text-sm-ink' : 'text-sm-muted'"
            :aria-pressed="chartView === v.id"
            @click="chartView = v.id"
          >
            {{ v.label }}
          </button>
        </div>
      </template>
      <div class="h-72 p-4">
        <SmSkeleton v-if="loading" class="h-full w-full" />
        <Chart v-else type="bar" :data="chartData" :options="PACE_CHART_OPTIONS" />
      </div>
      <div v-if="loading" class="overflow-x-auto border-t border-sm-line dark:border-white/10">
        <table class="w-full text-xsm">
          <tbody>
            <tr v-for="n in 3" :key="n" class="border-b border-sm-hair dark:border-white/5">
              <td class="py-2.5 px-4"><SmSkeleton class="h-3 w-20" /></td>
              <td v-for="c in 6" :key="c" class="py-2.5 px-3"><SmSkeleton class="h-3 w-16 ml-auto" /></td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-else-if="chartTable.buckets.length" class="overflow-x-auto border-t border-sm-line dark:border-white/10">
        <table class="w-full text-xsm">
          <thead>
            <tr class="text-right border-b border-sm-hair dark:border-white/5">
              <th class="py-2 px-4 text-left"></th>
              <th v-for="b in chartTable.buckets" :key="b.key" class="py-2 px-3 font-extrabold text-sm-ink dark:text-white">{{ b.key }}</th>
              <th class="py-2 px-3 font-extrabold text-sm-ink dark:text-white">Total</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="m in metrics" :key="m.label" class="border-b border-sm-hair dark:border-white/5">
              <td class="py-2.5 px-4 font-bold text-sm-ink dark:text-white whitespace-nowrap">{{ m.label }}</td>
              <td v-for="b in [...chartTable.buckets, totalBucket]" :key="b.key" class="py-2.5 px-3 text-right whitespace-nowrap" :class="b.key === 'Total' && 'font-bold text-sm-ink dark:text-white'">
                {{ m.fmt(m.cur(b)) }}
                <div v-if="!compareWithBudget" class="text-2xs text-sm-faint">
                  LY {{ m.fmt(m.ly(b)) }} · <span :class="signClass(pctDiff(m.cur(b), m.ly(b)))">{{ pctLabel(pctDiff(m.cur(b), m.ly(b))) }}</span>
                </div>
                <div v-else-if="m.budget(b) != null" class="text-2xs text-sm-faint">
                  Budget {{ m.fmt(m.budget(b)) }} · <span :class="signClass(pctDiff(m.cur(b), m.budget(b)))">{{ pctLabel(pctDiff(m.cur(b), m.budget(b))) }}</span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </RmsCard>

    <RmsCard title="Pickup by stay date" :description="`Net pickup over the last ${pickupDays} days = new − cancelled + amendments, in room nights.`" scroll>
      <template #actions>
        <label class="flex items-center gap-1.5 text-xs text-sm-muted">
          <input v-model="behindOnly" type="checkbox" class="accent-sm-primary" />
          Behind LY only
        </label>
      </template>
      <table v-if="loading" class="w-full text-xsm">
        <thead>
          <tr class="text-right border-b border-sm-hair dark:border-white/5">
            <th class="py-2 px-4 text-left font-extrabold text-sm-ink dark:text-white">Stay date</th>
            <th class="py-2 px-3 font-extrabold text-sm-ink dark:text-white">OTB</th>
            <th class="py-2 px-3 font-extrabold text-sm-ink dark:text-white" title="On the books minus the comparison date's position at the same lead time">vs LY</th>
            <th class="py-2 px-3 font-extrabold text-sm-ink dark:text-white">Net pickup</th>
            <th class="py-2 px-3 font-extrabold text-sm-ink dark:text-white">Revenue</th>
            <th class="py-2 px-3 font-extrabold text-sm-ink dark:text-white" title="Final room nights on the last-year / matched date">LY final</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="n in 10" :key="n" class="border-b border-sm-hair dark:border-white/5">
            <td class="py-2.5 px-4"><SmSkeleton class="h-3 w-24" /></td>
            <td class="py-2.5 px-3"><SmSkeleton class="h-3 w-10 ml-auto" /></td>
            <td class="py-2.5 px-3"><SmSkeleton class="h-3 w-10 ml-auto" /></td>
            <td class="py-2.5 px-3"><SmSkeleton class="h-3 w-12 ml-auto" /></td>
            <td class="py-2.5 px-3"><SmSkeleton class="h-3 w-14 ml-auto" /></td>
            <td class="py-2.5 px-3"><SmSkeleton class="h-3 w-10 ml-auto" /></td>
          </tr>
        </tbody>
      </table>
      <table v-else-if="pickupRows.length" class="w-full text-xsm">
        <thead>
          <tr class="text-right border-b border-sm-hair dark:border-white/5">
            <th class="py-2 px-4 text-left font-extrabold text-sm-ink dark:text-white">Stay date</th>
            <th class="py-2 px-3 font-extrabold text-sm-ink dark:text-white">OTB</th>
            <th class="py-2 px-3 font-extrabold text-sm-ink dark:text-white" title="On the books minus the comparison date's position at the same lead time">vs LY</th>
            <th class="py-2 px-3 font-extrabold text-sm-ink dark:text-white">Net pickup</th>
            <th class="py-2 px-3 font-extrabold text-sm-ink dark:text-white">Revenue</th>
            <th class="py-2 px-3 font-extrabold text-sm-ink dark:text-white" title="Final room nights on the last-year / matched date">LY final</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in pickupRows" :key="r.date" class="border-b border-sm-hair dark:border-white/5">
            <td class="py-2.5 px-4 whitespace-nowrap">
              {{ dayLabel(r.date) }}
              <span v-if="estimated(r)" class="ml-1 text-2xs font-bold text-sm-warn" :title="`Comparison: ${r.comparisonQuality} · Pickup: ${r.pickupQuality}`">est.</span>
            </td>
            <td class="py-2.5 px-3 text-right">{{ num(currentRooms(r)) }}</td>
            <td class="py-2.5 px-3 text-right" :class="signClass(gap(r))">{{ signed(gap(r)) }}</td>
            <td class="py-2.5 px-3 text-right whitespace-nowrap">
              {{ signed(r.pickupRooms) }}
              <div class="text-2xs text-sm-faint">{{ pickupParts(r) }}</div>
            </td>
            <td class="py-2.5 px-3 text-right" :title="money(rowRevenue(r))">{{ moneyShort(rowRevenue(r)) }}</td>
            <td class="py-2.5 px-3 text-right">{{ num(r.lyFinalRooms) }}</td>
          </tr>
        </tbody>
      </table>
      <template v-if="!loading && !pickupRows.length" #empty>
        {{ rows.length ? 'No dates are behind last year.' : 'Apply a range to load data.' }}
      </template>
    </RmsCard>
  </div>
</template>

<script setup lang="ts">
import '@/lib/chartSetup'
import { computed, ref } from 'vue'
import { Chart } from 'vue-chartjs'
import RmsCard from './RmsCard.vue'
import SmSkeleton from '@/components/ui/SmSkeleton.vue'
import {
  currentRooms,
  paceBuckets,
  paceChartData,
  paceChartTable,
  PACE_CHART_OPTIONS,
  revenueFor,
  type ChartView,
  type PaceBucket,
  type RevenueBasis
} from '@/lib/rmsPace'
import { dayLabel, difference, money, moneyShort, num, pctDiff, pctLabel, signClass, signed } from '@/lib/rmsFormat'
import type { RmsPaceRow } from '@/types/rms'

const props = defineProps<{
  loading: boolean
  rows: RmsPaceRow[]
  basis: RevenueBasis
  pickupDays: number
  compareWithBudget: boolean
}>()

const views: { id: ChartView; label: string }[] = [
  { id: 'daily', label: 'Daily' },
  { id: 'weekly', label: 'Weekly' },
  { id: 'monthly', label: 'Monthly' }
]
const chartView = ref<ChartView>('monthly')
const behindOnly = ref(false)

const buckets = computed(() => paceBuckets(props.rows, chartView.value, props.basis))
const chartTable = computed(() => paceChartTable(buckets.value, props.rows))
const chartData = computed(() => paceChartData(buckets.value, props.compareWithBudget))

const idrCoverage = computed(() => {
  const rooms = props.rows.reduce((s, r) => s + r.idrRooms, 0)
  const total = props.rows.reduce((s, r) => s + (currentRooms(r) ?? 0), 0)
  return total ? (rooms / total) * 100 : null
})
const basisLabel = computed(() =>
  props.basis === 'gross'
    ? 'Gross quoted room-rate revenue (USD converted to IDR)'
    : 'Estimated room-rate revenue net of breakfast and tax/service (USD converted to IDR)'
)
const chartDescription = computed(
  () => `Room nights and ADR · ${basisLabel.value}. IDR ADR coverage ${idrCoverage.value == null ? '—' : idrCoverage.value.toFixed(1) + '%'} of room nights.`
)

interface Metric {
  label: string
  cur: (b: PaceBucket) => number | null
  ly: (b: PaceBucket) => number | null
  budget: (b: PaceBucket) => number | null
  fmt: (v: number | null) => string
}
const metrics: Metric[] = [
  { label: 'Room nights', cur: b => b.rooms, ly: b => b.comparison, budget: b => b.budgetRooms, fmt: num },
  { label: 'Revenue', cur: b => b.revenue, ly: b => b.comparisonRevenue, budget: b => b.budgetRevenue, fmt: moneyShort },
  { label: 'ADR', cur: b => b.adr, ly: b => b.comparisonAdr, budget: b => b.budgetAdr, fmt: moneyShort }
]
const totalBucket = computed<PaceBucket>(() => ({ key: 'Total', ...chartTable.value.totals }))

const gap = (r: RmsPaceRow) => difference(currentRooms(r), r.stlyRooms)
const rowRevenue = (r: RmsPaceRow) => (currentRooms(r) == null ? null : revenueFor(r, props.basis))
const estimated = (r: RmsPaceRow) => ([r.comparisonQuality, r.pickupQuality] as string[]).includes('estimated')
function pickupParts(r: RmsPaceRow): string {
  const parts = [`${num(r.newRooms)} new`, `${num(r.cancelledRooms)} cxl`]
  if (r.amendedRooms) parts.push(`${signed(r.amendedRooms)} amd`)
  return parts.join(' · ')
}
const pickupRows = computed(() => (behindOnly.value ? props.rows.filter(r => (gap(r) ?? 0) < 0) : props.rows))
</script>
