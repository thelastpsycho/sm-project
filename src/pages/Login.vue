<template>
  <div class="min-h-screen bg-white dark:bg-sm-bg-dark transition-colors duration-300 flex justify-center">
    <div
      class="w-full max-w-[420px] min-h-screen flex flex-col justify-between px-8 pt-14 pb-10"
      :class="{ 'animate-shake': error }"
    >
      <img src="/logo-theanvaya.svg" alt="The Anvaya" width="1558" height="410" class="h-[34px] w-auto aspect-[1558/410] self-start dark:invert dark:brightness-0" />

      <div>
        <h1 class="sm-display text-hero leading-[1.05] mb-10">Sales<br />Management</h1>

        <form class="space-y-7" @submit.prevent="onSubmit">
          <SmInput
            v-model="email"
            type="email"
            label="Email"
            name="email"
            placeholder="you@theanvayabali.com"
            size="lg"
            :disabled="loading"
            required
          />
          <SmInput
            v-model="password"
            type="password"
            label="Password"
            name="password"
            placeholder="••••••••"
            size="lg"
            :disabled="loading"
            required
          />

          <p v-if="error" class="text-sm-bad text-xsm font-semibold">
            {{ error }}
          </p>
          <p v-if="resetSent" class="text-sm-won text-xsm font-semibold">
            Password reset link sent — check your email.
          </p>
          <!-- Keeps Enter-to-submit working now that the visible button lives in the footer. -->
          <button type="submit" class="hidden" aria-hidden="true" tabindex="-1"></button>
        </form>
      </div>

      <div class="space-y-4">
        <SmButton type="submit" size="lg" :loading="loading" class="w-full" @click="onSubmit">Sign in</SmButton>
        <button
          type="button"
          class="w-full text-center text-xsm font-semibold text-sm-muted hover:text-sm-ink dark:hover:text-white transition-colors"
          :disabled="loading"
          @click="onForgotPassword"
        >
          Forgot password?
        </button>
      </div>
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
  title: 'Login',
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
