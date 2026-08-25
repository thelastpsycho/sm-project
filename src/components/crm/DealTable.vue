<template>
  <div>
    <!-- Inbox-style feed: each deal reads like a message — sender avatar, a bold
         subject (company), a preview line (next action), and right-aligned value +
         due date. Deals needing action render "unread" (accent rail + bolder text). -->
    <button
      v-for="deal in deals"
      :key="deal.id"
      type="button"
      class="group w-full text-left flex items-start gap-3 px-1 py-3 border-b border-sm-hair dark:border-white/5 hover:bg-sm-surface dark:hover:bg-white/5 transition-colors"
      @click="emit('open', deal)"
    >
      <!-- Unread rail — only for deals that need attention -->
      <span
        class="mt-3 w-1.5 h-1.5 rounded-full shrink-0"
        :class="needsAction(deal) ? attentionDot(deal) : 'bg-transparent'"
      ></span>

      <!-- Sender avatar (owner initials) -->
      <div
        class="shrink-0 w-9 h-9 rounded-full grid place-items-center text-xsm font-bold bg-sm-surface dark:bg-white/10 text-sm-ink-soft dark:text-gray-200"
      >
        {{ initials(deal.ownerName) }}
      </div>

      <!-- Message body -->
      <div class="flex-1 min-w-0">
        <div class="flex items-baseline gap-3">
          <p
            class="flex-1 min-w-0 truncate text-smd text-sm-ink dark:text-white"
            :class="needsAction(deal) ? 'font-bold' : 'font-semibold'"
          >
            {{ deal.company }}
          </p>
          <span class="shrink-0 text-sm font-bold text-sm-ink dark:text-white">
            {{ formatMoney(deal.actualRevenue ?? deal.totalRevenue, deal.currency) }}
          </span>
        </div>

        <p
          class="mt-0.5 truncate text-sm"
          :class="needsAction(deal) ? 'text-sm-ink-soft dark:text-gray-200' : 'text-sm-muted'"
        >
          {{ deal.nextAction || 'No action noted' }}
        </p>

        <div class="mt-1 flex items-center gap-2 text-xs text-sm-muted">
          <span class="inline-flex items-center gap-1.5 shrink-0">
            <span class="w-1.5 h-1.5 rounded-full" :class="stageDot[deal.stage ?? 'New']"></span>
            {{ deal.stage ?? 'New' }}
          </span>
          <span aria-hidden="true" class="text-sm-faint">·</span>
          <span class="truncate">{{ deal.segment || '—' }}</span>
          <span aria-hidden="true" class="hidden sm:inline text-sm-faint">·</span>
          <span class="hidden sm:inline truncate">{{ deal.ownerName || 'Unassigned' }}</span>
          <span
            v-if="deal.actionDueDate"
            class="ml-auto shrink-0 font-semibold"
            :class="dueClass(deal)"
          >
            {{ dueLabel(deal) }}
          </span>
        </div>
      </div>
    </button>

    <div v-if="deals.length === 0" class="px-4 py-8 text-center text-sm text-sm-faint">
      No deals match these filters.
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Deal, DealStage } from '@/types/crm'
import { formatMoney, formatDate, dealOutcome } from '@/lib/crmUtils'

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

// Owner initials for the "sender" avatar (up to two letters).
function initials(name?: string): string {
  const n = (name || '').trim()
  if (!n) return '—'
  const parts = n.split(/\s+/)
  return (parts[0]![0]! + (parts[1]?.[0] ?? '')).toUpperCase()
}

// Local (not UTC) calendar day so "today"/"overdue" match the user's clock.
const now = new Date()
const todayIso = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
  .toISOString()
  .slice(0, 10)

const isOpen = (d: Deal) => dealOutcome(d) === 'open'
const isOverdue = (d: Deal) => isOpen(d) && !!d.actionDueDate && d.actionDueDate < todayIso
const isDueToday = (d: Deal) => isOpen(d) && d.actionDueDate === todayIso

// "Unread" = an open deal whose action is due today or already overdue.
function needsAction(d: Deal): boolean {
  return isOverdue(d) || isDueToday(d)
}
function attentionDot(d: Deal): string {
  return isOverdue(d) ? 'bg-sm-bad' : 'bg-sm-primary'
}
function dueClass(d: Deal): string {
  if (isOverdue(d)) return 'text-sm-bad'
  if (isDueToday(d)) return 'text-sm-primary'
  return 'text-sm-muted'
}

// Relative timestamp for near dates, absolute for anything further out.
function dueLabel(d: Deal): string {
  const due = d.actionDueDate
  if (!due) return ''
  if (due === todayIso) return 'Today'
  const days = Math.round(
    (new Date(due + 'T00:00:00').getTime() - new Date(todayIso + 'T00:00:00').getTime()) /
      86_400_000
  )
  if (days < 0) return `${-days}d late`
  if (days <= 7) return `in ${days}d`
  return formatDate(due)
}
</script>
