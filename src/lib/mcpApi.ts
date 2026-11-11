import { auth } from '@/lib/firebase'

export type McpKeyAction = 'create' | 'list' | 'revoke'

export interface McpKeySummary {
  keyId: string
  label: string
  createdAt: string | null
  lastUsedAt: string | null
  revoked: boolean
}

/**
 * Call the self-service MCP key endpoint (`/api/mcp/keys`) with the caller's Firebase
 * ID token. Any signed-in user may manage their own keys — the server scopes
 * list/revoke to the caller's own uid.
 */
export async function mcpKeysApi(action: McpKeyAction, payload: Record<string, unknown> = {}): Promise<any> {
  const user = auth.currentUser
  if (!user) throw new Error('Not signed in.')
  const token = await user.getIdToken()

  const res = await fetch('/api/mcp/keys', {
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
