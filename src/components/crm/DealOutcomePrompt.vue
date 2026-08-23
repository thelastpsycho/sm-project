<template>
  <Transition
    enter-active-class="transition duration-150 ease-out"
    enter-from-class="opacity-0"
    enter-to-class="opacity-100"
    leave-active-class="transition duration-150 ease-in"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <div v-if="open" class="fixed inset-0 z-[70] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div class="fixed inset-0 bg-sm-ink/30 backdrop-blur-[2px]" @click="!loading && emit('cancel')"></div>

      <div class="relative bg-white dark:bg-sm-card-dark w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden animate-fade-in-up">
        <div class="p-6">
          <div class="flex items-start gap-3">
            <div
              class="shrink-0 w-10 h-10 rounded-full flex items-center justify-center"
              :class="isLost ? 'bg-red-100 dark:bg-red-900/30' : 'bg-green-100 dark:bg-green-900/30'"
            >
              <XCircleIcon v-if="isLost" class="w-5 h-5 text-red-600 dark:text-red-400" />
              <TrophyIcon v-else class="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div class="min-w-0">
              <h3 class="text-base font-extrabold tracking-[-0.01em] text-sm-ink dark:text-white">
                {{ isLost ? 'Mark as Lost' : 'Mark as Won' }}
              </h3>
              <p class="mt-1 text-sm text-sm-muted truncate">{{ deal?.company }}</p>
            </div>
          </div>

          <!-- Lost: reason + optional note -->
          <div v-if="isLost" class="mt-4 space-y-3">
            <SmSelect v-model="reasonChoice" label="Reason lost" :options="reasonOptions" />
            <SmInput
              v-if="reasonChoice === '__other'"
              v-model="customReason"
              label="Reason (other)"
              placeholder="Type reason"
            />
            <SmTextarea v-model="note" label="Note (optional)" :rows="2" placeholder="Any extra context" />
            <p v-if="showError" class="text-xs text-sm-bad">Please choose or type a reason.</p>
          </div>

          <!-- Won: actual booked value -->
          <div v-else class="mt-4 space-y-2">
            <SmInput
              :model-value="actualStr"
              type="number"
              label="Actual booked value"
              :placeholder="String(deal?.totalRevenue ?? 0)"
              @update:model-value="onActualInput"
            />
            <p class="text-[11px] text-sm-faint">
              Estimated {{ formatMoney(deal?.totalRevenue, deal?.currency) }} — adjust to the real booked amount.
            </p>
          </div>

          <div class="mt-6 flex gap-3 justify-end">
            <button
              type="button"
              :disabled="loading"
              class="px-4 py-2 rounded-xl text-sm font-bold text-sm-ink dark:text-white border border-sm-line dark:border-white/15 hover:bg-sm-surface dark:hover:bg-white/5 transition-colors disabled:opacity-50"
              @click="emit('cancel')"
            >
              Cancel
            </button>
            <button
              type="button"
              :disabled="loading"
              class="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white transition-colors disabled:opacity-60"
              :class="isLost ? 'bg-sm-bad hover:bg-red-700' : 'bg-sm-won hover:bg-green-700'"
              @click="onConfirm"
            >
              <svg v-if="loading" class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
              </svg>
              {{ isLost ? 'Mark Lost' : 'Mark Won' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { XCircleIcon, TrophyIcon } from '@heroicons/vue/24/outline'
import SmSelect from '@/components/ui/SmSelect.vue'
import SmInput from '@/components/ui/SmInput.vue'
import SmTextarea from '@/components/ui/SmTextarea.vue'
import { LOST_REASONS } from '@/types/crm'
import type { Deal } from '@/types/crm'
import { formatMoney } from '@/lib/crmUtils'

const props = defineProps<{
  open: boolean
  mode: 'lost' | 'won'
  deal?: Deal | null
  loading?: boolean
}>()

const emit = defineEmits<{
  confirm: [payload: { reason?: string; note?: string; actualRevenue?: number }]
  cancel: []
}>()

const isLost = computed(() => props.mode === 'lost')

const reasonOptions = [
  { value: '', label: '—' },
  ...LOST_REASONS.map(s => ({ value: s, label: s })),
  { value: '__other', label: 'Other…' }
]

const reasonChoice = ref('')
const customReason = ref('')
const note = ref('')
const actual = ref<number | undefined>(undefined)
const showError = ref(false)

const actualStr = computed(() => (actual.value ?? '') as string | number)
function onActualInput(v: string) {
  const n = Number(v)
  actual.value = v === '' || isNaN(n) ? undefined : n
}

// Reset the form each time the prompt opens for a new deal.
watch(
  () => [props.open, props.deal?.id],
  () => {
    if (props.open) {
      reasonChoice.value = ''
      customReason.value = ''
      note.value = ''
      actual.value = props.deal?.totalRevenue
      showError.value = false
    }
  },
  { immediate: true }
)

const resolvedReason = computed(() =>
  reasonChoice.value === '__other' ? customReason.value.trim() : reasonChoice.value
)

function onConfirm() {
  if (isLost.value) {
    if (!resolvedReason.value) {
      showError.value = true
      return
    }
    emit('confirm', { reason: resolvedReason.value, note: note.value.trim() || undefined })
  } else {
    emit('confirm', { actualRevenue: actual.value })
  }
}
</script>
