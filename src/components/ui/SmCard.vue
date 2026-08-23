<template>
  <div :class="cardClasses">
    <div v-if="$slots.header" class="px-6 py-4 border-b border-sm-line dark:border-white/10">
      <slot name="header" />
    </div>
    <div :class="contentClasses">
      <slot />
    </div>
    <div v-if="$slots.footer" class="px-6 py-4 border-t border-sm-line dark:border-white/10">
      <slot name="footer" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  padding?: 'none' | 'sm' | 'md' | 'lg'
  shadow?: 'none' | 'sm' | 'md' | 'lg'
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'full'
  class?: string
}

const props = withDefaults(defineProps<Props>(), {
  padding: 'md',
  shadow: 'md',
  rounded: 'md'
})

const cardClasses = computed(() => {
  const baseClasses = 'bg-white dark:bg-sm-card-dark border border-sm-line dark:border-white/10'

  // Shadows are intentionally near-flat in this system; hairline borders carry
  // the surface separation instead.
  const shadowClasses = {
    none: '',
    sm: '',
    md: 'shadow-sm shadow-black/5',
    lg: 'shadow-md shadow-black/5'
  }

  const roundedClasses = {
    none: '',
    sm: 'rounded-lg',
    md: 'rounded-2xl',
    lg: 'rounded-3xl',
    full: 'rounded-full'
  }

  return `${baseClasses} ${shadowClasses[props.shadow]} ${roundedClasses[props.rounded]} ${props.class || ''}`
})

const contentClasses = computed(() => {
  const paddingClasses = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8'
  }

  return paddingClasses[props.padding]
})
</script>