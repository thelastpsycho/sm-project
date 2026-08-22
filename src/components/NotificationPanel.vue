<template>
  <Transition
    enter-active-class="transition duration-200 ease-out"
    enter-from-class="opacity-0"
    enter-to-class="opacity-100"
    leave-active-class="transition duration-150 ease-in"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <div v-if="open" class="fixed inset-0 z-[65]" role="dialog" aria-modal="true">
      <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" @click="emit('close')"></div>

      <Transition
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="translate-x-full"
        enter-to-class="translate-x-0"
        leave-active-class="transition duration-150 ease-in"
        leave-from-class="translate-x-0"
        leave-to-class="translate-x-full"
      >
        <aside
          v-if="open"
          class="absolute right-0 top-0 h-full w-full max-w-sm bg-white dark:bg-sm-card-dark shadow-2xl flex flex-col safe-area-top"
        >
          <div
            class="px-5 py-4 border-b border-gray-100 dark:border-white/10 flex items-center justify-between"
          >
            <div>
              <h2 class="text-lg font-bold text-gray-900 dark:text-white">Notifications</h2>
              <p class="text-xs text-gray-500 dark:text-gray-400">
                {{ alerts.length }} active · {{ store.unreadCount }} unread
              </p>
            </div>
            <button
              type="button"
              class="p-2 rounded-full text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
              aria-label="Close"
              @click="emit('close')"
            >
              <XMarkIcon class="w-5 h-5" />
            </button>
          </div>

          <div class="flex-1 overflow-y-auto">
            <div v-if="alerts.length === 0" class="px-5 py-16 text-center text-sm text-gray-400">
              You're all caught up. 🎉
            </div>

            <button
              v-for="a in alerts"
              :key="a.id"
              type="button"
              class="w-full text-left px-5 py-3 flex items-start gap-3 border-b border-gray-50 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
              @click="openDeal(a.dealId)"
            >
              <span class="mt-1.5 w-2 h-2 rounded-full shrink-0" :class="dotClass(a.severity)"></span>
              <div class="min-w-0 flex-1">
                <p class="text-sm text-gray-800 dark:text-gray-100">{{ a.message }}</p>
                <p class="text-[11px] text-gray-400 mt-0.5">
                  {{ typeLabel[a.type] }} · {{ formatDate(a.since) }}
                </p>
              </div>
            </button>
          </div>

          <div class="px-5 py-3 border-t border-gray-100 dark:border-white/10 space-y-2">
            <button
              v-if="canEnablePush"
              type="button"
              class="w-full flex items-center justify-center gap-2 text-xs font-medium text-sm-primary py-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors disabled:opacity-60"
              :disabled="enabling"
              @click="onEnablePush"
            >
              <BellAlertIcon class="w-4 h-4" />
              {{ enabling ? 'Enabling…' : 'Enable push notifications' }}
            </button>
            <p v-if="pushMessage" class="text-[11px] text-center text-gray-500 dark:text-gray-400">
              {{ pushMessage }}
            </p>
            <SmButton
              variant="ghost"
              size="sm"
              class="w-full"
              :disabled="store.unreadCount === 0"
              @click="store.markAllRead()"
            >
              Mark all as read
            </SmButton>
          </div>
        </aside>
      </Transition>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { XMarkIcon, BellAlertIcon } from '@heroicons/vue/24/outline'
import SmButton from '@/components/ui/SmButton.vue'
import { useNotificationsStore } from '@/stores/notifications'
import { formatDate } from '@/lib/crmUtils'
import { enablePush, isPushSupported } from '@/lib/push'
import type { AlertSeverity, AlertType } from '@/lib/crmAlerts'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: [] }>()

const router = useRouter()
const store = useNotificationsStore()
const alerts = computed(() => store.myAlerts)

// ---- Push enablement ----
const canEnablePush = ref(false)
const enabling = ref(false)
const pushMessage = ref('')

isPushSupported().then(ok => {
  const granted = typeof Notification !== 'undefined' && Notification.permission === 'granted'
  canEnablePush.value = ok && !granted
})

async function onEnablePush() {
  enabling.value = true
  pushMessage.value = ''
  const res = await enablePush()
  enabling.value = false
  if (res.ok) {
    canEnablePush.value = false
    pushMessage.value = 'Push notifications enabled on this device.'
  } else {
    pushMessage.value = res.reason ?? 'Could not enable notifications.'
  }
}

const typeLabel: Record<AlertType, string> = {
  untouched: 'Untouched',
  stuck: 'Stuck in stage',
  'action-due': 'Action due',
  'arrival-risk': 'Arrival at risk'
}

function dotClass(severity: AlertSeverity): string {
  return severity === 'danger'
    ? 'bg-red-500'
    : severity === 'warning'
      ? 'bg-amber-500'
      : 'bg-blue-500'
}

function openDeal(dealId: string) {
  emit('close')
  router.push({ path: '/crm', query: { deal: dealId } })
}

// Mark everything read a moment after the panel opens (user has seen the list).
watch(
  () => props.open,
  isOpen => {
    if (isOpen && store.unreadCount > 0) {
      setTimeout(() => store.markAllRead(), 800)
    }
  }
)
</script>
