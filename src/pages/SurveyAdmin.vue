<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import SmButton from '@/components/ui/SmButton.vue'
import SmInput from '@/components/ui/SmInput.vue'
import SmSelect from '@/components/ui/SmSelect.vue'
import { useSurveyStore } from '@/stores/survey'
import { useSessionStore } from '@/stores/session'
import { usePermissionsStore } from '@/stores/permissions'
import { generateSurveyUrl, copyToClipboard, formatScore, getQuestionLabel, getRoleLabel } from '@/lib/surveyUtils'
import { DEFAULT_REVIEW_THRESHOLD } from '@/lib/surveyConstants'
import type { AdminTab, Event, UserRole } from '@/types/survey'
import {
  PlusIcon,
  TrashIcon,
  ClipboardDocumentIcon,
  CheckIcon,
  ChevronDownIcon,
  QrCodeIcon
} from '@heroicons/vue/24/outline'
import { useHead } from '@vueuse/head'

useHead({
  title: 'Survey Admin',
  meta: [
    {
      name: 'description',
      content: 'Admin panel for managing MICE event surveys at The Anvaya Beach Resort Bali. Create events, view responses, and configure survey settings.'
    }
  ]
})

const surveyStore = useSurveyStore()
const session = useSessionStore()
const permissions = usePermissionsStore()

// Granular Survey permissions (client-side gating; the survey collections are public
// in firestore.rules). Access to this page requires 'survey:view' (enforced by the
// router), and each action is further gated by the signed-in user's role.
const canCreate = computed(() => permissions.has(session.currentUser, 'survey:create'))
const canEdit = computed(() => permissions.has(session.currentUser, 'survey:edit'))
const canDelete = computed(() => permissions.has(session.currentUser, 'survey:delete'))

const tabs: { key: AdminTab; label: string }[] = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'events', label: 'Events' },
  { key: 'results', label: 'Results' },
  { key: 'stats', label: 'Statistics' },
  { key: 'settings', label: 'Settings' }
]

const activeTab = ref<AdminTab>('dashboard')
const copiedEventId = ref<string | null>(null)
const selectedEventId = ref<string>('all')
const expandedResponseId = ref<string | null>(null)
const selectedEventForQR = ref<Event | null>(null)

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

const eventFilterOptions = computed(() => [
  { value: 'all', label: 'All events' },
  ...surveyStore.events.map(e => ({ value: e.id, label: e.eventName }))
])

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
  const averageScore = responses.reduce((sum, r) => sum + r.averageScore, 0) / totalResponses

  const threshold = surveyStore.adminSettings.reviewThreshold
  const highScoreCount = responses.filter(r => r.averageScore >= threshold).length
  const reviewRedirectRate = (highScoreCount / totalResponses) * 100

  const scoreDistribution = [0, 0, 0, 0, 0]
  responses.forEach(response => {
    const bucket = Math.round(response.averageScore) - 1
    if (bucket >= 0 && bucket < 5) {
      const idx = bucket as 0 | 1 | 2 | 3 | 4
      scoreDistribution[idx] = (scoreDistribution[idx] ?? 0) + 1
    }
  })

  return {
    totalResponses,
    averageScore,
    reviewRedirectRate,
    scoreDistribution
  }
})

onMounted(async () => {
  await surveyStore.loadAllData()
  permissions.load() // hydrate the role matrix so survey action gating is accurate
  settings.value = {
    reviewThreshold: surveyStore.adminSettings.reviewThreshold,
    googleReviewUrl: surveyStore.adminSettings.googleReviewUrl,
    webhookUrl: surveyStore.adminSettings.webhookUrl
  }
})

async function handleCreateEvent() {
  if (!canCreate.value) return // defensive: create form is hidden without permission
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
  if (!canDelete.value) return // defensive: delete button is hidden without permission
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

function handleShowQR(event: Event) {
  selectedEventForQR.value = event
}

function getQRCodeUrl(eventId: string): string {
  const surveyUrl = generateSurveyUrl(eventId)
  return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(surveyUrl)}`
}

async function handleSaveSettings() {
  if (!canEdit.value) return // defensive: settings save is hidden without permission
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

  const averageScore = eventResponses.reduce((sum, r) => sum + r.averageScore, 0) / count
  const highScoreCount = eventResponses.filter(r => r.averageScore >= 4.0).length
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
  <div class="min-h-screen bg-white dark:bg-sm-bg-dark">
    <div class="max-w-[1100px] mx-auto lg:mx-0 px-6 lg:px-12 pt-10 lg:pt-9 pb-32">
      <!-- Header -->
      <div>
        <span class="sm-eyebrow">Survey admin</span>
        <h1 class="sm-display text-display mt-2">MICE Guest Feedback</h1>
      </div>

      <!-- Tabs -->
      <div class="mt-6 flex flex-wrap gap-2 border-b border-sm-line dark:border-white/10 pb-3" role="tablist" aria-label="Survey admin sections">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          type="button"
          role="tab"
          :aria-selected="activeTab === tab.key"
          @click="activeTab = tab.key"
          class="rounded-lg px-3.5 py-2 text-xs font-bold tracking-wide transition-colors"
          :class="
            activeTab === tab.key
              ? 'bg-sm-ink text-white dark:bg-white dark:text-sm-ink'
              : 'text-sm-muted hover:bg-sm-surface dark:hover:bg-white/5'
          "
        >
          {{ tab.label }}
        </button>
      </div>

      <!-- Loading -->
      <div v-if="surveyStore.loading" class="flex justify-center py-16">
        <div class="animate-spin rounded-full h-7 w-7 border-b-2 border-sm-ink dark:border-white"></div>
      </div>

      <template v-else>
        <!-- Dashboard Tab -->
        <div v-if="activeTab === 'dashboard'" class="mt-8">
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-x-8 gap-y-6">
            <div>
              <p class="sm-eyebrow">Total responses</p>
              <p class="mt-1.5 text-xl font-extrabold tracking-[-0.02em] text-sm-ink dark:text-white">{{ stats.totalResponses }}</p>
            </div>
            <div>
              <p class="sm-eyebrow">Average score</p>
              <p class="mt-1.5 text-xl font-extrabold tracking-[-0.02em] text-sm-primary">{{ formatScore(stats.averageScore) }}</p>
            </div>
            <div>
              <p class="sm-eyebrow">Google review rate</p>
              <p class="mt-1.5 text-xl font-extrabold tracking-[-0.02em] text-sm-ink dark:text-white">{{ formatScore(stats.reviewRedirectRate, 0) }}%</p>
            </div>
          </div>

          <section class="mt-10 pt-8 border-t border-sm-line dark:border-white/10">
            <h2 class="sm-eyebrow">Score distribution</h2>
            <div class="mt-4 space-y-3">
              <div v-for="score in [5, 4, 3, 2, 1]" :key="score">
                <div class="flex items-baseline justify-between text-xsm">
                  <span class="font-bold text-sm-ink dark:text-white">{{ score }} ★</span>
                  <span class="text-sm-muted">{{ getScoreCount(score) }} · {{ formatScore(getScorePercentage(score), 0) }}%</span>
                </div>
                <div class="mt-2 h-1.5 rounded-full bg-sm-hair dark:bg-white/10 overflow-hidden">
                  <div
                    class="h-full rounded-full bg-sm-ink dark:bg-white"
                    :style="{ width: `${(getScoreCount(score) / Math.max(...stats.scoreDistribution, 1)) * 100}%` }"
                  ></div>
                </div>
              </div>
            </div>
          </section>

          <section class="mt-10 pt-8 border-t border-sm-line dark:border-white/10">
            <h2 class="sm-eyebrow">Latest responses</h2>
            <p v-if="!surveyStore.responsesWithEvents.length" class="mt-3 text-sm text-sm-faint">No responses yet.</p>
            <div v-else class="mt-2">
              <div
                v-for="response in surveyStore.responsesWithEvents.slice(0, 5)"
                :key="response.id"
                class="flex items-center justify-between gap-3 py-3 border-t border-sm-hair dark:border-white/5"
              >
                <div class="min-w-0 flex-1">
                  <p class="text-sm font-bold text-sm-ink dark:text-white truncate">{{ response.event?.eventName }}</p>
                  <p class="text-eyebrow text-sm-muted">{{ new Date(response.createdAt).toLocaleDateString() }}</p>
                </div>
                <p class="text-sm font-bold text-sm-primary shrink-0">
                  {{ formatScore(response.averageScore) }} <span class="text-sm-faint font-normal">/ 5</span>
                </p>
              </div>
            </div>
          </section>
        </div>

        <!-- Events Tab -->
        <div v-if="activeTab === 'events'">
          <section v-if="canCreate" class="mt-8">
            <h2 class="sm-eyebrow mb-4">Create event</h2>
            <form @submit.prevent="handleCreateEvent" class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5 max-w-2xl">
              <SmInput
                label="Event name"
                placeholder="e.g., Annual Company Meeting 2025"
                v-model="newEvent.eventName"
                required
              />
              <SmInput
                label="Company name"
                placeholder="e.g., PT Teknologi Indonesia"
                v-model="newEvent.companyName"
                required
              />
              <div class="sm:col-span-2">
                <p class="sm-eyebrow mb-2">Survey language</p>
                <div class="inline-flex p-1 bg-sm-surface dark:bg-white/5 rounded-2xl">
                  <button
                    type="button"
                    @click="newEvent.language = 'en'"
                    class="px-6 py-1.5 rounded-xl text-xs font-bold transition-all"
                    :class="newEvent.language === 'en' ? 'bg-sm-ink text-white dark:bg-white dark:text-sm-ink' : 'text-sm-muted'"
                  >
                    English
                  </button>
                  <button
                    type="button"
                    @click="newEvent.language = 'id'"
                    class="px-6 py-1.5 rounded-xl text-xs font-bold transition-all"
                    :class="newEvent.language === 'id' ? 'bg-sm-ink text-white dark:bg-white dark:text-sm-ink' : 'text-sm-muted'"
                  >
                    Indonesia
                  </button>
                </div>
              </div>
              <div class="sm:col-span-2">
                <SmButton type="submit" :disabled="!newEvent.eventName || !newEvent.companyName">
                  <PlusIcon class="w-4 h-4 mr-1.5" /> Create event
                </SmButton>
              </div>
            </form>
          </section>

          <section :class="canCreate ? 'mt-10 pt-8 border-t border-sm-line dark:border-white/10' : 'mt-8'">
            <h2 class="sm-eyebrow mb-2">{{ surveyStore.events.length }} event{{ surveyStore.events.length === 1 ? '' : 's' }}</h2>
            <p v-if="!surveyStore.events.length" class="py-16 text-center text-sm-faint">No events created yet.</p>
            <div v-else>
              <div
                v-for="event in surveyStore.events"
                :key="event.id"
                class="flex items-center justify-between gap-3 py-3.5 border-t border-sm-hair dark:border-white/5"
              >
                <div class="min-w-0 flex-1">
                  <div class="flex items-center gap-2">
                    <p class="text-smd font-bold text-sm-ink dark:text-white truncate">{{ event.eventName }}</p>
                    <span class="text-eyebrow text-sm-muted shrink-0">{{ event.language === 'en' ? 'EN' : 'ID' }}</span>
                  </div>
                  <p class="text-xs text-sm-muted truncate">{{ event.companyName }} · {{ new Date(event.createdAt).toLocaleDateString() }}</p>
                </div>
                <div class="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    @click="handleShowQR(event)"
                    class="p-2 rounded-full text-sm-muted hover:text-sm-ink dark:hover:text-white hover:bg-sm-surface dark:hover:bg-white/5 transition-colors"
                    title="Show QR code"
                  >
                    <QrCodeIcon class="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    @click="handleCopyUrl(event.id)"
                    class="p-2 rounded-full text-sm-muted hover:text-sm-ink dark:hover:text-white hover:bg-sm-surface dark:hover:bg-white/5 transition-colors"
                    title="Copy survey link"
                  >
                    <CheckIcon v-if="copiedEventId === event.id" class="w-4 h-4 text-sm-won" />
                    <ClipboardDocumentIcon v-else class="w-4 h-4" />
                  </button>
                  <button
                    v-if="canDelete"
                    type="button"
                    @click="handleDeleteEvent(event.id)"
                    class="p-2 rounded-full text-sm-muted hover:text-sm-bad hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    title="Delete event"
                  >
                    <TrashIcon class="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </section>
        </div>

        <!-- Results Tab -->
        <div v-if="activeTab === 'results'" class="mt-8">
          <div class="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-2">
            <h2 class="sm-eyebrow">{{ filteredResponses.length }} response{{ filteredResponses.length === 1 ? '' : 's' }}</h2>
            <div class="w-full sm:w-56">
              <SmSelect v-model="selectedEventId" size="sm" :options="eventFilterOptions" />
            </div>
          </div>

          <p v-if="!filteredResponses.length" class="py-16 text-center text-sm-faint">No responses found.</p>

          <div v-else>
            <div
              v-for="response in filteredResponses"
              :key="response.id"
              class="border-t border-sm-hair dark:border-white/5"
            >
              <div class="flex items-center justify-between gap-3 py-3.5 cursor-pointer" @click="toggleExpand(response.id)">
                <div class="min-w-0 flex-1">
                  <p class="text-smd font-bold text-sm-ink dark:text-white truncate">{{ response.name || 'Anonymous' }}</p>
                  <p class="text-xs text-sm-muted truncate">{{ response.event?.eventName || 'Unknown event' }} · {{ getRoleLabel(response.role) }}</p>
                </div>
                <div class="flex items-center gap-3 shrink-0">
                  <div class="text-right">
                    <p class="text-sm font-bold text-sm-primary">{{ formatScore(response.averageScore || response.totalScore / 6) }}</p>
                    <p class="text-2xs text-sm-faint">/ 5</p>
                  </div>
                  <ChevronDownIcon
                    class="w-4 h-4 text-sm-muted transition-transform"
                    :class="expandedResponseId === response.id && 'rotate-180'"
                  />
                </div>
              </div>

              <div v-if="expandedResponseId === response.id" class="pb-5 -mt-1">
                <div class="grid grid-cols-2 gap-3 mb-4">
                  <div>
                    <p class="sm-eyebrow mb-1">Email</p>
                    <p class="text-sm font-medium text-sm-ink dark:text-white break-all">{{ response.email }}</p>
                  </div>
                  <div>
                    <p class="sm-eyebrow mb-1">Role</p>
                    <p class="text-sm font-medium text-sm-ink dark:text-white capitalize">{{ getRoleLabel(response.role) }}</p>
                  </div>
                </div>

                <p class="sm-eyebrow mb-2">Ratings</p>
                <div class="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-4">
                  <div
                    v-for="[key, value] in Object.entries(response.scores)"
                    :key="key"
                    class="text-center py-2 rounded-lg bg-sm-surface dark:bg-white/5"
                  >
                    <p class="text-2xs text-sm-muted truncate">{{ getQuestionLabel(key) }}</p>
                    <p class="text-sm font-bold text-sm-ink dark:text-white">{{ value }}</p>
                  </div>
                </div>

                <div v-if="response.textAnswers && Object.keys(response.textAnswers).length > 0" class="space-y-2">
                  <div
                    v-for="[key, value] in Object.entries(response.textAnswers)"
                    :key="key"
                    v-show="value"
                    class="p-3 rounded-lg bg-sm-surface dark:bg-white/5"
                  >
                    <p class="sm-eyebrow font-bold mb-1">{{ getQuestionLabel(key) }}</p>
                    <p class="text-sm text-sm-muted">"{{ value }}"</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Statistics Tab -->
        <div v-if="activeTab === 'stats'" class="mt-8">
          <h2 class="sm-eyebrow mb-2">Event statistics</h2>

          <div class="hidden sm:flex items-center gap-3 px-1 py-3 border-b border-sm-line dark:border-white/10 sm-eyebrow">
            <span class="flex-[2.4]">Event</span>
            <span class="flex-1 text-right">Responses</span>
            <span class="flex-1 text-right">Avg score</span>
            <span class="flex-1 text-right">Review rate</span>
          </div>

          <div
            v-for="event in surveyStore.events"
            :key="event.id"
            class="flex items-center gap-3 px-1 py-3.5 border-b border-sm-hair dark:border-white/5"
          >
            <div class="min-w-0 flex-1 sm:flex-[2.4]">
              <p class="text-smd font-bold text-sm-ink dark:text-white truncate">{{ event.eventName }}</p>
              <p class="text-xs text-sm-muted truncate">{{ event.companyName }}</p>
              <p class="sm:hidden text-xs text-sm-muted mt-1">
                {{ getEventStats(event).count }} responses · {{ formatScore(getEventStats(event).averageScore) }} avg · {{ formatScore(getEventStats(event).reviewRedirectRate, 0) }}% review
              </p>
            </div>
            <span class="hidden sm:block flex-1 text-right text-sm text-sm-ink-soft dark:text-gray-300">{{ getEventStats(event).count }}</span>
            <span class="hidden sm:block flex-1 text-right text-sm font-bold text-sm-primary">{{ formatScore(getEventStats(event).averageScore) }}</span>
            <span class="hidden sm:block flex-1 text-right text-sm text-sm-ink-soft dark:text-gray-300">{{ formatScore(getEventStats(event).reviewRedirectRate, 0) }}%</span>
          </div>

          <p v-if="!surveyStore.events.length" class="py-16 text-center text-sm-faint">No events yet.</p>
        </div>

        <!-- Settings Tab -->
        <div v-if="activeTab === 'settings'" class="mt-8 max-w-xl">
          <h2 class="sm-eyebrow mb-4">Submission redirect</h2>
          <form @submit.prevent="handleSaveSettings" class="space-y-6">
            <!-- Review Threshold -->
            <div>
              <label class="sm-eyebrow block mb-2" for="threshold">
                Review threshold (score {{ settings.reviewThreshold.toFixed(1) }}+)
              </label>
              <input
                id="threshold"
                type="range"
                min="1"
                max="5"
                step="0.1"
                v-model.number="settings.reviewThreshold"
                class="w-full h-1.5 bg-sm-hair dark:bg-white/10 rounded-full appearance-none cursor-pointer accent-sm-primary"
              />
              <div class="flex justify-between text-xs text-sm-faint mt-2">
                <span>1.0</span>
                <span class="font-bold text-sm-primary">{{ settings.reviewThreshold.toFixed(1) }}</span>
                <span>5.0</span>
              </div>
              <p class="text-xs text-sm-muted mt-2">
                Guests with an average score of <strong class="text-sm-ink dark:text-white">{{ settings.reviewThreshold.toFixed(1) }}</strong> or higher are redirected to Google Reviews.
              </p>
            </div>

            <SmInput
              id="reviewUrl"
              type="url"
              label="Google review URL"
              placeholder="https://search.google.com/local/writereview"
              v-model="settings.googleReviewUrl"
              required
            />

            <div>
              <SmInput
                id="webhookUrl"
                type="url"
                label="Webhook URL"
                placeholder="https://workflow.anvayabali.com/webhook-test/..."
                v-model="settings.webhookUrl"
                required
              />
              <p class="text-xs text-sm-muted mt-1.5">
                Receives a POST request with survey details when a guest submits feedback.
              </p>
            </div>

            <div v-if="canEdit" class="flex justify-end pt-2">
              <SmButton type="submit">Save settings</SmButton>
            </div>
          </form>

          <div class="mt-10 pt-8 border-t border-sm-line dark:border-white/10">
            <h3 class="sm-eyebrow mb-3">How it works</h3>
            <ul class="text-sm text-sm-muted space-y-1.5">
              <li>· Guests complete the 5-question survey (each question scored 1–5).</li>
              <li>· Their average score is calculated (total score ÷ 5).</li>
              <li>· Average score ≥ threshold → redirect to Google Reviews.</li>
              <li>· Average score &lt; threshold → show the Thank You page.</li>
            </ul>
          </div>
        </div>
      </template>
    </div>

    <!-- QR Code Modal -->
    <div
      v-if="selectedEventForQR"
      class="fixed inset-0 z-[60] flex items-center justify-center p-4"
      @click.self="selectedEventForQR = null"
    >
      <div class="fixed inset-0 bg-sm-ink/30 backdrop-blur-sm"></div>
      <div class="relative bg-white dark:bg-sm-card-dark w-full max-w-sm rounded-3xl shadow-2xl p-6 sm:p-8 animate-fade-in-up">
        <button
          type="button"
          @click="selectedEventForQR = null"
          class="absolute top-3 right-3 p-2 rounded-full text-sm-muted hover:text-sm-ink dark:hover:text-white hover:bg-sm-surface dark:hover:bg-white/5 transition-colors"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div class="text-center mb-6">
          <div class="w-11 h-11 rounded-full bg-sm-surface dark:bg-white/5 flex items-center justify-center mx-auto mb-4">
            <QrCodeIcon class="w-5 h-5 text-sm-ink dark:text-white" />
          </div>
          <h3 class="text-lg font-extrabold tracking-[-0.01em] text-sm-ink dark:text-white mb-1">Survey QR code</h3>
          <p class="text-sm text-sm-muted">{{ selectedEventForQR.eventName }}</p>
        </div>

        <div class="flex justify-center mb-6">
          <div class="p-4 bg-white rounded-2xl border border-sm-line dark:border-white/10">
            <img
              :src="getQRCodeUrl(selectedEventForQR.id)"
              :alt="`QR code for ${selectedEventForQR.eventName}`"
              class="w-56 h-56"
            />
          </div>
        </div>

        <div class="rounded-2xl bg-sm-surface dark:bg-white/5 p-4 mb-6">
          <p class="text-eyebrow text-sm-muted mb-1">Company</p>
          <p class="text-sm font-bold text-sm-ink dark:text-white mb-3">{{ selectedEventForQR.companyName }}</p>
          <p class="text-eyebrow text-sm-muted mb-1">Survey link</p>
          <p class="text-xs font-mono text-sm-ink-soft dark:text-gray-300 break-all">{{ generateSurveyUrl(selectedEventForQR.id) }}</p>
        </div>

        <a
          :href="getQRCodeUrl(selectedEventForQR.id)"
          download="survey-qr-code.png"
          class="w-full py-3 rounded-xl bg-sm-ink text-white dark:bg-white dark:text-sm-ink font-bold hover:bg-black dark:hover:bg-gray-100 transition-colors flex items-center justify-center gap-2"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Download QR code
        </a>
      </div>
    </div>
  </div>
</template>
