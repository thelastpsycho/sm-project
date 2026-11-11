// Shared plumbing for the MCP server (api/mcp/index.ts) and key-management endpoint
// (api/mcp/keys.ts). Imports the existing Admin SDK / role-matrix helpers from
// cron/_shared.ts rather than duplicating them — see that file for `db()`,
// `loadDeals()`, `loadEventsSince()`, `loadRoleMatrix()`, `roleGrants()`.

import crypto from 'node:crypto'
import type { VercelRequest } from '@vercel/node'
import type { Firestore } from 'firebase-admin/firestore'
import { roleGrants } from '../cron/_shared.js'
import type { RoleMatrix } from '../../src/lib/permissions.js'
import type { Deal } from '../../src/types/crm.js'

const KEY_PREFIX = 'mcp_'
// Avoid write-amplifying every tool call with a `lastUsedAt` bump — only refresh it
// at most once per window.
const LAST_USED_THROTTLE_MS = 5 * 60_000

export interface McpCaller {
  uid: string
  email: string
  name: string
  role: string
  status: 'active' | 'disabled'
}

/** A fresh opaque API key and the hash that gets stored (never the raw key). */
export function generateApiKey(): { raw: string; hash: string } {
  const raw = KEY_PREFIX + crypto.randomBytes(32).toString('base64url')
  return { raw, hash: hashApiKey(raw) }
}

export function hashApiKey(raw: string): string {
  return crypto.createHash('sha256').update(raw).digest('hex')
}

function bearerToken(req: VercelRequest): string | null {
  const header = String(req.headers['authorization'] || '')
  return header.startsWith('Bearer ') ? header.slice(7).trim() : null
}

/**
 * Resolve the caller from an opaque MCP API key (not a Firebase ID token — those
 * expire hourly and aren't workable for a client config header set once). The key's
 * hash is also its Firestore doc id at `mcpApiKeys/{hash}`, so lookup is a single get,
 * not a query.
 */
export async function resolveMcpCaller(req: VercelRequest, store: Firestore): Promise<McpCaller | null> {
  const token = bearerToken(req)
  if (!token) return null
  const hash = hashApiKey(token)
  const keyDoc = await store.collection('mcpApiKeys').doc(hash).get()
  if (!keyDoc.exists) return null
  const keyData = keyDoc.data() as { uid: string; revoked?: boolean; lastUsedAt?: { toDate?: () => Date } }
  if (keyData.revoked) return null

  const userDoc = await store.collection('users').doc(keyData.uid).get()
  if (!userDoc.exists) return null
  const user = userDoc.data() as { email?: string; name?: string; role?: string; status?: string }
  if (user.status === 'disabled') return null

  const lastUsedAt = keyData.lastUsedAt?.toDate?.()
  if (!lastUsedAt || Date.now() - lastUsedAt.getTime() > LAST_USED_THROTTLE_MS) {
    keyDoc.ref.update({ lastUsedAt: new Date() }).catch(() => {})
  }

  return {
    uid: keyData.uid,
    email: user.email ?? '',
    name: user.name ?? '',
    role: user.role || 'sales',
    status: (user.status as 'active' | 'disabled') ?? 'active'
  }
}

/** Stateless mirror of crmUtils.canEditDeal, using the role-matrix pattern from cron/_shared.ts. */
export function canEditDealServer(matrix: RoleMatrix, caller: McpCaller, deal: Pick<Deal, 'ownerId'>): boolean {
  if (roleGrants(matrix, caller, 'pipeline:edit')) return true
  if (!roleGrants(matrix, caller, 'pipeline:edit-own')) return false
  if (!deal.ownerId) return true
  return caller.email === deal.ownerId
}

export type McpErrorCode = 'forbidden' | 'not_found' | 'invalid_input'

/** Thrown by tool handlers; caught at the registration layer and turned into a clean tool error result. */
export class McpToolError extends Error {
  code: McpErrorCode
  constructor(code: McpErrorCode, message: string) {
    super(message)
    this.code = code
  }
}

export function requirePermission(matrix: RoleMatrix, caller: McpCaller, key: string): void {
  if (!roleGrants(matrix, caller, key)) {
    throw new McpToolError('forbidden', `Your role ("${caller.role}") does not have the "${key}" permission.`)
  }
}

/** Standard success shape for an MCP tool call — a single JSON text block. */
export function toolResult(data: unknown) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] }
}

/** Standard error shape for an MCP tool call. */
export function toolError(message: string) {
  return { content: [{ type: 'text' as const, text: message }], isError: true as const }
}

/** Run a tool handler, converting McpToolError (and anything else) into a clean tool-error result. */
export async function runTool<T>(fn: () => Promise<T>) {
  try {
    const data = await fn()
    return toolResult(data)
  } catch (err) {
    if (err instanceof McpToolError) return toolError(err.message)
    console.error('MCP tool error:', err)
    return toolError(err instanceof Error ? err.message : 'Unexpected error')
  }
}
