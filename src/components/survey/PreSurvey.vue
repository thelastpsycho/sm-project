<script setup lang="ts">
import { computed } from 'vue'
import SmInput from '@/components/ui/SmInput.vue'
import SmButton from '@/components/ui/SmButton.vue'
import SmCard from '@/components/ui/SmCard.vue'
import type { UserRole, UIText } from '@/types/survey'

interface Props {
  name: string
  email: string
  role: UserRole | ''
  errors: {
    name?: string
    email?: string
    role?: string
    general?: string
  }
  ui: UIText
}

interface Emits {
  (e: 'update:name', value: string): void
  (e: 'update:email', value: string): void
  (e: 'update:role', value: UserRole): void
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
  return props.name.trim() && props.email.trim() && props.role
})

function selectRole(role: UserRole) {
  emit('update:role', role)
}

function handleNext() {
  emit('next')
}
</script>

<template>
  <SmCard class="bg-white border border-gray-200 p-4 sm:p-6 rounded-2xl shadow-sm">
    <h2 class="text-lg sm:text-xl font-bold text-gray-900 mb-4 sm:mb-5 text-center">
      {{ ui.welcomeTitle }}
    </h2>
    <p class="text-xs sm:text-sm text-gray-600 mb-5 sm:mb-6 text-center">
      {{ ui.welcomeDescription }}
    </p>

    <div class="space-y-4 sm:space-y-5">
      <SmInput
        id="name"
        :label="ui.fullName"
        :placeholder="ui.fullNamePlaceholder"
        :model-value="name"
        :error="errors.name"
        autofocus
        @update:model-value="(value) => $emit('update:name', value)"
      />

      <SmInput
        id="email"
        type="email"
        :label="ui.emailAddress"
        :placeholder="ui.emailAddressPlaceholder"
        :model-value="email"
        :error="errors.email"
        @update:model-value="(value) => $emit('update:email', value)"
      />

      <div>
        <label class="label">{{ ui.role }}</label>
        <div class="flex flex-wrap gap-2 sm:gap-3">
          <button
            v-for="r in ROLES"
            :key="r.value"
            type="button"
            :class="[
              'px-4 py-2 sm:py-2.5 rounded-lg border-2 text-xs sm:text-sm font-semibold transition-all',
              role === r.value
                ? 'bg-teal-500 text-white border-teal-500'
                : 'bg-white text-gray-900 border-gray-200 hover:border-teal-300 hover:bg-teal-50'
            ]"
            @click="selectRole(r.value)"
          >
            {{ ui[r.key] }}
          </button>
        </div>
        <p v-if="errors.role" class="text-red-500 text-xs mt-1.5">{{ errors.role }}</p>
      </div>

      <div v-if="errors.general" class="p-3 bg-red-50 border border-red-200 rounded-lg">
        <p class="text-red-600 text-sm">{{ errors.general }}</p>
      </div>

      <SmButton
        :disabled="!isFormValid"
        class="w-full text-base py-3 mt-2"
        @click="handleNext"
      >
        {{ ui.next }}
      </SmButton>
    </div>
  </SmCard>
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
</style>
