<template>
  <div class="min-h-screen bg-white dark:bg-sm-bg-dark">
    <div class="px-6 lg:px-10 pt-10 lg:pt-8 pb-32">
      <header class="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <span class="sm-eyebrow">Lost deal intelligence</span>
          <h1 class="sm-display text-display leading-[1.06] mt-2.5">Why business<br class="hidden sm:block" /> is being lost</h1>
          <p class="mt-3 max-w-2xl text-sm text-sm-muted leading-6">
            Patterns across lost reasons, segments, lead sources and the pipeline stage where opportunities were lost.
          </p>
        </div>
        <div class="flex flex-wrap items-center gap-4 text-sm font-bold">
          <router-link to="/crm/intelligence" class="text-sm-muted hover:text-sm-ink dark:hover:text-white">Active</router-link>
          <span class="text-sm-ink dark:text-white">Lost insights</span>
          <router-link to="/crm/intelligence/quality" class="text-sm-muted hover:text-sm-ink dark:hover:text-white">Data quality</router-link>
          <router-link to="/crm" class="text-sm-muted hover:text-sm-ink dark:hover:text-white">Pipeline</router-link>
        </div>
      </header>

      <div v-if="store.loading" class="mt-10 grid grid-cols-2 lg:grid-cols-4 gap-6">
        <SmSkeleton v-for="n in 4" :key="n" class="h-20" />
      </div>

      <template v-else>
        <section class="mt-9 grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-7 border-y border-sm-line dark:border-white/10 py-6">
          <div>
            <div class="sm-eyebrow">Lost deals</div>
            <div class="mt-2 text-3xl font-bold text-sm-ink dark:text-white">{{ result.summary.lostCount }}</div>
          </div>
          <div>
            <div class="sm-eyebrow">Lost pipeline value</div>
            <div class="mt-2 text-3xl font-bold text-sm-bad">{{ formatMoney(result.summary.totalLostValue) }}</div>
          </div>
          <div>
            <div class="sm-eyebrow">Average lost value</div>
            <div class="mt-2 text-3xl font-bold text-sm-ink dark:text-white">{{ formatMoney(result.summary.averageLostValue) }}</div>
          </div>
          <div>
            <div class="sm-eyebrow">Reason coverage</div>
            <div class="mt-2 text-3xl font-bold text-sm-ink dark:text-white">{{ percent(result.summary.knownReasonRate) }}</div>
            <div class="mt-1 text-xs text-sm-muted">of lost deals have a reason recorded</div>
          </div>
        </section>

        <section v-if="!result.summary.lostCount" class="py-20 text-center">
          <p class="text-sm font-bold text-sm-ink dark:text-white">No lost deals to analyse yet.</p>
          <p class="mt-1 text-xs text-sm-muted">Lost patterns will appear here as pipeline history grows.</p>
        </section>

        <template v-else>
          <div class="mt-8 grid gap-10 lg:grid-cols-2">
            <BreakdownList title="Reasons for loss" :rows="result.byReason" />
            <BreakdownList title="Where deals are lost" :rows="result.byLostStage" />
            <BreakdownList title="Lost by segment" :rows="result.bySegment" />
            <BreakdownList title="Lost by lead source" :rows="result.bySource" />
          </div>

          <section class="mt-10">
            <div class="flex items-end justify-between gap-4 pb-2">
              <div>
                <span class="sm-eyebrow">Lost deal detail</span>
                <p class="mt-1 text-xs text-sm-muted">Highest-value lost opportunities first.</p>
              </div>
              <span class="text-xs text-sm-muted">{{ sortedDeals.length }} deals</span>
            </div>
            <div v-for="item in sortedDeals" :key="item.deal.id" class="py-4 border-t border-sm-line dark:border-white/10 flex gap-4 items-start">
              <div class="flex-1 min-w-0">
                <div class="text-sm font-bold text-sm-ink dark:text-white truncate">{{ item.deal.company }}</div>
                <div class="mt-1 text-xs text-sm-muted">
                  {{ item.deal.reasonWonLost || 'Reason not recorded' }} · {{ item.deal.segment || 'No segment' }} · {{ item.deal.leadSource || 'No source' }}
                </div>
                <div v-if="item.lostFrom" class="mt-1 text-xs text-sm-faint">Lost from {{ item.lostFrom }}</div>
              </div>
              <div class="text-sm font-bold text-sm-bad shrink-0">{{ formatMoney(item.value, item.deal.currency) }}</div>
            </div>
          </section>
        </template>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, defineComponent, h, onMounted } from 'vue'
import { useHead } from '@vueuse/head'
import SmSkeleton from '@/components/ui/SmSkeleton.vue'
import { formatMoney } from '@/lib/crmUtils'
import { buildLostDealIntelligence, type LostBreakdownRow } from '@/lib/crmLostIntelligence'
import { useCrmStore } from '@/stores/crm'

useHead({ title: 'Lost Deal Intelligence' })
const store = useCrmStore()

onMounted(() => {
  store.subscribe()
  store.loadEvents()
})

const result = computed(() => buildLostDealIntelligence(store.deals, store.events))
const sortedDeals = computed(() => [...result.value.deals].sort((a, b) => b.value - a.value))

function percent(value: number): string {
  return `${Math.round(value * 100)}%`
}

const BreakdownList = defineComponent({
  props: {
    title: { type: String, required: true },
    rows: { type: Array as () => LostBreakdownRow[], required: true }
  },
  setup(props) {
    return () => h('section', [
      h('div', { class: 'sm-eyebrow pb-2' }, props.title),
      ...props.rows.map(row => h('div', { class: 'py-3 border-t border-sm-line dark:border-white/10' }, [
        h('div', { class: 'flex items-baseline justify-between gap-4' }, [
          h('span', { class: 'text-sm font-bold text-sm-ink dark:text-white' }, row.label),
          h('span', { class: 'text-xs text-sm-muted' }, `${row.count} · ${percent(row.share)}`)
        ]),
        h('div', { class: 'mt-1 text-xs text-sm-muted' }, formatMoney(row.value))
      ]))
    ])
  }
})
</script>
