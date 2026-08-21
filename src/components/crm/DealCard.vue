<template>
  <button
    type="button"
    @click="emit('open', deal)"
    class="w-full text-left bg-white dark:bg-sm-card-dark rounded-2xl border border-gray-100 dark:border-white/10 p-3 shadow-sm hover:shadow-md hover:scale-[1.01] active:scale-[0.99] transition-all"
  >
    <div class="flex items-start justify-between gap-2">
      <h4 class="font-semibold text-sm text-gray-900 dark:text-white leading-snug line-clamp-2">
        {{ deal.company }}
      </h4>
      <span :class="segmentBadgeClass" class="shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full">
        {{ deal.segment }}
      </span>
    </div>

    <div class="mt-1 flex items-center justify-between gap-2">
      <p class="text-xs font-medium text-sm-primary">
        {{ formatMoney(deal.totalRevenue, deal.currency) }}
      </p>
      <span :class="badgeClass" class="shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full">
        {{ badgeText }}
      </span>
    </div>

    <div class="mt-2 flex items-center gap-2 text-[11px] text-gray-500 dark:text-gray-400">
      <span class="truncate">{{ deal.ownerName || 'Unassigned' }}</span>
      <span v-if="deal.arrivalDate">· {{ formatDate(deal.arrivalDate) }}</span>
      <span
        v-if="deal.commentCount"
        class="ml-auto inline-flex items-center gap-0.5 shrink-0"
        :title="`${deal.commentCount} comment${deal.commentCount === 1 ? '' : 's'}`"
      >
        <ChatBubbleLeftRightIcon class="w-3.5 h-3.5" /> {{ deal.commentCount }}
      </span>
    </div>

    <div
      v-if="deal.nextAction"
      class="mt-2 flex items-center gap-1 text-[11px]"
      :class="overdue ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'"
    >
      <ClockIcon class="w-3.5 h-3.5 shrink-0" />
      <span class="truncate">{{ deal.nextAction }}</span>
      <span v-if="deal.actionDueDate">· {{ formatDate(deal.actionDueDate) }}</span>
    </div>
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { ClockIcon, ChatBubbleLeftRightIcon } from '@heroicons/vue/24/outline'
import type { Deal } from '@/types/crm'
import { formatMoney, formatDate, isOverdue } from '@/lib/crmUtils'

const props = withDefaults(defineProps<{ deal: Deal; badge?: 'stage' | 'status' }>(), {
  badge: 'stage'
})
const emit = defineEmits<{ open: [deal: Deal] }>()

const overdue = computed(() => isOverdue(props.deal.actionDueDate))

// The corner badge is context-aware: show stage when the board is grouped by
// status, and status when grouped by stage (avoids showing a redundant badge).
const badgeText = computed(() =>
  props.badge === 'status' ? props.deal.status : props.deal.stage ?? 'New'
)
const badgeClass = computed(() =>
  props.badge === 'status' ? statusBadgeClass.value : stageBadgeClass.value
)

const statusBadgeClass = computed(() => {
  switch (props.deal.status) {
    case 'Active':
      return 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300'
    case 'Idle':
      return 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300'
    case 'Win':
      return 'bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-300'
    case 'Lost':
      return 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-300'
    default:
      return 'bg-gray-100 text-gray-500 dark:bg-white/10 dark:text-gray-400'
  }
})

const segmentBadgeClass = computed(() => {
  switch (props.deal.segment) {
    case 'MICE':
      return 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300'
    case 'Wedding':
      return 'bg-pink-50 text-pink-600 dark:bg-pink-900/30 dark:text-pink-300'
    case 'Leisure':
      return 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300'
    default:
      return 'bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-300'
  }
})

const stageBadgeClass = computed(() => {
  switch (props.deal.stage) {
    case 'Proposal':
      return 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300'
    case 'Negotiation':
      return 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300'
    case 'Contract':
      return 'bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-300'
    case 'Confirmed':
      return 'bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-300'
    default: // 'New' or absent
      return 'bg-gray-100 text-gray-500 dark:bg-white/10 dark:text-gray-400'
  }
})
</script>
