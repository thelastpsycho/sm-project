import { defineStore } from 'pinia'
import { ref, computed, toRaw } from 'vue'
import type { Message, OutboxItem, AgentId, AgentConfig } from '@/types/chat'
import { postChat } from '@/utils/api'
import { scheduleRetry } from '@/utils/offline'
import localForage from 'localforage'

const CHAT_STORAGE_KEY = 'chat.messages'
const OUTBOX_STORAGE_KEY = 'chat.outbox'
const ACTIVE_AGENT_KEY = 'chat.activeAgent'

const AGENTS: Record<AgentId, AgentConfig> = {
  general: {
    id: 'general',
    name: 'General',
    disabled: true,
    webhookUrl: 'https://workflow.anvayabali.com/webhook/f9d94d1b-aa15-4b76-8326-b83d9b49e609',
    payloadAdapter: (text, sessionId) => ({ text, sessionId })
  },
  rate: {
    id: 'rate',
    name: 'Rate',
    webhookUrl: 'https://workflow.anvayabali.com/webhook/1828a9f4-5ec3-4fc6-9ce9-2a10f09d71a9',
    payloadAdapter: (text, sessionId) => ({
      message: {
        text,
        from: {
          id: sessionId
        }
      }
    })
  },
  forecast: {
    id: 'forecast',
    name: 'Forecast',
    disabled: true,
    webhookUrl: '', // To be configured
    payloadAdapter: (text, sessionId) => ({ text, sessionId })
  }
}

export const useChatStore = defineStore('chat', () => {
  const messages = ref<Message[]>([])
  const outbox = ref<OutboxItem[]>([])
  const isSending = ref(false)
  const activeAgentId = ref<AgentId>('rate')

  const pendingCount = computed(() => outbox.value.length)
  const activeAgent = computed(() => AGENTS[activeAgentId.value])
  const availableAgents = computed(() => Object.values(AGENTS))

  const loadFromStorage = async () => {
    try {
      const storedMessages = await localForage.getItem<Message[]>(CHAT_STORAGE_KEY)
      const storedOutbox = await localForage.getItem<OutboxItem[]>(OUTBOX_STORAGE_KEY)
      const storedAgentId = await localForage.getItem<AgentId>(ACTIVE_AGENT_KEY)

      if (storedMessages) {
        messages.value = storedMessages
      }

      if (storedOutbox) {
        outbox.value = storedOutbox
      }

      if (storedAgentId && AGENTS[storedAgentId]) {
        activeAgentId.value = storedAgentId
      }
    } catch (error) {
      console.error('Failed to load chat data from storage:', error)
    }
  }

  const persistToStorage = async () => {
    try {
      await localForage.setItem(CHAT_STORAGE_KEY, toRaw(messages.value))
      await localForage.setItem(OUTBOX_STORAGE_KEY, toRaw(outbox.value))
      await localForage.setItem(ACTIVE_AGENT_KEY, toRaw(activeAgentId.value))
    } catch (error) {
      console.error('Failed to persist chat data to storage:', error)
    }
  }

  const setAgent = (agentId: AgentId) => {
    if (AGENTS[agentId]) {
      activeAgentId.value = agentId
      persistToStorage()
    }
  }

  const sendMessage = async (sessionId: string, text: string) => {
    const messageId = crypto.randomUUID()
    const userMessage: Message = {
      id: messageId,
      sessionId,
      text,
      sender: 'user',
      timestamp: Date.now(),
      status: 'sending'
    }

    messages.value.push(userMessage)
    await persistToStorage()

    const outboxItem: OutboxItem = {
      id: crypto.randomUUID(),
      sessionId,
      text,
      createdAt: Date.now(),
      attempts: 0
    }

    outbox.value.push(outboxItem)
    await persistToStorage()

    deliver()
  }

  const deliver = async () => {
    if (isSending.value || outbox.value.length === 0) return

    isSending.value = true

    try {
      const itemsToSend = [...outbox.value]

      for (const item of itemsToSend) {
        try {
          item.attempts++

          // Use the active agent configuration for delivery
          // Note: In a real multi-agent system, we might want to store the agentId with the message
          // so that retries use the correct agent even if the user switches agents.
          // For now, we assume the user stays on the same agent or we use the currently active one.
          // Better approach: Store agentId in OutboxItem.
          // However, for this iteration, using activeAgent is acceptable as per plan.

          // Using optional chaining or explicit check
          if (!activeAgent.value) {
            console.error('No active agent configured')
            throw new Error('No active agent')
          }

          const response = await postChat(activeAgent.value, item.text, item.sessionId)

          handleDeliverySuccess(item.id, response)
        } catch (error) {
          console.error('Failed to deliver message:', error)

          if (item.attempts >= 5) {
            handleDeliveryFailure(item.id)
          } else {
            const delay = scheduleRetry(item.attempts)
            setTimeout(() => deliver(), delay)
          }
        }
      }
    } finally {
      isSending.value = false
    }
  }

  const handleDeliverySuccess = (outboxItemId: string, serverResponse: any) => {
    const outboxIndex = outbox.value.findIndex(item => item.id === outboxItemId)
    if (outboxIndex === -1) return

    const outboxItem = outbox.value[outboxIndex]

    const messageIndex = messages.value.findIndex(
      msg => outboxItem &&
        msg.sessionId === outboxItem.sessionId &&
        msg.text === outboxItem.text &&
        msg.sender === 'user' &&
        msg.status === 'sending'
    )

    if (messageIndex !== -1 && messages.value[messageIndex]) {
      messages.value[messageIndex].status = 'sent'
    }

    let responseMessage = serverResponse?.output?.message || serverResponse?.message

    // Handle nested stringified JSON case (e.g. Rate Agent)
    if (!responseMessage && typeof serverResponse?.output === 'string') {
      try {
        const parsedOutput = JSON.parse(serverResponse.output)
        responseMessage = parsedOutput.Message || parsedOutput.message
      } catch (e) {
        console.warn('Failed to parse output string:', e)
      }
    }

    if (responseMessage && outboxItem) {
      const botMessage: Message = {
        id: crypto.randomUUID(),
        sessionId: outboxItem.sessionId,
        text: responseMessage,
        sender: 'bot',
        timestamp: Date.now(),
        status: 'sent'
      }
      messages.value.push(botMessage)
    }

    outbox.value.splice(outboxIndex, 1)
    persistToStorage()
  }

  const handleDeliveryFailure = (outboxItemId: string) => {
    const outboxIndex = outbox.value.findIndex(item => item.id === outboxItemId)
    if (outboxIndex === -1) return

    const outboxItem = outbox.value[outboxIndex]

    const messageIndex = messages.value.findIndex(
      msg => outboxItem &&
        msg.sessionId === outboxItem.sessionId &&
        msg.text === outboxItem.text &&
        msg.sender === 'user'
    )

    if (messageIndex !== -1 && messages.value[messageIndex]) {
      messages.value[messageIndex].status = 'failed'
    }

    outbox.value.splice(outboxIndex, 1)
    persistToStorage()
  }

  const retryPending = () => {
    if (outbox.value.length > 0 && !isSending.value) {
      deliver()
    }
  }

  const clearMessages = () => {
    messages.value = []
    outbox.value = []
    persistToStorage()
  }

  loadFromStorage()

  window.addEventListener('online', retryPending)

  return {
    messages,
    outbox,
    isSending,
    pendingCount,
    activeAgent,
    availableAgents,
    setAgent,
    sendMessage,
    retryPending,
    clearMessages
  }
})