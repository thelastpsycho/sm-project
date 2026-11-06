// Client for the same-origin /api/rms/* proxy (see api/rms/_shared.ts) that relays to
// the Revenue Console's RMS backend. The browser can't call RMS directly — its CORS is
// locked to the Revenue Console's own origins and the session cookie is SameSite=Strict
// — so this always goes through our own serverless functions, authenticated with the
// signed-in user's Firebase ID token (same pattern as adminApi.ts).

import { auth } from '@/lib/firebase'
import type {
  RmsFilterParams,
  RmsPaceResponse,
  RmsPaceRow,
  RmsReportsParams,
  RmsReportsResponse,
  RmsRoomTypesResponse
} from '@/types/rms'

async function rmsFetch<T>(path: string, params: Record<string, string | number | undefined>): Promise<T> {
  const user = auth.currentUser
  if (!user) throw new Error('Not signed in.')
  const token = await user.getIdToken()

  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') query.set(key, String(value))
  }
  const qs = query.toString()

  const res = await fetch(`${path}${qs ? `?${qs}` : ''}`, {
    headers: { Authorization: `Bearer ${token}` }
  })

  const data = await res.json().catch(() => null)
  if (!res.ok) {
    throw new Error(data?.message ?? `Request failed (${res.status})`)
  }
  return data as T
}

export async function fetchRoomTypes(): Promise<RmsRoomTypesResponse> {
  return rmsFetch<RmsRoomTypesResponse>('/api/rms/room-types', {})
}

/** Normalizes the /pace envelope (bare array or `{ rows }`) to a plain row array. */
export function paceRows(data: RmsPaceResponse): RmsPaceRow[] {
  return Array.isArray(data) ? data : data.rows
}

export async function fetchPace(params: RmsFilterParams): Promise<RmsPaceRow[]> {
  const data = await rmsFetch<RmsPaceResponse>('/api/rms/pace', { ...params })
  return paceRows(data)
}

export async function fetchReports(params: RmsReportsParams): Promise<RmsReportsResponse> {
  return rmsFetch<RmsReportsResponse>('/api/rms/reports', { ...params })
}
