// Route/nav permissions — the editable half of the access model.
//
// Each entry maps to one destination in the floating nav. Which roles get which
// route is stored in Firestore (`settings/rolePermissions`) and edited from the
// Team & Access screen, then loaded at runtime by `stores/permissions.ts` so the
// nav and router react to changes live. (Action permissions like editing/deleting
// leads are role-inherent + server-enforced — see `crmUtils.ts` / `firestore.rules`.)

import type { UserRole } from '@/types/user'

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

export type RoleMatrix = Record<UserRole, RoutePermission[]>

const ALL_ROUTES: RoutePermission[] = ROUTE_PERMISSIONS.map(p => p.key)
// Everything except the admin-only Team & Access screen.
const NON_ADMIN: RoutePermission[] = ALL_ROUTES.filter(p => p !== 'users')

/**
 * Defaults preserve today's behavior: every signed-in user can reach every route
 * except Team & Access. Admins then tune each role down from the editor.
 */
export const DEFAULT_ROLE_PERMISSIONS: RoleMatrix = {
  admin: [...ALL_ROUTES],
  manager: [...NON_ADMIN],
  sales: [...NON_ADMIN],
  viewer: [...NON_ADMIN]
}

/** Deep copy of the defaults (so callers never mutate the shared constant). */
export function cloneDefaultMatrix(): RoleMatrix {
  return {
    admin: [...DEFAULT_ROLE_PERMISSIONS.admin],
    manager: [...DEFAULT_ROLE_PERMISSIONS.manager],
    sales: [...DEFAULT_ROLE_PERMISSIONS.sales],
    viewer: [...DEFAULT_ROLE_PERMISSIONS.viewer]
  }
}

/** Merge a partial matrix (e.g. from Firestore) onto the defaults. */
export function mergeMatrix(partial: Partial<Record<string, unknown>> | null | undefined): RoleMatrix {
  const base = cloneDefaultMatrix()
  if (!partial) return base
  for (const role of Object.keys(base) as UserRole[]) {
    const val = partial[role]
    if (Array.isArray(val)) {
      base[role] = val.filter((p): p is RoutePermission => ALL_ROUTES.includes(p as RoutePermission))
    }
  }
  return base
}
