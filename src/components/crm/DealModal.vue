<template>
  <Transition
    enter-active-class="transition duration-200 ease-out"
    enter-from-class="transform opacity-0"
    enter-to-class="transform opacity-100"
    leave-active-class="transition duration-200 ease-in"
    leave-from-class="transform opacity-100"
    leave-to-class="transform opacity-0"
  >
    <div
      v-if="isOpen"
      class="fixed inset-0 z-[60] flex items-center justify-center p-4 lg:items-stretch lg:justify-end lg:p-0"
      role="dialog"
      aria-modal="true"
    >
      <div class="fixed inset-0 bg-sm-ink/30 backdrop-blur-[2px]" @click="emit('close')"></div>

      <div
        class="relative bg-white dark:bg-sm-card-dark w-full flex flex-col overflow-hidden animate-fade-in-up rounded-3xl max-h-[90vh] shadow-2xl lg:rounded-none lg:rounded-l-3xl lg:max-h-none lg:h-full lg:shadow-[-8px_0_40px_rgba(0,0,0,0.12)]"
        :class="deal ? 'max-w-4xl lg:max-w-[880px]' : 'max-w-2xl lg:max-w-[640px]'"
      >
        <!-- Header with title + icon actions -->
        <div
          class="px-6 py-4 border-b border-sm-line dark:border-white/10 flex items-center justify-between gap-3"
        >
          <div class="flex items-center gap-2 min-w-0">
            <h3 class="text-lg font-extrabold tracking-[-0.02em] text-sm-ink dark:text-white truncate">
              {{ deal ? (canEdit ? 'Edit deal' : 'View deal') : 'New deal' }}
            </h3>
            <span
              v-if="deal && !canEdit"
              class="shrink-0 inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-[0.06em] text-sm-muted"
            >
              <LockClosedIcon class="w-3 h-3" /> View only
            </span>
          </div>

          <div class="flex items-center gap-1 shrink-0">
            <!-- Delete (Andi only, edit mode) -->
            <button
              v-if="deal && canDelete"
              type="button"
              aria-label="Delete deal"
              title="Delete"
              class="p-2 rounded-full text-sm-bad hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              @click="emit('delete')"
            >
              <TrashIcon class="w-5 h-5" />
            </button>

            <!-- Cancel -->
            <button
              type="button"
              aria-label="Cancel"
              title="Cancel"
              class="p-2 rounded-full text-sm-muted hover:text-sm-ink dark:hover:text-white hover:bg-sm-surface dark:hover:bg-white/5 transition-colors"
              @click="emit('close')"
            >
              <XMarkIcon class="w-5 h-5" />
            </button>

            <!-- Save (submits the form via its id) -->
            <button
              v-if="canEdit"
              form="deal-form"
              type="submit"
              :disabled="saving"
              aria-label="Save deal"
              :title="deal ? 'Save' : 'Create'"
              class="p-2 rounded-full bg-sm-ink text-white dark:bg-white dark:text-sm-ink hover:bg-black dark:hover:bg-gray-100 transition-colors disabled:opacity-60"
            >
              <svg v-if="saving" class="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
              </svg>
              <CheckIcon v-else class="w-5 h-5" />
            </button>
          </div>
        </div>

        <!-- Body: form + side comments -->
        <div class="flex-1 min-h-0 flex flex-col lg:flex-row">
          <div class="flex-1 overflow-y-auto p-6 scr">
            <DealForm :deal="deal" :disabled="!canEdit" @submit="p => emit('submit', p)" />
          </div>

          <div
            v-if="deal"
            class="lg:w-80 shrink-0 overflow-y-auto p-6 border-t lg:border-t-0 lg:border-l border-sm-hair dark:border-white/10 bg-sm-surface/60 dark:bg-black/10 scr"
          >
            <DealComments :deal-id="deal.id" />
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { XMarkIcon, TrashIcon, CheckIcon, LockClosedIcon } from '@heroicons/vue/24/outline'
import DealForm from './DealForm.vue'
import DealComments from './DealComments.vue'
import type { Deal, NewDeal } from '@/types/crm'
import { useSessionStore } from '@/stores/session'
import { canDeleteDeals, canEditDeal } from '@/lib/crmUtils'

const props = defineProps<{
  isOpen: boolean
  deal?: Deal | null
  saving?: boolean
}>()

const emit = defineEmits<{
  close: []
  submit: [payload: NewDeal]
  delete: []
}>()

const session = useSessionStore()
const canDelete = computed(() => canDeleteDeals(session.currentUser))
// Creating a new deal is always allowed; editing an existing one is owner/admin-gated.
const canEdit = computed(() => !props.deal || canEditDeal(session.currentUser, props.deal))
</script>
