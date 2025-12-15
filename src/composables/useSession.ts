import { computed } from 'vue'
import { useSessionStore } from '@/stores/session'

export function useSession() {
  const sessionStore = useSessionStore()

  const sessionId = computed(() => sessionStore.sessionId)
  const createdAt = computed(() => sessionStore.createdAt)

  const ensureSession = () => {
    return sessionStore.ensureSession()
  }

  const clearSession = () => {
    sessionStore.clearSession()
  }

  return {
    sessionId,
    createdAt,
    ensureSession,
    clearSession
  }
}