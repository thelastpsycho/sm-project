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
      
      <!-- Downloads Section -->
      <div class="bg-white dark:bg-sm-card-dark/50 backdrop-blur-md rounded-3xl p-5 border border-gray-100 dark:border-white/5 animate-fade-in-up" style="animation-delay: 100ms;">
        <div class="flex items-center justify-between mb-4">
          <h3 class="font-semibold text-gray-900 dark:text-white">Downloads</h3>
          <ArrowDownTrayIcon class="h-5 w-5 text-sm-secondary" />
        </div>
        
        <div class="space-y-3">
          <!-- Beverage Package PDF -->
          <a
            href="/beverage_package.pdf"
            download
            class="flex items-center justify-between p-3 rounded-2xl bg-sm-bg dark:bg-black/20 transition-all duration-300 active:scale-95 hover:bg-gray-100 dark:hover:bg-white/5"
          >
            <div class="flex items-center space-x-3">
              <div class="p-2 bg-orange-500/10 rounded-xl shadow-sm">
                <DocumentArrowDownIcon class="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <span class="text-sm font-medium block">Beverage Package</span>
                <span class="text-xs text-sm-secondary">PDF Document</span>
              </div>
            </div>
            <ChevronRightIcon class="h-5 w-5 text-sm-secondary" />
          </a>

          <!-- Canape PDF -->
          <a
            href="/canape.pdf"
            download
            class="flex items-center justify-between p-3 rounded-2xl bg-sm-bg dark:bg-black/20 transition-all duration-300 active:scale-95 hover:bg-gray-100 dark:hover:bg-white/5"
          >
            <div class="flex items-center space-x-3">
              <div class="p-2 bg-pink-500/10 rounded-xl shadow-sm">
                <DocumentArrowDownIcon class="h-5 w-5 text-pink-500" />
              </div>
              <div>
                <span class="text-sm font-medium block">Canapé Menu</span>
                <span class="text-xs text-sm-secondary">PDF Document</span>
              </div>
            </div>
            <ChevronRightIcon class="h-5 w-5 text-sm-secondary" />
          </a>

          <!-- Image Gallery -->
          <a
            href="https://drive.google.com/drive/folders/1hcDotCQGLoDw1MwR_I20f2Y7ZqWRtlYY"
            target="_blank"
            rel="noopener noreferrer"
            class="flex items-center justify-between p-3 rounded-2xl bg-sm-bg dark:bg-black/20 transition-all duration-300 active:scale-95 hover:bg-gray-100 dark:hover:bg-white/5"
          >
            <div class="flex items-center space-x-3">
              <div class="p-2 bg-blue-500/10 rounded-xl shadow-sm">
                <PhotoIcon class="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <span class="text-sm font-medium block">Image Gallery</span>
                <span class="text-xs text-sm-secondary">Google Drive</span>
              </div>
            </div>
            <ArrowTopRightOnSquareIcon class="h-5 w-5 text-sm-secondary" />
          </a>
        </div>
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
import { SwatchIcon, ArrowDownTrayIcon, DocumentArrowDownIcon, ChevronRightIcon, PhotoIcon, ArrowTopRightOnSquareIcon } from '@heroicons/vue/24/outline'
import SmPage from '@/components/ui/SmPage.vue'
import ThemeToggle from '@/components/ThemeToggle.vue'

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