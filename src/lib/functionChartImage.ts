// Renders a compact "N-day × all venues" Function Chart into a JPEG image, sized
// and laid out for sharing to a WhatsApp group (the full month grid is far too
// wide to screenshot legibly). Framework-free and deterministic: it draws with
// the Canvas 2D API rather than screenshotting the live DOM, so the output never
// depends on theme, scroll position, fonts, or Tailwind color parsing.

import { VENUE_STRUCTURE, canonicalVenue, comboName } from '@/lib/functionChartVenues'
import { baliToday } from '@/lib/time'
import { FUNCTION_STATUSES, STATUS_META } from '@/types/functionChart'
import type { FunctionBooking, FunctionStatus } from '@/types/functionChart'

// ---- Date helpers (UTC, matching FunctionChart.vue) ----------------------

export function shiftISO(iso: string, days: number): string {
  return new Date(Date.parse(iso + 'T00:00:00Z') + days * 86400000).toISOString().slice(0, 10)
}
export function diffDays(a: string, b: string): number {
  return Math.round((Date.parse(a + 'T00:00:00Z') - Date.parse(b + 'T00:00:00Z')) / 86400000)
}
const DOW = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']

/** e.g. "22–28 Aug 2026" (collapses month/year when shared across the range). */
export function dateRangeLabel(startDate: string, days: number): string {
  const endDate = shiftISO(startDate, days - 1)
  const a = new Date(startDate + 'T00:00:00Z')
  const b = new Date(endDate + 'T00:00:00Z')
  const mon = (d: Date) => d.toLocaleDateString('en-GB', { month: 'short', timeZone: 'UTC' })
  const dd = (d: Date) => d.getUTCDate()
  const yr = (d: Date) => d.getUTCFullYear()
  if (yr(a) !== yr(b)) return `${dd(a)} ${mon(a)} ${yr(a)} – ${dd(b)} ${mon(b)} ${yr(b)}`
  if (mon(a) !== mon(b)) return `${dd(a)} ${mon(a)} – ${dd(b)} ${mon(b)} ${yr(b)}`
  return `${dd(a)}–${dd(b)} ${mon(b)} ${yr(b)}`
}

// ---- Colors --------------------------------------------------------------

// Status fill derived from STATUS_META so blocks stay in sync with the app.
// On a white canvas a low-alpha tint reads like the app's pastel blocks; text
// stays a dark neutral for maximum legibility at WhatsApp thumbnail size.
function hexToRgba(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`
}
const INK = '#1f2937' // gray-800 — primary block/label text
const MUTED = '#6b7280' // gray-500 — company / pax / headers
const LINE = '#e5e7eb' // gray-200 — grid lines
const CAT_BG = '#f3f4f6' // gray-100 — category band
const WEEKEND_BG = '#f9fafb' // gray-50 — weekend column shading

// ---- Layout constants (logical px; multiplied by SCALE for crispness) ----

const SCALE = 2
const NAME_W = 150
const DAY_W = 132
const TITLE_H = 66
const DAY_HEADER_H = 46
const ROW_H = 42
const CAT_H = 26
const LEGEND_H = 46
const PAD = 24 // outer canvas padding

interface LayoutRow {
  type: 'cat' | 'venue'
  label: string
  y: number
  h: number
}

// ---- Rendering -----------------------------------------------------------

export interface RenderOpts {
  functions: FunctionBooking[]
  startDate: string // YYYY-MM-DD
  days?: number // default 7
  title?: string
  subtitle?: string
}

// Canvas draws with whatever font is available at draw time, so we must wait for
// the Nunito Sans webfont to load before rendering — otherwise the first share
// falls back to a system font.
async function ensureNunitoLoaded(): Promise<void> {
  if (typeof document === 'undefined' || !document.fonts) return
  try {
    await Promise.all([
      document.fonts.load('600 12px "Nunito Sans"'),
      document.fonts.load('700 12px "Nunito Sans"'),
      document.fonts.load('800 20px "Nunito Sans"'),
    ])
  } catch {
    /* fall back to the system font stack in the ctx.font strings */
  }
}

export async function renderChartToBlob(opts: RenderOpts): Promise<Blob> {
  await ensureNunitoLoaded()
  const days = opts.days ?? 7
  const title = opts.title ?? 'Function Chart'
  const subtitle = opts.subtitle ?? 'The Anvaya Bali · Sales & Events'
  const startDate = opts.startDate
  const endDate = shiftISO(startDate, days - 1)
  const todayISO = baliToday()

  // Day columns for the window.
  const cols = Array.from({ length: days }, (_, i) => {
    const date = shiftISO(startDate, i)
    const dow = new Date(date + 'T00:00:00Z').getUTCDay()
    return { date, num: parseInt(date.slice(8, 10), 10), dow: DOW[dow]!, isWeekend: dow === 0 || dow === 6, isToday: date === todayISO }
  })

  // Row layout + canonical-venue → row-index map (mirrors the page's rowByVenue).
  const rowsTop = PAD + TITLE_H + DAY_HEADER_H
  const layout: LayoutRow[] = []
  const rowByVenue = new Map<string, number>()
  let y = rowsTop
  VENUE_STRUCTURE.forEach((r) => {
    const h = r.type === 'cat' ? CAT_H : ROW_H
    const idx = layout.length
    layout.push({ type: r.type, label: r.label, y, h })
    if (r.type === 'venue') rowByVenue.set(r.label, idx)
    y += h
  })
  const gridBottom = y

  // Booking blocks: one rect per function, spanning its clamped day range across
  // the contiguous rooms it occupies (same math as bookingBlocks in the page).
  interface Block {
    x: number
    y: number
    w: number
    h: number
    status: FunctionStatus
    eventName: string
    company: string
    pax: number
  }
  const blocks: Block[] = []
  for (const f of opts.functions) {
    if (f.endDate < startDate || f.startDate > endDate) continue
    const rowIdxs = f.venues.map((v) => rowByVenue.get(canonicalVenue(v) ?? v)).filter((n): n is number => n != null)
    if (!rowIdxs.length) continue
    const rowStart = Math.min(...rowIdxs)
    const rowEnd = Math.max(...rowIdxs)
    const colStart = Math.max(0, diffDays(f.startDate, startDate))
    const colEnd = Math.min(days - 1, diffDays(f.endDate, startDate))
    const top = layout[rowStart]!.y
    const bottom = layout[rowEnd]!.y + layout[rowEnd]!.h
    blocks.push({
      x: PAD + NAME_W + colStart * DAY_W,
      y: top,
      w: (colEnd - colStart + 1) * DAY_W,
      h: bottom - top,
      status: f.status,
      eventName: f.eventName || '(untitled)',
      company: f.company || '',
      pax: f.pax || 0
    })
  }

  // Canvas.
  const wLogical = PAD * 2 + NAME_W + days * DAY_W
  const hLogical = gridBottom + LEGEND_H + PAD
  const canvas = document.createElement('canvas')
  canvas.width = wLogical * SCALE
  canvas.height = hLogical * SCALE
  const ctx = canvas.getContext('2d')!
  ctx.scale(SCALE, SCALE)
  ctx.textBaseline = 'top'

  // Background.
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, wLogical, hLogical)

  const gridLeft = PAD + NAME_W
  const gridRight = PAD + NAME_W + days * DAY_W

  // Title + subtitle + date range.
  ctx.fillStyle = INK
  ctx.font = '700 24px "Nunito Sans", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
  ctx.fillText(title, PAD, PAD)
  ctx.fillStyle = MUTED
  ctx.font = '600 13px "Nunito Sans", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
  ctx.fillText(subtitle, PAD, PAD + 32)
  ctx.fillStyle = INK
  ctx.font = '700 15px "Nunito Sans", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
  ctx.textAlign = 'right'
  ctx.fillText(dateRangeLabel(startDate, days), gridRight, PAD + 6)
  ctx.textAlign = 'left'

  // Weekend column shading (behind everything in the grid body).
  cols.forEach((c, i) => {
    if (!c.isWeekend) return
    ctx.fillStyle = WEEKEND_BG
    ctx.fillRect(gridLeft + i * DAY_W, rowsTop - DAY_HEADER_H, DAY_W, gridBottom - (rowsTop - DAY_HEADER_H))
  })

  // Day headers.
  const headerTop = rowsTop - DAY_HEADER_H
  ctx.fillStyle = MUTED
  ctx.font = '700 11px "Nunito Sans", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
  ctx.textAlign = 'center'
  cols.forEach((c, i) => {
    const cx = gridLeft + i * DAY_W + DAY_W / 2
    ctx.fillStyle = MUTED
    ctx.font = '700 11px "Nunito Sans", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
    ctx.fillText(c.dow, cx, headerTop + 8)
    ctx.fillStyle = c.isToday ? STATUS_META.definite.color : INK
    ctx.font = '800 20px "Nunito Sans", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
    ctx.fillText(String(c.num), cx, headerTop + 20)
    if (c.isToday) {
      ctx.fillStyle = '#0066CC'
      ctx.fillRect(gridLeft + i * DAY_W, rowsTop - 2, DAY_W, 2)
    }
  })
  ctx.textAlign = 'left'

  // Rows: category bands + venue name cells.
  for (const r of layout) {
    if (r.type === 'cat') {
      ctx.fillStyle = CAT_BG
      ctx.fillRect(PAD, r.y, NAME_W + days * DAY_W, r.h)
      ctx.fillStyle = MUTED
      ctx.font = '700 10px "Nunito Sans", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
      ctx.fillText(r.label, PAD + 12, r.y + r.h / 2 - 5)
    } else {
      ctx.fillStyle = INK
      ctx.font = '700 12px "Nunito Sans", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
      ctx.fillText(truncate(ctx, r.label, NAME_W - 20), PAD + 12, r.y + r.h / 2 - 6)
    }
  }

  // Grid lines.
  ctx.strokeStyle = LINE
  ctx.lineWidth = 1
  ctx.beginPath()
  for (let i = 0; i <= days; i++) {
    const x = gridLeft + i * DAY_W + 0.5
    ctx.moveTo(x, headerTop)
    ctx.lineTo(x, gridBottom)
  }
  const nameX = PAD + 0.5
  ctx.moveTo(nameX, headerTop)
  ctx.lineTo(nameX, gridBottom)
  for (const r of layout) {
    const yy = r.y + 0.5
    ctx.moveTo(PAD, yy)
    ctx.lineTo(gridRight, yy)
  }
  ctx.moveTo(PAD, gridBottom + 0.5)
  ctx.lineTo(gridRight, gridBottom + 0.5)
  ctx.moveTo(gridRight + 0.5, headerTop)
  ctx.lineTo(gridRight + 0.5, gridBottom)
  ctx.stroke()

  // Booking blocks.
  for (const b of blocks) drawBlock(ctx, b)

  // Legend.
  const legendY = gridBottom + 16
  let lx = PAD
  ctx.font = '600 12px "Nunito Sans", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
  for (const s of FUNCTION_STATUSES) {
    const color = STATUS_META[s].color
    ctx.fillStyle = color
    roundRect(ctx, lx, legendY, 14, 14, 3)
    ctx.fill()
    ctx.fillStyle = MUTED
    ctx.fillText(STATUS_META[s].label, lx + 20, legendY + 1)
    lx += 24 + ctx.measureText(STATUS_META[s].label).width + 22
  }

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Failed to render image'))), 'image/jpeg', 0.92)
  })
}

function drawBlock(
  ctx: CanvasRenderingContext2D,
  b: { x: number; y: number; w: number; h: number; status: FunctionStatus; eventName: string; company: string; pax: number }
) {
  const color = STATUS_META[b.status].color
  const pad = 3
  const x = b.x + pad
  const yTop = b.y + pad
  const w = b.w - pad * 2
  const h = b.h - pad * 2
  // Tinted body + accent left bar.
  ctx.fillStyle = hexToRgba(color, 0.14)
  roundRect(ctx, x, yTop, w, h, 6)
  ctx.fill()
  ctx.fillStyle = color
  roundRect(ctx, x, yTop, 3, h, 1.5)
  ctx.fill()

  const tx = x + 9
  const tw = w - 13
  let ty = yTop + 6
  const bottom = yTop + h - 3

  // Event name — up to 2 lines, bold.
  ctx.fillStyle = INK
  ctx.font = '700 12px "Nunito Sans", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
  const nameLines = wrap(ctx, b.eventName, tw, 2)
  for (const line of nameLines) {
    if (ty + 14 > bottom) break
    ctx.fillText(line, tx, ty)
    ty += 15
  }
  // Company — 1 line, muted.
  if (b.company && ty + 12 <= bottom) {
    ctx.fillStyle = MUTED
    ctx.font = '600 11px "Nunito Sans", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
    ctx.fillText(truncate(ctx, b.company, tw), tx, ty)
    ty += 13
  }
  // Pax — small, muted.
  if (b.pax && ty + 11 <= bottom) {
    ctx.fillStyle = MUTED
    ctx.font = '600 10px "Nunito Sans", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
    ctx.fillText(`${b.pax} pax`, tx, ty)
  }
}

// ---- Text helpers --------------------------------------------------------

function truncate(ctx: CanvasRenderingContext2D, text: string, maxW: number): string {
  if (ctx.measureText(text).width <= maxW) return text
  let s = text
  while (s.length > 1 && ctx.measureText(s + '…').width > maxW) s = s.slice(0, -1)
  return s + '…'
}

// Word-wrap into at most `maxLines`; the last line is ellipsized if it overflows.
function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number, maxLines: number): string[] {
  const words = text.split(/\s+/)
  const lines: string[] = []
  let cur = ''
  for (const word of words) {
    const test = cur ? cur + ' ' + word : word
    if (ctx.measureText(test).width <= maxW || !cur) {
      cur = test
    } else {
      lines.push(cur)
      cur = word
      if (lines.length === maxLines - 1) break
    }
  }
  if (lines.length < maxLines) lines.push(cur)
  // Ellipsize the final line if the text didn't fully fit.
  const used = lines.join(' ')
  if (used.length < text.length && lines.length) {
    lines[lines.length - 1] = truncate(ctx, lines[lines.length - 1]! + '…', maxW)
  } else if (lines.length) {
    lines[lines.length - 1] = truncate(ctx, lines[lines.length - 1]!, maxW)
  }
  return lines.filter(Boolean)
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + rr, y)
  ctx.arcTo(x + w, y, x + w, y + h, rr)
  ctx.arcTo(x + w, y + h, x, y + h, rr)
  ctx.arcTo(x, y + h, x, y, rr)
  ctx.arcTo(x, y, x + w, y, rr)
  ctx.closePath()
}

// ---- Share / download ----------------------------------------------------

// Hands the image to the OS share sheet (→ WhatsApp on mobile) when the browser
// supports file sharing; otherwise downloads it. Returns how it was delivered.
export async function shareOrDownload(blob: Blob, filename: string, shareText?: string): Promise<'shared' | 'downloaded'> {
  const file = new File([blob], filename, { type: 'image/jpeg' })
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean }
  if (nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], title: filename, text: shareText })
      return 'shared'
    } catch (err) {
      // User cancelled the share sheet — treat as a no-op, don't fall through to a download.
      if (err instanceof DOMException && err.name === 'AbortError') return 'shared'
    }
  }
  download(blob, filename)
  return 'downloaded'
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
