<script setup lang="ts">
import { computed } from 'vue'
import type { UserRole, UIText } from '@/types/survey'

interface Props {
  name: string
  email: string
  role: UserRole | ''
  consent: boolean
  language: 'en' | 'id'
  errors: {
    name?: string
    email?: string
    role?: string
    consent?: string
    general?: string
  }
  ui: UIText
}

interface Emits {
  (e: 'update:name', value: string): void
  (e: 'update:email', value: string): void
  (e: 'update:role', value: UserRole): void
  (e: 'update:consent', value: boolean): void
  (e: 'next'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const ROLES: { value: UserRole; key: keyof UIText }[] = [
  { value: 'participant', key: 'roleParticipant' },
  { value: 'organizer', key: 'roleOrganizer' },
  { value: 'speaker', key: 'roleSpeaker' }
]

const isFormValid = computed(() => {
  return props.name.trim() && props.email.trim() && props.role && props.consent
})

function selectRole(role: UserRole) {
  emit('update:role', role)
}

function handleNext() {
  emit('next')
}

function fieldClass(hasError: boolean) {
  return [
    'h-14 w-full px-4 rounded-2xl border-[1.5px] bg-[#F7F9FA] text-base text-[#1F2A2E] placeholder:text-[#7A8A90] focus:outline-none focus:ring-0 focus:border-sm-anvaya',
    hasError ? 'border-red-400' : 'border-[#D5DEE1]'
  ]
}
</script>

<template>
  <form class="flex flex-col mt-7" novalidate @submit.prevent="handleNext">
    <div class="flex flex-col gap-5 mb-8">
      <!-- Name -->
      <div class="flex flex-col gap-2">
        <label for="survey-name" class="text-sm font-bold">{{ ui.fullName }}</label>
        <input
          id="survey-name"
          type="text"
          autocomplete="name"
          :value="name"
          :placeholder="ui.fullNamePlaceholder"
          :aria-invalid="!!errors.name"
          :class="fieldClass(!!errors.name)"
          @input="$emit('update:name', ($event.target as HTMLInputElement).value)"
        />
        <p v-if="errors.name" class="text-red-600 text-xs">{{ errors.name }}</p>
      </div>

      <!-- Email -->
      <div class="flex flex-col gap-2">
        <label for="survey-email" class="text-sm font-bold">{{ ui.emailAddress }}</label>
        <input
          id="survey-email"
          type="email"
          inputmode="email"
          autocomplete="email"
          :value="email"
          :placeholder="ui.emailAddressPlaceholder"
          :aria-invalid="!!errors.email"
          :class="fieldClass(!!errors.email)"
          @input="$emit('update:email', ($event.target as HTMLInputElement).value)"
        />
        <p v-if="errors.email" class="text-red-600 text-xs">{{ errors.email }}</p>
      </div>

      <!-- Role -->
      <fieldset class="flex flex-col gap-2">
        <legend class="text-sm font-bold mb-2">{{ ui.role }}</legend>
        <div class="grid grid-cols-3 gap-2" role="radiogroup">
          <button
            v-for="r in ROLES"
            :key="r.value"
            type="button"
            role="radio"
            :aria-checked="role === r.value"
            :class="[
              'h-12 rounded-2xl border-[1.5px] text-sm font-bold transition-colors',
              role === r.value
                ? 'bg-sm-anvaya border-sm-anvaya text-white'
                : 'bg-white border-[#D5DEE1] text-[#1F2A2E] hover:border-[#9FB3BA]'
            ]"
            @click="selectRole(r.value)"
          >
            {{ ui[r.key] }}
          </button>
        </div>
        <p v-if="errors.role" class="text-red-600 text-xs">{{ errors.role }}</p>
      </fieldset>

      <!-- Consent -->
      <div>
        <label class="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            :checked="consent"
            class="mt-0.5 h-5 w-5 rounded-md border-[#9FB3BA] text-sm-anvaya focus:ring-sm-anvaya shrink-0"
            @change="$emit('update:consent', ($event.target as HTMLInputElement).checked)"
          />
          <span class="text-[13px] leading-relaxed text-[#4A5A60]">
            {{ ui.consentPrefix }}
            <router-link
              :to="{ name: 'survey-terms', query: { lang: language } }"
              target="_blank"
              class="text-sm-anvaya font-bold underline"
              @click.stop
            >{{ ui.consentLinkText }}</router-link>{{ ui.consentSuffix }}
          </span>
        </label>
        <p v-if="errors.consent" class="text-red-600 text-xs mt-1.5">{{ errors.consent }}</p>
      </div>

      <div v-if="errors.general" class="p-3 bg-red-50 border border-red-200 rounded-xl">
        <p class="text-red-600 text-sm">{{ errors.general }}</p>
      </div>
    </div>

    <button
      type="submit"
      :disabled="!isFormValid"
      class="mt-auto h-14 w-full rounded-full bg-sm-anvaya text-white text-base font-bold disabled:opacity-40 disabled:cursor-not-allowed"
    >
      {{ ui.next }}
    </button>
  </form>
</template>
