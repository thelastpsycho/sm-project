<template>
  <!-- Notification bell (bottom-left, opposite the nav FAB) -->
  <button
    type="button"
    class="fixed bottom-6 left-6 z-50 w-12 h-12 rounded-full bg-white dark:bg-sm-card-dark border border-gray-100 dark:border-white/10 shadow-lg shadow-black/5 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:scale-105 active:scale-95 transition-all"
    aria-label="Notifications"
    @click="showNotifications = true"
  >
    <BellIcon class="w-5 h-5" />
    <span
      v-if="notifications.unreadCount"
      class="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-semibold flex items-center justify-center"
    >
      {{ notifications.unreadCount > 9 ? '9+' : notifications.unreadCount }}
    </span>
  </button>

  <NotificationPanel :open="showNotifications" @close="showNotifications = false" />

  <div class="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3 pointer-events-none">
    
    <!-- Navigation Menu items -->
    <TransitionGroup
      enter-active-class="transition duration-300 ease-out"
      enter-from-class="transform translate-y-4 opacity-0 scale-95"
      enter-to-class="transform translate-y-0 opacity-100 scale-100"
      leave-active-class="transition duration-200 ease-in"
      leave-from-class="transform translate-y-0 opacity-100 scale-100"
      leave-to-class="transform translate-y-4 opacity-0 scale-95"
    >
      <router-link
        v-if="isOpen"
        v-for="(item, index) in navItems"
        :key="item.name"
        :to="item.to"
        @click="isOpen = false"
        class="pointer-events-auto relative z-50 flex items-center bg-white dark:bg-sm-card-dark border border-gray-100 dark:border-white/10 px-4 py-3 rounded-2xl shadow-lg shadow-black/5 hover:scale-105 active:scale-95 transition-all group"
        :style="{ transitionDelay: `${index * 50}ms` }"
      >
        <span class="text-sm font-medium text-gray-700 dark:text-gray-200 mr-3">{{ item.name }}</span>
        <div
          class="p-2 rounded-xl transition-colors"
          :class="isActive(item) ? 'bg-sm-primary text-white' : 'bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400 group-hover:text-sm-primary'"
        >
          <component :is="item.icon" class="w-5 h-5" />
        </div>
      </router-link>

      <!-- Logout Button -->
      <button
        v-if="isOpen"
        @click="handleLogout"
        class="pointer-events-auto relative z-50 flex items-center bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/30 px-4 py-3 rounded-2xl shadow-lg shadow-black/5 hover:scale-105 active:scale-95 transition-all group"
        style="transitionDelay: 350ms"
      >
        <span class="text-sm font-medium text-red-700 dark:text-red-300 mr-3">Logout</span>
        <div class="p-2 rounded-xl bg-red-100 dark:bg-red-800/30 text-red-600 dark:text-red-400 transition-colors">
          <ArrowRightOnRectangleIcon class="w-5 h-5" />
        </div>
      </button>
    </TransitionGroup>

    <!-- Main FAB Trigger -->
    <button
      @click="isOpen = !isOpen"
      class="pointer-events-auto w-14 h-14 rounded-full bg-sm-primary text-white shadow-xl shadow-blue-500/30 flex items-center justify-center hover:scale-110 active:scale-90 transition-all z-50"
    >
      <Transition
        mode="out-in"
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="transform rotate-90 opacity-0"
        enter-to-class="transform rotate-0 opacity-100"
        leave-active-class="transition duration-200 ease-in"
        leave-from-class="transform rotate-0 opacity-100"
        leave-to-class="transform -rotate-90 opacity-0"
      >
        <XMarkIcon v-if="isOpen" class="w-7 h-7" />
        <Bars3Icon v-else class="w-7 h-7" />
      </Transition>
    </button>

    <!-- Backdrop -->
    <Transition
      enter-active-class="transition duration-300 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-200 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div 
        v-if="isOpen" 
        @click="isOpen = false"
        class="fixed inset-0 bg-black/20 dark:bg-black/50 backdrop-blur-sm pointer-events-auto z-40"
      ></div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useSessionStore } from '@/stores/session'
import {
  HomeIcon,
  ChatBubbleLeftRightIcon,
  DocumentTextIcon,
  ClipboardDocumentListIcon,
  PlusIcon,
  Bars3Icon,
  XMarkIcon,
  ClipboardDocumentIcon,
  Squares2X2Icon,
  ChartBarIcon,
  CalendarDaysIcon,
  UsersIcon,
  BellIcon,
  ArrowRightOnRectangleIcon
} from '@heroicons/vue/24/outline'
import NotificationPanel from '@/components/NotificationPanel.vue'
import { useNotificationsStore } from '@/stores/notifications'
import { usePermissionsStore } from '@/stores/permissions'
import type { Permission } from '@/lib/permissions'

const route = useRoute()
const router = useRouter()
const sessionStore = useSessionStore()
const notifications = useNotificationsStore()
const permissions = usePermissionsStore()
const isOpen = ref(false)
const showNotifications = ref(false)

const handleLogout = async () => {
  await sessionStore.logout()
  isOpen.value = false
  router.push('/login')
}

interface NavItem {
  name: string
  to: string
  icon: unknown
  permission?: Permission // when set, only shown to roles granted this permission
}

const allNavItems: NavItem[] = [
  {
    name: 'Home',
    to: '/',
    icon: HomeIcon,
    permission: 'home:access'
  },
  {
    name: 'Chat',
    to: '/chat',
    icon: ChatBubbleLeftRightIcon,
    permission: 'chat:access'
  },
  {
    name: 'Pipeline',
    to: '/crm',
    icon: Squares2X2Icon,
    permission: 'pipeline:view'
  },
  {
    name: 'Pipeline Report',
    to: '/crm/report',
    icon: ChartBarIcon,
    permission: 'pipeline:report'
  },
  {
    name: 'Function Chart',
    to: '/function-chart',
    icon: CalendarDaysIcon,
    permission: 'function:view'
  },
  {
    name: 'Contract',
    to: '/contract',
    icon: DocumentTextIcon,
    permission: 'contract:access'
  },
  {
    name: 'New RFP',
    to: '/rfp/new',
    icon: PlusIcon,
    permission: 'rfp:create'
  },
  {
    name: 'RFP History',
    to: '/rfp',
    icon: ClipboardDocumentListIcon,
    permission: 'rfp:view'
  },
  {
    name: 'Survey Admin',
    to: '/survey/admin',
    icon: ClipboardDocumentIcon,
    permission: 'survey:view'
  },
  {
    name: 'Team & Access',
    to: '/users',
    icon: UsersIcon,
    permission: 'users:access'
  }
]

// Hide entries the current user's role isn't granted (reactive to matrix edits).
const navItems = computed(() =>
  allNavItems.filter(
    item => !item.permission || permissions.has(sessionStore.currentUser, item.permission)
  )
)

const isActive = (item: { to: string }) => {
  return item.to === '/'
    ? route.path === '/'
    : route.path.startsWith(item.to)
}
</script>