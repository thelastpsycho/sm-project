<script setup lang="ts">
import { cn } from '@/lib/surveyUtils'
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
  <div class="mb-6 sm:mb-7 last:mb-0">
    <p class="text-sm sm:text-base text-gray-900 dark:text-white mb-3.5 leading-relaxed">
      <span class="text-sm-primary mr-1.5">{{ questionNumber }}.</span>
      {{ question }}
    </p>
    <div class="flex flex-wrap gap-2 sm:gap-2.5">
      <button
        v-for="option in likertOptions"
        :key="`${questionId}-${option.value}`"
        type="button"
        :class="cn(
          'star-btn',
          modelValue === option.value && 'selected',
          error && !modelValue && 'border-red-300'
        )"
        @click="selectOption(option.value)"
      >
        <span class="star-number">{{ option.value }}</span>
        <span class="star-label">{{ option.label }}</span>
      </button>
    </div>
    <p v-if="error" class="mt-2 text-sm text-red-500">{{ error }}</p>
  </div>
</template>

<style scoped>
.star-btn {
  flex: 1;
  min-width: 56px;
  aspect-ratio: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
  border-radius: 0.625rem;
  border: 1px solid rgb(98 159 173 / 0.2);
  background: white;
  cursor: pointer;
  transition: all 0.25s ease;
  font-family: inherit;
}

@media (max-width: 640px) {
  .star-btn {
    min-width: 52px;
    aspect-ratio: 1;
  }
}

.star-btn:hover {
  border-color: #629FAD;
  background-color: rgb(98 159 173 / 0.05);
  transform: translateY(-1px);
}

.star-btn.selected {
  background: #629FAD;
  border-color: #629FAD;
  color: white;
  box-shadow: 0 2px 8px rgb(98 159 173 / 0.25);
}

.star-btn .star-number {
  font-size: 1.125rem;
  font-weight: 400;
  opacity: 0.8;
}

@media (max-width: 640px) {
  .star-btn .star-number {
    font-size: 1rem;
  }
}

.star-btn.selected .star-number {
  font-weight: 500;
  opacity: 1;
}

.star-btn .star-label {
  font-size: 0.625rem;
  font-weight: 400;
  text-transform: capitalize;
  letter-spacing: 0.02em;
  opacity: 0.6;
}

@media (max-width: 640px) {
  .star-btn .star-label {
    font-size: 0.5625rem;
  }
}

.star-btn.selected .star-label {
  opacity: 0.9;
  font-weight: 500;
}
</style>
