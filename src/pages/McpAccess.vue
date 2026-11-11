<template>
  <div class="min-h-screen bg-white dark:bg-sm-bg-dark">
    <div class="max-w-[900px] mx-auto lg:mx-0 px-6 lg:px-12 pt-10 lg:pt-9 pb-32">
      <div class="flex items-end justify-between gap-4 mb-6">
        <div>
          <span class="sm-eyebrow">Integrations</span>
          <h1 class="sm-display text-display mt-2">MCP Access</h1>
        </div>
        <SmButton size="sm" @click="openCreate">
          <PlusIcon class="w-4 h-4 mr-1" /> New key
        </SmButton>
      </div>

      <p class="text-sm text-sm-muted max-w-[640px]">
        Connect this app's CRM, Function Chart, and Survey data to Claude Code, Claude
        Desktop, Cursor, or any other MCP-capable client. A key carries your own
        account's role and permissions — it sees and can do exactly what you can in the
        app.
      </p>

      <!-- Connection snippet -->
      <div class="mt-5 rounded-2xl border border-sm-line dark:border-white/10 p-4">
        <p class="sm-eyebrow mb-2">Server URL</p>
        <div class="flex items-center gap-2">
          <code class="flex-1 min-w-0 truncate text-sm text-sm-ink dark:text-white bg-sm-surface dark:bg-white/5 rounded-lg px-3 py-2">{{ serverUrl }}</code>
          <button
            type="button"
            class="p-2 rounded-full text-sm-muted hover:text-sm-ink dark:hover:text-white hover:bg-sm-surface dark:hover:bg-white/5 transition-colors shrink-0"
            title="Copy server URL"
            @click="copy(serverUrl, 'url')"
          >
            <component :is="copiedId === 'url' ? CheckIcon : ClipboardDocumentIcon" class="w-4 h-4" />
          </button>
        </div>
        <p class="text-xs text-sm-faint mt-3">
          Register it with Claude Code using a key from below:
        </p>
        <div class="flex items-center gap-2 mt-1">
          <code class="flex-1 min-w-0 truncate text-xs text-sm-muted bg-sm-surface dark:bg-white/5 rounded-lg px-3 py-2">{{ sampleCommand }}</code>
          <button
            type="button"
            class="p-2 rounded-full text-sm-muted hover:text-sm-ink dark:hover:text-white hover:bg-sm-surface dark:hover:bg-white/5 transition-colors shrink-0"
            title="Copy command"
            @click="copy(sampleCommand, 'cmd')"
          >
            <component :is="copiedId === 'cmd' ? CheckIcon : ClipboardDocumentIcon" class="w-4 h-4" />
          </button>
        </div>
      </div>

      <p v-if="listError" class="mt-4 text-xs text-sm-bad">{{ listError }}</p>

      <div v-if="loading" class="text-center py-16 text-sm-faint">Loading…</div>

      <div v-else-if="keys.length === 0" class="text-center py-16 text-sm-faint text-sm">
        No API keys yet. Create one to connect an MCP client.
      </div>

      <div v-else class="mt-6">
        <div class="hidden lg:flex items-center gap-3 px-1 py-3 border-b border-sm-line dark:border-white/10 sm-eyebrow">
          <span class="flex-[1.6]">Label</span>
          <span class="flex-[1.2]">Created</span>
          <span class="flex-[1.2]">Last used</span>
          <span class="flex-[0.9] text-right">Status</span>
          <span class="w-[56px]"></span>
        </div>

        <div
          v-for="k in keys"
          :key="k.keyId"
          class="flex items-center gap-3 px-1 py-3.5 border-b border-sm-hair dark:border-white/5"
          :class="{ 'opacity-50': k.revoked }"
        >
          <div class="min-w-0 flex-1 lg:flex-[1.6]">
            <p class="text-smd font-bold text-sm-ink dark:text-white truncate">{{ k.label || 'Unlabeled key' }}</p>
            <p class="lg:hidden text-xs text-sm-muted">
              {{ formatDate(k.createdAt) }} · {{ k.lastUsedAt ? formatDate(k.lastUsedAt) : 'Never used' }}
            </p>
          </div>
          <span class="hidden lg:block flex-[1.2] text-sm text-sm-ink-soft dark:text-gray-300">{{ formatDate(k.createdAt) }}</span>
          <span class="hidden lg:block flex-[1.2] text-sm text-sm-ink-soft dark:text-gray-300">{{ k.lastUsedAt ? formatDate(k.lastUsedAt) : 'Never used' }}</span>
          <span
            class="hidden lg:block flex-[0.9] text-right text-eyebrow font-bold uppercase tracking-[0.06em]"
            :class="k.revoked ? 'text-sm-faint' : 'text-sm-won'"
            >{{ k.revoked ? 'Revoked' : 'Active' }}</span
          >
          <div class="flex items-center shrink-0 w-[56px] justify-end">
            <button
              v-if="!k.revoked"
              type="button"
              class="p-2 rounded-full text-sm-bad hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              title="Revoke"
              @click="askRevoke(k)"
            >
              <NoSymbolIcon class="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Create key modal -->
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div v-if="createModalOpen" class="fixed inset-0 z-[60] flex items-center justify-center p-4">
        <div class="fixed inset-0 bg-sm-ink/30 backdrop-blur-[2px]" @click="createModalOpen = false"></div>
        <div class="relative bg-white dark:bg-sm-card-dark w-full max-w-md rounded-3xl shadow-2xl p-6 animate-fade-in-up">
          <h3 class="text-lg font-extrabold tracking-[-0.01em] text-sm-ink dark:text-white mb-1">New MCP key</h3>
          <p class="text-xs text-sm-muted mb-4">
            Give it a label so you can tell devices apart later (e.g. "laptop", "work desktop").
          </p>
          <form class="space-y-4" @submit.prevent="onCreate">
            <SmInput v-model="newLabel" label="Label" placeholder="e.g. laptop" />
            <p v-if="createError" class="text-xs text-sm-bad">{{ createError }}</p>
            <div class="flex justify-end gap-2 pt-1">
              <SmButton type="button" variant="ghost" @click="createModalOpen = false">Cancel</SmButton>
              <SmButton type="submit" :loading="creating">Create key</SmButton>
            </div>
          </form>
        </div>
      </div>
    </Transition>

    <!-- Reveal-once modal -->
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div v-if="revealedKey" class="fixed inset-0 z-[60] flex items-center justify-center p-4">
        <div class="fixed inset-0 bg-sm-ink/30 backdrop-blur-[2px]"></div>
        <div class="relative bg-white dark:bg-sm-card-dark w-full max-w-lg rounded-3xl shadow-2xl p-6 animate-fade-in-up">
          <h3 class="text-lg font-extrabold tracking-[-0.01em] text-sm-ink dark:text-white mb-1">Your new key</h3>
          <p class="text-xs text-sm-bad font-semibold mb-4">
            Copy it now — it won't be shown again.
          </p>
          <div class="flex items-center gap-2">
            <code class="flex-1 min-w-0 break-all text-xs text-sm-ink dark:text-white bg-sm-surface dark:bg-white/5 rounded-lg px-3 py-2">{{ revealedKey }}</code>
            <button
              type="button"
              class="p-2 rounded-full text-sm-muted hover:text-sm-ink dark:hover:text-white hover:bg-sm-surface dark:hover:bg-white/5 transition-colors shrink-0"
              title="Copy key"
              @click="copy(revealedKey!, 'reveal')"
            >
              <component :is="copiedId === 'reveal' ? CheckIcon : ClipboardDocumentIcon" class="w-4 h-4" />
            </button>
          </div>

          <p class="text-xs text-sm-faint mt-4 mb-1">Register it with Claude Code:</p>
          <div class="flex items-center gap-2">
            <code class="flex-1 min-w-0 break-all text-xs text-sm-muted bg-sm-surface dark:bg-white/5 rounded-lg px-3 py-2">{{ revealedCommand }}</code>
            <button
              type="button"
              class="p-2 rounded-full text-sm-muted hover:text-sm-ink dark:hover:text-white hover:bg-sm-surface dark:hover:bg-white/5 transition-colors shrink-0"
              title="Copy command"
              @click="copy(revealedCommand, 'revealCmd')"
            >
              <component :is="copiedId === 'revealCmd' ? CheckIcon : ClipboardDocumentIcon" class="w-4 h-4" />
            </button>
          </div>

          <div class="flex justify-end pt-5">
            <SmButton @click="dismissReveal">Done</SmButton>
          </div>
        </div>
      </div>
    </Transition>

    <ConfirmDialog
      :open="confirm.open"
      :title="confirm.title"
      :message="confirm.message"
      confirm-text="Revoke"
      danger
      :loading="confirm.loading"
      @confirm="confirm.action"
      @cancel="confirm.open = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, reactive } from 'vue'
import { PlusIcon, NoSymbolIcon, ClipboardDocumentIcon, CheckIcon } from '@heroicons/vue/24/outline'
import SmButton from '@/components/ui/SmButton.vue'
import SmInput from '@/components/ui/SmInput.vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import { mcpKeysApi, type McpKeySummary } from '@/lib/mcpApi'
import { useHead } from '@vueuse/head'

useHead({
  title: 'MCP Access',
  meta: [
    {
      name: 'description',
      content: 'Manage personal API keys for connecting AI clients (Claude Code, Claude Desktop, Cursor) to this app via MCP.'
    }
  ]
})

const serverUrl = computed(() => `${window.location.origin}/api/mcp`)
const sampleCommand = computed(
  () => `claude mcp add --transport http sm-anvaya ${serverUrl.value} --header "Authorization: Bearer <your-key>"`
)

const keys = ref<McpKeySummary[]>([])
const loading = ref(false)
const listError = ref('')

async function loadKeys() {
  loading.value = true
  listError.value = ''
  try {
    const data = await mcpKeysApi('list')
    keys.value = data.keys ?? []
  } catch (err: any) {
    listError.value = err?.message ?? 'Could not load keys.'
  } finally {
    loading.value = false
  }
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

const copiedId = ref<string | null>(null)
function copy(text: string, id: string) {
  navigator.clipboard
    .writeText(text)
    .then(() => {
      copiedId.value = id
      setTimeout(() => {
        if (copiedId.value === id) copiedId.value = null
      }, 2000)
    })
    .catch(() => {})
}

// ---- Create ----
const createModalOpen = ref(false)
const newLabel = ref('')
const creating = ref(false)
const createError = ref('')
const revealedKey = ref<string | null>(null)
const revealedCommand = computed(
  () => `claude mcp add --transport http sm-anvaya ${serverUrl.value} --header "Authorization: Bearer ${revealedKey.value}"`
)

function openCreate() {
  newLabel.value = ''
  createError.value = ''
  createModalOpen.value = true
}

async function onCreate() {
  createError.value = ''
  creating.value = true
  try {
    const data = await mcpKeysApi('create', { label: newLabel.value })
    revealedKey.value = data.apiKey
    createModalOpen.value = false
    await loadKeys()
  } catch (err: any) {
    createError.value = err?.message ?? 'Could not create key.'
  } finally {
    creating.value = false
  }
}

function dismissReveal() {
  revealedKey.value = null
  copiedId.value = null
}

// ---- Revoke ----
const confirm = reactive({
  open: false,
  title: '',
  message: '',
  loading: false,
  action: async () => {}
})

function askRevoke(k: McpKeySummary) {
  confirm.title = `Revoke “${k.label || 'this key'}”?`
  confirm.message = 'Any client using this key will immediately lose access. This can\'t be undone.'
  confirm.action = async () => {
    confirm.loading = true
    listError.value = ''
    try {
      await mcpKeysApi('revoke', { keyId: k.keyId })
      await loadKeys()
      confirm.open = false
    } catch (err: any) {
      listError.value = err?.message ?? 'Could not revoke key.'
    } finally {
      confirm.loading = false
    }
  }
  confirm.open = true
}

onMounted(loadKeys)
</script>
