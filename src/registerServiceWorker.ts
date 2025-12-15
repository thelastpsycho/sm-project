interface RegistrationOptions {
  onUpdate?: (registration: ServiceWorkerRegistration) => void
  onSuccess?: (registration: ServiceWorkerRegistration) => void
}

export function registerServiceWorker(options: RegistrationOptions = {}) {
  if (import.meta.env.DEV || !('serviceWorker' in navigator)) {
    return Promise.resolve()
  }

  return new Promise<ServiceWorkerRegistration>((resolve, reject) => {
    navigator.serviceWorker
      .register('/service-worker.js')
      .then((registration) => {
        console.log('SW registered: ', registration)

        if (options.onSuccess) {
          options.onSuccess(registration)
        }

        registration.addEventListener('updatefound', () => {
          const installingWorker = registration.installing
          if (installingWorker == null) return

          installingWorker.addEventListener('statechange', () => {
            if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('New content is available; please refresh.')
              if (options.onUpdate) {
                options.onUpdate(registration)
              }
            }
          })
        })

        resolve(registration)
      })
      .catch((error) => {
        console.error('Error during service worker registration:', error)
        reject(error)
      })
  })
}

export function unregisterServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready
      .then((registration) => {
        registration.unregister()
      })
      .catch((error) => {
        console.error(error.message)
      })
  }
}