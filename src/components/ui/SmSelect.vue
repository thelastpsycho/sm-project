<template>
  <div class="w-full">
    <label v-if="label" :for="id" class="block text-xs font-normal text-gray-600 dark:text-gray-400 mb-2">
      {{ label }}
      <span v-if="required" class="text-red-500 ml-1">*</span>
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
  const baseClasses = 'block w-full border-0 rounded-lg bg-gray-50 dark:bg-gray-800 focus:ring-2 focus:ring-offset-0 transition-all duration-200 appearance-none cursor-pointer'

  const sizeClasses = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-4 py-3 text-sm',
    lg: 'px-5 py-4 text-base'
  }

  const stateClasses = props.error
    ? 'ring-2 ring-red-500 text-gray-900 dark:text-white'
    : 'ring-1 ring-gray-200 dark:ring-gray-700 text-gray-900 dark:text-white focus:ring-sm-primary focus:border-transparent'

  const disabledClasses = props.disabled ? 'opacity-60 cursor-not-allowed bg-gray-100 dark:bg-gray-900' : ''

  return `${baseClasses} ${sizeClasses[props.size]} ${stateClasses} ${disabledClasses} bg-[url('data:image/svg+xml,%3csvg xmlns=\\'http://www.w3.org/2000/svg\\' fill=\\'none\\' viewBox=\\'0 0 20 20\\'%3e%3cpath stroke=\\'%236b7280\\' stroke-linecap=\\'round\\' stroke-linejoin=\\'round\\' stroke-width=\\'1.5\\' d=\\'M6 8l4 4 4-4\\'/%3e%3c/svg%3e')] bg-right bg-no-repeat pr-10`
})
</script>