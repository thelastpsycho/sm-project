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
    <p class="text-[11px] text-gray-400 -mt-3">
      Confirmed = won · Lost = closed lost. The outcome follows the stage.
    </p>

    <SmInput v-model="form.groupName" label="Group Name" placeholder="Optional" />

    <!-- Dates -->
    <div class="grid grid-cols-3 gap-3">
      <SmInput v-model="form.leadDate" label="Lead Date" type="date" />
      <SmInput v-model="form.arrivalDate" label="Arrival" type="date" />
      <SmInput v-model="form.checkoutDate" label="Check-out" type="date" />
    </div>

    <!-- Volume -->
    <div class="grid grid-cols-3 gap-3">
      <SmInput :model-value="numStr(form.rooms)" label="No. of Rooms" type="number" @update:model-value="v => (form.rooms = toNum(v))" />
      <SmInput :model-value="numStr(form.nights)" label="Nights" type="number" @update:model-value="v => (form.nights = toNum(v))" />
      <SmInput :model-value="numStr(form.proposedADR)" label="Proposed ADR" type="number" @update:model-value="v => (form.proposedADR = toNum(v))" />
    </div>

    <!-- Revenue -->
    <div class="flex items-center justify-between">
      <span class="text-xs font-medium text-gray-600 dark:text-gray-400">Revenue</span>
      <label class="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 cursor-pointer select-none">
        <input type="checkbox" v-model="form.manualRevenue" class="rounded border-gray-300 text-sm-primary focus:ring-sm-primary" />
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
    <p v-if="!form.manualRevenue" class="text-[11px] text-gray-400 -mt-2">
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
      <SmInput v-model="form.actionDueDate" label="Action Due Date" type="date" />
    </div>

    <SmTextarea v-model="form.notes" label="Notes" :rows="3" placeholder="Free notes / context" />
    </fieldset>
  </form>
</template>

<script setup lang="ts">
import { reactive, ref, computed, watch } from 'vue'
import SmInput from '@/components/ui/SmInput.vue'
import SmSelect from '@/components/ui/SmSelect.vue'
import SmTextarea from '@/components/ui/SmTextarea.vue'
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
