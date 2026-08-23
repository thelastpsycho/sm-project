<template>
  <!-- Desktop navigation rail — 232px, hairline right edge. Hidden below lg,
       where the FAB sheet (BottomNav) takes over. -->
  <aside
    class="hidden lg:flex fixed inset-y-0 left-0 z-40 w-[232px] flex-col border-r border-sm-line dark:border-white/10 bg-white dark:bg-sm-card-dark"
  >
    <img src="/logo-theanvaya.svg" alt="The Anvaya" class="h-[22px] w-auto mx-6 mt-8 mb-7 dark:invert dark:brightness-0" />

    <nav class="flex-1 overflow-y-auto scr">
      <RouterLink
        v-for="item in navItems"
        :key="item.to"
        :to="item.to"
        class="flex items-center gap-3 px-6 py-2.5 transition-colors group"
      >
        <component
          :is="item.icon"
          class="w-[17px] h-[17px] shrink-0"
          :class="isActive(item) ? 'text-sm-primary' : 'text-sm-ink dark:text-gray-200'"
          stroke-width="1.5"
        />
        <span
          class="text-sm"
          :class="isActive(item)
            ? 'font-extrabold text-sm-primary'
            : 'font-semibold text-sm-ink dark:text-gray-200 group-hover:text-black dark:group-hover:text-white'"
        >{{ item.name }}</span>
      </RouterLink>
    </nav>

    <!-- Notifications + user footer -->
    <div class="border-t border-sm-hair dark:border-white/10 px-6 py-4 space-y-3">
      <button
        type="button"
        class="flex items-center gap-2 text-sm font-semibold text-sm-ink dark:text-gray-200 hover:text-black dark:hover:text-white transition-colors"
        @click="showNotifications = true"
      >
        <BellIcon class="w-[17px] h-[17px]" />
        Notifications
        <span
          v-if="notifications.unreadCount"
          class="min-w-[18px] h-[18px] px-1 rounded-full bg-sm-bad text-white text-[10px] font-bold flex items-center justify-center"
        >{{ notifications.unreadCount > 9 ? '9+' : notifications.unreadCount }}</span>
      </button>

      <div v-if="user" class="text-[13px] leading-snug text-sm-muted">
        <div class="font-bold text-sm-ink dark:text-gray-100">{{ user.name }}</div>
        <div class="text-sm-faint dark:text-gray-500">{{ user.position || roleLabel }}</div>
      </div>

      <button
        type="button"
        class="flex items-center gap-2 text-[13px] font-bold text-sm-bad hover:text-red-700 transition-colors"
        @click="handleLogout"
      >
        <ArrowRightOnRectangleIcon class="w-4 h-4" />
        Sign out
      </button>
    </div>
  </aside>

  <NotificationPanel :open="showNotifications" @close="showNotifications = false" />
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { BellIcon, ArrowRightOnRectangleIcon } from '@heroicons/vue/24/outline'
import NotificationPanel from '@/components/NotificationPanel.vue'
import { useSessionStore } from '@/stores/session'
import { useNotificationsStore } from '@/stores/notifications'
import { usePermissionsStore } from '@/stores/permissions'
import { NAV_ITEMS, isNavActive } from '@/lib/nav'

const route = useRoute()
const router = useRouter()
const sessionStore = useSessionStore()
const notifications = useNotificationsStore()
const permissions = usePermissionsStore()

const showNotifications = ref(false)
const user = computed(() => sessionStore.currentUser)
const roleLabel = computed(() => (user.value?.role ? `${user.value.role}` : ''))

const navItems = computed(() =>
  NAV_ITEMS.filter(
    item => !item.permission || permissions.has(sessionStore.currentUser, item.permission)
  )
)

const isActive = (item: (typeof NAV_ITEMS)[number]) => isNavActive(item, route.path)

const handleLogout = async () => {
  await sessionStore.logout()
  router.push('/login')
}
</script>
