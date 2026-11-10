// Country/region/city are only visible to the server, as headers Vercel's edge attaches
// to the incoming request based on the client's IP — the browser has no API for this.
// Coarse (city-level, not GPS) so it doesn't need a permission prompt or extra consent.

import type { VercelRequest, VercelResponse } from '@vercel/node'

function header(req: VercelRequest, name: string): string | undefined {
  const value = req.headers[name]
  return typeof value === 'string' ? value : undefined
}

export default function handler(req: VercelRequest, res: VercelResponse) {
  const country = header(req, 'x-vercel-ip-country')
  const region = header(req, 'x-vercel-ip-country-region')
  const city = header(req, 'x-vercel-ip-city')

  res.status(200).json({
    country,
    region,
    city: city ? decodeURIComponent(city) : undefined
  })
}
