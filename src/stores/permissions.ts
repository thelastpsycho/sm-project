// Runtime source of truth for roles & the granular permission matrix.
//
// Loads two Firestore docs:
//   - `settings/roles`          → custom (non-built-in) role definitions {id,label}
//   - `settings/rolePermissions`→ role id -> granted permission keys (`resource:action`)
// Merges them onto the built-in defaults, mirrors both into the shared registries
// (`src/lib/roles.ts`) so pure helpers resolve names/permissions, and exposes reactive
// `roles` + `matrix` used by the nav, router guard, per-page buttons, and the editor.

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { effectiveRole, type SessionUserLike } from '@/lib/crmUtils'
import {
  mergeMatrix,
  isLockedPermission,
  isAdminOnlyPermission,
  type RoleMatrix,
  type Permission
} from '@/lib/permissions'
import {
  BUILTIN_ROLES,
  BUILTIN_ROLE_IDS,
  setRoleRegistry,
  setPermissionRegistry,
  slugifyRole,
  type RoleDef
} from '@/lib/roles'
import type { UserRole } from '@/types/user'

const SETTINGS_COLLECTION = 'settings'
const ROLE_PERMISSIONS_DOC = 'rolePermissions'
const ROLES_DOC = 'roles'

/** Sanitize a raw Firestore role list into valid custom RoleDefs. */
function parseCustomRoles(data: unknown): RoleDef[] {
  const list = (data as { list?: unknown } | null)?.list
  if (!Array.isArray(list)) return []
  return list
    .filter((r): r is Record<string, any> => !!r && typeof r === 'object')
    .map(r => ({ id: String(r.id ?? ''), label: String(r.label ?? r.id ?? '') }))
    .filter(r => r.id && !BUILTIN_ROLE_IDS.includes(r.id))
}

export const usePermissionsStore = defineStore('permissions', () => {
  // Built-in + custom roles. Reactive for the UI; also mirrored into the module-level
  // registries (setRoleRegistry / setPermissionRegistry) for the pure helpers.
  const roles = ref<RoleDef[]>([...BUILTIN_ROLES])
  const matrix = ref<RoleMatrix>(mergeMatrix(null, BUILTIN_ROLE_IDS))
  const loaded = ref(false)
  const saving = ref(false)
  let loadPromise: Promise<void> | null = null

  const customRoles = computed(() => roles.value.filter(r => !r.reserved))
  const roleIds = computed(() => roles.value.map(r => r.id))

  /** Push current roles + matrix into the shared registries (for pure helpers). */
  function syncRegistries() {
    setRoleRegistry(customRoles.value)
    setPermissionRegistry(matrix.value)
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
        matrix.value = mergeMatrix(
          matrixSnap.exists() ? matrixSnap.data() : null,
          roleIds.value
        )
        syncRegistries()
      } catch (err) {
        console.error('Failed to load roles/permissions; using defaults.', err)
      } finally {
        loaded.value = true
      }
    })()
    return loadPromise
  }

  /**
   * Whether the user's role is granted a permission key. Admin always is; locked keys
   * (Home) are always granted; admin-only keys (Team & Access) never for non-admins.
   */
  function has(user: SessionUserLike, key: Permission): boolean {
    if (isLockedPermission(key)) return true
    const role = effectiveRole(user)
    if (role === 'admin') return true
    if (isAdminOnlyPermission(key)) return false
    return (matrix.value[role] ?? []).includes(key)
  }

  /** Replace one role's permission list and persist the whole matrix (admin only). */
  async function setRolePermissions(role: UserRole, perms: Permission[]): Promise<void> {
    saving.value = true
    const next: RoleMatrix = { ...matrix.value, [role]: perms }
    try {
      await setDoc(doc(db, SETTINGS_COLLECTION, ROLE_PERMISSIONS_DOC), next, { merge: true })
      matrix.value = next
      syncRegistries()
    } finally {
      saving.value = false
    }
  }

  /** Toggle a single permission key for a role. */
  async function togglePermission(role: UserRole, key: Permission, granted: boolean): Promise<void> {
    const current = matrix.value[role] ?? []
    const next = granted
      ? [...new Set([...current, key])]
      : current.filter(p => p !== key)
    await setRolePermissions(role, next)
  }

  /** Persist the current custom-role definitions to `settings/roles`. */
  async function persistRoles(): Promise<void> {
    await setDoc(doc(db, SETTINGS_COLLECTION, ROLES_DOC), { list: customRoles.value })
  }

  /**
   * Create a custom role. Returns its generated id. New roles start with no access
   * (admins tick permissions on its card afterwards).
   */
  async function createRole(label: string): Promise<string> {
    const trimmed = label.trim()
    if (!trimmed) throw new Error('Role name is required.')
    const id = slugifyRole(trimmed)
    if (!id) throw new Error('Role name must contain letters or numbers.')
    if (roles.value.some(r => r.id === id)) throw new Error('A role with that name already exists.')

    saving.value = true
    try {
      roles.value = [...roles.value, { id, label: trimmed }]
      matrix.value = { ...matrix.value, [id]: [] }
      syncRegistries()
      await persistRoles()
    } catch (err) {
      roles.value = roles.value.filter(r => r.id !== id)
      syncRegistries()
      throw err
    } finally {
      saving.value = false
    }
    return id
  }

  /** Delete a custom role and its permissions (built-in roles cannot be removed). */
  async function deleteRole(id: string): Promise<void> {
    const role = roles.value.find(r => r.id === id)
    if (!role || role.reserved) throw new Error('That role cannot be deleted.')
    saving.value = true
    try {
      roles.value = roles.value.filter(r => r.id !== id)
      const nextMatrix = { ...matrix.value }
      delete nextMatrix[id]
      matrix.value = nextMatrix
      syncRegistries()
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
    has,
    setRolePermissions,
    togglePermission,
    createRole,
    deleteRole
  }
})
