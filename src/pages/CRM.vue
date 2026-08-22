<template>
  <SmPage max-width="full" with-bottom-nav-padding>
    <!-- Header -->
    <div class="flex items-center justify-between mb-4">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Sales Pipeline</h1>
        <p class="text-sm text-gray-500 dark:text-gray-400">
          {{ filteredDeals.length }}<span v-if="filteredDeals.length !== store.deals.length"> of {{ store.deals.length }}</span> deals
        </p>
      </div>
      <div class="flex items-center gap-2">
        <router-link
          to="/crm/report"
          class="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-300 hover:text-sm-primary transition-colors"
        >
          <ChartBarIcon class="w-4 h-4" />
          <span class="hidden sm:inline">Report</span>
        </router-link>
        <SmButton v-if="canCreate" size="sm" @click="openCreate">
          <PlusIcon class="w-4 h-4 mr-1" /> New Deal
        </SmButton>
      </div>
    </div>

    <!-- Summary strip -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
      <div
        v-for="s in summaryTiles"
        :key="s.key"
        class="rounded-2xl border border-gray-100 dark:border-white/10 bg-white dark:bg-sm-card-dark px-3 py-2"
      >
        <div class="flex items-center gap-1.5">
          <span class="w-2 h-2 rounded-full" :class="s.dot"></span>
          <span class="text-xs font-medium text-gray-600 dark:text-gray-300">{{ s.label }}</span>
          <span class="ml-auto text-xs text-gray-400">{{ s.count }}</span>
        </div>
        <p class="mt-1 text-xs font-semibold text-gray-900 dark:text-white truncate">
          {{ formatMoney(s.value) }}
        </p>
      </div>
    </div>

    <!-- Controls: view toggle + search + filter button -->
    <div class="flex items-center gap-2 mb-3">
      <div class="inline-flex rounded-xl bg-gray-100 dark:bg-white/5 p-1">
        <button
          v-for="v in (['board', 'list'] as const)"
          :key="v"
          @click="view = v"
          class="px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors"
          :class="view === v ? 'bg-white dark:bg-sm-card-dark text-sm-primary shadow-sm' : 'text-gray-500 dark:text-gray-400'"
        >
          {{ v }}
        </button>
      </div>

      <div class="relative flex-1">
        <MagnifyingGlassIcon class="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          v-model="filters.search"
          type="search"
          placeholder="Search company, notes, action…"
          class="w-full pl-9 pr-3 py-2 text-sm rounded-xl bg-gray-50 dark:bg-gray-800 border-0 ring-1 ring-gray-200 dark:ring-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-sm-primary"
        />
      </div>

      <button
        @click="showFilters = !showFilters"
        class="relative inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors"
        :class="activeFilterCount ? 'bg-sm-primary text-white' : 'bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-300'"
      >
        <FunnelIcon class="w-4 h-4" />
        <span class="hidden sm:inline">Filters</span>
        <span
          v-if="activeFilterCount"
          class="ml-0.5 inline-flex items-center justify-center min-w-[18px] h-[18px] text-[11px] rounded-full bg-white/25"
        >
          {{ activeFilterCount }}
        </span>
      </button>
    </div>

    <!-- Filter panel -->
    <div
      v-if="showFilters"
      class="mb-4 rounded-xl border border-gray-100 dark:border-white/10 bg-white dark:bg-sm-card-dark p-2.5 space-y-2 animate-fade-in-up"
    >
      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-1.5">
        <SmSelect v-model="filters.outcome" :options="outcomeFilterOptions" size="sm" />
        <SmSelect v-model="filters.stage" :options="stageFilterOptions" size="sm" />
        <SmSelect v-model="filters.owner" :options="ownerFilterOptions" size="sm" />
        <SmSelect v-model="filters.segment" :options="segmentFilterOptions" size="sm" />
        <SmSelect v-model="filters.leadSource" :options="sourceFilterOptions" size="sm" />
        <SmSelect v-model="filters.reason" :options="reasonFilterOptions" size="sm" />
      </div>

      <!-- Date range + revenue range -->
      <div class="grid grid-cols-2 sm:grid-cols-5 gap-1.5 items-end">
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

    <!-- Empty state / import -->
    <div v-if="store.deals.length === 0 && !store.loading" class="text-center py-16">
      <p class="text-gray-500 dark:text-gray-400 mb-4">No deals yet.</p>
      <SmButton :loading="store.importing" @click="runImport">Import existing pipeline</SmButton>
      <p class="text-xs text-gray-400 mt-2">Loads your spreadsheet deals into the board (one time).</p>
    </div>

    <!-- Loading -->
    <div v-else-if="store.loading" class="text-center py-16 text-gray-400">Loading…</div>

    <!-- Kanban board (single pipeline axis: stages) -->
    <template v-else-if="view === 'board'">
      <div class="flex gap-3 overflow-x-auto pb-4 -mx-4 px-4 snap-x">
        <div v-for="col in boardColumns" :key="col" class="shrink-0 w-72 snap-start">
          <div class="flex items-center gap-2 mb-2 px-1">
            <span class="w-2 h-2 rounded-full" :class="stageDot[col]"></span>
            <h3 class="text-sm font-semibold text-gray-700 dark:text-gray-200">{{ col }}</h3>
            <span class="text-xs text-gray-400">{{ board[col]?.length ?? 0 }}</span>
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
            class="space-y-2 min-h-[4rem] rounded-xl transition-colors"
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
            class="text-xs text-gray-300 dark:text-gray-600 px-1 py-4 pointer-events-none"
          >
            No deals — drop here
          </p>
        </div>
      </div>
    </template>

    <!-- List view -->
    <div v-else>
      <div class="rounded-2xl border border-gray-100 dark:border-white/10 overflow-hidden divide-y divide-gray-100 dark:divide-white/10">
        <button
          v-for="deal in filteredDeals"
          :key="deal.id"
          type="button"
          @click="openEdit(deal)"
          class="w-full text-left px-4 py-3 bg-white dark:bg-sm-card-dark hover:bg-gray-50 dark:hover:bg-white/5 transition-colors flex items-center gap-3"
        >
          <span class="w-2 h-2 rounded-full shrink-0" :class="stageDot[deal.stage ?? 'New']"></span>
          <div class="min-w-0 flex-1">
            <p class="text-sm font-medium text-gray-900 dark:text-white truncate">{{ deal.company }}</p>
            <p class="text-xs text-gray-500 dark:text-gray-400 truncate">
              {{ deal.stage ?? 'New' }} · {{ deal.segment }} · {{ deal.ownerName || 'Unassigned' }}
            </p>
          </div>
          <span class="text-xs font-medium text-gray-700 dark:text-gray-200 shrink-0">
            {{ formatMoney(deal.actualRevenue ?? deal.totalRevenue, deal.currency) }}
          </span>
        </button>
        <div v-if="filteredDeals.length === 0" class="px-4 py-8 text-center text-sm text-gray-400">
          No deals match these filters.
        </div>
      </div>
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
  </SmPage>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import draggable from 'vuedraggable'
import { PlusIcon, MagnifyingGlassIcon, FunnelIcon, ChartBarIcon } from '@heroicons/vue/24/outline'
import SmPage from '@/components/ui/SmPage.vue'
import SmButton from '@/components/ui/SmButton.vue'
import SmSelect from '@/components/ui/SmSelect.vue'
import SmInput from '@/components/ui/SmInput.vue'
import DealCard from '@/components/crm/DealCard.vue'
import DealModal from '@/components/crm/DealModal.vue'
import DealOutcomePrompt from '@/components/crm/DealOutcomePrompt.vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import { useCrmStore } from '@/stores/crm'
import { DEAL_STAGES } from '@/types/crm'
import type { Deal, DealStage, NewDeal } from '@/types/crm'
import { formatMoney, canDeleteDeals, canEditDeal, canCreateDeal, dealOutcome, isDealIdle, wonRevenue } from '@/lib/crmUtils'
import userData from '@/user.json'
import { useSessionStore } from '@/stores/session'

const store = useCrmStore()
const session = useSessionStore()

const view = ref<'board' | 'list'>('board')
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
  New: 'bg-gray-400',
  Proposal: 'bg-blue-500',
  Negotiation: 'bg-amber-500',
  Contract: 'bg-purple-500',
  Confirmed: 'bg-green-500',
  Lost: 'bg-red-500'
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
    { key: 'open', label: 'Open', dot: 'bg-blue-500', ...open },
    { key: 'idle', label: 'Idle', dot: 'bg-amber-500', ...idle },
    { key: 'won', label: 'Won', dot: 'bg-green-500', ...won },
    { key: 'lost', label: 'Lost', dot: 'bg-red-500', ...lost }
  ]
})

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

async function runImport() {
  const count = await store.importSeedDeals()
  if (count === 0) alert('Pipeline already has deals — import skipped.')
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
