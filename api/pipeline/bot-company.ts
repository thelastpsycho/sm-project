// Per-company deal lookup for the Telegram chat bot's AI Agent, exposed as an n8n AI
// Tool — called only when a question names a specific company (e.g. "how is IWC doing",
// "how many deals did LH Travel generate this month"), so the default per-message cost
// (bot-summary) stays flat regardless of how many companies exist in the pipeline.

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { toBaliISO } from '../../src/lib/time.js'
import type { Deal } from '../../src/types/crm.js'
import { db, loadDeals } from '../cron/_shared.js'
import { botAuthorized, outcome, dealValue } from './_shared.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!botAuthorized(req, res)) return

  const q = String(req.query.company ?? '')
    .trim()
    .toLowerCase()
  if (!q) {
    res.status(400).json({ error: 'company query param required' })
    return
  }

  const store = db()
  const deals: Deal[] = await loadDeals(store)

  const matches = deals
    .filter(d => d.company?.toLowerCase().includes(q))
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 30)
    .map(d => ({
      company: d.company,
      stage: d.stage ?? 'New',
      value: dealValue(d),
      rooms: d.rooms ?? 0,
      arrivalDate: d.arrivalDate ?? null,
      checkoutDate: d.checkoutDate ?? null,
      ownerName: d.ownerName,
      createdAt: toBaliISO(d.createdAt),
      nextAction: d.nextAction ?? null,
      actionDueDate: d.actionDueDate ?? null,
      reasonWonLost: outcome(d) === 'lost' ? d.reasonWonLost ?? null : null
    }))

  res.status(200).json({ query: q, matchCount: matches.length, deals: matches })
}
