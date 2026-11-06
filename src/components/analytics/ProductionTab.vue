
<!-- "Production" tab: stat tiles + a production table switchable across market / rate
     plan / room type / company / FIT-Group, with a market-only segment trend chart,
     row drilldown (back to the Pace tab, scoped to that row), and CSV export. -->
<template>
  <div class="space-y-4">
    <dl class="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <div v-for="t in tiles" :key="t.label">
        <dt class="sm-eyebrow">{{ t.label }}</dt>
        <template v-if="loading">
          <SmSkeleton class="mt-1.5 h-6 w-20" />
          <SmSkeleton class="mt-1.5 h-3 w-28" />
        </template>
        <template v-else>
          <dd class="mt-1.5 text-xl font-extrabold tracking-[-0.02em] text-sm-ink dark:text-white" :title="t.title">{{ t.value }}</dd>
          <p v-for="s in t.subs" :key="s.text" class="mt-0.5 text-2xs tabular-nums" :class="s.tone || 'text-sm-faint'">{{ s.text }}</p>
        </template>
      </div>
    </dl>

    <RmsCard :title="`Production by ${dimensionLabel.toLowerCase()}`" :description="productionDescription" scroll>
      <template #actions>
        <div class="flex rounded-full border border-sm-line dark:border-white/10 p-0.5 text-xsm">
          <button
            v-for="d in dimensions"
            :key="d.id"
            type="button"
            class="px-3 py-1 rounded-full font-bold transition-colors"
            :class="dimension === d.id ? 'bg-sm-ink text-white dark:bg-white dark:text-sm-ink' : 'text-sm-muted'"
            :aria-pressed="dimension === d.id"
            @click="dimension = d.id"
          >
            {{ d.label }}
          </button>
        </div>
        <button type="button" class="sm-flat-btn" :aria-pressed="moreColumns" @click="moreColumns = !moreColumns">
          {{ moreColumns ? 'Fewer columns' : 'More columns' }}
        </button>
        <button type="button" class="sm-flat-btn" title="Export production" aria-label="Export production" @click="exportProduction">
          <ArrowDownTrayIcon class="w-4 h-4" />
        </button>
      </template>

      <table v-if="loading" class="w-full text-xsm">
        <tbody>
          <tr v-for="n in 6" :key="n" class="border-b border-sm-hair dark:border-white/5">
            <td class="py-2.5 px-4"><SmSkeleton class="h-3 w-28" /></td>
            <td v-for="c in columnCount - 1" :key="c" class="py-2.5 px-3"><SmSkeleton class="h-3 w-12 ml-auto" /></td>
          </tr>
        </tbody>
      </table>
      <table v-else-if="rows.length" class="w-full text-xsm">
        <thead>
          <tr class="text-right border-b border-sm-hair dark:border-white/5">
            <th class="py-2 px-4 text-left font-extrabold text-sm-ink dark:text-white">{{ dimensionLabel }}</th>
            <th class="py-2 px-3 font-extrabold text-sm-ink dark:text-white">OTB nights</th>
            <th class="py-2 px-3 font-extrabold text-sm-ink dark:text-white">Share</th>
            <th class="py-2 px-3 font-extrabold text-sm-ink dark:text-white">Revenue</th>
            <th class="py-2 px-3 font-extrabold text-sm-ink dark:text-white">ADR</th>
            <th class="py-2 px-3 font-extrabold text-sm-ink dark:text-white">Pickup ({{ pickupKey }}d)</th>
            <template v-if="showBudget">
              <th class="py-2 px-3 font-extrabold text-sm-ink dark:text-white">Budget nights</th>
              <th class="py-2 px-3 font-extrabold text-sm-ink dark:text-white">Budget revenue (gross)</th>
              <th class="py-2 px-3 font-extrabold text-sm-ink dark:text-white">vs budget (gross)</th>
            </template>
            <template v-else>
              <th class="py-2 px-3 font-extrabold text-sm-ink dark:text-white">LY nights</th>
              <th class="py-2 px-3 font-extrabold text-sm-ink dark:text-white">vs LY</th>
            </template>
            <template v-if="moreColumns">
              <th class="py-2 px-3 font-extrabold text-sm-ink dark:text-white">IDR coverage</th>
              <th v-for="n in otherPickups" :key="n" class="py-2 px-3 font-extrabold text-sm-ink dark:text-white">Pickup ({{ n }}d)</th>
              <th class="py-2 px-3 font-extrabold text-sm-ink dark:text-white">New ({{ pickupDays }}d)</th>
              <th class="py-2 px-3 font-extrabold text-sm-ink dark:text-white">Cancelled ({{ pickupDays }}d)</th>
              <th class="py-2 px-3 font-extrabold text-sm-ink dark:text-white">Amended ({{ pickupDays }}d)</th>
              <th class="py-2 px-3 text-left font-extrabold text-sm-ink dark:text-white">LY quality</th>
            </template>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in rows" :key="r.id" class="border-b border-sm-hair dark:border-white/5">
            <td class="py-2.5 px-4 whitespace-nowrap">
              <button v-if="dimension !== 'ratePlan' && r.id !== 'unassigned'" type="button" class="font-bold text-sm-primary hover:underline" @click="emit('drilldown', dimension, r.id)">
                {{ rowName(r) }}
              </button>
              <span v-else class="font-bold text-sm-ink dark:text-white">{{ rowName(r) }}</span>
              <span v-if="r.comparisonQuality === 'estimated'" class="ml-1 text-2xs font-bold text-sm-warn" title="Comparison is estimated">est.</span>
            </td>
            <td class="py-2.5 px-3 text-right">{{ num(r.rooms) }}</td>
            <td class="py-2.5 px-3 text-right">{{ share(ratio(r.rooms, totalRooms)) }}</td>
            <td class="py-2.5 px-3 text-right" :title="money(revenue(r))">{{ moneyShort(revenue(r)) }}</td>
            <td class="py-2.5 px-3 text-right" :title="money(ratio(revenue(r), r.idrRooms))">{{ moneyShort(ratio(revenue(r), r.idrRooms)) }}</td>
            <td class="py-2.5 px-3 text-right" :title="r.pickup[pickupKey]?.quality">{{ signed(r.pickup[pickupKey]?.rooms ?? null) }}</td>
            <template v-if="showBudget">
              <td class="py-2.5 px-3 text-right">{{ num(r.budget?.rooms ?? null) }}</td>
              <td class="py-2.5 px-3 text-right" :title="money(r.budget?.revenue ?? null)">{{ moneyShort(r.budget?.revenue ?? null) }}</td>
              <td class="py-2.5 px-3 text-right" :class="signClass(difference(revenue(r), r.budget?.revenue ?? null))">{{ signed(difference(revenue(r), r.budget?.revenue ?? null)) }}</td>
            </template>
            <template v-else>
              <td class="py-2.5 px-3 text-right">{{ num(r.comparison.rooms) }}</td>
              <td class="py-2.5 px-3 text-right" :class="signClass(difference(r.rooms, r.comparison.rooms))">{{ signed(difference(r.rooms, r.comparison.rooms)) }}</td>
            </template>
            <template v-if="moreColumns">
              <td class="py-2.5 px-3 text-right">{{ share(ratio(r.idrRooms, r.rooms)) }}</td>
              <td v-for="n in otherPickups" :key="n" class="py-2.5 px-3 text-right" :title="r.pickup[n]?.quality">{{ signed(r.pickup[n]?.rooms ?? null) }}</td>
              <td class="py-2.5 px-3 text-right">{{ num(r.newRooms) }}</td>
              <td class="py-2.5 px-3 text-right">{{ num(r.cancelledRooms) }}</td>
              <td class="py-2.5 px-3 text-right">{{ signed(r.amendedRooms) }}</td>
              <td class="py-2.5 px-3">{{ r.comparisonQuality }}</td>
            </template>
          </tr>
        </tbody>
      </table>
      <template v-if="!loading && !rows.length" #empty>No production for this selection.</template>
    </RmsCard>

    <RmsCard v-if="dimension === 'market'" title="Segment room-night trend" description="Top five segments by room nights; the rest are combined as Other.">
      <template #actions>
        <div class="flex rounded-full border border-sm-line dark:border-white/10 p-0.5 text-xsm">
          <button
            v-for="p in (['weekly', 'monthly'] as const)"
            :key="p"
            type="button"
            class="px-3 py-1 rounded-full font-bold capitalize transition-colors"
            :class="trendPeriod === p ? 'bg-sm-ink text-white dark:bg-white dark:text-sm-ink' : 'text-sm-muted'"
            :aria-pressed="trendPeriod === p"
            @click="trendPeriod = p"
          >
            {{ p }}
          </button>
        </div>
      </template>
      <div class="h-72 p-4">
        <SmSkeleton v-if="loading" class="h-full w-full" />
        <Chart v-else type="bar" :data="trendData" :options="chartOptions" />
      </div>
    </RmsCard>

    <details v-if="unavailable.length" class="rounded-xl border border-sm-line dark:border-white/10 px-4 py-3 text-xs text-sm-muted">
      <summary class="cursor-pointer font-bold text-sm-ink dark:text-white">Reports not available yet ({{ unavailable.length }})</summary>
      <dl class="mt-2 space-y-2">
        <div v-for="r in unavailable" :key="r.report">
          <dt class="font-bold text-sm-ink dark:text-white">{{ r.report }}</dt>
          <dd>{{ r.reason }}</dd>
        </div>
      </dl>
    </details>
  </div>
</template>

<script setup lang="ts">
import '@/lib/chartSetup'
import { computed, ref } from 'vue'
import { Chart } from 'vue-chartjs'
import type { ChartOptions, ChartTypeRegistry } from 'chart.js'
import { ArrowDownTrayIcon } from '@heroicons/vue/24/outline'
import RmsCard from './RmsCard.vue'
import SmSkeleton from '@/components/ui/SmSkeleton.vue'
import { addDays } from '@/lib/rmsPace'
import { downloadCsv } from '@/lib/csvExport'
import { difference, money, moneyShort, num, ratio, share, signClass, signed, vsLabel } from '@/lib/rmsFormat'
import type { RmsMarketTrendPoint, RmsProductionRow, RmsQuality, RmsReportsResponse } from '@/types/rms'

type Dimension = 'market' | 'ratePlan' | 'roomType' | 'company' | 'group'

const props = defineProps<{
  loading: boolean
  production: RmsReportsResponse['production'] | null
  marketTrend: RmsMarketTrendPoint[]
  unavailable: { report: string; reason: string }[]
  quality: RmsQuality
  basis: 'gross' | 'net'
  compareWithBudget: boolean
  pickupDays: number
  labels: Record<string, string>
  exportRange: { start: string; end: string } | null
}>()
const emit = defineEmits<{ drilldown: [dimension: string, id: string] }>()

const dimensions: { id: Dimension; label: string }[] = [
  { id: 'market', label: 'Market' },
  { id: 'ratePlan', label: 'Rate plan' },
  { id: 'roomType', label: 'Room type' },
  { id: 'company', label: 'Company' },
  { id: 'group', label: 'FIT / Group' }
]
const dimension = ref<Dimension>('market')
const moreColumns = ref(false)
const trendPeriod = ref<'weekly' | 'monthly'>('weekly')

const dimensionLabel = computed(() => dimensions.find(d => d.id === dimension.value)?.label || '')
const rows = computed(() => props.production?.[dimension.value] ?? [])
const showBudget = computed(() => dimension.value === 'market' && props.compareWithBudget)
const productionDescription = computed(
  () => `Stay-night positions · history quality ${props.quality}. ${dimension.value !== 'ratePlan' ? 'Select a row to open its pace.' : ''}`
)

const pickupKey = computed(() => (['1', '7', '30'].includes(String(props.pickupDays)) ? String(props.pickupDays) : '7'))
const otherPickups = computed(() => ['1', '7', '30'].filter(n => n !== pickupKey.value))
const columnCount = computed(() => 6 + (showBudget.value ? 3 : 2) + (moreColumns.value ? 5 + otherPickups.value.length : 0))

const revenue = (r: RmsProductionRow) => (props.basis === 'net' ? r.netRevenue : r.revenue)
const rowName = (r: RmsProductionRow) => (dimension.value === 'roomType' ? props.labels[r.id] || r.name : r.name)

const totalRooms = computed(() => rows.value.reduce((s, r) => s + r.rooms, 0))
const totalIdrRooms = computed(() => rows.value.reduce((s, r) => s + r.idrRooms, 0))
const totalRevenue = computed(() => rows.value.reduce((s, r) => s + revenue(r), 0))
const totalComparisonRooms = computed(() =>
  showBudget.value ? rows.value.reduce((s, r) => s + (r.budget?.rooms ?? 0), 0) : rows.value.reduce((s, r) => s + r.comparison.rooms, 0)
)
const totalComparisonRevenue = computed(() =>
  showBudget.value
    ? rows.value.reduce((s, r) => s + (r.budget?.revenue ?? 0), 0)
    : rows.value.reduce((s, r) => s + (props.basis === 'net' ? r.comparison.netRevenue : r.comparison.revenue), 0)
)
const totalComparisonIdrRooms = computed(() => rows.value.reduce((s, r) => s + r.comparison.idrRooms, 0))
const totalAdr = computed(() => ratio(totalRevenue.value, totalIdrRooms.value))
const totalComparisonAdr = computed(() =>
  showBudget.value ? ratio(totalComparisonRevenue.value, totalComparisonRooms.value) : ratio(totalComparisonRevenue.value, totalComparisonIdrRooms.value)
)
const comparisonLabel = computed(() => (showBudget.value ? 'vs budget' : 'vs LY'))

const tiles = computed(() => [
  {
    label: 'OTB room nights',
    value: num(totalRooms.value),
    subs: [vsLabel(totalRooms.value, totalComparisonRooms.value, num, comparisonLabel.value)]
  },
  {
    label: props.basis === 'net' ? 'Est. net revenue' : 'Room revenue',
    value: moneyShort(totalRevenue.value),
    title: money(totalRevenue.value),
    subs: [vsLabel(totalRevenue.value, totalComparisonRevenue.value, moneyShort, comparisonLabel.value)]
  },
  {
    label: 'ADR',
    value: moneyShort(totalAdr.value),
    title: money(totalAdr.value),
    subs: [vsLabel(totalAdr.value, totalComparisonAdr.value, moneyShort, comparisonLabel.value)]
  }
])

const trendData = computed(() => {
  const top = rows.value.slice(0, 5).map(r => r.id)
  const groups = new Map<string, Record<string, number>>()
  for (const r of props.marketTrend) {
    const id = top.includes(r.id) ? r.id : 'other'
    const key = trendPeriod.value === 'weekly' ? addDays(r.date, -((new Date(`${r.date}T00:00:00Z`).getUTCDay() + 6) % 7)) : r.date.slice(0, 7)
    const bucket = groups.get(key) || {}
    bucket[id] = (bucket[id] || 0) + r.rooms
    groups.set(key, bucket)
  }
  const keys = [...groups.keys()].sort()
  const ids = [...top, ...([...groups.values()].some(r => 'other' in r) ? ['other'] : [])]
  const colors = ['#0f766e', '#334155', '#6366f1', '#d97706', '#0284c7', '#94a3b8']
  return {
    labels: keys,
    datasets: ids.map((id, i) => ({
      label: rows.value.find(r => r.id === id)?.name || 'Other',
      data: keys.map(k => (props.quality === 'unavailable' ? null : groups.get(k)?.[id] || 0)),
      backgroundColor: colors[i % colors.length]
    }))
  }
})
const chartOptions: ChartOptions<keyof ChartTypeRegistry> = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: { mode: 'index', intersect: false },
  scales: { y: { beginAtZero: true } }
}

function exportProduction(): void {
  const budgetCols = showBudget.value
  downloadCsv(
    [
      [
        'Group',
        'OTB nights',
        'IDR revenue',
        `ADR (${props.basis})`,
        '1d pickup',
        '7d pickup',
        '30d pickup',
        ...(budgetCols ? ['Budget nights', 'Budget revenue (gross)'] : ['Comparison nights', 'Comparison quality'])
      ],
      ...rows.value.map(r => [
        rowName(r),
        r.rooms,
        revenue(r),
        ratio(revenue(r), r.idrRooms),
        r.pickup['1']?.rooms ?? null,
        r.pickup['7']?.rooms ?? null,
        r.pickup['30']?.rooms ?? null,
        ...(budgetCols ? [r.budget?.rooms ?? null, r.budget?.revenue ?? null] : [r.comparison.rooms, r.comparisonQuality])
      ])
    ],
    `rms-production-${dimension.value}-${props.exportRange?.start ?? ''}-${props.exportRange?.end ?? ''}.csv`
  )
}
</script>
