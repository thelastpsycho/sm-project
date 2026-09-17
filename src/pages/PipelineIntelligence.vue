<template>
  <div class="min-h-screen bg-white dark:bg-sm-bg-dark">
    <div class="px-6 lg:px-10 pt-10 lg:pt-8 pb-32">
      <header class="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div class="min-w-0">
          <span class="sm-eyebrow inline-flex items-center gap-1.5">
            <SparklesIcon class="w-3.5 h-3.5" /> Pipeline intelligence
          </span>
          <h1 class="sm-display text-display leading-[1.06] mt-2.5">What deserves<br class="hidden sm:block" /> attention now</h1>
          <p class="mt-3 max-w-2xl text-sm text-sm-muted leading-6">
            Explainable signals from live pipeline data: urgency, deal health, recommended next action and a stage-weighted forecast.
          </p>
        </div>
        <div class="flex items-center gap-4 shrink-0">
          <router-link to="/crm" class="text-sm font-bold text-sm-muted hover:text-sm-ink dark:hover:text-white transition-colors">
            Pipeline
          </router-link>
          <router-link to="/crm/report" class="text-sm font-bold text-sm-muted hover:text-sm-ink dark:hover:text-white transition-colors">
            Report
          </router-link>
        </div>
      </header>

      <div v-if="store.loading" class="mt-10 grid grid-cols-2 lg:grid-cols-6 gap-x-6 gap-y-7">
        <div v-for="n in 6" :key="n" class="space-y-2">
          <SmSkeleton class="h-3 w-20" />
          <SmSkeleton class="h-8 w-28" />
          <SmSkeleton class="h-3 w-24" />
        </div>
      </div>

      <template v-else>
        <section class="mt-9 grid grid-cols-2 lg:grid-cols-6 gap-x-6 gap-y-7 border-y border-sm-line dark:border-white/10 py-6">
          <div>
            <div class="sm-eyebrow flex items-center gap-1.5"><FireIcon class="w-3.5 h-3.5" /> Hot opportunities</div>
            <div class="mt-2 text-3xl font-bold tracking-tight text-sm-ink dark:text-white">{{ summary.hotCount }}</div>
            <div class="mt-1 text-xs text-sm-muted">Active, progressed and low-risk</div>
          </div>
          <div>
            <div class="sm-eyebrow flex items-center gap-1.5"><ExclamationTriangleIcon class="w-3.5 h-3.5" /> At risk</div>
            <div class="mt-2 text-3xl font-bold tracking-tight text-sm-bad">{{ summary.atRiskCount }}</div>
            <div class="mt-1 text-xs text-sm-muted">{{ formatMoney(summary.attentionValue) }} needs attention</div>
          </div>
          <div>
            <div class="sm-eyebrow flex items-center gap-1.5"><ClockIcon class="w-3.5 h-3.5" /> Stale</div>
            <div class="mt-2 text-3xl font-bold tracking-tight text-sm-warn">{{ summary.staleCount }}</div>
            <div class="mt-1 text-xs text-sm-muted">No activity for 7+ days</div>
          </div>
          <div>
            <div class="sm-eyebrow flex items-center gap-1.5"><BoltIcon class="w-3.5 h-3.5" /> Anomalies</div>
            <div class="mt-2 text-3xl font-bold tracking-tight text-sm-warn">{{ summary.anomalyCount }}</div>
            <div class="mt-1 text-xs text-sm-muted">Reopened, value drop or stuck vs. norm</div>
          </div>
          <div>
            <div class="sm-eyebrow flex items-center gap-1.5"><Square2StackIcon class="w-3.5 h-3.5" /> Duplicates</div>
            <div class="mt-2 text-3xl font-bold tracking-tight text-sm-bad">{{ summary.duplicateCount }}</div>
            <div class="mt-1 text-xs text-sm-muted">Same company, overlapping dates</div>
          </div>
          <div>
            <div class="sm-eyebrow flex items-center gap-1.5"><BanknotesIcon class="w-3.5 h-3.5" /> Weighted forecast</div>
            <div class="mt-2 text-3xl font-bold tracking-tight text-sm-ink dark:text-white">{{ formatMoney(summary.weightedForecast) }}</div>
            <div class="mt-1 text-xs text-sm-muted">from {{ formatMoney(summary.openValue) }} open</div>
          </div>
        </section>

        <section class="mt-7">
          <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <span class="sm-eyebrow">Intelligent filters</span>
              <div class="scr mt-3 -mx-6 lg:mx-0 px-6 lg:px-0 flex gap-2 overflow-x-auto">
                <button
                  v-for="chip in filterChips"
                  :key="chip.key"
                  type="button"
                  class="whitespace-nowrap text-xsm font-bold px-3.5 py-1.5 rounded-full border transition-colors"
                  :class="activeFilter === chip.key
                    ? 'bg-sm-ink text-white border-sm-ink dark:bg-white dark:text-sm-ink dark:border-white'
                    : 'border-sm-line text-sm-ink dark:border-white/15 dark:text-gray-200'"
                  @click="activeFilter = chip.key"
                >
                  {{ chip.label }} <span :class="activeFilter === chip.key ? 'opacity-70' : 'text-sm-faint'">{{ chip.count }}</span>
                </button>
              </div>
            </div>

            <div class="relative w-full lg:w-[320px] flex items-center gap-2 border-b border-sm-line dark:border-white/15 pb-2 focus-within:border-sm-ink dark:focus-within:border-white transition-colors">
              <MagnifyingGlassIcon class="w-4 h-4 text-sm-muted shrink-0" />
              <input
                v-model="search"
                type="search"
                placeholder="Search company, owner, action…"
                class="w-full bg-transparent border-0 p-0 text-sm text-sm-ink dark:text-white placeholder:text-sm-faint focus:outline-none focus:ring-0"
              />
            </div>
          </div>
        </section>

        <div class="mt-7 lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-10">
          <section class="min-w-0">
            <div class="flex items-end justify-between gap-4 pb-2">
              <div>
                <span class="sm-eyebrow">What needs your attention</span>
                <p class="mt-1 text-xs text-sm-muted">Ranked by urgency, stage progression and commercial value.</p>
              </div>
              <span class="text-xs text-sm-muted shrink-0">{{ visibleItems.length }} deals</span>
            </div>

            <div v-if="!visibleItems.length" class="py-16 border-t border-sm-line dark:border-white/10 text-center">
              <SparklesIcon class="w-6 h-6 mx-auto text-sm-faint" />
              <p class="mt-3 text-sm font-bold text-sm-ink dark:text-white">No deals match this view.</p>
              <p class="mt-1 text-xs text-sm-muted">Try another intelligence filter or clear the search.</p>
            </div>

            <article
              v-for="item in visibleItems"
              :key="item.deal.id"
              class="py-5 border-t border-sm-line dark:border-white/10"
            >
              <div class="flex items-start gap-4">
                <div class="flex-1 min-w-0">
                  <div class="flex flex-wrap items-center gap-2">
                    <h2 class="text-base font-bold tracking-[-0.01em] text-sm-ink dark:text-white truncate">{{ item.deal.company }}</h2>
                    <span class="px-2 py-0.5 rounded-full text-eyebrow font-bold" :class="healthClass(item.health)">
                      {{ item.healthLabel }}
                    </span>
                    <span v-if="item.isDuplicate" class="px-2 py-0.5 rounded-full text-eyebrow font-bold bg-sm-bad/10 text-sm-bad">
                      Duplicate
                    </span>
                    <span v-if="item.isAnomalous" class="px-2 py-0.5 rounded-full text-eyebrow font-bold bg-sm-warn/10 text-sm-warn">
                      Anomaly
                    </span>
                  </div>
                  <div class="mt-1.5 text-xs text-sm-muted">
                    {{ item.deal.stage ?? 'New' }} · {{ item.deal.ownerName || 'Unassigned' }} · {{ formatMoney(dealValue(item.deal), item.deal.currency) }}
                  </div>
                </div>

                <div class="shrink-0 text-right">
                  <div class="text-2xl font-bold tracking-tight text-sm-ink dark:text-white">{{ item.priorityScore }}</div>
                  <div class="text-eyebrow uppercase tracking-wider text-sm-faint">priority</div>
                </div>
              </div>

              <div class="mt-4 grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                <div>
                  <div class="text-eyebrow uppercase tracking-[0.12em] text-sm-muted font-bold">Recommended next action</div>
                  <p class="mt-1.5 text-sm font-bold text-sm-ink dark:text-white">{{ item.recommendedAction }}</p>
                  <ul class="mt-2 space-y-1">
                    <li v-for="reason in item.reasons.slice(0, 2)" :key="reason" class="text-xs text-sm-muted flex gap-2">
                      <span class="mt-[6px] w-1 h-1 rounded-full bg-sm-faint shrink-0"></span>
                      <span>{{ reason }}</span>
                    </li>
                  </ul>
                </div>

                <router-link
                  :to="{ path: '/crm', query: { deal: item.deal.id } }"
                  class="inline-flex items-center gap-1 text-xs font-bold text-sm-primary hover:underline whitespace-nowrap"
                >
                  Open deal <ArrowRightIcon class="w-3.5 h-3.5" />
                </router-link>
              </div>

              <div class="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-eyebrow uppercase tracking-wider text-sm-faint">
                <span>Risk {{ item.riskScore }}/100</span>
                <span>Stage weight {{ formatPercent(item.probability) }}</span>
                <span>Weighted {{ formatMoney(item.weightedValue, item.deal.currency) }}</span>
                <span>{{ item.daysInStage }}d in stage</span>
              </div>
            </article>
          </section>

          <aside class="mt-10 lg:mt-0 lg:border-l lg:border-sm-line lg:dark:border-white/10 lg:pl-8">
            <div class="sm-eyebrow">Forecast by stage</div>
            <div class="mt-3">
              <div v-for="row in stageRows" :key="row.stage" class="py-3 border-t border-sm-hair dark:border-white/5">
                <div class="flex items-baseline justify-between gap-3">
                  <span class="text-sm font-bold text-sm-ink dark:text-white">{{ row.stage }}</span>
                  <span class="text-xs text-sm-muted">{{ row.count }} · {{ formatPercent(row.probability) }}</span>
                </div>
                <div class="mt-1 flex items-baseline justify-between gap-3">
                  <span class="text-xs text-sm-muted">{{ formatMoney(row.value) }}</span>
                  <span class="text-xs font-bold text-sm-ink dark:text-white">{{ formatMoney(row.weighted) }}</span>
                </div>
              </div>
            </div>

            <div class="mt-7 pt-5 border-t border-sm-line dark:border-white/10">
              <div class="sm-eyebrow">How intelligence works</div>
              <p class="mt-2 text-xs leading-5 text-sm-muted">
                Priority and risk are deterministic, using overdue actions, inactivity, stage SLA, arrival proximity and value. Forecast weights are stage heuristics—not AI predictions—so every signal is explainable.
              </p>
              <p class="mt-3 text-xs leading-5 text-sm-muted">
                As pipeline-event history grows, stage weights can later be replaced with your real conversion rates.
              </p>
            </div>
          </aside>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useHead } from '@vueuse/head'
import {
  ArrowRightIcon,
  BanknotesIcon,
  BoltIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  FireIcon,
  MagnifyingGlassIcon,
  SparklesIcon,
  Square2StackIcon
} from '@heroicons/vue/24/outline'
import SmSkeleton from '@/components/ui/SmSkeleton.vue'
import { formatMoney } from '@/lib/crmUtils'
import { buildPipelineIntelligence, STAGE_PROBABILITY, type IntelligenceHealth } from '@/lib/crmIntelligence'
import { useCrmStore } from '@/stores/crm'
import { useSessionStore } from '@/stores/session'
import type { Deal, DealStage } from '@/types/crm'

useHead({
  title: 'Pipeline Intelligence',
  meta: [
    {
      name: 'description',
      content: 'Explainable pipeline priority, risk, next-action recommendations and stage-weighted forecasting.'
    }
  ]
})

type IntelligenceFilter = 'all' | 'hot' | 'at-risk' | 'stale' | 'today' | 'mine' | 'anomaly' | 'duplicate'

const store = useCrmStore()
const session = useSessionStore()
const activeFilter = ref<IntelligenceFilter>('all')
const search = ref('')
const now = ref(new Date())
const timer = setInterval(() => (now.value = new Date()), 3_600_000)

onMounted(() => {
  store.subscribe()
  store.loadEvents()
})
onUnmounted(() => clearInterval(timer))

const intelligence = computed(() => buildPipelineIntelligence(store.deals, now.value, store.events))
const summary = computed(() => intelligence.value.summary)
const currentEmail = computed(() => session.currentUser?.email ?? '')

const filterChips = computed(() => {
  const items = intelligence.value.items
  return [
    { key: 'all' as IntelligenceFilter, label: 'Priority', count: items.length },
    { key: 'hot' as IntelligenceFilter, label: 'Hot', count: items.filter(item => item.isHot).length },
    { key: 'at-risk' as IntelligenceFilter, label: 'At risk', count: items.filter(item => item.isAtRisk).length },
    { key: 'stale' as IntelligenceFilter, label: 'Stale', count: items.filter(item => item.isStale).length },
    { key: 'today' as IntelligenceFilter, label: 'Follow-up today', count: items.filter(item => item.dueState === 'today' || item.dueState === 'overdue').length },
    { key: 'anomaly' as IntelligenceFilter, label: 'Anomalies', count: items.filter(item => item.isAnomalous).length },
    { key: 'duplicate' as IntelligenceFilter, label: 'Duplicates', count: items.filter(item => item.isDuplicate).length },
    { key: 'mine' as IntelligenceFilter, label: 'Mine', count: items.filter(item => item.deal.ownerId === currentEmail.value).length }
  ]
})

const visibleItems = computed(() => {
  const q = search.value.trim().toLowerCase()
  return intelligence.value.items.filter(item => {
    if (activeFilter.value === 'hot' && !item.isHot) return false
    if (activeFilter.value === 'at-risk' && !item.isAtRisk) return false
    if (activeFilter.value === 'stale' && !item.isStale) return false
    if (activeFilter.value === 'today' && item.dueState !== 'today' && item.dueState !== 'overdue') return false
    if (activeFilter.value === 'anomaly' && !item.isAnomalous) return false
    if (activeFilter.value === 'duplicate' && !item.isDuplicate) return false
    if (activeFilter.value === 'mine' && item.deal.ownerId !== currentEmail.value) return false
    if (!q) return true
    const haystack = [
      item.deal.company,
      item.deal.ownerName,
      item.deal.groupName,
      item.deal.nextAction,
      item.deal.notes,
      item.recommendedAction
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
    return haystack.includes(q)
  })
})

const OPEN_STAGE_ROWS: DealStage[] = ['New', 'Proposal', 'Negotiation', 'Contract']
const stageRows = computed(() =>
  OPEN_STAGE_ROWS.map(stage => {
    const items = intelligence.value.items.filter(item => (item.deal.stage ?? 'New') === stage)
    const value = items.reduce((sum, item) => sum + dealValue(item.deal), 0)
    return {
      stage,
      count: items.length,
      probability: STAGE_PROBABILITY[stage],
      value,
      weighted: items.reduce((sum, item) => sum + item.weightedValue, 0)
    }
  })
)

function dealValue(deal: Deal): number {
  return deal.actualRevenue ?? deal.totalRevenue ?? 0
}

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`
}

function healthClass(health: IntelligenceHealth): string {
  const classes: Record<IntelligenceHealth, string> = {
    hot: 'bg-sm-won/10 text-sm-won',
    healthy: 'bg-sm-ink/5 text-sm-muted dark:bg-white/10',
    attention: 'bg-sm-warn/10 text-sm-warn',
    'at-risk': 'bg-sm-bad/10 text-sm-bad',
    stale: 'bg-sm-warn/10 text-sm-warn'
  }
  return classes[health]
}
</script>
