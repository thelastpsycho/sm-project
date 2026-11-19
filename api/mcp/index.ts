// Remote MCP server (Streamable HTTP transport) exposing CRM, Function Chart, and
// Survey data as tools, PLUS the self-service key-management actions, in a single
// function. Combined deliberately: the Hobby plan caps a deployment at 12 Serverless
// Functions, and this project is already near that limit — splitting these into two
// files would push it over. The two request shapes are easy to tell apart: key
// management posts `{ action: 'create'|'list'|'revoke', ... }`, while MCP protocol
// requests post a JSON-RPC envelope (`{ jsonrpc, method, ... }`).
//
// Runs stateless — a fresh McpServer + transport per Vercel invocation
// (sessionIdGenerator: undefined), since serverless functions aren't long-lived
// processes and tool calls here don't need multi-turn session state.

import type { VercelRequest, VercelResponse } from '@vercel/node'
import type { Firestore } from 'firebase-admin/firestore'
import { getAuth } from 'firebase-admin/auth'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import { db, loadRoleMatrix, roleGrants, effectiveRole } from '../cron/_shared.js'
import { bearerToken, generateApiKey, resolveMcpCaller } from './_shared.js'
import {
  handleOAuth, isOAuthAccessToken, listOAuthConnections, oauthChallenge, oauthConfig,
  resolveOAuthCaller, revokeOAuthConnection
} from './_oauth.js'
import { registerCrmTools } from './_tools/crmTools.js'
import { registerFunctionChartTools } from './_tools/functionChartTools.js'
import { registerSurveyTools } from './_tools/surveyTools.js'

export const config = { maxDuration: 30 }

const KEY_ACTIONS = new Set(['create', 'list', 'revoke', 'revokeConnection'])

interface FirebaseCaller {
  uid: string
  email: string
  name: string
  role: string
  isAdmin: boolean
}

async function verifyFirebaseUser(req: VercelRequest, store: Firestore): Promise<FirebaseCaller | null> {
  const header = req.headers['authorization']
  const token = typeof header === 'string' && header.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) return null
  try {
    const decoded = await getAuth().verifyIdToken(token)
    const userDoc = await store.collection('users').doc(decoded.uid).get()
    const data = userDoc.data() as { email?: string; name?: string; role?: string } | undefined
    const email = data?.email ?? decoded.email ?? ''
    const role = effectiveRole({ email, role: data?.role })
    return { uid: decoded.uid, email, name: data?.name ?? '', role, isAdmin: role === 'admin' }
  } catch {
    return null
  }
}

/**
 * Self-service MCP API key lifecycle, gated by a normal Firebase ID token (not an MCP
 * key) and the `mcp:access` permission. Admins see and can revoke every user's keys;
 * everyone else only their own.
 */
async function handleKeyAction(req: VercelRequest, res: VercelResponse, body: Record<string, any>) {
  // db() also ensures the firebase-admin app is initialized — must run before
  // getAuth() below, which otherwise throws on a cold instance with no app yet.
  const store = db()
  const caller = await verifyFirebaseUser(req, store)
  if (!caller) return res.status(401).json({ error: 'Unauthorized' })

  const matrix = await loadRoleMatrix(store)
  if (!roleGrants(matrix, { email: caller.email, role: caller.role }, 'mcp:access')) {
    return res.status(403).json({ error: 'Your role does not have MCP access.' })
  }

  const { action } = body

  try {
    if (action === 'create') {
      const label = typeof body.label === 'string' ? body.label.slice(0, 200) : ''
      const { raw, hash } = generateApiKey()
      await store.collection('mcpApiKeys').doc(hash).set({
        uid: caller.uid,
        ownerName: caller.name,
        ownerEmail: caller.email,
        label,
        createdAt: new Date(),
        lastUsedAt: null,
        revoked: false
      })
      // The raw key is shown exactly once — it is never retrievable again.
      return res.status(200).json({ ok: true, apiKey: raw, keyId: hash, label })
    }

    if (action === 'list') {
      const query = caller.isAdmin
        ? store.collection('mcpApiKeys')
        : store.collection('mcpApiKeys').where('uid', '==', caller.uid)
      const snap = await query.get()
      const keys = snap.docs.map(d => {
        const data = d.data()
        return {
          keyId: d.id,
          label: data.label ?? '',
          ownerName: data.ownerName ?? '',
          ownerEmail: data.ownerEmail ?? '',
          createdAt: data.createdAt?.toDate?.() ?? null,
          lastUsedAt: data.lastUsedAt?.toDate?.() ?? null,
          revoked: !!data.revoked
        }
      })
      const oauth = oauthConfig()
      const connections = oauth ? await listOAuthConnections(store, oauth, caller.isAdmin ? null : caller.uid) : []
      return res.status(200).json({ ok: true, keys, connections, scope: caller.isAdmin ? 'all' : 'own' })
    }

    if (action === 'revoke') {
      const { keyId } = body
      if (!keyId || typeof keyId !== 'string') return res.status(400).json({ error: 'keyId required' })
      const ref = store.collection('mcpApiKeys').doc(keyId)
      const snap = await ref.get()
      if (!snap.exists) return res.status(404).json({ error: 'Key not found' })
      if (!caller.isAdmin && snap.data()?.uid !== caller.uid) {
        return res.status(404).json({ error: 'Key not found' })
      }
      await ref.update({ revoked: true })
      return res.status(200).json({ ok: true })
    }

    if (action === 'revokeConnection') {
      const { familyId } = body
      if (!familyId || typeof familyId !== 'string') return res.status(400).json({ error: 'familyId required' })
      const oauth = oauthConfig()
      const ok = oauth && await revokeOAuthConnection(store, oauth, familyId, caller.uid, caller.isAdmin)
      if (!ok) return res.status(404).json({ error: 'Connection not found' })
      return res.status(200).json({ ok: true })
    }

    return res.status(400).json({ error: 'Unknown action' })
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Server error' })
  }
}

async function handleMcpRequest(req: VercelRequest, res: VercelResponse) {
  try {
    const oauth = oauthConfig()
    const token = bearerToken(req)
    const usingOAuth = !!token && isOAuthAccessToken(token)
    const store = token ? db() : null
    const caller = store && token
      ? usingOAuth
        ? oauth && await resolveOAuthCaller(token, store, oauth)
        : await resolveMcpCaller(req, store)
      : null
    if (!caller || !store) {
      if (oauth) res.setHeader('WWW-Authenticate', oauthChallenge(oauth, token ? 'invalid_token' : undefined))
      res.status(401).json({
        error: oauth ? 'Unauthorized. Connect with OAuth or provide a valid MCP API key.'
          : 'Unauthorized. Provide a valid MCP API key.'
      })
      return
    }
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST')
      res.status(405).json({ error: 'This MCP endpoint supports stateless POST requests.' })
      return
    }

    const matrix = await loadRoleMatrix(store)
    if (usingOAuth && oauth && !roleGrants(matrix, caller, 'mcp:access')) {
      res.setHeader('WWW-Authenticate', oauthChallenge(oauth, 'insufficient_scope'))
      res.status(403).json({ error: 'Your role does not have MCP access.' })
      return
    }

    const server = new McpServer({ name: 'sm-anvaya-mcp', version: '1.0.0' })
    const ctx = { store, caller, matrix }
    registerCrmTools(server, ctx)
    registerFunctionChartTools(server, ctx)
    registerSurveyTools(server, ctx)

    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined })
    res.on('close', () => {
      transport.close()
      server.close()
    })

    await server.connect(transport)
    await transport.handleRequest(req, res, req.body)
  } catch (err) {
    console.error('MCP request error:', err)
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error' })
    }
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const route = req.query.oauthRoute
  if (typeof route === 'string') {
    try {
      await handleOAuth(req, res, route, db)
    } catch (err) {
      console.error('MCP OAuth request failed:', err instanceof Error ? err.name : 'Unknown error')
      if (!res.headersSent) res.status(500).json({ error: 'server_error' })
    }
    return
  }

  const body = (req.body || {}) as Record<string, any>
  if (req.method === 'POST' && typeof body.action === 'string' && KEY_ACTIONS.has(body.action)) {
    await handleKeyAction(req, res, body)
    return
  }

  await handleMcpRequest(req, res)
}
