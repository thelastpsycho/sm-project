import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

// Small UI-state store. Currently tracks whether the desktop SideRail is
// collapsed (icons only). Persisted so the choice survives reloads.
export const useUiStore = defineStore('ui', () => {
  const railCollapsed = ref(localStorage.getItem('railCollapsed') === 'true')

  function toggleRail() {
    railCollapsed.value = !railCollapsed.value
  }

  watch(railCollapsed, v => localStorage.setItem('railCollapsed', String(v)))

  return { railCollapsed, toggleRail }
})
