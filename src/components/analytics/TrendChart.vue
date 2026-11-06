
<!--
  Single-series date trend (revenue or rooms — one axis, never dual). Null/unavailable
  points break the line into a gap rather than drawing a fabricated zero; estimated
  points get a hollow ring marker so reconstructed days are visually distinct.
-->
<template>
  <div class="relative">
    <svg
      :viewBox="`0 0 ${width} ${height}`"
      class="w-full"
      :style="{ height: `${height}px` }"
      preserveAspectRatio="none"
      @mousemove="onMove"
      @mouseleave="hoverIndex = null"
    >
      <!-- gridlines -->
      <line
        v-for="g in gridLines"
        :key="g.y"
        :x1="padL"
        :x2="width - padR"
        :y1="g.y"
        :y2="g.y"
        class="stroke-sm-line dark:stroke-white/10"
        stroke-width="1"
      />
      <text
        v-for="g in gridLines"
        :key="`t-${g.y}`"
        :x="padL - 6"
        :y="g.y"
        text-anchor="end"
        dominant-baseline="middle"
        class="fill-sm-faint text-[9px]"
      >{{ g.label }}</text>

      <!-- area + line segments (split at gaps) -->
      <template v-for="(seg, i) in segments" :key="i">
        <path :d="seg.area" fill="#0066CC" opacity="0.1" stroke="none" />
        <path :d="seg.line" fill="none" stroke="#0066CC" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
      </template>

      <!-- estimated-day markers: hollow ring -->
      <circle
        v-for="(p, i) in markerPoints"
        :key="i"
        :cx="p.x"
        :cy="p.y"
        r="4"
        fill="white"
        class="dark:fill-sm-card-dark"
        stroke="#C77700"
        stroke-width="2"
      />

      <!-- end-dot -->
      <circle v-if="lastPoint" :cx="lastPoint.x" :cy="lastPoint.y" r="4" fill="#0066CC" stroke="white" stroke-width="2" class="dark:stroke-sm-card-dark" />
      <text v-if="lastPoint" :x="lastPoint.x" :y="lastPoint.y - 10" text-anchor="end" class="fill-sm-ink dark:fill-white text-[11px] font-bold">
        {{ format(lastPoint.value) }}
      </text>

      <!-- hover crosshair -->
      <line
        v-if="hoverPoint"
        :x1="hoverPoint.x"
        :x2="hoverPoint.x"
        :y1="padT"
        :y2="height - padB"
        class="stroke-sm-ink/30 dark:stroke-white/30"
        stroke-width="1"
      />
      <circle v-if="hoverPoint && hoverPoint.y != null" :cx="hoverPoint.x" :cy="hoverPoint.y" r="4" fill="#0066CC" stroke="white" stroke-width="2" class="dark:stroke-sm-card-dark" />

      <!-- wide invisible hit layer for pointer tracking -->
      <rect :x="padL" :y="padT" :width="width - padL - padR" :height="height - padT - padB" fill="transparent" />
    </svg>

    <div
      v-if="hoverPoint"
      class="absolute pointer-events-none rounded-md bg-sm-ink dark:bg-white text-white dark:text-sm-ink px-2.5 py-1.5 text-xs shadow-lg -translate-x-1/2"
      :style="{ left: `${(hoverPoint.x / width) * 100}%`, top: '0px' }"
    >
      <p class="font-bold whitespace-nowrap">{{ formatShortDate(hoverPoint.date) }}</p>
      <p class="whitespace-nowrap">
        <span class="font-extrabold">{{ hoverPoint.value == null ? '—' : format(hoverPoint.value) }}</span>
        <span v-if="hoverPoint.quality === 'estimated'" class="ml-1 opacity-75">(estimated)</span>
      </p>
    </div>

    <p v-if="hasEstimated" class="mt-2 text-2xs text-sm-faint flex items-center gap-1.5">
      <span class="inline-block w-2 h-2 rounded-full border-2" style="border-color: #C77700" />
      Estimated — reconstructed before the booking cache existed
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { formatShortDate } from '@/lib/dateFormat'
import type { RmsQuality } from '@/types/rms'

export interface TrendChartPoint {
  date: string
  value: number | null
  quality: RmsQuality
}

const props = defineProps<{
  points: TrendChartPoint[]
  format?: (n: number) => string
}>()

const format = (n: number) => (props.format ? props.format(n) : String(Math.round(n)))

const width = 640
const height = 200
const padL = 44
const padR = 12
const padT = 16
const padB = 20

const usable = computed(() => props.points.filter(p => p.quality !== 'unavailable' && p.value != null))

const yMax = computed(() => {
  const max = Math.max(0, ...usable.value.map(p => p.value as number))
  return max === 0 ? 1 : max * 1.15
})

function xFor(i: number): number {
  const n = Math.max(1, props.points.length - 1)
  return padL + (i / n) * (width - padL - padR)
}
function yFor(value: number): number {
  return height - padB - (value / yMax.value) * (height - padT - padB)
}

const plotted = computed(() =>
  props.points.map((p, i) => ({
    x: xFor(i),
    y: p.value != null ? yFor(p.value) : null,
    value: p.value,
    quality: p.quality,
    date: p.date
  }))
)

/** Contiguous (non-gap) runs become their own <path>, so a missing day breaks the line instead of interpolating a fake value across it. */
const segments = computed(() => {
  const runs: { x: number; y: number }[][] = []
  let current: { x: number; y: number }[] = []
  for (const p of plotted.value) {
    if (p.y == null) {
      if (current.length) runs.push(current)
      current = []
    } else {
      current.push({ x: p.x, y: p.y })
    }
  }
  if (current.length) runs.push(current)

  const baseline = height - padB
  return runs.map(run => {
    const first = run[0] as { x: number; y: number }
    const last = run[run.length - 1] as { x: number; y: number }
    const line = run.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ')
    const area = `M${first.x},${baseline} ` + run.map(p => `L${p.x},${p.y}`).join(' ') + ` L${last.x},${baseline} Z`
    return { line, area }
  })
})

// y is derived from value (null iff value is null), so narrowing y also narrows value.
function hasY<P extends { y: number | null; value: number | null }>(p: P): p is P & { y: number; value: number } {
  return p.y != null
}

const markerPoints = computed(() => plotted.value.filter(p => p.quality === 'estimated').filter(hasY))
const hasEstimated = computed(() => markerPoints.value.length > 0)
const lastPoint = computed(() => {
  const withValue = plotted.value.filter(hasY)
  return withValue.length ? withValue[withValue.length - 1] : null
})

const gridLines = computed(() => {
  const steps = [0, 0.5, 1]
  return steps.map(s => ({
    y: yFor(yMax.value * s),
    label: format(yMax.value * s)
  }))
})

const hoverIndex = ref<number | null>(null)
const hoverPoint = computed(() => (hoverIndex.value == null ? null : plotted.value[hoverIndex.value]))

function onMove(e: MouseEvent): void {
  const svg = e.currentTarget as SVGSVGElement
  const rect = svg.getBoundingClientRect()
  const relX = ((e.clientX - rect.left) / rect.width) * width
  const n = Math.max(1, props.points.length - 1)
  const i = Math.round(((relX - padL) / (width - padL - padR)) * n)
  hoverIndex.value = Math.min(Math.max(i, 0), props.points.length - 1)
}
</script>
