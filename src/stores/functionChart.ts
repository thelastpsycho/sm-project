import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  deleteField,
  writeBatch,
  query,
  orderBy
} from 'firebase/firestore'
import { db, COLLECTIONS } from '@/lib/firebase'
import type { FunctionBooking, FunctionStatus, NewFunctionBooking } from '@/types/functionChart'
import { buildSeedBookings, type Month } from '@/lib/functionChart'
import { canonicalVenue } from '@/lib/functionChartVenues'
import legacyChartData from '@/data/functionChart.json'

export const useFunctionChartStore = defineStore('functionChart', () => {
  const functions = ref<FunctionBooking[]>([])
  const loading = ref(false)
  const seeding = ref(false)
  const error = ref<string | null>(null)

  function mapDoc(d: { id: string; data: () => Record<string, any> }): FunctionBooking {
    const data = d.data()
    return {
      id: d.id,
      salesOwner: data.salesOwner ?? '',
      company: data.company ?? '',
      eventName: data.eventName ?? '',
      pax: data.pax ?? 0,
      // Prefer the new `venues` array; fall back to a legacy single `venue` string.
      venues: Array.isArray(data.venues) ? data.venues : data.venue ? [data.venue] : [],
      status: (data.status ?? 'tentative') as FunctionStatus,
      startDate: data.startDate ?? '',
      endDate: data.endDate ?? data.startDate ?? '',
      note: data.note ?? '',
      createdAt: data.createdAt?.toDate?.() ?? new Date(),
      updatedAt: data.updatedAt?.toDate?.() ?? new Date()
    }
  }

  async function loadFunctions() {
    loading.value = true
    error.value = null
    try {
      const snapshot = await getDocs(
        query(collection(db, COLLECTIONS.FUNCTIONS), orderBy('startDate', 'asc'))
      )
      functions.value = snapshot.docs.map(mapDoc)
    } catch (err) {
      error.value = 'Failed to load functions'
      console.error('Error loading functions:', err)
    } finally {
      loading.value = false
    }
  }

  async function createFunction(payload: NewFunctionBooking) {
    try {
      const now = new Date()
      const ref = await addDoc(collection(db, COLLECTIONS.FUNCTIONS), { ...payload, createdAt: now, updatedAt: now })
      // Insert locally instead of reloading — avoids the loading flash that would
      // remount (and scroll-reset) the grid. Grid positions by date, not array order.
      functions.value.push({ ...payload, venues: [...payload.venues], id: ref.id, createdAt: now, updatedAt: now })
    } catch (err) {
      error.value = 'Failed to create function'
      console.error('Error creating function:', err)
      throw err
    }
  }

  async function updateFunction(id: string, patch: Partial<FunctionBooking>) {
    try {
      const { id: _omit, createdAt: _c, ...rest } = patch
      const now = new Date()
      await updateDoc(doc(db, COLLECTIONS.FUNCTIONS, id), { ...rest, updatedAt: now })
      // Patch the local record in place so the block just updates (e.g. recolors)
      // without a full reload — keeps the calendar's scroll position intact.
      const local = functions.value.find((f) => f.id === id)
      if (local) Object.assign(local, rest, { updatedAt: now })
    } catch (err) {
      error.value = 'Failed to update function'
      console.error('Error updating function:', err)
      throw err
    }
  }

  /** Optimistic status change (e.g. from a quick-action menu on a block). */
  async function moveStatus(id: string, status: FunctionStatus) {
    const local = functions.value.find((f) => f.id === id)
    const prev = local?.status
    if (local) local.status = status
    try {
      await updateDoc(doc(db, COLLECTIONS.FUNCTIONS, id), { status, updatedAt: new Date() })
    } catch (err) {
      if (local && prev) local.status = prev
      error.value = 'Failed to update status'
      console.error('Error moving status:', err)
      throw err
    }
  }

  async function deleteFunction(id: string) {
    try {
      await deleteDoc(doc(db, COLLECTIONS.FUNCTIONS, id))
      functions.value = functions.value.filter((f) => f.id !== id)
    } catch (err) {
      error.value = 'Failed to delete function'
      console.error('Error deleting function:', err)
      throw err
    }
  }

  /**
   * One-time cleanup: remove exact-duplicate bookings left behind by a double
   * import. Two docs are "the same" when every business field matches (event,
   * company, owner, pax, venues, start/end). Keeps the first of each group and
   * deletes the rest. Idempotent — no-ops once the collection is clean. Returns
   * the number of redundant docs removed.
   */
  async function dedupeFunctions(): Promise<number> {
    try {
      const snapshot = await getDocs(collection(db, COLLECTIONS.FUNCTIONS))
      const seen = new Set<string>()
      const toDelete: string[] = []
      for (const d of snapshot.docs) {
        const data = d.data()
        const venues = Array.isArray(data.venues) ? data.venues : data.venue ? [data.venue] : []
        const sig = [
          data.eventName ?? '',
          data.company ?? '',
          data.salesOwner ?? '',
          data.pax ?? 0,
          venues.join('|'),
          data.startDate ?? '',
          data.endDate ?? data.startDate ?? ''
        ].join('§')
        if (seen.has(sig)) toDelete.push(d.id)
        else seen.add(sig)
      }
      if (toDelete.length === 0) return 0

      for (let i = 0; i < toDelete.length; i += 400) {
        const batch = writeBatch(db)
        for (const id of toDelete.slice(i, i + 400)) batch.delete(doc(db, COLLECTIONS.FUNCTIONS, id))
        await batch.commit()
      }
      const removed = new Set(toDelete)
      functions.value = functions.value.filter((f) => !removed.has(f.id))
      return toDelete.length
    } catch (err) {
      error.value = 'Failed to remove duplicate functions'
      console.error('Error deduping functions:', err)
      throw err
    }
  }

  /**
   * One-time normalization: rewrite legacy docs that still carry a single `venue`
   * string into the new `venues` array (and drop the old field). Idempotent and
   * cheap — only docs missing a `venues` array are touched, so it no-ops once run.
   * Returns the number of docs migrated.
   */
  async function normalizeVenues(): Promise<number> {
    try {
      const snapshot = await getDocs(collection(db, COLLECTIONS.FUNCTIONS))
      const stale = snapshot.docs.filter((d) => {
        const data = d.data()
        return !Array.isArray(data.venues) && data.venue
      })
      if (stale.length === 0) return 0

      for (let i = 0; i < stale.length; i += 400) {
        const batch = writeBatch(db)
        for (const d of stale.slice(i, i + 400)) {
          const raw = String(d.data().venue)
          batch.update(doc(db, COLLECTIONS.FUNCTIONS, d.id), {
            venues: [canonicalVenue(raw) ?? raw],
            venue: deleteField()
          })
        }
        await batch.commit()
      }
      await loadFunctions()
      return stale.length
    } catch (err) {
      error.value = 'Failed to normalize venues'
      console.error('Error normalizing venues:', err)
      return 0
    }
  }

  /**
   * One-time migration of the legacy spreadsheet chart (src/data/functionChart.json)
   * into structured booking docs. Guarded: only runs when the collection is empty,
   * so it never double-imports. Returns the number of bookings imported (0 if skipped).
   */
  async function importSeedFunctions(): Promise<number> {
    seeding.value = true
    error.value = null
    try {
      const existing = await getDocs(collection(db, COLLECTIONS.FUNCTIONS))
      if (!existing.empty) return 0

      const seed = buildSeedBookings(legacyChartData as unknown as Month[], canonicalVenue, 'tentative')
      const now = new Date()
      // Firestore batches are capped at 500 writes.
      for (let i = 0; i < seed.length; i += 400) {
        const batch = writeBatch(db)
        for (const row of seed.slice(i, i + 400)) {
          const ref = doc(collection(db, COLLECTIONS.FUNCTIONS))
          batch.set(ref, { ...row, createdAt: now, updatedAt: now })
        }
        await batch.commit()
      }
      await loadFunctions()
      return seed.length
    } catch (err) {
      error.value = 'Failed to import functions'
      console.error('Error importing seed functions:', err)
      throw err
    } finally {
      seeding.value = false
    }
  }

  return {
    functions,
    loading,
    seeding,
    error,
    loadFunctions,
    createFunction,
    updateFunction,
    moveStatus,
    deleteFunction,
    dedupeFunctions,
    importSeedFunctions,
    normalizeVenues
  }
})
