<template>
  <div class="min-h-screen bg-white dark:bg-sm-bg-dark">
    <div class="px-6 lg:px-10 pt-8 pb-32">
    <!-- Header -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-4">
      <div class="flex flex-col gap-0.5">
        <div class="sm-eyebrow">
          The Anvaya Bali · Sales &amp; Events
        </div>
        <div class="flex items-center gap-2">
          <h1 class="m-0 sm-display text-title">Function Charting</h1>
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
            <button
              v-if="!isViewingToday"
              type="button"
              class="ml-1 rounded-md px-2 py-1 text-eyebrow font-bold uppercase tracking-wide text-sm-primary transition-colors hover:bg-sm-primary/10"
              @click="goToToday"
            >
              Today
            </button>
          </div>
        </div>
      </div>
      <div class="flex items-center gap-2.5">
        <div class="relative flex-1 sm:w-64 sm:flex-none">
          <SmInput
            v-model="q"
            size="sm"
            placeholder="Search event, company or owner"
            @focus="searchFocused = true"
            @blur="searchFocused = false"
          />
          <!-- Live results: jump straight to a function anywhere in the calendar -->
          <div
            v-if="searchFocused && q.trim() && searchResults.length"
            class="absolute left-0 right-0 top-full z-40 mt-1.5 max-h-80 overflow-auto rounded-xl border border-sm-line bg-white py-1 shadow-xl dark:border-white/10 dark:bg-sm-card-dark"
          >
            <button
              v-for="r in searchResults"
              :key="r.id"
              type="button"
              class="flex w-full flex-col gap-0.5 px-3 py-2 text-left transition-colors hover:bg-gray-100 dark:hover:bg-white/5"
              @mousedown.prevent="jumpToBooking(r)"
            >
              <div class="flex items-center gap-2">
                <span class="h-2 w-2 shrink-0 rounded-full" :class="STATUS_STYLE[r.status].dot"></span>
                <span class="truncate text-xsm font-semibold text-gray-900 dark:text-white">{{ r.eventName || '(untitled)' }}</span>
              </div>
              <div class="pl-4 text-eyebrow font-medium text-sm-secondary">{{ searchDateLabel(r) }}</div>
            </button>
          </div>
          <div
            v-else-if="searchFocused && q.trim()"
            class="absolute left-0 right-0 top-full z-40 mt-1.5 rounded-xl border border-sm-line bg-white px-3 py-2.5 text-xs text-sm-secondary shadow-xl dark:border-white/10 dark:bg-sm-card-dark"
          >
            No functions match “{{ q.trim() }}”
          </div>
        </div>
        <div class="w-32 shrink-0 sm:w-36">
          <SmSelect v-model="statusFilter" size="sm" :options="statusFilterOptions" />
        </div>
        <button
          class="flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-sm-line px-3 py-2 text-sm font-bold text-sm-ink transition-colors hover:bg-sm-surface dark:border-white/15 dark:text-gray-200 dark:hover:bg-white/5"
          title="Share a date range as an image"
          @click="shareOpen = true"
        >
          <ShareIcon class="w-4 h-4" /> Share
        </button>
        <button
          v-if="canCreate"
          class="flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-sm-ink px-3.5 py-2 text-sm font-bold text-white transition-colors hover:bg-black dark:bg-white dark:text-sm-ink dark:hover:bg-gray-100"
          @click="openCreate()"
        >
          <PlusIcon class="w-4 h-4" /> New
        </button>
      </div>
    </div>

    <!-- Month tabs + stats -->
    <div class="flex flex-wrap items-center gap-2 border-b border-gray-200 dark:border-white/10 pb-2 mb-3" role="tablist" aria-label="Select month">
      <button
        v-for="(label, i) in monthLabels"
        :key="label"
        role="tab"
        :aria-selected="i === monthIndex"
        @click="monthIndex = i"
        class="cursor-pointer rounded-lg px-3.5 py-2 text-xs font-bold tracking-wide transition-colors"
        :class="
          i === monthIndex
            ? 'bg-sm-ink text-white dark:bg-white dark:text-sm-ink'
            : 'text-sm-secondary hover:bg-gray-100 dark:hover:bg-white/5'
        "
      >
        {{ label }}
      </button>
      <div class="flex-1"></div>
      <div class="flex gap-4 whitespace-nowrap px-1 text-eyebrow font-semibold tracking-wide text-sm-secondary">
        <span>{{ stats.functions }} functions</span>
        <span>{{ stats.venues }} venues booked</span>
        <span>{{ stats.occupancy }} slot use</span>
      </div>
    </div>

    <!-- Status legend -->
    <div class="mb-3 flex flex-wrap items-center gap-4">
      <div v-for="s in statuses" :key="s.value" class="flex items-center gap-1.5">
        <span class="h-3 w-3 rounded-sm" :class="s.dot"></span>
        <span class="text-eyebrow font-semibold text-sm-secondary">{{ s.label }}</span>
      </div>
      <div v-if="conflictIds.size" class="flex items-center gap-1.5">
        <ExclamationTriangleIcon class="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
        <span class="text-eyebrow font-semibold text-red-600 dark:text-red-400"
          >{{ conflictIds.size }} double-booked</span
        >
      </div>
    </div>

    <!-- Loading -->
    <div v-if="store.loading" class="py-16 text-center text-sm text-sm-secondary">
      Loading…
    </div>

    <div v-else class="md:flex md:min-h-0 md:gap-4">
      <!-- Scrollable grid (desktop) -->
      <div
        class="hidden flex-1 overflow-auto rounded-2xl border border-sm-line bg-sm-card dark:border-white/10 dark:bg-sm-card-dark md:block"
        style="max-height: calc(100vh - 240px)"
      >
        <div :style="gridStyle">
          <!-- Corner -->
          <div
            class="sticky left-0 top-0 z-30 flex items-end border-b border-r border-sm-line bg-sm-card px-3.5 py-2.5 sm-eyebrow dark:border-white/10 dark:bg-sm-card-dark"
            style="grid-row: 1; grid-column: 1"
          >
            Function
          </div>

          <!-- Day headers -->
          <div
            v-for="(d, i) in days"
            :key="'h' + d.date"
            :id="'fc-day-' + d.date"
            class="sticky top-0 z-20 flex flex-col gap-px border-b border-r border-sm-line px-3 pb-[7px] pt-2 dark:border-white/10"
            :class="d.isWeekend ? 'bg-sm-surface dark:bg-white/5' : 'bg-sm-card dark:bg-sm-card-dark'"
            :style="{ gridRow: 1, gridColumn: i + 2, boxShadow: d.isToday ? 'inset 0 -2px 0 #0066CC' : undefined }"
          >
            <span class="text-2xs font-bold uppercase tracking-wider text-sm-secondary">{{ d.dow }}</span>
            <span
              class="text-md font-extrabold tracking-tight"
              :class="d.isToday ? 'text-sm-primary' : 'text-gray-900 dark:text-white'"
              >{{ d.num }}</span
            >
          </div>

          <!-- Lines -->
          <template v-for="line in lines" :key="line.key">
            <div
              v-if="line.kind === 'cat'"
              class="sticky left-0 z-[12] flex h-[30px] items-center border-y border-sm-line bg-sm-surface px-3.5 text-2xs font-bold uppercase tracking-widest text-sm-secondary dark:border-white/10 dark:bg-white/5"
              :style="{ gridColumn: '1 / -1', gridRow: line.row }"
            >
              {{ line.label }}
            </div>

            <template v-else>
              <!-- Venue name cell -->
              <div
                class="sticky left-0 z-[14] flex items-center justify-between gap-2 border-b border-r border-sm-hair bg-sm-card px-3.5 text-[12.5px] font-bold text-gray-800 dark:border-white/5 dark:bg-sm-card-dark dark:text-gray-100"
                :style="{ gridColumn: 1, gridRow: line.row, minHeight: rowH + 'px' }"
              >
                <span>{{ line.label }}</span>
                <span v-if="line.count" class="text-2xs font-semibold text-sm-secondary">{{ line.count }}</span>
              </div>

              <!-- Background day cells (click to create · drop target to reschedule) -->
              <div
                v-for="(d, i) in days"
                :key="line.key + 'bg' + i"
                class="cursor-pointer border-b border-r border-sm-hair hover:bg-sm-primary/5 dark:border-white/5"
                :class="[
                  d.isWeekend ? 'bg-sm-surface dark:bg-white/[0.03]' : '',
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
            :id="'fc-block-' + b.key"
            :draggable="canEdit"
            @click="openEdit(b.booking)"
            @dragstart="onBlockDragStart($event, b)"
            @dragend="onBlockDragEnd"
            :title="canEdit ? b.title + ' — drag to reschedule' : b.title"
            class="relative z-10 m-[3px] flex flex-col justify-center gap-0.5 overflow-hidden rounded-[7px] border-l-[3px] px-2.5 py-1.5 transition-all"
            :class="[
              b.blockClass,
              b.on ? '' : 'opacity-30',
              flashId === b.key
                ? 'z-20 animate-pulse ring-2 ring-sm-primary ring-offset-2 ring-offset-white dark:ring-offset-sm-card-dark'
                : selectedId === b.key
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
            <div class="line-clamp-2 text-xs font-bold leading-[1.25]" :class="canEdit || b.conflict ? 'pr-5' : ''">
              <span v-if="b.company">{{ b.company }} - </span>{{ b.title }}
            </div>
            <div class="flex items-center gap-1.5 text-2xs font-semibold opacity-75">
              <span v-if="b.pax">{{ b.pax }} pax</span>
              <span v-if="b.pax && b.owner">-</span>
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
      <MobileCalendar
        class="md:hidden"
        :functions="store.functions"
        :days="days"
        :matches="matches"
        :conflict-ids="conflictIds"
        :can-create="canCreate"
        v-model:selected-day="selectedDay"
        @create="openCreate"
        @edit="openEdit"
      />

      <!-- Editable panel: side panel on desktop, full-screen sheet on mobile -->
      <aside
        v-if="panelOpen"
        class="fixed inset-0 z-50 flex w-full flex-col overflow-auto bg-sm-card dark:bg-sm-card-dark md:static md:z-auto md:max-h-[calc(100vh-240px)] md:w-[400px] md:flex-none md:rounded-2xl md:border md:border-gray-200 md:dark:border-white/10"
      >
        <div class="flex items-center justify-between gap-3 border-b border-sm-hair px-4 py-3 dark:border-white/5">
          <div class="min-w-0 truncate text-2xs font-bold uppercase tracking-widest text-sm-secondary">
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
              class="rounded-full bg-sm-ink p-2 text-white dark:bg-white dark:text-sm-ink transition-colors hover:bg-black dark:hover:bg-gray-100 disabled:opacity-60"
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
        <div v-if="editing" class="flex flex-col gap-4 border-t border-sm-hair px-5 py-4 dark:border-white/5">
          <div class="flex flex-col gap-1">
            <div class="text-2xs font-bold uppercase tracking-widest text-sm-secondary">Duration</div>
            <div class="text-sm text-gray-900 dark:text-white">{{ durationLabel }}</div>
          </div>
          <div v-if="sameDay.length" class="flex flex-col gap-1.5">
            <div class="text-2xs font-bold uppercase tracking-widest text-sm-secondary">Same day, other venues</div>
            <div
              v-for="(s, i) in sameDay"
              :key="i"
              class="flex items-baseline gap-2 border-b border-sm-hair py-1.5 text-[12.5px] dark:border-white/5"
            >
              <span class="min-w-[92px] text-2xs font-bold uppercase tracking-wide text-sm-secondary">{{ s.venue }}</span>
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
          class="fixed z-[61] min-w-[150px] overflow-hidden rounded-xl border border-sm-line bg-white py-1 shadow-xl dark:border-white/10 dark:bg-sm-card-dark"
          :style="{ left: statusMenu.x + 'px', top: statusMenu.y + 'px', transform: 'translateX(-100%)' }"
          @click.stop
        >
          <div class="px-3 pb-1 pt-0.5 text-2xs font-bold uppercase tracking-widest text-sm-secondary">Set status</div>
          <button
            v-for="s in statuses"
            :key="s.value"
            type="button"
            class="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xsm font-medium text-gray-800 transition-colors hover:bg-gray-100 dark:text-gray-100 dark:hover:bg-white/5"
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

    <!-- Delete confirmation -->
    <ConfirmDialog
      :open="confirmDelete"
      title="Delete function?"
      :message="editing ? `“${editing.eventName || '(untitled)'}” will be permanently removed.` : ''"
      confirm-text="Delete"
      cancel-text="Cancel"
      danger
      :loading="deleting"
      @confirm="performDelete"
      @cancel="confirmDelete = false"
    />

    <!-- Share a date range as a WhatsApp-ready image -->
    <ShareChartDialog :open="shareOpen" :functions="store.functions" @close="shareOpen = false" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { PlusIcon, TrashIcon, XMarkIcon, CheckIcon, ChevronLeftIcon, ChevronRightIcon, ExclamationTriangleIcon, ShareIcon } from '@heroicons/vue/24/outline'
import SmInput from '@/components/ui/SmInput.vue'
import SmSelect from '@/components/ui/SmSelect.vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import FunctionForm from '@/components/functionchart/FunctionForm.vue'
import ShareChartDialog from '@/components/functionchart/ShareChartDialog.vue'
import MobileCalendar from '@/components/functionchart/MobileCalendar.vue'
import { useFunctionChartStore } from '@/stores/functionChart'
import { useSessionStore } from '@/stores/session'
import { usePermissionsStore } from '@/stores/permissions'
import { comboName } from '@/lib/functionChartVenues'
import { FUNCTION_STATUSES, STATUS_META, STATUS_STYLE } from '@/types/functionChart'
import type { FunctionBooking, FunctionStatus, NewFunctionBooking } from '@/types/functionChart'
import { useConflicts } from '@/composables/functionChart/useConflicts'
import { useFunctionGrid, ROW_H } from '@/composables/functionChart/useFunctionGrid'
import { useDragReschedule } from '@/composables/functionChart/useDragReschedule'

const store = useFunctionChartStore()
const session = useSessionStore()
const permissions = usePermissionsStore()

// Granular Function Chart permissions (client-side gating; this collection is
// PIN/public in firestore.rules, so these hide buttons rather than reject writes).
const canCreate = computed(() => permissions.has(session.currentUser, 'function:create'))
const canEdit = computed(() => permissions.has(session.currentUser, 'function:edit'))
const canDelete = computed(() => permissions.has(session.currentUser, 'function:delete'))

const now = new Date()
const year = ref(now.getFullYear())
const monthIndex = ref(now.getMonth())
const rowH = ROW_H

const q = ref('')
const statusFilter = ref<string>('ALL')
const shareOpen = ref(false)
const selectedDay = ref('') // shared with MobileCalendar (v-model); set on jump/goToToday

// `today` as a reactive ref so the highlight and the “Today” button stay correct
// if the page is left open across midnight (refreshed when the tab regains focus).
const todayISO = ref(new Date().toISOString().slice(0, 10))
function syncToday() {
  const t = new Date().toISOString().slice(0, 10)
  if (t !== todayISO.value) todayISO.value = t
}

// Live search dropdown: matches across ALL dates so you can jump to any function.
const searchFocused = ref(false)
const flashId = ref('') // block briefly highlighted after a jump
let flashTimer: ReturnType<typeof setTimeout> | null = null

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
  document.addEventListener('visibilitychange', syncToday)
  window.addEventListener('focus', syncToday)
  await store.loadFunctions()
})
onUnmounted(() => {
  document.removeEventListener('visibilitychange', syncToday)
  window.removeEventListener('focus', syncToday)
})

const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const statuses = FUNCTION_STATUSES.map((s) => ({ value: s, label: STATUS_META[s].label, dot: STATUS_STYLE[s].dot }))
const statusFilterOptions = [{ value: 'ALL', label: 'All status' }, ...statuses.map((s) => ({ value: s.value, label: s.label }))]

function matches(f: FunctionBooking): boolean {
  const query = q.value.trim().toLowerCase()
  const hay = (f.eventName + ' ' + f.company + ' ' + f.salesOwner + ' ' + f.venues.join(' ')).toLowerCase()
  return (!query || hay.indexOf(query) >= 0) && (statusFilter.value === 'ALL' || f.status === statusFilter.value)
}

const functionsRef = computed(() => store.functions)

// Conflict detection + derived grid geometry/layout live in composables; the page
// owns filter state (`matches`) and injects it so the grid stays a pure projection.
const { conflictIds } = useConflicts(functionsRef)
const { days, monthStart, gridStyle, lines, bookingBlocks, stats } = useFunctionGrid({
  functions: functionsRef,
  year,
  monthIndex,
  todayISO,
  matches,
  conflictIds
})

// Is the visible month the current real-world month? Drives the “Today” button.
const isViewingToday = computed(() => monthStart.value.slice(0, 7) === todayISO.value.slice(0, 7))
async function goToToday() {
  const t = new Date()
  year.value = t.getFullYear()
  monthIndex.value = t.getMonth()
  selectedDay.value = todayISO.value // surfaces today in the mobile agenda
  // Desktop: scroll today's column into view (the grid is a horizontal scroller).
  await nextTick()
  document.getElementById('fc-day-' + todayISO.value)?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
}

// Flat, date-sorted list of matches (any month/year) for the search dropdown.
const searchResults = computed(() => {
  if (!q.value.trim()) return []
  return store.functions
    .filter(matches)
    .slice()
    .sort((a, b) => a.startDate.localeCompare(b.startDate))
    .slice(0, 25)
})

function searchDateLabel(f: FunctionBooking): string {
  return f.startDate === f.endDate ? fmt(f.startDate) : `${fmt(f.startDate)} – ${fmt(f.endDate)}`
}

// Navigate the calendar to a function and briefly flash its block.
async function jumpToBooking(f: FunctionBooking) {
  searchFocused.value = false
  year.value = Number(f.startDate.slice(0, 4))
  monthIndex.value = Number(f.startDate.slice(5, 7)) - 1
  selectedDay.value = f.startDate // surfaces it in the mobile day agenda too
  await nextTick()
  document.getElementById('fc-block-' + f.id)?.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' })
  flashId.value = f.id
  if (flashTimer) clearTimeout(flashTimer)
  flashTimer = setTimeout(() => (flashId.value = ''), 2000)
}

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
const {
  draggingId,
  dragOverKey,
  pendingMove,
  moveSaving,
  onBlockDragStart,
  onBlockDragEnd,
  onCellDragOver,
  onCellDrop,
  applyMove,
  cancelMove
} = useDragReschedule({
  functions: functionsRef,
  canEdit,
  fmt,
  updateFunction: store.updateFunction
})

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

// ---- Delete (confirmed via ConfirmDialog, matching the reschedule flow) ----
const confirmDelete = ref(false)
const deleting = ref(false)

function onDelete() {
  if (!editing.value || !canDelete.value) return // defensive: button is hidden without permission
  confirmDelete.value = true
}
async function performDelete() {
  if (!editing.value || !canDelete.value) return
  deleting.value = true
  try {
    await store.deleteFunction(editing.value.id)
    confirmDelete.value = false
    closePanel()
  } catch {
    // store surfaces the error; keep the dialog open for retry
  } finally {
    deleting.value = false
  }
}
</script>
