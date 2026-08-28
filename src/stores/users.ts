import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore'
import { db, COLLECTIONS } from '@/lib/firebase'
import type { User, UserRole, UserStatus } from '@/types/user'

/**
 * The team roster, backed by the Firestore `users` collection (doc id = auth uid).
 * Source of truth for the owner picker and the admin user-management screen.
 */
export const useUsersStore = defineStore('users', () => {
  const users = ref<User[]>([])
  const loading = ref(false)
  const loaded = ref(false)
  const error = ref<string | null>(null)

  function mapUser(id: string, data: Record<string, any>): User {
    return {
      uid: id,
      name: data.name ?? '',
      position: data.position ?? '',
      email: data.email ?? '',
      phone: data.phone ?? '',
      role: (data.role as UserRole) ?? 'sales',
      status: (data.status as UserStatus) ?? 'active',
      fcmTokens: Array.isArray(data.fcmTokens) ? data.fcmTokens : undefined,
      notificationsSeenAt:
        data.notificationsSeenAt?.toDate?.()?.toISOString?.() ?? data.notificationsSeenAt
    }
  }

  async function loadUsers(force = false) {
    if (loaded.value && !force) return
    loading.value = true
    error.value = null
    try {
      // TODO(perf): needs pagination before limiting — the admin roster and the owner
      // picker both need the full user list, so a limit(N) would drop selectable users.
      const snap = await getDocs(collection(db, COLLECTIONS.USERS))
      users.value = snap.docs
        .map(d => mapUser(d.id, d.data()))
        .sort((a, b) => a.name.localeCompare(b.name))
      loaded.value = true
    } catch (err) {
      error.value = 'Failed to load users'
      console.error('Error loading users:', err)
    } finally {
      loading.value = false
    }
  }

  const activeUsers = computed(() => users.value.filter(u => (u.status ?? 'active') === 'active'))

  function byEmail(email?: string | null): User | undefined {
    if (!email) return undefined
    return users.value.find(u => u.email === email)
  }

  /** Admin-only metadata edit (role/position/phone). Status is toggled via the admin API. */
  async function updateUserMeta(uid: string, patch: Partial<Pick<User, 'name' | 'position' | 'phone' | 'role'>>) {
    await updateDoc(doc(db, COLLECTIONS.USERS, uid), patch)
    const local = users.value.find(u => u.uid === uid)
    if (local) Object.assign(local, patch)
  }

  return {
    users,
    loading,
    loaded,
    error,
    activeUsers,
    loadUsers,
    byEmail,
    updateUserMeta
  }
})
