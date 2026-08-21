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
        <SmButton size="sm" @click="openCreate">
          <PlusIcon class="w-4 h-4 mr-1" /> New Deal
        </SmButton>
      </div>
    </div>

    <!-- Summary strip -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
      <div
        v-for="s in DEAL_STATUSES"
        :key="s"
        class="rounded-2xl border border-gray-100 dark:border-white/10 bg-white dark:bg-sm-card-dark px-3 py-2"
      >
        <div class="flex items-center gap-1.5">
          <span class="w-2 h-2 rounded-full" :class="statusDot[s]"></span>
          <span class="text-xs font-medium text-gray-600 dark:text-gray-300">{{ s }}</span>
          <span class="ml-auto text-xs text-gray-400">{{ filteredByStatus[s].length }}</span>
        </div>
        <p class="mt-1 text-xs font-semibold text-gray-900 dark:text-white truncate">
          {{ formatMoney(statusValue(s)) }}
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
        <SmSelect v-model="filters.status" :options="statusFilterOptions" size="sm" />
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

    <!-- Kanban board -->
    <template v-else-if="view === 'board'">
      <!-- Group-by toggle -->
      <div class="flex items-center gap-2 mb-3">
        <span class="text-xs font-medium text-gray-500 dark:text-gray-400">Group by</span>
        <div class="inline-flex rounded-xl bg-gray-100 dark:bg-white/5 p-1">
          <button
            v-for="g in (['status', 'stage'] as const)"
            :key="g"
            @click="groupBy = g"
            class="px-3 py-1 rounded-lg text-xs font-medium capitalize transition-colors"
            :class="groupBy === g ? 'bg-white dark:bg-sm-card-dark text-sm-primary shadow-sm' : 'text-gray-500 dark:text-gray-400'"
          >
            {{ g }}
          </button>
        </div>
      </div>

      <div class="flex gap-3 overflow-x-auto pb-4 -mx-4 px-4 snap-x">
        <div v-for="col in boardColumns" :key="col" class="shrink-0 w-72 snap-start">
          <div class="flex items-center gap-2 mb-2 px-1">
            <span class="w-2 h-2 rounded-full" :class="colDot(col)"></span>
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
            @change="onDragChange($event, col)"
          >
            <template #item="{ element }">
              <DealCard
                :deal="element"
                :badge="groupBy === 'status' ? 'stage' : 'status'"
                :locked="!editable(element)"
                @open="openEdit"
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
          <span class="w-2 h-2 rounded-full shrink-0" :class="statusDot[deal.status]"></span>
          <div class="min-w-0 flex-1">
            <p class="text-sm font-medium text-gray-900 dark:text-white truncate">{{ deal.company }}</p>
            <p class="text-xs text-gray-500 dark:text-gray-400 truncate">
              {{ deal.segment }} · {{ deal.ownerName || 'Unassigned' }}
            </p>
          </div>
          <span class="text-xs font-medium text-gray-700 dark:text-gray-200 shrink-0">
            {{ formatMoney(deal.totalRevenue, deal.currency) }}
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
import { ref, reactive, computed, watch, onMounted } from 'vue'
import draggable from 'vuedraggable'
import { PlusIcon, MagnifyingGlassIcon, FunnelIcon, ChartBarIcon } from '@heroicons/vue/24/outline'
import SmPage from '@/components/ui/SmPage.vue'
import SmButton from '@/components/ui/SmButton.vue'
import SmSelect from '@/components/ui/SmSelect.vue'
import SmInput from '@/components/ui/SmInput.vue'
import DealCard from '@/components/crm/DealCard.vue'
import DealModal from '@/components/crm/DealModal.vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import { useCrmStore } from '@/stores/crm'
import { DEAL_STATUSES, DEAL_STAGES } from '@/types/crm'
import type { Deal, DealStatus, DealStage, NewDeal } from '@/types/crm'
import { formatMoney, canDeleteDeals, canEditDeal } from '@/lib/crmUtils'
import userData from '@/user.json'
import { useSessionStore } from '@/stores/session'

const store = useCrmStore()
const session = useSessionStore()

const view = ref<'board' | 'list'>('board')
const groupBy = ref<'status' | 'stage'>('status')
const showFilters = ref(false)
const modalOpen = ref(false)
const editing = ref<Deal | null>(null)
const saving = ref(false)

const statusDot: Record<DealStatus, string> = {
  Active: 'bg-blue-500',
  Idle: 'bg-amber-500',
  Win: 'bg-green-500',
  Lost: 'bg-red-500'
}

const stageDot: Record<DealStage, string> = {
  New: 'bg-gray-400',
  Proposal: 'bg-blue-500',
  Negotiation: 'bg-amber-500',
  Contract: 'bg-purple-500',
  Confirmed: 'bg-green-500'
}

// Board grouping — columns follow the selected dimension (status or stage).
const boardColumns = computed<readonly string[]>(() =>
  groupBy.value === 'status' ? DEAL_STATUSES : DEAL_STAGES
)
function groupKey(deal: Deal): string {
  return groupBy.value === 'status' ? deal.status : deal.stage ?? 'New'
}
const filteredByGroup = computed<Record<string, Deal[]>>(() => {
  const grouped: Record<string, Deal[]> = {}
  for (const c of boardColumns.value) grouped[c] = []
  const fallback = boardColumns.value[0]!
  for (const deal of filteredDeals.value) {
    ;(grouped[groupKey(deal)] ?? grouped[fallback]!).push(deal)
  }
  return grouped
})
function colDot(col: string): string {
  return groupBy.value === 'status'
    ? statusDot[col as DealStatus]
    : stageDot[col as DealStage]
}

// Only a lead's owner (or an admin) may edit it — used to lock cards from dragging.
function editable(deal: Deal): boolean {
  return canEditDeal(session.currentUser?.email, deal)
}

// Persist the moved card's new column to the store (status or stage).
function onDragChange(evt: { added?: { element: Deal } }, col: string) {
  const deal = evt.added?.element
  if (!deal) return
  if (!editable(deal)) return // defensive: locked cards shouldn't reach here
  if (groupBy.value === 'status') {
    if (deal.status !== col) store.moveStatus(deal.id, col as DealStatus)
  } else if ((deal.stage ?? 'New') !== col) {
    store.moveStage(deal.id, col as DealStage)
  }
}

// ---- Filters (shared across board + list) ----
type DateField = 'arrivalDate' | 'leadDate' | 'checkoutDate' | 'actionDueDate'
const filters = reactive({
  search: '',
  status: '',
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
  filters.status = ''
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
  if (filters.status) n++
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

const statusFilterOptions = [
  { value: '', label: 'All statuses' },
  ...DEAL_STATUSES.map(s => ({ value: s, label: s }))
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
  if (filters.status && deal.status !== filters.status) return false
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

const filteredByStatus = computed<Record<DealStatus, Deal[]>>(() => {
  const grouped = Object.fromEntries(DEAL_STATUSES.map(s => [s, [] as Deal[]])) as Record<DealStatus, Deal[]>
  for (const deal of filteredDeals.value) {
    ;(grouped[deal.status] ?? grouped.Active).push(deal)
  }
  return grouped
})

function statusValue(s: DealStatus): number {
  return filteredByStatus.value[s].reduce((sum, d) => sum + (d.totalRevenue ?? 0), 0)
}

// Mutable per-column mirror that vuedraggable can splice during a drag.
// Rebuilt whenever the filtered grouping or the group-by dimension changes.
// (Declared after filteredDeals so the immediate watch can evaluate the grouping.)
const board = ref<Record<string, Deal[]>>({})
watch(
  filteredByGroup,
  g => {
    const next: Record<string, Deal[]> = {}
    for (const col of boardColumns.value) next[col] = [...(g[col] ?? [])]
    board.value = next
  },
  { immediate: true }
)

// ---- Modal / CRUD ----
function openCreate() {
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
  if (!canDeleteDeals(session.currentUser?.email)) return
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

onMounted(() => {
  store.loadDeals()
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
