// One-off: set stage = 'Confirmed' on every deal whose status is 'Win'.
//
// Run:  node scripts/setWinStageConfirmed.mjs
// Uses the Firebase config from .env (VITE_FIREBASE_*).

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { initializeApp } from 'firebase/app'
import { getFirestore, collection, getDocs, writeBatch } from 'firebase/firestore'
import { getAuth, signInAnonymously } from 'firebase/auth'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

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

async function main() {
  console.log(`Project: ${firebaseConfig.projectId}`)

  const app = initializeApp(firebaseConfig)
  const db = getFirestore(app)
  try {
    await signInAnonymously(getAuth(app))
    console.log('Signed in anonymously.')
  } catch (e) {
    console.log('Anonymous sign-in unavailable, continuing:', e.code || e.message)
  }

  const snap = await getDocs(collection(db, 'deals'))
  const winDocs = snap.docs.filter(d => d.data().status === 'Win')
  const toUpdate = winDocs.filter(d => d.data().stage !== 'Confirmed')

  console.log(`\nTotal deals: ${snap.size}`)
  console.log(`Win deals: ${winDocs.length}`)
  console.log(`Win deals needing stage='Confirmed': ${toUpdate.length}`)

  const now = new Date()
  let written = 0
  for (let i = 0; i < toUpdate.length; i += 400) {
    const batch = writeBatch(db)
    for (const d of toUpdate.slice(i, i + 400)) {
      batch.update(d.ref, { stage: 'Confirmed', updatedAt: now })
    }
    await batch.commit()
    written += Math.min(400, toUpdate.length - i)
    console.log(`  updated ${written}/${toUpdate.length}`)
  }

  console.log(`\nDone. Set ${toUpdate.length} Win deal(s) to stage 'Confirmed'.`)
  process.exit(0)
}

main().catch(err => {
  console.error('\nUpdate failed:', err.code || '', err.message)
  process.exit(1)
})
