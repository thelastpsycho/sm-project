
<!-- One card shell for every RMS report tile: title, one-line description, actions. -->
<template>
  <section class="rounded-2xl border border-sm-line dark:border-white/10 bg-white dark:bg-sm-card-dark overflow-hidden">
    <div class="flex flex-wrap items-center justify-between gap-2 border-b border-sm-line dark:border-white/10 px-4 py-3">
      <div class="min-w-0">
        <h2 class="text-sm font-bold text-sm-ink dark:text-white">{{ title }}</h2>
        <p v-if="description" class="mt-0.5 text-2xs text-sm-faint">{{ description }}</p>
      </div>
      <div v-if="$slots.actions" class="flex flex-wrap items-center gap-2">
        <slot name="actions" />
      </div>
    </div>
    <div :class="[padded && 'p-4', scroll && 'max-h-[60vh] overflow-auto']">
      <slot />
    </div>
    <p v-if="$slots.empty" class="border-t border-sm-hair dark:border-white/5 px-4 py-3 text-xs text-sm-faint">
      <slot name="empty" />
    </p>
  </section>
</template>

<script setup lang="ts">
defineProps<{
  title: string
  description?: string
  padded?: boolean
  scroll?: boolean
}>()
</script>
