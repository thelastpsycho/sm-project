
<!-- "Nationality" tab: stay-night production by guest nationality. "Unassigned" is
     blank until check-in, since advance bookings don't carry a nationality yet. -->
<template>
  <RmsCard
    title="Nationality production"
    description="Stay-night positions by guest nationality. 'Unassigned' is blank until check-in - advance bookings don't carry a nationality yet."
    scroll
  >
    <table v-if="loading" class="w-full text-xsm">
      <thead>
        <tr class="text-right border-b border-sm-hair dark:border-white/5">
          <th class="py-2 px-4 text-left font-extrabold text-sm-ink dark:text-white">Nationality</th>
          <th class="py-2 px-3 font-extrabold text-sm-ink dark:text-white">OTB nights</th>
          <th class="py-2 px-3 font-extrabold text-sm-ink dark:text-white">Share</th>
          <th class="py-2 px-3 font-extrabold text-sm-ink dark:text-white">Revenue</th>
          <th class="py-2 px-3 font-extrabold text-sm-ink dark:text-white">ADR</th>
          <th class="py-2 px-3 font-extrabold text-sm-ink dark:text-white">LY nights</th>
          <th class="py-2 px-3 font-extrabold text-sm-ink dark:text-white">vs LY</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="n in 8" :key="n" class="border-b border-sm-hair dark:border-white/5">
          <td class="py-2.5 px-4"><SmSkeleton class="h-3 w-24" /></td>
          <td class="py-2.5 px-3"><SmSkeleton class="h-3 w-12 ml-auto" /></td>
          <td class="py-2.5 px-3"><SmSkeleton class="h-3 w-12 ml-auto" /></td>
          <td class="py-2.5 px-3"><SmSkeleton class="h-3 w-16 ml-auto" /></td>
          <td class="py-2.5 px-3"><SmSkeleton class="h-3 w-12 ml-auto" /></td>
          <td class="py-2.5 px-3"><SmSkeleton class="h-3 w-12 ml-auto" /></td>
          <td class="py-2.5 px-3"><SmSkeleton class="h-3 w-12 ml-auto" /></td>
        </tr>
      </tbody>
    </table>
    <table v-else-if="sortedRows.length" class="w-full text-xsm">
      <thead>
        <tr class="text-right border-b border-sm-hair dark:border-white/5">
          <th class="py-2 px-4 text-left font-extrabold text-sm-ink dark:text-white">Nationality</th>
          <th class="py-2 px-3 font-extrabold text-sm-ink dark:text-white">OTB nights</th>
          <th class="py-2 px-3 font-extrabold text-sm-ink dark:text-white">Share</th>
          <th class="py-2 px-3 font-extrabold text-sm-ink dark:text-white">Revenue</th>
          <th class="py-2 px-3 font-extrabold text-sm-ink dark:text-white">ADR</th>
          <th class="py-2 px-3 font-extrabold text-sm-ink dark:text-white">LY nights</th>
          <th class="py-2 px-3 font-extrabold text-sm-ink dark:text-white">vs LY</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="r in sortedRows" :key="r.id" class="border-b border-sm-hair dark:border-white/5">
          <td class="py-2.5 px-4 whitespace-nowrap">{{ r.id === 'unassigned' ? 'Unknown / not yet checked in' : r.name }}</td>
          <td class="py-2.5 px-3 text-right">{{ num(r.rooms) }}</td>
          <td class="py-2.5 px-3 text-right">{{ share(ratio(r.rooms, totalRooms)) }}</td>
          <td class="py-2.5 px-3 text-right" :title="money(revenue(r))">{{ moneyShort(revenue(r)) }}</td>
          <td class="py-2.5 px-3 text-right" :title="money(ratio(revenue(r), r.idrRooms))">{{ moneyShort(ratio(revenue(r), r.idrRooms)) }}</td>
          <td class="py-2.5 px-3 text-right">{{ num(r.comparison.rooms) }}</td>
          <td class="py-2.5 px-3 text-right" :class="signClass(difference(r.rooms, r.comparison.rooms))">{{ signed(difference(r.rooms, r.comparison.rooms)) }}</td>
        </tr>
      </tbody>
    </table>
    <template v-if="!loading && !sortedRows.length" #empty>No production for this selection.</template>
  </RmsCard>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import RmsCard from './RmsCard.vue'
import SmSkeleton from '@/components/ui/SmSkeleton.vue'
import { difference, money, moneyShort, num, ratio, share, signClass, signed } from '@/lib/rmsFormat'
import type { RmsProductionRow } from '@/types/rms'

const props = defineProps<{
  loading: boolean
  rows: RmsProductionRow[]
  basis: 'gross' | 'net'
}>()

const revenue = (r: RmsProductionRow) => (props.basis === 'net' ? r.netRevenue : r.revenue)
const sortedRows = computed(() => [...props.rows].sort((a, b) => b.rooms - a.rooms))
const totalRooms = computed(() => sortedRows.value.reduce((s, r) => s + r.rooms, 0))
</script>
