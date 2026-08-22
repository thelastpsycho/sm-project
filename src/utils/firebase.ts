// Legacy helpers. Reuse the single Firebase app/db/auth from '@/lib/firebase' —
// initializing a second app here caused `app/duplicate-app`.
import { db, auth } from '@/lib/firebase'
import { signInAnonymously } from 'firebase/auth'

/**
 * Ensure there is *some* auth context (used by guest-facing RFP flows). If a real
 * user is already signed in (the normal in-app case), this is a no-op; otherwise it
 * falls back to anonymous sign-in.
 */
export const ensureAuth = async () => {
  if (!auth.currentUser) {
    try {
      await signInAnonymously(auth)
    } catch (error) {
      console.error('Error signing in anonymously:', error)
      throw error
    }
  }
  return auth.currentUser
}

export { db, auth }
