import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

export const useThemeStore = defineStore('theme', () => {
  const theme = ref<'light' | 'dark' | 'system'>('system')

  const loadTheme = () => {
    const saved = localStorage.getItem('theme') as 'light' | 'dark' | 'system' | null
    if (saved) {
      theme.value = saved
    }
  }

  const setTheme = (newTheme: 'light' | 'dark' | 'system') => {
    theme.value = newTheme
    localStorage.setItem('theme', newTheme)
    applyTheme()
  }

  const toggleTheme = () => {
    if (theme.value === 'light') {
      setTheme('dark')
    } else if (theme.value === 'dark') {
      setTheme('system')
    } else {
      setTheme('light')
    }
  }

  const applyTheme = () => {
    const html = document.documentElement

    if (theme.value === 'dark') {
      html.classList.add('dark')
    } else if (theme.value === 'light') {
      html.classList.remove('dark')
    } else {
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      if (isDark) {
        html.classList.add('dark')
      } else {
        html.classList.remove('dark')
      }
    }
  }

  watch(theme, applyTheme)

  loadTheme()

  return {
    theme,
    setTheme,
    toggleTheme,
    applyTheme
  }
})