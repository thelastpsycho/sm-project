<template>
  <!-- Mobile navigation. Hidden on lg+, where SideRail takes over. -->
  <div class="lg:hidden">
    <!-- Notification bell (bottom-left, opposite the nav FAB) -->
    <button
      type="button"
      class="fixed bottom-6 left-6 z-50 w-11 h-11 rounded-full bg-white dark:bg-sm-card-dark border border-sm-line dark:border-white/10 shadow-lg shadow-black/5 flex items-center justify-center text-sm-ink dark:text-gray-200 active:scale-95 transition-all"
      aria-label="Notifications"
      @click="showNotifications = true"
    >
      <BellIcon class="w-5 h-5" />
      <span
        v-if="notifications.unreadCount"
        class="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-sm-bad text-white text-2xs font-bold flex items-center justify-center"
      >
        {{ notifications.unreadCount > 9 ? '9+' : notifications.unreadCount }}
      </span>
    </button>

    <NotificationPanel :open="showNotifications" @close="showNotifications = false" />

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
        class="fixed inset-0 z-40 bg-sm-ink/30 backdrop-blur-[2px]"
        @click="isOpen = false"
      ></div>
    </Transition>

    <!-- Bottom sheet -->
    <Transition
      enter-active-class="transition duration-300 ease-out"
      enter-from-class="translate-y-full"
      enter-to-class="translate-y-0"
      leave-active-class="transition duration-200 ease-in"
      leave-from-class="translate-y-0"
      leave-to-class="translate-y-full"
    >
      <div
        v-if="isOpen"
        class="fixed inset-x-0 bottom-0 z-50 bg-white dark:bg-sm-card-dark rounded-t-[20px] pt-2.5 pb-6 safe-area-bottom max-h-[80vh] overflow-y-auto scr"
      >
        <div class="w-9 h-1 rounded-full bg-sm-line dark:bg-white/15 mx-auto mt-1.5 mb-3.5"></div>

        <RouterLink
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          class="flex items-center gap-3.5 px-6 py-3.5 border-t border-sm-hair dark:border-white/5"
          @click="isOpen = false"
        >
          <component
            :is="item.icon"
            class="w-[19px] h-[19px] shrink-0"
            :class="isActive(item) ? 'text-sm-primary' : 'text-sm-ink dark:text-gray-200'"
            stroke-width="1.5"
          />
          <span
            class="text-base"
            :class="isActive(item) ? 'font-extrabold text-sm-primary' : 'font-semibold text-sm-ink dark:text-gray-200'"
          >{{ item.name }}</span>
        </RouterLink>

        <button
          type="button"
          class="w-full flex items-center gap-3.5 px-6 py-3.5 border-t border-sm-hair dark:border-white/5 text-left"
          @click="handleLogout"
        >
          <ArrowRightOnRectangleIcon class="w-[19px] h-[19px] text-sm-bad" stroke-width="1.5" />
          <span class="text-base font-semibold text-sm-bad">Sign out</span>
        </button>
      </div>
    </Transition>

    <!-- FAB trigger -->
    <button
      class="fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full bg-sm-ink dark:bg-white text-white dark:text-sm-ink shadow-xl shadow-black/20 flex items-center justify-center active:scale-90 transition-all"
      @click="isOpen = !isOpen"
    >
      <Transition
        mode="out-in"
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="rotate-90 opacity-0"
        enter-to-class="rotate-0 opacity-100"
        leave-active-class="transition duration-150 ease-in"
        leave-from-class="rotate-0 opacity-100"
        leave-to-class="-rotate-90 opacity-0"
      >
        <XMarkIcon v-if="isOpen" class="w-5 h-5" stroke-width="1.75" />
        <Bars3Icon v-else class="w-5 h-5" stroke-width="1.75" />
      </Transition>
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { useSessionStore } from '@/stores/session'
import {
  Bars3Icon,
  XMarkIcon,
  BellIcon,
  ArrowRightOnRectangleIcon
} from '@heroicons/vue/24/outline'
import NotificationPanel from '@/components/NotificationPanel.vue'
import { useNotificationsStore } from '@/stores/notifications'
import { usePermissionsStore } from '@/stores/permissions'
import { NAV_ITEMS, isNavActive } from '@/lib/nav'

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

// Hide entries the current user's role isn't granted (reactive to matrix edits).
const navItems = computed(() =>
  NAV_ITEMS.filter(
    item => !item.permission || permissions.has(sessionStore.currentUser, item.permission)
  )
)

const isActive = (item: (typeof NAV_ITEMS)[number]) => isNavActive(item, route.path)
</script>
