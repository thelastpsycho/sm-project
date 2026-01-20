<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import SmCard from '@/components/ui/SmCard.vue'
import SmInput from '@/components/ui/SmInput.vue'
import SmButton from '@/components/ui/SmButton.vue'
import { useAdminStore } from '@/stores/admin'

const router = useRouter()
const adminStore = useAdminStore()

const pin = ref('')
const showError = ref(false)

async function handleSubmit() {
  if (!pin.value) return

  const success = await adminStore.login(pin.value)
  if (success) {
    router.push('/survey/admin')
  } else {
    showError.value = true
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center py-6 sm:py-8 px-3 sm:px-4 bg-sm-bg dark:bg-sm-bg-dark">
    <SmCard class="max-w-md w-full p-6">
      <div class="text-center mb-4">
        <div class="flex justify-center mb-4">
          <img
            src="/logo-theanvaya.svg"
            alt="The Anvaya Beach Resort Bali"
            class="h-10 w-auto"
          />
        </div>
        <h2 class="text-xl font-bold text-gray-900 dark:text-white">Admin Login</h2>
        <p class="text-gray-600 dark:text-gray-400 text-sm mt-2">
          Enter your PIN to access the admin panel
        </p>
      </div>

      <form @submit.prevent="handleSubmit" class="space-y-4">
        <SmInput
          id="pin"
          type="password"
          label="PIN"
          placeholder="Enter your PIN"
          v-model="pin"
          :error="showError ? (adminStore.loginError || 'Invalid PIN') : ''"
          maxlength="6"
          autocomplete="current-password"
          autofocus
        />

        <SmButton
          type="submit"
          :disabled="!pin"
          :loading="adminStore.loading"
          class="w-full"
        >
          Login
        </SmButton>
      </form>

      <p class="text-center text-xs text-gray-600 dark:text-gray-400 mt-6">
        The Anvaya Beach Resort Bali - MICE Survey Admin
      </p>
    </SmCard>
  </div>
</template>
