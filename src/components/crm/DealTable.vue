<template>
  <div>
    <!-- Desktop table header -->
    <div class="hidden sm:flex px-1 py-3 border-b border-sm-line dark:border-white/10 sm-eyebrow">
      <span class="flex-[3]">Company</span>
      <span class="flex-[1.1]">Stage</span>
      <span class="flex-1">Segment</span>
      <span class="flex-[1.4]">Owner</span>
      <span class="flex-[1.7]">Next action</span>
      <span class="flex-[1.2] text-right">Value</span>
    </div>
    <button
      v-for="deal in deals"
      :key="deal.id"
      type="button"
      class="w-full text-left px-1 py-3.5 border-b border-sm-hair dark:border-white/5 hover:bg-sm-surface dark:hover:bg-white/5 transition-colors flex items-center gap-3"
      @click="emit('open', deal)"
    >
      <!-- Company (+ mobile meta) -->
      <div class="flex-[3] min-w-0 flex items-center gap-2.5">
        <span class="w-1.5 h-1.5 rounded-full shrink-0" :class="stageDot[deal.stage ?? 'New']"></span>
        <div class="min-w-0">
          <p class="text-smd font-bold text-sm-ink dark:text-white truncate">{{ deal.company }}</p>
          <p class="sm:hidden text-xs text-sm-muted truncate">
            {{ deal.stage ?? 'New' }} · {{ deal.segment }} · {{ deal.ownerName || 'Unassigned' }}
          </p>
        </div>
      </div>
      <span class="hidden sm:block flex-[1.1] text-sm text-sm-ink-soft dark:text-gray-300 truncate">{{ deal.stage ?? 'New' }}</span>
      <span class="hidden sm:block flex-1 text-sm text-sm-ink-soft dark:text-gray-300 truncate">{{ deal.segment }}</span>
      <span class="hidden sm:block flex-[1.4] text-sm text-sm-ink-soft dark:text-gray-300 truncate">{{ deal.ownerName || 'Unassigned' }}</span>
      <span class="hidden sm:block flex-[1.7] text-sm text-sm-ink-soft dark:text-gray-300 truncate pr-3">{{ deal.nextAction || '—' }}</span>
      <span class="flex-none sm:flex-[1.2] text-sm font-bold text-sm-ink dark:text-white text-right shrink-0">
        {{ formatMoney(deal.actualRevenue ?? deal.totalRevenue, deal.currency) }}
      </span>
    </button>
    <div v-if="deals.length === 0" class="px-4 py-8 text-center text-sm text-sm-faint">
      No deals match these filters.
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Deal, DealStage } from '@/types/crm'
import { formatMoney } from '@/lib/crmUtils'

defineProps<{ deals: Deal[] }>()
const emit = defineEmits<{ open: [deal: Deal] }>()

// Stage dots mirror the board/queue so the whole pipeline reads consistently.
const stageDot: Record<DealStage, string> = {
  New: 'bg-sm-muted',
  Proposal: 'bg-sm-primary',
  Negotiation: 'bg-sm-warn',
  Contract: 'bg-sm-wed',
  Confirmed: 'bg-sm-won',
  Lost: 'bg-sm-bad'
}
</script>
