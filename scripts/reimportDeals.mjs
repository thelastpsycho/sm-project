// DESTRUCTIVE: delete ALL docs in the `deals` collection (and their `comments`
// subcollections), then re-import the full pipeline from src/data/dealsSeed.json.
//
// Run:  node scripts/reimportDeals.mjs
// Uses the Firebase config from .env (VITE_FIREBASE_*).

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { initializeApp } from 'firebase/app'
import { getFirestore, collection, getDocs, doc, writeBatch } from 'firebase/firestore'
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

const seed = JSON.parse(readFileSync(resolve(root, 'src/data/dealsSeed.json'), 'utf8'))

async function commitChunked(db, refs, kind) {
  let done = 0
  for (let i = 0; i < refs.length; i += 400) {
    const batch = writeBatch(db)
    for (const ref of refs.slice(i, i + 400)) batch.delete(ref)
    await batch.commit()
    done += Math.min(400, refs.length - i)
    if (refs.length) console.log(`  deleted ${done}/${refs.length} ${kind}`)
  }
}

async function main() {
  console.log(`Project: ${firebaseConfig.projectId}`)
  console.log(`Seed deals to import: ${seed.length}`)

  const app = initializeApp(firebaseConfig)
  const db = getFirestore(app)
  try {
    await signInAnonymously(getAuth(app))
    console.log('Signed in anonymously.')
  } catch (e) {
    console.log('Anonymous sign-in unavailable, continuing:', e.code || e.message)
  }

  const dealsCol = collection(db, 'deals')

  // 1) Delete existing deals + their comments subcollections.
  const existing = await getDocs(dealsCol)
  console.log(`\nExisting deals to delete: ${existing.size}`)
  const commentRefs = []
  for (const d of existing.docs) {
    const cs = await getDocs(collection(db, 'deals', d.id, 'comments'))
    cs.docs.forEach(c => commentRefs.push(c.ref))
  }
  if (commentRefs.length) {
    console.log(`Deleting ${commentRefs.length} orphaned comments…`)
    await commitChunked(db, commentRefs, 'comments')
  }
  await commitChunked(db, existing.docs.map(d => d.ref), 'deals')

  // 2) Import the full seed.
  console.log(`\nImporting ${seed.length} deals…`)
  const now = new Date()
  let written = 0
  for (let i = 0; i < seed.length; i += 400) {
    const batch = writeBatch(db)
    for (const row of seed.slice(i, i + 400)) {
      batch.set(doc(dealsCol), { ownerId: '', ...row, createdAt: now, updatedAt: now })
    }
    await batch.commit()
    written += Math.min(400, seed.length - i)
    console.log(`  imported ${written}/${seed.length}`)
  }

  // 3) Verify.
  const after = await getDocs(dealsCol)
  console.log(`\nDone. 'deals' now has ${after.size} docs.`)
  process.exit(0)
}

main().catch(err => {
  console.error('\nRe-import failed:', err.code || '', err.message)
  process.exit(1)
})
