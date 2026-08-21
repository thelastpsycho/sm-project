// Regenerate src/data/dealsSeed.json from the exported Sales Pipelines CSV.
// Usage: node scripts/buildSeedFromCsv.mjs "<path-to-csv>"
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')
const csvPath = process.argv[2] || resolve(process.env.HOME, 'Downloads/Sales Pipelines - Pipelines.csv')

const users = JSON.parse(readFileSync(resolve(root, 'src/user.json'), 'utf8'))
const name2email = Object.fromEntries(users.map(u => [u.name, u.email]))

// sheet owner (lowercased) -> app full name
const sheetMap = {
  andi: 'Andi Krisnatha', doni: 'Doni Dwi Artha', kerni: 'Putu Kerni',
  linda: 'Linda Permata', purnama: 'Purnama', eva: 'Kadek Eva',
  widya: 'Putu widyawati', lia: 'Aprilia Krisdayani', putri: 'Putrie Amelia',
  echa: 'Eka Putri', ravi: 'Ravi Ardiansyah'
}

// --- Minimal RFC-4180 CSV parser (handles quotes, commas, newlines in cells) ---
function parseCsv(text) {
  const rows = []
  let row = [], cell = '', i = 0, inQ = false
  while (i < text.length) {
    const c = text[i]
    if (inQ) {
      if (c === '"') {
        if (text[i + 1] === '"') { cell += '"'; i += 2; continue }
        inQ = false; i++; continue
      }
      cell += c; i++; continue
    }
    if (c === '"') { inQ = true; i++; continue }
    if (c === ',') { row.push(cell); cell = ''; i++; continue }
    if (c === '\r') { i++; continue }
    if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; i++; continue }
    cell += c; i++
  }
  if (cell.length || row.length) { row.push(cell); rows.push(row) }
  return rows
}

const MONTHS = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 }
function parseDate(s) {
  s = (s || '').trim()
  if (!s) return null
  let m = s.match(/^(\d{1,2})-([A-Za-z]{3,})-(\d{4})$/)
  if (m) {
    const mo = MONTHS[m[2].slice(0, 3).toLowerCase()]
    if (mo == null) return { bad: s }
    return `${m[3]}-${String(mo + 1).padStart(2, '0')}-${m[1].padStart(2, '0')}`
  }
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (m) return s
  return { bad: s }
}

function parseNum(s) {
  s = (s || '').trim().replace(/,/g, '')
  if (s === '' || s === '-') return null
  const m = s.match(/-?\d+(\.\d+)?/)
  if (!m) return null
  const n = Number(m[0])
  return Number.isFinite(n) ? n : null
}

const VALID_STATUS = new Set(['Active', 'Idle', 'Win', 'Lost'])

const raw = readFileSync(csvPath, 'utf8')
const table = parseCsv(raw)
const header = table[0].map(h => h.trim())
const idx = name => header.indexOf(name)

const COL = {
  company: idx('Company'), segment: idx('Segment'), leadSource: idx('Lead Source'),
  status: idx('Status'), owner: idx('Sales Owner'), groupName: idx('Group Name'),
  leadDate: idx('Lead Date'), arrivalDate: idx('Arrival Date'), checkoutDate: idx('Check-out Date'),
  rooms: idx('No of Rooms'), nights: idx('Nights'), roomNights: idx('Room Nights'),
  proposedADR: idx('Proposed ADR'), estimatedRoomRevenue: idx('Estimated Room Revenue'),
  fbAncillary: idx('F&B / Ancillary Potential'), totalRevenue: idx('Total Revenue Potential'),
  reasonWonLost: idx('Reason Won/Lost'), nextAction: idx('Next Action'),
  actionDueDate: idx('Action Due Date'), notes: idx('Notes')
}

const deals = []
const badDates = []
const unlinkedOwners = {}
const statusFixes = {}
const ownerCounts = {}

for (let r = 1; r < table.length; r++) {
  const cells = table[r]
  const get = c => (cells[c] ?? '').trim()
  const company = get(COL.company)
  if (!company) continue // skip empty spreadsheet rows

  // owner mapping
  const ownerRaw = get(COL.owner)
  const key = ownerRaw.toLowerCase()
  let ownerName = '', ownerId = ''
  if (key === '') {
    ownerName = '' // Unassigned
  } else if (sheetMap[key]) {
    ownerName = sheetMap[key]
    ownerId = name2email[ownerName] || ''
  } else {
    ownerName = ownerRaw // keep as-is (e.g. Riska), unlinked
    unlinkedOwners[ownerRaw] = (unlinkedOwners[ownerRaw] || 0) + 1
  }
  ownerCounts[ownerName || '(Unassigned)'] = (ownerCounts[ownerName || '(Unassigned)'] || 0) + 1

  // status
  let status = get(COL.status)
  if (!VALID_STATUS.has(status)) { statusFixes[status || '(blank)'] = (statusFixes[status || '(blank)'] || 0) + 1; status = 'Active' }

  const deal = { company, segment: get(COL.segment) || 'MICE', leadSource: get(COL.leadSource) || '', status, ownerId, ownerName, currency: 'IDR' }

  const strFields = { groupName: COL.groupName, reasonWonLost: COL.reasonWonLost, nextAction: COL.nextAction, notes: COL.notes }
  for (const [k, c] of Object.entries(strFields)) { const v = get(c); if (v) deal[k] = v }

  const dateFields = { leadDate: COL.leadDate, arrivalDate: COL.arrivalDate, checkoutDate: COL.checkoutDate, actionDueDate: COL.actionDueDate }
  for (const [k, c] of Object.entries(dateFields)) {
    const d = parseDate(get(c))
    if (d && typeof d === 'string') deal[k] = d
    else if (d && d.bad) badDates.push(`${company} · ${k} · "${d.bad}"`)
  }

  const numFields = { rooms: COL.rooms, nights: COL.nights, roomNights: COL.roomNights, proposedADR: COL.proposedADR, estimatedRoomRevenue: COL.estimatedRoomRevenue, fbAncillary: COL.fbAncillary, totalRevenue: COL.totalRevenue }
  for (const [k, c] of Object.entries(numFields)) { const n = parseNum(get(c)); if (n != null) deal[k] = n }

  if (deal.leadSource === '') delete deal.leadSource
  deals.push(deal)
}

writeFileSync(resolve(root, 'src/data/dealsSeed.json'), JSON.stringify(deals, null, 2) + '\n')

console.log(`Wrote ${deals.length} deals to src/data/dealsSeed.json\n`)
console.log('Owner distribution:')
for (const [o, n] of Object.entries(ownerCounts).sort((a, b) => b[1] - a[1])) console.log(`  ${String(n).padStart(4)}  ${o}`)
console.log('\nUnlinked owners (kept by name, no login):', Object.keys(unlinkedOwners).length ? unlinkedOwners : 'none')
console.log('Status coerced to Active:', Object.keys(statusFixes).length ? statusFixes : 'none')
console.log(`Unparseable dates: ${badDates.length}`)
badDates.slice(0, 15).forEach(b => console.log('  ' + b))
