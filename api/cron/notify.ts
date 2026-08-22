import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getApps, initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { getMessaging } from 'firebase-admin/messaging'
import { computeUserAlerts, DEFAULT_ALERT_CONFIG } from '../../src/lib/crmAlerts'
import type { Deal } from '../../src/types/crm'

function db() {
  if (!getApps().length) {
    const svc = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '{}')
    initializeApp({ credential: cert(svc) })
  }
  return getFirestore()
}

/**
 * Daily Vercel Cron job: compute each active user's pipeline alerts and push them.
 * Guarded by CRON_SECRET (Vercel Cron sends it as `Authorization: Bearer <secret>`).
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const secret = process.env.CRON_SECRET
  if (secret && req.headers['authorization'] !== `Bearer ${secret}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const store = db()
  const now = new Date()

  const dealsSnap = await store.collection('deals').get()
  const deals: Deal[] = dealsSnap.docs.map(d => {
    const data = d.data() as Record<string, any>
    return {
      id: d.id,
      ...data,
      createdAt: data.createdAt?.toDate?.() ?? new Date(0),
      updatedAt: data.updatedAt?.toDate?.() ?? new Date(0)
    } as Deal
  })

  const usersSnap = await store.collection('users').get()
  const messaging = getMessaging()
  let usersNotified = 0
  let messagesSent = 0

  for (const userDoc of usersSnap.docs) {
    const u = userDoc.data() as Record<string, any>
    if ((u.status || 'active') === 'disabled') continue
    const email: string = u.email
    const tokens: string[] = Array.isArray(u.fcmTokens) ? u.fcmTokens : []
    if (!email || tokens.length === 0) continue

    const alerts = computeUserAlerts(deals, email, DEFAULT_ALERT_CONFIG, now)
    if (alerts.length === 0) continue

    const top = alerts[0]
    const link = `/crm?deal=${top.dealId}`
    const resp = await messaging.sendEachForMulticast({
      tokens,
      notification: {
        title: `${alerts.length} pipeline alert${alerts.length === 1 ? '' : 's'}`,
        body: top.message
      },
      data: { url: link },
      webpush: { fcmOptions: { link } }
    })
    messagesSent += resp.successCount
    usersNotified++

    // Prune tokens that are no longer valid.
    const invalid: string[] = []
    resp.responses.forEach((r, i) => {
      if (!r.success) {
        const code = r.error?.code || ''
        if (
          code.includes('registration-token-not-registered') ||
          code.includes('invalid-registration-token') ||
          code.includes('invalid-argument')
        ) {
          invalid.push(tokens[i])
        }
      }
    })
    if (invalid.length) {
      await userDoc.ref.update({ fcmTokens: tokens.filter(t => !invalid.includes(t)) })
    }
  }

  return res.status(200).json({ ok: true, usersNotified, messagesSent })
}
