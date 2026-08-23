<template>
  <button
    :type="type"
    :disabled="disabled"
    :class="buttonClasses"
    @click="$emit('click', $event)"
  >
    <span v-if="loading" class="inline-block mr-2">
      <svg class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
    </span>
    <slot>{{ label }}</slot>
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  label?: string
  variant?: 'primary' | 'secondary' | 'ghost'
  type?: 'button' | 'submit'
  disabled?: boolean
  loading?: boolean
  size?: 'sm' | 'md' | 'lg'
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'primary',
  type: 'button',
  disabled: false,
  loading: false,
  size: 'md'
})

defineEmits<{
  click: [event: Event]
}>()

const buttonClasses = computed(() => {
  const baseClasses = 'inline-flex items-center justify-center font-bold rounded-xl transition-all active:scale-[0.98] focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100'

  const sizeClasses = {
    sm: 'px-4 py-2 text-[13px]',
    md: 'px-5 py-3 text-sm',
    lg: 'px-6 py-4 text-[15px]'
  }

  // Ink-first: the one strong action per screen is near-black; blue is reserved
  // for inline text links, so it is intentionally not a filled variant here.
  const variantClasses = {
    primary: 'bg-sm-ink text-white hover:bg-black dark:bg-white dark:text-sm-ink dark:hover:bg-gray-100',
    secondary: 'bg-transparent text-sm-ink border border-sm-line hover:bg-sm-surface dark:text-white dark:border-white/15 dark:hover:bg-white/5',
    ghost: 'bg-transparent text-sm-muted hover:text-sm-ink dark:text-gray-400 dark:hover:text-white'
  }

  return `${baseClasses} ${sizeClasses[props.size]} ${variantClasses[props.variant]}`
})
</script>