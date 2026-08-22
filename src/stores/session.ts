import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail
} from 'firebase/auth'
import type { User as FirebaseUser } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db, COLLECTIONS } from '@/lib/firebase'
import type { User, UserRole, UserStatus } from '@/types/user'

export const useSessionStore = defineStore('session', () => {
  // ---- Device/chat session id (unrelated to auth; used by chat rooms) ----
  const sessionId = ref<string>('')
  const createdAt = ref<number>(0)

  // ---- Auth state ----
  const isAuthenticated = ref<boolean>(false)
  const currentUser = ref<User | null>(null)
  const authError = ref<string | null>(null)

  // Resolves after the first auth-state callback + profile hydration, so the router
  // can wait before deciding whether to redirect to /login (avoids refresh flicker).
  let markReady!: () => void
  let readyResolved = false
  const authReady = new Promise<void>(res => {
    markReady = () => {
      if (!readyResolved) {
        readyResolved = true
        res()
      }
    }
  })

  const ensureSession = () => {
    if (!sessionId.value) {
      const existing = localStorage.getItem('sessionId')
      if (existing) {
        sessionId.value = existing
        createdAt.value = parseInt(localStorage.getItem('sessionCreatedAt') || '0')
      } else {
        // Fallback for non-secure contexts (LAN mobile) where crypto.randomUUID is undefined
        if (typeof crypto !== 'undefined' && crypto.randomUUID) {
          sessionId.value = crypto.randomUUID()
        } else {
          sessionId.value = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            const r = (Math.random() * 16) | 0,
              v = c == 'x' ? r : (r & 0x3) | 0x8
            return v.toString(16)
          })
        }
        createdAt.value = Date.now()
        localStorage.setItem('sessionId', sessionId.value)
        localStorage.setItem('sessionCreatedAt', createdAt.value.toString())
      }
    }
    return sessionId.value
  }

  /** Load the user's profile (role/status/metadata) from the `users` collection. */
  async function hydrateProfile(fbUser: FirebaseUser): Promise<boolean> {
    const snap = await getDoc(doc(db, COLLECTIONS.USERS, fbUser.uid))
    if (!snap.exists()) {
      authError.value = 'Your account is not set up yet. Please contact an administrator.'
      await signOut(auth)
      return false
    }
    const data = snap.data()
    if ((data.status as UserStatus) === 'disabled') {
      authError.value = 'This account has been deactivated.'
      await signOut(auth)
      return false
    }
    currentUser.value = {
      uid: fbUser.uid,
      email: fbUser.email ?? data.email ?? '',
      name: data.name ?? '',
      position: data.position ?? '',
      phone: data.phone ?? '',
      role: (data.role as UserRole) ?? 'sales',
      status: (data.status as UserStatus) ?? 'active',
      fcmTokens: Array.isArray(data.fcmTokens) ? data.fcmTokens : undefined,
      notificationsSeenAt:
        data.notificationsSeenAt?.toDate?.()?.toISOString?.() ?? data.notificationsSeenAt
    }
    isAuthenticated.value = true
    return true
  }

  // Restore/track the Firebase session across reloads.
  onAuthStateChanged(auth, async fbUser => {
    try {
      if (fbUser) {
        const ok = await hydrateProfile(fbUser)
        if (!ok) {
          currentUser.value = null
          isAuthenticated.value = false
        }
      } else {
        currentUser.value = null
        isAuthenticated.value = false
      }
    } finally {
      markReady()
    }
  })

  /** Email/password sign-in. Throws (with a friendly message) on failure. */
  const login = async (email: string, password: string): Promise<void> => {
    authError.value = null
    try {
      const cred = await signInWithEmailAndPassword(auth, email.trim(), password)
      const ok = await hydrateProfile(cred.user)
      if (!ok) throw new Error(authError.value ?? 'Login failed')
    } catch (err: any) {
      // Surface a friendly message; deactivated/not-set-up already set authError above.
      if (!authError.value) {
        const code = err?.code ?? ''
        authError.value =
          code.includes('auth/') ? 'Incorrect email or password.' : err?.message ?? 'Login failed'
      }
      throw err
    }
  }

  const logout = async () => {
    await signOut(auth)
    currentUser.value = null
    isAuthenticated.value = false
  }

  const sendPasswordReset = async (email: string) => {
    await sendPasswordResetEmail(auth, email.trim())
  }

  const clearSession = () => {
    sessionId.value = ''
    createdAt.value = 0
    localStorage.removeItem('sessionId')
    localStorage.removeItem('sessionCreatedAt')
  }

  return {
    sessionId,
    createdAt,
    isAuthenticated,
    currentUser,
    authError,
    authReady,
    ensureSession,
    clearSession,
    login,
    logout,
    sendPasswordReset
  }
})
