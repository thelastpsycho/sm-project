import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy
} from 'firebase/firestore'
import { db, COLLECTIONS } from '@/lib/firebase'
import type { FunctionBooking, FunctionStatus, NewFunctionBooking } from '@/types/functionChart'

export const useFunctionChartStore = defineStore('functionChart', () => {
  const functions = ref<FunctionBooking[]>([])
  const loading = ref(false)
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
      // TODO(perf): needs pagination before limiting — the function chart positions every
      // booking on a date grid, so a limit(N) would hide bookings from the calendar.
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

  return {
    functions,
    loading,
    error,
    loadFunctions,
    createFunction,
    updateFunction,
    moveStatus,
    deleteFunction
  }
})
