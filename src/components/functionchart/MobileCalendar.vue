<template>
  <div>
    <!-- Weekday header -->
    <div class="grid grid-cols-7">
      <div
        v-for="(w, i) in weekdayLabels"
        :key="'wd' + i"
        class="py-1.5 text-center text-[10px] font-medium uppercase tracking-wider text-sm-secondary"
      >
        {{ w }}
      </div>
    </div>

    <!-- Month grid -->
    <div class="overflow-hidden rounded-2xl border border-sm-line bg-sm-card dark:border-white/10 dark:bg-sm-card-dark">
      <div v-for="(week, wi) in mobileWeeks" :key="'wk' + wi" class="grid grid-cols-7">
        <button
          v-for="(cell, ci) in week"
          :key="'c' + wi + '-' + ci"
          type="button"
          :disabled="!cell"
          class="flex aspect-square flex-col items-center gap-1 border-b border-r border-gray-100 pt-1.5 dark:border-white/5"
          :class="cell && cell.isWeekend ? 'bg-sm-surface dark:bg-white/[0.03]' : ''"
          @click="cell && $emit('update:selectedDay', cell.date)"
        >
          <template v-if="cell">
            <span
              class="flex h-7 w-7 items-center justify-center rounded-full text-[13px] font-normal"
              :class="
                cell.date === selectedDay
                  ? 'bg-sm-ink text-white dark:bg-white dark:text-sm-ink'
                  : cell.isToday
                    ? 'text-sm-primary'
                    : 'text-gray-900 dark:text-white'
              "
            >
              {{ cell.num }}
            </span>
            <div class="flex gap-0.5">
              <span v-for="(dot, di) in cell.dots" :key="di" class="h-1.5 w-1.5 rounded-full" :class="dot"></span>
            </div>
          </template>
        </button>
      </div>
    </div>

    <!-- Selected day agenda -->
    <div class="mt-4">
      <div class="mb-2 flex items-center justify-between">
        <div class="text-sm font-semibold text-gray-900 dark:text-white">{{ selectedDayLabel }}</div>
        <button
          v-if="canCreate"
          type="button"
          class="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-sm-primary hover:bg-sm-primary/10"
          @click="$emit('create', { startDate: selectedDay, endDate: selectedDay })"
        >
          <PlusIcon class="h-4 w-4" /> New
        </button>
      </div>

      <div v-if="selectedDayBookings.length" class="flex flex-col gap-2">
        <button
          v-for="b in selectedDayBookings"
          :key="b.id"
          type="button"
          class="flex flex-col gap-1 rounded-xl border border-l-[3px] px-3.5 py-3 text-left"
          :class="[STATUS_STYLE[b.status].block, conflictIds.has(b.id) ? 'ring-2 ring-red-500 dark:ring-red-400' : '']"
          @click="$emit('edit', b)"
        >
          <div class="flex items-start justify-between gap-2">
            <div class="flex min-w-0 items-center gap-1.5">
              <ExclamationTriangleIcon
                v-if="conflictIds.has(b.id)"
                class="h-4 w-4 shrink-0 text-red-600 dark:text-red-400"
              />
              <div class="text-[14px] font-semibold leading-tight">{{ b.eventName || '(untitled)' }}</div>
            </div>
            <span class="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium" :class="STATUS_STYLE[b.status].chip">{{
              STATUS_META[b.status].label
            }}</span>
          </div>
          <div class="text-[12px] font-medium uppercase tracking-wide opacity-80">{{ comboName(b.venues) }}</div>
          <div class="flex items-center gap-1.5 text-[11px] font-normal opacity-70">
            <span v-if="b.pax">{{ b.pax }} pax</span>
            <span v-if="b.pax && b.salesOwner">·</span>
            <span v-if="b.salesOwner">{{ b.salesOwner }}</span>
          </div>
        </button>
      </div>
      <div
        v-else
        class="rounded-2xl border border-dashed border-sm-line py-10 text-center text-sm text-sm-secondary dark:border-white/10"
      >
        No functions this day
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import { PlusIcon, ExclamationTriangleIcon } from '@heroicons/vue/24/outline'
import { comboName } from '@/lib/functionChartVenues'
import { STATUS_META, STATUS_STYLE } from '@/types/functionChart'
import type { FunctionBooking } from '@/types/functionChart'
import type { DayCol } from '@/composables/functionChart/useFunctionGrid'

const props = defineProps<{
  functions: FunctionBooking[]
  days: DayCol[]
  matches: (f: FunctionBooking) => boolean
  conflictIds: Set<string>
  canCreate: boolean
  selectedDay: string
}>()

const emit = defineEmits<{
  'update:selectedDay': [date: string]
  create: [defaults: { startDate: string; endDate: string }]
  edit: [booking: FunctionBooking]
}>()

const weekdayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

// Matching bookings that touch each day of the visible month.
const dayBookings = computed(() => {
  const map = new Map<string, FunctionBooking[]>()
  for (const d of props.days) map.set(d.date, [])
  const start = props.days[0]?.date ?? ''
  const end = props.days[props.days.length - 1]?.date ?? ''
  for (const f of props.functions) {
    if (f.endDate < start || f.startDate > end) continue
    if (!props.matches(f)) continue
    for (const d of props.days) {
      if (f.startDate <= d.date && f.endDate >= d.date) map.get(d.date)!.push(f)
    }
  }
  return map
})

type MobileCell = { date: string; num: string; isToday: boolean; isWeekend: boolean; count: number; dots: string[] }

// Weeks of the month, padded with nulls so each row has 7 cells (Sun–Sat).
const mobileWeeks = computed(() => {
  const first = props.days[0]?.date
  const cells: (MobileCell | null)[] = []
  if (first) {
    const startDow = new Date(first + 'T00:00:00Z').getUTCDay()
    for (let i = 0; i < startDow; i++) cells.push(null)
    for (const d of props.days) {
      const bks = dayBookings.value.get(d.date) ?? []
      const dots = [...new Set(bks.map((b) => b.status))].slice(0, 3).map((s) => STATUS_STYLE[s].dot)
      cells.push({ date: d.date, num: d.num, isToday: d.isToday, isWeekend: d.isWeekend, count: bks.length, dots })
    }
    while (cells.length % 7 !== 0) cells.push(null)
  }
  const weeks: (MobileCell | null)[][] = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))
  return weeks
})

// Keep the selected day inside the visible month (defaults to today, else the 1st).
watch(
  () => props.days,
  () => {
    const month = props.days[0]?.date.slice(0, 7)
    if (!month) return
    if (props.selectedDay.slice(0, 7) !== month) {
      emit('update:selectedDay', props.days.find((d) => d.isToday)?.date ?? props.days[0]!.date)
    }
  },
  { immediate: true }
)

const selectedDayBookings = computed(() => dayBookings.value.get(props.selectedDay) ?? [])
const selectedDayLabel = computed(() =>
  props.selectedDay
    ? new Date(props.selectedDay + 'T00:00:00Z').toLocaleDateString('en-GB', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        timeZone: 'UTC'
      })
    : ''
)
</script>
