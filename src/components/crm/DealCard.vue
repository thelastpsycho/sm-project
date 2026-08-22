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
        ref="stageChip"
        :class="[aging.class, locked ? '' : 'cursor-pointer hover:ring-1 hover:ring-inset hover:ring-current/40']"
        class="shrink-0 inline-flex items-center gap-0.5 text-[10px] font-medium px-2 py-0.5 rounded-full select-none transition-shadow"
        :title="locked ? aging.title : 'Change stage'"
        role="button"
        @click.stop.prevent="toggleMenu"
      >
        {{ aging.label }}
        <ChevronUpDownIcon v-if="!locked" class="w-3 h-3 -mr-0.5 opacity-60" />
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

    <!-- Quick stage picker (teleported so the board's horizontal scroll can't clip it) -->
    <Teleport to="body">
      <template v-if="menuOpen">
        <div class="fixed inset-0 z-40" @click.stop="closeMenu" @contextmenu.prevent="closeMenu"></div>
        <div
          class="fixed z-50 w-40 rounded-xl border border-gray-100 dark:border-white/10 bg-white dark:bg-sm-card-dark shadow-lg py-1"
          :style="menuStyle"
        >
          <button
            v-for="s in DEAL_STAGES"
            :key="s"
            type="button"
            @click.stop="pick(s)"
            class="w-full flex items-center gap-2 px-3 py-1.5 text-left text-xs transition-colors hover:bg-gray-50 dark:hover:bg-white/5"
            :class="s === currentStage ? 'font-semibold text-sm-primary' : 'text-gray-700 dark:text-gray-200'"
          >
            <span class="w-2 h-2 rounded-full shrink-0" :class="stageDot[s]"></span>
            {{ s }}
            <CheckIcon v-if="s === currentStage" class="w-3.5 h-3.5 ml-auto shrink-0" />
          </button>
        </div>
      </template>
    </Teleport>
  </button>
</template>

<script setup lang="ts">
import { computed, ref, watch, onUnmounted } from 'vue'
import {
  ClockIcon,
  ChatBubbleLeftRightIcon,
  LockClosedIcon,
  ChevronUpDownIcon,
  CheckIcon
} from '@heroicons/vue/24/outline'
import { DEAL_STAGES } from '@/types/crm'
import type { Deal, DealStage } from '@/types/crm'
import { formatMoney, formatDate, isOverdue, dealOutcome } from '@/lib/crmUtils'
import { DEFAULT_ALERT_CONFIG } from '@/lib/crmAlerts'

const props = withDefaults(defineProps<{ deal: Deal; now?: Date; locked?: boolean }>(), {
  locked: false
})
const emit = defineEmits<{ open: [deal: Deal]; move: [payload: { deal: Deal; stage: DealStage }] }>()

const overdue = computed(() => isOverdue(props.deal.actionDueDate))
const currentStage = computed<DealStage>(() => (props.deal.stage ?? 'New') as DealStage)

// Column dots, mirrored from the board so the picker reads the same as the columns.
const stageDot: Record<DealStage, string> = {
  New: 'bg-gray-400',
  Proposal: 'bg-blue-500',
  Negotiation: 'bg-amber-500',
  Contract: 'bg-purple-500',
  Confirmed: 'bg-green-500',
  Lost: 'bg-red-500'
}

// ---- Quick stage picker ----
const stageChip = ref<HTMLElement>()
const menuOpen = ref(false)
const menuStyle = ref<Record<string, string>>({})

function closeMenu() {
  menuOpen.value = false
}

function toggleMenu() {
  if (props.locked) return
  if (menuOpen.value) return closeMenu()
  const el = stageChip.value
  if (!el) return
  const r = el.getBoundingClientRect()
  const width = 160
  const height = DEAL_STAGES.length * 32 + 8
  // Right-align to the chip; flip above when there isn't room below.
  const left = Math.min(Math.max(8, r.right - width), window.innerWidth - width - 8)
  const top = r.bottom + height + 8 > window.innerHeight ? r.top - height - 4 : r.bottom + 4
  menuStyle.value = { left: `${left}px`, top: `${Math.max(8, top)}px` }
  menuOpen.value = true
}

function pick(stage: DealStage) {
  closeMenu()
  if (stage === currentStage.value) return
  emit('move', { deal: props.deal, stage })
}

// The menu is fixed-positioned, so dismiss it if the viewport shifts underneath it.
function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') closeMenu()
}
watch(menuOpen, open => {
  const fn = open ? 'addEventListener' : 'removeEventListener'
  document[fn]('keydown', onKey as EventListener)
  window[fn]('scroll', closeMenu, true)
  window[fn]('resize', closeMenu)
})
onUnmounted(() => {
  document.removeEventListener('keydown', onKey as EventListener)
  window.removeEventListener('scroll', closeMenu, true)
  window.removeEventListener('resize', closeMenu)
})

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
