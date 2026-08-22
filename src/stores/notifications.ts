import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { doc, updateDoc } from 'firebase/firestore'
import { db, COLLECTIONS } from '@/lib/firebase'
import { useCrmStore } from './crm'
import { useSessionStore } from './session'
import { computeUserAlerts, countUnread, DEFAULT_ALERT_CONFIG } from '@/lib/crmAlerts'

/**
 * In-app notification inbox. Alerts are DERIVED from the deals already loaded in the
 * CRM store (no separate backend), so this is just a thin layer over `crmAlerts` plus
 * an "unread since" marker persisted to the user's doc (and localStorage as a cache).
 */
export const useNotificationsStore = defineStore('notifications', () => {
  const crm = useCrmStore()
  const session = useSessionStore()

  const localSeenAt = ref<string | null>(localStorage.getItem('notificationsSeenAt'))

  // Prefer the user's synced value; fall back to the local cache.
  const seenAt = computed<string | null>(() => {
    const remote = session.currentUser?.notificationsSeenAt ?? null
    if (remote && localSeenAt.value) return remote > localSeenAt.value ? remote : localSeenAt.value
    return remote ?? localSeenAt.value
  })

  const myAlerts = computed(() => {
    const email = session.currentUser?.email
    if (!email) return []
    return computeUserAlerts(crm.deals, email, DEFAULT_ALERT_CONFIG)
  })

  const unreadCount = computed(() => countUnread(myAlerts.value, seenAt.value))

  async function markAllRead() {
    const nowIso = new Date().toISOString()
    localSeenAt.value = nowIso
    localStorage.setItem('notificationsSeenAt', nowIso)
    const uid = session.currentUser?.uid
    if (uid) {
      try {
        await updateDoc(doc(db, COLLECTIONS.USERS, uid), { notificationsSeenAt: nowIso })
        if (session.currentUser) session.currentUser.notificationsSeenAt = nowIso
      } catch (err) {
        console.error('Failed to persist notificationsSeenAt:', err)
      }
    }
  }

  return { myAlerts, unreadCount, seenAt, markAllRead }
})
