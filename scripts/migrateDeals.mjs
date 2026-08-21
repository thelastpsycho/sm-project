// One-off migration: import the team's existing pipeline (src/data/dealsSeed.json)
// into Firestore. Idempotent — skips if the `deals` collection already has data.
//
// Run:  node scripts/migrateDeals.mjs
// Uses the Firebase config from .env (VITE_FIREBASE_*).

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { initializeApp } from 'firebase/app'
import {
  getFirestore,
  collection,
  getDocs,
  doc,
  writeBatch
} from 'firebase/firestore'
import { getAuth, signInAnonymously } from 'firebase/auth'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

// --- Load .env (VITE_FIREBASE_* keys) ---
const env = {}
for (const line of readFileSync(resolve(root, '.env'), 'utf8').split('\n')) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '')
}

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID
}

const seed = JSON.parse(readFileSync(resolve(root, 'src/data/dealsSeed.json'), 'utf8'))

async function main() {
  console.log(`Project: ${firebaseConfig.projectId}`)
  console.log(`Seed deals to import: ${seed.length}`)

  const app = initializeApp(firebaseConfig)
  const db = getFirestore(app)

  // Sign in anonymously (matches the app's auth) in case rules require it.
  try {
    await signInAnonymously(getAuth(app))
    console.log('Signed in anonymously.')
  } catch (e) {
    console.log('Anonymous sign-in unavailable, continuing unauthenticated:', e.code || e.message)
  }

  const dealsCol = collection(db, 'deals')
  const existing = await getDocs(dealsCol)
  if (!existing.empty) {
    console.log(`\nAborting: 'deals' already has ${existing.size} docs. Nothing written (idempotent guard).`)
    process.exit(0)
  }

  const now = new Date()
  let written = 0
  for (let i = 0; i < seed.length; i += 400) {
    const batch = writeBatch(db)
    for (const row of seed.slice(i, i + 400)) {
      batch.set(doc(dealsCol), { ownerId: '', ...row, createdAt: now, updatedAt: now })
    }
    await batch.commit()
    written += Math.min(400, seed.length - i)
    console.log(`  committed ${written}/${seed.length}`)
  }

  console.log(`\nDone. Imported ${written} deals into 'deals'.`)
  process.exit(0)
}

main().catch(err => {
  console.error('\nMigration failed:', err.code || '', err.message)
  process.exit(1)
})
