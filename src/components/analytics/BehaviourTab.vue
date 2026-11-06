
<!-- "Booking behaviour" tab: lead-time distribution, weekday pattern, and
     cancellations/no-shows by segment. Length of stay has its own dedicated tab on
     this page, so it isn't repeated here (unlike the Revenue Console's generic
     grouped-reports view, which shows both side by side when there's no separate tab). -->
<template>
  <div class="space-y-4">
    <div class="rounded-xl border border-sm-line dark:border-white/10 flex flex-wrap items-end justify-between gap-3 p-4">
      <div class="w-56">
        <SmSelect :model-value="dateBasis" :options="dateBasisOptions" label="Date selection applies to" size="sm" @update:model-value="v => emit('update:dateBasis', v as RmsDateBasis)" />
      </div>
      <button type="button" class="sm-flat-btn" @click="exportBehaviour">
        <ArrowDownTrayIcon class="w-4 h-4" /> Export behaviour
      </button>
    </div>

    <p v-if="behaviour && behaviour.invalidLeadTime" class="text-sm text-sm-warn">
      {{ behaviour.invalidLeadTime }} reservations have negative lead time and are left out of the lead-time buckets.
    </p>

    <dl class="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <div v-for="t in tiles" :key="t.label">
        <dt class="sm-eyebrow">{{ t.label }}</dt>
        <dd class="mt-1.5 text-xl font-extrabold tracking-[-0.02em] text-sm-ink dark:text-white">{{ t.value }}</dd>
      </div>
    </dl>

    <RmsCard title="Lead time" description="Days between booking and arrival, active reservations.">
      <div class="h-56 p-4">
        <p v-if="loading" class="text-center text-sm-faint py-16">Loading…</p>
        <Chart v-else type="bar" :data="leadTimeChart" :options="chartOptions" />
      </div>
      <table v-if="!loading" class="w-full text-xsm border-t border-sm-line dark:border-white/10">
        <thead>
          <tr class="text-right border-b border-sm-hair dark:border-white/5">
            <th class="py-2 px-4 text-left font-extrabold text-sm-ink dark:text-white">Bucket</th>
            <th class="py-2 px-3 font-extrabold text-sm-ink dark:text-white">Reservations</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="b in behaviour?.leadTime ?? []" :key="b.label" class="border-b border-sm-hair dark:border-white/5">
            <td class="py-2 px-4">{{ b.label }}</td>
            <td class="py-2 px-3 text-right">{{ available(b.bookings) }}</td>
          </tr>
        </tbody>
      </table>
    </RmsCard>

    <div class="grid gap-4 lg:grid-cols-2">
      <RmsCard title="Booking and arrival weekday">
        <table class="w-full text-xsm">
          <thead>
            <tr class="text-right border-b border-sm-hair dark:border-white/5">
              <th class="py-2 px-4 text-left font-extrabold text-sm-ink dark:text-white">Weekday</th>
              <th class="py-2 px-3 font-extrabold text-sm-ink dark:text-white">Booked</th>
              <th class="py-2 px-3 font-extrabold text-sm-ink dark:text-white">Arrivals</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in behaviour?.weekdays ?? []" :key="r.label" class="border-b border-sm-hair dark:border-white/5">
              <td class="py-2 px-4">{{ r.label }}</td>
              <td class="py-2 px-3 text-right">{{ available(r.booked) }}</td>
              <td class="py-2 px-3 text-right">{{ available(r.arrivals) }}</td>
            </tr>
          </tbody>
        </table>
      </RmsCard>
      <RmsCard
        title="Cancellations and no-shows by segment"
        description="Current status of every reservation in the cohort, not a count of cancellation events. Future no-shows aren't final."
      >
        <div class="overflow-x-auto">
          <table class="w-full text-xsm">
            <thead>
              <tr class="text-right border-b border-sm-hair dark:border-white/5">
                <th class="py-2 px-4 text-left font-extrabold text-sm-ink dark:text-white">Segment</th>
                <th class="py-2 px-3 font-extrabold text-sm-ink dark:text-white">Bookings</th>
                <th class="py-2 px-3 font-extrabold text-sm-ink dark:text-white">Cancelled</th>
                <th class="py-2 px-3 font-extrabold text-sm-ink dark:text-white">Cancel %</th>
                <th class="py-2 px-3 font-extrabold text-sm-ink dark:text-white">No-shows</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="r in behaviour?.losses ?? []" :key="r.id" class="border-b border-sm-hair dark:border-white/5">
                <td class="py-2 px-4 font-bold text-sm-ink dark:text-white">{{ r.name }}</td>
                <td class="py-2 px-3 text-right">{{ available(r.bookings) }}</td>
                <td class="py-2 px-3 text-right">{{ available(r.cancelled) }}</td>
                <td class="py-2 px-3 text-right">{{ quality === 'unavailable' ? EMPTY : share(ratio(r.cancelled, r.bookings)) }}</td>
                <td class="py-2 px-3 text-right">{{ available(r.noShows) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </RmsCard>
    </div>
    <p class="text-2xs text-sm-faint">
      History quality: {{ quality }}. Each reservation counts once. Lead time uses active bookings (no cancellations or no-shows).
    </p>
  </div>
</template>

<script setup lang="ts">
import '@/lib/chartSetup'
import { computed } from 'vue'
import { Chart } from 'vue-chartjs'
import type { ChartOptions, ChartTypeRegistry } from 'chart.js'
import { ArrowDownTrayIcon } from '@heroicons/vue/24/outline'
import RmsCard from './RmsCard.vue'
import SmSelect from '@/components/ui/SmSelect.vue'
import { downloadCsv } from '@/lib/csvExport'
import { EMPTY, num, ratio, share } from '@/lib/rmsFormat'
import type { RmsBehaviour, RmsDateBasis, RmsQuality } from '@/types/rms'

const props = defineProps<{
  loading: boolean
  behaviour: RmsBehaviour | null
  quality: RmsQuality
  dateBasis: RmsDateBasis
  exportRange: { start: string; end: string } | null
}>()
const emit = defineEmits<{ 'update:dateBasis': [value: RmsDateBasis] }>()

const dateBasisOptions = [
  { value: 'stay', label: 'Stay dates (overlapping stays)' },
  { value: 'booking', label: 'Booking creation dates' }
]

const available = (v: number | null | undefined) => num(props.quality === 'unavailable' ? null : v)

const tiles = computed(() => [
  { label: 'Active reservations', value: available(props.behaviour?.bookings ?? null) },
  { label: 'All cohort reservations', value: available(props.behaviour?.allBookings ?? null) },
  { label: 'Avg lead time (days)', value: available(props.behaviour?.averageLeadTime ?? null) },
  { label: 'Avg full stay (nights)', value: available(props.behaviour?.averageLengthOfStay ?? null) }
])

const leadTimeChart = computed(() => ({
  labels: (props.behaviour?.leadTime ?? []).map(r => r.label),
  datasets: [
    {
      label: 'Active reservations',
      data: (props.behaviour?.leadTime ?? []).map(r => (props.quality === 'unavailable' ? null : r.bookings)),
      backgroundColor: '#1E9E4A'
    }
  ]
}))
const chartOptions: ChartOptions<keyof ChartTypeRegistry> = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: { mode: 'index', intersect: false },
  scales: { y: { beginAtZero: true } }
}

function exportBehaviour(): void {
  const b = props.behaviour
  if (!b) return
  downloadCsv(
    [
      ['Report', 'Bucket', 'Reservations', 'Date basis', 'Quality'],
      ...b.leadTime.map(r => ['Lead time', r.label, props.quality === 'unavailable' ? null : r.bookings, props.dateBasis, props.quality]),
      ...b.lengthOfStay.map(r => ['Length of stay', r.label, props.quality === 'unavailable' ? null : r.bookings, props.dateBasis, props.quality])
    ],
    `rms-behaviour-${props.exportRange?.start ?? ''}-${props.exportRange?.end ?? ''}.csv`
  )
}
</script>
