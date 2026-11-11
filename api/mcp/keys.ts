// Self-service MCP API key lifecycle. Any signed-in app user can mint a key for
// THEMSELVES (not admin-only) — the key carries their own uid, so the MCP server
// resolves the same role/permissions they already have in the app. Gated by a normal
// Firebase ID token, same verification style as api/rms/_shared.ts's requireAuth.

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getApps, initializeApp, cert } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'
import { generateApiKey } from './_shared.js'

export const config = { maxDuration: 10 }

function initFirebase() {
  if (!getApps().length) {
    const svc = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '{}')
    initializeApp({ credential: cert(svc) })
  }
}

async function verifyCaller(req: VercelRequest): Promise<{ uid: string } | null> {
  const header = req.headers['authorization']
  const token = typeof header === 'string' && header.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) return null
  try {
    initFirebase()
    const decoded = await getAuth().verifyIdToken(token)
    return { uid: decoded.uid }
  } catch {
    return null
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const caller = await verifyCaller(req)
  if (!caller) return res.status(401).json({ error: 'Unauthorized' })

  const store = getFirestore()
  const body = (req.body || {}) as Record<string, any>
  const { action } = body

  try {
    if (action === 'create') {
      const label = typeof body.label === 'string' ? body.label.slice(0, 200) : ''
      const { raw, hash } = generateApiKey()
      await store.collection('mcpApiKeys').doc(hash).set({
        uid: caller.uid,
        label,
        createdAt: new Date(),
        lastUsedAt: null,
        revoked: false
      })
      // The raw key is shown exactly once — it is never retrievable again.
      return res.status(200).json({ ok: true, apiKey: raw, keyId: hash, label })
    }

    if (action === 'list') {
      const snap = await store.collection('mcpApiKeys').where('uid', '==', caller.uid).get()
      const keys = snap.docs.map(d => {
        const data = d.data()
        return {
          keyId: d.id,
          label: data.label ?? '',
          createdAt: data.createdAt?.toDate?.() ?? null,
          lastUsedAt: data.lastUsedAt?.toDate?.() ?? null,
          revoked: !!data.revoked
        }
      })
      return res.status(200).json({ ok: true, keys })
    }

    if (action === 'revoke') {
      const { keyId } = body
      if (!keyId || typeof keyId !== 'string') return res.status(400).json({ error: 'keyId required' })
      const ref = store.collection('mcpApiKeys').doc(keyId)
      const snap = await ref.get()
      if (!snap.exists || snap.data()?.uid !== caller.uid) {
        return res.status(404).json({ error: 'Key not found' })
      }
      await ref.update({ revoked: true })
      return res.status(200).json({ ok: true })
    }

    return res.status(400).json({ error: 'Unknown action' })
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Server error' })
  }
}
