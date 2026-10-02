import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

const listener = vi.hoisted(() => ({ next: null as any, error: null as any, stop: vi.fn() }))
vi.mock('@/lib/firebase', () => ({ db: {}, COLLECTIONS: { DEALS: 'deals' } }))
vi.mock('@/stores/session', () => ({ useSessionStore: () => ({ currentUser: null }) }))
vi.mock('firebase/firestore', async importOriginal => ({
  ...await importOriginal<typeof import('firebase/firestore')>(),
  collection: vi.fn(), query: vi.fn(), orderBy: vi.fn(),
  onSnapshot: vi.fn((_query, next, error) => {
    listener.next = next
    listener.error = error
    return listener.stop
  })
}))
import { useCrmStore } from '../crm'
import { onSnapshot } from 'firebase/firestore'

beforeEach(() => { setActivePinia(createPinia()); vi.clearAllMocks() })

describe('pipeline loading and retry', () => {
  it('restarts a failed listener and preserves loaded records until recovery', () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    const store = useCrmStore()
    store.subscribe()
    listener.next({ docs: [{ id: 'one', data: () => ({ company: 'Acme' }) }] })
    listener.error(new Error('offline'))
    expect(store.loadError).toContain('Unable to load')
    expect(store.error).toBeNull()
    expect(store.loading).toBe(false)
    expect(store.deals).toHaveLength(1)
    store.retrySubscription()
    expect(listener.stop).toHaveBeenCalledTimes(1)
    expect(onSnapshot).toHaveBeenCalledTimes(2)
    expect(store.loading).toBe(true)
    expect(store.deals).toHaveLength(1)
    listener.next({ docs: [] })
    expect(store.loadError).toBeNull()
    expect(store.loading).toBe(false)
    expect(store.deals).toEqual([])
    log.mockRestore()
  })
})
