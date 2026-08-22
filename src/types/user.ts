// Roles are now data, not a fixed enum: `admin`, `manager`, `sales`, `viewer` are
// built-in (see `src/lib/roles.ts`), and admins can mint custom roles from the Team
// & Access screen. A role is identified by its slug id — hence a plain string.
export type UserRole = string
export type UserStatus = 'active' | 'disabled'

// Access is now a single granular permission set per role (`resource:action` keys),
// editable from Team & Access and stored in Firestore. See `src/lib/permissions.ts`
// (catalog + matrix) and `src/lib/roles.ts` (role registry).

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
