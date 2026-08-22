// One-time: set stageEnteredAt / statusEnteredAt on legacy deals that lack them,
// using updatedAt (fallback createdAt) as the best-known entry time.
//
// Uses the Admin SDK (the new Firestore rules block anonymous deal writes).
// Service account via env FIREBASE_SERVICE_ACCOUNT or scripts/serviceAccount.json.
//
// Run:  node scripts/backfillEnteredAt.mjs   (safe / idempotent — only fills gaps)

import { readFileSync } from 'node:fs'
import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

function loadServiceAccount() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
  return JSON.parse(readFileSync(new URL('./serviceAccount.json', import.meta.url), 'utf8'))
}

function toIso(v) {
  if (!v) return null
  if (typeof v.toDate === 'function') return v.toDate().toISOString()
  const d = new Date(v)
  return isNaN(d.getTime()) ? null : d.toISOString()
}

async function main() {
  if (!getApps().length) initializeApp({ credential: cert(loadServiceAccount()) })
  const db = getFirestore()

  const snap = await db.collection('deals').get()
  console.log(`Total deals: ${snap.size}`)

  let batch = db.batch()
  let pending = 0
  let updated = 0

  for (const doc of snap.docs) {
    const d = doc.data()
    const fallback = toIso(d.updatedAt) ?? toIso(d.createdAt)
    if (!fallback) continue
    const patch = {}
    if (!d.statusEnteredAt) patch.statusEnteredAt = fallback
    if (!d.stageEnteredAt) patch.stageEnteredAt = fallback
    if (Object.keys(patch).length === 0) continue

    batch.update(doc.ref, patch)
    pending++
    updated++
    if (pending >= 400) {
      await batch.commit()
      batch = db.batch()
      pending = 0
      console.log(`  committed ${updated}…`)
    }
  }
  if (pending > 0) await batch.commit()

  console.log(`\nDone. Backfilled ${updated} deal(s).`)
  process.exit(0)
}

main().catch(err => {
  console.error('\nBackfill failed:', err)
  process.exit(1)
})
