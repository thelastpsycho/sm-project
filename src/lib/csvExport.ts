// Client-side CSV export — ported from the Revenue Console frontend. UTF-8 BOM so
// Excel reads non-ASCII correctly; values starting with =, +, -, @ are quoted with a
// leading apostrophe to defuse CSV formula injection when opened in a spreadsheet app.

export function csvText(rows: unknown[][]): string {
  return (
    '﻿' +
    rows
      .map(row =>
        row
          .map(value => {
            let s = value == null ? '' : String(value)
            if (typeof value === 'string' && /^[\s]*[=+\-@]/.test(s)) s = "'" + s
            return '"' + s.replace(/"/g, '""') + '"'
          })
          .join(',')
      )
      .join('\r\n')
  )
}

export function downloadCsv(rows: unknown[][], filename: string): void {
  const url = URL.createObjectURL(new Blob([csvText(rows)], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
