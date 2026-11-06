
<template>
  <div ref="root" class="relative w-full">
    <label v-if="label" class="block sm-eyebrow mb-2">{{ label }}</label>
    <button
      type="button"
      :disabled="disabled"
      :class="triggerClasses"
      @click="open = !open"
    >
      <span class="truncate">{{ summary }}</span>
      <ChevronDownIcon class="w-4 h-4 shrink-0 text-sm-faint transition-transform" :class="{ 'rotate-180': open }" />
    </button>

    <div
      v-if="open"
      class="absolute z-20 mt-1 w-full max-h-80 flex flex-col rounded-lg border border-sm-line dark:border-white/10 bg-white dark:bg-sm-card-dark shadow-lg"
    >
      <div v-if="options.length > 8" class="p-2 border-b border-sm-hair dark:border-white/5">
        <input
          ref="searchInput"
          v-model="search"
          type="text"
          placeholder="Search…"
          class="w-full px-2 py-1.5 text-sm rounded-md border border-sm-line dark:border-white/15 bg-transparent text-sm-ink dark:text-white placeholder-sm-faint focus:outline-none focus:border-sm-ink dark:focus:border-white"
          @keydown.escape="open = false"
        />
      </div>
      <div class="overflow-y-auto py-1">
        <button
          v-if="filteredOptions.length"
          type="button"
          class="w-full text-left px-3 py-1.5 text-xsm font-bold text-sm-primary hover:bg-sm-surface dark:hover:bg-white/5"
          @click="toggleAll"
        >
          {{ allFilteredSelected ? 'Clear all' : search ? 'Select all (filtered)' : 'Select all' }}
        </button>
        <label
          v-for="opt in filteredOptions"
          :key="opt.value"
          class="flex items-center gap-2 px-3 py-1.5 text-sm cursor-pointer hover:bg-sm-surface dark:hover:bg-white/5"
        >
          <input
            type="checkbox"
            class="accent-sm-primary"
            :checked="modelValue.includes(opt.value)"
            @change="toggle(opt.value)"
          />
          <span class="truncate text-sm-ink dark:text-white">{{ opt.label }}</span>
        </label>
        <p v-if="!options.length" class="px-3 py-1.5 text-sm text-sm-faint">{{ emptyLabel }}</p>
        <p v-else-if="!filteredOptions.length" class="px-3 py-1.5 text-sm text-sm-faint">No matches for "{{ search }}"</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { ChevronDownIcon } from '@heroicons/vue/24/outline'

interface Option {
  value: string
  label: string
}

interface Props {
  modelValue: string[]
  options: Option[]
  label?: string
  placeholder?: string
  emptyLabel?: string
  disabled?: boolean
  size?: 'sm' | 'md' | 'lg'
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: 'All',
  emptyLabel: 'No options',
  disabled: false,
  size: 'md'
})

const emit = defineEmits<{
  'update:modelValue': [value: string[]]
}>()

const root = ref<HTMLElement | null>(null)
const searchInput = ref<HTMLInputElement | null>(null)
const open = ref(false)
const search = ref('')

const summary = computed(() => {
  if (!props.modelValue.length) return props.placeholder
  if (props.modelValue.length === 1) {
    return props.options.find(o => o.value === props.modelValue[0])?.label ?? props.placeholder
  }
  return `${props.modelValue.length} selected`
})

const filteredOptions = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return props.options
  return props.options.filter(o => o.label.toLowerCase().includes(q))
})

const allFilteredSelected = computed(
  () => filteredOptions.value.length > 0 && filteredOptions.value.every(o => props.modelValue.includes(o.value))
)

function toggle(value: string): void {
  const next = props.modelValue.includes(value)
    ? props.modelValue.filter(v => v !== value)
    : [...props.modelValue, value]
  emit('update:modelValue', next)
}

/** Select/clear all — scoped to the current (possibly search-filtered) list, not the full option set. */
function toggleAll(): void {
  const filteredValues = filteredOptions.value.map(o => o.value)
  if (allFilteredSelected.value) {
    emit('update:modelValue', props.modelValue.filter(v => !filteredValues.includes(v)))
  } else {
    emit('update:modelValue', [...new Set([...props.modelValue, ...filteredValues])])
  }
}

function onClickOutside(e: MouseEvent): void {
  if (root.value && !root.value.contains(e.target as Node)) open.value = false
}

watch(open, isOpen => {
  if (isOpen) {
    search.value = ''
    nextTick(() => searchInput.value?.focus())
  }
})

onMounted(() => document.addEventListener('click', onClickOutside))
onBeforeUnmount(() => document.removeEventListener('click', onClickOutside))

const triggerClasses = computed(() => {
  const base =
    'flex items-center justify-between gap-2 w-full border-0 border-b bg-transparent focus:ring-0 focus:outline-none transition-colors duration-200 text-left'
  const sizeClasses = {
    sm: 'py-2 text-sm',
    md: 'py-2.5 text-base',
    lg: 'py-3 text-lg'
  }
  const stateClasses =
    'border-sm-line text-sm-ink dark:text-white dark:border-white/15 focus:border-sm-ink dark:focus:border-white'
  const disabledClasses = props.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
  return `${base} ${sizeClasses[props.size]} ${stateClasses} ${disabledClasses}`
})
</script>
