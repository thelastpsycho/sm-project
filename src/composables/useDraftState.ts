import { computed, ref, type Ref } from 'vue'

/** Acknowledge the exact saved snapshot, never edits made while a save is in flight. */
export function useDraftState<T>(form: Ref<T>) {
  const baseline = ref(JSON.stringify(form.value))
  const savedAt = ref<Date | null>(null)
  const dirty = computed(() => JSON.stringify(form.value) !== baseline.value)
  function markSaved(snapshot: string, at: Date | null = new Date()) {
    baseline.value = snapshot
    savedAt.value = at
  }
  return { dirty, savedAt, markSaved }
}
