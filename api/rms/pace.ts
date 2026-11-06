// Proxies RMS's /api/rms/pace — daily rooms/revenue/pickup/stly/lyFinal rows for a
// date range + filter set. RMS clamps out-of-range pickupDays here (unlike /reports).

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { handleRmsProxy } from './_shared.js'

const PARAMS = [
  'start',
  'end',
  'companyIds',
  'roomType',
  'marketId',
  'nationalityIds',
  'channels',
  'group',
  'pickupDays',
  'comparison',
  'comparisonStart'
]

export default function handler(req: VercelRequest, res: VercelResponse) {
  return handleRmsProxy(req, res, '/api/rms/pace', PARAMS)
}
