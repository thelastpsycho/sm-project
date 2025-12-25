const CACHE_NAME = 'sm-app-v1'
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json'
]

const API_CACHE_NAME = 'sm-api-v1'

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== API_CACHE_NAME) {
            return caches.delete(cacheName)
          }
        })
      )
    })
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  if (url.origin === self.location.origin) {
    event.respondWith(handleStaticRequest(request))
  } else if (url.pathname.includes('/webhook/')) {
    event.respondWith(handleAPIRequest(request))
  } else {
    event.respondWith(fetch(request))
  }
})

async function handleStaticRequest(request) {
  try {
    const response = await caches.match(request)
    if (response) {
      return response
    }

    const networkResponse = await fetch(request)
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME)
      cache.put(request, networkResponse.clone())
    }
    return networkResponse
  } catch (error) {
    const cachedResponse = await caches.match(request)
    if (cachedResponse) {
      return cachedResponse
    }

    if (request.mode === 'navigate') {
      return caches.match('/')
    }

    return new Response('Offline', {
      status: 503,
      statusText: 'Service Unavailable'
    })
  }
}

async function handleAPIRequest(request) {
  try {
    const networkResponse = await fetch(request)

    if (networkResponse.ok) {
      const cache = await caches.open(API_CACHE_NAME)
      cache.put(request, networkResponse.clone())
    }

    return networkResponse
  } catch (error) {
    console.log('API request failed, checking cache:', error)

    const cachedResponse = await caches.match(request)
    if (cachedResponse) {
      return cachedResponse
    }

    return new Response(
      JSON.stringify({
        error: 'Network error',
        message: 'Request failed. Please check your connection.'
      }),
      {
        status: 503,
        statusText: 'Service Unavailable',
        headers: {
          'Content-Type': 'application/json'
        }
      }
    )
  }
}