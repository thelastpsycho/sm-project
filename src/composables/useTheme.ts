import { computed } from 'vue'
import { useThemeStore } from '@/stores/theme'

export function useTheme() {
  const themeStore = useThemeStore()

  const theme = computed(() => themeStore.theme)
  const isDark = computed(() => {
    if (theme.value === 'dark') return true
    if (theme.value === 'light') return false
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  const setTheme = (newTheme: 'light' | 'dark' | 'system') => {
    themeStore.setTheme(newTheme)
  }

  const toggleTheme = () => {
    themeStore.toggleTheme()
  }

  return {
    theme,
    isDark,
    setTheme,
    toggleTheme
  }
}