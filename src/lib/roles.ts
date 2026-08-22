// Role definitions & runtime registries.
//
// A role is just an id + label now — all of its access (screens AND actions) lives in
// the granular permission matrix (see `src/lib/permissions.ts`). `admin`, `manager`,
// `sales`, `viewer` are BUILT-IN (reserved); admins may mint custom roles from the
// Team & Access screen, persisted to Firestore (`settings/roles`).
//
// Two module-level registries are mirrored from the permissions store so the pure
// helpers below (used across the app + framework-agnostic code) can resolve names and
// permissions without importing Pinia:
//   - role list      → labels
//   - permission map → role id -> granted permission keys

export interface RoleDef {
  id: string
  label: string
  /** Built-in role — cannot be renamed or deleted. */
  reserved?: boolean
}

/** The four roles that ship with the app. */
export const BUILTIN_ROLES: RoleDef[] = [
  { id: 'admin', label: 'Admin', reserved: true },
  { id: 'manager', label: 'Manager', reserved: true },
  { id: 'sales', label: 'Sales', reserved: true },
  { id: 'viewer', label: 'Viewer', reserved: true }
]

export const BUILTIN_ROLE_IDS = BUILTIN_ROLES.map(r => r.id)

// Runtime registries (populated by the permissions store after it loads).
let roleRegistry: RoleDef[] = [...BUILTIN_ROLES]
let permRegistry: Record<string, string[]> = {}

/** Replace the custom-role portion of the role list (built-ins are always kept). */
export function setRoleRegistry(customRoles: RoleDef[]): void {
  const custom = (customRoles || []).filter(
    r => r && typeof r.id === 'string' && r.id && !BUILTIN_ROLE_IDS.includes(r.id)
  )
  roleRegistry = [...BUILTIN_ROLES, ...custom]
}

/** Mirror the current role -> permission-keys matrix for the pure `roleHas` check. */
export function setPermissionRegistry(matrix: Record<string, string[]>): void {
  permRegistry = matrix || {}
}

export function allRoles(): RoleDef[] {
  return roleRegistry
}

export function customRoles(): RoleDef[] {
  return roleRegistry.filter(r => !r.reserved)
}

export function getRole(id: string): RoleDef | undefined {
  return roleRegistry.find(r => r.id === id)
}

/** Human label for a role id; falls back to the id itself for unknown roles. */
export function roleLabel(id: string): string {
  return getRole(id)?.label ?? id
}

/** Whether a role grants a permission key. Admin always does. */
export function roleHas(roleId: string, key: string): boolean {
  if (roleId === 'admin') return true
  return (permRegistry[roleId] ?? []).includes(key)
}

/** Turn a free-text role name into a stable, url-safe id. */
export function slugifyRole(label: string): string {
  return label
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
