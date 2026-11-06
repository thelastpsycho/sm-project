
<!--
  Renders a single RMS figure respecting its quality flag: never a number for
  'unavailable' (a muted dash instead), and 'estimated' figures are marked — italic
  text plus a small "est." tag — since they're reconstructed, not a real snapshot.
-->
<template>
  <span v-if="quality === 'unavailable' || value == null" class="text-sm-faint">—</span>
  <span v-else-if="quality === 'estimated'" class="italic text-sm-warn" :title="'Estimated — reconstructed before the booking cache existed'">
    {{ text }}
    <sup class="ml-0.5 not-italic font-bold text-[9px] tracking-wide">est.</sup>
  </span>
  <span v-else>{{ text }}</span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { RmsQuality } from '@/types/rms'

const props = defineProps<{
  value: number | null
  quality: RmsQuality
  format?: (n: number) => string
}>()

const text = computed(() => {
  if (props.value == null) return '—'
  return props.format ? props.format(props.value) : String(props.value)
})
</script>
