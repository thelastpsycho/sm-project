<template>
  <div class="w-full">
    <label v-if="label" :for="id" class="block sm-eyebrow mb-2">
      {{ label }}
      <span v-if="required" class="text-sm-bad ml-1">*</span>
    </label>
    <select
      :id="id"
      :name="name"
      :value="modelValue"
      :disabled="disabled"
      :required="required"
      :class="selectClasses"
      @change="$emit('update:modelValue', ($event.target as HTMLSelectElement).value)"
    >
      <option v-if="placeholder" value="" disabled selected>{{ placeholder }}</option>
      <option
        v-for="option in options"
        :key="option.value"
        :value="option.value"
      >
        {{ option.label }}
      </option>
    </select>
    <p v-if="error" class="mt-1 text-xs text-red-500 dark:text-red-400">
      {{ error }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Option {
  value: string
  label: string
}

interface Props {
  modelValue?: string
  label?: string
  name?: string
  placeholder?: string
  options: Option[]
  disabled?: boolean
  required?: boolean
  error?: string
  size?: 'sm' | 'md' | 'lg'
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
  required: false,
  size: 'md'
})

defineEmits<{
  'update:modelValue': [value: string]
}>()

const id = computed(() => `select-${Math.random().toString(36).substr(2, 9)}`)

const selectClasses = computed(() => {
  const baseClasses = 'block w-full border-0 border-b rounded-none bg-transparent focus:ring-0 focus:outline-none transition-colors duration-200 appearance-none cursor-pointer'

  const sizeClasses = {
    sm: 'py-2 text-sm',
    md: 'py-2.5 text-base',
    lg: 'py-3 text-lg'
  }

  const stateClasses = props.error
    ? 'border-sm-bad text-sm-bad'
    : 'border-sm-line text-sm-ink dark:text-white dark:border-white/15 focus:border-sm-ink dark:focus:border-white'

  const disabledClasses = props.disabled ? 'opacity-50 cursor-not-allowed' : ''

  return `${baseClasses} ${sizeClasses[props.size]} ${stateClasses} ${disabledClasses} bg-[url('data:image/svg+xml,%3csvg xmlns=\\'http://www.w3.org/2000/svg\\' fill=\\'none\\' viewBox=\\'0 0 20 20\\'%3e%3cpath stroke=\\'%238E8E93\\' stroke-linecap=\\'round\\' stroke-linejoin=\\'round\\' stroke-width=\\'1.5\\' d=\\'M6 8l4 4 4-4\\'/%3e%3c/svg%3e')] bg-[right_center] bg-no-repeat pr-8`
})
</script>