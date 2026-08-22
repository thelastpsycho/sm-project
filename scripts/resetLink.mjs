// Print a Firebase password-reset link for a given email (no email delivery needed).
// Usage:  node scripts/resetLink.mjs someone@theanvayabali.com
// Service account via env FIREBASE_SERVICE_ACCOUNT or scripts/serviceAccount.json.

import { readFileSync } from 'node:fs'
import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'

function loadServiceAccount() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
  return JSON.parse(readFileSync(new URL('./serviceAccount.json', import.meta.url), 'utf8'))
}

const email = process.argv[2]
if (!email) {
  console.error('Usage: node scripts/resetLink.mjs <email>')
  process.exit(1)
}

if (!getApps().length) initializeApp({ credential: cert(loadServiceAccount()) })

const link = await getAuth().generatePasswordResetLink(email)
console.log(`\nReset link for ${email}:\n${link}\n`)
process.exit(0)
