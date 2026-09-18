// One-off migration for the lost-reason taxonomy refresh.
//
// The old LOST_REASONS picklist ('No Feedback', 'Budget Constrain', 'Move Area',
// 'Event Cancelled', 'Lose to other hotel') was replaced with a cleaner 8-item list
// (see src/types/crm.ts). This script remaps any doc still carrying one of the old
// exact strings onto its new equivalent, across BOTH places that field is stored:
//   - `deals[].reasonWonLost`      (the deal's own record)
//   - `pipelineEvents[].reason`    (the 'Lost' stage-transition event log — read by
//                                   crmCalendar.ts to title derived "Pipeline Activity"
//                                   calendar events, so it must stay consistent too)
//
//   No Feedback         -> Went cold / unresponsive
//   Budget Constrain    -> Budget / Price
//   Move Area           -> Chose a different destination
//   Event Cancelled     -> Event cancelled
//   Lose to other hotel -> Lost to competitor hotel
//   (+ free-text "Other…" entries reps had typed, mapped individually — see MAPPING)
//
// Deliberately NOT touched: the human-readable activity/comment text in
// `deals/{id}/comments` (e.g. "Moved from Negotiation to Lost — Budget Constrain").
// That's an immutable audit-log narrative of what was recorded at the time, not a
// structured field any current feature reads/buckets by — rewriting history there
// would be editing the record of what actually happened, not correcting stale data.
//
// Uses the Admin SDK (service account) so it bypasses security rules. Idempotent:
// only touches docs whose field is an exact old-list match. Preserves `updatedAt` on
// deals so idle/aging clocks aren't reset by this backend label correction.
//
// Run:  node scripts/migrateLostReasons.mjs          (applies changes)
//       node scripts/migrateLostReasons.mjs --dry     (preview only, no writes)

import { readFileSync } from 'node:fs'
import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

const DRY = process.argv.includes('--dry')

const MAPPING = {
  // Old 5-item preset list.
  'No Feedback': 'Went cold / unresponsive',
  'Budget Constrain': 'Budget / Price',
  'Move Area': 'Chose a different destination',
  'Event Cancelled': 'Event cancelled',
  'Lose to other hotel': 'Lost to competitor hotel',

  // Free-text entries reps typed via "Other…" — mapped by inspecting each string.
  // "Availability" alone: 7/8 matching deals are MICE (meeting-room/venue-driven),
  // so it maps to Venue availability rather than Room.
  Availability: 'Venue availability',
  'room not available': 'Room availability',
  'No Room Available on 09 Oct': 'Room availability',
  'No Room available on 09 Oct': 'Room availability',
  'Room and Meeting room not available yet': 'Venue availability',
  'Lost bidding': 'Lost to competitor hotel',
  'No Update from End User': 'Went cold / unresponsive',
  'not confirm': 'Went cold / unresponsive',
  'Prepare for moving from nusa dua but cancel moving': 'Event cancelled',
  // Visa/flight logistics — mapped to Event cancelled per instruction.
  'Visa Issue': 'Event cancelled',
  'Flight Problem': 'Event cancelled',
  'Move to November due to Visa': 'Event cancelled',

  // Comma-separated multi-reason free text — first-mentioned reason wins (the rep's
  // primary cause), consistent with the single-primary-reason model.
  'Availability, Lose to other hotel': 'Venue availability',
  'Budget Constrain, Availability': 'Budget / Price',
  'Lose to other hotel, Budget Constrain': 'Lost to competitor hotel',
  'Availability, Event Cancelled': 'Venue availability',
  'Move Area, Lose to other hotel, Budget Constrain': 'Chose a different destination',
  'Event Cancelled, Lose to other hotel': 'Event cancelled',
  'Move Area, Lose to other hotel': 'Chose a different destination',
  'Budget Constrain, Lose to other hotel': 'Budget / Price'
}

const NEW_REASONS = new Set([
  'Budget / Price',
  'Room availability',
  'Venue availability',
  'Lost to competitor hotel',
  'Chose a different destination',
  'Event cancelled',
  'Postponed / no decision',
  'Went cold / unresponsive'
])

function loadServiceAccount() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
  return JSON.parse(readFileSync(new URL('./serviceAccount.json', import.meta.url), 'utf8'))
}

/**
 * Migrate one field on one collection. `preserveUpdatedAt` re-stamps `updatedAt` to
 * its existing value (deals only — pipelineEvents have no such field/clock).
 */
async function migrateCollection(db, collectionName, fieldName, { preserveUpdatedAt = false } = {}) {
  const snap = await db.collection(collectionName).get()
  const withField = snap.docs.filter(d => (d.data()[fieldName] || '').trim() !== '')
  const pending = withField.filter(d => MAPPING[d.data()[fieldName]] !== undefined)
  const alreadyNew = withField.filter(d => NEW_REASONS.has(d.data()[fieldName]))
  const custom = withField.filter(
    d => MAPPING[d.data()[fieldName]] === undefined && !NEW_REASONS.has(d.data()[fieldName])
  )

  console.log(`\n--- ${collectionName}.${fieldName} ---`)
  console.log(`Total ${collectionName}: ${snap.size}`)
  console.log(`Docs with ${fieldName} set: ${withField.length}`)
  console.log(`  - matching an OLD preset (will be migrated): ${pending.length}`)
  console.log(`  - already on a NEW preset (no change needed): ${alreadyNew.length}`)
  console.log(`  - custom/free-text (left untouched): ${custom.length}`)

  const tally = {}
  for (const d of pending) {
    const from = d.data()[fieldName]
    const key = `"${from}" -> "${MAPPING[from]}"`
    tally[key] = (tally[key] || 0) + 1
  }
  if (pending.length) {
    console.log('Migration breakdown:')
    for (const [k, n] of Object.entries(tally).sort((a, b) => b[1] - a[1])) {
      console.log(`  ${n.toString().padStart(4)}  ${k}`)
    }
  }

  if (custom.length) {
    console.log('Custom/free-text values found (NOT touched):')
    const customTally = {}
    for (const d of custom) {
      const val = d.data()[fieldName]
      customTally[val] = (customTally[val] || 0) + 1
    }
    for (const [k, n] of Object.entries(customTally).sort((a, b) => b[1] - a[1])) {
      console.log(`  ${n.toString().padStart(4)}  "${k}"`)
    }
  }

  if (DRY || pending.length === 0) return pending.length

  let written = 0
  for (let i = 0; i < pending.length; i += 400) {
    const batch = db.batch()
    for (const d of pending.slice(i, i + 400)) {
      const data = d.data()
      const update = { [fieldName]: MAPPING[data[fieldName]] }
      if (preserveUpdatedAt) update.updatedAt = data.updatedAt ?? new Date()
      batch.update(d.ref, update)
    }
    await batch.commit()
    written += Math.min(400, pending.length - i)
    console.log(`  updated ${written}/${pending.length}`)
  }
  return pending.length
}

async function main() {
  const svc = loadServiceAccount()
  if (!getApps().length) initializeApp({ credential: cert(svc) })
  const db = getFirestore()

  console.log(`Project: ${svc.project_id}`)
  console.log(DRY ? 'Mode: DRY RUN (no writes)' : 'Mode: APPLY')

  const dealsMigrated = await migrateCollection(db, 'deals', 'reasonWonLost', { preserveUpdatedAt: true })
  const eventsMigrated = await migrateCollection(db, 'pipelineEvents', 'reason')

  if (DRY) {
    console.log('\nDry run complete — no documents written.')
  } else {
    console.log(`\nDone. Migrated ${dealsMigrated} deal(s) and ${eventsMigrated} pipeline event(s).`)
  }
  process.exit(0)
}

main().catch(err => {
  console.error('\nMigration failed:', err.code || '', err.message)
  process.exit(1)
})
