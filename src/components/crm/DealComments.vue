<template>
  <div class="space-y-3">
    <div class="flex items-center gap-2">
      <ChatBubbleLeftRightIcon class="w-4 h-4 text-gray-400" />
      <h4 class="text-sm font-semibold text-gray-700 dark:text-gray-200">
        Comments
        <span v-if="list.length" class="text-gray-400 font-normal">({{ list.length }})</span>
      </h4>
    </div>

    <!-- Thread -->
    <div v-if="store.commentsLoading && !list.length" class="text-xs text-gray-400 py-2">
      Loading comments…
    </div>
    <div v-else-if="list.length === 0" class="text-xs text-gray-400 py-2">
      No comments yet. Be the first to add one.
    </div>
    <ul v-else class="space-y-3">
      <li v-for="c in list" :key="c.id" class="flex gap-2.5">
        <div
          class="shrink-0 w-8 h-8 rounded-full bg-sm-primary/10 text-sm-primary flex items-center justify-center text-xs font-semibold"
        >
          {{ initials(c.authorName) }}
        </div>
        <div class="min-w-0 flex-1">
          <div class="flex items-baseline gap-2">
            <span class="text-sm font-medium text-gray-900 dark:text-white truncate">
              {{ c.authorName || 'Unknown' }}
            </span>
            <span class="text-[11px] text-gray-400 shrink-0">{{ relativeTime(c.createdAt) }}</span>
            <button
              v-if="canDelete(c)"
              type="button"
              class="ml-auto text-gray-300 hover:text-red-500 transition-colors shrink-0"
              title="Delete comment"
              @click="onDelete(c.id)"
            >
              <TrashIcon class="w-3.5 h-3.5" />
            </button>
          </div>
          <p class="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words">
            {{ c.text }}
          </p>
        </div>
      </li>
    </ul>

    <!-- Composer -->
    <div class="flex items-end gap-2 pt-1">
      <textarea
        v-model="draft"
        rows="1"
        placeholder="Add a comment…"
        class="flex-1 resize-none rounded-xl bg-gray-50 dark:bg-gray-800 border-0 ring-1 ring-gray-200 dark:ring-gray-700 text-sm text-gray-900 dark:text-white placeholder-gray-400 px-3 py-2 focus:ring-2 focus:ring-sm-primary"
        @keydown.enter.exact.prevent="submit"
      ></textarea>
      <SmButton size="sm" :loading="posting" :disabled="!draft.trim()" @click="submit">
        Post
      </SmButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { ChatBubbleLeftRightIcon, TrashIcon } from '@heroicons/vue/24/outline'
import SmButton from '@/components/ui/SmButton.vue'
import { useCrmStore } from '@/stores/crm'
import { useSessionStore } from '@/stores/session'
import type { DealComment } from '@/types/crm'

const props = defineProps<{ dealId: string }>()

const store = useCrmStore()
const session = useSessionStore()

const draft = ref('')
const posting = ref(false)

const list = computed<DealComment[]>(() => store.comments[props.dealId] ?? [])

function load() {
  if (props.dealId) store.loadComments(props.dealId)
}
onMounted(load)
watch(() => props.dealId, load)

async function submit() {
  const text = draft.value.trim()
  if (!text || posting.value) return
  posting.value = true
  try {
    await store.addComment(props.dealId, {
      authorId: session.currentUser?.email ?? '',
      authorName: session.currentUser?.name ?? 'Unknown',
      text
    })
    draft.value = ''
  } finally {
    posting.value = false
  }
}

function canDelete(c: DealComment): boolean {
  const email = session.currentUser?.email
  return !!email && c.authorId === email
}

async function onDelete(id: string) {
  await store.deleteComment(props.dealId, id)
}

function initials(name?: string): string {
  if (!name) return '?'
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() ?? '')
    .join('')
}

function relativeTime(date: Date): string {
  const d = date instanceof Date ? date : new Date(date)
  const diff = Date.now() - d.getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'just now'
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  const day = Math.floor(hr / 24)
  if (day < 7) return `${day}d ago`
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}
</script>
