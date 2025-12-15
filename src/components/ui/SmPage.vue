<template>
  <div class="min-h-screen bg-sm-bg dark:bg-sm-bg-dark">
    <div :class="containerClasses">
      <slot />
      <div v-if="withBottomNavPadding" class="h-20"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  withBottomNavPadding?: boolean
  class?: string
}

const props = withDefaults(defineProps<Props>(), {
  maxWidth: 'sm',
  withBottomNavPadding: false
})

const containerClasses = computed(() => {
  const maxWidthClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-full'
  }

  return `mx-auto px-4 py-6 ${maxWidthClasses[props.maxWidth]} ${props.class || ''}`
})
</script>