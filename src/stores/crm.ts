import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  query,
  orderBy,
  increment
} from 'firebase/firestore'
import { db, COLLECTIONS } from '@/lib/firebase'
import { DEAL_STATUSES } from '@/types/crm'
import type { Deal, DealComment, DealStatus, DealStage, NewDeal, SeedDeal } from '@/types/crm'
import { applyRevenueCalc } from '@/lib/crmUtils'
import dealsSeed from '@/data/dealsSeed.json'

export const useCrmStore = defineStore('crm', () => {
  // State
  const deals = ref<Deal[]>([])
  const loading = ref(false)
  const importing = ref(false)
  const error = ref<string | null>(null)
  // Comments keyed by deal id (deals/{id}/comments subcollection).
  const comments = ref<Record<string, DealComment[]>>({})
  const commentsLoading = ref(false)

  // Computed
  const dealsByStatus = computed<Record<DealStatus, Deal[]>>(() => {
    const grouped = Object.fromEntries(DEAL_STATUSES.map(s => [s, [] as Deal[]])) as Record<
      DealStatus,
      Deal[]
    >
    for (const deal of deals.value) {
      ;(grouped[deal.status] ?? grouped.Active).push(deal)
    }
    return grouped
  })

  const valueByStatus = computed<Record<DealStatus, number>>(() => {
    const totals = Object.fromEntries(DEAL_STATUSES.map(s => [s, 0])) as Record<DealStatus, number>
    for (const deal of deals.value) {
      totals[deal.status] = (totals[deal.status] ?? 0) + (deal.totalRevenue ?? 0)
    }
    return totals
  })

  const totalPipelineValue = computed(() =>
    deals.value.reduce((sum, d) => sum + (d.totalRevenue ?? 0), 0)
  )

  // Helpers
  function mapDoc(d: { id: string; data: () => Record<string, any> }): Deal {
    const data = d.data()
    return {
      id: d.id,
      ...data,
      createdAt: data.createdAt?.toDate?.() ?? new Date(),
      updatedAt: data.updatedAt?.toDate?.() ?? new Date()
    } as Deal
  }

  // Actions
  async function loadDeals() {
    loading.value = true
    error.value = null
    try {
      const snapshot = await getDocs(
        query(collection(db, COLLECTIONS.DEALS), orderBy('updatedAt', 'desc'))
      )
      deals.value = snapshot.docs.map(mapDoc)
    } catch (err) {
      error.value = 'Failed to load deals'
      console.error('Error loading deals:', err)
    } finally {
      loading.value = false
    }
  }

  async function createDeal(payload: NewDeal) {
    try {
      const now = new Date()
      await addDoc(collection(db, COLLECTIONS.DEALS), {
        ...applyRevenueCalc(payload),
        createdAt: now,
        updatedAt: now
      })
      await loadDeals()
    } catch (err) {
      error.value = 'Failed to create deal'
      console.error('Error creating deal:', err)
      throw err
    }
  }

  async function updateDeal(id: string, patch: Partial<Deal>) {
    try {
      const { id: _omit, createdAt: _c, ...rest } = patch
      const data = applyRevenueCalc(rest)
      await updateDoc(doc(db, COLLECTIONS.DEALS, id), { ...data, updatedAt: new Date() })
      await loadDeals()
    } catch (err) {
      error.value = 'Failed to update deal'
      console.error('Error updating deal:', err)
      throw err
    }
  }

  /**
   * Move a deal to a new status (Kanban drag). Targeted field write — does NOT
   * go through updateDeal(), because applyRevenueCalc on a status-only patch would
   * recompute (and wipe) the revenue fields. Optimistic local update for snappy UI.
   */
  async function moveStatus(id: string, status: DealStatus) {
    const local = deals.value.find(d => d.id === id)
    const prev = local?.status
    if (local) local.status = status
    try {
      await updateDoc(doc(db, COLLECTIONS.DEALS, id), { status, updatedAt: new Date() })
    } catch (err) {
      if (local && prev) local.status = prev // revert on failure
      error.value = 'Failed to move deal'
      console.error('Error moving status:', err)
      throw err
    }
  }

  /** Move a deal to a new funnel stage (Kanban drag). Same targeted-write approach. */
  async function moveStage(id: string, stage: DealStage) {
    const local = deals.value.find(d => d.id === id)
    const prev = local?.stage
    if (local) local.stage = stage
    try {
      await updateDoc(doc(db, COLLECTIONS.DEALS, id), { stage, updatedAt: new Date() })
    } catch (err) {
      if (local) local.stage = prev // revert on failure
      error.value = 'Failed to move deal'
      console.error('Error moving stage:', err)
      throw err
    }
  }

  async function deleteDeal(id: string) {
    try {
      await deleteDoc(doc(db, COLLECTIONS.DEALS, id))
      deals.value = deals.value.filter(d => d.id !== id)
    } catch (err) {
      error.value = 'Failed to delete deal'
      console.error('Error deleting deal:', err)
      throw err
    }
  }

  /**
   * One-time bulk import of the team's existing pipeline (src/data/dealsSeed.json).
   * Guarded: only runs when the collection is empty, so it never double-imports.
   * Returns the number of deals imported (0 if skipped).
   */
  async function importSeedDeals(): Promise<number> {
    importing.value = true
    error.value = null
    try {
      // Guard against double-import.
      const existing = await getDocs(collection(db, COLLECTIONS.DEALS))
      if (!existing.empty) return 0

      const seed = dealsSeed as SeedDeal[]
      const now = new Date()
      // Firestore batches are capped at 500 writes.
      for (let i = 0; i < seed.length; i += 400) {
        const batch = writeBatch(db)
        for (const row of seed.slice(i, i + 400)) {
          const ref = doc(collection(db, COLLECTIONS.DEALS))
          batch.set(ref, {
            ownerId: '',
            ...row,
            createdAt: now,
            updatedAt: now
          })
        }
        await batch.commit()
      }
      await loadDeals()
      return seed.length
    } catch (err) {
      error.value = 'Failed to import pipeline'
      console.error('Error importing seed deals:', err)
      throw err
    } finally {
      importing.value = false
    }
  }

  // ---- Comments (per-deal, team-visible) ----
  async function loadComments(dealId: string) {
    commentsLoading.value = true
    try {
      const snapshot = await getDocs(
        query(
          collection(db, COLLECTIONS.DEALS, dealId, 'comments'),
          orderBy('createdAt', 'asc')
        )
      )
      comments.value[dealId] = snapshot.docs.map(d => {
        const data = d.data()
        return {
          id: d.id,
          authorId: data.authorId ?? '',
          authorName: data.authorName ?? '',
          text: data.text ?? '',
          createdAt: data.createdAt?.toDate?.() ?? new Date()
        } as DealComment
      })
    } catch (err) {
      error.value = 'Failed to load comments'
      console.error('Error loading comments:', err)
    } finally {
      commentsLoading.value = false
    }
  }

  async function addComment(
    dealId: string,
    input: { authorId: string; authorName: string; text: string }
  ) {
    const text = input.text.trim()
    if (!text) return
    try {
      const now = new Date()
      const ref = await addDoc(collection(db, COLLECTIONS.DEALS, dealId, 'comments'), {
        authorId: input.authorId,
        authorName: input.authorName,
        text,
        createdAt: now
      })
      const list = comments.value[dealId] ?? (comments.value[dealId] = [])
      list.push({ id: ref.id, authorId: input.authorId, authorName: input.authorName, text, createdAt: now })
      // Denormalized count on the deal doc (avoids reading the subcollection for the board badge).
      await updateDoc(doc(db, COLLECTIONS.DEALS, dealId), { commentCount: increment(1) })
      const local = deals.value.find(d => d.id === dealId)
      if (local) local.commentCount = (local.commentCount ?? 0) + 1
    } catch (err) {
      error.value = 'Failed to add comment'
      console.error('Error adding comment:', err)
      throw err
    }
  }

  async function deleteComment(dealId: string, commentId: string) {
    try {
      await deleteDoc(doc(db, COLLECTIONS.DEALS, dealId, 'comments', commentId))
      comments.value[dealId] = (comments.value[dealId] ?? []).filter(c => c.id !== commentId)
      await updateDoc(doc(db, COLLECTIONS.DEALS, dealId), { commentCount: increment(-1) })
      const local = deals.value.find(d => d.id === dealId)
      if (local) local.commentCount = Math.max(0, (local.commentCount ?? 1) - 1)
    } catch (err) {
      error.value = 'Failed to delete comment'
      console.error('Error deleting comment:', err)
      throw err
    }
  }

  return {
    // State
    deals,
    loading,
    importing,
    error,
    comments,
    commentsLoading,
    // Computed
    dealsByStatus,
    valueByStatus,
    totalPipelineValue,
    // Actions
    loadDeals,
    createDeal,
    updateDeal,
    moveStatus,
    moveStage,
    deleteDeal,
    importSeedDeals,
    loadComments,
    addComment,
    deleteComment
  }
})
