<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import SmCard from '@/components/ui/SmCard.vue'
import SmButton from '@/components/ui/SmButton.vue'
import SmInput from '@/components/ui/SmInput.vue'
import SmPage from '@/components/ui/SmPage.vue'
import { useSurveyStore } from '@/stores/survey'
import { useAdminStore } from '@/stores/admin'
import { generateSurveyUrl, copyToClipboard, formatScore, getQuestionLabel, getRoleLabel } from '@/lib/surveyUtils'
import { DEFAULT_REVIEW_THRESHOLD } from '@/lib/surveyConstants'
import type { AdminTab, Event, UserRole } from '@/types/survey'
import {
  ChartBarIcon,
  CalendarDaysIcon,
  ArrowRightOnRectangleIcon,
  PlusIcon,
  TrashIcon,
  ClipboardDocumentIcon,
  CheckIcon,
  ChevronDownIcon,
  Cog6ToothIcon
} from '@heroicons/vue/24/outline'
import { useHead } from '@vueuse/head'

useHead({
  title: 'Survey Admin - SM Mobile App',
  meta: [
    {
      name: 'description',
      content: 'Admin panel for managing MICE event surveys at The Anvaya Beach Resort Bali. Create events, view responses, and configure survey settings.'
    }
  ]
})

const router = useRouter()
const surveyStore = useSurveyStore()
const adminStore = useAdminStore()

const activeTab = ref<AdminTab>('dashboard')
const copiedEventId = ref<string | null>(null)
const selectedEventId = ref<string>('all')
const expandedResponseId = ref<string | null>(null)

// New event form
const newEvent = ref({
  eventName: '',
  companyName: '',
  language: 'en' as 'en' | 'id'
})

// Settings
const settings = ref({
  reviewThreshold: DEFAULT_REVIEW_THRESHOLD,
  googleReviewUrl: 'https://search.google.com/local/writereview',
  webhookUrl: 'https://workflow.anvayabali.com/webhook-test/2f86e433-6aac-42ab-a482-457777b45318'
})

const filteredResponses = computed(() => {
  return selectedEventId.value === 'all'
    ? surveyStore.responsesWithEvents
    : surveyStore.responsesWithEvents.filter(r => r.eventId === selectedEventId.value)
})

const stats = computed(() => {
  const responses = surveyStore.responsesWithEvents
  if (responses.length === 0) {
    return {
      totalResponses: 0,
      averageScore: 0,
      reviewRedirectRate: 0,
      scoreDistribution: [0, 0, 0, 0, 0]
    }
  }

  const totalResponses = responses.length
  const totalScore = responses.reduce((sum, r) => sum + r.totalScore, 0)
  const averageScore = (totalScore / (totalResponses * 5)) * 5

  const threshold = surveyStore.adminSettings.reviewThreshold
  const highScoreCount = responses.filter(r => {
    const avg = r.totalScore / 5
    return avg >= threshold
  }).length
  const reviewRedirectRate = (highScoreCount / totalResponses) * 100

  const scoreDistribution = [0, 0, 0, 0, 0]
  responses.forEach(response => {
    const avgScore = response.totalScore / 5
    const bucket = Math.round(avgScore) - 1
    if (bucket >= 0 && bucket < 5) {
      const idx = bucket as 0 | 1 | 2 | 3 | 4
      scoreDistribution[idx] = (scoreDistribution[idx] ?? 0) + 1
    }
  })

  return {
    totalResponses,
    averageScore: averageScore / 5,
    reviewRedirectRate,
    scoreDistribution
  }
})

onMounted(async () => {
  adminStore.checkAuth()
  if (!adminStore.isAuthenticated) {
    router.push('/survey/admin/login')
    return
  }
  await surveyStore.loadAllData()
  settings.value = {
    reviewThreshold: surveyStore.adminSettings.reviewThreshold,
    googleReviewUrl: surveyStore.adminSettings.googleReviewUrl,
    webhookUrl: surveyStore.adminSettings.webhookUrl
  }
})

function handleLogout() {
  adminStore.logout()
  router.push('/survey/admin/login')
}

async function handleCreateEvent() {
  if (!newEvent.value.eventName || !newEvent.value.companyName) return

  try {
    await surveyStore.createEvent({
      eventName: newEvent.value.eventName,
      companyName: newEvent.value.companyName,
      language: newEvent.value.language
    })
    newEvent.value = { eventName: '', companyName: '', language: 'en' }
  } catch (error) {
    console.error('Error creating event:', error)
  }
}

async function handleDeleteEvent(eventId: string) {
  if (!confirm('Are you sure you want to delete this event?')) return
  try {
    await surveyStore.deleteEvent(eventId)
  } catch (error) {
    console.error('Error deleting event:', error)
  }
}

async function handleCopyUrl(eventId: string) {
  const url = generateSurveyUrl(eventId)
  const success = await copyToClipboard(url)
  if (success) {
    copiedEventId.value = eventId
    setTimeout(() => copiedEventId.value = null, 2000)
  }
}

async function handleSaveSettings() {
  try {
    await surveyStore.updateAdminSettings(settings.value)
    alert('Settings saved successfully!')
  } catch (error) {
    console.error('Error saving settings:', error)
    alert('Failed to save settings. Please try again.')
  }
}

function getEventStats(event: Event) {
  const eventResponses = surveyStore.responsesWithEvents.filter(r => r.eventId === event.id)
  const count = eventResponses.length

  if (count === 0) {
    return { count, averageScore: 0, reviewRedirectRate: 0 }
  }

  const totalScore = eventResponses.reduce((sum, r) => sum + r.totalScore, 0)
  const averageScore = totalScore / count / 5
  const highScoreCount = eventResponses.filter(r => r.totalScore / 5 >= 4.0).length
  const reviewRedirectRate = (highScoreCount / count) * 100

  return { count, averageScore, reviewRedirectRate }
}

function toggleExpand(responseId: string | null) {
  expandedResponseId.value = expandedResponseId.value === responseId ? null : responseId
}

function getScoreCount(score: number): number {
  const idx = score - 1 as 0 | 1 | 2 | 3 | 4
  return stats.value.scoreDistribution[idx] ?? 0
}

function getScorePercentage(score: number): number {
  if (stats.value.totalResponses === 0) return 0
  return (getScoreCount(score) / stats.value.totalResponses) * 100
}
</script>

<template>
  <SmPage max-width="full">
    <div class="min-h-screen bg-sm-bg dark:bg-sm-bg-dark pb-safe-bottom">
      <!-- Header -->
      <header class="bg-white dark:bg-gray-800 border-b border-sm-primary/15 sticky top-0 z-10">
        <div class="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div class="flex items-center justify-between gap-3">
            <div class="min-w-0 flex-1">
              <img
                src="/logo-theanvaya.svg"
                alt="The Anvaya Beach Resort Bali"
                class="h-6 sm:h-7 lg:h-9 w-auto mb-1"
              />
              <p class="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 hidden xs:block">MICE Survey Admin</p>
            </div>
            <SmButton variant="secondary" @click="handleLogout" class="text-xs py-2 px-3 sm:px-4 text-gray-600 dark:text-gray-400 flex-shrink-0">
              <ArrowRightOnRectangleIcon class="h-4 w-4" />
              <span class="hidden sm:inline ml-1.5">Logout</span>
            </SmButton>
          </div>
        </div>
      </header>

      <!-- Loading State -->
      <div v-if="surveyStore.loading" class="min-h-[50vh] flex items-center justify-center">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-sm-primary"></div>
      </div>

      <!-- Content -->
      <template v-else>
        <!-- Navigation Tabs -->
        <div class="bg-white dark:bg-gray-800 border-b border-sm-primary/15 sticky top-[56px] sm:top-[64px] z-10">
          <div class="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8">
            <nav class="flex gap-0.5 overflow-x-auto scrollbar-hide -mx-2 sm:mx-0 px-2 sm:px-0">
              <button
                v-for="tab in [
                  { key: 'dashboard' as AdminTab, label: 'Dashboard', icon: ChartBarIcon },
                  { key: 'events' as AdminTab, label: 'Events', icon: CalendarDaysIcon },
                  { key: 'results' as AdminTab, label: 'Results', icon: ChartBarIcon },
                  { key: 'stats' as AdminTab, label: 'Statistics', icon: ChartBarIcon },
                  { key: 'settings' as AdminTab, label: 'Settings', icon: Cog6ToothIcon }
                ]"
                :key="tab.key"
                @click="activeTab = tab.key"
                :class="[
                  'flex items-center gap-1 sm:gap-2 px-2 sm:px-3 md:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0',
                  activeTab === tab.key
                    ? 'text-sm-primary border-b-2 border-sm-primary bg-sm-primary/5'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
                ]"
              >
                <component :is="tab.icon" class="h-4 w-4 flex-shrink-0" />
                <span class="hidden sm:inline">{{ tab.label }}</span>
              </button>
            </nav>
          </div>
        </div>

        <!-- Main Content -->
        <main class="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
          <!-- Dashboard Tab -->
          <div v-if="activeTab === 'dashboard'" class="space-y-4 sm:space-y-5">
            <h2 class="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">Dashboard Overview</h2>

            <!-- Stats Cards -->
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              <SmCard class="p-3 sm:p-4 lg:p-5">
                <div class="flex items-center gap-2 sm:gap-3">
                  <div class="h-8 w-8 sm:h-9 sm:h-10 sm:w-9 sm:w-10 rounded-full bg-sm-primary/10 flex items-center justify-center text-sm-primary flex-shrink-0">
                    <ChartBarIcon class="h-4 w-4 sm:h-5 sm:w-5" />
                  </div>
                  <div class="min-w-0 flex-1">
                    <p class="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400">Total Responses</p>
                    <p class="text-base sm:text-lg lg:text-xl font-semibold text-gray-900 dark:text-white truncate">{{ stats.totalResponses }}</p>
                  </div>
                </div>
              </SmCard>

              <SmCard class="p-3 sm:p-4 lg:p-5">
                <div class="flex items-center gap-2 sm:gap-3">
                  <div class="h-8 w-8 sm:h-9 sm:h-10 sm:w-9 sm:w-10 rounded-full bg-sm-primary/10 flex items-center justify-center text-sm-primary flex-shrink-0">
                    <ChartBarIcon class="h-4 w-4 sm:h-5 sm:w-5" />
                  </div>
                  <div class="min-w-0 flex-1">
                    <p class="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400">Average Score</p>
                    <p class="text-base sm:text-lg lg:text-xl font-semibold text-gray-900 dark:text-white truncate">{{ formatScore(stats.averageScore) }}</p>
                  </div>
                </div>
              </SmCard>

              <SmCard class="p-3 sm:p-4 lg:p-5">
                <div class="flex items-center gap-2 sm:gap-3">
                  <div class="h-8 w-8 sm:h-9 sm:h-10 sm:w-9 sm:w-10 rounded-full bg-sm-primary/10 flex items-center justify-center text-sm-primary flex-shrink-0">
                    <CalendarDaysIcon class="h-4 w-4 sm:h-5 sm:w-5" />
                  </div>
                  <div class="min-w-0 flex-1">
                    <p class="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400">Google Review Rate</p>
                    <p class="text-base sm:text-lg lg:text-xl font-semibold text-gray-900 dark:text-white truncate">{{ formatScore(stats.reviewRedirectRate, 0) }}%</p>
                  </div>
                </div>
              </SmCard>
            </div>

            <!-- Score Distribution -->
            <SmCard class="p-3 sm:p-4">
              <div class="mb-3 sm:mb-4">
                <h3 class="text-base sm:text-lg lg:text-xl font-semibold text-gray-900 dark:text-white">Score Distribution</h3>
              </div>
              <div class="space-y-1.5 sm:space-y-2">
                <div v-for="score in [5, 4, 3, 2, 1]" :key="score" class="flex items-center gap-1.5 sm:gap-3">
                  <span class="w-6 sm:w-8 lg:w-10 text-[10px] sm:text-xs sm:text-sm font-medium text-gray-900 dark:text-white flex-shrink-0">{{ score }} ★</span>
                  <div class="flex-1 h-3 sm:h-4 lg:h-5 bg-sm-primary/10 rounded overflow-hidden min-w-0">
                    <div
                      class="h-full bg-sm-primary transition-all duration-300 flex items-center justify-end px-0.5 sm:px-1 lg:px-2"
                      :style="{ width: `${(getScoreCount(score) / Math.max(...stats.scoreDistribution, 1)) * 100}%` }"
                    >
                      <span v-if="getScoreCount(score) > 0 && getScoreCount(score) / Math.max(...stats.scoreDistribution, 1) > 0.15" class="text-[8px] sm:text-[10px] lg:text-xs text-white font-medium">
                        {{ getScoreCount(score) }}
                      </span>
                    </div>
                  </div>
                  <span class="w-8 sm:w-10 text-[9px] sm:text-xs sm:text-sm text-gray-600 dark:text-gray-400 text-right flex-shrink-0">
                    {{ formatScore(getScorePercentage(score), 0) }}%
                  </span>
                </div>
              </div>
            </SmCard>

            <!-- Latest Responses -->
            <SmCard class="p-3 sm:p-4">
              <div class="mb-3 sm:mb-4">
                <h3 class="text-base sm:text-lg lg:text-xl font-semibold text-gray-900 dark:text-white">Latest Responses</h3>
              </div>
              <div v-if="surveyStore.responsesWithEvents.length === 0" class="p-3 sm:p-4">
                <p class="text-gray-600 dark:text-gray-400 text-center text-sm">No responses yet</p>
              </div>
              <div v-else class="space-y-2">
                <div
                  v-for="response in surveyStore.responsesWithEvents.slice(0, 5)"
                  :key="response.id"
                  class="flex items-center justify-between gap-2 p-2 sm:p-2.5 lg:p-3 bg-sm-bg dark:bg-gray-700 rounded-lg"
                >
                  <div class="min-w-0 flex-1">
                    <p class="font-medium text-xs sm:text-sm text-gray-900 dark:text-white truncate">{{ response.event?.eventName }}</p>
                    <p class="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400">{{ new Date(response.createdAt).toLocaleDateString() }}</p>
                  </div>
                  <div class="text-right flex-shrink-0">
                    <p class="text-sm sm:text-base font-semibold text-sm-primary">{{ formatScore(response.totalScore / 5) }}</p>
                    <p class="text-[9px] sm:text-[10px] sm:text-xs text-gray-600 dark:text-gray-400">out of 5</p>
                  </div>
                </div>
              </div>
            </SmCard>
          </div>

          <!-- Events Tab -->
          <div v-if="activeTab === 'events'" class="space-y-4 sm:space-y-5">
            <h2 class="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">Event Management</h2>

            <!-- Create Event Form -->
            <SmCard class="p-3 sm:p-4">
              <div class="mb-3 sm:mb-4">
                <h3 class="text-base sm:text-lg lg:text-xl font-semibold text-gray-900 dark:text-white">Create New Event</h3>
              </div>
              <form @submit.prevent="handleCreateEvent" class="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <SmInput
                  label="Event Name"
                  placeholder="e.g., Annual Company Meeting 2025"
                  v-model="newEvent.eventName"
                  required
                />
                <SmInput
                  label="Company Name"
                  placeholder="e.g., PT Teknologi Indonesia"
                  v-model="newEvent.companyName"
                  required
                />
                <div class="sm:col-span-2">
                  <label class="label">Survey Language</label>
                  <div class="flex gap-2">
                    <button
                      type="button"
                      @click="newEvent.language = 'en'"
                      :class="[
                        'flex-1 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg border-2 text-xs sm:text-sm font-medium transition-all',
                        newEvent.language === 'en'
                          ? 'bg-sm-primary text-white border-sm-primary'
                          : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-sm-primary/30 hover:border-sm-primary hover:bg-sm-primary/5'
                      ]"
                    >
                      🇬🇧 <span class="hidden xs:inline ml-1">English</span>
                    </button>
                    <button
                      type="button"
                      @click="newEvent.language = 'id'"
                      :class="[
                        'flex-1 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg border-2 text-xs sm:text-sm font-medium transition-all',
                        newEvent.language === 'id'
                          ? 'bg-sm-primary text-white border-sm-primary'
                          : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-sm-primary/30 hover:border-sm-primary hover:bg-sm-primary/5'
                      ]"
                    >
                      🇮🇩 <span class="hidden xs:inline ml-1">Indonesia</span>
                    </button>
                  </div>
                </div>
                <div class="sm:col-span-2">
                  <SmButton
                    type="submit"
                    :disabled="!newEvent.eventName || !newEvent.companyName"
                    class="w-full sm:w-auto text-xs sm:text-sm py-2 sm:py-2.5"
                  >
                    <PlusIcon class="h-4 w-4 mr-1 sm:mr-2" />
                    Create Event
                  </SmButton>
                </div>
              </form>
            </SmCard>

            <!-- Events List -->
            <SmCard class="p-3 sm:p-4">
              <div class="mb-3 sm:mb-4">
                <h3 class="text-base sm:text-lg lg:text-xl font-semibold text-gray-900 dark:text-white">All Events</h3>
              </div>
              <div v-if="surveyStore.events.length === 0" class="p-3 sm:p-4">
                <p class="text-gray-600 dark:text-gray-400 text-center text-sm">No events created yet</p>
              </div>
              <div v-else class="space-y-2">
                <div
                  v-for="event in surveyStore.events"
                  :key="event.id"
                  class="flex items-center justify-between gap-2 p-2.5 sm:p-3 bg-sm-bg dark:bg-gray-700 rounded-lg"
                >
                  <div class="min-w-0 flex-1">
                    <div class="flex items-center gap-1.5 sm:gap-2">
                      <p class="font-medium text-xs sm:text-sm text-gray-900 dark:text-white truncate flex-1">{{ event.eventName }}</p>
                      <span class="px-1 sm:px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-medium bg-sm-primary/10 text-sm-primary flex-shrink-0">
                        {{ event.language === 'en' ? '🇬🇧' : '🇮🇩' }}
                      </span>
                    </div>
                    <p class="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 truncate">{{ event.companyName }}</p>
                    <p class="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 mt-0.5">{{ new Date(event.createdAt).toLocaleDateString() }}</p>
                  </div>
                  <div class="flex items-center gap-1 sm:gap-1.5 sm:gap-2 flex-shrink-0">
                    <button
                      @click="handleCopyUrl(event.id)"
                      class="p-1.5 sm:p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                      title="Copy survey link"
                    >
                      <CheckIcon v-if="copiedEventId === event.id" class="h-3.5 w-3.5 sm:h-4 sm:w-4 text-emerald-600" />
                      <ClipboardDocumentIcon v-else class="h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-600 dark:text-gray-400" />
                    </button>
                    <button
                      @click="handleDeleteEvent(event.id)"
                      class="p-1.5 sm:p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors text-rose-600 hover:text-rose-700"
                      title="Delete event"
                    >
                      <TrashIcon class="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </SmCard>
          </div>

          <!-- Results Tab -->
          <div v-if="activeTab === 'results'" class="space-y-4 sm:space-y-5">
            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <h2 class="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">Survey Results</h2>

              <div class="relative w-full sm:w-auto">
                <select
                  v-model="selectedEventId"
                  class="appearance-none bg-white dark:bg-gray-800 border border-sm-primary/20 px-3 py-2 pr-8 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sm-primary/30 w-full"
                >
                  <option value="all">All Events</option>
                  <option v-for="event in surveyStore.events" :key="event.id" :value="event.id">
                    {{ event.eventName }}
                  </option>
                </select>
                <ChevronDownIcon class="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-600 dark:text-gray-400 pointer-events-none" />
              </div>
            </div>

            <!-- Mobile Cards / Desktop Table -->
            <SmCard class="p-0 sm:p-0 overflow-hidden">
              <div v-if="filteredResponses.length === 0" class="p-6 sm:p-8">
                <p class="text-gray-600 dark:text-gray-400 text-center text-sm">No responses found</p>
              </div>

              <template v-else>
                <!-- Mobile Card View -->
                <div class="sm:hidden divide-y divide-sm-primary/10">
                  <div
                    v-for="response in filteredResponses"
                    :key="response.id"
                    class="p-3"
                  >
                    <div
                      class="flex items-center justify-between gap-2 cursor-pointer mb-2"
                      @click="toggleExpand(response.id)"
                    >
                      <div class="min-w-0 flex-1">
                        <p class="font-medium text-sm text-gray-900 dark:text-white truncate">
                          {{ response.name || 'Anonymous' }}
                        </p>
                        <p class="text-xs text-gray-600 dark:text-gray-400 truncate">{{ response.event?.eventName || 'Unknown Event' }}</p>
                      </div>
                      <div class="flex items-center gap-2 flex-shrink-0">
                        <div class="text-right">
                          <p class="text-base font-semibold text-sm-primary">{{ formatScore(response.averageScore || response.totalScore / 6) }}</p>
                          <p class="text-[10px] text-gray-600 dark:text-gray-400">/ 5</p>
                        </div>
                        <ChevronDownIcon
                          :class="['h-4 w-4 text-gray-600 dark:text-gray-400 transition-transform', expandedResponseId === response.id && 'rotate-180']"
                        />
                      </div>
                    </div>

                    <div v-if="expandedResponseId === response.id" class="mt-3 pt-3 border-t border-sm-primary/10 space-y-3">
                      <!-- Contact Info -->
                      <div class="grid grid-cols-2 gap-2">
                        <div>
                          <p class="text-[10px] text-gray-600 dark:text-gray-400 uppercase tracking-wide">Email</p>
                          <p class="text-xs font-medium text-gray-900 dark:text-white break-all">{{ response.email }}</p>
                        </div>
                        <div>
                          <p class="text-[10px] text-gray-600 dark:text-gray-400 uppercase tracking-wide">Role</p>
                          <p class="text-xs font-medium text-gray-900 dark:text-white capitalize">{{ getRoleLabel(response.role) }}</p>
                        </div>
                      </div>

                      <!-- Rating Scores -->
                      <div>
                        <p class="text-xs font-semibold text-gray-900 dark:text-white mb-2">Ratings</p>
                        <div class="grid grid-cols-3 gap-1.5">
                          <div
                            v-for="[key, value] in Object.entries(response.scores)"
                            :key="key"
                            class="text-center p-1.5 bg-sm-bg dark:bg-gray-700 rounded-lg"
                          >
                            <p class="text-[9px] text-gray-600 dark:text-gray-400 truncate">{{ getQuestionLabel(key) }}</p>
                            <p class="text-sm font-semibold text-sm-primary">{{ value }}</p>
                          </div>
                        </div>
                      </div>

                      <!-- Text Answers -->
                      <div v-if="response.textAnswers && Object.keys(response.textAnswers).length > 0" class="space-y-2">
                        <div
                          v-for="[key, value] in Object.entries(response.textAnswers)"
                          :key="key"
                          v-show="value"
                          class="p-2.5 bg-sm-bg dark:bg-gray-700 rounded-lg"
                        >
                          <p class="text-[10px] font-semibold text-gray-900 dark:text-white mb-1">{{ getQuestionLabel(key) }}</p>
                          <p class="text-xs text-gray-600 dark:text-gray-400">"{{ value }}"</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Desktop Table View -->
                <div class="hidden sm:block divide-y divide-sm-primary/10">
                <div
                  v-for="response in filteredResponses"
                  :key="response.id"
                  class="p-3 sm:p-4"
                >
                  <div
                    class="flex items-center justify-between gap-2 cursor-pointer"
                    @click="toggleExpand(response.id)"
                  >
                    <div class="min-w-0 flex-1">
                      <p class="font-medium text-xs sm:text-sm text-gray-900 dark:text-white truncate">
                        {{ response.name || 'Anonymous' }}
                      </p>
                      <div class="flex items-center gap-2 flex-wrap">
                        <p class="text-xs text-gray-600 dark:text-gray-400">{{ response.event?.eventName || 'Unknown Event' }}</p>
                        <span class="text-sm-primary/50">•</span>
                        <p class="text-xs text-gray-600 dark:text-gray-400 capitalize">{{ getRoleLabel(response.role) }}</p>
                      </div>
                    </div>
                    <div class="flex items-center gap-2 sm:gap-4 flex-shrink-0">
                      <div class="text-right">
                        <p class="text-sm sm:text-base font-semibold text-sm-primary">{{ formatScore(response.averageScore || response.totalScore / 6) }}</p>
                        <p class="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400">/ 5</p>
                      </div>
                      <ChevronDownIcon
                        :class="['h-4 w-4 sm:h-5 sm:w-5 text-gray-600 dark:text-gray-400 transition-transform', expandedResponseId === response.id && 'rotate-180']"
                      />
                    </div>
                  </div>

                  <div v-if="expandedResponseId === response.id" class="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-sm-primary/10">
                    <!-- Contact Info -->
                    <div class="grid grid-cols-2 gap-2 sm:gap-3 mb-3 sm:mb-4">
                      <div>
                        <p class="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wide">Email</p>
                        <p class="text-xs sm:text-sm font-medium text-gray-900 dark:text-white break-all">{{ response.email }}</p>
                      </div>
                      <div>
                        <p class="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wide">Role</p>
                        <p class="text-xs sm:text-sm font-medium text-gray-900 dark:text-white capitalize">{{ getRoleLabel(response.role) }}</p>
                      </div>
                    </div>

                    <!-- Rating Scores -->
                    <div class="mb-3 sm:mb-4">
                      <p class="text-xs font-semibold text-gray-900 dark:text-white mb-2">Ratings</p>
                      <div class="grid grid-cols-3 sm:grid-cols-6 gap-1.5 sm:gap-2">
                        <div
                          v-for="[key, value] in Object.entries(response.scores)"
                          :key="key"
                          class="text-center p-1.5 sm:p-2 bg-sm-bg dark:bg-gray-700 rounded-lg"
                        >
                          <p class="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 truncate">{{ getQuestionLabel(key) }}</p>
                          <p class="text-sm sm:text-base font-semibold text-sm-primary">{{ value }}</p>
                        </div>
                      </div>
                    </div>

                    <!-- Text Answers -->
                    <div v-if="response.textAnswers && Object.keys(response.textAnswers).length > 0" class="space-y-2 sm:space-y-3">
                      <div
                        v-for="[key, value] in Object.entries(response.textAnswers)"
                        :key="key"
                        v-show="value"
                        class="p-2.5 sm:p-3 bg-sm-bg dark:bg-gray-700 rounded-lg"
                      >
                        <p class="text-[10px] sm:text-xs font-semibold text-gray-900 dark:text-white mb-1">{{ getQuestionLabel(key) }}</p>
                        <p class="text-xs sm:text-sm text-gray-600 dark:text-gray-400">"{{ value }}"</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              </template>
            </SmCard>
          </div>

          <!-- Statistics Tab -->
          <div v-if="activeTab === 'stats'" class="space-y-4 sm:space-y-5">
            <h2 class="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">Event Statistics</h2>

            <!-- Mobile Cards View -->
            <div class="sm:hidden space-y-3">
              <div
                v-for="event in surveyStore.events"
                :key="event.id"
                class="bg-white dark:bg-gray-800 rounded-xl border border-sm-primary/10 p-4"
              >
                <div class="flex items-start justify-between mb-3">
                  <div class="flex-1">
                    <p class="font-semibold text-sm text-gray-900 dark:text-white">{{ event.eventName }}</p>
                    <p class="text-xs text-gray-600 dark:text-gray-400">{{ event.companyName }}</p>
                  </div>
                </div>
                <div class="grid grid-cols-3 gap-2 pt-3 border-t border-sm-primary/10">
                  <div class="text-center">
                    <p class="text-[10px] text-gray-600 dark:text-gray-400 uppercase">Responses</p>
                    <p class="text-base font-semibold text-gray-900 dark:text-white">{{ getEventStats(event).count }}</p>
                  </div>
                  <div class="text-center">
                    <p class="text-[10px] text-gray-600 dark:text-gray-400 uppercase">Avg Score</p>
                    <p class="text-sm font-semibold text-sm-primary">{{ formatScore(getEventStats(event).averageScore) }}</p>
                  </div>
                  <div class="text-center">
                    <p class="text-[10px] text-gray-600 dark:text-gray-400 uppercase">Review %</p>
                    <p class="text-sm font-semibold text-gray-900 dark:text-white">{{ formatScore(getEventStats(event).reviewRedirectRate, 0) }}%</p>
                  </div>
                </div>
              </div>
            </div>

            <!-- Desktop Table View -->
            <SmCard class="hidden sm:block p-0 sm:p-0">
              <div class="overflow-x-auto">
                <table class="w-full text-xs sm:text-sm">
                  <thead class="bg-sm-bg dark:bg-gray-700">
                    <tr>
                      <th class="text-left p-2 sm:p-3 font-medium text-gray-900 dark:text-white">Event</th>
                      <th class="text-center p-2 sm:p-3 font-medium text-gray-900 dark:text-white">Responses</th>
                      <th class="text-center p-2 sm:p-3 font-medium text-gray-900 dark:text-white">Avg Score</th>
                      <th class="text-center p-2 sm:p-3 font-medium text-gray-900 dark:text-white">Review Rate</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-sm-primary/10">
                    <tr v-for="event in surveyStore.events" :key="event.id">
                      <td class="p-2 sm:p-3">
                        <p class="font-medium text-gray-900 dark:text-white text-xs sm:text-sm">{{ event.eventName }}</p>
                        <p class="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400">{{ event.companyName }}</p>
                      </td>
                      <td class="text-center p-2 sm:p-3 text-gray-900 dark:text-white">{{ getEventStats(event).count }}</td>
                      <td class="text-center p-2 sm:p-3">
                        <span class="font-semibold text-sm-primary">{{ formatScore(getEventStats(event).averageScore) }}</span>
                        <span class="text-gray-600 dark:text-gray-400"> / 5</span>
                      </td>
                      <td class="text-center p-2 sm:p-3 text-gray-900 dark:text-white">{{ formatScore(getEventStats(event).reviewRedirectRate, 0) }}%</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </SmCard>
          </div>

          <!-- Settings Tab -->
          <div v-if="activeTab === 'settings'" class="space-y-4 sm:space-y-5">
            <h2 class="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">Survey Settings</h2>

            <SmCard class="p-3 sm:p-4">
              <div class="mb-3 sm:mb-4">
                <h3 class="text-base sm:text-lg lg:text-xl font-semibold text-gray-900 dark:text-white">Submission Redirect Settings</h3>
              </div>
              <form @submit.prevent="handleSaveSettings" class="space-y-4 sm:space-y-5">
                <!-- Review Threshold -->
                <div>
                  <label class="label" for="threshold">
                    Review Threshold (Score {{ settings.reviewThreshold }}+)
                  </label>
                  <input
                    id="threshold"
                    type="range"
                    min="1"
                    max="5"
                    step="0.1"
                    v-model.number="settings.reviewThreshold"
                    class="w-full h-2 bg-sm-primary/15 rounded-lg appearance-none cursor-pointer accent-sm-primary"
                  />
                  <div class="flex justify-between text-xs text-gray-600 dark:text-gray-400 mt-2">
                    <span>1.0</span>
                    <span class="font-semibold text-sm-primary">{{ settings.reviewThreshold.toFixed(1) }}</span>
                    <span>5.0</span>
                  </div>
                  <p class="text-xs text-gray-600 dark:text-gray-400 mt-2">
                    Guests with an average score of <strong>{{ settings.reviewThreshold.toFixed(1) }}</strong> or higher will be redirected to Google Reviews.
                  </p>
                </div>

                <!-- Google Review URL -->
                <div>
                  <SmInput
                    id="reviewUrl"
                    type="url"
                    label="Google Review URL"
                    placeholder="https://search.google.com/local/writereview"
                    v-model="settings.googleReviewUrl"
                    required
                  />
                </div>

                <!-- Webhook URL -->
                <div>
                  <SmInput
                    id="webhookUrl"
                    type="url"
                    label="Webhook URL"
                    placeholder="https://workflow.anvayabali.com/webhook-test/..."
                    v-model="settings.webhookUrl"
                    required
                  />
                  <p class="text-xs text-gray-600 dark:text-gray-400 mt-1.5">
                    This URL will receive a POST request with survey details when a guest submits their feedback.
                  </p>
                </div>

                <!-- Save Button -->
                <div class="flex justify-end">
                  <SmButton type="submit" class="w-full sm:w-auto text-xs sm:text-sm py-2 sm:py-2.5">
                    Save Settings
                  </SmButton>
                </div>
              </form>
            </SmCard>

            <!-- Info Card -->
            <SmCard class="bg-sm-bg dark:bg-gray-700 p-3 sm:p-4">
              <div class="pt-0 sm:pt-1">
                <h3 class="font-semibold text-xs sm:text-sm text-gray-900 dark:text-white mb-2">How it works</h3>
                <ul class="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 space-y-1 sm:space-y-1.5">
                  <li>• Guests complete the 5-question survey (each question is scored 1-5)</li>
                  <li>• Their average score is calculated (total score / 5)</li>
                  <li>• If average score >= threshold → Redirect to Google Reviews</li>
                  <li>• If average score < threshold → Show Thank You page</li>
                </ul>
              </div>
            </SmCard>
          </div>
        </main>
      </template>
    </div>
  </SmPage>
</template>

<style scoped>
.label {
  display: block;
  font-size: 0.8125rem;
  font-weight: 600;
  color: inherit;
  margin-bottom: 0.375rem;
  letter-spacing: 0.01em;
}

.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
</style>
