<template>
  <div class="w-full">
    <label v-if="label" :for="id" class="block text-xs font-normal text-gray-600 dark:text-gray-400 mb-2">
      {{ label }}
      <span v-if="required" class="text-red-500 ml-1">*</span>
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
  const baseClasses = 'block w-full border-0 rounded-lg bg-gray-50 dark:bg-gray-800 focus:ring-2 focus:ring-offset-0 transition-all duration-200'

  const resizeClasses = {
    none: 'resize-none',
    vertical: 'resize-y',
    horizontal: 'resize-x',
    both: 'resize'
  }

  const stateClasses = props.error
    ? 'ring-2 ring-red-500 text-red-900 placeholder-red-400 dark:text-red-100 dark:placeholder-red-500'
    : 'ring-1 ring-gray-200 dark:ring-gray-700 text-gray-900 placeholder-gray-500 dark:text-white dark:placeholder-gray-400 focus:ring-sm-primary focus:border-transparent'

  const disabledClasses = props.disabled ? 'opacity-60 cursor-not-allowed bg-gray-100 dark:bg-gray-900' : ''

  return `${baseClasses} ${stateClasses} ${disabledClasses} ${resizeClasses[props.resize]}`
})
</script>