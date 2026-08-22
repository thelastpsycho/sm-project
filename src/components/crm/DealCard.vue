<template>
  <button
    type="button"
    @click="emit('open', deal)"
    class="w-full text-left bg-white dark:bg-sm-card-dark rounded-2xl border border-gray-100 dark:border-white/10 p-3 shadow-sm hover:shadow-md hover:scale-[1.01] active:scale-[0.99] transition-all"
    :class="{ 'drag-locked cursor-pointer': locked }"
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
        {{ formatMoney(deal.actualRevenue ?? deal.totalRevenue, deal.currency) }}
      </p>
      <span
        v-if="aging"
        :class="aging.class"
        class="shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full"
        :title="aging.title"
      >
        {{ aging.label }}
      </span>
    </div>

    <div class="mt-2 flex items-center gap-2 text-[11px] text-gray-500 dark:text-gray-400">
      <LockClosedIcon v-if="locked" class="w-3 h-3 shrink-0 text-gray-400" title="You can only edit your own leads" />
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
import { ClockIcon, ChatBubbleLeftRightIcon, LockClosedIcon } from '@heroicons/vue/24/outline'
import type { Deal, DealStage } from '@/types/crm'
import { formatMoney, formatDate, isOverdue, dealOutcome } from '@/lib/crmUtils'
import { DEFAULT_ALERT_CONFIG } from '@/lib/crmAlerts'

const props = withDefaults(defineProps<{ deal: Deal; now?: Date; locked?: boolean }>(), {
  locked: false
})
const emit = defineEmits<{ open: [deal: Deal] }>()

const overdue = computed(() => isOverdue(props.deal.actionDueDate))

// Corner chip: for open deals show time-in-stage colored by the stage SLA (mirrors
// the "stuck" alert severity); for terminal deals show the Won/Lost outcome.
const aging = computed<{ label: string; class: string; title: string } | null>(() => {
  const outcome = dealOutcome(props.deal)
  if (outcome === 'won')
    return { label: 'Won', class: 'bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-300', title: 'Confirmed / won' }
  if (outcome === 'lost')
    return { label: 'Lost', class: 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-300', title: props.deal.reasonWonLost || 'Lost' }

  const enteredIso = props.deal.stageEnteredAt ?? props.deal.createdAt
  const entered = enteredIso instanceof Date ? enteredIso : new Date(enteredIso)
  if (isNaN(entered.getTime())) return null
  const now = props.now ?? new Date()
  const days = Math.floor((now.getTime() - entered.getTime()) / 86_400_000)
  const stage = (props.deal.stage ?? 'New') as DealStage
  const sla = DEFAULT_ALERT_CONFIG.stageSlaDays[stage]
  let cls = 'bg-gray-100 text-gray-500 dark:bg-white/10 dark:text-gray-400'
  if (sla != null) {
    if (days >= sla * 2) cls = 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-300'
    else if (days >= sla) cls = 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300'
    else cls = 'bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-300'
  }
  return { label: `${days}d in ${stage}`, class: cls, title: `In ${stage} for ${days} day${days === 1 ? '' : 's'}` }
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
</script>
