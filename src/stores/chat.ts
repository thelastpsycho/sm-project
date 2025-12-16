import { defineStore } from 'pinia'
import { ref, computed, toRaw } from 'vue'
import type { Message, OutboxItem } from '@/types/chat'
import { postChat } from '@/utils/api'
import { scheduleRetry } from '@/utils/offline'
import localForage from 'localforage'

const CHAT_STORAGE_KEY = 'chat.messages'
const OUTBOX_STORAGE_KEY = 'chat.outbox'

export const useChatStore = defineStore('chat', () => {
  const messages = ref<Message[]>([])
  const outbox = ref<OutboxItem[]>([])
  const isSending = ref(false)

  const pendingCount = computed(() => outbox.value.length)

  const loadFromStorage = async () => {
    try {
      const storedMessages = await localForage.getItem<Message[]>(CHAT_STORAGE_KEY)
      const storedOutbox = await localForage.getItem<OutboxItem[]>(OUTBOX_STORAGE_KEY)

      if (storedMessages) {
        messages.value = storedMessages
      }

      if (storedOutbox) {
        outbox.value = storedOutbox
      }
    } catch (error) {
      console.error('Failed to load chat data from storage:', error)
    }
  }

  const persistToStorage = async () => {
    try {
      await localForage.setItem(CHAT_STORAGE_KEY, toRaw(messages.value))
      await localForage.setItem(OUTBOX_STORAGE_KEY, toRaw(outbox.value))
    } catch (error) {
      console.error('Failed to persist chat data to storage:', error)
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

          const response = await postChat({
            sessionId: item.sessionId,
            text: item.text
          })

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

    const responseMessage = serverResponse?.output?.message || serverResponse?.message

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
    sendMessage,
    retryPending,
    clearMessages
  }
})