<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { doc, getDoc } from 'firebase/firestore'
import { db, COLLECTIONS } from '@/lib/firebase'
import { getSurveyQuestions, getLikertOptions, getUIText, getValidationMessages } from '@/lib/surveyConstants'
import type { Event, Response, UserRole } from '@/types/survey'
import PreSurvey from '@/components/survey/PreSurvey.vue'
import LikertScale from '@/components/survey/LikertScale.vue'
import TextQuestion from '@/components/survey/TextQuestion.vue'
import SmButton from '@/components/ui/SmButton.vue'
import SmCard from '@/components/ui/SmCard.vue'
import { useSurveyStore } from '@/stores/survey'
import { useHead } from '@vueuse/head'

const route = useRoute()
const router = useRouter()
const surveyStore = useSurveyStore()

// Force light mode on survey page
onMounted(() => {
  document.documentElement.classList.remove('dark')
})

const eventId = computed(() => route.params.eventId as string)

// State
const event = ref<Event | null>(null)
const loading = ref(true)
const submitting = ref(false)

// Reactive page title with company name
useHead(computed(() => ({
  title: event.value
    ? `${event.value.companyName} - Event Survey - SM Mobile App`
    : 'Event Survey - SM Mobile App',
  meta: [
    {
      name: 'description',
      content: event.value
        ? `Share your feedback about the ${event.value.eventName} for ${event.value.companyName} at The Anvaya Beach Resort Bali.`
        : 'Share your feedback about your MICE event experience at The Anvaya Beach Resort Bali. Your input helps us improve our services.'
    }
  ]
})))
const currentStep = ref<'info' | 'questions'>('info')

// Pre-survey info
const name = ref('')
const email = ref('')
const role = ref<UserRole | ''>('')
const infoErrors = ref<{ name?: string; email?: string; role?: string }>({})

// Survey responses
const scores = ref<Record<string, number>>({})
const textAnswers = ref<Record<string, string>>({})
const errors = ref<Record<string, string>>({})
const eventLanguage = ref<'en' | 'id'>('en')

// Get translated content
const surveyQuestions = computed(() => getSurveyQuestions(eventLanguage.value))
const likertOptions = computed(() => getLikertOptions(eventLanguage.value))
const ui = computed(() => getUIText(eventLanguage.value))
const validationMsgs = computed(() => getValidationMessages(eventLanguage.value))

// Filter questions by type
const ratingQuestions = computed(() => surveyQuestions.value.filter(q => q.type === 'rating'))
const textQuestions = computed(() => surveyQuestions.value.filter(q => q.type === 'text'))

const answeredCount = computed(() => Object.keys(scores.value).length)
const totalQuestions = computed(() => ratingQuestions.value.length)
const progress = computed(() => (answeredCount.value / totalQuestions.value) * 100)

onMounted(async () => {
  await loadEvent()
})

async function loadEvent() {
  if (!eventId.value) {
    loading.value = false
    return
  }

  try {
    // Load event
    const eventDoc = await getDoc(doc(db, COLLECTIONS.EVENTS, eventId.value))
    if (eventDoc.exists()) {
      const eventData = { id: eventDoc.id, ...eventDoc.data() } as Event
      event.value = eventData
      eventLanguage.value = eventData.language || 'en'
    } else {
      errors.value = { general: 'Event not found. Please check your survey link.' }
    }

    // Load admin settings
    await surveyStore.loadAdminSettings()
  } catch (error) {
    console.error('Error loading event:', error)
    errors.value = { general: 'Failed to load survey. Please try again later.' }
  } finally {
    loading.value = false
  }
}

function validateInfo(): boolean {
  const newErrors: { name?: string; email?: string; role?: string } = {}

  if (!name.value.trim()) {
    newErrors.name = validationMsgs.value.nameRequired
  }
  if (!email.value.trim()) {
    newErrors.email = validationMsgs.value.emailRequired
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) {
    newErrors.email = validationMsgs.value.emailInvalid
  }
  if (!role.value) {
    newErrors.role = validationMsgs.value.roleRequired
  }

  infoErrors.value = newErrors
  return Object.keys(newErrors).length === 0
}

function handleNext() {
  if (validateInfo()) {
    currentStep.value = 'questions'
  }
}

function handleScoreChange(questionId: string, value: number) {
  scores.value[questionId] = value
  if (errors.value[questionId]) {
    delete errors.value[questionId]
  }
}

function handleTextAnswerChange(questionId: string, value: string) {
  textAnswers.value[questionId] = value
}

function validate(): boolean {
  const newErrors: Record<string, string> = {}

  ratingQuestions.value.forEach(q => {
    if (!scores.value[q.id]) {
      newErrors[q.id] = ui.value.selectRating
    }
  })

  errors.value = newErrors
  return Object.keys(newErrors).length === 0
}

function calculateScores() {
  const totalScore = Object.values(scores.value).reduce((sum, score) => sum + score, 0)
  const maxScore = ratingQuestions.value.length * 5
  const percentage = (totalScore / maxScore) * 100
  const averageScore = totalScore / ratingQuestions.value.length

  return { totalScore, maxScore, percentage, averageScore }
}

async function handleSubmit() {
  if (!validate()) return
  if (!eventId.value) return

  submitting.value = true

  try {
    const { totalScore, percentage, averageScore } = calculateScores()

    const response: Omit<Response, 'id' | 'createdAt'> = {
      eventId: eventId.value,
      name: name.value.trim(),
      email: email.value.trim(),
      role: role.value as UserRole,
      scores: scores.value,
      textAnswers: textAnswers.value,
      totalScore,
      percentage,
      averageScore
    }

    await surveyStore.submitSurvey(response)

    // Send webhook notification
    try {
      const webhookUrl = surveyStore.adminSettings.webhookUrl
      if (webhookUrl) {
        await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          eventId: eventId.value,
          eventName: event.value?.eventName,
          companyName: event.value?.companyName,
          language: eventLanguage.value,
          name: name.value.trim(),
          email: email.value.trim(),
          role: role.value,
          scores: scores.value,
          textAnswers: textAnswers.value,
          totalScore,
          percentage,
          averageScore,
          submittedAt: new Date().toISOString()
        })
        })
      }
    } catch (webhookError) {
      // Log webhook error but don't fail the submission
      console.error('Webhook notification failed:', webhookError)
    }

    // Redirect based on threshold
    if (averageScore >= surveyStore.adminSettings.reviewThreshold) {
      window.location.href = surveyStore.adminSettings.googleReviewUrl
    } else {
      router.push('/survey/thank-you')
    }
  } catch (error) {
    console.error('Error submitting survey:', error)
    errors.value = { general: 'Failed to submit survey. Please try again.' }
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="min-h-screen py-4 sm:py-6 px-3 sm:px-4 bg-gray-50">
    <div class="max-w-xl mx-auto">
      <!-- Loading State -->
      <div v-if="loading" class="min-h-[50vh] flex items-center justify-center">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500"></div>
      </div>

      <!-- Error State -->
      <div v-else-if="errors.general && !event" class="min-h-[50vh] flex items-center justify-center">
        <SmCard class="max-w-md text-center p-6 bg-white border border-gray-200 rounded-2xl shadow-sm">
          <p class="text-gray-700">{{ errors.general }}</p>
        </SmCard>
      </div>

      <!-- Survey Content -->
      <template v-else>
        <!-- Header -->
        <div class="mb-6 sm:mb-8">
          <!-- Logo -->
          <div class="flex items-center justify-center mb-4 sm:mb-5">
            <div class="relative">
              <div class="absolute inset-0 bg-gradient-to-br from-teal-400/20 to-blue-500/20 rounded-full blur-xl"></div>
              <img
                src="/logo-theanvaya.svg"
                alt="The Anvaya Beach Resort Bali"
                class="relative h-10 sm:h-12 w-auto"
              />
            </div>
          </div>

          <!-- Event Info Card -->
          <div class="relative overflow-hidden">
            <!-- Decorative background -->
            <div class="absolute inset-0 bg-gradient-to-br from-teal-500/5 via-transparent to-blue-500/5"></div>
            <div class="absolute top-0 left-0 w-32 h-32 bg-teal-500/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
            <div class="absolute bottom-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2"></div>

            <!-- Content -->
            <div class="relative bg-white backdrop-blur-md border border-teal-100 rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-lg shadow-teal-500/5">
              <!-- Decorative line -->
              <div class="absolute top-0 left-1/2 -translate-x-1/2 w-24 sm:w-32 h-0.5 bg-gradient-to-r from-transparent via-teal-500 to-transparent rounded-full"></div>

              <div class="text-center">
                <!-- Label -->
                <p class="text-xs sm:text-sm font-medium text-teal-600 tracking-wider uppercase mb-2 flex items-center justify-center gap-2">
                  <span class="w-8 h-px bg-gradient-to-r from-transparent to-teal-500/50"></span>
                  {{ ui.eventSurvey }}
                  <span class="w-8 h-px bg-gradient-to-l from-transparent to-teal-500/50"></span>
                </p>

                <!-- Event Name -->
                <h1 class="text-lg sm:text-xl font-bold text-gray-900 mb-2 leading-tight">
                  {{ event?.eventName }}
                </h1>

                <!-- Company Name with icon -->
                <div class="flex items-center justify-center gap-2 text-gray-600">
                  <svg class="w-4 h-4 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  <span class="text-sm">{{ event?.companyName }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Step 1: Pre-survey info collection -->
        <PreSurvey
          v-if="currentStep === 'info'"
          v-model:name="name"
          v-model:email="email"
          v-model:role="role"
          :errors="infoErrors"
          :ui="ui"
          @next="handleNext"
        />

        <!-- Step 2: Survey questions -->
        <template v-else>
          <!-- Progress Bar -->
          <div class="mb-4 sm:mb-5">
            <div class="flex justify-between text-xs text-gray-600 mb-1.5">
              <span>{{ ui.progress }}</span>
              <span>{{ answeredCount }} {{ ui.answeredOf }} {{ totalQuestions }}</span>
            </div>
            <div class="h-1.5 bg-teal-100 rounded-full overflow-hidden">
              <div
                class="h-full bg-teal-500 transition-all duration-300"
                :style="{ width: `${progress}%` }"
              />
            </div>
          </div>

          <!-- Survey Form -->
          <form @submit.prevent="handleSubmit" class="bg-white border border-gray-200 p-4 sm:p-6 rounded-2xl shadow-sm">
            <!-- Rating Questions -->
            <div class="mb-6">
              <p class="text-sm font-medium text-gray-700 mb-5 tracking-wide">
                {{ ui.rateYourExperience }}
              </p>
              <LikertScale
                v-for="(question, index) in ratingQuestions"
                :key="question.id"
                :question-id="question.id"
                :question="question.question"
                :model-value="scores[question.id] || 0"
                :likert-options="likertOptions"
                :error="errors[question.id]"
                :question-number="index + 1"
                @update:model-value="(value) => handleScoreChange(question.id, value)"
              />
            </div>

            <!-- Text Questions -->
            <div class="mb-5 pt-5 border-t border-gray-100">
              <p class="text-sm font-medium text-gray-700 mb-5 tracking-wide">
                {{ ui.yourFeedback }}
              </p>
              <TextQuestion
                v-for="(question, index) in textQuestions"
                :key="question.id"
                :question-id="question.id"
                :question="question.question"
                :model-value="textAnswers[question.id] || ''"
                :error="errors[question.id]"
                :question-number="ratingQuestions.length + index + 1"
                :placeholder="ui.placeholderShareThoughts"
                @update:model-value="(value) => handleTextAnswerChange(question.id, value)"
              />
            </div>

            <!-- Error Message -->
            <div v-if="errors.general" class="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p class="text-red-600 text-sm">{{ errors.general }}</p>
            </div>

            <!-- Submit Button -->
            <SmButton
              type="submit"
              :disabled="answeredCount < totalQuestions || submitting"
              :loading="submitting"
              class="w-full text-base py-3"
            >
              {{ ui.submitSurvey }}
            </SmButton>
          </form>
        </template>

        <!-- Footer -->
        <p class="text-center text-xs text-gray-500 mt-4 sm:mt-5">
          {{ ui.thankYouForChoosing }}
        </p>
      </template>
    </div>
  </div>
</template>
