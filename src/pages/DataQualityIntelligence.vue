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
              <span class="text-xs text-sm-muted">{{ attentionItems.length }} records</span>
            </div>

            <div v-if="!attentionItems.length" class="py-16 border-t border-sm-line dark:border-white/10 text-center">
              <p class="text-sm font-bold text-sm-won">Pipeline data is complete.</p>
              <p class="mt-1 text-xs text-sm-muted">No tracked quality gaps were detected.</p>
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
                <router-link :to="{ path: '/crm', query: { deal: item.deal.id } }" class="text-xs font-bold text-sm-primary hover:underline shrink-0">
                  Fix record
                </router-link>
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
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useHead } from '@vueuse/head'
import SmSkeleton from '@/components/ui/SmSkeleton.vue'
import { buildDataQualityIntelligence } from '@/lib/crmDataQuality'
import { useCrmStore } from '@/stores/crm'

useHead({ title: 'Pipeline Data Quality' })
const store = useCrmStore()

onMounted(() => store.subscribe())

const result = computed(() => buildDataQualityIntelligence(store.deals))
const attentionItems = computed(() => result.value.items.filter(item => item.issues.length > 0))

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
