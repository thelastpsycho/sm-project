import { createHash } from 'node:crypto'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { Timestamp, type Firestore } from 'firebase-admin/firestore'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { handleOAuth, oauthConfig, resolveOAuthCaller } from '../../../api/mcp/_oauth'
import { generateApiKey, resolveMcpCaller } from '../../../api/mcp/_shared'

const firebase = vi.hoisted(() => ({
  verifyIdToken: vi.fn(),
  getUser: vi.fn()
}))
vi.mock('firebase-admin/auth', () => ({ getAuth: () => firebase }))

const ORIGIN = 'https://sm.example.com'
const RESOURCE = ORIGIN + '/api/mcp'
const REDIRECT = 'https://client.example.com/callback'
const VERIFIER = 'a'.repeat(43)
const CHALLENGE = createHash('sha256').update(VERIFIER).digest('base64url')

function testStore() {
  const records = new Map<string, Record<string, unknown>>()
  const collection = (name: string) => ({
    doc(id: string) {
      const path = name + '/' + id
      const get = async () => ({ data: () => records.get(path), exists: records.has(path), ref })
      const set = async (data: Record<string, unknown>) => {
        records.set(path, Object.fromEntries(Object.entries(data).map(([key, value]) => [
          key, value instanceof Date ? Timestamp.fromDate(value) : value
        ])))
      }
      const ref = {
        get, set, create: set,
        update: (data: Record<string, unknown>) => set({ ...records.get(path), ...data }),
        delete: () => records.delete(path)
      }
      return ref
    }
  })
  return {
    records,
    collection,
    db: {
      collection,
      runTransaction: async (fn: (tx: unknown) => Promise<unknown>) => fn({
        get: (ref: { get(): unknown }) => ref.get(),
        create: (ref: { create(value: unknown): unknown }, data: unknown) => ref.create(data),
        set: (ref: { set(value: unknown): unknown }, data: unknown) => ref.set(data),
        delete: (ref: { delete(): unknown }) => ref.delete()
      })
    } as unknown as Firestore
  }
}

let store = testStore()

async function call(
  route: string, method: string,
  request: { body?: unknown; query?: Record<string, string>; headers?: Record<string, string> } = {}
) {
  const response = {
    code: 200,
    payload: {} as Record<string, string>,
    location: '',
    headers: {} as Record<string, string>,
    setHeader(name: string, value: string) { this.headers[name] = value; return this },
    status(code: number) { this.code = code; return this },
    json(data: Record<string, string>) { this.payload = data; return this },
    redirect(code: number, path: string) { this.code = code; this.location = path; return this },
    end() { return this }
  }
  const req = { query: {}, headers: {}, ...request, method } as VercelRequest
  await handleOAuth(req, response as unknown as VercelResponse, route, () => store.db)
  return response
}

async function register() {
  const result = await call('register', 'POST', {
    body: { redirect_uris: [REDIRECT], token_endpoint_auth_method: 'none', client_name: 'Test client' }
  })
  expect(result.code).toBe(201)
  return result.payload.client_id!
}

function authorize(client: string, query: Record<string, string> = {}) {
  return call('authorize', 'GET', {
    query: {
      client_id: client, redirect_uri: REDIRECT, response_type: 'code', state: 'client-state',
      code_challenge: CHALLENGE, code_challenge_method: 'S256', resource: RESOURCE, ...query
    }
  })
}

function consent(request: string, action: string, origin = ORIGIN) {
  return call('consent', 'POST', {
    headers: { origin, authorization: 'Bearer firebase-id-token' },
    body: { request, action }
  })
}

async function authorizeAndApprove(client: string) {
  const authorization = await authorize(client)
  expect(authorization.code).toBe(302)
  const request = new URL(authorization.location).searchParams.get('request')!
  const approval = await consent(request, 'approve')
  expect(approval.code).toBe(200)
  expect((await consent(request, 'approve')).code).toBe(400)
  const callback = new URL(approval.payload.redirect!)
  expect(callback.searchParams.get('state')).toBe('client-state')
  expect(callback.searchParams.get('iss')).toBe(ORIGIN)
  return callback.searchParams.get('code')!
}

function form(route: string, fields: Record<string, string>) {
  return call(route, 'POST', {
    headers: { 'content-type': 'application/x-www-form-urlencoded; charset=UTF-8' },
    body: new URLSearchParams(fields).toString()
  })
}

function exchange(client_id: string, code: string, overrides: Record<string, string> = {}) {
  return form('token', {
    grant_type: 'authorization_code', client_id, code, redirect_uri: REDIRECT,
    code_verifier: VERIFIER, resource: RESOURCE, ...overrides
  })
}

function refresh(client_id: string, refresh_token: string) {
  return form('token', { grant_type: 'refresh_token', client_id, refresh_token, resource: RESOURCE })
}

beforeEach(async () => {
  store = testStore()
  vi.stubEnv('MCP_OAUTH_ORIGIN', ORIGIN)
  firebase.verifyIdToken.mockResolvedValue({
    uid: 'staff', auth_time: 1_700_000_000, firebase: { sign_in_provider: 'password' }
  })
  firebase.getUser.mockResolvedValue({ email: 'staff@example.com', disabled: false })
  await store.collection('users').doc('staff').set({ role: 'manager', status: 'active' })
})

afterEach(() => vi.unstubAllEnvs())

describe('MCP OAuth', () => {
  it('publishes metadata tied to the MCP resource and requires S256', async () => {
    expect((await call('resource', 'GET')).payload).toMatchObject({ resource: RESOURCE, authorization_servers: [ORIGIN] })
    expect((await call('metadata', 'GET')).payload).toMatchObject({
      issuer: ORIGIN, code_challenge_methods_supported: ['S256'], authorization_response_iss_parameter_supported: true
    })
    const client = await register()
    const response = await authorize(client, { code_challenge_method: 'plain' })
    expect(new URL(response.location).searchParams.get('error')).toBe('invalid_request')
  })

  it('validates redirects, resource, PKCE and the one-time code', async () => {
    const client = await register()
    const invalidRedirect = await authorize(client, { redirect_uri: REDIRECT + '/other' })
    expect(invalidRedirect.code).toBe(400)
    expect(invalidRedirect.location).toBe('')
    const code = await authorizeAndApprove(client)
    expect((await exchange(client, code, { resource: ORIGIN + '/different' })).payload.error).toBe('invalid_target')
    expect((await exchange(client, code, { code_verifier: 'b'.repeat(43) })).payload.error).toBe('invalid_grant')
    expect((await exchange(client, code, { redirect_uri: REDIRECT + '/other' })).payload.error).toBe('invalid_grant')

    const response = await exchange(client, code)
    expect(response.code).toBe(200)
    expect(await resolveOAuthCaller(response.payload.access_token!, store.db, oauthConfig()!))
      .toMatchObject({ uid: 'staff', role: 'manager' })
    expect((await exchange(client, code)).payload.error).toBe('invalid_grant')
  })

  it('requires same-origin consent by a staff member with MCP access', async () => {
    const client = await register()
    const authorization = await authorize(client)
    const request = new URL(authorization.location).searchParams.get('request')!
    expect((await consent(request, 'approve', 'https://client.example.com')).code).toBe(403)
    await store.collection('users').doc('staff').set({ role: 'sales', status: 'active' })
    expect((await consent(request, 'approve')).code).toBe(403)
    await store.collection('users').doc('staff').set({ role: 'manager', status: 'active' })
    const denial = await consent(request, 'deny')
    expect(new URL(denial.payload.redirect!).searchParams.get('error')).toBe('access_denied')
    expect((await consent(request, 'approve')).code).toBe(400)
  })

  it('rotates refresh tokens and closes the session when the spent token is reused', async () => {
    const client = await register()
    const code = await authorizeAndApprove(client)
    const { payload: original } = await exchange(client, code)
    const { payload: rotated } = await refresh(client, original.refresh_token!)
    expect(rotated.refresh_token).toBeTruthy()
    expect(rotated.refresh_token).not.toBe(original.refresh_token)
    expect(await resolveOAuthCaller(original.access_token!, store.db, oauthConfig()!)).toBeNull()
    expect((await refresh(client, original.refresh_token!)).payload.error).toBe('invalid_grant')
    expect(await resolveOAuthCaller(rotated.access_token!, store.db, oauthConfig()!)).toBeNull()
    expect((await refresh(client, rotated.refresh_token!)).payload.error).toBe('invalid_grant')
  })

  it('checks Firebase account status and supports revocation', async () => {
    const client = await register()
    const code = await authorizeAndApprove(client)
    const { payload: tokens } = await exchange(client, code)
    firebase.getUser.mockResolvedValue({ email: 'staff@example.com', disabled: true })
    expect(await resolveOAuthCaller(tokens.access_token!, store.db, oauthConfig()!)).toBeNull()
    expect((await refresh(client, tokens.refresh_token!)).payload.error).toBe('invalid_grant')
    firebase.getUser.mockResolvedValue({ email: 'staff@example.com', disabled: false })
    expect((await form('revoke', { client_id: client, token: tokens.refresh_token! })).code).toBe(200)
    expect(await resolveOAuthCaller(tokens.access_token!, store.db, oauthConfig()!)).toBeNull()
    expect((await refresh(client, tokens.refresh_token!)).payload.error).toBe('invalid_grant')
  })

  it('still resolves existing MCP API keys', async () => {
    const key = generateApiKey()
    await store.collection('mcpApiKeys').doc(key.hash).set({ uid: 'staff', revoked: false })
    const req = { headers: { authorization: 'Bearer ' + key.raw } } as VercelRequest
    expect(await resolveMcpCaller(req, store.db)).toMatchObject({ uid: 'staff', role: 'manager' })
  })
})
