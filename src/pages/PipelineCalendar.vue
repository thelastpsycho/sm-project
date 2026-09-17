<template>
  <div class="min-h-screen bg-white dark:bg-sm-bg-dark">
    <div class="px-4 sm:px-6 lg:px-10 pt-8 lg:pt-8 pb-32">
      <header class="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div class="min-w-0">
          <span class="sm-eyebrow">Pipeline calendar</span>
          <h1 class="sm-display text-display leading-[1.06] mt-2.5">What is happening<br class="hidden sm:block" /> and what is due</h1>
          <p class="mt-3 max-w-2xl text-sm text-sm-muted leading-6">
            A calendar generated entirely from existing pipeline dates, next actions and activity history. No separate calendar records to maintain.
          </p>
        </div>
        <div class="flex flex-wrap items-center gap-4 text-sm font-bold shrink-0">
          <router-link to="/crm" class="text-sm-muted hover:text-sm-ink dark:hover:text-white">Pipeline</router-link>
          <router-link to="/crm/intelligence" class="text-sm-muted hover:text-sm-ink dark:hover:text-white">Intelligence</router-link>
          <router-link to="/crm/report" class="text-sm-muted hover:text-sm-ink dark:hover:text-white">Report</router-link>
        </div>
      </header>

      <div v-if="store.loading" class="mt-9 grid grid-cols-2 lg:grid-cols-4 gap-6">
        <SmSkeleton v-for="n in 4" :key="n" class="h-20" />
      </div>

      <template v-else>
        <section class="mt-9 grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-7 border-y border-sm-line dark:border-white/10 py-6">
          <div>
            <div class="sm-eyebrow">Due today</div>
            <div class="mt-2 text-3xl font-bold text-sm-ink dark:text-white">{{ todaySummary.dueToday }}</div>
            <div class="mt-1 text-xs text-sm-muted">scheduled actions</div>
          </div>
          <div>
            <div class="sm-eyebrow">Overdue</div>
            <div class="mt-2 text-3xl font-bold text-sm-bad">{{ todaySummary.overdue }}</div>
            <div class="mt-1 text-xs text-sm-muted">follow-ups before today</div>
          </div>
          <div>
            <div class="sm-eyebrow">Arrivals today</div>
            <div class="mt-2 text-3xl font-bold text-sm-primary">{{ todaySummary.arrivals }}</div>
            <div class="mt-1 text-xs text-sm-muted">open or confirmed business</div>
          </div>
          <div>
            <div class="sm-eyebrow">Value requiring action</div>
            <div class="mt-2 text-3xl font-bold text-sm-ink dark:text-white">{{ formatMoney(todaySummary.actionValue) }}</div>
            <div class="mt-1 text-xs text-sm-muted">due today + overdue</div>
          </div>
        </section>

        <section class="mt-7 space-y-5">
          <div class="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
            <div class="flex flex-wrap items-center gap-2">
              <div class="inline-flex rounded-full border border-sm-line dark:border-white/15 p-0.5">
                <button
                  v-for="option in viewOptions"
                  :key="option.key"
                  type="button"
                  class="px-3.5 py-1.5 rounded-full text-xsm font-bold transition-colors"
                  :class="view === option.key ? 'bg-sm-ink text-white dark:bg-white dark:text-sm-ink' : 'text-sm-muted'"
                  @click="view = option.key"
                >
                  {{ option.label }}
                </button>
              </div>

              <button type="button" class="px-3 py-1.5 text-xsm font-bold text-sm-muted hover:text-sm-ink dark:hover:text-white" @click="movePeriod(-1)">←</button>
              <button type="button" class="px-3 py-1.5 text-xsm font-bold border border-sm-line dark:border-white/15 rounded-full text-sm-ink dark:text-white" @click="goToday">Today</button>
              <button type="button" class="px-3 py-1.5 text-xsm font-bold text-sm-muted hover:text-sm-ink dark:hover:text-white" @click="movePeriod(1)">→</button>
              <span class="ml-1 text-sm font-bold text-sm-ink dark:text-white">{{ periodLabel }}</span>
            </div>

            <label class="inline-flex items-center gap-2 text-xs font-bold text-sm-muted cursor-pointer">
              <input v-model="mineOnly" type="checkbox" class="rounded border-sm-line" />
              Mine only
            </label>
          </div>

          <div>
            <div class="sm-eyebrow mb-2">Show on calendar</div>
            <div class="scr flex gap-2 overflow-x-auto pb-1">
              <button
                v-for="group in typeGroups"
                :key="group.key"
                type="button"
                class="whitespace-nowrap px-3.5 py-1.5 rounded-full border text-xsm font-bold transition-colors"
                :class="groupEnabled(group.types)
                  ? 'bg-sm-ink text-white border-sm-ink dark:bg-white dark:text-sm-ink dark:border-white'
                  : 'border-sm-line dark:border-white/15 text-sm-muted'"
                @click="toggleGroup(group.types)"
              >
                {{ group.label }}
              </button>
            </div>
          </div>

          <div class="grid grid-cols-2 md:grid-cols-4 gap-2">
            <select v-model="ownerFilter" class="rounded-lg border border-sm-line dark:border-white/15 bg-white dark:bg-sm-bg-dark px-3 py-2 text-xs text-sm-ink dark:text-white">
              <option value="">All owners</option>
              <option v-for="owner in ownerOptions" :key="owner" :value="owner">{{ owner }}</option>
            </select>
            <select v-model="segmentFilter" class="rounded-lg border border-sm-line dark:border-white/15 bg-white dark:bg-sm-bg-dark px-3 py-2 text-xs text-sm-ink dark:text-white">
              <option value="">All segments</option>
              <option v-for="segment in segmentOptions" :key="segment" :value="segment">{{ segment }}</option>
            </select>
            <select v-model="stageFilter" class="rounded-lg border border-sm-line dark:border-white/15 bg-white dark:bg-sm-bg-dark px-3 py-2 text-xs text-sm-ink dark:text-white">
              <option value="">All stages</option>
              <option v-for="stage in DEAL_STAGES" :key="stage" :value="stage">{{ stage }}</option>
            </select>
            <select v-model="outcomeFilter" class="rounded-lg border border-sm-line dark:border-white/15 bg-white dark:bg-sm-bg-dark px-3 py-2 text-xs text-sm-ink dark:text-white">
              <option value="active">Open + Won</option>
              <option value="all">All outcomes</option>
              <option value="open">Open only</option>
              <option value="won">Won only</option>
              <option value="lost">Lost only</option>
            </select>
          </div>
        </section>

        <section v-if="view === 'month'" class="mt-7 overflow-x-auto scr">
          <div class="min-w-[820px] border-t border-l border-sm-line dark:border-white/10">
            <div class="grid grid-cols-7">
              <div v-for="day in weekdayLabels" :key="day" class="px-2 py-2 border-r border-b border-sm-line dark:border-white/10 sm-eyebrow text-center">
                {{ day }}
              </div>
            </div>
            <div class="grid grid-cols-7">
              <div
                v-for="date in monthDays"
                :key="date"
                class="min-h-[132px] p-2 border-r border-b border-sm-line dark:border-white/10"
                :class="date.slice(0, 7) === selectedDate.slice(0, 7) ? '' : 'bg-black/[0.015] dark:bg-white/[0.015]'"
              >
                <div class="flex items-center justify-between mb-1.5">
                  <span
                    class="inline-flex items-center justify-center w-6 h-6 text-xs font-bold rounded-full"
                    :class="date === today ? 'bg-sm-ink text-white dark:bg-white dark:text-sm-ink' : 'text-sm-muted'"
                  >
                    {{ Number(date.slice(8, 10)) }}
                  </span>
                  <span v-if="dayEvents(date).length > 3" class="text-eyebrow text-sm-faint">+{{ dayEvents(date).length - 3 }}</span>
                </div>
                <div class="space-y-1">
                  <router-link
                    v-for="event in dayEvents(date).slice(0, 3)"
                    :key="event.id"
                    :to="{ path: '/crm', query: { deal: event.dealId } }"
                    class="block rounded px-2 py-1.5 text-[10px] leading-4 font-bold truncate"
                    :class="eventClass(event)"
                    :title="`${event.title} — ${event.company}`"
                  >
                    {{ event.title }} · {{ event.company }}
                  </router-link>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section v-else-if="view === 'week'" class="mt-7 overflow-x-auto scr">
          <div class="min-w-[900px] grid grid-cols-7 border-t border-l border-sm-line dark:border-white/10">
            <div v-for="date in weekDays" :key="date" class="min-h-[420px] border-r border-b border-sm-line dark:border-white/10 p-3">
              <div class="pb-3 border-b border-sm-hair dark:border-white/5">
                <div class="sm-eyebrow">{{ weekday(date) }}</div>
                <div class="mt-1 flex items-baseline gap-2">
                  <span class="text-xl font-bold" :class="date === today ? 'text-sm-primary' : 'text-sm-ink dark:text-white'">{{ Number(date.slice(8, 10)) }}</span>
                  <span class="text-xs text-sm-muted">{{ shortMonth(date) }}</span>
                </div>
              </div>
              <div class="mt-3 space-y-2">
                <router-link
                  v-for="event in dayEvents(date)"
                  :key="event.id"
                  :to="{ path: '/crm', query: { deal: event.dealId } }"
                  class="block rounded-lg p-2.5"
                  :class="eventClass(event)"
                >
                  <div class="text-xs font-bold">{{ event.title }}</div>
                  <div class="mt-1 text-[11px] font-bold truncate">{{ event.company }}</div>
                  <div class="mt-1 text-[10px] opacity-75">{{ event.stage }} · {{ formatMoney(event.value, event.currency) }}</div>
                  <div v-if="eventNote(event)" class="mt-1.5 text-[10px] font-bold">{{ eventNote(event) }}</div>
                </router-link>
                <div v-if="!dayEvents(date).length" class="py-4 text-xs text-sm-faint">No items</div>
              </div>
            </div>
          </div>
        </section>

        <section v-else class="mt-7 max-w-4xl">
          <div v-if="!agendaGroups.length" class="py-16 border-t border-sm-line dark:border-white/10 text-center">
            <p class="text-sm font-bold text-sm-ink dark:text-white">Nothing scheduled in this 30-day window.</p>
            <p class="mt-1 text-xs text-sm-muted">Try another filter or enable more calendar event types.</p>
          </div>
          <div v-for="group in agendaGroups" :key="group.date" class="grid sm:grid-cols-[130px_minmax(0,1fr)] gap-3 sm:gap-6 py-5 border-t border-sm-line dark:border-white/10">
            <div>
              <div class="text-sm font-bold text-sm-ink dark:text-white">{{ agendaDateLabel(group.date) }}</div>
              <div class="mt-1 text-xs text-sm-muted">{{ formatDateLong(group.date) }}</div>
            </div>
            <div class="space-y-2">
              <router-link
                v-for="event in group.events"
                :key="event.id"
                :to="{ path: '/crm', query: { deal: event.dealId } }"
                class="flex items-start gap-4 rounded-lg px-3 py-3"
                :class="eventClass(event)"
              >
                <div class="flex-1 min-w-0">
                  <div class="text-xs font-bold">{{ event.title }}</div>
                  <div class="mt-1 text-sm font-bold truncate">{{ event.company }}</div>
                  <div class="mt-1 text-xs opacity-75">{{ event.stage }} · {{ event.ownerName || 'Unassigned' }} · {{ formatMoney(event.value, event.currency) }}</div>
                  <div v-if="eventNote(event)" class="mt-1.5 text-xs font-bold">{{ eventNote(event) }}</div>
                </div>
                <span class="text-xs font-bold shrink-0">Open →</span>
              </router-link>
            </div>
          </div>
        </section>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useHead } from '@vueuse/head'
import SmSkeleton from '@/components/ui/SmSkeleton.vue'
import { formatMoney } from '@/lib/crmUtils'
import {
  addCalendarDays,
  buildPipelineCalendarEvents,
  monthCalendarDays,
  startOfCalendarWeek,
  type PipelineCalendarEvent,
  type PipelineCalendarEventType
} from '@/lib/crmCalendar'
import { baliDateParts, baliToday } from '@/lib/time'
import { DEAL_STAGES } from '@/types/crm'
import { useCrmStore } from '@/stores/crm'
import { useSessionStore } from '@/stores/session'

useHead({ title: 'Pipeline Calendar' })

type CalendarView = 'month' | 'week' | 'agenda'
type OutcomeFilter = 'active' | 'all' | 'open' | 'won' | 'lost'

const store = useCrmStore()
const session = useSessionStore()
const today = baliToday()
const view = ref<CalendarView>('week')
const selectedDate = ref(today)
const activeTypes = ref<PipelineCalendarEventType[]>(['action', 'arrival', 'checkout'])
const ownerFilter = ref('')
const segmentFilter = ref('')
const stageFilter = ref('')
const outcomeFilter = ref<OutcomeFilter>('active')
const mineOnly = ref(false)

onMounted(() => {
  store.subscribe()
  store.loadEvents()
})

const viewOptions: Array<{ key: CalendarView; label: string }> = [
  { key: 'week', label: 'Week' },
  { key: 'month', label: 'Month' },
  { key: 'agenda', label: 'Agenda' }
]

const typeGroups: Array<{ key: string; label: string; types: PipelineCalendarEventType[] }> = [
  { key: 'action', label: 'Actions', types: ['action'] },
  { key: 'stay', label: 'Stay dates', types: ['arrival', 'checkout'] },
  { key: 'lead', label: 'Lead created', types: ['lead'] },
  { key: 'activity', label: 'Pipeline activity', types: ['activity'] }
]

const weekdayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const allEvents = computed(() => buildPipelineCalendarEvents(store.deals, store.events, today))
const currentEmail = computed(() => session.currentUser?.email ?? '')

const ownerOptions = computed(() => Array.from(new Set(store.deals.map(deal => deal.ownerName).filter(Boolean))).sort())
const segmentOptions = computed(() => Array.from(new Set(store.deals.map(deal => deal.segment).filter(Boolean))).sort())

function passesRecordFilters(event: PipelineCalendarEvent): boolean {
  if (mineOnly.value && event.ownerId !== currentEmail.value) return false
  if (ownerFilter.value && event.ownerName !== ownerFilter.value) return false
  if (segmentFilter.value && event.segment !== segmentFilter.value) return false
  if (stageFilter.value && event.stage !== stageFilter.value) return false
  if (outcomeFilter.value === 'active' && event.outcome === 'lost') return false
  if (outcomeFilter.value !== 'active' && outcomeFilter.value !== 'all' && event.outcome !== outcomeFilter.value) return false
  return true
}

const recordFilteredEvents = computed(() => allEvents.value.filter(passesRecordFilters))
const visibleEvents = computed(() => recordFilteredEvents.value.filter(event => activeTypes.value.includes(event.type)))

const todaySummary = computed(() => {
  const actions = recordFilteredEvents.value.filter(event => event.type === 'action')
  const requiringAction = actions.filter(event => event.overdue || event.dueToday)
  const uniqueDeals = new Map(requiringAction.map(event => [event.dealId, event]))
  return {
    dueToday: actions.filter(event => event.dueToday).length,
    overdue: actions.filter(event => event.overdue).length,
    arrivals: recordFilteredEvents.value.filter(event => event.type === 'arrival' && event.date === today).length,
    actionValue: Array.from(uniqueDeals.values()).reduce((sum, event) => sum + event.value, 0)
  }
})

const selectedParts = computed(() => {
  const date = new Date(`${selectedDate.value}T00:00:00Z`)
  return { year: date.getUTCFullYear(), monthIndex: date.getUTCMonth() }
})

const monthDays = computed(() => monthCalendarDays(selectedParts.value.year, selectedParts.value.monthIndex))
const weekStart = computed(() => startOfCalendarWeek(selectedDate.value))
const weekDays = computed(() => Array.from({ length: 7 }, (_, index) => addCalendarDays(weekStart.value, index)))

const periodLabel = computed(() => {
  if (view.value === 'month') {
    return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })
      .format(new Date(`${selectedDate.value}T00:00:00Z`))
  }
  if (view.value === 'week') {
    return `${formatDateLong(weekDays.value[0]!)} – ${formatDateLong(weekDays.value[6]!)}`
  }
  return `30 days from ${formatDateLong(selectedDate.value)}`
})

const agendaGroups = computed(() => {
  const end = addCalendarDays(selectedDate.value, 29)
  const events = visibleEvents.value
    .filter(event => event.date >= selectedDate.value && event.date <= end)
    .sort(eventSort)
  const grouped = new Map<string, PipelineCalendarEvent[]>()
  for (const event of events) {
    const list = grouped.get(event.date) ?? []
    list.push(event)
    grouped.set(event.date, list)
  }
  return Array.from(grouped.entries()).map(([date, groupEvents]) => ({ date, events: groupEvents }))
})

function groupEnabled(types: PipelineCalendarEventType[]): boolean {
  return types.every(type => activeTypes.value.includes(type))
}

function toggleGroup(types: PipelineCalendarEventType[]) {
  const enabled = groupEnabled(types)
  const next = new Set(activeTypes.value)
  for (const type of types) enabled ? next.delete(type) : next.add(type)
  activeTypes.value = Array.from(next)
}

function goToday() {
  selectedDate.value = today
}

function movePeriod(direction: -1 | 1) {
  if (view.value === 'week') {
    selectedDate.value = addCalendarDays(selectedDate.value, direction * 7)
    return
  }
  if (view.value === 'agenda') {
    selectedDate.value = addCalendarDays(selectedDate.value, direction * 30)
    return
  }
  const { year, monthIndex } = selectedParts.value
  const shifted = new Date(Date.UTC(year, monthIndex + direction, 1))
  selectedDate.value = shifted.toISOString().slice(0, 10)
}

function eventSort(a: PipelineCalendarEvent, b: PipelineCalendarEvent): number {
  if (a.date !== b.date) return a.date.localeCompare(b.date)
  const priority: Record<PipelineCalendarEventType, number> = { action: 0, arrival: 1, checkout: 2, lead: 3, activity: 4 }
  return priority[a.type] - priority[b.type] || a.company.localeCompare(b.company)
}

function dayEvents(date: string): PipelineCalendarEvent[] {
  return visibleEvents.value.filter(event => event.date === date).sort(eventSort)
}

function eventClass(event: PipelineCalendarEvent): string {
  if (event.type === 'action') {
    if (event.overdue) return 'bg-sm-bad/10 text-sm-bad'
    if (event.dueToday) return 'bg-sm-warn/10 text-sm-warn'
    return 'bg-sm-primary/10 text-sm-primary'
  }
  if (event.type === 'arrival') {
    if (event.commercialPressure === 'critical') return 'bg-sm-bad/10 text-sm-bad'
    if (event.commercialPressure === 'attention') return 'bg-sm-warn/10 text-sm-warn'
    return 'bg-sm-won/10 text-sm-won'
  }
  if (event.type === 'checkout') return 'bg-sm-ink/5 text-sm-muted dark:bg-white/10 dark:text-gray-200'
  if (event.type === 'activity') return 'bg-sm-wed/10 text-sm-wed'
  return 'bg-sm-ink/5 text-sm-muted dark:bg-white/10 dark:text-gray-200'
}

function eventNote(event: PipelineCalendarEvent): string {
  if (event.overdue) return 'Overdue follow-up'
  if (event.dueToday) return 'Due today'
  if (event.type === 'arrival' && event.commercialPressure === 'critical') return `⚠ Open deal · arrival in ${event.daysToArrival}d`
  if (event.type === 'arrival' && event.commercialPressure === 'attention') return `Arrival in ${event.daysToArrival}d · still open`
  if (event.type === 'arrival' && event.missingNextAction && event.outcome === 'open') return '⚠ No follow-up scheduled'
  return ''
}

function formatDateLong(iso: string): string {
  return new Intl.DateTimeFormat('en-US', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
    .format(new Date(`${iso}T00:00:00Z`))
}

function weekday(iso: string): string {
  return new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: 'UTC' }).format(new Date(`${iso}T00:00:00Z`))
}

function shortMonth(iso: string): string {
  return new Intl.DateTimeFormat('en-US', { month: 'short', timeZone: 'UTC' }).format(new Date(`${iso}T00:00:00Z`))
}

function agendaDateLabel(iso: string): string {
  if (iso === today) return 'Today'
  if (iso === addCalendarDays(today, 1)) return 'Tomorrow'
  return weekday(iso)
}

// Keep this import live as the canonical Bali-time source; the calendar itself uses
// date-only strings after the current Bali day has been resolved.
void baliDateParts
</script>
