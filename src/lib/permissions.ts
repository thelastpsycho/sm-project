// Route/nav permissions — the editable half of the access model.
//
// Each entry maps to one destination in the floating nav. Which roles get which
// route is stored in Firestore (`settings/rolePermissions`) and edited from the
// Team & Access screen, then loaded at runtime by `stores/permissions.ts` so the
// nav and router react to changes live. (Action permissions like editing/deleting
// leads are role-inherent + server-enforced — see `crmUtils.ts` / `firestore.rules`.)

export type RoutePermission =
  | 'home'
  | 'chat'
  | 'pipeline'
  | 'pipeline-report'
  | 'function-chart'
  | 'contract'
  | 'rfp'
  | 'survey-admin'
  | 'users'

export interface PermissionDef {
  key: RoutePermission
  label: string
  /** Always granted (safe landing / admin-only), so it's shown locked in the editor. */
  locked?: boolean
}

/** The full list of route permissions, in display order (drives the matrix UI). */
export const ROUTE_PERMISSIONS: PermissionDef[] = [
  { key: 'home', label: 'Home', locked: true }, // always allowed — guarantees a landing page
  { key: 'chat', label: 'Chat' },
  { key: 'pipeline', label: 'Pipeline' },
  { key: 'pipeline-report', label: 'Pipeline Report' },
  { key: 'function-chart', label: 'Function Chart' },
  { key: 'contract', label: 'Contract' },
  { key: 'rfp', label: 'RFP (create & history)' },
  { key: 'survey-admin', label: 'Survey Admin' },
  { key: 'users', label: 'Team & Access', locked: true } // admin-only, not editable
]

// Keyed by role id (built-in or custom).
export type RoleMatrix = Record<string, RoutePermission[]>

export const ALL_ROUTES: RoutePermission[] = ROUTE_PERMISSIONS.map(p => p.key)
// Everything except the admin-only Team & Access screen.
const NON_ADMIN: RoutePermission[] = ALL_ROUTES.filter(p => p !== 'users')

/**
 * Per-role defaults for the BUILT-IN roles. These preserve today's behavior: every
 * built-in signed-in user can reach every route except Team & Access. Custom roles
 * have no default here — they start with no route access (admins tick what they need).
 */
export const DEFAULT_ROLE_PERMISSIONS: RoleMatrix = {
  admin: [...ALL_ROUTES],
  manager: [...NON_ADMIN],
  sales: [...NON_ADMIN],
  viewer: [...NON_ADMIN]
}

/** The default route list for a given role id (empty for unknown/custom roles). */
function defaultsFor(roleId: string): RoutePermission[] {
  return DEFAULT_ROLE_PERMISSIONS[roleId] ? [...DEFAULT_ROLE_PERMISSIONS[roleId]] : []
}

/** A matrix seeded with defaults for each of the given role ids. */
export function matrixFor(roleIds: string[]): RoleMatrix {
  const m: RoleMatrix = {}
  for (const id of roleIds) m[id] = defaultsFor(id)
  return m
}

/** Deep copy of the built-in defaults (so callers never mutate the shared constant). */
export function cloneDefaultMatrix(): RoleMatrix {
  return matrixFor(Object.keys(DEFAULT_ROLE_PERMISSIONS))
}

/**
 * Merge a partial matrix (e.g. from Firestore) onto the defaults for `roleIds`.
 * Unknown route keys are dropped so a stale/foreign value can't leak access.
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
      base[role] = val.filter((p): p is RoutePermission => ALL_ROUTES.includes(p as RoutePermission))
    }
  }
  return base
}
