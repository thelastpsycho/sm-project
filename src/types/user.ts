// Roles are now data, not a fixed enum: `admin`, `manager`, `sales`, `viewer` are
// built-in (see `src/lib/roles.ts`), and admins can mint custom roles from the Team
// & Access screen. A role is identified by its slug id — hence a plain string.
export type UserRole = string
export type UserStatus = 'active' | 'disabled'

/**
 * Action permissions — the write-sensitive half of the access model. These are
 * role-inherent and ALSO enforced server-side in `firestore.rules` via custom
 * claims, so they can't be handed out loosely from the UI (that would let the
 * client and the database disagree). Test them with `can(user, capability)`.
 *
 * Route/nav access (Pipeline, Contract, RFP, …) is the *editable* half — see
 * `src/lib/permissions.ts` + `src/stores/permissions.ts`.
 */
export type Capability =
  | 'deals:editAll' // edit ANY lead (owners can always edit their own)
  | 'deals:delete' // delete leads

export interface User {
  uid?: string // Firebase Auth uid (absent on the static user.json seed)
  name: string
  position: string
  email: string
  phone: string
  role?: UserRole // defaults to 'sales' when absent
  status?: UserStatus // defaults to 'active' when absent
  pin?: string // legacy — only present in the user.json migration seed
  fcmTokens?: string[] // web-push device tokens
  notificationsSeenAt?: string // ISO — when the user last cleared their inbox
}
