// Vercel Edge Middleware for dynamic Open Graph tags on survey pages
// This intercepts bot requests and serves pre-rendered HTML with event details

// Bot user agents that need pre-rendered meta tags
const BOT_USER_AGENTS = [
  'whatsapp',
  'facebookexternalhit',
  'facebookcatalog',
  'facebot',
  'telegrambot',
  'twitterbot',
  'linkedinbot',
  'pinterest',
  'slackbot',
  'discordbot',
  'googlebot',
  'bingbot',
  'applebot',
  'embedly',
  'quora link preview',
  'showyoubot',
  'outbrain',
  'w3c_validator'
]

// Check if request is from a bot
function isBot(userAgent: string): boolean {
  const lowerUserAgent = userAgent.toLowerCase()
  return BOT_USER_AGENTS.some(bot => lowerUserAgent.includes(bot))
}

// Generate HTML with Open Graph tags
function generateOGHtml(eventName: string, companyName: string, eventUrl: string): string {
  const title = `${companyName} - ${eventName}`
  const description = `Share your feedback about ${eventName} for ${companyName} at The Anvaya Beach Resort Bali.`

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <meta name="description" content="${description}">

  <!-- Open Graph / Facebook / WhatsApp -->
  <meta property="og:type" content="website">
  <meta property="og:url" content="${eventUrl}">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  <meta property="og:image" content="https://sm.anvayabali.com/logo-theanvaya.svg">
  <meta property="og:site_name" content="The Anvaya Beach Resort Bali">

  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:url" content="${eventUrl}">
  <meta name="twitter:title" content="${title}">
  <meta name="twitter:description" content="${description}">
  <meta name="twitter:image" content="https://sm.anvayabali.com/logo-theanvaya.svg">

  <script>
    window.location.href = "${eventUrl}";
  </script>
</head>
<body>
  <p>Redirecting to survey...</p>
</body>
</html>`
}

export async function middleware(request: Request) {
  const url = new URL(request.url)
  const pathname = url.pathname

  // Only handle survey pages with event ID
  const surveyMatch = pathname.match(/^\/survey\/([a-zA-Z0-9]+)$/)

  if (!surveyMatch) {
    return fetch(request)
  }

  const eventId = surveyMatch[1]
  const userAgent = request.headers.get('user-agent') || ''

  // Only pre-render for bots
  if (!isBot(userAgent)) {
    return fetch(request)
  }

  try {
    // Fetch event data from Firebase Firestore REST API
    const firebaseProjectId = 'pwa-projectanv'
    const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${firebaseProjectId}/databases/(default)/documents/events/${eventId}`

    const response = await fetch(firestoreUrl)

    if (!response.ok) {
      return fetch(request)
    }

    const data = await response.json()
    const fields = data.fields

    const eventName = fields.eventName?.stringValue || 'Event Survey'
    const companyName = fields.companyName?.stringValue || 'The Anvaya Beach Resort Bali'
    const eventUrl = `https://sm.anvayabali.com/survey/${eventId}`

    const html = generateOGHtml(eventName, companyName, eventUrl)

    return new Response(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600'
      }
    })
  } catch (error) {
    console.error('Error in middleware:', error)
    return fetch(request)
  }
}

// Configure which routes the middleware runs on
export const config = {
  matcher: '/survey/:eventId'
}
