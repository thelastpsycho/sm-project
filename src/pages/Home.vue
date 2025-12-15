<template>
  <SmPage with-bottom-nav-padding class="pb-24">
    <!-- Header/Greeting -->
    <div class="px-6 pt-8 pb-6">
      <div class="flex items-center justify-between mb-2">
        <span class="text-xs font-semibold tracking-wider text-sm-secondary uppercase">
          {{ new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) }}
        </span>
        <div class="flex items-center space-x-2">
          <span 
            class="w-2 h-2 rounded-full ring-2 ring-white dark:ring-black animate-pulse"
            :class="isOnline ? 'bg-sm-accent' : 'bg-red-500'"
          ></span>
        </div>
      </div>
      <h1 class="text-3xl font-bold text-gray-900 dark:text-white tracking-tight animate-fade-in-up">
        Good {{ timeOfDay }},<br />
        <span class="text-sm-primary">Experience SM</span>
      </h1>
    </div>

    <!-- Main Content Grid -->
    <div class="px-4 space-y-4">
      
      <!-- Quick Actions Bento Grid -->
      <div class="grid grid-cols-2 gap-4 animate-fade-in-up" style="animation-delay: 100ms;">
        <!-- Chat Card -->
        <router-link
          to="/chat"
          class="group relative overflow-hidden bg-white dark:bg-sm-card-dark p-5 rounded-3xl shadow-sm border border-gray-100 dark:border-white/5 transition-all duration-300 active:scale-95"
        >
          <div class="absolute top-0 right-0 p-4 opacity-50">
            <div class="w-16 h-16 bg-blue-500/10 rounded-full blur-xl group-hover:bg-blue-500/20 transition-all"></div>
          </div>
          <div class="relative z-10 flex flex-col h-full justify-between">
            <div class="w-10 h-10 rounded-2xl bg-blue-500 text-white flex items-center justify-center shadow-lg shadow-blue-500/30 mb-4">
              <ChatBubbleLeftRightIcon class="h-6 w-6" />
            </div>
            <div>
              <h3 class="font-bold text-gray-900 dark:text-white">Chat</h3>
              <p class="text-xs text-sm-secondary mt-1">Connect instantly</p>
            </div>
            
            <!-- Notification Badge -->
            <div v-if="pendingMessages > 0" class="absolute top-5 right-5 flex">
               <span class="flex h-3 w-3 relative">
                <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span class="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
              </span>
            </div>
          </div>
        </router-link>

        <!-- Contract Card -->
        <router-link
          to="/contract"
          class="group relative overflow-hidden bg-white dark:bg-sm-card-dark p-5 rounded-3xl shadow-sm border border-gray-100 dark:border-white/5 transition-all duration-300 active:scale-95"
        >
          <div class="absolute top-0 right-0 p-4 opacity-50">
            <div class="w-16 h-16 bg-sm-accent/10 rounded-full blur-xl group-hover:bg-sm-accent/20 transition-all"></div>
          </div>
          <div class="relative z-10 flex flex-col h-full justify-between">
            <div class="w-10 h-10 rounded-2xl bg-sm-accent text-white flex items-center justify-center shadow-lg shadow-green-500/30 mb-4">
              <DocumentTextIcon class="h-6 w-6" />
            </div>
            <div>
              <h3 class="font-bold text-gray-900 dark:text-white">Contract</h3>
              <p class="text-xs text-sm-secondary mt-1">Submit request</p>
            </div>
          </div>
        </router-link>
      </div>

      <!-- Theme & Status Section -->
      <div class="bg-white dark:bg-sm-card-dark/50 backdrop-blur-md rounded-3xl p-5 border border-gray-100 dark:border-white/5 animate-fade-in-up" style="animation-delay: 200ms;">
        <div class="flex items-center justify-between mb-4">
          <h3 class="font-semibold text-gray-900 dark:text-white">System Status</h3>
          <span class="text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-white/10 text-sm-secondary">
            v1.0.0
          </span>
        </div>
        
        <div class="space-y-4">
          <div class="flex items-center justify-between p-3 rounded-2xl bg-sm-bg dark:bg-black/20">
            <div class="flex items-center space-x-3">
              <div class="p-2 bg-white dark:bg-white/10 rounded-xl shadow-sm">
                <SwatchIcon class="h-5 w-5 text-purple-500" />
              </div>
              <span class="text-sm font-medium">Appearance</span>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </div>

    </div>
  </SmPage>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { ChatBubbleLeftRightIcon, DocumentTextIcon, SwatchIcon } from '@heroicons/vue/24/outline'
import SmPage from '@/components/ui/SmPage.vue'
import ThemeToggle from '@/components/ThemeToggle.vue'
import { useChat } from '@/composables/useChat'

const { pendingCount: pendingMessages } = useChat()

const isOnline = computed(() => navigator.onLine)
const timeOfDay = computed(() => {
  const hour = new Date().getHours()
  if (hour < 12) return 'Morning'
  if (hour < 18) return 'Afternoon'
  return 'Evening'
})

const updateOnlineStatus = () => {
  // Force reactivity update via a dummy ref if needed, but computed usually works if deps change.
  // Navigator.onLine isn't reactive by default in Vue constant, so we might need a ref.
  _onlineRef.value = navigator.onLine
}

const _onlineRef = ref(navigator.onLine)
// Override computed to use reactive ref
const isOnlineReact = computed(() => _onlineRef.value)

onMounted(() => {
  window.addEventListener('online', updateOnlineStatus)
  window.addEventListener('offline', updateOnlineStatus)
})

onUnmounted(() => {
  window.removeEventListener('online', updateOnlineStatus)
  window.removeEventListener('offline', updateOnlineStatus)
})
</script>