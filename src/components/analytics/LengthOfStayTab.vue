
<!-- "Length of stay" tab: stat tiles + a distribution bar chart/table. Full
     reservation length in nights, active reservations only. -->
<template>
  <div class="space-y-4">
    <dl class="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <div v-for="t in tiles" :key="t.label">
        <dt class="sm-eyebrow">{{ t.label }}</dt>
        <dd class="mt-1.5 text-xl font-extrabold tracking-[-0.02em] text-sm-ink dark:text-white">{{ t.value }}</dd>
      </div>
    </dl>

    <RmsCard title="Length of stay" description="Full reservation length in nights, active reservations.">
      <div class="h-56 p-4">
        <p v-if="loading" class="text-center text-sm-faint py-16">Loading…</p>
        <Chart v-else type="bar" :data="chartData" :options="chartOptions" />
      </div>
      <table v-if="!loading" class="w-full text-xsm border-t border-sm-line dark:border-white/10">
        <thead>
          <tr class="text-right border-b border-sm-hair dark:border-white/5">
            <th class="py-2 px-4 text-left font-extrabold text-sm-ink dark:text-white">Bucket</th>
            <th class="py-2 px-3 font-extrabold text-sm-ink dark:text-white">Reservations</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="b in buckets" :key="b.label" class="border-b border-sm-hair dark:border-white/5">
            <td class="py-2 px-4">{{ b.label }}</td>
            <td class="py-2 px-3 text-right">{{ available(b.bookings) }}</td>
          </tr>
        </tbody>
      </table>
    </RmsCard>
    <p class="text-2xs text-sm-faint">History quality: {{ quality }}. Stay length is the full reservation, even if only some nights fall in the selected range.</p>
  </div>
</template>

<script setup lang="ts">
import '@/lib/chartSetup'
import { computed } from 'vue'
import { Chart } from 'vue-chartjs'
import type { ChartOptions, ChartTypeRegistry } from 'chart.js'
import RmsCard from './RmsCard.vue'
import { num } from '@/lib/rmsFormat'
import type { RmsBehaviour, RmsQuality } from '@/types/rms'

const props = defineProps<{
  loading: boolean
  behaviour: RmsBehaviour | null
  quality: RmsQuality
}>()

const available = (v: number | null | undefined) => num(props.quality === 'unavailable' ? null : v)
const buckets = computed(() => props.behaviour?.lengthOfStay ?? [])

const tiles = computed(() => [
  { label: 'Active reservations', value: available(props.behaviour?.bookings ?? null) },
  { label: 'Avg full stay (nights)', value: available(props.behaviour?.averageLengthOfStay ?? null) }
])

const chartData = computed(() => ({
  labels: buckets.value.map(b => b.label),
  datasets: [
    {
      label: 'Active reservations',
      data: buckets.value.map(b => (props.quality === 'unavailable' ? null : b.bookings)),
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
</script>
