// Web-push (FCM) client helpers. The background handler lives in
// public/firebase-messaging-sw.js; this module registers it and manages the token.

import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging'
import { arrayUnion, doc, updateDoc } from 'firebase/firestore'
import { app, db, COLLECTIONS } from '@/lib/firebase'
import { useSessionStore } from '@/stores/session'

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY as string | undefined

// The FCM service worker needs the Firebase config, which a SW can't read from
// import.meta.env — so we pass the public config via query string at registration.
function swUrl(): string {
  const params = new URLSearchParams({
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? '',
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? '',
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? '',
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? '',
    appId: import.meta.env.VITE_FIREBASE_APP_ID ?? ''
  })
  return `/firebase-messaging-sw.js?${params.toString()}`
}

export async function isPushSupported(): Promise<boolean> {
  try {
    return 'serviceWorker' in navigator && 'Notification' in window && (await isSupported())
  } catch {
    return false
  }
}

/**
 * Register the FCM service worker (safe: it has no fetch handler, so it doesn't cache
 * anything). Called once at app start in production; also gives the app an installable SW.
 */
export async function registerPushSw(): Promise<ServiceWorkerRegistration | null> {
  if (!(await isPushSupported())) return null
  try {
    return await navigator.serviceWorker.register(swUrl())
  } catch (err) {
    console.error('Failed to register push SW:', err)
    return null
  }
}

/** Ask permission, mint a device token, and save it to the user's doc. */
export async function enablePush(): Promise<{ ok: boolean; reason?: string }> {
  if (!(await isPushSupported())) {
    return { ok: false, reason: 'Notifications are not supported on this device/browser.' }
  }
  if (!VAPID_KEY) {
    return { ok: false, reason: 'Push is not configured yet (missing VAPID key).' }
  }
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') {
    return { ok: false, reason: 'Notifications permission was not granted.' }
  }
  const registration = (await registerPushSw()) ?? undefined
  try {
    const messaging = getMessaging(app)
    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration
    })
    if (!token) return { ok: false, reason: 'Could not obtain a device token.' }

    const session = useSessionStore()
    const uid = session.currentUser?.uid
    if (uid) {
      await updateDoc(doc(db, COLLECTIONS.USERS, uid), { fcmTokens: arrayUnion(token) })
    }
    return { ok: true }
  } catch (err: any) {
    console.error('enablePush failed:', err)
    return { ok: false, reason: err?.message ?? 'Could not enable notifications.' }
  }
}

/** Foreground messages (app open): let the caller refresh the inbox / show a toast. */
export async function listenForegroundPush(onNotify: (title: string, body: string) => void) {
  if (!(await isPushSupported())) return
  try {
    const messaging = getMessaging(app)
    onMessage(messaging, payload => {
      const n = payload.notification
      onNotify(n?.title ?? 'Pipeline alert', n?.body ?? '')
    })
  } catch (err) {
    console.error('Foreground push listener failed:', err)
  }
}
