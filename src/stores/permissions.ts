// Runtime source of truth for roles & route/nav access.
//
// Loads two Firestore docs:
//   - `settings/roles`          → custom (non-built-in) role definitions
//   - `settings/rolePermissions`→ the role -> route-access matrix
// It merges these onto the built-in defaults, populates the shared role registry
// (`src/lib/roles.ts`) so the pure capability helpers see custom roles, and exposes
// reactive `roles` + `matrix` used by the nav, router guard, and Team & Access editor.
// Admins mutate everything here (create/update/delete roles, edit route access).

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { effectiveRole, type SessionUserLike } from '@/lib/crmUtils'
import {
  mergeMatrix,
  type RoleMatrix,
  type RoutePermission
} from '@/lib/permissions'
import {
  BUILTIN_ROLES,
  BUILTIN_ROLE_IDS,
  setRoleRegistry,
  slugifyRole,
  type RoleDef
} from '@/lib/roles'
import type { Capability, UserRole } from '@/types/user'

const SETTINGS_COLLECTION = 'settings'
const ROLE_PERMISSIONS_DOC = 'rolePermissions'
const ROLES_DOC = 'roles'

/** Sanitize a raw Firestore role list into valid custom RoleDefs. */
function parseCustomRoles(data: unknown): RoleDef[] {
  const list = (data as { list?: unknown } | null)?.list
  if (!Array.isArray(list)) return []
  return list
    .filter((r): r is Record<string, any> => !!r && typeof r === 'object')
    .map(r => ({
      id: String(r.id ?? ''),
      label: String(r.label ?? r.id ?? ''),
      capabilities: Array.isArray(r.capabilities)
        ? (r.capabilities.filter((c: unknown) => typeof c === 'string') as Capability[])
        : []
    }))
    .filter(r => r.id && !BUILTIN_ROLE_IDS.includes(r.id))
}

export const usePermissionsStore = defineStore('permissions', () => {
  // Built-in + custom roles. Kept reactive for the UI; also mirrored into the
  // module-level registry (setRoleRegistry) so pure helpers resolve capabilities.
  const roles = ref<RoleDef[]>([...BUILTIN_ROLES])
  const matrix = ref<RoleMatrix>(mergeMatrix(null, BUILTIN_ROLE_IDS))
  const loaded = ref(false)
  const saving = ref(false)
  let loadPromise: Promise<void> | null = null

  const customRoles = computed(() => roles.value.filter(r => !r.reserved))
  const roleIds = computed(() => roles.value.map(r => r.id))

  /** Push the current custom roles into the shared registry (for pure helpers). */
  function syncRegistry() {
    setRoleRegistry(roles.value.filter(r => !r.reserved))
  }

  /** Load once and cache the promise so the router guard can await it cheaply. */
  function load(): Promise<void> {
    if (loadPromise) return loadPromise
    loadPromise = (async () => {
      try {
        const [rolesSnap, matrixSnap] = await Promise.all([
          getDoc(doc(db, SETTINGS_COLLECTION, ROLES_DOC)),
          getDoc(doc(db, SETTINGS_COLLECTION, ROLE_PERMISSIONS_DOC))
        ])
        const custom = parseCustomRoles(rolesSnap.exists() ? rolesSnap.data() : null)
        roles.value = [...BUILTIN_ROLES, ...custom]
        syncRegistry()
        matrix.value = mergeMatrix(
          matrixSnap.exists() ? matrixSnap.data() : null,
          roleIds.value
        )
      } catch (err) {
        console.error('Failed to load roles/permissions; using defaults.', err)
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

  /** Replace one role's route list and persist the whole matrix (admin only). */
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

  /** Persist the current custom-role definitions to `settings/roles`. */
  async function persistRoles(): Promise<void> {
    await setDoc(doc(db, SETTINGS_COLLECTION, ROLES_DOC), { list: customRoles.value })
  }

  /**
   * Create a custom role. Returns its generated id. New roles start with no route
   * access (admins tick screens after) and the capabilities passed in.
   */
  async function createRole(label: string, capabilities: Capability[] = []): Promise<string> {
    const trimmed = label.trim()
    if (!trimmed) throw new Error('Role name is required.')
    let id = slugifyRole(trimmed)
    if (!id) throw new Error('Role name must contain letters or numbers.')
    if (roles.value.some(r => r.id === id)) throw new Error('A role with that name already exists.')

    const def: RoleDef = { id, label: trimmed, capabilities }
    saving.value = true
    try {
      roles.value = [...roles.value, def]
      syncRegistry()
      matrix.value = { ...matrix.value, [id]: [] }
      await persistRoles()
    } catch (err) {
      // Roll back optimistic state on failure.
      roles.value = roles.value.filter(r => r.id !== id)
      syncRegistry()
      throw err
    } finally {
      saving.value = false
    }
    return id
  }

  /** Update a custom role's capabilities (built-in roles are fixed). */
  async function setRoleCapabilities(id: string, capabilities: Capability[]): Promise<void> {
    const role = roles.value.find(r => r.id === id)
    if (!role || role.reserved) throw new Error('That role cannot be edited.')
    saving.value = true
    try {
      roles.value = roles.value.map(r => (r.id === id ? { ...r, capabilities } : r))
      syncRegistry()
      await persistRoles()
    } finally {
      saving.value = false
    }
  }

  /** Delete a custom role (built-in roles cannot be removed). */
  async function deleteRole(id: string): Promise<void> {
    const role = roles.value.find(r => r.id === id)
    if (!role || role.reserved) throw new Error('That role cannot be deleted.')
    saving.value = true
    try {
      roles.value = roles.value.filter(r => r.id !== id)
      syncRegistry()
      const nextMatrix = { ...matrix.value }
      delete nextMatrix[id]
      matrix.value = nextMatrix
      await Promise.all([
        persistRoles(),
        setDoc(doc(db, SETTINGS_COLLECTION, ROLE_PERMISSIONS_DOC), nextMatrix)
      ])
    } finally {
      saving.value = false
    }
  }

  return {
    roles,
    customRoles,
    matrix,
    loaded,
    saving,
    load,
    canAccessRoute,
    setRolePermissions,
    createRole,
    setRoleCapabilities,
    deleteRole
  }
})
