<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useHead } from '@vueuse/head'

const route = useRoute()

// Force light mode
onMounted(() => {
  document.documentElement.classList.remove('dark')
})

const lang = computed<'en' | 'id'>(() => (route.query.lang === 'id' ? 'id' : 'en'))

const copy = {
  en: {
    title: 'Thank you!',
    body: 'We sincerely appreciate your feedback. Your comments help us improve our MICE services and make every event at The Anvaya Beach Resort Bali exceptional.',
    closing: 'We look forward to welcoming you back soon.'
  },
  id: {
    title: 'Terima kasih!',
    body: 'Kami sangat menghargai masukan Anda. Komentar Anda membantu kami meningkatkan layanan MICE dan menjadikan setiap acara di The Anvaya Beach Resort Bali istimewa.',
    closing: 'Kami menantikan kedatangan Anda kembali.'
  }
}

const t = computed(() => copy[lang.value])

useHead({
  title: 'Thank You',
  meta: [
    {
      name: 'description',
      content: 'Thank you for completing our MICE event survey. We sincerely appreciate your feedback and look forward to welcoming you back to The Anvaya Beach Resort Bali.'
    }
  ]
})
</script>

<template>
  <div class="min-h-[100dvh] bg-white text-[#1F2A2E]">
    <div class="max-w-md mx-auto min-h-[100dvh] flex flex-col px-6 pt-5 pb-7">
      <!-- Top bar -->
      <div class="flex items-center justify-center h-11">
        <img
          src="/logo-theanvaya.svg"
          alt="The Anvaya Beach Resort Bali"
          width="1558"
          height="410"
          class="h-6 w-auto aspect-[1558/410]"
        />
      </div>

      <!-- Completed progress -->
      <div class="flex gap-1 mt-5" aria-hidden="true">
        <div v-for="i in 8" :key="i" class="flex-1 h-1 rounded-full bg-sm-anvaya" />
      </div>

      <main class="flex-1 flex flex-col items-center justify-center text-center gap-4 py-10">
        <div class="w-[72px] h-[72px] rounded-full bg-[#E6EEF0] text-sm-anvaya flex items-center justify-center">
          <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M5 12.5l4.5 4.5L19 7.5" />
          </svg>
        </div>
        <h1 class="text-[28px] leading-tight font-extrabold tracking-tight">{{ t.title }}</h1>
        <p class="text-base leading-relaxed text-[#4A5A60] max-w-[320px]">{{ t.body }}</p>
        <p class="text-[15px] font-semibold text-sm-anvaya">{{ t.closing }}</p>
      </main>

      <p class="text-center text-xs text-[#5A6B71]">The Anvaya Beach Resort Bali</p>
    </div>
  </div>
</template>
