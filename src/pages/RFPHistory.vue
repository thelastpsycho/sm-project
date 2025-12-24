<template>
  <div class="pb-24 bg-gray-50 dark:bg-sm-bg-dark min-h-screen">
    <!-- Header -->
    <div class="px-6 py-6 bg-white dark:bg-sm-card-dark border-b border-gray-100 dark:border-white/5 sticky top-0 z-30 safe-area-top shadow-sm flex items-center justify-between">
      <div>
        <h1 class="text-xl font-bold text-gray-900 dark:text-white">RFP History</h1>
        <p class="text-xs text-gray-500 mt-1">Manage your proposals</p>
      </div>
      <router-link to="/rfp/new" class="p-2 bg-gray-100 dark:bg-white/5 rounded-full text-gray-600 dark:text-gray-300 hover:bg-gray-200 transition-colors">
        <PlusIcon class="w-6 h-6" />
      </router-link>
    </div>

    <!-- Content -->
    <div class="p-4 space-y-4">
      <div v-if="loading" class="flex justify-center py-12">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-sm-primary"></div>
      </div>

      <div v-else-if="error" class="p-4 rounded-2xl bg-red-50 text-red-700 text-sm text-center">
        {{ error }}
      </div>

      <div v-else-if="rfps.length === 0" class="flex flex-col items-center justify-center py-12 text-center">
        <div class="w-16 h-16 bg-gray-100 dark:bg-white/5 rounded-full flex items-center justify-center mb-4 text-gray-400">
           <DocumentTextIcon class="w-8 h-8" />
        </div>
        <h3 class="text-gray-900 dark:text-white font-medium mb-1">No RFPs Found</h3>
        <p class="text-xs text-gray-500 mb-4">Start by creating your first proposal</p>
        <router-link to="/rfp/new" class="px-5 py-2.5 rounded-xl bg-sm-primary text-white text-sm font-bold shadow-lg shadow-blue-500/30">
          Create New
        </router-link>
      </div>

      <div v-else class="space-y-3">
        <router-link 
          v-for="rfp in rfps" 
          :key="rfp.id"
          :to="{ name: 'rfp-edit', params: { id: rfp.id } }"
          class="block bg-white dark:bg-sm-card-dark p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-white/5 hover:scale-[1.01] active:scale-[0.99] transition-all"
        >
          <div class="flex justify-between items-start mb-2">
            <div>
              <h3 class="font-bold text-gray-900 dark:text-white line-clamp-1">{{ rfp.full_company_name || 'Untitled Company' }}</h3>
              <p class="text-xs text-gray-500">{{ rfp.pic_name }}</p>
            </div>
            <div class="text-[10px] font-medium px-2 py-1 rounded-lg" :class="rfp.generated ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-400'">
              {{ rfp.generated ? 'Generated' : 'Draft' }}
            </div>
          </div>
          
          <div class="flex items-center gap-4 text-[10px] text-gray-400">
            <div class="flex items-center gap-1">
               <CalendarIcon class="w-3 h-3" />
               <span>{{ formatDate(rfp.updatedAt) }}</span>
            </div>
            <div class="flex items-center gap-1">
               <UserGroupIcon class="w-3 h-3" />
               <span>{{ rfp.number_of_participants || 0 }} pax</span>
            </div>
          </div>
        </router-link>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { collection, query, orderBy, getDocs } from 'firebase/firestore'
import { db } from '@/utils/firebase'
import type { RFPForm } from '@/types/rfp'
import { PlusIcon, DocumentTextIcon, CalendarIcon, UserGroupIcon } from '@heroicons/vue/24/outline'

interface RFPRecord extends RFPForm {
  id: string
  createdAt?: any
  updatedAt?: any
  generated?: boolean
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
