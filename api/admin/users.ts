import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getApps, initializeApp, cert } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'

function init() {
  if (!getApps().length) {
    const svc = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '{}')
    initializeApp({ credential: cert(svc) })
  }
}

// Built-in role permission fallbacks (used only if the matrix doc is missing).
// The write-sensitive keys are all that matter here: pipeline edit/delete.
const BUILTIN_PERMS: Record<string, string[]> = {
  admin: ['pipeline:edit', 'pipeline:delete'],
  manager: ['pipeline:edit'],
  sales: [],
  viewer: []
}

/** Resolve a role's granted permission keys from the matrix doc. */
async function permsForRole(
  store: FirebaseFirestore.Firestore,
  role: string
): Promise<string[]> {
  const snap = await store.collection('settings').doc('rolePermissions').get()
  const data = snap.exists ? (snap.data() as Record<string, any>) : null
  const list = data?.[role]
  if (Array.isArray(list)) return list
  return BUILTIN_PERMS[role] ?? []
}

/**
 * Custom claims a role gets. These are what firestore.rules reads:
 *  - admin            → full access + delete + user management
 *  - `pipeline:edit`  → `editAll` claim (may edit any lead)
 *  - `pipeline:delete`→ `canDelete` claim (may delete leads)
 * Passing the full object to setCustomUserClaims REPLACES all claims, so downgrading
 * a role cleanly removes the previous claim.
 */
function claimsFromPerms(role: string, perms: string[]): Record<string, boolean> {
  if (role === 'admin') return { admin: true }
  const claims: Record<string, boolean> = {}
  if (perms.includes('pipeline:edit')) claims.editAll = true
  if (perms.includes('pipeline:delete')) claims.canDelete = true
  return claims
}

/** Resolve the custom claims for a role from its granted permissions. */
async function claimsFor(
  store: FirebaseFirestore.Firestore,
  role: string
): Promise<Record<string, boolean>> {
  return claimsFromPerms(role, await permsForRole(store, role))
}

/**
 * Admin-only user management: create users, change role (custom claim + doc), and
 * activate/deactivate (Auth `disabled` flag + `users/{uid}.status`). The caller must
 * present a valid Firebase ID token carrying the `admin` custom claim.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  init()
  const auth = getAuth()
  const store = getFirestore()

  // ---- Verify caller is an admin ----
  const header = String(req.headers['authorization'] || '')
  const token = header.startsWith('Bearer ') ? header.slice(7) : ''
  if (!token) return res.status(401).json({ error: 'Missing token' })
  let caller
  try {
    caller = await auth.verifyIdToken(token)
  } catch {
    return res.status(401).json({ error: 'Invalid token' })
  }
  if (!caller.admin) return res.status(403).json({ error: 'Admin only' })

  const body = (req.body || {}) as Record<string, any>
  const { action } = body

  try {
    if (action === 'create') {
      const { name, email, position, phone, role, password } = body
      if (!email || !password) return res.status(400).json({ error: 'Email and password required' })
      const user = await auth.createUser({ email, password, displayName: name })
      await auth.setCustomUserClaims(user.uid, await claimsFor(store, role))
      await store.collection('users').doc(user.uid).set({
        email,
        name: name || '',
        position: position || '',
        phone: phone || '',
        role: role || 'sales',
        status: 'active'
      })
      return res.status(200).json({ ok: true, uid: user.uid })
    }

    if (action === 'setRole') {
      const { uid, role } = body
      if (!uid) return res.status(400).json({ error: 'uid required' })
      await auth.setCustomUserClaims(uid, await claimsFor(store, role))
      await store.collection('users').doc(uid).update({ role })
      await auth.revokeRefreshTokens(uid) // force token refresh so the new claim applies
      return res.status(200).json({ ok: true })
    }

    if (action === 'syncRole') {
      // Re-apply claims to everyone holding a role (used after its capabilities
      // change) and revoke their tokens so the new claims take effect on refresh.
      const { role } = body
      if (!role) return res.status(400).json({ error: 'role required' })
      const claims = await claimsFor(store, role)
      const snap = await store.collection('users').where('role', '==', role).get()
      await Promise.all(
        snap.docs.map(async d => {
          await auth.setCustomUserClaims(d.id, claims)
          await auth.revokeRefreshTokens(d.id)
        })
      )
      return res.status(200).json({ ok: true, updated: snap.size })
    }

    if (action === 'setStatus') {
      const { uid, status } = body
      if (!uid) return res.status(400).json({ error: 'uid required' })
      const disabled = status === 'disabled'
      await auth.updateUser(uid, { disabled })
      await store.collection('users').doc(uid).update({ status })
      if (disabled) await auth.revokeRefreshTokens(uid) // force sign-out
      return res.status(200).json({ ok: true })
    }

    return res.status(400).json({ error: 'Unknown action' })
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Server error' })
  }
}
