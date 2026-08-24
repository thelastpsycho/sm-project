<template>
  <form id="deal-form" @submit.prevent="onSubmit">
    <fieldset :disabled="disabled" class="space-y-5 min-w-0 border-0 p-0 m-0 disabled:opacity-100">
    <!-- Client & contact -->
    <SmInput v-model="form.company" label="Company" placeholder="Company / account name" required />

    <div class="grid grid-cols-2 gap-3">
      <SmSelect v-model="segmentChoice" label="Segment" :options="segmentOptions" />
      <SmSelect v-model="sourceChoice" label="Lead Source" :options="sourceOptions" />
    </div>
    <SmInput
      v-if="segmentChoice === '__other'"
      v-model="form.segment"
      label="Segment (other)"
      placeholder="Type segment"
    />
    <SmInput
      v-if="sourceChoice === '__other'"
      v-model="form.leadSource"
      label="Lead source (other)"
      placeholder="Type source"
    />

    <div class="grid grid-cols-2 gap-3">
      <SmSelect v-model="form.stage" label="Stage" :options="stageOptions" />
      <SmSelect v-model="ownerChoice" label="Sales Owner" :options="ownerOptions" />
    </div>
    <p class="text-eyebrow text-sm-faint -mt-3">
      Confirmed = won · Lost = closed lost. The outcome follows the stage.
    </p>

    <SmInput v-model="form.groupName" label="Group Name" placeholder="Optional" />

    <!-- Dates -->
    <div class="grid grid-cols-2 gap-3">
      <div>
        <label class="mb-2 block sm-eyebrow">Lead Date</label>
        <button type="button" :class="fieldBtnClass" @click="openLead">
          <span class="flex min-w-0 items-center gap-2">
            <CalendarIcon class="h-4 w-4 shrink-0 text-sm-muted" />
            <span v-if="form.leadDate" class="truncate font-semibold text-sm-ink dark:text-white">{{ fmtFull(form.leadDate) }}</span>
            <span v-else class="text-sm-faint">Select date</span>
          </span>
          <ChevronRightIcon class="h-4 w-4 shrink-0 text-sm-faint" />
        </button>
      </div>
      <div>
        <label class="mb-2 block sm-eyebrow">Arrival – Departure</label>
        <button type="button" :class="fieldBtnClass" @click="openStay">
          <span class="flex min-w-0 items-center gap-2">
            <CalendarIcon class="h-4 w-4 shrink-0 text-sm-muted" />
            <span v-if="stayLabel" class="truncate font-semibold text-sm-ink dark:text-white">{{ stayLabel }}</span>
            <span v-else class="text-sm-faint">Select dates</span>
          </span>
          <ChevronRightIcon class="h-4 w-4 shrink-0 text-sm-faint" />
        </button>
      </div>
    </div>

    <!-- Volume -->
    <div class="grid grid-cols-3 gap-3">
      <SmInput :model-value="numStr(form.rooms)" label="No. of Rooms" type="number" @update:model-value="v => (form.rooms = toNum(v))" />
      <SmInput :model-value="numStr(form.nights)" label="Nights" type="number" @update:model-value="v => (form.nights = toNum(v))" />
      <SmInput :model-value="numStr(form.proposedADR)" label="Proposed ADR" type="number" @update:model-value="v => (form.proposedADR = toNum(v))" />
    </div>

    <!-- Revenue -->
    <div class="flex items-center justify-between">
      <span class="sm-eyebrow">Revenue</span>
      <label class="flex items-center gap-2 text-xs text-sm-muted cursor-pointer select-none">
        <input type="checkbox" v-model="form.manualRevenue" class="rounded border-sm-line text-sm-ink focus:ring-sm-ink" />
        Enter manually
      </label>
    </div>

    <SmInput :model-value="numStr(form.fbAncillary)" label="F&B / Ancillary Potential" type="number" @update:model-value="v => (form.fbAncillary = toNum(v))" />

    <div class="grid grid-cols-3 gap-3">
      <SmInput
        :model-value="numStr(form.roomNights)"
        label="Room Nights"
        type="number"
        :readonly="!form.manualRevenue"
        @update:model-value="v => (form.roomNights = toNum(v))"
      />
      <SmInput
        :model-value="numStr(form.estimatedRoomRevenue)"
        label="Est. Room Revenue"
        type="number"
        :readonly="!form.manualRevenue"
        @update:model-value="v => (form.estimatedRoomRevenue = toNum(v))"
      />
      <SmInput
        :model-value="numStr(form.totalRevenue)"
        label="Total Revenue"
        type="number"
        :readonly="!form.manualRevenue"
        @update:model-value="v => (form.totalRevenue = toNum(v))"
      />
    </div>
    <p v-if="!form.manualRevenue" class="text-eyebrow text-sm-faint -mt-2">
      Auto-calculated from Rooms × Nights × ADR (+ F&B).
    </p>

    <!-- Actual booked value (won) -->
    <SmInput
      v-if="form.stage === 'Confirmed'"
      :model-value="numStr(form.actualRevenue)"
      label="Actual Booked Value"
      type="number"
      :placeholder="String(form.totalRevenue ?? '')"
      @update:model-value="v => (form.actualRevenue = toNum(v))"
    />

    <!-- Won/Lost reason -->
    <template v-if="form.stage === 'Lost' || form.stage === 'Confirmed'">
      <SmSelect v-model="reasonChoice" label="Reason Won / Lost" :options="reasonOptions" />
      <SmInput
        v-if="reasonChoice === '__other'"
        v-model="form.reasonWonLost"
        label="Reason (other)"
        placeholder="Type reason"
      />
    </template>

    <!-- Follow-up -->
    <div class="grid grid-cols-2 gap-3">
      <SmInput v-model="form.nextAction" label="Next Action" placeholder="e.g. send reminder" />
      <div>
        <label class="mb-2 block sm-eyebrow">Action Due Date</label>
        <button type="button" :class="fieldBtnClass" @click="openActionDue">
          <span class="flex min-w-0 items-center gap-2">
            <CalendarIcon class="h-4 w-4 shrink-0 text-sm-muted" />
            <span v-if="form.actionDueDate" class="truncate font-semibold text-sm-ink dark:text-white">{{ fmtFull(form.actionDueDate) }}</span>
            <span v-else class="text-sm-faint">Select date</span>
          </span>
          <ChevronRightIcon class="h-4 w-4 shrink-0 text-sm-faint" />
        </button>
      </div>
    </div>

    <SmTextarea v-model="form.notes" label="Notes" :rows="3" placeholder="Free notes / context" />
    </fieldset>
  </form>

  <!-- Calendar picker for any date field (above the deal modal) -->
  <Teleport to="body">
    <div v-if="picker" class="fixed inset-0 z-[80] flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div class="fixed inset-0 bg-sm-ink/40 backdrop-blur-sm" @click="picker = null"></div>
      <div class="relative w-full max-w-md">
        <DateRangePicker
          :key="picker.key"
          :initial-start="picker.start"
          :initial-end="picker.end"
          :mode="picker.mode"
          :start-label="picker.startLabel"
          :end-label="picker.endLabel"
          :allow-past="picker.allowPast"
          @select="onPickerSelect"
          @close="picker = null"
        />
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { reactive, ref, computed, watch } from 'vue'
import { CalendarIcon, ChevronRightIcon } from '@heroicons/vue/24/outline'
import SmInput from '@/components/ui/SmInput.vue'
import SmSelect from '@/components/ui/SmSelect.vue'
import SmTextarea from '@/components/ui/SmTextarea.vue'
import DateRangePicker from '@/components/DateRangePicker.vue'
import { DEAL_STAGES, SEGMENTS, LEAD_SOURCES, LOST_REASONS } from '@/types/crm'
import type { Deal, NewDeal } from '@/types/crm'
import { applyRevenueCalc } from '@/lib/crmUtils'
import userData from '@/user.json'
import { useSessionStore } from '@/stores/session'

const props = withDefaults(
  defineProps<{
    deal?: Deal | null
    disabled?: boolean
  }>(),
  { disabled: false }
)

const emit = defineEmits<{
  submit: [payload: NewDeal]
}>()

const session = useSessionStore()

// ---- Calendar date fields (lead date · stay range · action due) ----
// A single reusable picker modal, configured per field it's opened for.
const fieldBtnClass =
  'flex w-full items-center justify-between border-b border-sm-line py-2.5 text-left text-base transition-colors hover:border-sm-ink dark:border-white/15 dark:hover:border-white'

interface PickerCfg {
  key: string
  mode: 'single' | 'range'
  start?: string
  end?: string
  startLabel?: string
  endLabel?: string
  allowPast?: boolean
  apply: (r: { start: string; end?: string }) => void
}
const picker = ref<PickerCfg | null>(null)

function fmtShort(d?: string): string {
  if (!d) return ''
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
function fmtFull(d?: string): string {
  if (!d) return ''
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
const stayLabel = computed(() => [form.arrivalDate, form.checkoutDate].filter(Boolean).map(fmtShort).join(' – '))

function openLead() {
  // Lead date is typically today or earlier, so past dates are allowed here.
  picker.value = { key: 'lead', mode: 'single', start: form.leadDate, allowPast: true, apply: r => (form.leadDate = r.start) }
}
function openStay() {
  picker.value = {
    key: 'stay',
    mode: 'range',
    start: form.arrivalDate,
    end: form.checkoutDate,
    startLabel: 'Arrival',
    endLabel: 'Departure',
    apply: r => {
      form.arrivalDate = r.start
      form.checkoutDate = r.end
    }
  }
}
function openActionDue() {
  picker.value = { key: 'due', mode: 'single', start: form.actionDueDate, apply: r => (form.actionDueDate = r.start) }
}
function onPickerSelect(r: { start: string; end?: string }) {
  picker.value?.apply(r)
  picker.value = null
}

function blank(): NewDeal {
  const user = session.currentUser
  return {
    company: '',
    segment: 'MICE',
    leadSource: 'Whatsapp',
    ownerId: user?.email ?? '',
    ownerName: user?.name ?? '',
    stage: 'New',
    currency: 'IDR',
    manualRevenue: false
  }
}

const form = reactive<NewDeal>(props.deal ? { ...blank(), ...structuredClone(toPlain(props.deal)) } : blank())

function toPlain(d: Deal): NewDeal {
  const { id: _i, createdAt: _c, updatedAt: _u, ...rest } = d
  return rest
}

// ---- Select option lists ----
const stageOptions = DEAL_STAGES.map(s => ({ value: s, label: s }))
const segmentOptions = [...SEGMENTS.map(s => ({ value: s, label: s })), { value: '__other', label: 'Other…' }]
const sourceOptions = [...LEAD_SOURCES.map(s => ({ value: s, label: s })), { value: '__other', label: 'Other…' }]
const reasonOptions = [
  { value: '', label: '—' },
  ...LOST_REASONS.map(s => ({ value: s, label: s })),
  { value: '__other', label: 'Other…' }
]
const ownerOptions = [
  { value: '', label: 'Unassigned' },
  ...userData.map(u => ({ value: u.email, label: u.name }))
]

// ---- Preset-vs-"Other" mediation for free-text-capable selects ----
function makeChoice(field: 'segment' | 'leadSource' | 'reasonWonLost', presets: readonly string[]) {
  return computed<string>({
    get() {
      const v = form[field] ?? ''
      if (v === '') return ''
      return presets.includes(v) ? v : '__other'
    },
    set(choice: string) {
      if (choice === '__other') {
        // keep existing custom text, or clear a preset so the user types fresh
        if (presets.includes(form[field] ?? '')) form[field] = ''
      } else {
        form[field] = choice
      }
    }
  })
}
const segmentChoice = makeChoice('segment', SEGMENTS)
const sourceChoice = makeChoice('leadSource', LEAD_SOURCES)
const reasonChoice = makeChoice('reasonWonLost', LOST_REASONS)

// Owner select drives both id and display name.
const ownerChoice = computed<string>({
  get: () => form.ownerId ?? '',
  set(email: string) {
    form.ownerId = email
    form.ownerName = userData.find(u => u.email === email)?.name ?? (email ? form.ownerName : '')
  }
})

// Live revenue recalculation while not in manual mode.
watch(
  () => [form.rooms, form.nights, form.proposedADR, form.fbAncillary, form.manualRevenue],
  () => {
    if (!form.manualRevenue) {
      const calc = applyRevenueCalc(form)
      form.roomNights = calc.roomNights
      form.estimatedRoomRevenue = calc.estimatedRoomRevenue
      form.totalRevenue = calc.totalRevenue
    }
  },
  { immediate: true }
)

// ---- number <-> input string helpers ----
function numStr(n?: number): string | number {
  return n ?? ''
}
function toNum(v: string): number | undefined {
  if (v === '' || v == null) return undefined
  const n = Number(v)
  return isNaN(n) ? undefined : n
}

function onSubmit() {
  emit('submit', applyRevenueCalc({ ...form }))
}
</script>
