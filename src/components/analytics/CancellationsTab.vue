
<!-- "Cancellations" tab: cancelled/no-show reservations by market, plus a weekly
     trend of cancelled vs. new room nights (stay date, from the pace rows — the
     reports endpoint has no time series of its own). -->
<template>
  <div class="space-y-4">
    <div class="flex justify-end">
      <button type="button" class="sm-flat-btn" @click="exportCancellations">
        <ArrowDownTrayIcon class="w-4 h-4" /> Export cancellations
      </button>
    </div>

    <dl class="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <div v-for="t in tiles" :key="t.label">
        <dt class="sm-eyebrow">{{ t.label }}</dt>
        <dd class="mt-1.5">
          <SmSkeleton v-if="loading" class="h-6 w-16" />
          <span v-else class="text-xl font-extrabold tracking-[-0.02em] text-sm-ink dark:text-white">{{ t.value }}</span>
        </dd>
      </div>
    </dl>

    <RmsCard title="Cancelled vs. new room nights" description="Weekly, by stay date. Net of same-day rebookings isn't broken out.">
      <div class="h-56 p-4">
        <SmSkeleton v-if="paceLoading" class="h-full w-full" />
        <Chart v-else type="bar" :data="trendChart" :options="chartOptions" />
      </div>
    </RmsCard>

    <RmsCard
      title="Cancellations and no-shows by market"
      description="Current status of every reservation in the cohort, not a count of cancellation events. Future no-shows aren't final."
    >
      <div class="overflow-x-auto">
        <table class="w-full text-xsm">
          <thead>
            <tr class="text-right border-b border-sm-hair dark:border-white/5">
              <th class="py-2 px-4 text-left font-extrabold text-sm-ink dark:text-white">Market</th>
              <th class="py-2 px-3 font-extrabold text-sm-ink dark:text-white">Bookings</th>
              <th class="py-2 px-3 font-extrabold text-sm-ink dark:text-white">Cancelled</th>
              <th class="py-2 px-3 font-extrabold text-sm-ink dark:text-white">Cancel %</th>
              <th class="py-2 px-3 font-extrabold text-sm-ink dark:text-white">No-shows</th>
              <th class="py-2 px-3 font-extrabold text-sm-ink dark:text-white">No-show %</th>
            </tr>
          </thead>
          <tbody v-if="loading">
            <tr v-for="n in 5" :key="n" class="border-b border-sm-hair dark:border-white/5">
              <td class="py-2 px-4"><SmSkeleton class="h-3 w-24" /></td>
              <td class="py-2 px-3"><SmSkeleton class="h-3 w-10 ml-auto" /></td>
              <td class="py-2 px-3"><SmSkeleton class="h-3 w-10 ml-auto" /></td>
              <td class="py-2 px-3"><SmSkeleton class="h-3 w-10 ml-auto" /></td>
              <td class="py-2 px-3"><SmSkeleton class="h-3 w-10 ml-auto" /></td>
              <td class="py-2 px-3"><SmSkeleton class="h-3 w-10 ml-auto" /></td>
            </tr>
          </tbody>
          <tbody v-else-if="losses.length">
            <tr v-for="r in losses" :key="r.id" class="border-b border-sm-hair dark:border-white/5">
              <td class="py-2 px-4 font-bold text-sm-ink dark:text-white">{{ r.name }}</td>
              <td class="py-2 px-3 text-right">{{ available(r.bookings) }}</td>
              <td class="py-2 px-3 text-right">{{ available(r.cancelled) }}</td>
              <td class="py-2 px-3 text-right">{{ quality === 'unavailable' ? EMPTY : share(ratio(r.cancelled, r.bookings)) }}</td>
              <td class="py-2 px-3 text-right">{{ available(r.noShows) }}</td>
              <td class="py-2 px-3 text-right">{{ quality === 'unavailable' ? EMPTY : share(ratio(r.noShows, r.bookings)) }}</td>
            </tr>
          </tbody>
        </table>
        <p v-if="!loading && !losses.length" class="px-4 py-6 text-center text-sm-faint">No cancellation data for this selection.</p>
      </div>
    </RmsCard>
    <p class="text-2xs text-sm-faint">History quality: {{ quality }}. Each reservation counts once toward its market's cohort.</p>
  </div>
</template>

<script setup lang="ts">
import '@/lib/chartSetup'
import { computed } from 'vue'
import { Chart } from 'vue-chartjs'
import type { ChartOptions, ChartTypeRegistry } from 'chart.js'
import { ArrowDownTrayIcon } from '@heroicons/vue/24/outline'
import RmsCard from './RmsCard.vue'
import SmSkeleton from '@/components/ui/SmSkeleton.vue'
import { addDays } from '@/lib/rmsPace'
import { downloadCsv } from '@/lib/csvExport'
import { EMPTY, num, ratio, share } from '@/lib/rmsFormat'
import type { RmsBehaviour, RmsPaceRow, RmsQuality } from '@/types/rms'

const props = defineProps<{
  loading: boolean
  behaviour: RmsBehaviour | null
  quality: RmsQuality
  paceRows: RmsPaceRow[]
  paceLoading: boolean
  exportRange: { start: string; end: string } | null
}>()

const available = (v: number | null | undefined) => num(props.quality === 'unavailable' ? null : v)
const losses = computed(() => props.behaviour?.losses ?? [])

const totalBookings = computed(() => losses.value.reduce((s, r) => s + r.bookings, 0))
const totalCancelled = computed(() => losses.value.reduce((s, r) => s + r.cancelled, 0))
const totalNoShows = computed(() => losses.value.reduce((s, r) => s + r.noShows, 0))

const tiles = computed(() => [
  { label: 'Cancelled reservations', value: available(totalCancelled.value) },
  { label: 'Cancel rate', value: props.quality === 'unavailable' ? EMPTY : share(ratio(totalCancelled.value, totalBookings.value)) },
  { label: 'No-shows', value: available(totalNoShows.value) },
  { label: 'No-show rate', value: props.quality === 'unavailable' ? EMPTY : share(ratio(totalNoShows.value, totalBookings.value)) }
])

const weeklyKey = (date: string): string => addDays(date, -((new Date(`${date}T00:00:00Z`).getUTCDay() + 6) % 7))
const weeklyTrend = computed(() => {
  const m = new Map<string, { cancelled: number; newRooms: number }>()
  for (const r of props.paceRows) {
    const key = weeklyKey(r.date)
    const bucket = m.get(key) || { cancelled: 0, newRooms: 0 }
    bucket.cancelled += r.cancelledRooms ?? 0
    bucket.newRooms += r.newRooms ?? 0
    m.set(key, bucket)
  }
  return [...m.entries()].sort(([a], [b]) => a.localeCompare(b))
})

const trendChart = computed(() => ({
  labels: weeklyTrend.value.map(([key]) => key),
  datasets: [
    { label: 'Cancelled room nights', data: weeklyTrend.value.map(([, v]) => v.cancelled), backgroundColor: '#D92F2F' },
    { label: 'New room nights', data: weeklyTrend.value.map(([, v]) => v.newRooms), backgroundColor: '#1E9E4A' }
  ]
}))
const chartOptions: ChartOptions<keyof ChartTypeRegistry> = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: { mode: 'index', intersect: false },
  scales: { y: { beginAtZero: true } }
}

function exportCancellations(): void {
  downloadCsv(
    [
      ['Market', 'Bookings', 'Cancelled', 'Cancel %', 'No-shows', 'No-show %', 'Quality'],
      ...losses.value.map(r => [
        r.name,
        props.quality === 'unavailable' ? null : r.bookings,
        props.quality === 'unavailable' ? null : r.cancelled,
        props.quality === 'unavailable' ? null : share(ratio(r.cancelled, r.bookings)),
        props.quality === 'unavailable' ? null : r.noShows,
        props.quality === 'unavailable' ? null : share(ratio(r.noShows, r.bookings)),
        props.quality
      ]),
      [],
      ['Week (stay date)', 'Cancelled room nights', 'New room nights'],
      ...weeklyTrend.value.map(([key, v]) => [key, v.cancelled, v.newRooms])
    ],
    `rms-cancellations-${props.exportRange?.start ?? ''}-${props.exportRange?.end ?? ''}.csv`
  )
}
</script>
