import { auth } from '@/lib/firebase'

export type AdminAction = 'create' | 'setRole' | 'setStatus' | 'syncRole'

/**
 * Call the admin-only serverless endpoint (`/api/admin/users`) with the caller's
 * Firebase ID token. The server verifies the token + admin claim before acting.
 * Note: this requires the Vercel functions to be running (production, or `vercel dev`);
 * it will not work under a plain `vite dev` server.
 */
export async function adminApi(action: AdminAction, payload: Record<string, unknown>): Promise<any> {
  const user = auth.currentUser
  if (!user) throw new Error('Not signed in.')
  const token = await user.getIdToken()

  const res = await fetch('/api/admin/users', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ action, ...payload })
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data?.error ?? `Request failed (${res.status})`)
  }
  return data
}
