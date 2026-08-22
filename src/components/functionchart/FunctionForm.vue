<template>
  <form id="function-form" @submit.prevent="onSubmit">
    <fieldset :disabled="disabled" class="space-y-5 min-w-0 border-0 p-0 m-0 disabled:opacity-100">
      <SmInput v-model="form.eventName" label="Event Name" placeholder="e.g. Gala Dinner BRI" required />
      <SmInput v-model="form.company" label="Company" placeholder="Company / account name" />

      <div class="grid grid-cols-2 gap-3">
        <SmSelect
          :model-value="form.venues[0] ?? ''"
          label="Venue"
          :options="venueOptions"
          required
          @update:model-value="setPrimaryVenue"
        />
        <SmSelect v-model="form.status" label="Status" :options="statusOptions" />
      </div>

      <!-- Combine adjacent rooms (only for combinable venues) -->
      <div v-if="comboRooms.length" class="-mt-2 space-y-1.5">
        <div class="text-xs font-medium text-sm-secondary">Combine adjacent rooms</div>
        <div class="flex flex-wrap gap-1.5">
          <button
            v-for="r in comboRooms"
            :key="r.room"
            type="button"
            :disabled="(!r.selected && !r.canAdd) || (r.selected && !r.canRemove)"
            class="rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40"
            :class="
              r.selected
                ? 'border-sm-primary bg-sm-primary text-white'
                : 'border-gray-300 text-gray-600 hover:border-sm-primary dark:border-white/15 dark:text-gray-300'
            "
            @click="toggleRoom(r.room)"
          >
            {{ r.room }}
          </button>
        </div>
        <div class="text-xs text-sm-secondary">
          Booking as <span class="font-semibold text-gray-700 dark:text-gray-200">{{ comboLabel }}</span>
        </div>
      </div>

      <!-- Conflict warning (non-blocking) -->
      <div
        v-if="conflicts.length"
        class="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200"
      >
        <div class="font-semibold">
          Overlaps {{ conflicts.length }} existing booking{{ conflicts.length > 1 ? 's' : '' }}
        </div>
        <ul class="mt-1 list-disc space-y-0.5 pl-4">
          <li v-for="(c, i) in conflicts" :key="i">{{ c.rooms }} — {{ c.title }} ({{ c.dates }})</li>
        </ul>
        <div class="mt-1 opacity-80">You can still save.</div>
      </div>

      <div class="grid grid-cols-2 gap-3">
        <div>
          <SmSelect v-model="ownerChoice" label="Sales Owner" :options="ownerOptions" />
          <SmInput
            v-if="ownerChoice === '__other'"
            v-model="form.salesOwner"
            class="mt-2"
            placeholder="Type name"
          />
        </div>
        <SmInput
          :model-value="numStr(form.pax)"
          label="Number of Pax"
          type="number"
          @update:model-value="(v) => (form.pax = toNum(v))"
        />
      </div>

      <div>
        <label class="mb-2 block text-xs font-normal text-gray-600 dark:text-gray-400">
          Event Dates <span class="text-red-500 ml-1">*</span>
        </label>
        <button type="button" :class="fieldBtnClass" @click="showDatePicker = true">
          <span class="flex min-w-0 items-center gap-2">
            <CalendarIcon class="h-4 w-4 shrink-0 text-sm-primary" />
            <span v-if="dateLabel" class="truncate font-medium text-gray-900 dark:text-white">{{ dateLabel }}</span>
            <span v-else class="text-gray-400">Select dates</span>
          </span>
          <ChevronRightIcon class="h-4 w-4 shrink-0 text-gray-300" />
        </button>
      </div>

      <SmTextarea v-model="form.note" label="Setup Note" :rows="3" placeholder="Optional setup / context" />
    </fieldset>
  </form>

  <!-- Event-dates calendar range picker (above the function panel) -->
  <Teleport to="body">
    <div v-if="showDatePicker" class="fixed inset-0 z-[80] flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div class="fixed inset-0 bg-black/60 backdrop-blur-sm" @click="showDatePicker = false"></div>
      <div class="relative w-full max-w-md">
        <DateRangePicker
          :initial-start="form.startDate"
          :initial-end="form.endDate"
          mode="range"
          start-label="Start"
          end-label="End"
          allow-past
          @select="onDatesSelect"
          @close="showDatePicker = false"
        />
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { reactive, ref, computed } from 'vue'
import { CalendarIcon, ChevronRightIcon } from '@heroicons/vue/24/outline'
import SmInput from '@/components/ui/SmInput.vue'
import SmSelect from '@/components/ui/SmSelect.vue'
import SmTextarea from '@/components/ui/SmTextarea.vue'
import DateRangePicker from '@/components/DateRangePicker.vue'
import { FUNCTION_STATUSES, STATUS_META } from '@/types/functionChart'
import type { FunctionBooking, NewFunctionBooking } from '@/types/functionChart'
import { VENUE_LIST, comboGroupOf, comboName } from '@/lib/functionChartVenues'
import userData from '@/user.json'
import { useSessionStore } from '@/stores/session'
import { useFunctionChartStore } from '@/stores/functionChart'

const props = withDefaults(
  defineProps<{
    booking?: FunctionBooking | null
    defaults?: Partial<NewFunctionBooking> | null
    disabled?: boolean
  }>(),
  { disabled: false }
)

const emit = defineEmits<{ submit: [payload: NewFunctionBooking] }>()

const session = useSessionStore()
const store = useFunctionChartStore()

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

function blank(): NewFunctionBooking {
  return {
    salesOwner: session.currentUser?.name ?? '',
    company: '',
    eventName: '',
    pax: 0,
    venues: [],
    status: 'tentative',
    startDate: today(),
    endDate: today(),
    note: ''
  }
}

function toPlain(b: FunctionBooking): NewFunctionBooking {
  const { id: _i, createdAt: _c, updatedAt: _u, ...rest } = b
  return rest
}

// Build the initial form. Note: props.booking is a reactive proxy whose `venues`
// is a nested proxy array — structuredClone() would throw DataCloneError on it,
// so copy fields plainly and clone `venues` into a fresh array.
function initialForm(): NewFunctionBooking {
  if (props.booking) {
    return { ...blank(), ...toPlain(props.booking), venues: [...(props.booking.venues ?? [])] }
  }
  const d = props.defaults ?? {}
  return { ...blank(), ...d, venues: d.venues ? [...d.venues] : [] }
}

const form = reactive<NewFunctionBooking>(initialForm())

const venueOptions = [
  { value: '', label: 'Select venue…' },
  ...VENUE_LIST.map((v) => ({ value: v, label: v }))
]
const statusOptions = FUNCTION_STATUSES.map((s) => ({ value: s, label: STATUS_META[s].label }))
const ownerNames = userData.map((u) => u.name)
const ownerOptions = [
  { value: '', label: 'Unassigned' },
  ...ownerNames.map((n) => ({ value: n, label: n })),
  { value: '__other', label: 'Other…' }
]

// Owner select: a known name maps to itself; anything else (e.g. migrated "LINDA")
// falls to the free-text "Other…" branch.
const ownerChoice = computed<string>({
  get() {
    const v = form.salesOwner ?? ''
    if (v === '') return ''
    return ownerNames.includes(v) ? v : '__other'
  },
  set(choice: string) {
    if (choice === '__other') {
      if (ownerNames.includes(form.salesOwner)) form.salesOwner = ''
    } else {
      form.salesOwner = choice
    }
  }
})

function numStr(n?: number): string | number {
  return n || n === 0 ? n : ''
}
function toNum(v: string): number {
  const n = Number(v)
  return v === '' || isNaN(n) ? 0 : n
}

// ---- Event dates (calendar range picker; single-day = same start & end) ----
const fieldBtnClass =
  'flex w-full items-center justify-between rounded-lg bg-gray-50 px-4 py-3 text-left text-sm ring-1 ring-gray-200 transition-colors hover:bg-gray-100 dark:bg-gray-800 dark:ring-gray-700 dark:hover:bg-gray-700'
const showDatePicker = ref(false)

function fmtShort(d?: string): string {
  if (!d) return ''
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
function fmtFull(d?: string): string {
  if (!d) return ''
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
const dateLabel = computed(() => {
  const s = form.startDate
  const e = form.endDate
  if (!s) return ''
  return !e || e === s ? fmtFull(s) : `${fmtShort(s)} – ${fmtShort(e)}`
})

function onDatesSelect(range: { start: string; end?: string }) {
  form.startDate = range.start
  form.endDate = range.end ?? range.start
  showDatePicker.value = false
}

// ---- Venue selection (single room, or a contiguous run of adjacent rooms) ----
function setPrimaryVenue(v: string) {
  form.venues = v ? [v] : []
}

const comboLabel = computed(() => comboName(form.venues))

// Chips for the primary room's group. A room can be added only if it extends the
// current run (adjacent to an endpoint); a room can be removed only if it's an
// endpoint (keeps the run contiguous).
const comboRooms = computed(() => {
  const primary = form.venues[0]
  if (!primary) return []
  const g = comboGroupOf(primary)
  if (!g || g.rooms.length < 2) return []
  const positions = form.venues
    .map((r) => g.rooms.indexOf(r))
    .filter((p) => p >= 0)
    .sort((a, b) => a - b)
  const min = positions[0]!
  const max = positions[positions.length - 1]!
  return g.rooms.map((room, p) => {
    const selected = form.venues.includes(room)
    return {
      room,
      selected,
      canAdd: !selected && (p === min - 1 || p === max + 1),
      canRemove: selected && form.venues.length > 1 && (p === min || p === max)
    }
  })
})

function toggleRoom(room: string) {
  const g = comboGroupOf(form.venues[0] ?? '')
  if (!g) return
  if (form.venues.includes(room)) {
    form.venues = form.venues.filter((r) => r !== room)
  } else {
    form.venues = [...form.venues, room].sort((a, b) => g.rooms.indexOf(a) - g.rooms.indexOf(b))
  }
}

// Non-blocking conflict check: existing bookings that share a room on overlapping dates.
const conflicts = computed(() => {
  const rooms = new Set(form.venues)
  if (!rooms.size || !form.startDate || !form.endDate) return []
  const start = form.startDate
  const end = form.endDate < form.startDate ? form.startDate : form.endDate
  const out: { rooms: string; title: string; dates: string }[] = []
  for (const f of store.functions) {
    if (props.booking && f.id === props.booking.id) continue
    if (f.endDate < start || f.startDate > end) continue // no date overlap
    const shared = f.venues.filter((v) => rooms.has(v))
    if (shared.length) {
      out.push({
        rooms: shared.join(', '),
        title: f.eventName || '(untitled)',
        dates: f.startDate === f.endDate ? f.startDate : `${f.startDate} → ${f.endDate}`
      })
    }
  }
  return out
})

function onSubmit() {
  if (!form.venues.length) return // venue is required
  // Keep the date range sane.
  if (form.endDate < form.startDate) form.endDate = form.startDate
  emit('submit', { ...form, venues: [...form.venues] })
}
</script>
