// Pushes a guest who consented to marketing into Insider One as an audience member and
// fires a custom event ("survey_feedback_submitted") so an Architect journey can pick it
// up and send the thank-you email. Kept server-side so the Insider API token never ships
// in the client bundle.

import type { VercelRequest, VercelResponse } from '@vercel/node'

const INSIDER_UPSERT_URL = 'https://unification.useinsider.com/api/user/v1/upsert'

interface SyncPayload {
  email?: string
  name?: string
  companyName?: string
  eventName?: string
  role?: string
  averageScore?: number
  submittedAt?: string
  consentGiven?: boolean
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ status: 'error', message: 'Method not allowed' })
    return
  }

  const body = req.body as SyncPayload

  // Only consented guests may be synced to Insider's marketing audience.
  if (!body.consentGiven) {
    res.status(200).json({ status: 'skipped', reason: 'No marketing consent' })
    return
  }
  if (!body.email) {
    res.status(400).json({ status: 'error', message: 'email is required' })
    return
  }

  const token = process.env.INSIDER_API_TOKEN
  const partnerName = process.env.INSIDER_PARTNER_NAME
  if (!token || !partnerName) {
    console.error('Insider sync skipped: INSIDER_API_TOKEN / INSIDER_PARTNER_NAME not configured')
    res.status(503).json({ status: 'error', message: 'Insider integration is not configured' })
    return
  }

  const insiderBody = {
    skip_hook: false,
    users: [
      {
        identifiers: { email: body.email },
        attributes: {
          name: body.name,
          email_optin: true,
          custom: {
            last_survey_company: body.companyName,
            last_survey_event: body.eventName,
            last_survey_role: body.role,
            last_survey_average_score: body.averageScore
          }
        },
        events: [
          {
            event_name: 'survey_feedback_submitted',
            timestamp: body.submittedAt || new Date().toISOString(),
            event_params: {
              event_name_mice: body.eventName,
              company_name: body.companyName,
              average_score: body.averageScore
            }
          }
        ]
      }
    ]
  }

  try {
    const insiderRes = await fetch(INSIDER_UPSERT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-PARTNER-NAME': partnerName,
        'X-REQUEST-TOKEN': token
      },
      body: JSON.stringify(insiderBody)
    })

    const data = await insiderRes.json().catch(() => null)
    if (!insiderRes.ok || data?.data?.fail?.count) {
      console.error('Insider upsert failed:', insiderRes.status, data)
      res.status(502).json({ status: 'error', message: 'Insider upsert failed', details: data })
      return
    }

    res.status(200).json({ status: 'ok' })
  } catch (err) {
    console.error('Insider upsert request failed:', err)
    res.status(503).json({ status: 'error', message: 'Insider backend unreachable' })
  }
}
