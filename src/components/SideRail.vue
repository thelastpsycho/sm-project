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
      width="1558"
      height="410"
      class="h-[22px] w-auto aspect-[1558/410] mt-8 mb-7 dark:invert dark:brightness-0"
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
      <template v-for="item in navItems" :key="item.to">
        <!-- Grouped item (e.g. Pipeline): the row navigates, the arrow expands its children. -->
        <div v-if="item.children?.length">
          <div class="flex items-center" :class="collapsed ? 'justify-center px-0' : 'px-6'">
            <RouterLink
              :to="item.to"
              class="flex-1 min-w-0 flex items-center py-2.5 transition-colors group"
              :class="collapsed ? 'justify-center' : 'gap-3'"
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
                class="text-sm truncate"
                :class="isActive(item)
                  ? 'font-extrabold text-sm-primary'
                  : 'font-semibold text-sm-ink dark:text-gray-200 group-hover:text-black dark:group-hover:text-white'"
              >{{ item.name }}</span>
            </RouterLink>
            <button
              v-if="!collapsed"
              type="button"
              class="p-2 -mr-2 text-sm-faint hover:text-sm-ink dark:hover:text-white transition-colors shrink-0"
              :aria-label="isExpanded(item) ? `Collapse ${item.name}` : `Expand ${item.name}`"
              @click="toggleGroup(item)"
            >
              <ChevronRightIcon
                class="w-3.5 h-3.5 transition-transform duration-150"
                :class="isExpanded(item) ? 'rotate-90' : ''"
              />
            </button>
          </div>
          <div v-if="!collapsed && isExpanded(item)" class="pb-1">
            <RouterLink
              v-for="child in item.children"
              :key="child.to"
              :to="child.to"
              class="flex items-center gap-2.5 py-2 pl-[2.6rem] pr-6 transition-colors group"
            >
              <span
                class="w-1 h-1 rounded-full shrink-0"
                :class="isActive(child) ? 'bg-sm-primary' : 'bg-sm-faint'"
              ></span>
              <span
                class="text-xsm truncate"
                :class="isActive(child)
                  ? 'font-extrabold text-sm-primary'
                  : 'font-semibold text-sm-muted group-hover:text-sm-ink dark:group-hover:text-white'"
              >{{ child.name }}</span>
            </RouterLink>
          </div>
        </div>

        <!-- Plain item -->
        <RouterLink
          v-else
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
      </template>
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
import { BellIcon, ArrowRightOnRectangleIcon, ChevronDoubleLeftIcon, ChevronRightIcon } from '@heroicons/vue/24/outline'
import NotificationPanel from '@/components/NotificationPanel.vue'
import { useSessionStore } from '@/stores/session'
import { useNotificationsStore } from '@/stores/notifications'
import { usePermissionsStore } from '@/stores/permissions'
import { useUiStore } from '@/stores/ui'
import { NAV_ITEMS, isNavActive } from '@/lib/nav'
import type { NavItem } from '@/lib/nav'

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

const allowed = (item: Pick<NavItem, 'permission'>) =>
  !item.permission || permissions.has(sessionStore.currentUser, item.permission)

// Filters both top-level items and their children; a group with no accessible
// children falls back to a plain link (no dangling empty arrow).
const navItems = computed(() =>
  NAV_ITEMS.filter(allowed).map(item => {
    if (!item.children?.length) return item
    const children = item.children.filter(allowed)
    return children.length ? { ...item, children } : { ...item, children: undefined }
  })
)

const isActive = (item: (typeof NAV_ITEMS)[number]) => isNavActive(item, route.path)

// Expand state per group (keyed by `to`). Defaults to expanded when the active route
// is one of its children, but a manual toggle overrides that until the group changes.
const expandedOverride = ref<Record<string, boolean>>({})
function isExpanded(item: NavItem): boolean {
  if (item.to in expandedOverride.value) return expandedOverride.value[item.to]!
  return item.children?.some(child => isActive(child)) ?? false
}
function toggleGroup(item: NavItem) {
  expandedOverride.value = { ...expandedOverride.value, [item.to]: !isExpanded(item) }
}

const handleLogout = async () => {
  await sessionStore.logout()
  router.push('/login')
}
</script>
