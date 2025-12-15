export const scheduleRetry = (attempt: number): number => {
  const baseDelay = 1000
  const maxDelay = 30000
  const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay)
  return delay + Math.random() * 1000
}

export const isOnline = (): boolean => {
  return navigator.onLine
}

export const getConnectionType = (): string => {
  const connection = (navigator as any).connection ||
                    (navigator as any).mozConnection ||
                    (navigator as any).webkitConnection

  if (!connection) {
    return 'unknown'
  }

  return connection.effectiveType || connection.type || 'unknown'
}

export const setupConnectionListeners = (onOnline: () => void, onOffline: () => void) => {
  window.addEventListener('online', onOnline)
  window.addEventListener('offline', onOffline)

  const connection = (navigator as any).connection ||
                    (navigator as any).mozConnection ||
                    (navigator as any).webkitConnection

  if (connection) {
    connection.addEventListener('change', () => {
      if (navigator.onLine) {
        onOnline()
      } else {
        onOffline()
      }
    })
  }

  return () => {
    window.removeEventListener('online', onOnline)
    window.removeEventListener('offline', onOffline)

    if (connection) {
      connection.removeEventListener('change', () => {})
    }
  }
}