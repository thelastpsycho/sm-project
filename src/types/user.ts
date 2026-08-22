export type UserRole = 'admin' | 'sales'
export type UserStatus = 'active' | 'disabled'

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
