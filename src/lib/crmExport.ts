// Client-side export of the pipeline (filtered deal list) to Excel or PDF.
// ExcelJS and jsPDF are dynamically imported below — they're heavy (~400kB gzipped
// combined) and only needed when a user actually clicks export, not on every pipeline
// page load.
import type { Deal } from '@/types/crm'
import { formatDate, formatMoney } from '@/lib/crmUtils'

interface ExportColumn {
  header: string
  value: (deal: Deal) => string | number
}

const EXPORT_COLUMNS: ExportColumn[] = [
  { header: 'ID', value: d => d.id },
  { header: 'Lead Date', value: d => formatDate(d.leadDate) },
  { header: 'Company', value: d => d.company },
  { header: 'Segment', value: d => d.segment },
  { header: 'Lead Source', value: d => d.leadSource },
  { header: 'Stage', value: d => d.stage ?? 'New' },
  { header: 'Sales Owner', value: d => d.ownerName || 'Unassigned' },
  { header: 'Group Name', value: d => d.groupName ?? '' },
  { header: 'Arrival', value: d => formatDate(d.arrivalDate) },
  { header: 'Departure', value: d => formatDate(d.checkoutDate) },
  { header: 'No. of Rooms', value: d => d.rooms ?? '' },
  { header: 'Nights', value: d => d.nights ?? '' },
  { header: 'Est. Room Revenue', value: d => d.estimatedRoomRevenue ?? '' },
  { header: 'Ancillary Potential', value: d => d.fbAncillary ?? '' },
  { header: 'Total Rev', value: d => d.totalRevenue ?? '' }
]

// PDF has no room for raw numbers next to 15 columns — format revenue as currency there.
const PDF_REVENUE_HEADERS = new Set(['Est. Room Revenue', 'Ancillary Potential', 'Total Rev'])

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export async function exportDealsToExcel(deals: Deal[], filename: string): Promise<void> {
  const { default: ExcelJS } = await import('exceljs')
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('Pipeline')
  sheet.columns = EXPORT_COLUMNS.map(c => ({ header: c.header, key: c.header, width: 16 }))
  for (const deal of deals) {
    sheet.addRow(EXPORT_COLUMNS.map(c => c.value(deal)))
  }
  sheet.getRow(1).font = { bold: true }
  const buffer = await workbook.xlsx.writeBuffer()
  triggerDownload(
    new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    filename
  )
}

export async function exportDealsToPdf(deals: Deal[], filename: string): Promise<void> {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')])
  const doc = new jsPDF({ orientation: 'landscape' })
  autoTable(doc, {
    head: [EXPORT_COLUMNS.map(c => c.header)],
    body: deals.map(deal =>
      EXPORT_COLUMNS.map(c => {
        const raw = c.value(deal)
        if (PDF_REVENUE_HEADERS.has(c.header) && typeof raw === 'number') return formatMoney(raw)
        return raw
      })
    ),
    styles: { fontSize: 7 },
    headStyles: { fillColor: [30, 30, 30] }
  })
  doc.save(filename)
}
