<template>
  <div class="w-full">
    <label v-if="label" :for="id" class="block sm-eyebrow mb-2">
      {{ label }}
      <span v-if="required" class="text-sm-bad ml-1">*</span>
    </label>
    <input
      :id="id"
      :type="type"
      :name="name"
      :value="modelValue"
      :placeholder="placeholder"
      :disabled="disabled"
      :readonly="readonly"
      :required="required"
      :class="inputClasses"
      @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      @blur="$emit('blur', $event)"
      @focus="$emit('focus', $event)"
    />
    <p v-if="error" class="mt-1 text-xs text-red-500 dark:text-red-400">
      {{ error }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  modelValue?: string | number
  label?: string
  type?: 'text' | 'email' | 'tel' | 'password' | 'number' | 'url' | 'date'
  name?: string
  placeholder?: string
  disabled?: boolean
  readonly?: boolean
  required?: boolean
  error?: string
  size?: 'sm' | 'md' | 'lg'
}

const props = withDefaults(defineProps<Props>(), {
  type: 'text',
  disabled: false,
  readonly: false,
  required: false,
  size: 'md'
})

defineEmits<{
  'update:modelValue': [value: string]
  blur: [event: FocusEvent]
  focus: [event: FocusEvent]
}>()

const id = computed(() => `input-${Math.random().toString(36).substr(2, 9)}`)

const inputClasses = computed(() => {
  // Hairline underline field: transparent, one bottom rule that inks on focus.
  const baseClasses = 'block w-full border-0 border-b bg-transparent rounded-none focus:ring-0 focus:outline-none transition-colors duration-200 [color-scheme:light] dark:[color-scheme:dark]'

  const sizeClasses = {
    sm: 'py-2 text-sm',
    md: 'py-2.5 text-base',
    lg: 'py-3 text-lg'
  }

  const stateClasses = props.error
    ? 'border-sm-bad text-sm-bad placeholder-sm-bad/50'
    : 'border-sm-line text-sm-ink placeholder-sm-faint dark:text-white dark:border-white/15 dark:placeholder-gray-500 focus:border-sm-ink dark:focus:border-white'

  const disabledClasses = props.disabled ? 'opacity-50 cursor-not-allowed' : ''

  return `${baseClasses} ${sizeClasses[props.size]} ${stateClasses} ${disabledClasses}`
})
</script>