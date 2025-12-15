import { computed } from 'vue'
import { useChatStore } from '@/stores/chat'
import { useSession } from './useSession'

export function useChat() {
  const chatStore = useChatStore()
  const { ensureSession } = useSession()

  const messages = computed(() => chatStore.messages)
  const isSending = computed(() => chatStore.isSending)
  const pendingCount = computed(() => chatStore.pendingCount)

  const sendMessage = async (text: string) => {
    const sessionId = ensureSession()
    await chatStore.sendMessage(sessionId, text)
  }

  const retryPending = () => {
    chatStore.retryPending()
  }

  const clearMessages = () => {
    chatStore.clearMessages()
  }

  return {
    messages,
    isSending,
    pendingCount,
    sendMessage,
    retryPending,
    clearMessages
  }
}