<template>
  <button
    @click="toggleTheme"
    :class="buttonClasses"
    :aria-label="`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`"
  >
    <SunIcon v-if="theme === 'dark'" class="h-5 w-5" />
    <MoonIcon v-else class="h-5 w-5" />
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { SunIcon, MoonIcon } from '@heroicons/vue/24/outline'
import { useTheme } from '@/composables/useTheme'

const { theme, toggleTheme } = useTheme()

const buttonClasses = computed(() => {
  return 'p-2 text-sm-secondary hover:text-sm-primary hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors'
})
</script>