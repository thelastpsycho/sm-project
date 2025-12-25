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

          <!-- Menus - Expandable -->
          <div class="rounded-2xl bg-sm-bg dark:bg-black/20 overflow-hidden">
            <button
              @click="menusExpanded = !menusExpanded"
              class="w-full flex items-center justify-between p-3 transition-all duration-300 active:scale-95 hover:bg-gray-100 dark:hover:bg-white/5"
            >
              <div class="flex items-center space-x-3">
                <div class="p-2 bg-green-500/10 rounded-xl shadow-sm">
                  <DocumentTextIcon class="h-5 w-5 text-green-500" />
                </div>
                <div class="text-left">
                  <span class="text-sm font-medium block">Menus</span>
                  <span class="text-xs text-sm-secondary">27 PDF Documents</span>
                </div>
              </div>
              <ChevronDownIcon 
                class="h-5 w-5 text-sm-secondary transition-transform duration-300"
                :class="{ 'rotate-180': menusExpanded }"
              />
            </button>
            
            <!-- Expandable Menu List -->
            <div 
              v-show="menusExpanded"
              class="border-t border-gray-200 dark:border-white/5"
            >
              <div class="max-h-96 overflow-y-auto px-3 py-2 space-y-1">
                <a
                  v-for="menu in menuItems"
                  :key="menu.file"
                  :href="`/menus/${menu.file}`"
                  download
                  class="flex items-center justify-between p-2 rounded-xl hover:bg-white dark:hover:bg-white/5 transition-all duration-200 group"
                >
                  <div class="flex items-center space-x-2 flex-1 min-w-0">
                    <div class="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0"></div>
                    <span class="text-xs font-medium truncate">{{ menu.displayName }}</span>
                  </div>
                  <ArrowDownTrayIcon class="h-4 w-4 text-sm-secondary opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 ml-2" />
                </a>
              </div>
            </div>
          </div>

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
import { SwatchIcon, ArrowDownTrayIcon, DocumentArrowDownIcon, ChevronRightIcon, PhotoIcon, ArrowTopRightOnSquareIcon, DocumentTextIcon, ChevronDownIcon } from '@heroicons/vue/24/outline'
import SmPage from '@/components/ui/SmPage.vue'
import ThemeToggle from '@/components/ThemeToggle.vue'

// Menu expansion state
const menusExpanded = ref(false)

// Menu items with formatted display names
const menuItems = [
  { file: 'BUFFET - ASIAN MENU 850.000.pdf', displayName: 'Asian - Buffet - 850k' },
  { file: 'BUFFET - ASIAN MENU 950.000.pdf', displayName: 'Asian - Buffet - 950k' },
  { file: 'BUFFET - INDONESIAN MENU 950.000.pdf', displayName: 'Indonesian - Buffet - 950k' },
  { file: 'BUFFET - INTERNATIONAL MENU 850.000.pdf', displayName: 'International - Buffet - 850k' },
  { file: 'BUFFET - INTERNATIONAL MENU 950.000.pdf', displayName: 'International - Buffet - 950k' },
  { file: 'BUFFET - WESTERN MENU 850.000.pdf', displayName: 'Western - Buffet - 850k' },
  { file: 'BUFFET - WESTERN MENU 950.000.pdf', displayName: 'Western - Buffet - 950k' },
  { file: 'BUFFET BBQ DINNER - INDONESIAN 850.000.pdf', displayName: 'Indonesian - BBQ Dinner - 850k' },
  { file: 'BUFFET BBQ DINNER - INDONESIAN 950.000.pdf', displayName: 'Indonesian - BBQ Dinner - 950k' },
  { file: 'BUFFET BBQ DINNER - INTERNATIONAL 850.000.pdf', displayName: 'International - BBQ Dinner - 850k' },
  { file: 'BUFFET BBQ DINNER - INTERNATIONAL 950.000.pdf', displayName: 'International - BBQ Dinner - 950k' },
  { file: 'BUFFET BBQ DINNER - INTERNATIONAL 1.000.000.pdf', displayName: 'International - BBQ Dinner - 1000k' },
  { file: 'BUFFET BBQ DINNER - WESTERN 850.000.pdf', displayName: 'Western - BBQ Dinner - 850k' },
  { file: 'BUFFET BBQ DINNER - WESTERN 950.000.pdf', displayName: 'Western - BBQ Dinner - 950k' },
  { file: 'BUFFET BBQ DINNER - WESTERN 1.000.000.pdf', displayName: 'Western - BBQ Dinner - 1000k' },
  { file: 'BUFFET BBQ DINNER SEAFOOD 850.000.pdf', displayName: 'Seafood - BBQ Dinner - 850k' },
  { file: 'BUFFET BBQ DINNER SEAFOOD 950.000.pdf', displayName: 'Seafood - BBQ Dinner - 950k' },
  { file: 'BUFFET BBQ DINNER SEAFOOD 1.000.000.pdf', displayName: 'Seafood - BBQ Dinner - 1000k' },
  { file: 'SET MENU - ASIAN 900.000.pdf', displayName: 'Asian - Set Menu - 900k' },
  { file: 'SET MENU - ASIAN 1.000.000.pdf', displayName: 'Asian - Set Menu - 1000k' },
  { file: 'FAMILY SET MENU - ASIAN 1.100.000.pdf', displayName: 'Asian - Family Set Menu - 1100k' },
  { file: 'SET MENU - INDONESIAN 900.000.pdf', displayName: 'Indonesian - Set Menu - 900k' },
  { file: 'SET MENU - INDONESIAN 1.000.000.pdf', displayName: 'Indonesian - Set Menu - 1000k' },
  { file: 'SET MENU - INDONESIAN 1.100.000.pdf', displayName: 'Indonesian - Set Menu - 1100k' },
  { file: 'SET MENU - WESTERN 900.000.pdf', displayName: 'Western - Set Menu - 900k' },
  { file: 'SET MENU - WESTERN 1.000.000.pdf', displayName: 'Western - Set Menu - 1000k' },
  { file: 'SET MENU - WESTERN 1.100.000.pdf', displayName: 'Western - Set Menu - 1100k' },
]

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