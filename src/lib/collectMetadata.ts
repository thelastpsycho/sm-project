import { UAParser } from 'ua-parser-js'
import type { ResponseMetadata } from '@/types/survey'

// Everything readable synchronously from the browser — no network round trip, so this
// is safe to call right before submit.
export function getClientMetadata(): ResponseMetadata {
  const ua = new UAParser(navigator.userAgent).getResult()

  const urlParams: Record<string, string> = {}
  new URLSearchParams(window.location.search).forEach((value, key) => {
    urlParams[key] = value
  })

  const connection = (navigator as Navigator & { connection?: { effectiveType?: string } }).connection

  return {
    browserName: ua.browser.name,
    browserVersion: ua.browser.version,
    // Unset means a regular browser; ua-parser-js only fills this in to flag
    // crawlers, in-app webviews (Instagram/WhatsApp/etc.), email clients, and the like.
    browserType: ua.browser.type || 'browser',
    osName: ua.os.name,
    osVersion: ua.os.version,
    deviceType: ua.device.type || 'desktop',
    screenWidth: window.screen.width,
    screenHeight: window.screen.height,
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
    devicePixelRatio: window.devicePixelRatio,
    language: navigator.language,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    referrer: document.referrer || undefined,
    urlParams: Object.keys(urlParams).length ? urlParams : undefined,
    connectionType: connection?.effectiveType
  }
}

// Country/region/city only exist server-side, read off the request's Vercel geo
// headers — so this needs a round trip. Best-effort: callers should fire it early
// (on mount) rather than block submission on it.
export async function getGeoMetadata(): Promise<Partial<ResponseMetadata>> {
  try {
    const res = await fetch('/api/survey/geo')
    if (!res.ok) return {}
    const data = await res.json()
    return {
      geoCountry: data.country || undefined,
      geoRegion: data.region || undefined,
      geoCity: data.city || undefined
    }
  } catch {
    return {}
  }
}
