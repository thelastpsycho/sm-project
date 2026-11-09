<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import SmCard from '@/components/ui/SmCard.vue'
import { useHead } from '@vueuse/head'
import type { EventLanguage } from '@/types/survey'

const route = useRoute()

// Force light mode
onMounted(() => {
  document.documentElement.classList.remove('dark')
})

const language = computed<EventLanguage>(() =>
  route.query.lang === 'id' ? 'id' : 'en'
)

useHead(computed(() => ({
  title: language.value === 'id'
    ? 'Syarat & Ketentuan - The Anvaya Beach Resort Bali'
    : 'Terms & Conditions - The Anvaya Beach Resort Bali',
  meta: [
    {
      name: 'description',
      content: language.value === 'id'
        ? 'Syarat & Ketentuan untuk survei tamu The Anvaya Beach Resort Bali.'
        : 'Terms & Conditions for The Anvaya Beach Resort Bali guest survey.'
    }
  ]
})))
</script>

<template>
  <div class="min-h-screen py-6 sm:py-8 px-3 sm:px-4 bg-sm-surface">
    <div class="max-w-2xl mx-auto">
      <div class="flex items-center justify-center mb-6">
        <img
          src="/logo-theanvaya.svg"
          alt="The Anvaya Beach Resort Bali"
          width="1558"
          height="410"
          class="h-10 sm:h-12 w-auto aspect-[1558/410]"
        />
      </div>

      <SmCard class="bg-white dark:bg-sm-card-dark border border-sm-line dark:border-white/10 p-5 sm:p-8 rounded-2xl shadow-sm">
        <template v-if="language === 'id'">
          <h1 class="text-xl sm:text-2xl font-bold text-sm-ink mb-1">Syarat & Ketentuan</h1>
          <p class="text-xs text-sm-muted mb-6">Survei Tamu &mdash; The Anvaya Beach Resort Bali</p>

          <div class="space-y-5 text-sm text-gray-700 leading-relaxed">
            <section>
              <h2 class="font-semibold text-sm-ink mb-1.5">1. Persetujuan</h2>
              <p>Dengan mengisi dan mengirimkan survei ini, Anda menyatakan bahwa Anda telah membaca, memahami, dan menyetujui Syarat & Ketentuan ini.</p>
            </section>

            <section>
              <h2 class="font-semibold text-sm-ink mb-1.5">2. Data yang Dikumpulkan</h2>
              <p>Kami mengumpulkan nama, alamat email, peran Anda dalam acara, serta jawaban dan penilaian yang Anda berikan dalam survei ini.</p>
            </section>

            <section>
              <h2 class="font-semibold text-sm-ink mb-1.5">3. Penggunaan Data</h2>
              <p>Informasi yang Anda berikan digunakan untuk:</p>
              <ul class="list-disc pl-5 mt-1.5 space-y-1">
                <li>Mengevaluasi dan meningkatkan kualitas layanan serta pengalaman acara di The Anvaya Beach Resort Bali;</li>
                <li>Menghubungi Anda terkait tanggapan survei Anda apabila diperlukan; dan</li>
                <li><strong>Mengirimkan email pemasaran</strong>, seperti penawaran, promosi, berita, dan informasi acara dari The Anvaya Beach Resort Bali.</li>
              </ul>
            </section>

            <section>
              <h2 class="font-semibold text-sm-ink mb-1.5">4. Berhenti Berlangganan</h2>
              <p>Anda dapat berhenti menerima email pemasaran kapan saja dengan mengklik tautan berhenti berlangganan pada email yang kami kirimkan, atau dengan menghubungi kami secara langsung.</p>
            </section>

            <section>
              <h2 class="font-semibold text-sm-ink mb-1.5">5. Kerahasiaan Data</h2>
              <p>Data Anda disimpan secara aman dan tidak akan dijual atau dibagikan kepada pihak ketiga yang tidak berkepentingan, kecuali diwajibkan oleh hukum.</p>
            </section>

            <section>
              <h2 class="font-semibold text-sm-ink mb-1.5">6. Kontak</h2>
              <p>Jika Anda memiliki pertanyaan mengenai Syarat & Ketentuan ini atau ingin menghapus data Anda, silakan hubungi tim kami di properti The Anvaya Beach Resort Bali.</p>
            </section>
          </div>
        </template>

        <template v-else>
          <h1 class="text-xl sm:text-2xl font-bold text-sm-ink mb-1">Terms & Conditions</h1>
          <p class="text-xs text-sm-muted mb-6">Guest Survey &mdash; The Anvaya Beach Resort Bali</p>

          <div class="space-y-5 text-sm text-gray-700 leading-relaxed">
            <section>
              <h2 class="font-semibold text-sm-ink mb-1.5">1. Agreement</h2>
              <p>By completing and submitting this survey, you confirm that you have read, understood, and agree to these Terms & Conditions.</p>
            </section>

            <section>
              <h2 class="font-semibold text-sm-ink mb-1.5">2. Information We Collect</h2>
              <p>We collect your name, email address, your role at the event, and the ratings and answers you provide in this survey.</p>
            </section>

            <section>
              <h2 class="font-semibold text-sm-ink mb-1.5">3. How We Use Your Information</h2>
              <p>The information you provide is used to:</p>
              <ul class="list-disc pl-5 mt-1.5 space-y-1">
                <li>Evaluate and improve the quality of our services and event experience at The Anvaya Beach Resort Bali;</li>
                <li>Follow up with you about your survey feedback where appropriate; and</li>
                <li><strong>Send marketing emails</strong>, such as offers, promotions, news, and event updates from The Anvaya Beach Resort Bali.</li>
              </ul>
            </section>

            <section>
              <h2 class="font-semibold text-sm-ink mb-1.5">4. Opting Out</h2>
              <p>You may unsubscribe from marketing emails at any time by using the unsubscribe link included in those emails, or by contacting us directly.</p>
            </section>

            <section>
              <h2 class="font-semibold text-sm-ink mb-1.5">5. Data Confidentiality</h2>
              <p>Your data is stored securely and will not be sold or shared with unrelated third parties, except where required by law.</p>
            </section>

            <section>
              <h2 class="font-semibold text-sm-ink mb-1.5">6. Contact</h2>
              <p>If you have questions about these Terms & Conditions or would like your data removed, please contact our team at The Anvaya Beach Resort Bali.</p>
            </section>
          </div>
        </template>
      </SmCard>
    </div>
  </div>
</template>
