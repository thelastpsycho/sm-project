// Shared plumbing for the pipeline chat bot endpoints (bot-summary, bot-company).

import type { VercelRequest, VercelResponse } from '@vercel/node'
import type { Deal, DealStage } from '../../src/types/crm.js'

/** Guard against public access to the bot endpoints. */
export function botAuthorized(req: VercelRequest, res: VercelResponse): boolean {
  const secret = process.env.PIPELINE_BOT_SECRET
  if (!secret || req.headers['authorization'] !== `Bearer ${secret}`) {
    res.status(401).json({ error: 'Unauthorized' })
    return false
  }
  return true
}

/** Derived outcome from the single stage axis. Confirmed → won, Lost → lost, else open. */
export function outcome(d: Pick<Deal, 'stage'>): 'open' | 'won' | 'lost' {
  const stage = (d.stage ?? 'New') as DealStage
  if (stage === 'Confirmed') return 'won'
  if (stage === 'Lost') return 'lost'
  return 'open'
}

/** The value to attribute to a deal: booked value for won deals, else the estimate. */
export function dealValue(d: Deal): number {
  return outcome(d) === 'won' ? d.actualRevenue ?? d.totalRevenue ?? 0 : d.totalRevenue ?? 0
}
