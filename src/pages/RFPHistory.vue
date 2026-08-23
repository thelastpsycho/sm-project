<template>
  <div class="min-h-screen bg-white dark:bg-sm-bg-dark">
    <div class="max-w-[1000px] mx-auto lg:mx-0 px-6 lg:px-12 pt-11 lg:pt-9 pb-32">
      <!-- Header -->
      <div class="flex items-end justify-between gap-4">
        <div>
          <span class="sm-eyebrow">Requests for proposal</span>
          <h1 class="sm-display text-[30px] mt-2">{{ rfps.length }} RFP{{ rfps.length === 1 ? '' : 's' }}</h1>
        </div>
        <router-link
          to="/rfp/new"
          class="inline-flex items-center gap-1.5 rounded-xl bg-sm-ink px-4 py-2.5 text-sm font-bold text-white dark:bg-white dark:text-sm-ink hover:bg-black dark:hover:bg-gray-100 transition-colors shrink-0"
        >
          <PlusIcon class="w-4 h-4" /> New RFP
        </router-link>
      </div>

      <!-- Content -->
      <div class="mt-6">
        <div v-if="loading" class="flex justify-center py-16">
          <div class="animate-spin rounded-full h-7 w-7 border-b-2 border-sm-ink dark:border-white"></div>
        </div>

        <div v-else-if="error" class="py-8 text-center text-sm text-sm-bad">{{ error }}</div>

        <div v-else-if="rfps.length === 0" class="flex flex-col items-center justify-center py-16 text-center">
          <p class="text-sm-muted mb-4">No RFPs yet — start your first proposal.</p>
          <router-link to="/rfp/new" class="rounded-xl bg-sm-ink px-5 py-2.5 text-sm font-bold text-white dark:bg-white dark:text-sm-ink">
            Create new
          </router-link>
        </div>

        <template v-else>
          <!-- Desktop table header -->
          <div class="hidden sm:flex px-1 py-3 border-b border-sm-line dark:border-white/10 sm-eyebrow">
            <span class="flex-[2.4]">Company</span>
            <span class="flex-[1.4]">PIC</span>
            <span class="flex-[1.6]">Updated</span>
            <span class="flex-[0.8] text-right">Pax</span>
            <span class="flex-[1.2] text-right">Status</span>
          </div>

          <router-link
            v-for="rfp in rfps"
            :key="rfp.id"
            :to="{ name: 'rfp-edit', params: { id: rfp.id } }"
            class="block border-b border-sm-hair dark:border-white/5 hover:bg-sm-surface dark:hover:bg-white/5 transition-colors"
          >
            <div class="flex items-center gap-3 px-1 py-4">
              <div class="flex-[2.4] min-w-0">
                <p class="text-[15px] font-bold text-sm-ink dark:text-white truncate">{{ rfp.full_company_name || 'Untitled Company' }}</p>
                <!-- mobile meta -->
                <p class="sm:hidden text-xs text-sm-muted mt-0.5 truncate">
                  {{ rfp.pic_name }} · {{ rfp.number_of_participants || 0 }} pax · {{ formatDate(rfp.updatedAt) }}
                </p>
              </div>
              <span class="hidden sm:block flex-[1.4] text-sm text-sm-ink-soft dark:text-gray-300 truncate">{{ rfp.pic_name }}</span>
              <span class="hidden sm:block flex-[1.6] text-sm text-sm-ink-soft dark:text-gray-300 truncate">{{ formatDate(rfp.updatedAt) }}</span>
              <span class="hidden sm:block flex-[0.8] text-sm text-sm-ink-soft dark:text-gray-300 text-right">{{ rfp.number_of_participants || 0 }}</span>
              <span
                class="flex-none sm:flex-[1.2] text-xs font-bold text-right shrink-0"
                :class="rfp.generated ? 'text-sm-won' : 'text-sm-muted'"
              >{{ rfp.generated ? 'Generated' : 'Draft' }}</span>
            </div>
            <!-- PDF link -->
            <div v-if="rfp.link_to_pdf" class="px-1 pb-3 -mt-1">
              <a
                :href="rfp.link_to_pdf"
                target="_blank"
                @click.stop
                class="inline-flex items-center gap-1.5 text-[11px] font-bold text-sm-primary hover:underline"
              >
                <DocumentTextIcon class="w-3.5 h-3.5" />
                View PDF proposal
                <ArrowTopRightOnSquareIcon class="w-3 h-3 opacity-60" />
              </a>
            </div>
          </router-link>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { collection, query, orderBy, getDocs } from 'firebase/firestore'
import { db } from '@/utils/firebase'
import type { RFPForm } from '@/types/rfp'
import { PlusIcon, DocumentTextIcon, CalendarIcon, UserGroupIcon, ArrowTopRightOnSquareIcon } from '@heroicons/vue/24/outline'
import { useHead } from '@vueuse/head'

useHead({
  title: 'RFP History - SM Mobile App',
  meta: [
    {
      name: 'description',
      content: 'View and manage all your Request for Proposal (RFP) history, track draft and generated proposals for The Anvaya Beach Resort Bali.'
    }
  ]
})

interface RFPRecord extends RFPForm {
  id: string
  createdAt?: any
  updatedAt?: any
  generated?: boolean
  link_to_pdf?: string
  link_to_slide?: string
}

const rfps = ref<RFPRecord[]>([])
const loading = ref(true)
const error = ref('')

const formatDate = (timestamp: any) => {
  if (!timestamp) return ''
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(date)
}

const fetchRFPs = async () => {
  try {
    loading.value = true
    const q = query(collection(db, 'rfps'), orderBy('updatedAt', 'desc'))
    const querySnapshot = await getDocs(q)
    rfps.value = querySnapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data()
    })) as RFPRecord[]
  } catch (e: any) {
    console.error(e)
    error.value = 'Failed to load history'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchRFPs()
})
</script>
