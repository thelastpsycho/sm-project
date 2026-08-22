// One-off migration for the status/stage merge.
//
// The pipeline used to track two axes: `status` (Active/Idle/Win/Lost) and `stage`
// (New…Confirmed). We collapsed them into a single axis — `stage`, now with a
// terminal `Lost` and `Confirmed` = won. This script folds each deal's old status
// into stage and drops the legacy `status` / `statusEnteredAt` fields.
//
// Mapping:
//   Win           → stage 'Confirmed'
//   Lost          → stage 'Lost' (reasonWonLost preserved)
//   Active / Idle → keep the existing stage, EXCEPT a contradictory terminal stage
//                   (Confirmed/Lost while not won/lost) is demoted to 'Contract'.
//
// Uses the Admin SDK (service account) so it bypasses security rules. Idempotent:
// only touches docs that still carry a `status` field. Preserves `updatedAt` so the
// idle/aging clocks are not reset.
//
// Run:  node scripts/mergeStatusIntoStage.mjs          (applies changes)
//       node scripts/mergeStatusIntoStage.mjs --dry     (preview only, no writes)

import { readFileSync } from 'node:fs'
import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'

const DRY = process.argv.includes('--dry')

function loadServiceAccount() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
  return JSON.parse(readFileSync(new URL('./serviceAccount.json', import.meta.url), 'utf8'))
}

const TERMINAL = new Set(['Confirmed', 'Lost'])

// Decide the new stage for a deal from its legacy status + current stage.
function resolveStage(status, stage) {
  if (status === 'Win') return 'Confirmed'
  if (status === 'Lost') return 'Lost'
  // Active / Idle (or anything else) → keep stage, but never leave it terminal.
  if (!stage) return 'New'
  if (TERMINAL.has(stage)) return 'Contract' // contradiction: open deal parked on a won/lost stage
  return stage
}

async function main() {
  const svc = loadServiceAccount()
  if (!getApps().length) initializeApp({ credential: cert(svc) })
  const db = getFirestore()

  console.log(`Project: ${svc.project_id}`)
  console.log(DRY ? 'Mode: DRY RUN (no writes)\n' : 'Mode: APPLY\n')

  const snap = await db.collection('deals').get()
  const pending = snap.docs.filter(d => d.data().status !== undefined)

  console.log(`Total deals: ${snap.size}`)
  console.log(`Deals still carrying legacy 'status': ${pending.length}`)

  // Tally the mapping so the run is auditable.
  const tally = {}
  const contradictions = []
  for (const d of pending) {
    const { status, stage, company } = d.data()
    const next = resolveStage(status, stage)
    const key = `${status || '∅'} + stage:${stage || '∅'} → ${next}`
    tally[key] = (tally[key] || 0) + 1
    if (status !== 'Win' && status !== 'Lost' && stage && TERMINAL.has(stage)) {
      contradictions.push(`   - ${company || d.id}: status=${status}, stage=${stage} → Contract`)
    }
  }

  console.log('\nMapping breakdown:')
  for (const [k, n] of Object.entries(tally).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${n.toString().padStart(4)}  ${k}`)
  }
  if (contradictions.length) {
    console.log(`\n⚠ ${contradictions.length} open deal(s) on a terminal stage — demoted to 'Contract':`)
    console.log(contradictions.join('\n'))
  }

  if (DRY) {
    console.log('\nDry run complete — no documents written.')
    process.exit(0)
  }

  let written = 0
  for (let i = 0; i < pending.length; i += 400) {
    const batch = db.batch()
    for (const d of pending.slice(i, i + 400)) {
      const data = d.data()
      batch.update(d.ref, {
        stage: resolveStage(data.status, data.stage),
        status: FieldValue.delete(),
        statusEnteredAt: FieldValue.delete(),
        updatedAt: data.updatedAt ?? new Date()
      })
    }
    await batch.commit()
    written += Math.min(400, pending.length - i)
    console.log(`  updated ${written}/${pending.length}`)
  }

  console.log(`\nDone. Migrated ${pending.length} deal(s) to the single stage axis.`)
  process.exit(0)
}

main().catch(err => {
  console.error('\nMigration failed:', err.code || '', err.message)
  process.exit(1)
})
