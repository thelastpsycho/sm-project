// One-off owner fixups:
//  1. Doni's deals move from the old shared email to his new personal email.
//     (Aprilia still uses the old shared email, so we only move deals whose
//      ownerName is Doni's — never Aprilia's.)
//  2. Putu Widyawati's login email is corrected (putu@ -> putuwidyawati@): update the
//     Auth account, her users/{uid} doc, and reassign her deals; print a fresh reset link.
//
// Uses the Admin SDK (scripts/serviceAccount.json or FIREBASE_SERVICE_ACCOUNT).
// Run:  node scripts/fixOwners.mjs

import { readFileSync } from 'node:fs'
import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'

const DONI_OLD = 'micecoordinator@theanvayabali.com'
const DONI_NEW = 'donidartha@gmail.com'
const WIDYA_OLD = 'putu@theanvayabali.com'
const WIDYA_NEW = 'putuwidyawati@theanvayabali.com'

function loadServiceAccount() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
  return JSON.parse(readFileSync(new URL('./serviceAccount.json', import.meta.url), 'utf8'))
}

async function main() {
  if (!getApps().length) initializeApp({ credential: cert(loadServiceAccount()) })
  const db = getFirestore()
  const auth = getAuth()

  const snap = await db.collection('deals').get()
  console.log(`Total deals: ${snap.size}\n`)

  // ---- Report the two old emails ----
  const report = (email) => {
    const docs = snap.docs.filter(d => (d.data().ownerId || '') === email)
    const byName = {}
    for (const d of docs) {
      const n = d.data().ownerName || '(no name)'
      byName[n] = (byName[n] || 0) + 1
    }
    console.log(`ownerId == ${email}: ${docs.length} deal(s)`)
    for (const [n, c] of Object.entries(byName)) console.log(`   - ${n}: ${c}`)
    return docs
  }

  const miceDocs = report(DONI_OLD)
  const putuDocs = report(WIDYA_OLD)
  console.log('')

  // ---- Apply: Doni (only deals whose ownerName is Doni's) ----
  const doniDocs = miceDocs.filter(d => /doni/i.test(d.data().ownerName || ''))
  const skipped = miceDocs.length - doniDocs.length
  let batch = db.batch()
  let n = 0
  const commit = async () => { if (n) { await batch.commit(); batch = db.batch(); n = 0 } }
  for (const d of doniDocs) {
    batch.update(d.ref, { ownerId: DONI_NEW })
    if (++n >= 400) await commit()
  }
  await commit()
  console.log(`Doni: reassigned ${doniDocs.length} deal(s) ${DONI_OLD} -> ${DONI_NEW}` +
    (skipped ? ` (left ${skipped} non-Doni deal(s) on the shared email)` : ''))

  // ---- Apply: Widya deals (ownerId is unique to her) ----
  for (const d of putuDocs) {
    batch.update(d.ref, { ownerId: WIDYA_NEW })
    if (++n >= 400) await commit()
  }
  await commit()
  console.log(`Widya: reassigned ${putuDocs.length} deal(s) ${WIDYA_OLD} -> ${WIDYA_NEW}`)

  // ---- Apply: Widya Auth account + users doc ----
  try {
    const rec = await auth.getUserByEmail(WIDYA_OLD)
    await auth.updateUser(rec.uid, { email: WIDYA_NEW })
    await db.collection('users').doc(rec.uid).update({ email: WIDYA_NEW })
    const link = await auth.generatePasswordResetLink(WIDYA_NEW)
    console.log(`Widya: Auth + users doc email updated to ${WIDYA_NEW}`)
    console.log(`Widya reset link (share with her):\n   ${link}`)
  } catch (e) {
    if (e.code === 'auth/user-not-found') {
      console.log(`Widya: no Auth account on ${WIDYA_OLD} — nothing to update (already ${WIDYA_NEW}?).`)
    } else {
      throw e
    }
  }

  console.log('\nDone.')
  process.exit(0)
}

main().catch(err => {
  console.error('\nFix failed:', err)
  process.exit(1)
})
