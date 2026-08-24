<template>
  <!-- Desktop navigation rail — 232px expanded / 72px collapsed (icons only),
       hairline right edge. Hidden below lg, where the FAB sheet (BottomNav)
       takes over. -->
  <aside
    class="hidden lg:flex fixed inset-y-0 left-0 z-40 flex-col border-r border-sm-line dark:border-white/10 bg-white dark:bg-sm-card-dark transition-[width] duration-200"
    :class="collapsed ? 'w-[72px]' : 'w-[232px]'"
  >
    <img
      src="/logo-theanvaya.svg"
      alt="The Anvaya"
      class="h-[22px] w-auto mt-8 mb-7 dark:invert dark:brightness-0"
      :class="collapsed ? 'mx-auto' : 'mx-6'"
    />

    <!-- Collapse toggle -->
    <button
      type="button"
      class="flex items-center py-2 text-sm-muted hover:text-sm-ink dark:hover:text-white transition-colors"
      :class="collapsed ? 'justify-center px-0' : 'gap-3 px-6'"
      :title="collapsed ? 'Expand' : 'Collapse'"
      @click="ui.toggleRail()"
    >
      <ChevronDoubleLeftIcon
        class="w-[17px] h-[17px] shrink-0 transition-transform duration-200"
        :class="collapsed ? 'rotate-180' : ''"
      />
      <span v-if="!collapsed" class="text-xsm font-semibold">Collapse</span>
    </button>

    <nav class="flex-1 overflow-y-auto scr">
      <RouterLink
        v-for="item in navItems"
        :key="item.to"
        :to="item.to"
        class="flex items-center py-2.5 transition-colors group"
        :class="collapsed ? 'justify-center px-0' : 'gap-3 px-6'"
        :title="collapsed ? item.name : undefined"
      >
        <component
          :is="item.icon"
          class="w-[17px] h-[17px] shrink-0"
          :class="isActive(item) ? 'text-sm-primary' : 'text-sm-ink dark:text-gray-200'"
          stroke-width="1.5"
        />
        <span
          v-if="!collapsed"
          class="text-sm"
          :class="isActive(item)
            ? 'font-extrabold text-sm-primary'
            : 'font-semibold text-sm-ink dark:text-gray-200 group-hover:text-black dark:group-hover:text-white'"
        >{{ item.name }}</span>
      </RouterLink>
    </nav>

    <!-- Notifications + user footer -->
    <div
      class="border-t border-sm-hair dark:border-white/10 py-4 space-y-3"
      :class="collapsed ? 'px-0' : 'px-6'"
    >
      <button
        type="button"
        class="relative flex items-center text-sm font-semibold text-sm-ink dark:text-gray-200 hover:text-black dark:hover:text-white transition-colors"
        :class="collapsed ? 'justify-center w-full' : 'gap-2'"
        :title="collapsed ? 'Notifications' : undefined"
        @click="showNotifications = true"
      >
        <BellIcon class="w-[17px] h-[17px] shrink-0" />
        <span v-if="!collapsed">Notifications</span>
        <span
          v-if="notifications.unreadCount"
          class="min-w-[18px] h-[18px] px-1 rounded-full bg-sm-bad text-white text-2xs font-bold flex items-center justify-center"
          :class="collapsed ? 'absolute -top-1 -right-0.5' : ''"
        >{{ notifications.unreadCount > 9 ? '9+' : notifications.unreadCount }}</span>
      </button>

      <div v-if="user && !collapsed" class="text-xsm leading-snug text-sm-muted">
        <div class="font-bold text-sm-ink dark:text-gray-100">{{ user.name }}</div>
        <div class="text-sm-faint dark:text-gray-500">{{ user.position || roleLabel }}</div>
      </div>

      <button
        type="button"
        class="flex items-center text-xsm font-bold text-sm-bad hover:text-red-700 transition-colors"
        :class="collapsed ? 'justify-center w-full' : 'gap-2'"
        :title="collapsed ? 'Sign out' : undefined"
        @click="handleLogout"
      >
        <ArrowRightOnRectangleIcon class="w-4 h-4 shrink-0" />
        <span v-if="!collapsed">Sign out</span>
      </button>
    </div>
  </aside>

  <NotificationPanel :open="showNotifications" @close="showNotifications = false" />
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { BellIcon, ArrowRightOnRectangleIcon, ChevronDoubleLeftIcon } from '@heroicons/vue/24/outline'
import NotificationPanel from '@/components/NotificationPanel.vue'
import { useSessionStore } from '@/stores/session'
import { useNotificationsStore } from '@/stores/notifications'
import { usePermissionsStore } from '@/stores/permissions'
import { useUiStore } from '@/stores/ui'
import { NAV_ITEMS, isNavActive } from '@/lib/nav'

const route = useRoute()
const router = useRouter()
const sessionStore = useSessionStore()
const notifications = useNotificationsStore()
const permissions = usePermissionsStore()
const ui = useUiStore()

const showNotifications = ref(false)
const collapsed = computed(() => ui.railCollapsed)
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
