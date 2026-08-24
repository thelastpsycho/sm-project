// Permission catalog — the granular access model.
//
// A permission is a `resource:action` string, e.g. 'pipeline:edit'. Each role is
// granted a flat set of these keys, edited from the Team & Access screen and stored
// in Firestore (`settings/rolePermissions`), then loaded at runtime by
// `stores/permissions.ts` so the nav, router, and per-page action buttons react live.
//
// Enforcement:
//  - `pipeline:edit` / `pipeline:delete` are ALSO enforced server-side via Firebase
//    custom claims (`editAll` / `canDelete`) — see api/admin/users.ts + firestore.rules.
//  - Function / Survey actions are UI-gated only, because those Firestore collections
//    are public (see firestore.rules). The buttons/pages hide based on the signed-in
//    user's role, but the DB doesn't reject — acceptable for these internal tools.

export type Permission = string // `${resource}:${action}`

export interface PermissionAction {
  key: string // e.g. 'create'
  label: string
}

export interface PermissionGroup {
  resource: string // e.g. 'pipeline'
  label: string
  actions: PermissionAction[]
  /** Always granted (e.g. Home) — rendered checked + disabled. */
  locked?: boolean
  /** Never granted to non-admins (e.g. Team & Access) — rendered unchecked + disabled. */
  adminOnly?: boolean
}

/** The full catalog, in display order (drives the matrix editor UI). */
export const PERMISSION_CATALOG: PermissionGroup[] = [
  { resource: 'home', label: 'Home', locked: true, actions: [{ key: 'access', label: 'Access' }] },
  { resource: 'chat', label: 'Chat', actions: [{ key: 'access', label: 'Access' }] },
  {
    resource: 'pipeline',
    label: 'Pipeline',
    actions: [
      { key: 'view', label: 'View' },
      { key: 'create', label: 'Create' },
      { key: 'edit', label: 'Edit' },
      { key: 'delete', label: 'Delete' },
      { key: 'report', label: 'View report' }
    ]
  },
  {
    resource: 'function',
    label: 'Function Chart',
    actions: [
      { key: 'view', label: 'View' },
      { key: 'create', label: 'Create' },
      { key: 'edit', label: 'Edit' },
      { key: 'delete', label: 'Delete' }
    ]
  },
  {
    resource: 'survey',
    label: 'Survey',
    actions: [
      { key: 'view', label: 'View' },
      { key: 'create', label: 'Create' },
      { key: 'edit', label: 'Edit' },
      { key: 'delete', label: 'Delete' }
    ]
  },
  { resource: 'contract', label: 'Contract', actions: [{ key: 'access', label: 'Access' }] },
  {
    resource: 'rfp',
    label: 'RFP',
    actions: [
      { key: 'view', label: 'View history' },
      { key: 'create', label: 'Create' },
      { key: 'edit', label: 'Edit' }
    ]
  },
  {
    resource: 'users',
    label: 'Team & Access',
    adminOnly: true,
    actions: [{ key: 'access', label: 'Access' }]
  }
]

export function permKey(resource: string, action: string): Permission {
  return `${resource}:${action}`
}

/** Every valid permission key. */
export const ALL_PERMISSIONS: Permission[] = PERMISSION_CATALOG.flatMap(g =>
  g.actions.map(a => permKey(g.resource, a.key))
)

const LOCKED_KEYS = new Set(
  PERMISSION_CATALOG.filter(g => g.locked).flatMap(g =>
    g.actions.map(a => permKey(g.resource, a.key))
  )
)
const ADMIN_ONLY_KEYS = new Set(
  PERMISSION_CATALOG.filter(g => g.adminOnly).flatMap(g =>
    g.actions.map(a => permKey(g.resource, a.key))
  )
)

export function isLockedPermission(key: Permission): boolean {
  return LOCKED_KEYS.has(key)
}
export function isAdminOnlyPermission(key: Permission): boolean {
  return ADMIN_ONLY_KEYS.has(key)
}

// Keyed by role id (built-in or custom) → the permission keys granted to it.
export type RoleMatrix = Record<string, Permission[]>

// ---- Built-in role defaults (starting points; admins reconfigure freely) ----
// These preserve prior behavior: everyone reaches every screen; sales edits their
// OWN leads (via the owner rule, so no `pipeline:edit`) and can't delete; manager
// edits any lead; admin can do everything including delete + Team & Access.
const VIEW_ALL: Permission[] = [
  'home:access',
  'chat:access',
  'pipeline:view',
  'pipeline:report',
  'function:view',
  'survey:view',
  'contract:access',
  'rfp:view'
]
const NON_PIPELINE_CRUD: Permission[] = [
  'function:create',
  'function:edit',
  'function:delete',
  'survey:create',
  'survey:edit',
  'survey:delete',
  'rfp:create',
  'rfp:edit'
]
const SALES_BASE: Permission[] = [...VIEW_ALL, 'pipeline:create', ...NON_PIPELINE_CRUD]

export const DEFAULT_ROLE_PERMISSIONS: RoleMatrix = {
  admin: [...ALL_PERMISSIONS],
  manager: [...SALES_BASE, 'pipeline:edit'],
  sales: [...SALES_BASE],
  viewer: [...VIEW_ALL]
}

/** The default permission list for a role id (empty for unknown/custom roles). */
function defaultsFor(roleId: string): Permission[] {
  return DEFAULT_ROLE_PERMISSIONS[roleId] ? [...DEFAULT_ROLE_PERMISSIONS[roleId]] : []
}

/** A matrix seeded with defaults for each of the given role ids. */
export function matrixFor(roleIds: string[]): RoleMatrix {
  const m: RoleMatrix = {}
  for (const id of roleIds) m[id] = defaultsFor(id)
  return m
}

/** Deep copy of the built-in defaults. */
export function cloneDefaultMatrix(): RoleMatrix {
  return matrixFor(Object.keys(DEFAULT_ROLE_PERMISSIONS))
}

/**
 * Merge a partial matrix (e.g. from Firestore) onto the defaults for `roleIds`.
 * Unknown permission keys are dropped so a stale/foreign value can't leak access.
 */
export function mergeMatrix(
  partial: Partial<Record<string, unknown>> | null | undefined,
  roleIds: string[]
): RoleMatrix {
  const base = matrixFor(roleIds)
  if (!partial) return base
  for (const role of roleIds) {
    const val = partial[role]
    if (Array.isArray(val)) {
      const filtered = val.filter((p): p is Permission => ALL_PERMISSIONS.includes(p as Permission))
      // If a stored list had entries but NONE are valid (e.g. the legacy screen-key
      // format from a prior version), keep the role's defaults rather than wiping it
      // to nothing. A genuinely-empty stored list ([]) still means "no access".
      base[role] = filtered.length === 0 && val.length > 0 ? (base[role] ?? []) : filtered
    }
  }
  return base
}
