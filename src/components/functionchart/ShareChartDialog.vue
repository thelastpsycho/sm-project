<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-150 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div v-if="open" class="fixed inset-0 z-[70] flex items-center justify-center p-4" role="dialog" aria-modal="true">
        <div class="fixed inset-0 bg-sm-ink/30 backdrop-blur-sm" @click="emit('close')"></div>

        <div
          class="relative flex max-h-[calc(100vh-2rem)] w-full max-w-md flex-col overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-sm-card-dark"
        >
          <!-- Header -->
          <div class="flex items-center justify-between gap-3 border-b border-gray-100 px-5 py-4 dark:border-white/5">
            <div class="min-w-0">
              <h3 class="text-base font-bold text-gray-900 dark:text-white">Share function chart</h3>
              <p class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{{ rangeLabel }} · {{ days }} days</p>
            </div>
            <button
              type="button"
              aria-label="Close"
              class="rounded-full p-2 text-sm-muted transition-colors hover:bg-sm-surface hover:text-sm-ink dark:hover:bg-white/5 dark:hover:text-white"
              @click="emit('close')"
            >
              <XMarkIcon class="h-5 w-5" />
            </button>
          </div>

          <!-- Body -->
          <div class="flex-1 overflow-auto px-5 py-4">
            <!-- Date range: tap to open the calendar picker -->
            <div class="mb-1">
              <label class="mb-2 block text-xs font-normal text-gray-600 dark:text-gray-400">Date range</label>
              <button
                type="button"
                class="flex w-full items-center justify-between border-b border-sm-line py-2.5 text-left transition-colors hover:border-sm-ink dark:border-white/15 dark:hover:border-white"
                @click="showPicker = true"
              >
                <div class="flex items-center gap-2">
                  <CalendarIcon class="h-4 w-4 text-sm-primary" />
                  <span class="text-sm font-bold text-gray-900 dark:text-white">{{ rangeLabel }}</span>
                </div>
                <ChevronRightIcon class="h-4 w-4 text-gray-300" />
              </button>
            </div>
            <p v-if="capped" class="mb-2 mt-1.5 text-eyebrow font-semibold text-amber-600 dark:text-amber-400">
              Range capped at 14 days.
            </p>

            <!-- Preview -->
            <div class="mt-3 overflow-hidden rounded-xl border border-sm-line bg-sm-surface dark:border-white/10 dark:bg-white/5">
              <div v-if="rendering" class="flex items-center justify-center py-16 text-sm text-gray-500 dark:text-gray-400">
                Rendering…
              </div>
              <img v-else-if="previewUrl" :src="previewUrl" alt="Function chart preview" class="block max-h-[52vh] w-full object-contain" />
              <div v-else class="flex items-center justify-center py-16 text-sm text-red-500">Could not render preview</div>
            </div>
            <p class="mt-2 text-eyebrow text-gray-400 dark:text-gray-500">
              All venues, up to 14 days. Sharing opens your phone's share sheet (pick WhatsApp); on desktop it downloads a JPG.
            </p>
          </div>

          <!-- Footer -->
          <div class="flex items-center justify-end gap-3 border-t border-gray-100 px-5 py-4 dark:border-white/5">
            <button
              type="button"
              :disabled="!currentBlob"
              class="rounded-xl border border-sm-line px-4 py-2 text-sm font-bold text-sm-ink transition-colors hover:bg-sm-surface disabled:opacity-50 dark:border-white/15 dark:text-gray-300 dark:hover:bg-white/10"
              @click="onDownload"
            >
              Download JPG
            </button>
            <button
              type="button"
              :disabled="!currentBlob"
              class="inline-flex items-center gap-2 rounded-xl bg-sm-ink px-4 py-2 text-sm font-bold text-white dark:bg-white dark:text-sm-ink transition-colors hover:bg-black dark:hover:bg-gray-100 disabled:opacity-60"
              @click="onShare"
            >
              <ShareIcon class="h-4 w-4" /> Share
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Calendar range picker (nested, above the share dialog) -->
    <div v-if="open && showPicker" class="fixed inset-0 z-[80] flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div class="fixed inset-0 bg-sm-ink/40 backdrop-blur-sm" @click="showPicker = false"></div>
      <div class="relative w-full max-w-md">
        <DateRangePicker
          :initial-start="startDate"
          :initial-end="endDate"
          mode="range"
          start-label="Start"
          end-label="End"
          @select="onRangeSelect"
          @close="showPicker = false"
        />
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { XMarkIcon, ShareIcon, CalendarIcon, ChevronRightIcon } from '@heroicons/vue/24/outline'
import DateRangePicker from '@/components/DateRangePicker.vue'
import { renderChartToBlob, shareOrDownload, dateRangeLabel, shiftISO, diffDays } from '@/lib/functionChartImage'
import { baliToday } from '@/lib/time'
import type { FunctionBooking } from '@/types/functionChart'

const MAX_DAYS = 14

const props = defineProps<{ open: boolean; functions: FunctionBooking[] }>()
const emit = defineEmits<{ close: [] }>()

const today = baliToday()
const startDate = ref(today)
const endDate = ref(shiftISO(today, 6)) // default: a 7-day window
const showPicker = ref(false)
const capped = ref(false)
const rendering = ref(false)
const previewUrl = ref('')
const currentBlob = ref<Blob | null>(null)

const days = computed(() => diffDays(endDate.value, startDate.value) + 1)
const rangeLabel = computed(() => dateRangeLabel(startDate.value, days.value))
const filename = computed(() => `function-chart-${startDate.value}_${endDate.value}.jpg`)

// Accept a range from the calendar, capping the span at 14 days.
function onRangeSelect(range: { start: string; end: string }) {
  startDate.value = range.start
  if (diffDays(range.end, range.start) + 1 > MAX_DAYS) {
    endDate.value = shiftISO(range.start, MAX_DAYS - 1)
    capped.value = true
  } else {
    endDate.value = range.end
    capped.value = false
  }
  showPicker.value = false
}

let renderToken = 0
async function render() {
  if (!props.open || !startDate.value || !endDate.value) return
  const token = ++renderToken
  rendering.value = true
  try {
    const blob = await renderChartToBlob({ functions: props.functions, startDate: startDate.value, days: days.value })
    if (token !== renderToken) return // a newer render superseded this one
    if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
    currentBlob.value = blob
    previewUrl.value = URL.createObjectURL(blob)
  } catch {
    if (token === renderToken) {
      currentBlob.value = null
      previewUrl.value = ''
    }
  } finally {
    if (token === renderToken) rendering.value = false
  }
}

// Re-render when opened or when the range changes.
watch(
  () => [props.open, startDate.value, endDate.value] as const,
  ([isOpen]) => {
    if (isOpen) render()
  },
  { immediate: true }
)

// Free the preview URL when the dialog closes.
watch(
  () => props.open,
  (isOpen) => {
    if (!isOpen) {
      showPicker.value = false
      if (previewUrl.value) {
        URL.revokeObjectURL(previewUrl.value)
        previewUrl.value = ''
        currentBlob.value = null
      }
    }
  }
)

async function onShare() {
  if (!currentBlob.value) return
  await shareOrDownload(currentBlob.value, filename.value, `Function Chart · ${rangeLabel.value}`)
}
function onDownload() {
  if (!currentBlob.value) return
  const a = document.createElement('a')
  a.href = URL.createObjectURL(currentBlob.value)
  a.download = filename.value
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(a.href)
}
</script>
