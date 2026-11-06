// Shared plumbing for the RMS analytics proxy endpoints (room-types, pace, reports).
//
// The Revenue Console's RMS API is browser-unreachable by design (CORS locked to its
// own origins, session cookie is SameSite=Strict) — so these Vercel functions act as a
// same-origin relay: the Vue app calls /api/rms/*, we log into RMS server-side with the
// PIN, hold the session cookie, and forward the request.
//
// Session cookie caching is per-function-instance (module scope), not shared across
// room-types/pace/reports or across cold starts — each warm instance re-logs in at most
// once per ~8h. That's fine for read-only analytics traffic; a 401 mid-flight triggers
// one re-login + retry regardless.

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getApps, initializeApp, cert } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'

export class RmsError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

function initFirebase() {
  if (!getApps().length) {
    const svc = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '{}')
    initializeApp({ credential: cert(svc) })
  }
}

/** Any signed-in app user may call these endpoints; page/nav visibility is gated by the `analytics:view` permission client-side. */
export async function requireAuth(req: VercelRequest, res: VercelResponse): Promise<boolean> {
  const header = req.headers['authorization']
  const token = typeof header === 'string' && header.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) {
    res.status(401).json({ status: 'error', message: 'Unauthorized' })
    return false
  }
  try {
    initFirebase()
    await getAuth().verifyIdToken(token)
    return true
  } catch {
    res.status(401).json({ status: 'error', message: 'Unauthorized' })
    return false
  }
}

// 8h session lifetime, minus a small safety buffer so we never ride a cookie to the wire.
const SESSION_TTL_MS = 8 * 60 * 60 * 1000 - 60_000

let cachedSession: { cookie: string; expiresAt: number } | null = null

function baseUrl(): string {
  const url = process.env.RMS_BASE_URL
  if (!url) throw new RmsError(503, 'RMS_BASE_URL is not configured')
  return url.replace(/\/$/, '')
}

async function login(): Promise<string> {
  const pin = process.env.RMS_PIN
  if (!pin) throw new RmsError(503, 'RMS_PIN is not configured')

  let res: Response
  try {
    res = await fetch(`${baseUrl()}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin })
    })
  } catch {
    throw new RmsError(503, 'RMS backend unreachable')
  }

  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new RmsError(res.status, body?.message ?? 'RMS login failed')
  }

  const setCookies =
    typeof (res.headers as Headers & { getSetCookie?: () => string[] }).getSetCookie === 'function'
      ? (res.headers as Headers & { getSetCookie: () => string[] }).getSetCookie()
      : [res.headers.get('set-cookie') ?? ''].filter(Boolean)
  const cookie = setCookies
    .map(c => c.split(';')[0])
    .filter(Boolean)
    .join('; ')
  if (!cookie) throw new RmsError(502, 'RMS login did not return a session cookie')

  cachedSession = { cookie, expiresAt: Date.now() + SESSION_TTL_MS }
  return cookie
}

async function ensureSession(): Promise<string> {
  if (cachedSession && cachedSession.expiresAt > Date.now()) return cachedSession.cookie
  return login()
}

async function rmsGet(path: string, query: Record<string, string>): Promise<unknown> {
  const qs = new URLSearchParams(query).toString()
  const url = `${baseUrl()}${path}${qs ? `?${qs}` : ''}`

  let cookie = await ensureSession()
  let res: Response
  try {
    res = await fetch(url, { headers: { Cookie: cookie } })
  } catch {
    throw new RmsError(503, 'RMS backend unreachable')
  }

  if (res.status === 401) {
    cachedSession = null
    cookie = await login()
    try {
      res = await fetch(url, { headers: { Cookie: cookie } })
    } catch {
      throw new RmsError(503, 'RMS backend unreachable')
    }
  }

  const body = await res.json().catch(() => null)
  if (!res.ok) {
    throw new RmsError(res.status, body?.message ?? `RMS request failed (${res.status})`)
  }
  return body
}

/** GET-only proxy: auth-gates, builds the query string from the allow-listed params, forwards, and maps RMS's {status,message} errors through 1:1. */
export async function handleRmsProxy(
  req: VercelRequest,
  res: VercelResponse,
  path: string,
  allowedParams: string[]
): Promise<void> {
  if (req.method !== 'GET') {
    res.status(405).json({ status: 'error', message: 'Method not allowed' })
    return
  }
  if (!(await requireAuth(req, res))) return

  const query: Record<string, string> = {}
  for (const key of allowedParams) {
    const value = req.query[key]
    if (typeof value === 'string' && value !== '') query[key] = value
    else if (Array.isArray(value) && value.length) query[key] = value.join(',')
  }

  try {
    const data = await rmsGet(path, query)
    res.status(200).json(data)
  } catch (err) {
    if (err instanceof RmsError) {
      res.status(err.status).json({ status: 'error', message: err.message })
      return
    }
    res.status(503).json({ status: 'error', message: 'RMS backend unreachable' })
  }
}
