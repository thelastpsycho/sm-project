
<!--
  "Pace vs last year" — OTB room nights & ADR against the same-time-last-year (stly)
  comparison, as grouped bars (room nights, left axis) + two lines (ADR, right axis),
  with a period table underneath. Deliberately dual-axis: a bar+line combo reading
  room-nights and rate together is the standard hotel "pace report" shape, and it's
  what was asked for — a line chart alone would lose the rate story, two separate
  charts would lose the at-a-glance read this is built for.
-->
<template>
  <div>
    <div class="flex items-start justify-between gap-3">
      <div>
        <h2 class="sm-eyebrow">Pace vs last year</h2>
        <p class="mt-1 text-xsm text-sm-faint">Room nights and ADR · same time last year at equivalent lead time</p>
      </div>
      <div class="flex rounded-full border border-sm-line dark:border-white/10 p-0.5 text-xsm shrink-0">
        <button
          v-for="g in (['day', 'week', 'month'] as const)"
          :key="g"
          type="button"
          class="px-3 py-1 rounded-full font-bold capitalize transition-colors"
          :class="granularity === g ? 'bg-sm-ink text-white dark:bg-white dark:text-sm-ink' : 'text-sm-muted'"
          @click="granularity = g"
        >
          {{ g }}
        </button>
      </div>
    </div>

    <div v-if="!periods.length" class="text-center py-12 text-sm-faint">No pace data for this selection.</div>

    <template v-else>
      <!-- Legend -->
      <div class="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xsm text-sm-muted">
        <span class="flex items-center gap-1.5"><span class="inline-block w-4 h-0.5 rounded-full" style="background: #1E9E4A" />IDR ADR</span>
        <span class="flex items-center gap-1.5"
          ><span class="inline-block w-4 h-0.5 rounded-full border-t-2 border-dashed" style="border-color: #9ca3af" />Comparison ADR</span
        >
        <span class="flex items-center gap-1.5"><span class="inline-block w-3 h-3 rounded-sm" style="background: #1c1c1e" />OTB room nights</span>
        <span class="flex items-center gap-1.5"><span class="inline-block w-3 h-3 rounded-sm" style="background: #c7ccd6" />Comparison nights</span>
      </div>

      <!-- Chart -->
      <div class="relative mt-4">
        <svg
          :viewBox="`0 0 ${width} ${height}`"
          class="w-full"
          :style="{ height: `${height}px` }"
          preserveAspectRatio="none"
          @mousemove="onMove"
          @mouseleave="hoverIndex = null"
        >
          <!-- left-axis gridlines -->
          <line
            v-for="g in roomsGridLines"
            :key="g.y"
            :x1="padL"
            :x2="width - padR"
            :y1="g.y"
            :y2="g.y"
            class="stroke-sm-line dark:stroke-white/10"
            stroke-width="1"
          />
          <text v-for="g in roomsGridLines" :key="`l-${g.y}`" :x="padL - 6" :y="g.y" text-anchor="end" dominant-baseline="middle" class="fill-sm-faint text-[9px]">{{
            g.label
          }}</text>
          <text v-for="g in adrGridLines" :key="`r-${g.y}`" :x="width - padR + 6" :y="g.y" text-anchor="start" dominant-baseline="middle" class="fill-sm-faint text-[9px]">{{
            g.label
          }}</text>

          <!-- bars -->
          <template v-for="b in bars" :key="`bar-${b.i}`">
            <path :d="b.currentPath" fill="#1C1C1E" class="dark:fill-white" />
            <path :d="b.comparisonPath" fill="#C7CCD6" class="dark:fill-white/20" />
          </template>

          <!-- ADR lines -->
          <path :d="adrLinePath" fill="none" stroke="#1E9E4A" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
          <path :d="comparisonAdrLinePath" fill="none" stroke="#9ca3af" stroke-width="2" stroke-dasharray="4 3" stroke-linecap="round" stroke-linejoin="round" />
          <circle v-for="(p, i) in adrPoints" :key="`a-${i}`" :cx="p.x" :cy="p.y" r="4" fill="white" class="dark:fill-sm-card-dark" stroke="#1E9E4A" stroke-width="2" />
          <circle
            v-for="(p, i) in comparisonAdrPoints"
            :key="`c-${i}`"
            :cx="p.x"
            :cy="p.y"
            r="4"
            fill="white"
            class="dark:fill-sm-card-dark"
            stroke="#9ca3af"
            stroke-width="2"
          />

          <!-- hover crosshair -->
          <line
            v-if="hovered"
            :x1="hovered.x"
            :x2="hovered.x"
            :y1="padT"
            :y2="height - padB"
            class="stroke-sm-ink/20 dark:stroke-white/20"
            stroke-width="1"
          />
          <text
            v-for="(p, i) in periods"
            :key="`t-${i}`"
            :x="xForIndex(i)"
            :y="height - padB + 14"
            text-anchor="middle"
            class="fill-sm-faint text-[9px]"
          >{{ p.label }}</text>

          <rect :x="padL" :y="padT" :width="width - padL - padR" :height="height - padT - padB" fill="transparent" />
        </svg>

        <div
          v-if="hovered"
          class="absolute pointer-events-none rounded-md bg-sm-ink dark:bg-white text-white dark:text-sm-ink px-2.5 py-1.5 text-xs shadow-lg -translate-x-1/2"
          :style="{ left: `${(hovered.x / width) * 100}%`, top: '0px' }"
        >
          <p class="font-bold whitespace-nowrap">{{ hovered.period.label }}</p>
          <p class="whitespace-nowrap"><span class="inline-block w-2 h-2 rounded-sm mr-1" style="background: #1c1c1e" />OTB <span class="font-extrabold">{{ fmtRooms(hovered.period.rooms.value) }}</span></p>
          <p class="whitespace-nowrap"><span class="inline-block w-2 h-2 rounded-sm mr-1" style="background: #c7ccd6" />LY <span class="font-extrabold">{{ fmtRooms(hovered.period.stlyRooms.value) }}</span></p>
          <p v-if="hovered.adr" class="whitespace-nowrap"><span class="inline-block w-2 h-0.5 mr-1 align-middle" style="background: #1E9E4A" />ADR <span class="font-extrabold">{{ fmtMoney(hovered.adr.value) }}</span></p>
          <p v-if="hovered.comparisonAdr" class="whitespace-nowrap"><span class="inline-block w-2 h-0.5 mr-1 align-middle" style="background: #9ca3af" />LY ADR <span class="font-extrabold">{{ fmtMoney(hovered.comparisonAdr.value) }}</span></p>
        </div>
      </div>

      <!-- Period table -->
      <div class="overflow-x-auto mt-6">
        <table class="w-full text-xsm">
          <thead>
            <tr class="text-right border-b border-sm-line dark:border-white/10">
              <th class="pb-2 text-left font-extrabold text-sm-faint"></th>
              <th v-for="p in periods" :key="p.key" class="pb-2 font-extrabold text-sm-ink dark:text-white">{{ p.label }}</th>
              <th class="pb-2 font-extrabold text-sm-ink dark:text-white">Total</th>
            </tr>
          </thead>
          <tbody>
            <tr class="border-b border-sm-hair dark:border-white/5">
              <td class="py-2.5 font-bold text-sm-ink dark:text-white">Room nights</td>
              <td v-for="p in periods" :key="p.key" class="py-2.5 text-right">
                <PeriodCell :value="p.rooms" :base="p.stlyRooms" :format="fmtRooms" />
              </td>
              <td class="py-2.5 text-right"><PeriodCell :value="total.rooms" :base="total.stlyRooms" :format="fmtRooms" /></td>
            </tr>
            <tr class="border-b border-sm-hair dark:border-white/5">
              <td class="py-2.5 font-bold text-sm-ink dark:text-white">Revenue</td>
              <td v-for="p in periods" :key="p.key" class="py-2.5 text-right">
                <PeriodCell :value="p.revenue" :base="p.stlyRevenue" :format="fmtMoney" />
              </td>
              <td class="py-2.5 text-right"><PeriodCell :value="total.revenue" :base="total.stlyRevenue" :format="fmtMoney" /></td>
            </tr>
            <tr>
              <td class="py-2.5 font-bold text-sm-ink dark:text-white">ADR</td>
              <td v-for="p in periods" :key="p.key" class="py-2.5 text-right">
                <AdrCell :revenue="p.revenue" :rooms="p.rooms" :baseRevenue="p.stlyRevenue" :baseRooms="p.stlyRooms" :format="fmtMoney" />
              </td>
              <td class="py-2.5 text-right"><AdrCell :revenue="total.revenue" :rooms="total.rooms" :baseRevenue="total.stlyRevenue" :baseRooms="total.stlyRooms" :format="fmtMoney" /></td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, h, ref } from 'vue'
import { formatMoney } from '@/lib/money'
import { aggregatePaceByPeriod, aggregatePaceTotal, computeAdr, pctDelta, type PaceGranularity, type PacePeriod, type Quantified } from '@/lib/rmsAggregate'
import type { RmsPaceRow } from '@/types/rms'

const props = defineProps<{ rows: RmsPaceRow[] }>()

const fmtMoney = (n: number) => formatMoney(n)
const fmtRooms = (n: number) => Math.round(n).toLocaleString('en-US')

const granularity = ref<PaceGranularity>('month')
const periods = computed(() => aggregatePaceByPeriod(props.rows, granularity.value))
const total = computed(() => aggregatePaceTotal(props.rows))

// ---- layout ----
const width = 720
const height = 260
const padL = 46
const padR = 46
const padT = 16
const padB = 30

function xForIndex(i: number): number {
  const slot = (width - padL - padR) / periods.value.length
  return padL + slot * (i + 0.5)
}

const roomsMax = computed(() => {
  const max = Math.max(0, ...periods.value.flatMap(p => [p.rooms.value, p.stlyRooms.value]))
  return max === 0 ? 1 : max * 1.15
})
function yRoomsFor(value: number): number {
  return height - padB - (value / roomsMax.value) * (height - padT - padB)
}

const adrPairs = computed(() => periods.value.map(p => ({ adr: computeAdr(p.revenue, p.rooms), comparisonAdr: computeAdr(p.stlyRevenue, p.stlyRooms) })))
const adrMax = computed(() => {
  const values = adrPairs.value.flatMap(p => [p.adr?.value, p.comparisonAdr?.value]).filter((v): v is number => v != null)
  const max = Math.max(0, ...values)
  return max === 0 ? 1 : max * 1.2
})
function yAdrFor(value: number): number {
  return height - padB - (value / adrMax.value) * (height - padT - padB)
}

function barPath(x: number, yTop: number, w: number, bottomY: number, radius = 3): string {
  const hgt = bottomY - yTop
  if (hgt <= 0.5) return ''
  const r = Math.min(radius, w / 2, hgt)
  return `M${x},${bottomY} L${x},${yTop + r} Q${x},${yTop} ${x + r},${yTop} L${x + w - r},${yTop} Q${x + w},${yTop} ${x + w},${yTop + r} L${x + w},${bottomY} Z`
}

const bars = computed(() => {
  const slot = (width - padL - padR) / Math.max(1, periods.value.length)
  const groupPad = Math.max(4, slot * 0.18)
  const gap = 2
  const barWidth = Math.min(24, (slot - groupPad * 2 - gap) / 2)
  const baseline = height - padB
  return periods.value.map((p, i) => {
    const center = xForIndex(i)
    const x0 = center - (barWidth * 2 + gap) / 2
    return {
      i,
      currentPath: barPath(x0, yRoomsFor(p.rooms.value), barWidth, baseline),
      comparisonPath: barPath(x0 + barWidth + gap, yRoomsFor(p.stlyRooms.value), barWidth, baseline)
    }
  })
})

function linePath(values: (number | null)[]): string {
  const segments: string[] = []
  let current: string[] = []
  values.forEach((v, i) => {
    if (v == null) {
      if (current.length) segments.push(current.join(' '))
      current = []
      return
    }
    const point = `${current.length === 0 ? 'M' : 'L'}${xForIndex(i)},${yAdrFor(v)}`
    current.push(point)
  })
  if (current.length) segments.push(current.join(' '))
  return segments.join(' ')
}

const adrLinePath = computed(() => linePath(adrPairs.value.map(p => p.adr?.value ?? null)))
const comparisonAdrLinePath = computed(() => linePath(adrPairs.value.map(p => p.comparisonAdr?.value ?? null)))
const adrPoints = computed(() =>
  adrPairs.value.flatMap((p, i) => (p.adr ? [{ x: xForIndex(i), y: yAdrFor(p.adr.value) }] : []))
)
const comparisonAdrPoints = computed(() =>
  adrPairs.value.flatMap((p, i) => (p.comparisonAdr ? [{ x: xForIndex(i), y: yAdrFor(p.comparisonAdr.value) }] : []))
)

const roomsGridLines = computed(() =>
  [0, 0.5, 1].map(s => ({ y: yRoomsFor(roomsMax.value * s), label: fmtRooms(roomsMax.value * s) }))
)
const adrGridLines = computed(() =>
  [0, 0.5, 1].map(s => ({ y: yAdrFor(adrMax.value * s), label: fmtMoney(adrMax.value * s) }))
)

// ---- hover ----
const hoverIndex = ref<number | null>(null)
const hovered = computed(() => {
  if (hoverIndex.value == null || !periods.value[hoverIndex.value]) return null
  const i = hoverIndex.value
  return {
    x: xForIndex(i),
    period: periods.value[i] as PacePeriod,
    adr: adrPairs.value[i]?.adr ?? null,
    comparisonAdr: adrPairs.value[i]?.comparisonAdr ?? null
  }
})

function onMove(e: MouseEvent): void {
  const svg = e.currentTarget as SVGSVGElement
  const rect = svg.getBoundingClientRect()
  const relX = ((e.clientX - rect.left) / rect.width) * width
  const slot = (width - padL - padR) / Math.max(1, periods.value.length)
  const i = Math.floor((relX - padL) / slot)
  hoverIndex.value = Math.min(Math.max(i, 0), periods.value.length - 1)
}

// ---- table cell renderers (value + "LY x" + signed delta%, matching the pace-report table shape) ----
const PeriodCell = (props: { value: Quantified; base: Quantified; format: (n: number) => string }) => {
  if (props.value.quality === 'unavailable') return h('span', { class: 'text-sm-faint' }, '—')
  const delta = pctDelta(props.value.value, props.base.value)
  return h('div', [
    h('span', { class: props.value.quality === 'estimated' ? 'italic text-sm-warn font-bold' : 'font-bold text-sm-ink dark:text-white' }, props.format(props.value.value)),
    h('div', { class: 'text-2xs text-sm-faint' }, [
      props.base.quality !== 'unavailable' ? `LY ${props.format(props.base.value)}` : 'LY —',
      delta != null ? h('span', { class: delta >= 0 ? 'text-sm-won ml-1' : 'text-sm-bad ml-1' }, `${delta >= 0 ? '+' : ''}${delta.toFixed(1)}%`) : null
    ])
  ])
}

const AdrCell = (props: { revenue: Quantified; rooms: Quantified; baseRevenue: Quantified; baseRooms: Quantified; format: (n: number) => string }) => {
  const adr = computeAdr(props.revenue, props.rooms)
  const baseAdr = computeAdr(props.baseRevenue, props.baseRooms)
  if (!adr) return h('span', { class: 'text-sm-faint' }, '—')
  const delta = baseAdr ? pctDelta(adr.value, baseAdr.value) : null
  return h('div', [
    h('span', { class: adr.quality === 'estimated' ? 'italic text-sm-warn font-bold' : 'font-bold text-sm-ink dark:text-white' }, props.format(adr.value)),
    h('div', { class: 'text-2xs text-sm-faint' }, [
      baseAdr ? `LY ${props.format(baseAdr.value)}` : 'LY —',
      delta != null ? h('span', { class: delta >= 0 ? 'text-sm-won ml-1' : 'text-sm-bad ml-1' }, `${delta >= 0 ? '+' : ''}${delta.toFixed(1)}%`) : null
    ])
  ])
}
</script>
