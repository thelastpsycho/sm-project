// Per-company / per-owner deal lookup for the Telegram chat bot's AI Agent, exposed as
// an n8n AI Tool — called only when a question names a specific company or sales rep
// (e.g. "how is IWC doing", "how's Ravi doing by arrival date"), so the default
// per-message cost (bot-summary) stays flat regardless of how many deals exist.
// Each returned deal carries both createdAt (lead date) and arrivalDate (guest stay
// date) so the agent can aggregate by whichever date basis the question asked for.

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { toBaliISO } from '../../src/lib/time.js'
import type { Deal } from '../../src/types/crm.js'
import { db, loadDeals } from '../cron/_shared.js'
import { botAuthorized, outcome, dealValue } from './_shared.js'

// Punctuation/spacing-insensitive so "I.W.C." matches a query of "IWC".
const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!botAuthorized(req, res)) return

  const companyQ = String(req.query.company ?? '').trim()
  const ownerQ = String(req.query.owner ?? '').trim()
  if (!companyQ && !ownerQ) {
    res.status(400).json({ error: 'company or owner query param required' })
    return
  }
  const nCompany = normalize(companyQ)
  const nOwner = normalize(ownerQ)

  const store = db()
  const deals: Deal[] = await loadDeals(store)

  const allMatches = deals
    .filter(d => !nCompany || (d.company && normalize(d.company).includes(nCompany)))
    .filter(d => !nOwner || normalize(d.ownerName || d.ownerId || '').includes(nOwner))
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

  const matches = allMatches.slice(0, 30).map(d => ({
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

  res.status(200).json({
    query: { company: companyQ || null, owner: ownerQ || null },
    totalMatches: allMatches.length,
    returned: matches.length,
    deals: matches
  })
}
