<template>
  <div class="min-h-screen bg-white dark:bg-sm-bg-dark">
    <div class="max-w-[720px] mx-auto lg:mx-0 pb-32">
      <!-- Header/Greeting -->
      <div class="px-6 pt-11 pb-4">
        <div class="flex items-center justify-between">
          <span class="sm-eyebrow">
            {{ new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) }}
          </span>
          <span
            class="w-2 h-2 rounded-full"
            :class="isOnline ? 'bg-sm-won' : 'bg-sm-bad'"
            :title="isOnline ? 'Online' : 'Offline'"
          ></span>
        </div>
        <h1 class="sm-display text-display leading-[1.1] mt-3">
          Good {{ timeOfDay }},<br />{{ sessionStore.currentUser?.name || 'Experience SM' }}
        </h1>

        <!-- Global Search -->
        <div class="relative mt-5">
          <div class="flex items-center gap-2 border-b border-sm-line dark:border-white/15 pb-2.5 focus-within:border-sm-ink dark:focus-within:border-white transition-colors">
            <MagnifyingGlassIcon class="h-[17px] w-[17px] text-sm-muted shrink-0" />
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Search menus, decks, pages"
              class="flex-1 bg-transparent border-0 p-0 text-smd text-sm-ink dark:text-white placeholder:text-sm-faint focus:outline-none focus:ring-0"
            />
            <button
              v-if="searchQuery"
              @click="searchQuery = ''"
              class="text-sm-muted hover:text-sm-ink dark:hover:text-white transition-colors"
            >
              <XMarkIcon class="h-[17px] w-[17px]" />
            </button>
          </div>

          <!-- Search Results -->
          <div
            v-if="searchQuery && filteredResults.length > 0"
            class="mt-1 max-h-80 overflow-y-auto scr"
          >
            <button
              v-for="result in filteredResults"
              :key="result.id"
              @click="handleResultClick(result)"
              class="w-full flex items-center gap-3 px-1 py-3 border-t border-sm-hair dark:border-white/5 text-left group"
            >
              <div class="flex-1 min-w-0">
                <span class="text-smd font-semibold text-sm-ink dark:text-white block truncate">{{ result.name }}</span>
                <span class="sm-eyebrow">{{ result.type }}</span>
              </div>
              <ChevronRightIcon class="h-4 w-4 text-sm-faint group-hover:text-sm-ink dark:group-hover:text-white transition-colors shrink-0" />
            </button>
          </div>
          <div
            v-if="searchQuery && filteredResults.length === 0"
            class="mt-3 text-xsm text-sm-muted"
          >
            No matches for “{{ searchQuery }}”.
          </div>
        </div>
      </div>

      <!-- Quick actions -->
      <div v-if="!searchQuery && quickActions.length" class="px-6 pt-4">
        <div class="sm-eyebrow pb-1.5">Quick actions</div>
        <RouterLink
          v-for="q in quickActions"
          :key="q.to"
          :to="q.to"
          class="flex items-center justify-between gap-3 py-3.5 border-t border-sm-hair dark:border-white/5"
        >
          <span class="text-smd font-bold text-sm-ink dark:text-white">{{ q.label }}</span>
          <span class="text-xsm font-bold text-sm-primary shrink-0">{{ q.cta }}</span>
        </RouterLink>
      </div>

      <!-- Collateral -->
      <div v-if="!searchQuery" class="px-6 pt-7">
        <div class="sm-eyebrow pb-1.5">Collateral</div>

        <div
          v-for="link in collateral"
          :key="link.href"
          class="flex items-center gap-3.5 py-3.5 border-t border-sm-hair dark:border-white/5"
        >
          <a
            :href="link.href"
            target="_blank"
            rel="noopener noreferrer"
            class="flex-1 min-w-0 active:opacity-60 transition-opacity"
          >
            <div class="text-smd font-semibold text-sm-ink dark:text-white truncate">{{ link.name }}</div>
            <div class="mt-0.5 text-xs text-sm-muted">{{ link.meta }}</div>
          </a>
          <button
            @click="copyLink(link.href)"
            class="text-sm-faint hover:text-sm-ink dark:hover:text-white transition-colors shrink-0"
            title="Copy link"
          >
            <CheckIcon v-if="copiedPath === link.href" class="h-[17px] w-[17px] text-sm-won" />
            <LinkIcon v-else class="h-[17px] w-[17px]" />
          </button>
          <a :href="link.href" target="_blank" rel="noopener noreferrer" class="text-sm-faint hover:text-sm-ink dark:hover:text-white transition-colors shrink-0">
            <ArrowTopRightOnSquareIcon v-if="link.external" class="h-[17px] w-[17px]" />
            <ChevronRightIcon v-else class="h-[17px] w-[17px]" />
          </a>
        </div>

        <!-- Menus — expandable -->
        <div class="border-t border-sm-hair dark:border-white/5">
          <button
            @click="menusExpanded = !menusExpanded"
            class="w-full flex items-center gap-3.5 py-3.5 text-left"
          >
            <div class="flex-1 min-w-0">
              <div class="text-smd font-semibold text-sm-ink dark:text-white">Menus</div>
              <div class="mt-0.5 text-xs text-sm-muted">27 PDFs · buffet, BBQ, set</div>
            </div>
            <ChevronDownIcon
              class="h-[17px] w-[17px] text-sm-faint transition-transform duration-300 shrink-0"
              :class="{ 'rotate-180': menusExpanded }"
            />
          </button>
          <div v-show="menusExpanded" class="max-h-96 overflow-y-auto scr pb-2">
            <div
              v-for="menu in menuItems"
              :key="menu.file"
              class="flex items-center gap-2 group"
            >
              <a
                :href="`/menus/${menu.file}`"
                target="_blank"
                rel="noopener noreferrer"
                class="flex-1 flex items-center gap-2.5 py-2.5 min-w-0 active:opacity-60"
              >
                <span class="w-1.5 h-1.5 rounded-full bg-sm-ink dark:bg-white shrink-0"></span>
                <span class="text-xsm font-medium text-sm-ink dark:text-gray-200 truncate">{{ menu.displayName }}</span>
              </a>
              <button
                @click="copyLink(`/menus/${menu.file}`)"
                class="p-1 text-sm-faint hover:text-sm-ink dark:hover:text-white transition-colors shrink-0"
                title="Copy link"
              >
                <CheckIcon v-if="copiedPath === `/menus/${menu.file}`" class="h-4 w-4 text-sm-won" />
                <LinkIcon v-else class="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Appearance -->
      <div v-if="!searchQuery" class="px-6 pt-7">
        <div class="sm-eyebrow pb-1.5">Appearance</div>
        <div class="flex items-center justify-between py-3.5 border-t border-sm-hair dark:border-white/5">
          <span class="text-smd font-semibold text-sm-ink dark:text-white">Theme</span>
          <ThemeToggle />
        </div>
        <div class="flex items-center justify-between py-3.5 border-t border-sm-hair dark:border-white/5">
          <span class="text-smd text-sm-muted">Version</span>
          <span class="text-xsm font-semibold text-sm-muted">v1.0.0</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useHead } from '@vueuse/head'
import { useSessionStore } from '@/stores/session'
import { usePermissionsStore } from '@/stores/permissions'
import type { Permission } from '@/lib/permissions'

useHead({
  title: 'Home - SM Mobile App',
  meta: [
    {
      name: 'description',
      content: 'Access documents, menus, downloads, and search functionality for The Anvaya Beach Resort Bali sales management system.'
    }
  ]
})
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
  FolderIcon,
  ClipboardDocumentIcon
} from '@heroicons/vue/24/outline'
import ThemeToggle from '@/components/ThemeToggle.vue'

const router = useRouter()
const sessionStore = useSessionStore()
const permissions = usePermissionsStore()

// Collateral rows (hairline list). external = opens a Drive folder in a new tab.
const collateral = [
  { name: 'Factsheet', meta: 'Google Drive folder', href: 'https://drive.google.com/drive/folders/1GBaW75BLBMhPQOdV1kzuJwCJL_wAGHJa', external: true },
  { name: 'Beverage Package', meta: 'PDF document', href: '/beverage_package.pdf', external: false },
  { name: 'Canapé Menu', meta: 'PDF document', href: '/canape.pdf', external: false },
  { name: 'Image Gallery', meta: 'Google Drive folder', href: 'https://drive.google.com/drive/folders/1hcDotCQGLoDw1MwR_I20f2Y7ZqWRtlYY', external: true }
]

// Quick actions = the daily-driver screens, filtered to what this role can open.
const quickActions = computed(() => {
  const wanted: Array<{ label: string; cta: string; to: string; perm: Permission }> = [
    { label: 'Pipeline', cta: 'Open', to: '/crm', perm: 'pipeline:view' },
    { label: 'Function Chart', cta: 'Open', to: '/function-chart', perm: 'function:view' },
    { label: 'New RFP', cta: 'Create', to: '/rfp/new', perm: 'rfp:create' },
    { label: 'Chat', cta: 'Open', to: '/chat', perm: 'chat:access' }
  ]
  return wanted.filter(q => permissions.has(sessionStore.currentUser, q.perm))
})
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

const _online = ref(navigator.onLine)
const isOnline = computed(() => _online.value)
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
  { id: 'tactical-offer', name: 'Tactical Offer', type: 'Page', path: '/tactical-offer', icon: PlusIcon, iconBg: 'bg-rose-500/10', iconColor: 'text-rose-500' },
  { id: 'rfp-history', name: 'RFP History', type: 'Page', path: '/rfp', icon: ClockIcon, iconBg: 'bg-orange-500/10', iconColor: 'text-orange-500' },
  { id: 'rfp-new', name: 'Create RFP', type: 'Page', path: '/rfp/new', icon: PlusIcon, iconBg: 'bg-green-500/10', iconColor: 'text-green-500' },
  { id: 'survey-admin', name: 'Survey Admin', type: 'Page', path: '/survey/admin', icon: ClipboardDocumentIcon, iconBg: 'bg-teal-500/10', iconColor: 'text-teal-500' },
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
  _online.value = navigator.onLine
}

onMounted(() => {
  window.addEventListener('online', updateOnlineStatus)
  window.addEventListener('offline', updateOnlineStatus)
})

onUnmounted(() => {
  window.removeEventListener('online', updateOnlineStatus)
  window.removeEventListener('offline', updateOnlineStatus)
})
</script>