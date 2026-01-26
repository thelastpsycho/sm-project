<template>
  <div class="flex flex-col h-screen bg-sm-bg dark:bg-sm-bg-dark">
    <!-- Header -->
    <div class="px-4 py-3 bg-white/80 dark:bg-sm-card-dark/80 backdrop-blur-xl border-b border-gray-200 dark:border-white/10 flex items-center justify-between sticky top-0 z-30 safe-area-top">
      <div class="flex items-center space-x-3">
        <router-link to="/" class="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">
          <ChevronLeftIcon class="w-6 h-6 text-sm-primary" />
        </router-link>
        <div>
          <div class="flex items-center gap-2">
            <h1 class="font-semibold text-gray-900 dark:text-white">Chat</h1>
            <div class="relative">
              <select
                :value="activeAgent?.id"
                @change="(e: Event) => {
                  const val = (e.target as HTMLSelectElement).value as any;
                  const agent = availableAgents.find((a: any) => a.id === val);
                  if (agent && !agent.disabled) setAgent(val);
                }"
                class="appearance-none bg-gray-100 dark:bg-white/10 text-xs font-medium px-2 py-1 pr-6 rounded-lg text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-sm-primary border-none cursor-pointer"
              >
                <option 
                  v-for="agent in availableAgents" 
                  :key="agent.id" 
                  :value="agent.id"
                  :disabled="agent.disabled"
                  :class="{ 'opacity-50 text-gray-400': agent.disabled }"
                >
                  {{ agent.name }}{{ agent.disabled ? ' (Coming Soon)' : '' }}
                </option>
              </select>
              <div class="absolute inset-y-0 right-0 flex items-center px-1 pointer-events-none">
                <svg class="w-3 h-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>
          <p class="text-xs text-green-500 flex items-center mt-0.5">
            <span class="w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5"></span>
            Online
          </p>
        </div>
      </div>
      <div v-if="pendingCount > 0" class="px-2 py-1 rounded-full bg-orange-100 text-orange-600 text-xs font-medium">
        {{ pendingCount }} pending
      </div>
    </div>

    <!-- Messages -->
    <div 
      ref="messagesContainer" 
      class="flex-1 overflow-y-auto p-4 space-y-6 pb-32 scroll-smooth"
    >
      <div v-if="messages.length === 0" class="flex flex-col items-center justify-center h-full text-center p-8 opacity-50">
        <div class="w-16 h-16 bg-gray-200 dark:bg-white/10 rounded-full flex items-center justify-center mb-4">
          <ChatBubbleLeftRightIcon class="w-8 h-8 text-gray-400" />
        </div>
        <p class="text-gray-500">No messages yet</p>
      </div>

      <div
        v-for="(group, index) in groupedMessages"
        :key="index"
        class="space-y-1"
      >
        <!-- Date Separator (Optional logic could go here) -->
        
        <div 
          v-for="message in group" 
          :key="message.id"
          class="flex w-full"
          :class="message.sender === 'user' ? 'justify-end' : 'justify-start'"
        >
          <div 
            class="max-w-[80%] rounded-2xl px-4 py-2.5 shadow-sm relative group transition-all"
            :class="[
              message.sender === 'user' 
                ? 'bg-sm-primary text-white rounded-br-sm' 
                : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-bl-sm border border-gray-100 dark:border-white/5'
            ]"
          >
            <p class="text-[15px] leading-relaxed">{{ message.text }}</p>
            
            <div 
              class="flex items-center justify-end space-x-1 mt-1 text-[10px]"
              :class="message.sender === 'user' ? 'text-white/70' : 'text-gray-400'"
            >
              <span>{{ formatTime(message.timestamp) }}</span>
              <span v-if="message.status === 'sending'">• Sending</span>
              <span v-if="message.status === 'failed'" class="text-red-300 dark:text-red-400">• Failed</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Input Area -->
    <div class="p-4 bg-white/80 dark:bg-sm-card-dark/80 backdrop-blur-xl border-t border-gray-200 dark:border-white/10 pb-8 safe-area-bottom sticky bottom-0 z-40">
      <form @submit.prevent="handleSendMessage" class="flex items-end space-x-2">
        <div class="flex-1 bg-gray-100 dark:bg-black/20 rounded-2xl p-1 flex items-center border border-transparent focus-within:border-sm-primary/50 focus-within:bg-white dark:focus-within:bg-black/40 transition-all">
          <input
            v-model="newMessage"
            type="text"
            placeholder="iMessage..."
            class="flex-1 bg-transparent border-none focus:ring-0 px-4 py-2.5 text-gray-900 dark:text-white placeholder-gray-500"
            :disabled="isSending"
          />
        </div>
        <button 
          type="submit"
          :disabled="!newMessage.trim() || isSending"
          class="p-3 bg-sm-primary rounded-full text-white shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:shadow-none hover:scale-105 active:scale-95 transition-all"
        >
          <PaperAirplaneIcon class="w-5 h-5" />
        </button>
      </form>
      
      <button
        v-if="pendingCount > 0"
        @click="retryPending"
        class="w-full text-center text-xs text-sm-primary mt-2 font-medium"
      >
        Retry {{ pendingCount }} failed messages
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, watch, computed } from 'vue'
import { ChevronLeftIcon, PaperAirplaneIcon, ChatBubbleLeftRightIcon } from '@heroicons/vue/24/outline' // Ensure these are imported
import { useChat } from '@/composables/useChat'
import type { Message } from '@/types/chat' // Ensure type is imported
import { useHead } from '@vueuse/head'

useHead({
  title: 'Chat Assistant - SM Mobile App',
  meta: [
    {
      name: 'description',
      content: 'Chat with AI assistant to get help with proposals, contracts, and general inquiries for The Anvaya Beach Resort Bali.'
    }
  ]
})

const { messages, isSending, pendingCount, sendMessage, retryPending, activeAgent, availableAgents, setAgent } = useChat()
const newMessage = ref('')
const messagesContainer = ref<HTMLElement>()

// Group messages by continuity (simple grouping for now)
const groupedMessages = computed(() => {
  const groups: Message[][] = []
  let currentGroup: Message[] = []
  
  messages.value.forEach((msg, i) => {
    if (i === 0) {
      currentGroup.push(msg)
    } else {
      const prev = messages.value[i - 1]
      // Group if same sender and within 2 mins
      if (prev && prev.sender === msg.sender && msg.timestamp - prev.timestamp < 120000) {
        currentGroup.push(msg)
      } else {
        groups.push(currentGroup)
        currentGroup = [msg]
      }
    }
  })
  if (currentGroup.length) groups.push(currentGroup)
  return groups
})

const handleSendMessage = async () => {
  if (!newMessage.value.trim()) return
  const text = newMessage.value.trim()
  newMessage.value = ''
  await sendMessage(text)
  scrollToBottom()
}

const scrollToBottom = () => {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
  })
}

watch(messages, scrollToBottom, { deep: true })

const formatTime = (timestamp: number) => {
  return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}
</script>

<!-- Add icons that might not be auto-imported if not using unplugin-vue-components properly for all icons -->
<script lang="ts">
// We need to ensure PaperAirplaneIcon is available, usually it's in outline or solid
</script>