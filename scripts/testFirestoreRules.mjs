// One-off verification script for the firestore.rules changes in this PR, run
// against the local emulator (never production). Exercises exactly the access
// patterns the app relies on (guest survey read/create, authenticated CRM/RFP
// access) plus the specific gaps that were closed (anonymous-auth CRM access,
// the open rfps wildcard fallthrough, public events/responses/adminSettings
// writes). Not a permanent test suite — delete once reviewed, or promote into
// vitest if we want this to run in CI long-term.
import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails
} from '@firebase/rules-unit-testing'
import { readFileSync } from 'node:fs'
import {
  doc,
  getDoc,
  setDoc,
  addDoc,
  collection,
  updateDoc
} from 'firebase/firestore'

const results = []
function record(name, pass, detail) {
  results.push({ name, pass, detail })
  console.log(`${pass ? '✅' : '❌'} ${name}${detail ? ' — ' + detail : ''}`)
}

const testEnv = await initializeTestEnvironment({
  projectId: 'sm-rules-test',
  firestore: {
    rules: readFileSync('firestore.rules', 'utf8'),
    host: '127.0.0.1',
    port: 8089
  }
})

// Seed data as admin (bypasses rules) so reads/writes below test rules, not missing docs.
await testEnv.withSecurityRulesDisabled(async (ctx) => {
  const db = ctx.firestore()
  await setDoc(doc(db, 'deals', 'deal1'), { company: 'Acme', ownerId: 'owner@anvayabali.com' })
  await setDoc(doc(db, 'events', 'event1'), { eventName: 'Launch', companyName: 'Acme' })
  await setDoc(doc(db, 'responses', 'resp1'), { name: 'Guest', eventId: 'event1' })
  await setDoc(doc(db, 'adminSettings', 'config'), { reviewThreshold: 4 })
  await setDoc(doc(db, 'rfps', 'rfp1'), { client_email: 'client@example.com' })
  await setDoc(doc(db, 'functions', 'fn1'), { title: 'Ballroom hold' })
})

const anon = testEnv.unauthenticatedContext().firestore()
// A real signed-in anonymous Firebase Auth session (sign_in_provider: 'anonymous') —
// this is what ensureAuth()'s signInAnonymously() fallback produces in the app.
const anonAuth = testEnv
  .authenticatedContext('anon-uid', { firebase: { sign_in_provider: 'anonymous' } })
  .firestore()
const staff = testEnv
  .authenticatedContext('staff-uid', { email: 'owner@anvayabali.com', firebase: { sign_in_provider: 'password' } })
  .firestore()

// ---- Guest survey flow must keep working (public, no session) ----
record(
  'guest can read events (survey page renders)',
  await assertSucceeds(getDoc(doc(anon, 'events', 'event1'))).then(() => true).catch(() => false)
)
record(
  'guest can create a response (survey submit)',
  await assertSucceeds(addDoc(collection(anon, 'responses'), { name: 'Guest2', eventId: 'event1' }))
    .then(() => true)
    .catch(() => false)
)
record(
  'guest can read adminSettings (reviewThreshold/webhookUrl for survey redirect)',
  await assertSucceeds(getDoc(doc(anon, 'adminSettings', 'config'))).then(() => true).catch(() => false)
)

// ---- Previously-open gaps must now be closed ----
record(
  'guest CANNOT write events (was the XSS-enabling gap)',
  await assertFails(updateDoc(doc(anon, 'events', 'event1'), { eventName: '<script>bad</script>' }))
    .then(() => true)
    .catch(() => false)
)
record(
  'guest CANNOT read responses (survey answers were previously public)',
  await assertFails(getDoc(doc(anon, 'responses', 'resp1'))).then(() => true).catch(() => false)
)
record(
  'guest CANNOT write adminSettings',
  await assertFails(updateDoc(doc(anon, 'adminSettings', 'config'), { reviewThreshold: 1 }))
    .then(() => true)
    .catch(() => false)
)
record(
  'guest CANNOT read rfps (was the open wildcard-fallthrough gap)',
  await assertFails(getDoc(doc(anon, 'rfps', 'rfp1'))).then(() => true).catch(() => false)
)
record(
  'anonymous-auth session CANNOT read deals (was the self-grant CRM gap)',
  await assertFails(getDoc(doc(anonAuth, 'deals', 'deal1'))).then(() => true).catch(() => false)
)
record(
  'anonymous-auth session CANNOT read functions/venue bookings',
  await assertFails(getDoc(doc(anonAuth, 'functions', 'fn1'))).then(() => true).catch(() => false)
)

// ---- Real staff sessions must still work ----
record(
  'signed-in staff can read deals',
  await assertSucceeds(getDoc(doc(staff, 'deals', 'deal1'))).then(() => true).catch(() => false)
)
record(
  'signed-in staff can read + write rfps',
  await assertSucceeds(getDoc(doc(staff, 'rfps', 'rfp1'))).then(() => true).catch(() => false)
)
record(
  'signed-in staff can read responses (Survey Admin dashboard)',
  await assertSucceeds(getDoc(doc(staff, 'responses', 'resp1'))).then(() => true).catch(() => false)
)
record(
  'signed-in staff can write events (create/delete from Survey Admin)',
  await assertSucceeds(updateDoc(doc(staff, 'events', 'event1'), { eventName: 'Launch v2' }))
    .then(() => true)
    .catch(() => false)
)
record(
  'signed-in staff can write functions (Function Chart)',
  await assertSucceeds(updateDoc(doc(staff, 'functions', 'fn1'), { title: 'Ballroom hold v2' }))
    .then(() => true)
    .catch(() => false)
)

await testEnv.cleanup()

const failed = results.filter(r => !r.pass)
console.log(`\n${results.length - failed.length}/${results.length} checks passed`)
if (failed.length) {
  console.error('FAILED:', failed.map(f => f.name).join(', '))
  process.exit(1)
}
