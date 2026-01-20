<script setup lang="ts">
import SmTextarea from '@/components/ui/SmTextarea.vue'

interface Props {
  questionId: string
  question: string
  modelValue: string
  error?: string
  questionNumber?: number
  placeholder?: string
}

interface Emits {
  (e: 'update:modelValue', value: string): void
}

const props = withDefaults(defineProps<Props>(), {
  questionNumber: 1,
  placeholder: 'Please share your thoughts...'
})

const emit = defineEmits<Emits>()

function updateValue(value: string) {
  emit('update:modelValue', value)
}
</script>

<template>
  <div class="mb-5 sm:mb-6 last:mb-0">
    <p class="text-sm sm:text-base text-gray-900 dark:text-white mb-3 leading-relaxed">
      <span class="text-sm-primary mr-1.5">{{ questionNumber }}.</span>
      {{ question }}
    </p>
    <SmTextarea
      :id="questionId"
      :placeholder="placeholder"
      :model-value="modelValue"
      :error="error"
      :rows="3"
      @update:model-value="updateValue"
    />
  </div>
</template>
