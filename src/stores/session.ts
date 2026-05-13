import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { User } from '@/types/user'
import userData from '@/user.json'

export const useSessionStore = defineStore('session', () => {
  const sessionId = ref<string>('')
  const createdAt = ref<number>(0)
  const isAuthenticated = ref<boolean>(false)
  const currentUser = ref<User | null>(null)

  const ensureSession = () => {
    if (!sessionId.value) {
      const existing = localStorage.getItem('sessionId')
      if (existing) {
        sessionId.value = existing
        createdAt.value = parseInt(localStorage.getItem('sessionCreatedAt') || '0')
        isAuthenticated.value = localStorage.getItem('isAuthenticated') === 'true'
        const savedUser = localStorage.getItem('currentUser')
        if (savedUser) {
          currentUser.value = JSON.parse(savedUser) as User
        }
      } else {
        // Fallback for non-secure contexts (LAN mobile) where crypto.randomUUID is undefined
        if (typeof crypto !== 'undefined' && crypto.randomUUID) {
          sessionId.value = crypto.randomUUID()
        } else {
          sessionId.value = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
          });
        }
        createdAt.value = Date.now()
        localStorage.setItem('sessionId', sessionId.value)
        localStorage.setItem('sessionCreatedAt', createdAt.value.toString())
      }
    }
    return sessionId.value
  }

  const login = (pin: string): boolean => {
    const users = userData as User[]
    const user = users.find(u => u.pin === pin)

    if (user) {
      currentUser.value = user
      isAuthenticated.value = true
      localStorage.setItem('isAuthenticated', 'true')
      localStorage.setItem('currentUser', JSON.stringify(user))
      return true
    }
    return false
  }

  const logout = () => {
    currentUser.value = null
    isAuthenticated.value = false
    localStorage.removeItem('isAuthenticated')
    localStorage.removeItem('currentUser')
  }

  const clearSession = () => {
    sessionId.value = ''
    createdAt.value = 0
    isAuthenticated.value = false
    currentUser.value = null
    localStorage.removeItem('sessionId')
    localStorage.removeItem('sessionCreatedAt')
    localStorage.removeItem('isAuthenticated')
    localStorage.removeItem('currentUser')
  }

  return {
    sessionId,
    createdAt,
    isAuthenticated,
    currentUser,
    ensureSession,
    clearSession,
    login,
    logout
  }
})