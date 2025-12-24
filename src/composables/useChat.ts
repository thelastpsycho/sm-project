import { computed } from 'vue'
import { useChatStore } from '@/stores/chat'
import { useSession } from './useSession'

export function useChat() {
  const chatStore = useChatStore()
  const { ensureSession } = useSession()

  const messages = computed(() => chatStore.messages)
  const isSending = computed(() => chatStore.isSending)
  const pendingCount = computed(() => chatStore.pendingCount)
  const activeAgent = computed(() => chatStore.activeAgent)
  const availableAgents = computed(() => chatStore.availableAgents)

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

  const setAgent = (agentId: any) => {
    chatStore.setAgent(agentId)
  }

  return {
    messages,
    isSending,
    pendingCount,
    activeAgent,
    availableAgents,
    setAgent,
    sendMessage,
    retryPending,
    clearMessages
  }
}