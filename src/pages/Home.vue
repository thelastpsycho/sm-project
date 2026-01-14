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
      
      <!-- Global Search -->
      <div class="relative animate-fade-in-up" style="animation-delay: 50ms;">
        <div class="relative group">
          <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <MagnifyingGlassIcon class="h-5 w-5 text-sm-secondary group-focus-within:text-sm-primary transition-colors" />
          </div>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search documents, pages, links..."
            class="w-full bg-white dark:bg-sm-card-dark/50 backdrop-blur-md border border-gray-100 dark:border-white/5 rounded-2xl py-3.5 pl-11 pr-11 text-sm focus:outline-none focus:ring-2 focus:ring-sm-primary/20 focus:border-sm-primary/30 transition-all placeholder:text-sm-secondary"
          />
          <button
            v-if="searchQuery"
            @click="searchQuery = ''"
            class="absolute inset-y-0 right-0 pr-4 flex items-center text-sm-secondary hover:text-sm-primary transition-colors"
          >
            <XMarkIcon class="h-5 w-5" />
          </button>
        </div>

        <!-- Search Results Dropdown -->
        <div 
          v-if="searchQuery && filteredResults.length > 0"
          class="w-full mt-2 bg-white dark:bg-sm-card-dark border border-gray-100 dark:border-white/10 rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        >
          <div class="max-h-80 overflow-y-auto py-2">
            <button
              v-for="result in filteredResults"
              :key="result.id"
              @click="handleResultClick(result)"
              class="w-full flex items-center px-4 py-3 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group text-left"
            >
              <div class="p-2 rounded-xl" :class="result.iconBg">
                <component :is="result.icon" class="h-4 w-4" :class="result.iconColor" />
              </div>
              <div class="ml-3 flex-1 min-w-0">
                <span class="text-sm font-medium block truncate">{{ result.name }}</span>
                <span class="text-xs text-sm-secondary uppercase tracking-wider">{{ result.type }}</span>
              </div>
              <ChevronRightIcon class="h-4 w-4 text-sm-secondary opacity-0 group-hover:opacity-100 transition-all" />
            </button>
          </div>
        </div>

        <!-- No Results -->
        <div 
          v-if="searchQuery && filteredResults.length === 0"
          class="w-full mt-2 bg-white dark:bg-sm-card-dark border border-gray-100 dark:border-white/10 rounded-2xl shadow-xl p-6 text-center animate-in fade-in zoom-in-95 duration-200"
        >
          <div class="mb-2 flex justify-center">
            <div class="p-3 bg-gray-100 dark:bg-white/5 rounded-full">
              <MagnifyingGlassIcon class="h-6 w-6 text-sm-secondary" />
            </div>
          </div>
          <p class="text-sm font-medium text-gray-900 dark:text-white">No matches found</p>
          <p class="text-xs text-sm-secondary mt-1">Try searching for something else</p>
        </div>
      </div>
      
      <!-- Downloads Section -->
      <div class="bg-white dark:bg-sm-card-dark/50 backdrop-blur-md rounded-3xl p-5 border border-gray-100 dark:border-white/5 animate-fade-in-up" style="animation-delay: 100ms;">
        <div class="flex items-center justify-between mb-4">
          <h3 class="font-semibold text-gray-900 dark:text-white">Downloads</h3>
          <ArrowDownTrayIcon class="h-5 w-5 text-sm-secondary" />
        </div>
        
        <div class="space-y-3">
          <!-- Factsheet -->
          <div class="flex items-center space-x-2">
            <a
              href="https://drive.google.com/drive/folders/1GBaW75BLBMhPQOdV1kzuJwCJL_wAGHJa"
              target="_blank"
              rel="noopener noreferrer"
              class="flex-1 flex items-center justify-between p-3 rounded-2xl bg-sm-bg dark:bg-black/20 transition-all duration-300 active:scale-95 hover:bg-gray-100 dark:hover:bg-white/5"
            >
              <div class="flex items-center space-x-3">
                <div class="p-2 bg-indigo-500/10 rounded-xl shadow-sm">
                  <FolderIcon class="h-5 w-5 text-indigo-500" />
                </div>
                <div>
                  <span class="text-sm font-medium block">Factsheet</span>
                  <span class="text-xs text-sm-secondary">Google Drive</span>
                </div>
              </div>
              <ArrowTopRightOnSquareIcon class="h-5 w-5 text-sm-secondary" />
            </a>
            <button
              @click="copyLink('https://drive.google.com/drive/folders/1GBaW75BLBMhPQOdV1kzuJwCJL_wAGHJa')"
              class="p-3 rounded-2xl bg-sm-bg dark:bg-black/20 hover:bg-gray-100 dark:hover:bg-white/5 transition-all text-sm-secondary hover:text-sm-primary"
              title="Copy Link"
            >
              <CheckIcon v-if="copiedPath === 'https://drive.google.com/drive/folders/1GBaW75BLBMhPQOdV1kzuJwCJL_wAGHJa'" class="h-5 w-5 text-green-500" />
              <LinkIcon v-else class="h-5 w-5" />
            </button>
          </div>

          <!-- Beverage Package PDF -->
          <div class="flex items-center space-x-2">
            <a
              href="/beverage_package.pdf"
              target="_blank"
              rel="noopener noreferrer"
              class="flex-1 flex items-center justify-between p-3 rounded-2xl bg-sm-bg dark:bg-black/20 transition-all duration-300 active:scale-95 hover:bg-gray-100 dark:hover:bg-white/5"
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
            <button 
              @click="copyLink('/beverage_package.pdf')"
              class="p-3 rounded-2xl bg-sm-bg dark:bg-black/20 hover:bg-gray-100 dark:hover:bg-white/5 transition-all text-sm-secondary hover:text-sm-primary"
              title="Copy Link"
            >
              <CheckIcon v-if="copiedPath === '/beverage_package.pdf'" class="h-5 w-5 text-green-500" />
              <LinkIcon v-else class="h-5 w-5" />
            </button>
          </div>

          <!-- Canape PDF -->
          <div class="flex items-center space-x-2">
            <a
              href="/canape.pdf"
              target="_blank"
              rel="noopener noreferrer"
              class="flex-1 flex items-center justify-between p-3 rounded-2xl bg-sm-bg dark:bg-black/20 transition-all duration-300 active:scale-95 hover:bg-gray-100 dark:hover:bg-white/5"
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
            <button 
              @click="copyLink('/canape.pdf')"
              class="p-3 rounded-2xl bg-sm-bg dark:bg-black/20 hover:bg-gray-100 dark:hover:bg-white/5 transition-all text-sm-secondary hover:text-sm-primary"
              title="Copy Link"
            >
              <CheckIcon v-if="copiedPath === '/canape.pdf'" class="h-5 w-5 text-green-500" />
              <LinkIcon v-else class="h-5 w-5" />
            </button>
          </div>

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
                <div
                  v-for="menu in menuItems"
                  :key="menu.file"
                  class="flex items-center space-x-1 group"
                >
                  <a
                    :href="`/menus/${menu.file}`"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="flex-1 flex items-center justify-between p-2 rounded-xl hover:bg-white dark:hover:bg-white/5 transition-all duration-200"
                  >
                    <div class="flex items-center space-x-2 flex-1 min-w-0">
                      <div class="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0"></div>
                      <span class="text-xs font-medium truncate">{{ menu.displayName }}</span>
                    </div>
                    <ArrowTopRightOnSquareIcon class="h-4 w-4 text-sm-secondary flex-shrink-0 ml-2" />
                  </a>
                  <button 
                    @click="copyLink(`/menus/${menu.file}`)"
                    class="p-2 rounded-xl text-sm-secondary hover:text-sm-primary transition-all"
                    title="Copy Link"
                  >
                    <CheckIcon v-if="copiedPath === `/menus/${menu.file}`" class="h-4 w-4 text-green-500" />
                    <LinkIcon v-else class="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Image Gallery -->
          <div class="flex items-center space-x-2">
            <a
              href="https://drive.google.com/drive/folders/1hcDotCQGLoDw1MwR_I20f2Y7ZqWRtlYY"
              target="_blank"
              rel="noopener noreferrer"
              class="flex-1 flex items-center justify-between p-3 rounded-2xl bg-sm-bg dark:bg-black/20 transition-all duration-300 active:scale-95 hover:bg-gray-100 dark:hover:bg-white/5"
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
            <button 
              @click="copyLink('https://drive.google.com/drive/folders/1hcDotCQGLoDw1MwR_I20f2Y7ZqWRtlYY')"
              class="p-3 rounded-2xl bg-sm-bg dark:bg-black/20 hover:bg-gray-100 dark:hover:bg-white/5 transition-all text-sm-secondary hover:text-sm-primary"
              title="Copy Link"
            >
              <CheckIcon v-if="copiedPath === 'https://drive.google.com/drive/folders/1hcDotCQGLoDw1MwR_I20f2Y7ZqWRtlYY'" class="h-5 w-5 text-green-500" />
              <LinkIcon v-else class="h-5 w-5" />
            </button>
          </div>
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
import { useRouter } from 'vue-router'
import {
  SwatchIcon,
  ArrowDownTrayIcon,
  DocumentArrowDownIcon,
  ChevronRightIcon,
  PhotoIcon,
  ArrowTopRightOnSquareIcon,
  DocumentTextIcon,
  ChevronDownIcon,
  LinkIcon,
  CheckIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  ChatBubbleLeftRightIcon,
  DocumentDuplicateIcon,
  ClockIcon,
  PlusIcon,
  FolderIcon
} from '@heroicons/vue/24/outline'
import SmPage from '@/components/ui/SmPage.vue'
import ThemeToggle from '@/components/ThemeToggle.vue'

const router = useRouter()
const searchQuery = ref('')

// Menu expansion state
const menusExpanded = ref(false)

// Menu items with formatted display names
const menuItems = [
  { file: 'Asian - Buffet - 850k.pdf', displayName: 'Asian - Buffet - 850k' },
  { file: 'Asian - Buffet - 950k.pdf', displayName: 'Asian - Buffet - 950k' },
  { file: 'Indonesian - Buffet - 950k.pdf', displayName: 'Indonesian - Buffet - 950k' },
  { file: 'International - Buffet - 850k.pdf', displayName: 'International - Buffet - 850k' },
  { file: 'International - Buffet - 950k.pdf', displayName: 'International - Buffet - 950k' },
  { file: 'Western - Buffet - 850k.pdf', displayName: 'Western - Buffet - 850k' },
  { file: 'Western - Buffet - 950k.pdf', displayName: 'Western - Buffet - 950k' },
  { file: 'Indonesian - BBQ Dinner - 850k.pdf', displayName: 'Indonesian - BBQ Dinner - 850k' },
  { file: 'Indonesian - BBQ Dinner - 950k.pdf', displayName: 'Indonesian - BBQ Dinner - 950k' },
  { file: 'International - BBQ Dinner - 850k.pdf', displayName: 'International - BBQ Dinner - 850k' },
  { file: 'International - BBQ Dinner - 950k.pdf', displayName: 'International - BBQ Dinner - 950k' },
  { file: 'International - BBQ Dinner - 1000k.pdf', displayName: 'International - BBQ Dinner - 1000k' },
  { file: 'Western - BBQ Dinner - 850k.pdf', displayName: 'Western - BBQ Dinner - 850k' },
  { file: 'Western - BBQ Dinner - 950k.pdf', displayName: 'Western - BBQ Dinner - 950k' },
  { file: 'Western - BBQ Dinner - 1000k.pdf', displayName: 'Western - BBQ Dinner - 1000k' },
  { file: 'Seafood - BBQ Dinner - 850k.pdf', displayName: 'Seafood - BBQ Dinner - 850k' },
  { file: 'Seafood - BBQ Dinner - 950k.pdf', displayName: 'Seafood - BBQ Dinner - 950k' },
  { file: 'Seafood - BBQ Dinner - 1000k.pdf', displayName: 'Seafood - BBQ Dinner - 1000k' },
  { file: 'Asian - Set Menu - 900k.pdf', displayName: 'Asian - Set Menu - 900k' },
  { file: 'Asian - Set Menu - 1000k.pdf', displayName: 'Asian - Set Menu - 1000k' },
  { file: 'Asian - Family Set Menu - 1100k.pdf', displayName: 'Asian - Family Set Menu - 1100k' },
  { file: 'Indonesian - Set Menu - 900k.pdf', displayName: 'Indonesian - Set Menu - 900k' },
  { file: 'Indonesian - Set Menu - 1000k.pdf', displayName: 'Indonesian - Set Menu - 1000k' },
  { file: 'Indonesian - Set Menu - 1100k.pdf', displayName: 'Indonesian - Set Menu - 1100k' },
  { file: 'Western - Set Menu - 900k.pdf', displayName: 'Western - Set Menu - 900k' },
  { file: 'Western - Set Menu - 1000k.pdf', displayName: 'Western - Set Menu - 1000k' },
  { file: 'Western - Set Menu - 1100k.pdf', displayName: 'Western - Set Menu - 1100k' },
]

const copiedPath = ref<string | null>(null)
const copyLink = (path: string) => {
  if (path.startsWith('http')) {
    navigator.clipboard.writeText(path).then(() => {
      handleCopySuccess(path)
    }).catch(err => {
      console.error('Failed to copy: ', err)
    })
    return
  }

  // Use configured app URL or fallback to current origin
  const baseUrl = import.meta.env.VITE_APP_URL || window.location.origin
  
  try {
    // URL constructor handles encoding (spaces -> %20)
    const url = new URL(encodeURI(path), baseUrl).toString()
    navigator.clipboard.writeText(url).then(() => {
      handleCopySuccess(path)
    }).catch(err => {
      console.error('Failed to copy: ', err)
    })
  } catch (e) {
    console.error('Invalid URL:', e)
  }
}

const handleCopySuccess = (path: string) => {
  copiedPath.value = path
  setTimeout(() => {
    if (copiedPath.value === path) {
      copiedPath.value = null
    }
  }, 2000)
}

const isOnline = computed(() => navigator.onLine)
const timeOfDay = computed(() => {
  const hour = new Date().getHours()
  if (hour < 12) return 'Morning'
  if (hour < 18) return 'Afternoon'
  return 'Evening'
})

// Searchable items configuration
const searchableItems = computed(() => [
  { id: 'home', name: 'Home', type: 'Page', path: '/', icon: SwatchIcon, iconBg: 'bg-purple-500/10', iconColor: 'text-purple-500' },
  { id: 'chat', name: 'Chat Assistant', type: 'Page', path: '/chat', icon: ChatBubbleLeftRightIcon, iconBg: 'bg-blue-500/10', iconColor: 'text-blue-500' },
  { id: 'contract', name: 'Submit Contract', type: 'Page', path: '/contract', icon: DocumentDuplicateIcon, iconBg: 'bg-indigo-500/10', iconColor: 'text-indigo-500' },
  { id: 'rfp-history', name: 'RFP History', type: 'Page', path: '/rfp', icon: ClockIcon, iconBg: 'bg-orange-500/10', iconColor: 'text-orange-500' },
  { id: 'rfp-new', name: 'Create RFP', type: 'Page', path: '/rfp/new', icon: PlusIcon, iconBg: 'bg-green-500/10', iconColor: 'text-green-500' },
  { id: 'beverage', name: 'Beverage Package', type: 'Document', path: '/beverage_package.pdf', icon: DocumentArrowDownIcon, iconBg: 'bg-orange-500/10', iconColor: 'text-orange-500' },
  { id: 'canape', name: 'Canapé Menu', type: 'Document', path: '/canape.pdf', icon: DocumentArrowDownIcon, iconBg: 'bg-pink-500/10', iconColor: 'text-pink-500' },
  { id: 'gallery', name: 'Image Gallery', type: 'Link', path: 'https://drive.google.com/drive/folders/1hcDotCQGLoDw1MwR_I20f2Y7ZqWRtlYY', icon: PhotoIcon, iconBg: 'bg-blue-500/10', iconColor: 'text-blue-500' },
  { id: 'factsheet', name: 'Factsheet', type: 'Link', path: 'https://drive.google.com/drive/folders/1GBaW75BLBMhPQOdV1kzuJwCJL_wAGHJa', icon: FolderIcon, iconBg: 'bg-indigo-500/10', iconColor: 'text-indigo-500' },
  ...menuItems.map(m => ({
    id: `menu-${m.file}`,
    name: m.displayName,
    type: 'Menu PDF',
    path: `/menus/${m.file}`,
    icon: DocumentTextIcon,
    iconBg: 'bg-green-500/10',
    iconColor: 'text-green-500'
  }))
])

const filteredResults = computed(() => {
  if (!searchQuery.value) return []
  const query = searchQuery.value.toLowerCase()
  return searchableItems.value.filter(item => 
    item.name.toLowerCase().includes(query) || 
    item.type.toLowerCase().includes(query)
  ).slice(0, 8) // Limit results for better performance/UI
})

const handleResultClick = (result: any) => {
  searchQuery.value = ''
  if (result.path.startsWith('http') || result.path.endsWith('.pdf')) {
    window.open(result.path, '_blank')
  } else {
    router.push(result.path)
  }
}

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