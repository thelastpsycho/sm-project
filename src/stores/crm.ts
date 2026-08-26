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
  onSnapshot,
  query,
  orderBy,
  increment,
  deleteField,
  type WriteBatch
} from 'firebase/firestore'
import { db, COLLECTIONS } from '@/lib/firebase'
import { DEAL_STAGES } from '@/types/crm'
import type { Deal, DealComment, DealStage, NewDeal, NewPipelineEvent } from '@/types/crm'
import { applyRevenueCalc } from '@/lib/crmUtils'
import { useSessionStore } from './session'

// Legacy status → stage mapping. Used to fill `stage` on any doc that predates the
// status/stage merge (defensive; the real data is fixed by scripts/mergeStatusIntoStage.mjs).
function legacyStatusToStage(status?: string): DealStage {
  if (status === 'Win') return 'Confirmed'
  if (status === 'Lost') return 'Lost'
  return 'New'
}

export const useCrmStore = defineStore('crm', () => {
  // State
  const deals = ref<Deal[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  // Comments keyed by deal id (deals/{id}/comments subcollection).
  const comments = ref<Record<string, DealComment[]>>({})
  const commentsLoading = ref(false)
  // Live listener handle — set by subscribe(), cleared by unsubscribe().
  let unsub: (() => void) | null = null

  // Computed
  const totalPipelineValue = computed(() =>
    deals.value.reduce((sum, d) => sum + (d.totalRevenue ?? 0), 0)
  )

  // Helpers
  function mapDoc(d: { id: string; data: () => Record<string, any> }): Deal {
    const data = d.data()
    return {
      id: d.id,
      ...data,
      // Fill stage for any legacy doc still keyed on the old `status` field.
      stage: (DEAL_STAGES as readonly string[]).includes(data.stage)
        ? data.stage
        : legacyStatusToStage(data.status),
      createdAt: data.createdAt?.toDate?.() ?? new Date(),
      updatedAt: data.updatedAt?.toDate?.() ?? new Date()
    } as Deal
  }

  /** Actor (current user) for stamping pipeline events. */
  function actor(): { byId: string; byName: string } {
    const session = useSessionStore()
    return { byId: session.currentUser?.email ?? '', byName: session.currentUser?.name ?? '' }
  }

  /** Append a pipeline event to the batch, dropping undefined optional fields. */
  function appendEvent(batch: WriteBatch, ev: NewPipelineEvent) {
    const ref = doc(collection(db, COLLECTIONS.PIPELINE_EVENTS))
    const clean = Object.fromEntries(Object.entries(ev).filter(([, v]) => v !== undefined))
    batch.set(ref, clean)
  }

  // Actions

  /**
   * Subscribe to the deals collection in real time. Idempotent — safe to call from
   * multiple pages; the single listener keeps `deals` in sync across teammates and
   * reflects our own writes instantly (Firestore latency compensation).
   */
  function subscribe() {
    if (unsub) return
    loading.value = true
    error.value = null
    unsub = onSnapshot(
      query(collection(db, COLLECTIONS.DEALS), orderBy('updatedAt', 'desc')),
      snapshot => {
        deals.value = snapshot.docs.map(mapDoc)
        loading.value = false
      },
      err => {
        error.value = 'Failed to load deals'
        loading.value = false
        console.error('Error subscribing to deals:', err)
      }
    )
  }

  function unsubscribe() {
    unsub?.()
    unsub = null
  }

  async function createDeal(payload: NewDeal) {
    try {
      const now = new Date()
      const nowIso = now.toISOString()
      const { byId, byName } = actor()
      const stage = (payload.stage ?? 'New') as DealStage
      const ref = doc(collection(db, COLLECTIONS.DEALS))
      const batch = writeBatch(db)
      batch.set(ref, {
        ...applyRevenueCalc(payload),
        stage,
        stageEnteredAt: nowIso,
        createdAt: now,
        updatedAt: now
      })
      appendEvent(batch, { dealId: ref.id, company: payload.company, type: 'created', to: stage, byId, byName, at: now })
      await batch.commit()
    } catch (err) {
      error.value = 'Failed to create deal'
      console.error('Error creating deal:', err)
      throw err
    }
  }

  async function updateDeal(id: string, patch: Partial<Deal>) {
    try {
      const { id: _omit, createdAt: _c, ...rest } = patch as Partial<Deal> & { status?: unknown }
      delete (rest as { status?: unknown }).status // drop any legacy status coming from a form
      const data: Record<string, any> = applyRevenueCalc(rest)
      const current = deals.value.find(d => d.id === id)
      const prevStage = (current?.stage ?? 'New') as DealStage
      const nextStage = (patch.stage ?? prevStage) as DealStage
      const stageChanged = patch.stage != null && nextStage !== prevStage
      const nowIso = new Date().toISOString()
      if (stageChanged) data.stageEnteredAt = nowIso
      // Reopening a won/lost deal clears its terminal metadata.
      const reopening = stageChanged && isTerminal(prevStage) && !isTerminal(nextStage)
      if (reopening) {
        data.reasonWonLost = deleteField()
        data.actualRevenue = deleteField()
      }
      const batch = writeBatch(db)
      batch.update(doc(db, COLLECTIONS.DEALS, id), { ...data, updatedAt: new Date() })
      if (stageChanged) {
        const { byId, byName } = actor()
        appendEvent(batch, {
          dealId: id,
          company: patch.company ?? current?.company ?? '',
          type: reopening ? 'reopened' : 'stage',
          from: prevStage,
          to: nextStage,
          reason: nextStage === 'Lost' ? patch.reasonWonLost : undefined,
          byId,
          byName,
          at: new Date()
        })
      }
      await batch.commit()
    } catch (err) {
      error.value = 'Failed to update deal'
      console.error('Error updating deal:', err)
      throw err
    }
  }

  function isTerminal(stage: DealStage): boolean {
    return stage === 'Confirmed' || stage === 'Lost'
  }

  /**
   * Move a deal to a new stage (Kanban drag) with an optimistic local update.
   * Writes the deal doc and appends a pipeline event atomically. Terminal moves
   * (→ Confirmed / → Lost) go through moveToWon / moveToLost instead so they can
   * capture the booked value / lost reason.
   */
  async function moveStage(id: string, stage: DealStage) {
    const local = deals.value.find(d => d.id === id)
    const prev = (local?.stage ?? 'New') as DealStage
    if (prev === stage) return
    const prevEntered = local?.stageEnteredAt
    const prevReason = local?.reasonWonLost
    const prevActual = local?.actualRevenue
    const nowIso = new Date().toISOString()
    const reopening = isTerminal(prev) && !isTerminal(stage)
    if (local) {
      local.stage = stage
      local.stageEnteredAt = nowIso
      if (reopening) {
        local.reasonWonLost = undefined
        local.actualRevenue = undefined
      }
    }
    try {
      const { byId, byName } = actor()
      const update: Record<string, any> = { stage, stageEnteredAt: nowIso, updatedAt: new Date() }
      if (reopening) {
        update.reasonWonLost = deleteField()
        update.actualRevenue = deleteField()
      }
      const batch = writeBatch(db)
      batch.update(doc(db, COLLECTIONS.DEALS, id), update)
      appendEvent(batch, {
        dealId: id,
        company: local?.company ?? '',
        type: reopening ? 'reopened' : 'stage',
        from: prev,
        to: stage,
        byId,
        byName,
        at: new Date()
      })
      await batch.commit()
    } catch (err) {
      if (local) {
        local.stage = prev // revert on failure
        local.stageEnteredAt = prevEntered
        local.reasonWonLost = prevReason
        local.actualRevenue = prevActual
      }
      error.value = 'Failed to move deal'
      console.error('Error moving stage:', err)
      throw err
    }
  }

  /** Move a deal to Lost, capturing the reason (+ optional note appended to notes). */
  async function moveToLost(id: string, reason: string, note?: string) {
    const local = deals.value.find(d => d.id === id)
    const prev = (local?.stage ?? 'New') as DealStage
    const prevEntered = local?.stageEnteredAt
    const prevReason = local?.reasonWonLost
    const prevNotes = local?.notes
    const nowIso = new Date().toISOString()
    const mergedNotes = note ? [local?.notes, note].filter(Boolean).join('\n') : local?.notes
    if (local) {
      local.stage = 'Lost'
      local.stageEnteredAt = nowIso
      local.reasonWonLost = reason
      if (note) local.notes = mergedNotes
    }
    try {
      const { byId, byName } = actor()
      const update: Record<string, any> = {
        stage: 'Lost',
        stageEnteredAt: nowIso,
        reasonWonLost: reason,
        updatedAt: new Date()
      }
      if (note) update.notes = mergedNotes
      const batch = writeBatch(db)
      batch.update(doc(db, COLLECTIONS.DEALS, id), update)
      appendEvent(batch, {
        dealId: id,
        company: local?.company ?? '',
        type: 'stage',
        from: prev,
        to: 'Lost',
        reason,
        valueAtChange: local?.totalRevenue,
        byId,
        byName,
        at: new Date()
      })
      await batch.commit()
    } catch (err) {
      if (local) {
        local.stage = prev
        local.stageEnteredAt = prevEntered
        local.reasonWonLost = prevReason
        local.notes = prevNotes
      }
      error.value = 'Failed to move deal'
      console.error('Error moving to Lost:', err)
      throw err
    }
  }

  /** Move a deal to Confirmed (won), capturing the actual booked revenue. */
  async function moveToWon(id: string, actualRevenue?: number) {
    const local = deals.value.find(d => d.id === id)
    const prev = (local?.stage ?? 'New') as DealStage
    const prevEntered = local?.stageEnteredAt
    const prevActual = local?.actualRevenue
    const nowIso = new Date().toISOString()
    if (local) {
      local.stage = 'Confirmed'
      local.stageEnteredAt = nowIso
      local.actualRevenue = actualRevenue
    }
    try {
      const { byId, byName } = actor()
      const update: Record<string, any> = {
        stage: 'Confirmed',
        stageEnteredAt: nowIso,
        updatedAt: new Date()
      }
      update.actualRevenue = actualRevenue == null ? deleteField() : actualRevenue
      const batch = writeBatch(db)
      batch.update(doc(db, COLLECTIONS.DEALS, id), update)
      appendEvent(batch, {
        dealId: id,
        company: local?.company ?? '',
        type: 'stage',
        from: prev,
        to: 'Confirmed',
        valueAtChange: actualRevenue ?? local?.totalRevenue,
        byId,
        byName,
        at: new Date()
      })
      await batch.commit()
    } catch (err) {
      if (local) {
        local.stage = prev
        local.stageEnteredAt = prevEntered
        local.actualRevenue = prevActual
      }
      error.value = 'Failed to move deal'
      console.error('Error moving to Won:', err)
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
    error,
    comments,
    commentsLoading,
    // Computed
    totalPipelineValue,
    // Actions
    subscribe,
    unsubscribe,
    createDeal,
    updateDeal,
    moveStage,
    moveToLost,
    moveToWon,
    deleteDeal,
    loadComments,
    addComment,
    deleteComment
  }
})
