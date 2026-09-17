<template>
  <section>
    <div class="sm-eyebrow pb-2">{{ title }}</div>
    <div v-for="row in rows" :key="row.key" class="py-3 border-t border-sm-line dark:border-white/10">
      <div class="flex items-baseline justify-between gap-4">
        <span class="text-sm font-bold text-sm-ink dark:text-white">{{ row.label }}</span>
        <span class="text-xs text-sm-muted">{{ row.count }} · {{ percent(row.share) }}</span>
      </div>
      <div class="mt-1 text-xs text-sm-muted">{{ formatMoney(row.value) }}</div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { formatMoney } from '@/lib/crmUtils'
import type { LostBreakdownRow } from '@/lib/crmLostIntelligence'

defineProps<{
  title: string
  rows: LostBreakdownRow[]
}>()

function percent(value: number): string {
  return `${Math.round(value * 100)}%`
}
</script>
