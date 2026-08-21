<template>
  <Transition
    enter-active-class="transition duration-150 ease-out"
    enter-from-class="opacity-0"
    enter-to-class="opacity-100"
    leave-active-class="transition duration-150 ease-in"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <div v-if="open" class="fixed inset-0 z-[70] flex items-center justify-center p-4" role="alertdialog" aria-modal="true">
      <div class="fixed inset-0 bg-black/50 backdrop-blur-sm" @click="!loading && emit('cancel')"></div>

      <div class="relative bg-white dark:bg-sm-card-dark w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden animate-fade-in-up">
        <div class="p-6">
          <div class="flex items-start gap-3">
            <div
              class="shrink-0 w-10 h-10 rounded-full flex items-center justify-center"
              :class="danger ? 'bg-red-100 dark:bg-red-900/30' : 'bg-blue-100 dark:bg-blue-900/30'"
            >
              <ExclamationTriangleIcon v-if="danger" class="w-5 h-5 text-red-600 dark:text-red-400" />
              <QuestionMarkCircleIcon v-else class="w-5 h-5 text-sm-primary" />
            </div>
            <div class="min-w-0">
              <h3 class="text-base font-bold text-gray-900 dark:text-white">{{ title }}</h3>
              <p v-if="message" class="mt-1 text-sm text-gray-500 dark:text-gray-400">{{ message }}</p>
            </div>
          </div>

          <div class="mt-6 flex gap-3 justify-end">
            <button
              type="button"
              :disabled="loading"
              class="px-4 py-2 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 transition-colors disabled:opacity-50"
              @click="emit('cancel')"
            >
              {{ cancelText }}
            </button>
            <button
              type="button"
              :disabled="loading"
              class="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-colors disabled:opacity-60"
              :class="danger ? 'bg-red-600 hover:bg-red-700' : 'bg-sm-primary hover:bg-blue-700'"
              @click="emit('confirm')"
            >
              <svg v-if="loading" class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
              </svg>
              {{ confirmText }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ExclamationTriangleIcon, QuestionMarkCircleIcon } from '@heroicons/vue/24/outline'

withDefaults(
  defineProps<{
    open: boolean
    title: string
    message?: string
    confirmText?: string
    cancelText?: string
    danger?: boolean
    loading?: boolean
  }>(),
  {
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    danger: false,
    loading: false
  }
)

const emit = defineEmits<{
  confirm: []
  cancel: []
}>()
</script>
