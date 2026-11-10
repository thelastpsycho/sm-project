<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { doc, getDoc } from 'firebase/firestore'
import { db, COLLECTIONS } from '@/lib/firebase'
import { getSurveyQuestions, getLikertOptions, getUIText, getValidationMessages } from '@/lib/surveyConstants'
import type { Event, Response, ResponseMetadata, UserRole } from '@/types/survey'
import PreSurvey from '@/components/survey/PreSurvey.vue'
import { useSurveyStore } from '@/stores/survey'
import { useHead } from '@vueuse/head'
import { getClientMetadata, getGeoMetadata } from '@/lib/collectMetadata'

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

// Reactive page title with company name and Open Graph tags for social sharing
useHead(computed(() => ({
  title: event.value
    ? `${event.value.companyName} - ${event.value.eventName}`
    : 'Event Survey',
  meta: [
    {
      name: 'description',
      content: event.value
        ? `Share your feedback about ${event.value.eventName} for ${event.value.companyName} at The Anvaya Beach Resort Bali.`
        : 'Share your feedback about your MICE event experience at The Anvaya Beach Resort Bali. Your input helps us improve our services.'
    },
    // Open Graph tags for WhatsApp, Facebook, etc.
    {
      property: 'og:title',
      content: event.value
        ? `${event.value.companyName} - ${event.value.eventName}`
        : 'Event Survey - The Anvaya Beach Resort Bali'
    },
    {
      property: 'og:description',
      content: event.value
        ? `Share your feedback about ${event.value.eventName} for ${event.value.companyName} at The Anvaya Beach Resort Bali.`
        : 'Share your feedback about your MICE event experience at The Anvaya Beach Resort Bali.'
    },
    {
      property: 'og:type',
      content: 'website'
    },
    {
      property: 'og:url',
      content: `https://sm.anvayabali.com/survey/${eventId.value}`
    },
    {
      property: 'og:image',
      content: 'https://sm.anvayabali.com/logo-theanvaya.svg'
    },
    {
      property: 'og:site_name',
      content: 'The Anvaya Beach Resort Bali'
    }
  ]
})))
// Step 0 = guest details; steps 1..N = one survey question per screen
const step = ref(0)

// Pre-survey info
const name = ref('')
const email = ref('')
const role = ref<UserRole | ''>('')
const consent = ref(false)
const infoErrors = ref<{ name?: string; email?: string; role?: string; consent?: string }>({})

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

const totalSteps = computed(() => surveyQuestions.value.length)
const currentQuestion = computed(() => (step.value > 0 ? surveyQuestions.value[step.value - 1] : null))
const isLastStep = computed(() => step.value === totalSteps.value)
// Ratings are listed best-first so the most common answer sits nearest the thumb
const ratingOptions = computed(() => [...likertOptions.value].sort((a, b) => b.value - a.value))
const canAdvance = computed(() => {
  const q = currentQuestion.value
  if (!q) return false
  return q.type !== 'rating' || !!scores.value[q.id]
})

let advanceTimer: ReturnType<typeof setTimeout> | undefined

watch(step, () => {
  window.scrollTo({ top: 0 })
})

// Fetched once up front so it's already in hand by the time the guest submits —
// the IP-geo lookup is a network round trip and shouldn't add latency to submit.
const geoMetadata = ref<Partial<ResponseMetadata>>({})

onMounted(async () => {
  await loadEvent()
})

onMounted(() => {
  getGeoMetadata().then(data => { geoMetadata.value = data })
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
  const newErrors: { name?: string; email?: string; role?: string; consent?: string } = {}

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
  if (!consent.value) {
    newErrors.consent = validationMsgs.value.consentRequired
  }

  infoErrors.value = newErrors
  return Object.keys(newErrors).length === 0
}

function handleNext() {
  if (validateInfo()) {
    step.value = 1
  }
}

function handleScoreChange(questionId: string, value: number) {
  scores.value[questionId] = value
  if (errors.value[questionId]) {
    delete errors.value[questionId]
  }
  // Auto-advance after a short beat so the guest sees their choice land
  clearTimeout(advanceTimer)
  if (!isLastStep.value) {
    advanceTimer = setTimeout(goNext, 260)
  }
}

function goNext() {
  clearTimeout(advanceTimer)
  if (isLastStep.value) {
    handleSubmit()
    return
  }
  if (canAdvance.value) {
    step.value++
  }
}

function goBack() {
  clearTimeout(advanceTimer)
  if (step.value > 0) {
    step.value--
  }
}

function validate(): boolean {
  const newErrors: Record<string, string> = {}

  ratingQuestions.value.forEach(q => {
    if (!scores.value[q.id]) {
      newErrors[q.id] = ui.value.selectRating
    }
  })

  errors.value = newErrors
  const missing = surveyQuestions.value.findIndex(q => newErrors[q.id])
  if (missing !== -1) {
    step.value = missing + 1
  }
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
      consentGiven: consent.value,
      scores: scores.value,
      textAnswers: textAnswers.value,
      totalScore,
      percentage,
      averageScore,
      metadata: { ...getClientMetadata(), ...geoMetadata.value }
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
          consentGiven: consent.value,
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

    // Sync consented guests to Insider One (audience upsert + journey trigger event).
    // The endpoint itself no-ops when consentGiven is false.
    try {
      await fetch('/api/survey/insider-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.value.trim(),
          name: name.value.trim(),
          companyName: event.value?.companyName,
          eventName: event.value?.eventName,
          role: role.value,
          averageScore,
          submittedAt: new Date().toISOString(),
          consentGiven: consent.value
        })
      })
    } catch (insiderError) {
      // Log but don't fail the submission
      console.error('Insider sync failed:', insiderError)
    }

    // Redirect based on threshold
    if (averageScore >= surveyStore.adminSettings.reviewThreshold) {
      window.location.href = surveyStore.adminSettings.googleReviewUrl
    } else {
      router.push({ path: '/survey/thank-you', query: { lang: eventLanguage.value } })
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
  <div class="min-h-[100dvh] bg-white text-[#1F2A2E]">
    <div class="max-w-md mx-auto min-h-[100dvh] flex flex-col px-6 pt-5 pb-7">
      <!-- Loading State -->
      <div v-if="loading" class="flex-1 flex items-center justify-center">
        <div class="animate-spin rounded-full h-10 w-10 border-2 border-[#E3E9EB] border-t-sm-anvaya"></div>
      </div>

      <!-- Error State -->
      <div v-else-if="errors.general && !event" class="flex-1 flex flex-col items-center justify-center text-center gap-5">
        <img src="/logo-theanvaya.svg" alt="The Anvaya Beach Resort Bali" width="1558" height="410" class="h-7 w-auto aspect-[1558/410]" />
        <p class="text-base text-[#4A5A60]">{{ errors.general }}</p>
      </div>

      <!-- Survey Content -->
      <template v-else>
        <!-- Top bar -->
        <div class="flex items-center justify-between h-11">
          <button
            type="button"
            :aria-label="ui.back"
            :class="['w-11 h-11 rounded-full bg-[#F1F4F5] flex items-center justify-center transition-opacity', step === 0 ? 'invisible' : '']"
            @click="goBack"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6" /></svg>
          </button>
          <img
            src="/logo-theanvaya.svg"
            alt="The Anvaya Beach Resort Bali"
            width="1558"
            height="410"
            class="h-6 w-auto aspect-[1558/410]"
          />
          <span class="w-11 text-right text-[13px] font-bold text-sm-anvaya">
            <template v-if="step > 0">{{ step }}/{{ totalSteps }}</template>
          </span>
        </div>

        <!-- Segmented progress -->
        <div class="flex gap-1 mt-5" aria-hidden="true">
          <div
            v-for="i in totalSteps"
            :key="i"
            :class="[
              'flex-1 h-1 rounded-full transition-colors duration-300',
              i < step ? 'bg-sm-anvaya' : i === step ? 'bg-[#9FB3BA]' : 'bg-[#E3E9EB]'
            ]"
          />
        </div>

        <!-- Step 0: guest details -->
        <template v-if="step === 0">
          <p class="mt-8 text-xs font-bold tracking-[0.14em] uppercase text-[#5A6B71]">
            {{ ui.eventSurvey }}<template v-if="event?.companyName"> · {{ event.companyName }}</template>
          </p>
          <h1 class="mt-3 text-[27px] leading-tight font-extrabold tracking-tight">
            {{ event?.eventName }}
          </h1>
          <p class="mt-2 text-[15px] leading-relaxed text-[#4A5A60]">
            {{ ui.welcomeDescription }}
          </p>

          <PreSurvey
            v-model:name="name"
            v-model:email="email"
            v-model:role="role"
            v-model:consent="consent"
            :language="eventLanguage"
            :errors="infoErrors"
            :ui="ui"
            class="flex-1"
            @next="handleNext"
          />
        </template>

        <!-- Steps 1..N: one question per screen -->
        <form v-else-if="currentQuestion" class="flex-1 flex flex-col" @submit.prevent="goNext">
          <p class="mt-8 text-xs font-bold tracking-[0.14em] uppercase text-[#5A6B71]">
            {{ ui.question }} {{ step }} {{ ui.of }} {{ totalSteps }}<template v-if="event?.eventName"> · {{ event.eventName }}</template>
          </p>
          <h1 :id="`q-${currentQuestion.id}`" class="mt-3 text-[25px] sm:text-[27px] leading-tight font-extrabold tracking-tight">
            {{ currentQuestion.question }}
          </h1>

          <!-- Rating -->
          <template v-if="currentQuestion.type === 'rating'">
            <div role="radiogroup" :aria-labelledby="`q-${currentQuestion.id}`" class="mt-7 flex flex-col gap-2.5">
              <button
                v-for="option in ratingOptions"
                :key="`${currentQuestion.id}-${option.value}`"
                type="button"
                role="radio"
                :aria-checked="scores[currentQuestion.id] === option.value"
                :class="[
                  'h-[60px] px-[18px] rounded-2xl border-[1.5px] flex items-center justify-between text-[17px] font-bold transition-colors duration-150 active:scale-[0.99]',
                  scores[currentQuestion.id] === option.value
                    ? 'bg-sm-anvaya border-sm-anvaya text-white'
                    : 'bg-white border-[#D5DEE1] text-[#1F2A2E] hover:border-[#9FB3BA]'
                ]"
                @click="handleScoreChange(currentQuestion.id, option.value)"
              >
                <span>{{ option.label }}</span>
                <span
                  :class="[
                    'w-8 h-8 rounded-full flex items-center justify-center text-[15px] font-extrabold',
                    scores[currentQuestion.id] === option.value ? 'bg-white/20 text-white' : 'bg-[#F1F4F5] text-sm-anvaya'
                  ]"
                >{{ option.value }}</span>
              </button>
            </div>
            <p v-if="errors[currentQuestion.id]" class="mt-3 text-sm text-red-600" role="alert">{{ errors[currentQuestion.id] }}</p>
            <p v-else class="mt-3.5 text-[13px] text-center text-[#5A6B71]">{{ ui.tapToContinue }}</p>
          </template>

          <!-- Open text -->
          <div v-else class="mt-7 flex flex-col gap-2.5">
            <label :for="`answer-${currentQuestion.id}`" class="text-sm font-semibold text-[#5A6B71]">{{ ui.optionalAnswer }}</label>
            <textarea
              :id="`answer-${currentQuestion.id}`"
              v-model="textAnswers[currentQuestion.id]"
              rows="6"
              :placeholder="ui.placeholderShareThoughts"
              class="w-full p-4 rounded-2xl border-[1.5px] border-[#D5DEE1] bg-[#F7F9FA] text-base text-[#1F2A2E] placeholder:text-[#7A8A90] resize-none focus:outline-none focus:border-sm-anvaya focus:ring-0"
            ></textarea>
          </div>

          <div v-if="errors.general" class="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl" role="alert">
            <p class="text-red-600 text-sm">{{ errors.general }}</p>
          </div>

          <!-- Navigation -->
          <div class="mt-auto pt-8 flex gap-3">
            <button
              type="button"
              class="flex-1 h-14 rounded-full border-[1.5px] border-[#D5DEE1] bg-white text-base font-bold"
              @click="goBack"
            >{{ ui.back }}</button>
            <button
              type="submit"
              :disabled="!canAdvance || submitting"
              class="flex-[2] h-14 rounded-full bg-sm-anvaya text-white text-base font-bold disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <span v-if="submitting" class="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin" aria-hidden="true"></span>
              {{ isLastStep ? ui.submitSurvey : ui.next }}
            </button>
          </div>
        </form>

        <p class="text-center text-xs text-[#5A6B71] mt-6">
          {{ ui.thankYouForChoosing }}
        </p>
      </template>
    </div>
  </div>
</template>
