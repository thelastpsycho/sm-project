import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { getDoc, doc, setDoc } from 'firebase/firestore'
import { db, COLLECTIONS } from '@/lib/firebase'
import { hashPin } from '@/lib/surveyUtils'
import { DEFAULT_ADMIN_PIN, DEFAULT_REVIEW_THRESHOLD } from '@/lib/surveyConstants'

export const useAdminStore = defineStore('admin', () => {
  // State
  const isAuthenticated = ref(false)
  const loginError = ref<string | null>(null)
  const loading = ref(false)

  // Computed
  const canAccessAdmin = computed(() => isAuthenticated.value)

  // Actions
  async function login(pin: string): Promise<boolean> {
    loading.value = true
    loginError.value = null

    try {
      const hashedInput = await hashPin(pin)

      // Check if Firebase is configured
      if (!db) {
        loginError.value = 'Firebase not configured. Please check your .env file.'
        console.error('Firebase Firestore not initialized')
        return false
      }

      const settingsDoc = await getDoc(doc(db, COLLECTIONS.ADMIN_SETTINGS, 'config'))

      if (!settingsDoc.exists()) {
        // First time setup - create default config
        const defaultHashedPin = await hashPin(DEFAULT_ADMIN_PIN)
        await setDoc(doc(db, COLLECTIONS.ADMIN_SETTINGS, 'config'), {
          adminPinHash: defaultHashedPin,
          reviewThreshold: DEFAULT_REVIEW_THRESHOLD,
          googleReviewUrl: 'https://search.google.com/local/writereview'
        })

        // Check if input matches default
        if (hashedInput === defaultHashedPin) {
          setAuthenticated(true)
          return true
        }
      } else {
        const settings = settingsDoc.data()
        if (hashedInput === settings.adminPinHash) {
          setAuthenticated(true)
          return true
        }
      }

      loginError.value = 'Invalid PIN. Please try again.'
      return false
    } catch (err: any) {
      console.error('Login error:', err)
      // Provide more detailed error message
      if (err?.code === 'permission-denied') {
        loginError.value = 'Firebase permission denied. Check your Firestore security rules.'
      } else if (err?.code === 'not-found') {
        loginError.value = 'Firebase project not found. Check your configuration.'
      } else {
        loginError.value = err?.message || 'An error occurred. Please try again.'
      }
      return false
    } finally {
      loading.value = false
    }
  }

  function logout() {
    setAuthenticated(false)
  }

  function setAuthenticated(value: boolean) {
    isAuthenticated.value = value
    if (value) {
      localStorage.setItem('adminAuthenticated', 'true')
    } else {
      localStorage.removeItem('adminAuthenticated')
    }
  }

  function checkAuth() {
    const storedAuth = localStorage.getItem('adminAuthenticated')
    if (storedAuth === 'true') {
      isAuthenticated.value = true
    }
  }

  return {
    // State
    isAuthenticated,
    loginError,
    loading,
    // Computed
    canAccessAdmin,
    // Actions
    login,
    logout,
    setAuthenticated,
    checkAuth
  }
})
