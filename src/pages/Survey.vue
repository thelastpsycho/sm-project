<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
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

const route = useRoute()
const router = useRouter()
const surveyStore = useSurveyStore()

const eventId = computed(() => route.params.eventId as string)

// State
const event = ref<Event | null>(null)
const loading = ref(true)
const submitting = ref(false)
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
  <div class="min-h-screen py-4 sm:py-6 px-3 sm:px-4">
    <div class="max-w-xl mx-auto">
      <!-- Loading State -->
      <div v-if="loading" class="min-h-[50vh] flex items-center justify-center">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-sm-primary"></div>
      </div>

      <!-- Error State -->
      <div v-else-if="errors.general && !event" class="min-h-[50vh] flex items-center justify-center">
        <SmCard class="max-w-md text-center p-6">
          <p class="text-gray-700 dark:text-gray-300">{{ errors.general }}</p>
        </SmCard>
      </div>

      <!-- Survey Content -->
      <template v-else>
        <!-- Header -->
        <div class="text-center mb-5 sm:mb-6">
          <div class="flex items-center justify-center mb-3">
            <img
              src="/logo-theanvaya.svg"
              alt="The Anvaya Beach Resort Bali"
              class="h-8 sm:h-10 w-auto"
            />
          </div>
          <div class="bg-white dark:bg-gray-800 px-4 sm:px-5 py-3 border border-sm-primary/15 rounded-xl">
            <p class="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-1">{{ ui.eventSurvey }}</p>
            <p class="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">{{ event?.eventName }}</p>
            <p class="text-xs sm:text-sm text-gray-600 dark:text-gray-400">{{ event?.companyName }}</p>
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
            <div class="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-1.5">
              <span>{{ ui.progress }}</span>
              <span>{{ answeredCount }} {{ ui.answeredOf }} {{ totalQuestions }}</span>
            </div>
            <div class="h-1.5 bg-sm-primary/15 rounded-full overflow-hidden">
              <div
                class="h-full bg-sm-primary transition-all duration-300"
                :style="{ width: `${progress}%` }"
              />
            </div>
          </div>

          <!-- Survey Form -->
          <form @submit.prevent="handleSubmit" class="bg-white dark:bg-gray-800 border border-sm-primary/15 p-4 sm:p-5 rounded-xl">
            <!-- Rating Questions -->
            <div class="mb-6">
              <p class="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-5 tracking-wide">
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
            <div class="mb-5 pt-5 border-t border-sm-primary/10">
              <p class="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-5 tracking-wide">
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
            <div v-if="errors.general" class="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p class="text-red-600 dark:text-red-400 text-sm">{{ errors.general }}</p>
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
        <p class="text-center text-xs text-gray-600 dark:text-gray-400 mt-4 sm:mt-5">
          {{ ui.thankYouForChoosing }}
        </p>
      </template>
    </div>
  </div>
</template>
