// One-off: correct Purnama's login email (purnama@ -> purnamasari@).
// Mirrors the Widya fixup in fixOwners.mjs. Because the app links records by
// email (deal.ownerId, pipelineEvents.byId) rather than uid, this updates:
//   1. her Firebase Auth account email (uid is unchanged),
//   2. her users/{uid} doc `email` field,
//   3. every deals doc with ownerId == old email,
//   4. every pipelineEvents doc with byId == old email (historical attribution).
// Her password is NOT changed by an email update; a reset link is printed only
// in case she wants one.
//
// Uses the Admin SDK (scripts/serviceAccount.json or FIREBASE_SERVICE_ACCOUNT).
// Dry-run by default (reports counts, writes nothing):
//   node scripts/migratePurnamaEmail.mjs
// Apply for real:
//   node scripts/migratePurnamaEmail.mjs --commit

import { readFileSync } from 'node:fs'
import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'

const OLD_EMAIL = 'purnama@theanvayabali.com'
const NEW_EMAIL = 'purnamasari@theanvayabali.com'

const COMMIT = process.argv.includes('--commit')

function loadServiceAccount() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
  return JSON.parse(readFileSync(new URL('./serviceAccount.json', import.meta.url), 'utf8'))
}

async function reassignField(db, collection, field, oldVal, newVal, commit) {
  const snap = await db.collection(collection).where(field, '==', oldVal).get()
  console.log(`${collection}.${field} == ${oldVal}: ${snap.size} doc(s)`)
  if (!commit || snap.empty) return snap.size
  let batch = db.batch()
  let n = 0
  const flush = async () => { if (n) { await batch.commit(); batch = db.batch(); n = 0 } }
  for (const d of snap.docs) {
    batch.update(d.ref, { [field]: newVal })
    if (++n >= 400) await flush()
  }
  await flush()
  console.log(`   -> updated ${snap.size} ${collection} doc(s) to ${newVal}`)
  return snap.size
}

async function main() {
  console.log(COMMIT ? '=== APPLYING CHANGES ===\n' : '=== DRY RUN (no writes) — pass --commit to apply ===\n')
  if (!getApps().length) initializeApp({ credential: cert(loadServiceAccount()) })
  const db = getFirestore()
  const auth = getAuth()

  // ---- Auth account ----
  let uid = null
  try {
    const rec = await auth.getUserByEmail(OLD_EMAIL)
    uid = rec.uid
    console.log(`Auth: found ${OLD_EMAIL} (uid ${uid})`)
  } catch (e) {
    if (e.code === 'auth/user-not-found') {
      console.log(`Auth: no account on ${OLD_EMAIL} (already ${NEW_EMAIL}?) — skipping Auth/users update.`)
    } else throw e
  }

  // Guard: make sure NEW_EMAIL isn't already taken by someone else.
  try {
    const clash = await auth.getUserByEmail(NEW_EMAIL)
    if (clash.uid !== uid) {
      throw new Error(`ABORT: ${NEW_EMAIL} already belongs to a different account (uid ${clash.uid}).`)
    }
  } catch (e) {
    if (e.code !== 'auth/user-not-found') throw e
  }

  // ---- Firestore data ----
  await reassignField(db, 'deals', 'ownerId', OLD_EMAIL, NEW_EMAIL, COMMIT)
  await reassignField(db, 'pipelineEvents', 'byId', OLD_EMAIL, NEW_EMAIL, COMMIT)

  // ---- Apply Auth + users doc ----
  if (uid && COMMIT) {
    await auth.updateUser(uid, { email: NEW_EMAIL })
    await db.collection('users').doc(uid).update({ email: NEW_EMAIL })
    console.log(`Auth + users/${uid} email updated to ${NEW_EMAIL}`)
    try {
      const link = await auth.generatePasswordResetLink(NEW_EMAIL)
      console.log(`Optional reset link (password itself is unchanged):\n   ${link}`)
    } catch (e) {
      console.log(`(could not generate reset link: ${e.message})`)
    }
  }

  console.log(COMMIT ? '\nDone.' : '\nDry run complete — re-run with --commit to apply.')
  process.exit(0)
}

main().catch(err => {
  console.error('\nMigration failed:', err)
  process.exit(1)
})
