import { auth } from '@/lib/firebase'

export type McpKeyAction = 'create' | 'list' | 'revoke'

export interface McpKeySummary {
  keyId: string
  label: string
  ownerName: string
  ownerEmail: string
  createdAt: string | null
  lastUsedAt: string | null
  revoked: boolean
}

export interface McpKeysListResult {
  ok: true
  keys: McpKeySummary[]
  /** 'all' for admins (every user's keys), 'own' for everyone else. */
  scope: 'all' | 'own'
}

/**
 * Call the self-service MCP key actions on `/api/mcp` with the caller's Firebase ID
 * token. Requires the `mcp:access` permission. Admins see and can revoke every user's
 * keys; everyone else only their own. Key management shares the `/api/mcp` function
 * (rather than its own route) to stay under the Hobby plan's per-deployment function
 * count limit; the server tells it apart from MCP protocol requests by the `action`
 * field.
 */
export async function mcpKeysApi(action: McpKeyAction, payload: Record<string, unknown> = {}): Promise<any> {
  const user = auth.currentUser
  if (!user) throw new Error('Not signed in.')
  const token = await user.getIdToken()

  const res = await fetch('/api/mcp', {
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
