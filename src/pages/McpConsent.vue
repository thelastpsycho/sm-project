<template>
  <main class="mx-auto max-w-lg px-6 py-12">
    <h1 class="sm-display text-3xl">Connect an MCP client</h1>
    <p v-if="error" class="mt-4 text-sm text-sm-bad" role="alert">{{ error }}</p>
    <p v-if="loading" class="mt-4 text-sm text-sm-muted" role="status">Loading connection request…</p>
    <template v-if="details">
      <p class="mt-4 text-sm text-sm-muted">
        <strong>{{ details.clientName }}</strong> wants to connect to The ANVAYA Sales Management app
        as <strong>{{ details.email }}</strong>. The client can read or update data through MCP tools
        according to your role.
      </p>
      <p class="mt-3 break-all text-sm text-sm-muted">
        The client will receive the authorization response at <strong>{{ details.redirectUri }}</strong>.
        Allow access only if you recognize this address and started the connection.
      </p>
      <div class="mt-6 flex flex-wrap gap-3">
        <SmButton :disabled="saving" @click="decide('approve')">Allow access</SmButton>
        <SmButton variant="secondary" :disabled="saving" @click="decide('deny')">Cancel</SmButton>
      </div>
    </template>
  </main>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import SmButton from '@/components/ui/SmButton.vue'
import { auth } from '@/lib/firebase'
import { isMcpRequest } from '@/lib/mcpApi'

const route = useRoute()
const request = route.query.request
const details = ref<{ clientName: string; redirectUri: string; email: string }>()
const error = ref('')
const loading = ref(true)
const saving = ref(false)
const user = auth.currentUser

async function send(action: 'inspect' | 'approve' | 'deny') {
  if (!user || user.uid !== auth.currentUser?.uid) throw new Error('Sign in again and restart the connection.')
  const response = await fetch('/api/mcp?oauthRoute=consent', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + await user.getIdToken(),
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ action, request })
  })
  const body = await response.json()
  if (!response.ok) {
    throw new Error(body.error_description || 'This connection request is unavailable. Restart it from your MCP client.')
  }
  return body
}

onMounted(async () => {
  try {
    if (!isMcpRequest(request)) {
      throw new Error('This connection request is invalid. Restart it from your MCP client.')
    }
    details.value = await send('inspect')
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Could not load the connection request.'
  } finally {
    loading.value = false
  }
})

async function decide(action: 'approve' | 'deny') {
  if (saving.value) return
  error.value = ''
  saving.value = true
  try {
    const { redirect } = await send(action)
    window.location.replace(redirect)
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Could not submit your decision.'
    saving.value = false
  }
}
</script>
