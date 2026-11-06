// Proxies RMS's /api/rms/room-types — the lookup payload (companies, markets,
// nationalities, roomTypes, labels) the Company Analytics page caches once on load.

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { handleRmsProxy } from './_shared.js'

export default function handler(req: VercelRequest, res: VercelResponse) {
  return handleRmsProxy(req, res, '/api/rms/room-types', [])
}
