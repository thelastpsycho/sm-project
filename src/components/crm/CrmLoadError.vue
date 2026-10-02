<template>
  <div v-if="store.loadError" role="alert" class="my-4 rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-100">
    <p class="font-semibold">{{ store.loadError }}</p>
    <p v-if="store.deals.length" class="mt-1">Showing previously loaded deals. These figures may be out of date.</p>
    <button type="button" class="mt-3 min-h-11 rounded-lg border border-current px-4 font-bold" @click="store.retrySubscription()">Retry</button>
  </div>
</template>

<script setup lang="ts">
import { useCrmStore } from '@/stores/crm'
const store = useCrmStore()
</script>
