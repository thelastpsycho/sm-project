<template>
  <nav v-if="total > pageSize" :aria-label="label" class="flex flex-wrap items-center justify-between gap-2 py-3 text-sm text-sm-muted">
    <span role="status" aria-live="polite">{{ (page - 1) * pageSize + 1 }}–{{ Math.min(page * pageSize, total) }} of {{ total }}</span>
    <div class="flex items-center gap-2">
      <button type="button" :disabled="disabled || page <= 1" class="min-h-11 rounded-lg border border-sm-line px-3 font-semibold disabled:opacity-40 dark:border-white/20" @click="$emit('update:modelValue', page - 1)">Previous</button>
      <button type="button" :disabled="disabled || page >= pages" class="min-h-11 rounded-lg border border-sm-line px-3 font-semibold disabled:opacity-40 dark:border-white/20" @click="$emit('update:modelValue', page + 1)">Next</button>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { PAGE_SIZE } from '@/lib/pagination'
const props = withDefaults(defineProps<{ modelValue: number; total: number; pageSize?: number; label?: string; disabled?: boolean }>(), {
  pageSize: PAGE_SIZE, label: 'Deal pages', disabled: false
})
defineEmits<{ 'update:modelValue': [page: number] }>()
const pages = computed(() => Math.max(1, Math.ceil(props.total / props.pageSize)))
const page = computed(() => Math.max(1, Math.min(pages.value, props.modelValue)))
</script>
