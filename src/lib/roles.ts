// Role definitions & the action-capability registry.
//
// A role has two halves of access:
//   1. Route/nav access — which screens it can open (editable matrix in
//      `src/lib/permissions.ts`, stored in `settings/rolePermissions`).
//   2. Action capabilities — write-sensitive powers (edit any lead / delete leads)
//      that are ALSO enforced server-side by Firebase custom claims. Those live here.
//
// `admin`, `manager`, `sales`, `viewer` are BUILT-IN (reserved). Admins may create
// additional custom roles from the Team & Access screen; those are persisted to
// Firestore (`settings/roles`) and merged into the registry at runtime so the pure
// helpers below (used across the app + serverless) see them.

import type { Capability } from '@/types/user'

export interface RoleDef {
  id: string
  label: string
  capabilities: Capability[]
  /** Built-in role — cannot be renamed or deleted, and its capabilities are fixed. */
  reserved?: boolean
}

/** The four roles that ship with the app. Their capabilities are fixed. */
export const BUILTIN_ROLES: RoleDef[] = [
  { id: 'admin', label: 'Admin', capabilities: ['deals:editAll', 'deals:delete'], reserved: true },
  { id: 'manager', label: 'Manager', capabilities: ['deals:editAll'], reserved: true },
  { id: 'sales', label: 'Sales', capabilities: [], reserved: true },
  { id: 'viewer', label: 'Viewer', capabilities: [], reserved: true }
]

export const BUILTIN_ROLE_IDS = BUILTIN_ROLES.map(r => r.id)

// Every selectable capability, in display order (drives the New Role UI).
export const CAPABILITY_DEFS: { key: Capability; label: string; hint: string }[] = [
  { key: 'deals:editAll', label: 'Edit any lead', hint: 'not just their own' },
  { key: 'deals:delete', label: 'Delete leads', hint: 'remove leads entirely' }
]

// Runtime registry: built-ins plus any custom roles loaded from Firestore. Mutated
// by `setRoleRegistry` (called by the permissions store after it loads).
let registry: RoleDef[] = [...BUILTIN_ROLES]

/** Replace the custom-role portion of the registry (built-ins are always kept). */
export function setRoleRegistry(customRoles: RoleDef[]): void {
  const custom = (customRoles || []).filter(
    r => r && typeof r.id === 'string' && r.id && !BUILTIN_ROLE_IDS.includes(r.id)
  )
  registry = [...BUILTIN_ROLES, ...custom]
}

/** All known roles (built-in + custom). */
export function allRoles(): RoleDef[] {
  return registry
}

/** Custom (non-reserved) roles only. */
export function customRoles(): RoleDef[] {
  return registry.filter(r => !r.reserved)
}

export function getRole(id: string): RoleDef | undefined {
  return registry.find(r => r.id === id)
}

/** Human label for a role id; falls back to the id itself for unknown roles. */
export function roleLabel(id: string): string {
  return getRole(id)?.label ?? id
}

/** Action capabilities granted by a role (empty for unknown/deleted roles). */
export function capabilitiesForRole(id: string): Capability[] {
  return getRole(id)?.capabilities ?? []
}

/** Turn a free-text role name into a stable, url-safe id. */
export function slugifyRole(label: string): string {
  return label
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
