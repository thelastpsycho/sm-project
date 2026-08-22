<template>
  <div class="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-sm-bg-dark transition-colors duration-300 px-4">
    <div
      class="max-w-sm w-full mx-auto p-8 flex flex-col items-center"
      :class="{ 'animate-shake': error }"
    >
      <div class="text-center mb-8">
        <img src="/logo-theanvaya.svg" alt="The Anvaya" class="h-12 mx-auto mb-4" />
        <h1 class="text-2xl font-semibold text-gray-900 dark:text-white mb-2 tracking-tight">
          Welcome Back
        </h1>
        <p class="text-sm text-gray-500 dark:text-gray-400">Sign in to continue</p>
      </div>

      <form class="w-full space-y-4" @submit.prevent="onSubmit">
        <SmInput
          v-model="email"
          type="email"
          label="Email"
          name="email"
          placeholder="you@theanvayabali.com"
          :disabled="loading"
          required
        />
        <SmInput
          v-model="password"
          type="password"
          label="Password"
          name="password"
          placeholder="Your password"
          :disabled="loading"
          required
        />

        <p v-if="error" class="text-red-500 text-xs font-medium text-center">
          {{ error }}
        </p>

        <SmButton type="submit" :loading="loading" class="w-full">Sign in</SmButton>
      </form>

      <button
        type="button"
        class="mt-4 text-xs text-gray-500 dark:text-gray-400 hover:text-sm-primary transition-colors"
        :disabled="loading"
        @click="onForgotPassword"
      >
        Forgot password?
      </button>

      <p v-if="resetSent" class="mt-3 text-xs text-green-600 dark:text-green-400 text-center">
        Password reset link sent — check your email.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useSessionStore } from '@/stores/session'
import SmInput from '@/components/ui/SmInput.vue'
import SmButton from '@/components/ui/SmButton.vue'
import { useHead } from '@vueuse/head'

useHead({
  title: 'Login - SM Mobile App',
  meta: [
    {
      name: 'description',
      content:
        'Secure login page for The Anvaya Beach Resort Bali sales management mobile application.'
    }
  ]
})

const router = useRouter()
const sessionStore = useSessionStore()

const email = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)
const resetSent = ref(false)

const flashError = (msg: string) => {
  error.value = msg
  // Re-trigger the shake animation each attempt.
  setTimeout(() => {
    error.value = msg
  }, 0)
}

const onSubmit = async () => {
  if (loading.value) return
  error.value = ''
  resetSent.value = false
  loading.value = true
  try {
    await sessionStore.login(email.value, password.value)
    router.push('/')
  } catch {
    flashError(sessionStore.authError ?? 'Incorrect email or password.')
    password.value = ''
  } finally {
    loading.value = false
  }
}

const onForgotPassword = async () => {
  error.value = ''
  resetSent.value = false
  if (!email.value.trim()) {
    flashError('Enter your email above first, then tap “Forgot password?”.')
    return
  }
  loading.value = true
  try {
    await sessionStore.sendPasswordReset(email.value)
    resetSent.value = true
  } catch {
    flashError('Could not send reset email. Check the address and try again.')
  } finally {
    loading.value = false
  }
}
</script>
