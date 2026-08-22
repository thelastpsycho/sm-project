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
      if (role === 'admin') await auth.setCustomUserClaims(user.uid, { admin: true })
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
      await auth.setCustomUserClaims(uid, { admin: role === 'admin' })
      await store.collection('users').doc(uid).update({ role })
      return res.status(200).json({ ok: true })
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
