<template>
  <SmPage max-width="full" with-bottom-nav-padding>
    <!-- Header -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-4">
      <div class="flex flex-col gap-0.5">
        <div class="text-[11px] font-semibold uppercase tracking-[0.14em] text-sm-secondary">
          The Anvaya Bali · Sales &amp; Events
        </div>
        <div class="flex items-center gap-2">
          <h1 class="m-0 text-2xl font-extrabold tracking-tight text-gray-900 dark:text-white">Function Charting</h1>
          <div class="flex items-center gap-1">
            <button
              type="button"
              aria-label="Previous year"
              class="rounded-md p-1 text-sm-secondary transition-colors hover:bg-gray-100 dark:hover:bg-white/5"
              @click="year--"
            >
              <ChevronLeftIcon class="h-5 w-5" />
            </button>
            <span class="min-w-[3.5ch] text-center text-2xl font-extrabold tracking-tight text-gray-900 dark:text-white">{{ year }}</span>
            <button
              type="button"
              aria-label="Next year"
              class="rounded-md p-1 text-sm-secondary transition-colors hover:bg-gray-100 dark:hover:bg-white/5"
              @click="year++"
            >
              <ChevronRightIcon class="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
      <div class="flex items-center gap-2.5">
        <div class="flex-1 sm:w-52 sm:flex-none">
          <SmInput v-model="q" size="sm" placeholder="Search event, company or owner" />
        </div>
        <div class="w-32 shrink-0 sm:w-36">
          <SmSelect v-model="statusFilter" size="sm" :options="statusFilterOptions" />
        </div>
        <button
          v-if="canCreate"
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
      <div v-if="conflictIds.size" class="flex items-center gap-1.5">
        <ExclamationTriangleIcon class="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
        <span class="text-[11px] font-semibold text-red-600 dark:text-red-400"
          >{{ conflictIds.size }} double-booked</span
        >
      </div>
    </div>

    <!-- Loading -->
    <div v-if="store.loading || store.seeding" class="py-16 text-center text-sm text-sm-secondary">
      {{ store.seeding ? 'Importing existing bookings…' : 'Loading…' }}
    </div>

    <div v-else class="md:flex md:min-h-0 md:gap-4">
      <!-- Scrollable grid (desktop) -->
      <div
        class="hidden flex-1 overflow-auto rounded-2xl border border-gray-200 bg-sm-card dark:border-white/10 dark:bg-sm-card-dark md:block"
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

              <!-- Background day cells (click to create · drop target to reschedule) -->
              <div
                v-for="(d, i) in days"
                :key="line.key + 'bg' + i"
                class="cursor-pointer border-b border-r border-gray-100 hover:bg-sm-primary/5 dark:border-white/5"
                :class="[
                  d.isWeekend ? 'bg-gray-50 dark:bg-white/[0.03]' : '',
                  dragOverKey === line.key + '|' + d.date ? 'ring-2 ring-inset ring-sm-primary bg-sm-primary/10' : ''
                ]"
                :style="{ gridColumn: i + 2, gridRow: line.row, minHeight: rowH + 'px' }"
                @click="openCreate({ venues: [line.label], startDate: d.date, endDate: d.date })"
                @dragover.prevent="onCellDragOver(line, d)"
                @drop.prevent="onCellDrop(line, d)"
              ></div>
            </template>
          </template>

          <!-- Booking blocks (each positioned once; spans day columns × occupied rooms/rows) -->
          <div
            v-for="b in bookingBlocks"
            :key="b.key"
            :draggable="canEdit"
            @click="openEdit(b.booking)"
            @dragstart="onBlockDragStart($event, b)"
            @dragend="onBlockDragEnd"
            :title="canEdit ? b.title + ' — drag to reschedule' : b.title"
            class="relative z-10 m-[3px] flex flex-col justify-center gap-0.5 overflow-hidden rounded-[7px] border-l-[3px] px-2.5 py-1.5 transition-all"
            :class="[
              b.blockClass,
              b.on ? '' : 'opacity-30',
              selectedId === b.key
                ? 'ring-2 ring-gray-900 dark:ring-white'
                : b.conflict
                  ? 'ring-2 ring-red-500 dark:ring-red-400'
                  : '',
              canEdit ? 'cursor-move' : 'cursor-pointer',
              // Let cells beneath OTHER blocks receive the drop, but never disable
              // pointer-events on the drag source itself — Chrome aborts the drag if
              // the dragged element becomes pointer-events:none mid-drag.
              draggingId && draggingId !== b.key ? 'pointer-events-none' : '',
              draggingId === b.key ? 'opacity-50' : ''
            ]"
            :style="{
              gridColumn: b.colStart + ' / span ' + b.colSpan,
              gridRow: b.rowStart + ' / span ' + b.rowSpan
            }"
          >
            <div class="line-clamp-2 text-[12px] font-bold leading-[1.25]" :class="canEdit || b.conflict ? 'pr-5' : ''">
              {{ b.title }}
            </div>
            <div class="flex items-center gap-1.5 text-[10px] font-semibold opacity-75">
              <span v-if="b.pax">{{ b.pax }} pax</span>
              <span v-if="b.owner">{{ b.owner }}</span>
            </div>

            <!-- Corner controls: conflict flag + quick status change -->
            <div class="absolute right-1 top-1 flex items-center gap-1">
              <ExclamationTriangleIcon
                v-if="b.conflict"
                class="h-3.5 w-3.5 text-red-600 dark:text-red-400"
                title="Double-booked: another function shares this venue on overlapping dates"
              />
              <button
                v-if="canEdit"
                type="button"
                draggable="false"
                aria-label="Change status"
                title="Change status"
                class="flex items-center gap-[2px] rounded px-0.5 py-1 text-gray-400/70 transition-colors hover:text-gray-600 dark:text-gray-300/60 dark:hover:text-white"
                @click.stop="openStatusMenu($event, b)"
              >
                <span class="h-1 w-1 rounded-full bg-current"></span>
                <span class="h-1 w-1 rounded-full bg-current"></span>
                <span class="h-1 w-1 rounded-full bg-current"></span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Mobile calendar (iOS-style month grid + day agenda) -->
      <div class="md:hidden">
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
        <div class="overflow-hidden rounded-2xl border border-gray-200 bg-sm-card dark:border-white/10 dark:bg-sm-card-dark">
          <div v-for="(week, wi) in mobileWeeks" :key="'wk' + wi" class="grid grid-cols-7">
            <button
              v-for="(cell, ci) in week"
              :key="'c' + wi + '-' + ci"
              type="button"
              :disabled="!cell"
              class="flex aspect-square flex-col items-center gap-1 border-b border-r border-gray-100 pt-1.5 dark:border-white/5"
              :class="cell && cell.isWeekend ? 'bg-gray-50 dark:bg-white/[0.03]' : ''"
              @click="cell && (selectedDay = cell.date)"
            >
              <template v-if="cell">
                <span
                  class="flex h-7 w-7 items-center justify-center rounded-full text-[13px] font-normal"
                  :class="
                    cell.date === selectedDay
                      ? 'bg-sm-primary text-white'
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
              @click="openCreate({ startDate: selectedDay, endDate: selectedDay })"
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
              @click="openEdit(b)"
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
            class="rounded-2xl border border-dashed border-gray-200 py-10 text-center text-sm text-sm-secondary dark:border-white/10"
          >
            No functions this day
          </div>
        </div>
      </div>

      <!-- Editable panel: side panel on desktop, full-screen sheet on mobile -->
      <aside
        v-if="panelOpen"
        class="fixed inset-0 z-50 flex w-full flex-col overflow-auto bg-sm-card dark:bg-sm-card-dark md:static md:z-auto md:max-h-[calc(100vh-240px)] md:w-[400px] md:flex-none md:rounded-2xl md:border md:border-gray-200 md:dark:border-white/10"
      >
        <div class="flex items-center justify-between gap-3 border-b border-gray-100 px-4 py-3 dark:border-white/5">
          <div class="min-w-0 truncate text-[10px] font-bold uppercase tracking-widest text-sm-secondary">
            {{ editing ? comboName(editing.venues) : 'New Function' }}
          </div>
          <div class="flex shrink-0 items-center gap-1">
            <button
              v-if="editing && canDelete"
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

    <!-- Quick status picker (teleported so the grid's overflow can't clip it) -->
    <Teleport to="body">
      <div v-if="statusMenu" class="fixed inset-0 z-[60]" @click="statusMenu = null" @contextmenu.prevent="statusMenu = null">
        <div
          class="fixed z-[61] min-w-[150px] overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-xl dark:border-white/10 dark:bg-sm-card-dark"
          :style="{ left: statusMenu.x + 'px', top: statusMenu.y + 'px', transform: 'translateX(-100%)' }"
          @click.stop
        >
          <div class="px-3 pb-1 pt-0.5 text-[10px] font-bold uppercase tracking-widest text-sm-secondary">Set status</div>
          <button
            v-for="s in statuses"
            :key="s.value"
            type="button"
            class="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[13px] font-medium text-gray-800 transition-colors hover:bg-gray-100 dark:text-gray-100 dark:hover:bg-white/5"
            @click="setStatus(s.value)"
          >
            <span class="h-2.5 w-2.5 shrink-0 rounded-full" :class="s.dot"></span>
            <span class="flex-1">{{ s.label }}</span>
            <CheckIcon v-if="currentStatusOf(statusMenu.id) === s.value" class="h-4 w-4 text-sm-primary" />
          </button>
        </div>
      </div>
    </Teleport>

    <!-- Reschedule confirmation (also warns on venue/date conflicts) -->
    <ConfirmDialog
      :open="pendingMove !== null"
      :title="pendingMove?.conflicts.length ? 'Scheduling conflict' : 'Move function?'"
      :message="pendingMove?.message"
      :confirm-text="pendingMove?.conflicts.length ? 'Move anyway' : 'Move'"
      cancel-text="Cancel"
      :danger="!!pendingMove?.conflicts.length"
      :loading="moveSaving"
      @confirm="applyMove"
      @cancel="cancelMove"
    />
  </SmPage>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watchEffect } from 'vue'
import { PlusIcon, TrashIcon, XMarkIcon, CheckIcon, ChevronLeftIcon, ChevronRightIcon, ExclamationTriangleIcon } from '@heroicons/vue/24/outline'
import SmPage from '@/components/ui/SmPage.vue'
import SmInput from '@/components/ui/SmInput.vue'
import SmSelect from '@/components/ui/SmSelect.vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import FunctionForm from '@/components/functionchart/FunctionForm.vue'
import { useFunctionChartStore } from '@/stores/functionChart'
import { useSessionStore } from '@/stores/session'
import { usePermissionsStore } from '@/stores/permissions'
import { VENUE_STRUCTURE, canonicalVenue, comboName, isValidVenueSelection } from '@/lib/functionChartVenues'
import { FUNCTION_STATUSES, STATUS_META, STATUS_STYLE } from '@/types/functionChart'
import type { FunctionBooking, FunctionStatus, NewFunctionBooking } from '@/types/functionChart'

const store = useFunctionChartStore()
const session = useSessionStore()
const permissions = usePermissionsStore()

// Granular Function Chart permissions (client-side gating; this collection is
// PIN/public in firestore.rules, so these hide buttons rather than reject writes).
const canCreate = computed(() => permissions.has(session.currentUser, 'function:create'))
const canEdit = computed(() => permissions.has(session.currentUser, 'function:edit'))
const canDelete = computed(() => permissions.has(session.currentUser, 'function:delete'))

const year = ref(2026)
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
  const count = new Date(year.value, m + 1, 0).getDate()
  const mm = String(m + 1).padStart(2, '0')
  const out = []
  for (let day = 1; day <= count; day++) {
    const date = `${year.value}-${mm}-${String(day).padStart(2, '0')}`
    const dow = new Date(year.value, m, day).getDay()
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

// Ids of bookings that clash with another booking: same room (canonical venue) AND
// overlapping date range. Computed across ALL functions (a conflict can span months),
// so the marker is stable regardless of which month is in view.
const conflictIds = computed(() => {
  const byRoom = new Map<string, { id: string; start: string; end: string }[]>()
  for (const f of store.functions) {
    for (const raw of f.venues) {
      const v = canonicalVenue(raw) ?? raw
      const arr = byRoom.get(v) ?? byRoom.set(v, []).get(v)!
      arr.push({ id: f.id, start: f.startDate, end: f.endDate })
    }
  }
  const set = new Set<string>()
  for (const arr of byRoom.values()) {
    for (let i = 0; i < arr.length; i++) {
      for (let j = i + 1; j < arr.length; j++) {
        // Two ranges overlap when each starts on/before the other ends.
        if (arr[i]!.start <= arr[j]!.end && arr[j]!.start <= arr[i]!.end) {
          set.add(arr[i]!.id)
          set.add(arr[j]!.id)
        }
      }
    }
  }
  return set
})

// Grid row number for each venue (matches its position in VENUE_STRUCTURE + header offset).
const rowByVenue = new Map<string, number>()
const venueByRow = new Map<number, string>() // inverse: grid row -> venue label (skips category rows)
VENUE_STRUCTURE.forEach((row, li) => {
  if (row.type === 'venue') {
    rowByVenue.set(row.label, li + 2)
    venueByRow.set(li + 2, row.label)
  }
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
      status: f.status,
      on: matches(f),
      conflict: conflictIds.value.has(f.id),
      colStart: start + 2,
      colSpan: end - start + 1,
      rowStart,
      rowSpan: rowEnd - rowStart + 1,
      booking: f
    })
  }
  return out
})

// ---- Mobile calendar (iOS-style month grid + day agenda) ----
const weekdayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

// Matching bookings that touch each day of the visible month.
const dayBookings = computed(() => {
  const map = new Map<string, FunctionBooking[]>()
  for (const d of days.value) map.set(d.date, [])
  for (const f of store.functions) {
    if (f.endDate < monthStart.value || f.startDate > monthEnd.value) continue
    if (!matches(f)) continue
    for (const d of days.value) {
      if (f.startDate <= d.date && f.endDate >= d.date) map.get(d.date)!.push(f)
    }
  }
  return map
})

type MobileCell = { date: string; num: string; isToday: boolean; isWeekend: boolean; count: number; dots: string[] }

// Weeks of the month, padded with nulls so each row has 7 cells (Sun–Sat).
const mobileWeeks = computed(() => {
  const startDow = new Date(year.value, monthIndex.value, 1).getDay()
  const cells: (MobileCell | null)[] = []
  for (let i = 0; i < startDow; i++) cells.push(null)
  for (const d of days.value) {
    const bks = dayBookings.value.get(d.date) ?? []
    const dots = [...new Set(bks.map((b) => b.status))].slice(0, 3).map((s) => STATUS_STYLE[s].dot)
    cells.push({ date: d.date, num: d.num, isToday: d.isToday, isWeekend: d.isWeekend, count: bks.length, dots })
  }
  while (cells.length % 7 !== 0) cells.push(null)
  const weeks: (MobileCell | null)[][] = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))
  return weeks
})

const selectedDay = ref('')
// Keep the selected day inside the visible month (defaults to today, else the 1st).
watchEffect(() => {
  if (selectedDay.value.slice(0, 7) !== monthStart.value.slice(0, 7)) {
    selectedDay.value = days.value.find((d) => d.isToday)?.date ?? monthStart.value
  }
})

const selectedDayBookings = computed(() => dayBookings.value.get(selectedDay.value) ?? [])
const selectedDayLabel = computed(() =>
  selectedDay.value
    ? new Date(selectedDay.value + 'T00:00:00Z').toLocaleDateString('en-GB', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        timeZone: 'UTC'
      })
    : ''
)

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

// ---- Drag & drop rescheduling (desktop grid) ----
// Dragging a booking block onto a day/venue cell shifts the whole booking there,
// preserving its duration (day span) and room shape (number/adjacency of rooms).
// Gated behind `function:edit` — moving a booking is an edit.
const draggingId = ref('')
const dragOverKey = ref('')
let grabDayOffset = 0 // which day column within the block the pointer grabbed (0-based)
let grabRowOffset = 0 // which room row within the block the pointer grabbed (0-based)

function shiftISO(iso: string, days: number): string {
  return new Date(Date.parse(iso + 'T00:00:00Z') + days * 86400000).toISOString().slice(0, 10)
}
function diffDays(a: string, b: string): number {
  return Math.round((Date.parse(a + 'T00:00:00Z') - Date.parse(b + 'T00:00:00Z')) / 86400000)
}

// Shift every room of a booking by `rowDelta` grid rows. Returns null if any room
// would land out of bounds or on a category header row (keeps bookings on real venues).
function venuesForRowShift(f: FunctionBooking, rowDelta: number): string[] | null {
  if (rowDelta === 0) return [...f.venues]
  const out: string[] = []
  for (const v of f.venues) {
    const cur = rowByVenue.get(canonicalVenue(v) ?? v)
    if (cur == null) return null
    const label = venueByRow.get(cur + rowDelta)
    if (!label) return null
    out.push(label)
  }
  return out
}

function onBlockDragStart(e: DragEvent, b: { key: string; colSpan: number; rowSpan: number }) {
  if (!canEdit.value) {
    e.preventDefault()
    return
  }
  draggingId.value = b.key
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
  grabDayOffset = Math.min(b.colSpan - 1, Math.max(0, Math.floor((e.clientX - rect.left) / colW)))
  grabRowOffset = Math.min(b.rowSpan - 1, Math.max(0, Math.floor((e.clientY - rect.top) / rowH)))
  if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move'
}
function onBlockDragEnd() {
  draggingId.value = ''
  dragOverKey.value = ''
}
function onCellDragOver(line: { key: string }, d: { date: string }) {
  if (!draggingId.value) return
  dragOverKey.value = line.key + '|' + d.date
}
// A pending move stages the proposed change so it can be confirmed (and any
// conflicts surfaced) before writing — the block doesn't move until confirmed.
const pendingMove = ref<{
  id: string
  patch: { startDate: string; endDate: string; venues: string[] }
  message: string
  conflicts: FunctionBooking[]
} | null>(null)
const moveSaving = ref(false)

// Other bookings that share a venue AND overlap the proposed date range.
function findConflicts(id: string, venues: string[], start: string, end: string): FunctionBooking[] {
  const canon = new Set(venues.map((v) => canonicalVenue(v) ?? v))
  return store.functions.filter(
    (f) =>
      f.id !== id &&
      f.startDate <= end &&
      f.endDate >= start &&
      f.venues.some((v) => canon.has(canonicalVenue(v) ?? v))
  )
}

function onCellDrop(line: { row: number }, d: { date: string }) {
  const id = draggingId.value
  draggingId.value = ''
  dragOverKey.value = ''
  if (!id || !canEdit.value) return
  const f = store.functions.find((x) => x.id === id)
  if (!f) return

  const rows = f.venues
    .map((v) => rowByVenue.get(canonicalVenue(v) ?? v))
    .filter((r): r is number => r != null)
  if (!rows.length) return
  const rowStart = Math.min(...rows)

  // Map the grabbed cell of the block onto the drop cell.
  const newStart = shiftISO(d.date, -grabDayOffset)
  const dateDelta = diffDays(newStart, f.startDate)
  const rowDelta = line.row - (rowStart + grabRowOffset)
  if (dateDelta === 0 && rowDelta === 0) return

  const newVenues = venuesForRowShift(f, rowDelta)
  if (!newVenues) return // out of bounds or crosses a category header row
  if (newVenues.length > 1 && !isValidVenueSelection(newVenues)) return // broke a combo run

  const patch = {
    startDate: shiftISO(f.startDate, dateDelta),
    endDate: shiftISO(f.endDate, dateDelta),
    venues: newVenues
  }
  const conflicts = findConflicts(id, patch.venues, patch.startDate, patch.endDate)

  const venueLabel = comboName(patch.venues)
  const dateLabel = patch.startDate === patch.endDate ? fmt(patch.startDate) : `${fmt(patch.startDate)} – ${fmt(patch.endDate)}`
  let message = `Move “${f.eventName || '(untitled)'}” to ${venueLabel} on ${dateLabel}?`
  if (conflicts.length) {
    const names = conflicts
      .slice(0, 3)
      .map((c) => `${c.eventName || '(untitled)'} (${comboName(c.venues)})`)
      .join(', ')
    message =
      `${venueLabel} already has ${conflicts.length} booking${conflicts.length > 1 ? 's' : ''} on ${dateLabel}: ` +
      `${names}${conflicts.length > 3 ? '…' : ''}. Move here anyway?`
  }

  pendingMove.value = { id, patch, message, conflicts }
}

async function applyMove() {
  const move = pendingMove.value
  if (!move || !canEdit.value) return
  moveSaving.value = true
  try {
    await store.updateFunction(move.id, move.patch)
    pendingMove.value = null
  } catch {
    // store surfaces the error; keep the dialog open for retry
  } finally {
    moveSaving.value = false
  }
}

function cancelMove() {
  pendingMove.value = null // booking stays put — nothing was written
}

// ---- Quick status change (corner badge on each block) ----
// Anchored to the badge's screen position and teleported to <body>, so it escapes
// the grid scroller's overflow. Changing status is an edit → gated behind canEdit.
const statusMenu = ref<{ id: string; x: number; y: number } | null>(null)

function openStatusMenu(e: MouseEvent, b: { key: string }) {
  if (!canEdit.value) return
  const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
  statusMenu.value = { id: b.key, x: r.right, y: r.bottom + 4 }
}
function currentStatusOf(id: string): FunctionStatus | undefined {
  return store.functions.find((f) => f.id === id)?.status
}
async function setStatus(status: FunctionStatus) {
  const m = statusMenu.value
  statusMenu.value = null
  if (!m || !canEdit.value) return
  if (currentStatusOf(m.id) === status) return
  await store.moveStatus(m.id, status) // optimistic; reverts on failure
}

// ---- Panel actions ----
function openCreate(defaults?: Partial<NewFunctionBooking>) {
  if (!canCreate.value) return // defensive: create controls are hidden without permission
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
  // Enforce edit/create permission (the form may still render for viewers).
  if (editing.value ? !canEdit.value : !canCreate.value) return
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
  if (!canDelete.value) return // defensive: delete button is hidden without permission
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
