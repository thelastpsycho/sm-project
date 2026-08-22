// Runtime source of truth for route/nav access. Loads the role->permissions matrix
// from Firestore (`settings/rolePermissions`), falling back to sensible defaults,
// and exposes a reactive `canAccessRoute` used by the nav and the router guard.
// Admins edit the matrix via `setRolePermissions` (persisted for everyone).

import { defineStore } from 'pinia'
import { ref } from 'vue'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { effectiveRole, type SessionUserLike } from '@/lib/crmUtils'
import {
  cloneDefaultMatrix,
  mergeMatrix,
  type RoleMatrix,
  type RoutePermission
} from '@/lib/permissions'
import type { UserRole } from '@/types/user'

const SETTINGS_COLLECTION = 'settings'
const ROLE_PERMISSIONS_DOC = 'rolePermissions'

export const usePermissionsStore = defineStore('permissions', () => {
  const matrix = ref<RoleMatrix>(cloneDefaultMatrix())
  const loaded = ref(false)
  const saving = ref(false)
  let loadPromise: Promise<void> | null = null

  /** Load once and cache the promise so the router guard can await it cheaply. */
  function load(): Promise<void> {
    if (loadPromise) return loadPromise
    loadPromise = (async () => {
      try {
        const snap = await getDoc(doc(db, SETTINGS_COLLECTION, ROLE_PERMISSIONS_DOC))
        matrix.value = mergeMatrix(snap.exists() ? snap.data() : null)
      } catch (err) {
        console.error('Failed to load role permissions; using defaults.', err)
      } finally {
        loaded.value = true
      }
    })()
    return loadPromise
  }

  /**
   * Whether the user's role can reach a route. Admin always can; 'home' is always
   * allowed (safe landing / no redirect loops); otherwise consult the matrix.
   */
  function canAccessRoute(user: SessionUserLike, perm: RoutePermission): boolean {
    if (perm === 'home') return true
    const role = effectiveRole(user)
    if (role === 'admin') return true
    if (perm === 'users') return false // Team & Access is always admin-only
    return (matrix.value[role] ?? []).includes(perm)
  }

  /** Replace one role's permission list and persist the whole matrix (admin only). */
  async function setRolePermissions(role: UserRole, perms: RoutePermission[]): Promise<void> {
    saving.value = true
    const next: RoleMatrix = { ...matrix.value, [role]: perms }
    try {
      await setDoc(doc(db, SETTINGS_COLLECTION, ROLE_PERMISSIONS_DOC), next, { merge: true })
      matrix.value = next
    } finally {
      saving.value = false
    }
  }

  return { matrix, loaded, saving, load, canAccessRoute, setRolePermissions }
})
