<template>
  <SmPage max-width="full" with-bottom-nav-padding>
    <!-- Header -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-4">
      <div class="flex flex-col gap-0.5">
        <div class="text-[11px] font-semibold uppercase tracking-[0.14em] text-sm-secondary">
          The Anvaya Bali · Sales &amp; Events
        </div>
        <h1 class="m-0 text-2xl font-extrabold tracking-tight text-gray-900 dark:text-white">
          Function Charting {{ year }}
        </h1>
      </div>
      <div class="flex items-center gap-2.5">
        <div class="w-52">
          <SmInput v-model="q" size="sm" placeholder="Search event, company or owner" />
        </div>
        <div class="w-36">
          <SmSelect v-model="statusFilter" size="sm" :options="statusFilterOptions" />
        </div>
        <button
          class="flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-sm-primary px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
          @click="openCreate()"
        >
          <PlusIcon class="w-4 h-4" /> New
        </button>
      </div>
    </div>

    <!-- Month tabs + stats -->
    <div class="flex flex-wrap items-center gap-2 border-b border-gray-200 dark:border-white/10 pb-2 mb-3">
      <button
        v-for="(label, i) in monthLabels"
        :key="label"
        @click="monthIndex = i"
        class="cursor-pointer rounded-lg px-3.5 py-2 text-xs font-bold tracking-wide transition-colors"
        :class="
          i === monthIndex
            ? 'bg-sm-primary text-white'
            : 'text-sm-secondary hover:bg-gray-100 dark:hover:bg-white/5'
        "
      >
        {{ label }}
      </button>
      <div class="flex-1"></div>
      <div class="flex gap-4 whitespace-nowrap px-1 text-[11px] font-semibold tracking-wide text-sm-secondary">
        <span>{{ stats.functions }} functions</span>
        <span>{{ stats.venues }} venues booked</span>
        <span>{{ stats.occupancy }} slot use</span>
      </div>
    </div>

    <!-- Status legend -->
    <div class="mb-3 flex flex-wrap items-center gap-4">
      <div v-for="s in statuses" :key="s.value" class="flex items-center gap-1.5">
        <span class="h-3 w-3 rounded-sm" :class="s.dot"></span>
        <span class="text-[11px] font-semibold text-sm-secondary">{{ s.label }}</span>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="store.loading || store.seeding" class="py-16 text-center text-sm text-sm-secondary">
      {{ store.seeding ? 'Importing existing bookings…' : 'Loading…' }}
    </div>

    <div v-else class="flex min-h-0 gap-4">
      <!-- Scrollable grid -->
      <div
        class="flex-1 overflow-auto rounded-2xl border border-gray-200 bg-sm-card dark:border-white/10 dark:bg-sm-card-dark"
        style="max-height: calc(100vh - 240px)"
      >
        <div :style="gridStyle">
          <!-- Corner -->
          <div
            class="sticky left-0 top-0 z-30 flex items-end border-b border-r border-gray-200 bg-sm-card px-3.5 py-2.5 text-[10px] font-bold uppercase tracking-widest text-sm-secondary dark:border-white/10 dark:bg-sm-card-dark"
            style="grid-row: 1; grid-column: 1"
          >
            Function
          </div>

          <!-- Day headers -->
          <div
            v-for="(d, i) in days"
            :key="'h' + d.date"
            class="sticky top-0 z-20 flex flex-col gap-px border-b border-r border-gray-200 px-3 pb-[7px] pt-2 dark:border-white/10"
            :class="d.isWeekend ? 'bg-gray-100 dark:bg-white/5' : 'bg-sm-card dark:bg-sm-card-dark'"
            :style="{ gridRow: 1, gridColumn: i + 2, boxShadow: d.isToday ? 'inset 0 -2px 0 #0066CC' : undefined }"
          >
            <span class="text-[10px] font-bold uppercase tracking-wider text-sm-secondary">{{ d.dow }}</span>
            <span
              class="text-[17px] font-extrabold tracking-tight"
              :class="d.isToday ? 'text-sm-primary' : 'text-gray-900 dark:text-white'"
              >{{ d.num }}</span
            >
          </div>

          <!-- Lines -->
          <template v-for="line in lines" :key="line.key">
            <div
              v-if="line.kind === 'cat'"
              class="sticky left-0 z-[12] flex h-[30px] items-center border-y border-gray-200 bg-gray-100 px-3.5 text-[10px] font-bold uppercase tracking-widest text-sm-secondary dark:border-white/10 dark:bg-white/5"
              :style="{ gridColumn: '1 / -1', gridRow: line.row }"
            >
              {{ line.label }}
            </div>

            <template v-else>
              <!-- Venue name cell -->
              <div
                class="sticky left-0 z-[14] flex items-center justify-between gap-2 border-b border-r border-gray-100 bg-sm-card px-3.5 text-[12.5px] font-bold text-gray-800 dark:border-white/5 dark:bg-sm-card-dark dark:text-gray-100"
                :style="{ gridColumn: 1, gridRow: line.row, minHeight: rowH + 'px' }"
              >
                <span>{{ line.label }}</span>
                <span v-if="line.count" class="text-[10px] font-semibold text-sm-secondary">{{ line.count }}</span>
              </div>

              <!-- Background day cells (click to create) -->
              <div
                v-for="(d, i) in days"
                :key="line.key + 'bg' + i"
                class="cursor-pointer border-b border-r border-gray-100 hover:bg-sm-primary/5 dark:border-white/5"
                :class="d.isWeekend ? 'bg-gray-50 dark:bg-white/[0.03]' : ''"
                :style="{ gridColumn: i + 2, gridRow: line.row, minHeight: rowH + 'px' }"
                @click="openCreate({ venues: [line.label], startDate: d.date, endDate: d.date })"
              ></div>
            </template>
          </template>

          <!-- Booking blocks (each positioned once; spans day columns × occupied rooms/rows) -->
          <div
            v-for="b in bookingBlocks"
            :key="b.key"
            @click="openEdit(b.booking)"
            :title="b.title"
            class="z-10 m-[3px] flex cursor-pointer flex-col justify-center gap-0.5 overflow-hidden rounded-[7px] border-l-[3px] px-2.5 py-1.5 transition-all"
            :class="[b.blockClass, b.on ? '' : 'opacity-30', selectedId === b.key ? 'ring-2 ring-gray-900 dark:ring-white' : '']"
            :style="{
              gridColumn: b.colStart + ' / span ' + b.colSpan,
              gridRow: b.rowStart + ' / span ' + b.rowSpan
            }"
          >
            <div class="line-clamp-2 text-[12px] font-bold leading-[1.25]">{{ b.title }}</div>
            <div class="flex items-center gap-1.5 text-[10px] font-semibold opacity-75">
              <span v-if="b.pax">{{ b.pax }} pax</span>
              <span v-if="b.owner">{{ b.owner }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Editable side panel -->
      <aside
        v-if="panelOpen"
        class="flex w-[400px] flex-none flex-col overflow-auto rounded-2xl border border-gray-200 bg-sm-card dark:border-white/10 dark:bg-sm-card-dark"
        style="max-height: calc(100vh - 240px)"
      >
        <div class="flex items-center justify-between gap-3 border-b border-gray-100 px-4 py-3 dark:border-white/5">
          <div class="min-w-0 truncate text-[10px] font-bold uppercase tracking-widest text-sm-secondary">
            {{ editing ? comboName(editing.venues) : 'New Function' }}
          </div>
          <div class="flex shrink-0 items-center gap-1">
            <button
              v-if="editing"
              type="button"
              title="Delete"
              aria-label="Delete function"
              class="rounded-full p-2 text-red-500 transition-colors hover:bg-red-50 dark:hover:bg-red-900/20"
              @click="onDelete"
            >
              <TrashIcon class="w-5 h-5" />
            </button>
            <button
              type="button"
              title="Cancel"
              aria-label="Cancel"
              class="rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-white/5 dark:hover:text-gray-200"
              @click="closePanel"
            >
              <XMarkIcon class="w-5 h-5" />
            </button>
            <button
              form="function-form"
              type="submit"
              :disabled="saving"
              :title="editing ? 'Save' : 'Create'"
              aria-label="Save function"
              class="rounded-full bg-sm-primary p-2 text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
            >
              <svg v-if="saving" class="h-5 w-5 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
              </svg>
              <CheckIcon v-else class="w-5 h-5" />
            </button>
          </div>
        </div>

        <!-- Editable form -->
        <div class="px-5 py-4">
          <FunctionForm :key="formKey" :booking="editing" :defaults="createDefaults" @submit="onSubmit" />
        </div>

        <!-- Same-event context (existing bookings only) -->
        <div v-if="editing" class="flex flex-col gap-4 border-t border-gray-100 px-5 py-4 dark:border-white/5">
          <div class="flex flex-col gap-1">
            <div class="text-[10px] font-bold uppercase tracking-widest text-sm-secondary">Duration</div>
            <div class="text-sm text-gray-900 dark:text-white">{{ durationLabel }}</div>
          </div>
          <div v-if="sameDay.length" class="flex flex-col gap-1.5">
            <div class="text-[10px] font-bold uppercase tracking-widest text-sm-secondary">Same day, other venues</div>
            <div
              v-for="(s, i) in sameDay"
              :key="i"
              class="flex items-baseline gap-2 border-b border-gray-100 py-1.5 text-[12.5px] dark:border-white/5"
            >
              <span class="min-w-[92px] text-[10px] font-bold uppercase tracking-wide text-sm-secondary">{{ s.venue }}</span>
              <span class="text-gray-700 dark:text-gray-200">{{ s.title }}</span>
            </div>
          </div>
        </div>

      </aside>
    </div>
  </SmPage>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { PlusIcon, TrashIcon, XMarkIcon, CheckIcon } from '@heroicons/vue/24/outline'
import SmPage from '@/components/ui/SmPage.vue'
import SmInput from '@/components/ui/SmInput.vue'
import SmSelect from '@/components/ui/SmSelect.vue'
import FunctionForm from '@/components/functionchart/FunctionForm.vue'
import { useFunctionChartStore } from '@/stores/functionChart'
import { VENUE_STRUCTURE, canonicalVenue, comboName } from '@/lib/functionChartVenues'
import { FUNCTION_STATUSES, STATUS_META, STATUS_STYLE } from '@/types/functionChart'
import type { FunctionBooking, NewFunctionBooking } from '@/types/functionChart'

const store = useFunctionChartStore()

const year = 2026
const rowH = 44
const colW = 158
const nameW = 214

const monthIndex = ref(7) // August
const q = ref('')
const statusFilter = ref<string>('ALL')

// Panel state
const editing = ref<FunctionBooking | null>(null)
const creating = ref(false)
const createDefaults = ref<Partial<NewFunctionBooking> | null>(null)
const createSeq = ref(0)
const saving = ref(false)

const panelOpen = computed(() => creating.value || editing.value !== null)
const selectedId = computed(() => editing.value?.id ?? '')
const formKey = computed(() => (editing.value ? 'edit-' + editing.value.id : 'new-' + createSeq.value))

onMounted(async () => {
  await store.loadFunctions()
  if (store.functions.length === 0) {
    await store.importSeedFunctions() // fresh: already seeds the new `venues` shape
  } else {
    await store.normalizeVenues() // existing data: upgrade any legacy `venue` docs
  }
})

const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const DOW = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']

const statuses = FUNCTION_STATUSES.map((s) => ({ value: s, label: STATUS_META[s].label, dot: STATUS_STYLE[s].dot }))
const statusFilterOptions = [{ value: 'ALL', label: 'All status' }, ...statuses.map((s) => ({ value: s.value, label: s.label }))]

const todayISO = new Date().toISOString().slice(0, 10)

const days = computed(() => {
  const m = monthIndex.value
  const count = new Date(year, m + 1, 0).getDate()
  const mm = String(m + 1).padStart(2, '0')
  const out = []
  for (let day = 1; day <= count; day++) {
    const date = `${year}-${mm}-${String(day).padStart(2, '0')}`
    const dow = new Date(year, m, day).getDay()
    out.push({ date, num: String(day), dow: DOW[dow], isWeekend: dow === 0 || dow === 6, isToday: date === todayISO })
  }
  return out
})

const monthStart = computed(() => days.value[0]!.date)
const monthEnd = computed(() => days.value[days.value.length - 1]!.date)

const gridStyle = computed(
  () =>
    `display:grid;grid-template-columns:${nameW}px repeat(${days.value.length},${colW}px);` +
    `grid-auto-rows:minmax(${rowH}px,auto);align-items:stretch;width:max-content;min-width:100%`
)

function matches(f: FunctionBooking): boolean {
  const query = q.value.trim().toLowerCase()
  const hay = (f.eventName + ' ' + f.company + ' ' + f.salesOwner + ' ' + f.venues.join(' ')).toLowerCase()
  return (!query || hay.indexOf(query) >= 0) && (statusFilter.value === 'ALL' || f.status === statusFilter.value)
}

// Bookings that touch the visible month, indexed by each room they occupy (a
// combined booking appears under every one of its rooms — used for per-row counts + stats).
const byVenue = computed(() => {
  const map = new Map<string, FunctionBooking[]>()
  for (const f of store.functions) {
    if (f.endDate < monthStart.value || f.startDate > monthEnd.value) continue
    for (const raw of f.venues) {
      const v = canonicalVenue(raw) ?? raw
      const arr = map.get(v) ?? map.set(v, []).get(v)!
      arr.push(f)
    }
  }
  return map
})

function dayNum(dateStr: string): number {
  return parseInt(dateStr.slice(8, 10), 10) - 1
}

// Grid row number for each venue (matches its position in VENUE_STRUCTURE + header offset).
const rowByVenue = new Map<string, number>()
VENUE_STRUCTURE.forEach((row, li) => {
  if (row.type === 'venue') rowByVenue.set(row.label, li + 2)
})

// Row scaffolding: category headers + venue name cells (+ per-venue booking count).
const lines = computed(() =>
  VENUE_STRUCTURE.map((row, li) => {
    const gridRow = li + 2
    if (row.type === 'cat') {
      return { kind: 'cat' as const, key: 'cat' + li, label: row.label, row: gridRow }
    }
    const count = byVenue.value.get(row.label)?.length ?? 0
    return {
      kind: 'venue' as const,
      key: 'v' + li,
      label: row.label,
      row: gridRow,
      count: count ? String(count) : ''
    }
  })
)

// Booking blocks, positioned once each. A block spans its day range (columns) and,
// for a combined booking, the contiguous rooms it occupies (rows).
const bookingBlocks = computed(() => {
  const lastIdx = days.value.length - 1
  const out = []
  for (const f of store.functions) {
    if (f.endDate < monthStart.value || f.startDate > monthEnd.value) continue
    const rows = f.venues
      .map((v) => rowByVenue.get(canonicalVenue(v) ?? v))
      .filter((r): r is number => r != null)
    if (!rows.length) continue
    const rowStart = Math.min(...rows)
    const rowEnd = Math.max(...rows)
    const start = f.startDate <= monthStart.value ? 0 : dayNum(f.startDate)
    const end = f.endDate >= monthEnd.value ? lastIdx : dayNum(f.endDate)
    out.push({
      key: f.id,
      title: f.eventName || '(untitled)',
      pax: f.pax || 0,
      owner: f.salesOwner,
      blockClass: STATUS_STYLE[f.status].block,
      on: matches(f),
      colStart: start + 2,
      colSpan: end - start + 1,
      rowStart,
      rowSpan: rowEnd - rowStart + 1,
      booking: f
    })
  }
  return out
})

const stats = computed(() => {
  let slots = 0
  const venues = new Set<string>()
  const seen = new Set<string>() // dedupe combined bookings across their rooms
  for (const [venue, bookings] of byVenue.value) {
    for (const f of bookings) {
      if (!matches(f)) continue
      venues.add(venue)
      seen.add(f.id)
      // Each room-row contributes its own day span to slot usage.
      const start = f.startDate <= monthStart.value ? 0 : dayNum(f.startDate)
      const end = f.endDate >= monthEnd.value ? days.value.length - 1 : dayNum(f.endDate)
      slots += end - start + 1
    }
  }
  const functions = seen.size
  const denom = days.value.length * VENUE_STRUCTURE.filter((r) => r.type === 'venue').length
  return {
    functions: String(functions),
    venues: String(venues.size),
    occupancy: (denom ? Math.round((100 * slots) / denom) : 0) + '%'
  }
})

// ---- Side-panel context (editing an existing booking) ----
function fmt(iso: string): string {
  return new Date(iso + 'T00:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
}

const durationLabel = computed(() => {
  const b = editing.value
  if (!b) return ''
  const span = dayCount(b.startDate, b.endDate)
  return span > 1 ? `${fmt(b.startDate)} – ${fmt(b.endDate)} · ${span} consecutive days` : `${fmt(b.startDate)} · single day`
})

function dayCount(start: string, end: string): number {
  const a = new Date(start + 'T00:00:00Z').getTime()
  const b = new Date(end + 'T00:00:00Z').getTime()
  return Math.max(1, Math.round((b - a) / 86400000) + 1)
}

const sameDay = computed(() => {
  const b = editing.value
  if (!b) return []
  const day = b.startDate
  const out: { venue: string; title: string }[] = []
  for (const f of store.functions) {
    if (f.id === b.id) continue
    if (f.startDate <= day && f.endDate >= day) out.push({ venue: comboName(f.venues), title: f.eventName })
  }
  return out.slice(0, 12)
})

// ---- Panel actions ----
function openCreate(defaults?: Partial<NewFunctionBooking>) {
  editing.value = null
  createDefaults.value = defaults ?? null
  creating.value = true
  createSeq.value++
}
function openEdit(booking: FunctionBooking) {
  creating.value = false
  createDefaults.value = null
  editing.value = booking
}
function closePanel() {
  creating.value = false
  editing.value = null
  createDefaults.value = null
}

async function onSubmit(payload: NewFunctionBooking) {
  saving.value = true
  try {
    if (editing.value) await store.updateFunction(editing.value.id, payload)
    else await store.createFunction(payload)
    closePanel()
  } catch {
    // store surfaces the error; keep the panel open for retry
  } finally {
    saving.value = false
  }
}

async function onDelete() {
  if (!editing.value) return
  if (!window.confirm('Delete this function?')) return
  saving.value = true
  try {
    await store.deleteFunction(editing.value.id)
    closePanel()
  } finally {
    saving.value = false
  }
}
</script>
