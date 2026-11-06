// Proxies RMS's /api/rms/reports — aggregated production/marketTrend/behaviour views.
// Same filters as /pace plus dateBasis; RMS hard-400s pickupDays outside 1-90 here.

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
  'comparisonStart',
  'dateBasis'
]

export default function handler(req: VercelRequest, res: VercelResponse) {
  return handleRmsProxy(req, res, '/api/rms/reports', PARAMS)
}
