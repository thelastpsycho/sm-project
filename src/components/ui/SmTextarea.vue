<template>
  <div class="w-full">
    <label v-if="label" :for="id" class="block sm-eyebrow mb-2">
      {{ label }}
      <span v-if="required" class="text-sm-bad ml-1">*</span>
    </label>
    <textarea
      :id="id"
      :value="modelValue"
      :rows="rows"
      :placeholder="placeholder"
      :disabled="disabled"
      :readonly="readonly"
      :required="required"
      :class="textareaClasses"
      @input="$emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
      @blur="$emit('blur', $event)"
      @focus="$emit('focus', $event)"
    ></textarea>
    <p v-if="error" class="mt-1 text-xs text-red-500 dark:text-red-400">
      {{ error }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  modelValue?: string
  label?: string
  rows?: number
  placeholder?: string
  disabled?: boolean
  readonly?: boolean
  required?: boolean
  error?: string
  resize?: 'none' | 'vertical' | 'horizontal' | 'both'
}

const props = withDefaults(defineProps<Props>(), {
  rows: 4,
  disabled: false,
  readonly: false,
  required: false,
  resize: 'vertical'
})

defineEmits<{
  'update:modelValue': [value: string]
  blur: [event: FocusEvent]
  focus: [event: FocusEvent]
}>()

const id = computed(() => `textarea-${Math.random().toString(36).substr(2, 9)}`)

const textareaClasses = computed(() => {
  const baseClasses = 'block w-full border rounded-xl bg-transparent px-4 py-3 text-base focus:ring-0 focus:outline-none transition-colors duration-200'

  const resizeClasses = {
    none: 'resize-none',
    vertical: 'resize-y',
    horizontal: 'resize-x',
    both: 'resize'
  }

  const stateClasses = props.error
    ? 'border-sm-bad text-sm-bad placeholder-sm-bad/50'
    : 'border-sm-line text-sm-ink placeholder-sm-faint dark:text-white dark:border-white/15 dark:placeholder-gray-500 focus:border-sm-ink dark:focus:border-white'

  const disabledClasses = props.disabled ? 'opacity-50 cursor-not-allowed' : ''

  return `${baseClasses} ${stateClasses} ${disabledClasses} ${resizeClasses[props.resize]}`
})
</script>