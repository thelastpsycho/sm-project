<template>
  <div class="min-h-screen bg-white dark:bg-sm-bg-dark">
    <div class="px-6 lg:px-10 pt-10 lg:pt-8 pb-32">
    <!-- Header -->
    <div class="flex items-start justify-between gap-4">
      <div class="min-w-0">
        <!-- Queue view: action-first hero -->
        <template v-if="view === 'queue'">
          <span class="sm-eyebrow">{{ todayLabel }}</span>
          <h1 class="sm-display text-display leading-[1.08] mt-2.5">
            {{ queueCount }} {{ queueCount === 1 ? 'deal' : 'deals' }}<br />{{ queueCount === 1 ? 'needs' : 'need' }} you today
          </h1>
          <p class="mt-3 text-sm text-sm-muted">
            {{ formatMoney(atRiskTotal) }} at risk<span v-if="overdueCount"> · {{ overdueCount }} overdue</span>
          </p>
        </template>
        <!-- Board / list: pipeline value -->
        <template v-else>
          <span class="sm-eyebrow">Pipeline</span>
          <h1 class="sm-display text-display mt-2">
            {{ formatMoney(pipelineTotal) }}
            <span class="text-sm-faint font-semibold">/ {{ filteredDeals.length }}<span v-if="filteredDeals.length !== store.deals.length"> of {{ store.deals.length }}</span></span>
          </h1>
        </template>
      </div>
      <div class="flex items-center gap-4 shrink-0">
        <router-link
          to="/crm/report"
          class="hidden sm:inline text-sm font-bold text-sm-muted hover:text-sm-ink dark:hover:text-white transition-colors"
        >
          Report
        </router-link>
        <SmButton v-if="canCreate" size="sm" @click="openCreate">
          <PlusIcon class="w-4 h-4 mr-1" /> New deal
        </SmButton>
      </div>
    </div>

    <!-- Queue view: filter chips -->
    <div v-if="view === 'queue'" class="scr mt-5 -mx-6 lg:-mx-10 px-6 lg:px-10 flex gap-2 overflow-x-auto">
      <button
        v-for="c in queueChips"
        :key="c.key"
        @click="queueChip = c.key"
        class="whitespace-nowrap text-xsm font-bold px-3.5 py-1.5 rounded-full border transition-colors"
        :class="queueChip === c.key
          ? 'bg-sm-ink text-white border-sm-ink dark:bg-white dark:text-sm-ink dark:border-white'
          : 'border-sm-line text-sm-ink dark:border-white/15 dark:text-gray-200'"
      >
        {{ c.label }}<span v-if="c.count != null" :class="queueChip === c.key ? 'opacity-70' : 'text-sm-faint'"> {{ c.count }}</span>
      </button>
    </div>

    <!-- Board / list: inline editorial stats -->
    <div v-else class="mt-6 flex flex-wrap gap-x-10 gap-y-4">
      <div v-for="s in summaryTiles" :key="s.key">
        <div class="sm-eyebrow">{{ s.label }} <span class="text-sm-faint">· {{ s.count }}</span></div>
        <div class="mt-1 text-md font-bold" :class="s.textClass">{{ formatMoney(s.value) }}</div>
      </div>
    </div>

    <!-- Controls: view toggle + search + filter button -->
    <div class="mt-6 flex items-center gap-3">
      <div class="inline-flex rounded-full border border-sm-line dark:border-white/15 p-0.5">
        <button
          v-for="v in (['queue', 'board', 'list'] as const)"
          :key="v"
          @click="view = v"
          class="px-3.5 py-1.5 rounded-full text-xsm font-bold capitalize transition-colors"
          :class="view === v ? 'bg-sm-ink text-white dark:bg-white dark:text-sm-ink' : 'text-sm-muted'"
        >
          {{ v }}
        </button>
      </div>

      <div class="relative flex-1 flex items-center gap-2 border-b border-sm-line dark:border-white/15 pb-2 focus-within:border-sm-ink dark:focus-within:border-white transition-colors">
        <MagnifyingGlassIcon class="w-4 h-4 text-sm-muted shrink-0" />
        <input
          v-model="filters.search"
          type="search"
          placeholder="Search company, notes, action…"
          class="w-full bg-transparent border-0 p-0 text-sm text-sm-ink dark:text-white placeholder:text-sm-faint focus:outline-none focus:ring-0"
        />
      </div>

      <button
        @click="showFilters = !showFilters"
        class="relative inline-flex items-center gap-1.5 text-xsm font-bold transition-colors"
        :class="activeFilterCount ? 'text-sm-primary' : 'text-sm-muted hover:text-sm-ink dark:hover:text-white'"
      >
        <FunnelIcon class="w-4 h-4" />
        <span class="hidden sm:inline">Filters</span>
        <span
          v-if="activeFilterCount"
          class="ml-0.5 inline-flex items-center justify-center min-w-[18px] h-[18px] text-eyebrow rounded-full bg-sm-primary text-white"
        >
          {{ activeFilterCount }}
        </span>
      </button>
    </div>

    <!-- Filter panel -->
    <div
      v-if="showFilters"
      class="mt-4 rounded-2xl border border-sm-line dark:border-white/10 p-3 space-y-3 animate-fade-in-up"
    >
      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <SmSelect v-model="filters.outcome" :options="outcomeFilterOptions" size="sm" />
        <SmSelect v-model="filters.stage" :options="stageFilterOptions" size="sm" />
        <SmSelect v-model="filters.owner" :options="ownerFilterOptions" size="sm" />
        <SmSelect v-model="filters.segment" :options="segmentFilterOptions" size="sm" />
        <SmSelect v-model="filters.leadSource" :options="sourceFilterOptions" size="sm" />
        <SmSelect v-model="filters.reason" :options="reasonFilterOptions" size="sm" />
      </div>

      <!-- Date range + revenue range -->
      <div class="grid grid-cols-2 sm:grid-cols-5 gap-3 items-end">
        <SmSelect v-model="filters.dateField" :options="dateFieldOptions" label="Date field" size="sm" />
        <SmInput v-model="filters.dateFrom" type="date" label="From" size="sm" />
        <SmInput v-model="filters.dateTo" type="date" label="To" size="sm" />
        <SmInput
          :model-value="filters.minRevenue ?? ''"
          type="number"
          label="Min rev."
          placeholder="0"
          size="sm"
          @update:model-value="v => (filters.minRevenue = toNum(v))"
        />
        <SmInput
          :model-value="filters.maxRevenue ?? ''"
          type="number"
          label="Max rev."
          placeholder="Any"
          size="sm"
          @update:model-value="v => (filters.maxRevenue = toNum(v))"
        />
      </div>

      <div class="flex justify-end">
        <SmButton variant="ghost" size="sm" :disabled="!activeFilterCount" @click="clearFilters">
          Clear all
        </SmButton>
      </div>
    </div>

    <!-- Empty state -->
    <div v-if="store.deals.length === 0 && !store.loading" class="text-center py-16">
      <p class="text-sm-muted">No deals yet.</p>
    </div>

    <!-- Loading — skeleton rows mirroring the deal list shape -->
    <div v-else-if="store.loading" class="mt-6">
      <div
        v-for="n in 7"
        :key="n"
        class="flex items-start gap-3 py-3.5 border-t border-sm-hair dark:border-white/5"
      >
        <div class="flex-1 min-w-0 space-y-2">
          <SmSkeleton class="h-3.5 w-40 max-w-[45%]" />
          <SmSkeleton class="h-3 w-56 max-w-[70%]" />
          <SmSkeleton class="h-2.5 w-32 max-w-[38%]" />
        </div>
        <SmSkeleton class="h-4 w-12 shrink-0" />
      </div>
    </div>

    <!-- Action queue — deals grouped by urgency (Overdue / Stuck past SLA / Due today).
         Desktop: queue rail on the left, full deals table on the right. -->
    <template v-else-if="view === 'queue'">
      <div class="mt-6 lg:flex lg:items-start">
        <!-- Queue rail -->
        <div class="lg:w-[380px] lg:shrink-0 lg:pr-8 lg:border-r lg:border-sm-line lg:dark:border-white/10">
          <div v-if="!visibleQueueGroups.length" class="py-16 text-center text-sm text-sm-muted">
            Nothing needs you right now. 🎉
          </div>
          <div v-for="g in visibleQueueGroups" :key="g.key">
            <div class="pt-4 pb-1.5 sm-eyebrow" :class="g.colorClass">{{ g.title }}</div>
            <div
              v-for="deal in g.items"
              :key="deal.id"
              class="flex items-start gap-3 py-3.5 border-t border-sm-hair dark:border-white/5"
            >
              <button type="button" class="flex-1 min-w-0 text-left" @click="openEdit(deal)">
                <div class="text-smd font-bold tracking-[-0.01em] text-sm-ink dark:text-white truncate">{{ deal.company }}</div>
                <div class="mt-1 text-xsm text-sm-ink dark:text-gray-200 truncate">{{ deal.nextAction || 'No action noted' }}</div>
                <div class="mt-1 text-xs text-sm-muted truncate">
                  {{ deal.stage ?? 'New' }} · {{ formatMoney(deal.actualRevenue ?? deal.totalRevenue, deal.currency) }} · {{ deal.ownerName || 'Unassigned' }}
                </div>
              </button>
              <div class="flex flex-col items-end gap-2 shrink-0">
                <span class="text-xs font-bold" :class="g.flagClass">{{ deal.queueFlag }}</span>
                <button
                  v-if="canAdvance(deal)"
                  type="button"
                  class="text-xs font-bold text-sm-primary hover:underline"
                  @click="advance(deal)"
                >Advance</button>
              </div>
            </div>
          </div>
          <div class="h-4"></div>
        </div>

        <!-- Full deals table (desktop only) -->
        <div class="hidden lg:block flex-1 min-w-0 lg:pl-8">
          <div class="sm-eyebrow pb-2">All deals · {{ filteredDeals.length }}</div>
          <DealTable :deals="filteredDeals" @open="openEdit" />
        </div>
      </div>
    </template>

    <!-- Kanban board (single pipeline axis: stages) -->
    <template v-else-if="view === 'board'">
      <div class="mt-5 flex overflow-x-auto scr pb-4 -mx-6 lg:-mx-10">
        <div
          v-for="col in boardColumns"
          :key="col"
          class="shrink-0 w-[300px] px-6 lg:px-8 border-r border-sm-hair dark:border-white/5 last:border-r-0"
        >
          <div class="flex items-baseline gap-2 pb-3">
            <span class="w-1.5 h-1.5 rounded-full" :class="stageDot[col]"></span>
            <h3 class="sm-eyebrow !text-sm-ink dark:!text-white">{{ col }}</h3>
            <span class="text-xs text-sm-muted">{{ board[col]?.length ?? 0 }}</span>
          </div>
          <draggable
            :list="board[col]"
            group="deals"
            item-key="id"
            :animation="150"
            :delay="140"
            :delay-on-touch-only="true"
            :touch-start-threshold="6"
            filter=".drag-locked"
            :prevent-on-filter="false"
            ghost-class="drag-ghost"
            drag-class="drag-active"
            class="min-h-[4rem] transition-colors"
            @start="dragging = true"
            @end="onDragEnd"
            @change="onDragChange($event, col)"
          >
            <template #item="{ element }">
              <DealCard
                :deal="element"
                :now="now"
                :locked="!editable(element)"
                @open="openEdit"
                @move="onQuickMove"
              />
            </template>
          </draggable>
          <p
            v-if="!board[col]?.length"
            class="text-xs text-sm-faint dark:text-gray-600 py-4 pointer-events-none"
          >
            No deals — drop here
          </p>
        </div>
      </div>
    </template>

    <!-- List view -->
    <div v-else class="mt-5">
      <DealTable :deals="filteredDeals" @open="openEdit" />
    </div>

    <DealModal
      :is-open="modalOpen"
      :deal="editing"
      :saving="saving"
      @close="modalOpen = false"
      @submit="onSubmit"
      @delete="onDelete"
    />

    <DealOutcomePrompt
      :open="outcomePrompt.open"
      :mode="outcomePrompt.mode"
      :deal="outcomePrompt.deal"
      :loading="outcomePrompt.loading"
      @confirm="onOutcomeConfirm"
      @cancel="onOutcomeCancel"
    />

    <ConfirmDialog
      :open="confirmDialog.open"
      :title="confirmDialog.title"
      :message="confirmDialog.message"
      :confirm-text="confirmDialog.confirmText"
      :danger="confirmDialog.danger"
      :loading="confirmDialog.loading"
      @confirm="acceptConfirm"
      @cancel="cancelConfirm"
    />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import draggable from 'vuedraggable'
import { PlusIcon, MagnifyingGlassIcon, FunnelIcon, ChartBarIcon } from '@heroicons/vue/24/outline'
import SmButton from '@/components/ui/SmButton.vue'
import SmSelect from '@/components/ui/SmSelect.vue'
import SmInput from '@/components/ui/SmInput.vue'
import SmSkeleton from '@/components/ui/SmSkeleton.vue'
import DealCard from '@/components/crm/DealCard.vue'
import DealTable from '@/components/crm/DealTable.vue'
import DealModal from '@/components/crm/DealModal.vue'
import DealOutcomePrompt from '@/components/crm/DealOutcomePrompt.vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import { useCrmStore } from '@/stores/crm'
import { DEAL_STAGES } from '@/types/crm'
import type { Deal, DealStage, NewDeal } from '@/types/crm'
import { formatMoney, canDeleteDeals, canEditDeal, canCreateDeal, dealOutcome, isDealIdle, wonRevenue } from '@/lib/crmUtils'
import { DEFAULT_ALERT_CONFIG } from '@/lib/crmAlerts'
import { baliToday } from '@/lib/time'
import userData from '@/user.json'
import { useSessionStore } from '@/stores/session'

const store = useCrmStore()
const session = useSessionStore()

const view = ref<'queue' | 'board' | 'list'>('queue')
const showFilters = ref(false)
const modalOpen = ref(false)
const editing = ref<Deal | null>(null)
const saving = ref(false)
// Shared "now" for card aging — one Date rather than one per card render.
// Refreshed roughly hourly so stage-age colors stay current without a reload.
const now = ref(new Date())
const agingTick = setInterval(() => (now.value = new Date()), 3_600_000)
onUnmounted(() => clearInterval(agingTick))

const stageDot: Record<DealStage, string> = {
  New: 'bg-sm-muted',
  Proposal: 'bg-sm-primary',
  Negotiation: 'bg-sm-warn',
  Contract: 'bg-sm-wed',
  Confirmed: 'bg-sm-won',
  Lost: 'bg-sm-bad'
}

// Board is a single axis: the pipeline stages.
const boardColumns = DEAL_STAGES
const filteredByGroup = computed<Record<string, Deal[]>>(() => {
  const grouped: Record<string, Deal[]> = {}
  for (const c of boardColumns) grouped[c] = []
  for (const deal of filteredDeals.value) {
    ;(grouped[deal.stage ?? 'New'] ?? grouped.New!).push(deal)
  }
  return grouped
})

// Only a lead's owner (or an admin) may edit it — used to lock cards from dragging.
function editable(deal: Deal): boolean {
  return canEditDeal(session.currentUser, deal)
}

// Whether the current user may create leads (gates the New Deal button).
const canCreate = computed(() => canCreateDeal(session.currentUser))

// ---- Drag → stage move. Terminal columns capture reason / booked value first. ----
const dragging = ref(false)

function onDragEnd() {
  dragging.value = false
  rebuildBoard() // reconcile against any snapshot that arrived mid-drag
}

function onDragChange(evt: { added?: { element: Deal } }, col: string) {
  const deal = evt.added?.element
  if (!deal) return
  const stage = col as DealStage
  if (!editable(deal) || (deal.stage ?? 'New') === stage) {
    rebuildBoard() // revert a locked/no-op drop
    return
  }
  if (stage === 'Lost') {
    openOutcomePrompt('lost', deal)
  } else if (stage === 'Confirmed') {
    openOutcomePrompt('won', deal)
  } else {
    store.moveStage(deal.id, stage)
  }
}

// Quick stage change from a card's badge menu (no drag). Same routing as a drop:
// terminal stages capture reason / booked value first.
function onQuickMove({ deal, stage }: { deal: Deal; stage: DealStage }) {
  if (!editable(deal) || (deal.stage ?? 'New') === stage) return
  if (stage === 'Lost') {
    openOutcomePrompt('lost', deal)
  } else if (stage === 'Confirmed') {
    openOutcomePrompt('won', deal)
  } else {
    store.moveStage(deal.id, stage)
  }
}

// ---- Filters (shared across board + list) ----
type DateField = 'arrivalDate' | 'leadDate' | 'checkoutDate' | 'actionDueDate'
const filters = reactive({
  search: '',
  outcome: '',
  stage: '',
  owner: '',
  segment: '',
  leadSource: '',
  reason: '',
  dateField: 'arrivalDate' as DateField,
  dateFrom: '',
  dateTo: '',
  minRevenue: undefined as number | undefined,
  maxRevenue: undefined as number | undefined
})

function clearFilters() {
  filters.search = ''
  filters.outcome = ''
  filters.stage = ''
  filters.owner = ''
  filters.segment = ''
  filters.leadSource = ''
  filters.reason = ''
  filters.dateField = 'arrivalDate'
  filters.dateFrom = ''
  filters.dateTo = ''
  filters.minRevenue = undefined
  filters.maxRevenue = undefined
}

const activeFilterCount = computed(() => {
  let n = 0
  if (filters.search.trim()) n++
  if (filters.outcome) n++
  if (filters.stage) n++
  if (filters.owner) n++
  if (filters.segment) n++
  if (filters.leadSource) n++
  if (filters.reason) n++
  if (filters.dateFrom || filters.dateTo) n++
  if (filters.minRevenue != null || filters.maxRevenue != null) n++
  return n
})

function toNum(v: string): number | undefined {
  if (v === '' || v == null) return undefined
  const n = Number(v)
  return isNaN(n) ? undefined : n
}

// Option lists (derived from data so custom "Other" values are included)
const distinct = (key: keyof Deal) =>
  Array.from(new Set(store.deals.map(d => (d[key] as string) || '').filter(Boolean))).sort()

const outcomeFilterOptions = [
  { value: '', label: 'All outcomes' },
  { value: 'open', label: 'Open' },
  { value: 'idle', label: 'Idle (untouched)' },
  { value: 'won', label: 'Won' },
  { value: 'lost', label: 'Lost' }
]
const stageFilterOptions = [
  { value: '', label: 'All stages' },
  ...DEAL_STAGES.map(s => ({ value: s, label: s }))
]
const ownerFilterOptions = computed(() => {
  const names = new Set(userData.map(u => u.name))
  store.deals.forEach(d => d.ownerName && names.add(d.ownerName))
  return [{ value: '', label: 'All owners' }, ...Array.from(names).sort().map(n => ({ value: n, label: n }))]
})
const segmentFilterOptions = computed(() => [
  { value: '', label: 'All segments' },
  ...distinct('segment').map(s => ({ value: s, label: s }))
])
const sourceFilterOptions = computed(() => [
  { value: '', label: 'All sources' },
  ...distinct('leadSource').map(s => ({ value: s, label: s }))
])
const reasonFilterOptions = computed(() => [
  { value: '', label: 'All reasons' },
  ...distinct('reasonWonLost').map(s => ({ value: s, label: s }))
])
const dateFieldOptions = [
  { value: 'arrivalDate', label: 'Arrival date' },
  { value: 'leadDate', label: 'Lead date' },
  { value: 'checkoutDate', label: 'Check-out date' },
  { value: 'actionDueDate', label: 'Action due date' }
]

function matches(deal: Deal): boolean {
  const q = filters.search.trim().toLowerCase()
  if (q) {
    const hay = [deal.company, deal.notes, deal.nextAction, deal.groupName, deal.ownerName]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
    if (!hay.includes(q)) return false
  }
  if (filters.outcome) {
    if (filters.outcome === 'idle') {
      if (!isDealIdle(deal, now.value)) return false
    } else if (dealOutcome(deal) !== filters.outcome) return false
  }
  if (filters.stage && (deal.stage ?? 'New') !== filters.stage) return false
  if (filters.owner && deal.ownerName !== filters.owner) return false
  if (filters.segment && deal.segment !== filters.segment) return false
  if (filters.leadSource && deal.leadSource !== filters.leadSource) return false
  if (filters.reason && deal.reasonWonLost !== filters.reason) return false

  if (filters.dateFrom || filters.dateTo) {
    const d = deal[filters.dateField]
    if (!d) return false
    if (filters.dateFrom && d < filters.dateFrom) return false
    if (filters.dateTo && d > filters.dateTo) return false
  }

  const rev = deal.totalRevenue ?? 0
  if (filters.minRevenue != null && rev < filters.minRevenue) return false
  if (filters.maxRevenue != null && rev > filters.maxRevenue) return false

  return true
}

const filteredDeals = computed(() => store.deals.filter(matches))

// Summary strip — derived outcome tiles (Open / Idle / Won / Lost) over the filtered set.
// Idle is a subset of Open (untouched), shown for attention; its value overlaps Open.
const summaryTiles = computed(() => {
  const bucket = (pred: (d: Deal) => boolean, revenue: (d: Deal) => number) => {
    const rows = filteredDeals.value.filter(pred)
    return { count: rows.length, value: rows.reduce((s, d) => s + revenue(d), 0) }
  }
  const open = bucket(d => dealOutcome(d) === 'open', d => d.totalRevenue ?? 0)
  const idle = bucket(d => isDealIdle(d, now.value), d => d.totalRevenue ?? 0)
  const won = bucket(d => dealOutcome(d) === 'won', d => wonRevenue(d))
  const lost = bucket(d => dealOutcome(d) === 'lost', d => d.totalRevenue ?? 0)
  return [
    { key: 'open', label: 'Open', textClass: 'text-sm-ink dark:text-white', ...open },
    { key: 'idle', label: 'Idle', textClass: 'text-sm-warn', ...idle },
    { key: 'won', label: 'Won', textClass: 'text-sm-won', ...won },
    { key: 'lost', label: 'Lost', textClass: 'text-sm-bad', ...lost }
  ]
})

// Headline pipeline value across the filtered set (open + closed alike).
const pipelineTotal = computed(() =>
  filteredDeals.value.reduce((s, d) => s + (d.totalRevenue ?? 0), 0)
)

// ---- Action queue (Direction 1c): open deals grouped by urgency ----
type QueueChip = 'all' | 'overdue' | 'stuck' | 'today' | 'mine'
const queueChip = ref<QueueChip>('all')

const todayLabel = computed(() =>
  now.value.toLocaleDateString('en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'Asia/Makassar'
  })
)

function daysSince(iso: string): number {
  const a = new Date(iso + 'T00:00:00').getTime()
  return Math.floor((now.value.getTime() - a) / 86_400_000)
}
function daysInStage(deal: Deal): number {
  const raw = deal.stageEnteredAt ?? deal.createdAt
  const entered = raw instanceof Date ? raw : new Date(raw as string)
  if (isNaN(entered.getTime())) return 0
  return Math.floor((now.value.getTime() - entered.getTime()) / 86_400_000)
}

interface QueueDeal extends Deal {
  queueFlag: string
}

// Each open deal falls into the first bucket it matches: overdue action, else due
// today, else "stuck" (in-stage longer than the stage SLA).
const queueBuckets = computed(() => {
  const todayIso = baliToday()
  const overdue: QueueDeal[] = []
  const today: QueueDeal[] = []
  const stuck: QueueDeal[] = []
  for (const d of filteredDeals.value) {
    if (dealOutcome(d) !== 'open') continue
    const due = d.actionDueDate
    if (due && due < todayIso) {
      overdue.push({ ...d, queueFlag: `${daysSince(due)}d late` })
    } else if (due && due === todayIso) {
      today.push({ ...d, queueFlag: 'Today' })
    } else {
      const stage = (d.stage ?? 'New') as DealStage
      const sla = DEFAULT_ALERT_CONFIG.stageSlaDays[stage]
      const days = daysInStage(d)
      if (sla != null && days >= sla) stuck.push({ ...d, queueFlag: `${days}d` })
    }
  }
  return { overdue, today, stuck }
})

const queueCount = computed(() => {
  const b = queueBuckets.value
  return b.overdue.length + b.stuck.length + b.today.length
})
const overdueCount = computed(() => queueBuckets.value.overdue.length)
const atRiskTotal = computed(() =>
  [...queueBuckets.value.overdue, ...queueBuckets.value.stuck, ...queueBuckets.value.today]
    .reduce((s, d) => s + (d.totalRevenue ?? 0), 0)
)

const mineName = computed(() => session.currentUser?.name ?? '')

const queueChips = computed(() => [
  { key: 'all' as QueueChip, label: 'Needs action', count: queueCount.value },
  { key: 'overdue' as QueueChip, label: 'Overdue', count: queueBuckets.value.overdue.length },
  { key: 'stuck' as QueueChip, label: 'Stuck', count: queueBuckets.value.stuck.length },
  { key: 'today' as QueueChip, label: 'Due today', count: queueBuckets.value.today.length },
  { key: 'mine' as QueueChip, label: 'Mine only', count: null as number | null }
])

const visibleQueueGroups = computed(() => {
  const b = queueBuckets.value
  let groups = [
    { key: 'overdue', title: 'Overdue', colorClass: '!text-sm-bad', flagClass: 'text-sm-bad', items: b.overdue },
    { key: 'stuck', title: 'Stuck past SLA', colorClass: '!text-sm-warn', flagClass: 'text-sm-warn', items: b.stuck },
    { key: 'today', title: 'Due today', colorClass: '', flagClass: 'text-sm-muted', items: b.today }
  ]
  if (queueChip.value === 'mine') {
    groups = groups.map(g => ({ ...g, items: g.items.filter(d => (d.ownerName || '') === mineName.value) }))
  } else if (queueChip.value !== 'all') {
    groups = groups.filter(g => g.key === queueChip.value)
  }
  return groups.filter(g => g.items.length)
})

// Advance = bump a deal to the next pipeline stage. Terminal moves (→ Confirmed)
// route through the won prompt via onQuickMove, exactly like the board.
const ADVANCE_ORDER: DealStage[] = ['New', 'Proposal', 'Negotiation', 'Contract', 'Confirmed']
function canAdvance(deal: Deal): boolean {
  if (!editable(deal)) return false
  const i = ADVANCE_ORDER.indexOf((deal.stage ?? 'New') as DealStage)
  return i >= 0 && i < ADVANCE_ORDER.length - 1
}
function advance(deal: Deal) {
  const i = ADVANCE_ORDER.indexOf((deal.stage ?? 'New') as DealStage)
  if (i < 0 || i >= ADVANCE_ORDER.length - 1) return
  onQuickMove({ deal, stage: ADVANCE_ORDER[i + 1]! })
}

// Mutable per-column mirror that vuedraggable can splice during a drag. Rebuilt when
// the filtered grouping changes — but NOT mid-drag, so an incoming real-time snapshot
// never yanks a card out from under the user (reconciled on drag end instead).
const board = ref<Record<string, Deal[]>>({})
function rebuildBoard() {
  const g = filteredByGroup.value
  const next: Record<string, Deal[]> = {}
  for (const col of boardColumns) next[col] = [...(g[col] ?? [])]
  board.value = next
}
watch(
  filteredByGroup,
  () => {
    if (!dragging.value) rebuildBoard()
  },
  { immediate: true }
)

// ---- Modal / CRUD ----
function openCreate() {
  if (!canCreate.value) return // defensive: button is hidden without pipeline:create
  editing.value = null
  modalOpen.value = true
}
function openEdit(deal: Deal) {
  editing.value = deal
  modalOpen.value = true
}

// ---- Confirmation dialog (proper styled alert before save / create / delete) ----
const confirmDialog = reactive({
  open: false,
  title: '',
  message: '',
  confirmText: 'Confirm',
  danger: false,
  loading: false,
  action: null as null | (() => Promise<void>)
})

function askConfirm(opts: {
  title: string
  message?: string
  confirmText: string
  danger?: boolean
  action: () => Promise<void>
}) {
  confirmDialog.title = opts.title
  confirmDialog.message = opts.message ?? ''
  confirmDialog.confirmText = opts.confirmText
  confirmDialog.danger = opts.danger ?? false
  confirmDialog.action = opts.action
  confirmDialog.open = true
}

function cancelConfirm() {
  if (confirmDialog.loading) return
  confirmDialog.open = false
  confirmDialog.action = null
}

async function acceptConfirm() {
  if (!confirmDialog.action) return
  confirmDialog.loading = true
  try {
    await confirmDialog.action()
    confirmDialog.open = false
    confirmDialog.action = null
  } finally {
    confirmDialog.loading = false
  }
}

function onSubmit(payload: NewDeal) {
  const editingDeal = editing.value
  askConfirm({
    title: editingDeal ? 'Save changes?' : 'Create lead?',
    message: editingDeal
      ? `Update "${payload.company}" with your changes.`
      : `Add "${payload.company}" to the pipeline.`,
    confirmText: editingDeal ? 'Save' : 'Create',
    action: async () => {
      if (editingDeal) {
        await store.updateDeal(editingDeal.id, payload)
      } else {
        await store.createDeal(payload)
      }
      modalOpen.value = false
    }
  })
}

function onDelete() {
  const editingDeal = editing.value
  if (!editingDeal) return
  if (!canDeleteDeals(session.currentUser)) return
  askConfirm({
    title: 'Delete this lead?',
    message: `"${editingDeal.company}" will be permanently removed. This can't be undone.`,
    confirmText: 'Delete',
    danger: true,
    action: async () => {
      await store.deleteDeal(editingDeal.id)
      modalOpen.value = false
    }
  })
}

// ---- Lost / Won drag prompt ----
const outcomePrompt = reactive({
  open: false,
  mode: 'lost' as 'lost' | 'won',
  deal: null as Deal | null,
  loading: false
})

function openOutcomePrompt(mode: 'lost' | 'won', deal: Deal) {
  outcomePrompt.mode = mode
  outcomePrompt.deal = deal
  outcomePrompt.loading = false
  outcomePrompt.open = true
}

async function onOutcomeConfirm(payload: { reason?: string; note?: string; actualRevenue?: number }) {
  const deal = outcomePrompt.deal
  if (!deal) return
  outcomePrompt.loading = true
  try {
    if (outcomePrompt.mode === 'lost') {
      await store.moveToLost(deal.id, payload.reason ?? '', payload.note)
    } else {
      await store.moveToWon(deal.id, payload.actualRevenue)
    }
    outcomePrompt.open = false
    outcomePrompt.deal = null
  } finally {
    outcomePrompt.loading = false
    rebuildBoard() // reflect the committed move (and undo the optimistic drop layout)
  }
}

function onOutcomeCancel() {
  outcomePrompt.open = false
  outcomePrompt.deal = null
  rebuildBoard() // put the dragged card back where it was
}

const route = useRoute()

onMounted(() => {
  store.subscribe()
  // Deep-link from a notification: /crm?deal=<id> opens that deal once loaded.
  const dealId = route.query.deal
  if (typeof dealId === 'string') {
    const stop = watch(
      () => store.deals,
      deals => {
        const target = deals.find(d => d.id === dealId)
        if (target) {
          openEdit(target)
          stop()
        }
      },
      { immediate: true }
    )
  }
})
</script>

<style>
/* vuedraggable drag states (global — the dragged/ghost node is re-parented) */
.drag-ghost {
  opacity: 0.4;
}
.drag-active {
  cursor: grabbing;
}
</style>
