<script setup lang="ts">
import type { LikertOption } from '@/types/survey'

interface Props {
  questionId: string
  question: string
  modelValue: number
  likertOptions: LikertOption[]
  error?: string
  questionNumber?: number
}

interface Emits {
  (e: 'update:modelValue', value: number): void
}

const props = withDefaults(defineProps<Props>(), {
  questionNumber: 1
})

const emit = defineEmits<Emits>()

function selectOption(value: number) {
  emit('update:modelValue', value)
}
</script>

<template>
  <div class="mb-6 sm:mb-8 last:mb-0">
    <!-- Question -->
    <p class="text-sm sm:text-base text-gray-800 mb-5 leading-relaxed">
      <span class="text-teal-500 mr-2 font-medium">{{ questionNumber }}.</span>
      {{ question }}
    </p>

    <!-- Rating Scale -->
    <div class="space-y-3">
      <div class="flex items-stretch gap-2 sm:gap-3">
        <button
          v-for="option in likertOptions"
          :key="`${questionId}-${option.value}`"
          type="button"
          :class="[
            'flex-1 flex items-center justify-center py-3.5 sm:py-4 rounded-xl transition-all duration-200',
            modelValue === option.value
              ? 'bg-teal-500 text-white shadow-sm'
              : 'bg-gray-50 text-gray-600 hover:bg-teal-50 hover:text-teal-600 active:scale-95'
          ]"
          @click="selectOption(option.value)"
        >
          <!-- Score Number -->
          <span :class="[
            'text-lg sm:text-xl transition-all',
            modelValue === option.value ? 'font-semibold' : 'font-normal'
          ]">{{ option.value }}</span>
        </button>
      </div>

      <!-- Labels Row -->
      <div class="flex items-stretch gap-2 sm:gap-3">
        <div
          v-for="option in likertOptions"
          :key="`${questionId}-${option.value}-label`"
          class="flex-1 text-center"
        >
          <span :class="[
            'text-[11px] sm:text-xs transition-all leading-relaxed block capitalize',
            modelValue === option.value ? 'text-teal-600 font-medium' : 'text-gray-400'
          ]">{{ option.label }}</span>
        </div>
      </div>
    </div>

    <!-- Error -->
    <p v-if="error" class="mt-2 text-sm text-red-500">{{ error }}</p>
  </div>
</template>
