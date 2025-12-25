<template>
  <div class="bg-white dark:bg-sm-card-dark rounded-3xl overflow-hidden shadow-2xl border border-gray-100 dark:border-white/10 animate-fade-in-up">
    <!-- Header -->
    <div class="px-6 py-4 flex items-center justify-between border-b border-gray-100 dark:border-white/5">
      <button @click="prevMonth" class="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full transition-colors">
        <ChevronLeftIcon class="w-5 h-5 text-gray-400" />
      </button>
      <h3 class="text-sm font-black uppercase tracking-widest text-gray-900 dark:text-white">
        {{ monthNames[currentDate.getMonth()] }} {{ currentDate.getFullYear() }}
      </h3>
      <button @click="nextMonth" class="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full transition-colors">
        <ChevronRightIcon class="w-5 h-5 text-gray-400" />
      </button>
    </div>

    <!-- Calendar -->
    <div class="p-4">
      <!-- Weekdays -->
      <div class="grid grid-cols-7 mb-2">
        <div v-for="day in ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']" :key="day" 
             class="text-center text-[10px] font-bold text-gray-400 uppercase tracking-tighter py-2">
          {{ day }}
        </div>
      </div>

      <!-- Days Grid -->
      <div class="grid grid-cols-7 gap-y-1">
        <div v-for="blank in blankDays" :key="'blank-'+blank" class="h-14"></div>
        <div 
          v-for="day in daysInMonth" 
          :key="day.dateString"
          @click="handleDateClick(day.dateString)"
          class="h-14 relative flex flex-col items-center justify-center cursor-pointer transition-all group"
          :class="[
            getDayClass(day.dateString),
            isToday(day.dateString) ? 'font-bold' : ''
          ]"
        >
          <!-- Range Highlight Overlay -->
          <div 
            v-if="isInRange(day.dateString)" 
            class="absolute inset-y-0 left-0 right-0 bg-[#b59c5d]/20 z-0"
            :class="[
              isStart(day.dateString) ? 'rounded-l-xl ml-1' : '',
              isEnd(day.dateString) ? 'rounded-r-xl mr-1' : ''
            ]"
          ></div>

          <!-- Selection Circle -->
          <div 
            v-if="isStart(day.dateString) || isEnd(day.dateString)" 
            class="absolute inset-4 bg-[#b59c5d] rounded-xl shadow-lg shadow-[#b59c5d]/30 z-10 scale-110"
          ></div>

          <!-- Day Number -->
          <span 
            class="relative z-20 text-sm font-bold transition-colors"
            :class="[
              isStart(day.dateString) || isEnd(day.dateString) ? 'text-white' : 'text-gray-700 dark:text-gray-200 group-hover:text-sm-primary',
              isPast(day.dateString) && !isStart(day.dateString) ? 'opacity-30' : ''
            ]"
          >
            {{ day.day }}
          </span>

          <!-- Labels -->
          <span 
            v-if="isStart(day.dateString)" 
            class="relative z-20 text-[8px] font-black uppercase tracking-tighter text-white/90 -mt-1"
          >
            Arrival
          </span>
          <span 
            v-if="isEnd(day.dateString)" 
            class="relative z-20 text-[8px] font-black uppercase tracking-tighter text-white/90 -mt-1"
          >
            Departure
          </span>
        </div>
      </div>
    </div>

    <!-- Footer Action -->
    <div class="px-6 py-4 bg-gray-50 dark:bg-black/20 border-t border-gray-100 dark:border-white/5 flex items-center justify-between">
      <div class="text-[10px] text-gray-400">
        <div v-if="start" class="flex items-center gap-1">
          <span class="font-bold text-gray-600 dark:text-gray-300">{{ formatDate(start) }}</span>
          <span v-if="end"> - <span class="font-bold text-gray-600 dark:text-gray-300">{{ formatDate(end) }}</span></span>
        </div>
        <div v-else>Select dates</div>
      </div>
      <button 
        @click="confirm"
        :disabled="!start || !end"
        class="px-5 py-2 rounded-xl bg-[#b59c5d] text-white text-xs font-black tracking-widest shadow-lg shadow-[#b59c5d]/20 disabled:opacity-50 disabled:grayscale transition-all active:scale-95"
      >
        CONFIRM
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/vue/24/outline'

const props = defineProps<{
  initialStart?: string
  initialEnd?: string
}>()

const emit = defineEmits(['select', 'close'])

const monthNames = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
]

const currentDate = ref(new Date())
const start = ref<string>(props.initialStart || '')
const end = ref<string>(props.initialEnd || '')

const daysInMonth = computed(() => {
  const year = currentDate.value.getFullYear()
  const month = currentDate.value.getMonth()
  const days = []
  const lastDay = new Date(year, month + 1, 0).getDate()
  
  for (let i = 1; i <= lastDay; i++) {
    const d = new Date(year, month, i)
    // Offset correction for ISO date strings
    const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`
    days.push({ day: i, dateString })
  }
  return days
})

const blankDays = computed(() => {
  const year = currentDate.value.getFullYear()
  const month = currentDate.value.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  // Adjust so Monday is 0 instead of Sunday
  const offset = firstDay === 0 ? 6 : firstDay - 1
  return offset
})

const prevMonth = () => {
  currentDate.value = new Date(currentDate.value.getFullYear(), currentDate.value.getMonth() - 1, 1)
}

const nextMonth = () => {
  currentDate.value = new Date(currentDate.value.getFullYear(), currentDate.value.getMonth() + 1, 1)
}

const handleDateClick = (dateString: string) => {
  if (isPast(dateString)) return

  if (!start.value || (start.value && end.value)) {
    start.value = dateString
    end.value = ''
  } else {
    if (new Date(dateString) < new Date(start.value)) {
      start.value = dateString
      end.value = ''
    } else {
      end.value = dateString
    }
  }
}

const isToday = (dateString: string) => {
  const today = new Date().toISOString().split('T')[0]
  return dateString === today
}

const isPast = (dateString: string) => {
  const today = new Date()
  today.setHours(0,0,0,0)
  return new Date(dateString) < today
}

const isStart = (dateString: string) => start.value === dateString
const isEnd = (dateString: string) => end.value === dateString

const isInRange = (dateString: string) => {
  if (!start.value || !end.value) return isStart(dateString) || isEnd(dateString)
  const d = new Date(dateString)
  const s = new Date(start.value)
  const e = new Date(end.value)
  return d >= s && d <= e
}

const getDayClass = (dateString: string) => {
  if (isStart(dateString) || isEnd(dateString)) return ''
  if (isInRange(dateString)) return ''
  return ''
}

const formatDate = (dateString: string) => {
  const d = new Date(dateString)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const confirm = () => {
  if (start.value && end.value) {
    emit('select', { start: start.value, end: end.value })
  }
}
</script>
