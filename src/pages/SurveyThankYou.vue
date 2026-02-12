<script setup lang="ts">
import { onMounted } from 'vue'
import SmCard from '@/components/ui/SmCard.vue'
import { useHead } from '@vueuse/head'

// Force light mode
onMounted(() => {
  document.documentElement.classList.remove('dark')
})

useHead({
  title: 'Thank You - SM Mobile App',
  meta: [
    {
      name: 'description',
      content: 'Thank you for completing our MICE event survey. We sincerely appreciate your feedback and look forward to welcoming you back to The Anvaya Beach Resort Bali.'
    }
  ]
})
</script>

<template>
  <div class="min-h-screen flex items-center justify-center py-6 sm:py-8 px-3 sm:px-4 bg-gray-50">
    <SmCard class="max-w-md w-full text-center p-6 bg-white border border-gray-200 rounded-2xl shadow-sm">
      <div class="flex justify-center mb-5">
        <img
          src="/logo-theanvaya.svg"
          alt="The Anvaya Beach Resort Bali"
          class="h-12 w-auto"
        />
      </div>

      <div class="flex justify-center mb-5">
        <div class="h-14 w-14 rounded-full bg-teal-100 flex items-center justify-center">
          <svg class="h-7 w-7 text-teal-500 fill-current" viewBox="0 0 24 24">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
          </svg>
        </div>
      </div>

      <h1 class="text-2xl font-bold text-gray-900 mb-4">
        Thank You
      </h1>

      <p class="text-gray-600 mb-5 text-sm">
        We sincerely appreciate your feedback. Your comments help us improve our MICE services
        and ensure every event at The Anvaya Beach Resort Bali is exceptional.
      </p>

      <p class="text-gray-900 mb-6 italic text-sm">
        "We look forward to welcoming you back soon."
      </p>

      <div class="border-t border-gray-100 pt-5">
        <p class="text-xs text-gray-500">
          The Anvaya Beach Resort Bali
        </p>
      </div>
    </SmCard>
  </div>
</template>
