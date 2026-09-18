<template>
  <div class="min-h-screen bg-white dark:bg-sm-bg-dark">
    <div class="px-6 lg:px-10 pt-10 lg:pt-8 pb-32">
      <header class="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <span class="sm-eyebrow">Data quality intelligence</span>
          <h1 class="sm-display text-display leading-[1.06] mt-2.5">Make the pipeline<br class="hidden sm:block" /> trustworthy</h1>
          <p class="mt-3 max-w-2xl text-sm text-sm-muted leading-6">
            Find incomplete CRM records before they weaken follow-up discipline, reporting, forecasting and future machine-learning signals.
          </p>
        </div>
        <div class="flex flex-wrap items-center gap-4 text-sm font-bold">
          <router-link to="/crm/intelligence" class="text-sm-muted hover:text-sm-ink dark:hover:text-white">Active</router-link>
          <router-link to="/crm/intelligence/lost" class="text-sm-muted hover:text-sm-ink dark:hover:text-white">Lost insights</router-link>
          <span class="text-sm-ink dark:text-white">Data quality</span>
          <router-link to="/crm" class="text-sm-muted hover:text-sm-ink dark:hover:text-white">Pipeline</router-link>
        </div>
      </header>

      <div v-if="store.loading" class="mt-10 grid grid-cols-2 lg:grid-cols-4 gap-6">
        <SmSkeleton v-for="n in 4" :key="n" class="h-20" />
      </div>

      <template v-else>
        <section class="mt-9 grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-7 border-y border-sm-line dark:border-white/10 py-6">
          <div>
            <div class="sm-eyebrow">Average quality score</div>
            <div class="mt-2 text-3xl font-bold" :class="scoreClass(result.summary.averageScore)">{{ result.summary.averageScore }}</div>
            <div class="mt-1 text-xs text-sm-muted">out of 100</div>
          </div>
          <div>
            <div class="sm-eyebrow">Complete records</div>
            <div class="mt-2 text-3xl font-bold text-sm-won">{{ result.summary.completeCount }}</div>
          </div>
          <div>
            <div class="sm-eyebrow">Needs attention</div>
            <div class="mt-2 text-3xl font-bold text-sm-warn">{{ result.summary.needsAttentionCount }}</div>
          </div>
          <div>
            <div class="sm-eyebrow">Critical gaps</div>
            <div class="mt-2 text-3xl font-bold text-sm-bad">{{ result.summary.criticalCount }}</div>
            <div class="mt-1 text-xs text-sm-muted">owner, value, action or lost reason</div>
          </div>
        </section>

        <div class="mt-8 lg:grid lg:grid-cols-[300px_minmax(0,1fr)] lg:gap-10">
          <aside>
            <div class="sm-eyebrow pb-2">Most common gaps</div>
            <div v-if="!result.summary.issueCounts.length" class="py-5 border-t border-sm-line dark:border-white/10 text-sm text-sm-muted">
              No data-quality gaps detected.
            </div>
            <div v-for="row in result.summary.issueCounts" :key="row.type" class="py-3 border-t border-sm-line dark:border-white/10 flex items-baseline justify-between gap-4">
              <span class="text-sm text-sm-ink dark:text-white">{{ row.label }}</span>
              <span class="text-sm font-bold text-sm-muted">{{ row.count }}</span>
            </div>
          </aside>

          <section class="mt-10 lg:mt-0">
            <div class="flex items-end justify-between gap-4 pb-2">
              <div>
                <span class="sm-eyebrow">Records to fix</span>
                <p class="mt-1 text-xs text-sm-muted">Lowest-quality records first. Completed records are hidden.</p>
              </div>
              <span class="text-xs text-sm-muted shrink-0">{{ attentionItems.length }} records</span>
            </div>

            <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3">
              <SmSelect v-model="filters.owner" :options="ownerFilterOptions" size="sm" />
              <SmSelect v-model="filters.segment" :options="segmentFilterOptions" size="sm" />
              <SmSelect v-model="filters.stage" :options="stageFilterOptions" size="sm" />
              <SmSelect v-model="filters.issueType" :options="issueTypeFilterOptions" size="sm" />
            </div>

            <div v-if="!attentionItems.length" class="py-16 border-t border-sm-line dark:border-white/10 text-center">
              <p class="text-sm font-bold text-sm-won">{{ result.summary.needsAttentionCount ? 'No records match these filters.' : 'Pipeline data is complete.' }}</p>
              <p class="mt-1 text-xs text-sm-muted">{{ result.summary.needsAttentionCount ? 'Try clearing a filter.' : 'No tracked quality gaps were detected.' }}</p>
            </div>

            <article v-for="item in attentionItems" :key="item.deal.id" class="py-5 border-t border-sm-line dark:border-white/10">
              <div class="flex items-start gap-4">
                <div class="flex-1 min-w-0">
                  <div class="flex flex-wrap items-center gap-2">
                    <h2 class="text-sm font-bold text-sm-ink dark:text-white truncate">{{ item.deal.company }}</h2>
                    <span class="text-eyebrow font-bold px-2 py-0.5 rounded-full" :class="scoreBadge(item.score)">{{ item.score }}/100</span>
                  </div>
                  <div class="mt-1 text-xs text-sm-muted">
                    {{ item.deal.stage ?? 'New' }} · {{ item.deal.ownerName || 'Unassigned' }}
                  </div>
                </div>
                <button type="button" class="text-xs font-bold text-sm-primary hover:underline shrink-0" @click="openEdit(item.deal)">
                  Fix record
                </button>
              </div>

              <div class="mt-3 flex flex-wrap gap-2">
                <span
                  v-for="issue in item.issues"
                  :key="issue.type"
                  class="px-2 py-1 rounded-full text-eyebrow font-bold"
                  :class="issue.severity === 'danger' ? 'bg-sm-bad/10 text-sm-bad' : 'bg-sm-warn/10 text-sm-warn'"
                >
                  {{ issue.label }}
                </span>
              </div>
            </article>
          </section>
        </div>
      </template>
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
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useHead } from '@vueuse/head'
import SmSkeleton from '@/components/ui/SmSkeleton.vue'
import SmSelect from '@/components/ui/SmSelect.vue'
import DealModal from '@/components/crm/DealModal.vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import { buildDataQualityIntelligence } from '@/lib/crmDataQuality'
import { useCrmStore } from '@/stores/crm'
import { useSessionStore } from '@/stores/session'
import { canDeleteDeals } from '@/lib/crmUtils'
import { DEAL_STAGES } from '@/types/crm'
import type { Deal, NewDeal } from '@/types/crm'
import userData from '@/user.json'

useHead({ title: 'Pipeline Data Quality' })
const store = useCrmStore()
const session = useSessionStore()

onMounted(() => store.subscribe())

const result = computed(() => buildDataQualityIntelligence(store.deals))

const filters = reactive({ owner: '', segment: '', stage: '', issueType: '' })

const distinct = (key: keyof Deal) =>
  Array.from(new Set(store.deals.map(d => (d[key] as string) || '').filter(Boolean))).sort()

const ownerFilterOptions = computed(() => {
  const names = new Set(userData.map(u => u.name))
  store.deals.forEach(d => d.ownerName && names.add(d.ownerName))
  return [{ value: '', label: 'All owners' }, ...Array.from(names).sort().map(n => ({ value: n, label: n }))]
})
const segmentFilterOptions = computed(() => [
  { value: '', label: 'All segments' },
  ...distinct('segment').map(s => ({ value: s, label: s }))
])
const stageFilterOptions = [
  { value: '', label: 'All stages' },
  ...DEAL_STAGES.map(s => ({ value: s, label: s }))
]
const issueTypeFilterOptions = computed(() => [
  { value: '', label: 'All gap types' },
  ...result.value.summary.issueCounts.map(row => ({ value: row.type, label: row.label }))
])

const attentionItems = computed(() =>
  result.value.items.filter(item => {
    if (item.issues.length === 0) return false
    if (filters.owner && item.deal.ownerName !== filters.owner) return false
    if (filters.segment && item.deal.segment !== filters.segment) return false
    if (filters.stage && (item.deal.stage ?? 'New') !== filters.stage) return false
    if (filters.issueType && !item.issues.some(issue => issue.type === filters.issueType)) return false
    return true
  })
)

// ---- Fix in place: open the deal in a modal without leaving this page ----
const modalOpen = ref(false)
const editing = ref<Deal | null>(null)
const saving = ref(false)

function openEdit(deal: Deal) {
  editing.value = deal
  modalOpen.value = true
}

const confirmDialog = reactive({
  open: false,
  title: '',
  message: '',
  confirmText: 'Confirm',
  danger: false,
  loading: false,
  action: null as null | (() => Promise<void>)
})

function askConfirm(opts: { title: string; message?: string; confirmText: string; danger?: boolean; action: () => Promise<void> }) {
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
  if (!editingDeal) return
  askConfirm({
    title: 'Save changes?',
    message: `Update "${payload.company}" with your changes.`,
    confirmText: 'Save',
    action: async () => {
      await store.updateDeal(editingDeal.id, payload)
      modalOpen.value = false
    }
  })
}

function onDelete() {
  const editingDeal = editing.value
  if (!editingDeal || !canDeleteDeals(session.currentUser)) return
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

function scoreClass(score: number): string {
  if (score >= 90) return 'text-sm-won'
  if (score >= 70) return 'text-sm-warn'
  return 'text-sm-bad'
}

function scoreBadge(score: number): string {
  if (score >= 90) return 'bg-sm-won/10 text-sm-won'
  if (score >= 70) return 'bg-sm-warn/10 text-sm-warn'
  return 'bg-sm-bad/10 text-sm-bad'
}
</script>
