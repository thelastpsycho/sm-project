// One-time: create Firebase Auth accounts + `users` docs from src/user.json.
//
// Requires a service account (Admin SDK). Provide it either as:
//   - env FIREBASE_SERVICE_ACCOUNT = the JSON string, or
//   - a file scripts/serviceAccount.json (gitignored).
//
// Run:  node scripts/migrateUsersToAuth.mjs
//
// For each user it: ensures an Auth account exists, sets the `admin` custom claim for
// admins, seeds users/{uid} with status:'active', and prints a password-reset link the
// person can use to set their own password. Safe to re-run (idempotent by email).

import { readFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'

const ADMIN_EMAILS = ['andikrisnatha@theanvayabali.com']

function loadServiceAccount() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
  }
  return JSON.parse(readFileSync(new URL('./serviceAccount.json', import.meta.url), 'utf8'))
}

async function main() {
  if (!getApps().length) initializeApp({ credential: cert(loadServiceAccount()) })
  const auth = getAuth()
  const db = getFirestore()

  const users = JSON.parse(readFileSync(new URL('../src/user.json', import.meta.url), 'utf8'))
  const seenEmails = new Set()

  for (const u of users) {
    if (!u.email) {
      console.warn(`SKIP (no email): ${u.name}`)
      continue
    }
    if (seenEmails.has(u.email)) {
      console.warn(`WARN duplicate email ${u.email} (${u.name}) — the users/{uid} doc will be overwritten.`)
    }
    seenEmails.add(u.email)

    const role = ADMIN_EMAILS.includes(u.email) ? 'admin' : 'sales'

    let record
    try {
      record = await auth.getUserByEmail(u.email)
    } catch {
      record = await auth.createUser({
        email: u.email,
        password: randomUUID(), // temporary; user resets via the link below
        displayName: u.name,
        emailVerified: false
      })
    }

    if (role === 'admin') {
      await auth.setCustomUserClaims(record.uid, { admin: true })
    }

    await db.collection('users').doc(record.uid).set(
      {
        email: u.email,
        name: u.name || '',
        position: u.position || '',
        phone: u.phone || '',
        role,
        status: 'active'
      },
      { merge: true }
    )

    let link = '(reset link unavailable)'
    try {
      link = await auth.generatePasswordResetLink(u.email)
    } catch (e) {
      link = `(could not generate link: ${e.message})`
    }
    console.log(`OK  ${u.name} <${u.email}>  role=${role}\n    reset: ${link}`)
  }

  console.log('\nDone. Share each reset link with the corresponding user (or have them use “Forgot password?”).')
  process.exit(0)
}

main().catch(err => {
  console.error('\nMigration failed:', err)
  process.exit(1)
})
