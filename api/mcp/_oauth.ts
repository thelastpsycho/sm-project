import { createHash, randomBytes } from 'node:crypto'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getAuth } from 'firebase-admin/auth'
import type { Firestore, Timestamp, Transaction } from 'firebase-admin/firestore'
import { effectiveRole, loadRoleMatrix, roleGrants } from '../cron/_shared.js'
import { bearerToken, hashApiKey, type McpCaller } from './_shared.js'

const SCOPE = 'mcp:access'
const MINUTE = 60_000
const ACCESS_LIFETIME = 60 * MINUTE
const REFRESH_LIFETIME = 90 * 24 * 60 * MINUTE
const ID = /^[A-Za-z0-9_-]{43}$/
const ACCESS_PREFIX = 'mcp_oauth_'
const REFRESH_PREFIX = 'mcp_refresh_'
const GRANTS = ['authorization_code', 'refresh_token']

type Fields = Record<string, unknown>
type Client = { name: string; redirects: string[]; issuer: string }
type Authorization = {
  clientId: string
  redirect: string
  state: string
  challenge: string
  resource: string
  expiresAt: Timestamp
}
type Identity = { uid: string; authTime: number }
type Code = Authorization & Identity
type Credential = Identity & {
  clientId: string
  resource: string
  scope: string
  kind: 'access' | 'refresh'
  familyId: string
  expiresAt: Timestamp
}

type TokenFamily = { accessId: string; refreshId: string; expiresAt: Timestamp }

function randomId() {
  return randomBytes(32).toString('base64url')
}

export function oauthConfig() {
  const raw = process.env.MCP_OAUTH_ORIGIN
  if (!raw) return null
  const url = new URL(raw)
  if ((url.origin !== raw && url.origin + '/' !== raw) || (url.protocol !== 'https:' && !isLoopback(url))) {
    throw new Error('MCP_OAUTH_ORIGIN must be an HTTPS or loopback origin without a path')
  }
  return {
    issuer: url.origin,
    resource: url.origin + '/api/mcp',
    metadata: url.origin + '/.well-known/oauth-protected-resource/api/mcp'
  }
}

type OAuthConfig = NonNullable<ReturnType<typeof oauthConfig>>

function isLoopback(url: URL) {
  return url.protocol === 'http:' && ['127.0.0.1', '[::1]', 'localhost'].includes(url.hostname)
}

function readString(values: Fields, key: string, limit = 2048) {
  const value = values[key]
  return typeof value === 'string' && value.length <= limit ? value : ''
}

function validRedirect(value: unknown): value is string {
  if (typeof value !== 'string' || value.length > 2048 || value.includes('#') || /[\u0000-\u0020\\]/.test(value)) return false
  try {
    const url = new URL(value)
    return (url.protocol === 'https:' || isLoopback(url)) &&
      !url.username && !url.password &&
      !['code', 'state', 'error', 'error_description', 'iss'].some(key => url.searchParams.has(key))
  } catch {
    return false
  }
}

function pkceMatches(verifier: string, challenge: string) {
  return /^[A-Za-z0-9._~-]{43,128}$/.test(verifier) &&
    createHash('sha256').update(verifier).digest('base64url') === challenge
}

function live(record: { expiresAt: Timestamp }) {
  return record.expiresAt.toMillis() > Date.now()
}

function oauthError(res: VercelResponse, error: string, description?: string, status = 400) {
  return res.status(status).json({ error, ...(description && { error_description: description }) })
}

function callback(redirect: string, state: string, config: OAuthConfig, result: Record<string, string>) {
  const url = new URL(redirect)
  for (const [key, value] of Object.entries(result)) url.searchParams.set(key, value)
  if (state) url.searchParams.set('state', state)
  url.searchParams.set('iss', config.issuer)
  return url.toString()
}

function document(store: Firestore, type: string, id: string) {
  return store.collection('mcpOAuth').doc(type + '_' + id)
}

async function loadClient(store: Firestore, clientId: string, config: OAuthConfig) {
  if (!ID.test(clientId)) return null
  const client = (await document(store, 'client', clientId).get()).data() as Client | undefined
  return client?.issuer === config.issuer ? client : null
}

async function register(req: VercelRequest, res: VercelResponse, config: OAuthConfig, store: Firestore) {
  const metadata = req.body as Fields | undefined
  const redirects = metadata?.redirect_uris
  const grants = metadata?.grant_types
  const responses = metadata?.response_types
  const method = metadata?.token_endpoint_auth_method
  if (!Array.isArray(redirects) || redirects.length === 0 || redirects.length > 10 || !redirects.every(validRedirect)) {
    return oauthError(res, 'invalid_redirect_uri', 'Supply up to ten HTTPS or local callback URLs.')
  }
  if ((method !== undefined && method !== 'none') ||
      (grants !== undefined && (!Array.isArray(grants) || !grants.includes('authorization_code') ||
        grants.some(grant => !GRANTS.includes(grant)))) ||
      (responses !== undefined && (!Array.isArray(responses) || responses.length !== 1 || responses[0] !== 'code'))) {
    return oauthError(res, 'invalid_client_metadata', 'Use the authorization code flow with PKCE and no client secret.')
  }

  const name = readString(metadata ?? {}, 'client_name', 200) || 'MCP client'
  // Public client IDs describe a registration and carry no authorization. Derive the
  // ID from its redirect list and issuer so retries don't create duplicate records.
  const clientId = createHash('sha256').update(JSON.stringify([config.issuer, name, redirects])).digest('base64url')
  await document(store, 'client', clientId).set({ name, redirects, issuer: config.issuer })
  return res.status(201).json({
    client_id: clientId,
    client_name: name,
    redirect_uris: redirects,
    grant_types: GRANTS,
    response_types: ['code'],
    token_endpoint_auth_method: 'none',
    scope: SCOPE
  })
}

async function authorize(req: VercelRequest, res: VercelResponse, config: OAuthConfig, store: Firestore) {
  const params = req.query
  const clientId = readString(params, 'client_id')
  const redirect = readString(params, 'redirect_uri')
  const client = await loadClient(store, clientId, config)
  if (!client?.redirects.includes(redirect)) return oauthError(res, 'invalid_request', 'Unknown client or callback URL.')

  const state = readString(params, 'state')
  const fail = (error: string) => res.redirect(302, callback(redirect, state, config, { error }))
  const challenge = readString(params, 'code_challenge')
  if (params.response_type !== 'code') return fail('unsupported_response_type')
  if (params.code_challenge_method !== 'S256' || !ID.test(challenge) || (params.state !== undefined && !state)) {
    return fail('invalid_request')
  }
  if (params.scope !== undefined && params.scope !== SCOPE) return fail('invalid_scope')
  if (params.resource !== undefined && params.resource !== config.resource) return fail('invalid_target')

  const requestId = randomId()
  await document(store, 'request', hashApiKey(requestId)).create({
    clientId, redirect, state, challenge, resource: config.resource,
    expiresAt: new Date(Date.now() + 10 * MINUTE)
  })
  return res.redirect(302, config.issuer + '/mcp/authorize?request=' + requestId)
}

async function consent(req: VercelRequest, res: VercelResponse, config: OAuthConfig, store: Firestore) {
  if (req.headers.origin !== config.issuer) return oauthError(res, 'access_denied', undefined, 403)
  const token = bearerToken(req)
  if (!token) return oauthError(res, 'invalid_token', undefined, 401)

  const decoded = await getAuth().verifyIdToken(token, true).catch(() => null)
  if (!decoded || decoded.firebase.sign_in_provider === 'anonymous') {
    return oauthError(res, 'invalid_token', undefined, 401)
  }
  const identity = { uid: decoded.uid, authTime: decoded.auth_time }
  const caller = await currentCaller(store, identity)
  if (!caller || !roleGrants(await loadRoleMatrix(store), caller, SCOPE)) {
    return oauthError(res, 'access_denied', 'Your account does not have MCP access.', 403)
  }

  const body = (req.body ?? {}) as Fields
  const requestId = readString(body, 'request')
  const action = readString(body, 'action')
  if (!ID.test(requestId)) return oauthError(res, 'invalid_request')
  const ref = document(store, 'request', hashApiKey(requestId))
  if (action === 'inspect') {
    const pending = (await ref.get()).data() as Authorization | undefined
    if (!pending || !live(pending) || pending.resource !== config.resource) return oauthError(res, 'invalid_request')
    const client = await loadClient(store, pending.clientId, config)
    if (!client) return oauthError(res, 'invalid_request')
    return res.json({ clientName: client.name, redirectUri: pending.redirect, email: caller.email })
  }

  if (action !== 'approve' && action !== 'deny') return oauthError(res, 'invalid_request')
  const code = randomId()
  const redirect = await store.runTransaction(async tx => {
    const pending = (await tx.get(ref)).data() as Authorization | undefined
    if (!pending || !live(pending) || pending.resource !== config.resource) return null
    tx.delete(ref)
    if (action === 'deny') return callback(pending.redirect, pending.state, config, { error: 'access_denied' })
    tx.create(document(store, 'code', hashApiKey(code)), {
      ...pending, ...identity, expiresAt: new Date(Date.now() + 2 * MINUTE)
    })
    return callback(pending.redirect, pending.state, config, { code })
  })
  if (!redirect) return oauthError(res, 'invalid_request', 'This connection request has expired or was already used.')
  return res.json({ redirect })
}

async function currentCaller(store: Firestore, identity: Identity): Promise<McpCaller | null> {
  const [account, snapshot] = await Promise.all([
    getAuth().getUser(identity.uid).catch((err: { code?: string }) => {
      if (err.code === 'auth/user-not-found') return null
      throw err
    }),
    store.collection('users').doc(identity.uid).get()
  ])
  const user = snapshot.data()
  const revokedAt = account?.tokensValidAfterTime ? Date.parse(account.tokensValidAfterTime) / 1000 : 0
  if (!account?.email || account.disabled || !user || user.status === 'disabled' || revokedAt > identity.authTime) {
    return null
  }
  // Other roles are maintained by Team & Access and protected by firestore.rules.
  const email = account.email
  const role = account.customClaims?.admin === true
    ? 'admin'
    : effectiveRole({ email, role: user.role === 'admin' ? 'sales' : user.role })
  return { uid: identity.uid, email, role, name: user.name ?? '', status: 'active' }
}

function formFields(req: VercelRequest): Fields | null {
  if (req.headers['content-type']?.split(';')[0]?.trim().toLowerCase() !== 'application/x-www-form-urlencoded') {
    return null
  }
  if (typeof req.body === 'string') {
    if (req.body.length > 8192) return null
    const params = new URLSearchParams(req.body)
    if (new Set(params.keys()).size !== [...params].length) return null
    return Object.fromEntries(params)
  }
  // Vercel may pre-parse form bodies. Array-valued fields represent duplicates.
  if (!req.body || typeof req.body !== 'object') return null
  return Object.values(req.body).every(value => typeof value === 'string') ? req.body : null
}

function issueTokens(
  tx: Transaction, store: Firestore, grant: Identity & { clientId: string; resource: string },
  familyId: string, refreshExpires: Date
) {
  const access = ACCESS_PREFIX + randomId()
  const refresh = REFRESH_PREFIX + randomId()
  const accessId = hashApiKey(access)
  const refreshId = hashApiKey(refresh)
  const identity = { uid: grant.uid, authTime: grant.authTime, clientId: grant.clientId, resource: grant.resource, scope: SCOPE, familyId }
  tx.create(document(store, 'credential', accessId), {
    ...identity, kind: 'access',
    expiresAt: new Date(Math.min(Date.now() + ACCESS_LIFETIME, refreshExpires.getTime()))
  })
  tx.create(document(store, 'credential', refreshId), {
    ...identity, kind: 'refresh', expiresAt: refreshExpires
  })
  tx.set(document(store, 'family', familyId), { accessId, refreshId, expiresAt: refreshExpires })
  return {
    access_token: access, refresh_token: refresh, token_type: 'Bearer', scope: SCOPE,
    expires_in: Math.ceil(Math.min(ACCESS_LIFETIME, refreshExpires.getTime() - Date.now()) / 1000)
  }
}

async function exchange(req: VercelRequest, res: VercelResponse, config: OAuthConfig, store: Firestore) {
  const form = formFields(req)
  if (!form) return oauthError(res, 'invalid_request', 'Expected a form-encoded token request.')
  const { grant_type: kind, client_id: clientId, resource, scope } = form
  if (kind !== 'authorization_code' && kind !== 'refresh_token') return oauthError(res, 'unsupported_grant_type')
  if (resource !== undefined && resource !== config.resource) return oauthError(res, 'invalid_target')
  if (scope !== undefined && scope !== SCOPE) return oauthError(res, 'invalid_scope')
  if (req.headers.authorization || form.client_secret !== undefined || !await loadClient(store, readString(form, 'client_id'), config)) {
    return oauthError(res, 'invalid_client')
  }

  const raw = readString(form, kind === 'authorization_code' ? 'code' : 'refresh_token')
  if (kind === 'authorization_code' ? !ID.test(raw) : !isToken(raw, REFRESH_PREFIX)) {
    return oauthError(res, 'invalid_grant')
  }
  const tokenId = hashApiKey(raw)
  const ref = document(store, kind === 'authorization_code' ? 'code' : 'credential', tokenId)
  const validate = (grant: Code | Credential | undefined) => {
    if (!grant || !live(grant) || grant.clientId !== clientId || grant.resource !== config.resource) return null
    if (kind === 'authorization_code') {
      if (!('challenge' in grant) || form.redirect_uri !== grant.redirect ||
          !pkceMatches(readString(form, 'code_verifier'), grant.challenge)) return null
    } else if (!('kind' in grant) || grant.kind !== 'refresh' || grant.scope !== SCOPE) return null
    return grant
  }

  const grant = validate((await ref.get()).data() as Code | Credential | undefined)
  if (!grant) return oauthError(res, 'invalid_grant')
  const caller = await currentCaller(store, grant)
  if (!caller || !roleGrants(await loadRoleMatrix(store), caller, SCOPE)) return oauthError(res, 'invalid_grant')

  const tokens = await store.runTransaction(async tx => {
    const current = validate((await tx.get(ref)).data() as Code | Credential | undefined)
    if (!current) return null
    if ('challenge' in current) {
      tx.delete(ref)
      return issueTokens(tx, store, current, randomId(), new Date(Date.now() + REFRESH_LIFETIME))
    }

    const familyRef = document(store, 'family', current.familyId)
    const family = (await tx.get(familyRef)).data() as TokenFamily | undefined
    if (!family || !live(family)) return null
    tx.delete(document(store, 'credential', family.accessId))
    if (tokenId !== family.refreshId) {
      // A spent refresh token was presented again. Terminate the active session.
      tx.delete(familyRef)
      tx.delete(document(store, 'credential', family.refreshId))
      return null
    }
    // Retain the spent token's hash until the family expires, to detect reuse.
    return issueTokens(tx, store, current, current.familyId, family.expiresAt.toDate())
  })
  return tokens ? res.json(tokens) : oauthError(res, 'invalid_grant')
}

function isToken(token: string, prefix: string) {
  return token.startsWith(prefix) && ID.test(token.slice(prefix.length))
}

async function revoke(req: VercelRequest, res: VercelResponse, config: OAuthConfig, store: Firestore) {
  const form = formFields(req)
  if (!form) return oauthError(res, 'invalid_request')
  if (!await loadClient(store, readString(form, 'client_id'), config)) return oauthError(res, 'invalid_client')
  const token = readString(form, 'token')
  if (!token) return oauthError(res, 'invalid_request')
  if (isToken(token, ACCESS_PREFIX) || isToken(token, REFRESH_PREFIX)) {
    const ref = document(store, 'credential', hashApiKey(token))
    await store.runTransaction(async tx => {
      const credential = (await tx.get(ref)).data() as Credential | undefined
      if (!credential || credential.clientId !== form.client_id || credential.resource !== config.resource) return
      const familyRef = document(store, 'family', credential.familyId)
      const family = (await tx.get(familyRef)).data() as TokenFamily | undefined
      if (!family) return
      tx.delete(familyRef)
      tx.delete(document(store, 'credential', family.accessId))
      tx.delete(document(store, 'credential', family.refreshId))
    })
  }
  return res.status(200).end()
}

export function isOAuthAccessToken(token: string) {
  return isToken(token, ACCESS_PREFIX)
}

export async function resolveOAuthCaller(token: string, store: Firestore, config: OAuthConfig) {
  const ref = document(store, 'credential', hashApiKey(token))
  const credential = (await ref.get()).data() as Credential | undefined
  if (!credential || !live(credential) || credential.kind !== 'access' ||
      credential.resource !== config.resource || credential.scope !== SCOPE) return null
  return currentCaller(store, credential)
}

export function oauthChallenge(config: OAuthConfig, error?: 'invalid_token' | 'insufficient_scope') {
  return `Bearer resource_metadata="${config.metadata}", scope="${SCOPE}"` + (error ? `, error="${error}"` : '')
}

export async function handleOAuth(
  req: VercelRequest, res: VercelResponse, route: string, getStore: () => Firestore
) {
  res.setHeader('Cache-Control', 'no-store')
  res.setHeader('Pragma', 'no-cache')
  res.setHeader('Referrer-Policy', 'no-referrer')
  const config = oauthConfig()
  if (!config) return res.status(404).json({ error: 'OAuth is not configured.' })

  const methods: Record<string, string> = {
    resource: 'GET', metadata: 'GET', authorize: 'GET', register: 'POST',
    token: 'POST', revoke: 'POST', consent: 'POST'
  }
  if (!Object.hasOwn(methods, route)) return res.status(404).end()
  const method = methods[route]!
  if (route !== 'authorize' && route !== 'consent') {
    res.setHeader('Access-Control-Allow-Origin', '*')
    if (req.method === 'OPTIONS') {
      res.setHeader('Access-Control-Allow-Methods', method)
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
      return res.status(204).end()
    }
  }
  if (req.method !== method) {
    res.setHeader('Allow', method)
    return res.status(405).end()
  }

  if (route === 'resource') return res.json({
    resource: config.resource,
    authorization_servers: [config.issuer],
    scopes_supported: [SCOPE],
    bearer_methods_supported: ['header']
  })
  if (route === 'metadata') return res.json({
    issuer: config.issuer,
    authorization_endpoint: config.issuer + '/oauth/authorize',
    token_endpoint: config.issuer + '/oauth/token',
    registration_endpoint: config.issuer + '/oauth/register',
    revocation_endpoint: config.issuer + '/oauth/revoke',
    scopes_supported: [SCOPE],
    response_types_supported: ['code'],
    grant_types_supported: GRANTS,
    token_endpoint_auth_methods_supported: ['none'],
    revocation_endpoint_auth_methods_supported: ['none'],
    code_challenge_methods_supported: ['S256'],
    authorization_response_iss_parameter_supported: true
  })

  const store = getStore()
  switch (route) {
    case 'register': return register(req, res, config, store)
    case 'authorize': return authorize(req, res, config, store)
    case 'consent': return consent(req, res, config, store)
    case 'token': return exchange(req, res, config, store)
    case 'revoke': return revoke(req, res, config, store)
  }
}
