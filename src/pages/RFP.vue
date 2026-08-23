<template>
  <div class="pb-32 bg-white dark:bg-sm-bg-dark min-h-screen">
    <!-- Header -->
    <div class="px-6 py-6 border-b border-sm-line dark:border-white/10 sticky top-0 z-30 safe-area-top bg-white/90 dark:bg-sm-bg-dark/90 backdrop-blur">
      <h1 class="sm-display text-[26px]">{{ isEditing ? 'Edit RFP' : 'New RFP' }}</h1>
      <p class="text-xs text-sm-muted mt-1.5">{{ isEditing ? 'Update proposal details' : 'Create a new proposal request' }}</p>
    </div>

    <form @submit.prevent="handleSubmit" class="p-4 lg:px-8 space-y-6 max-w-[760px] mx-auto lg:mx-0">
      
      <!-- Section: Language Choice -->
      <div class="flex items-center justify-between p-1 rounded-2xl border border-sm-line dark:border-white/10 animate-fade-in-up" style="animation-delay: 50ms;">
        <div class="pl-4">
          <p class="sm-eyebrow">Document Language</p>
        </div>
        <div class="flex p-1 bg-sm-surface dark:bg-white/5 rounded-2xl">
          <button
            type="button"
            @click="form.lang = 'EN'"
            class="px-6 py-1.5 rounded-xl text-xs font-bold transition-all"
            :class="form.lang === 'EN' ? 'bg-sm-ink text-white dark:bg-white dark:text-sm-ink' : 'text-gray-400 dark:text-gray-500'"
          >
            EN
          </button>
          <button
            type="button"
            @click="form.lang = 'ID'"
            class="px-6 py-1.5 rounded-xl text-xs font-bold transition-all"
            :class="form.lang === 'ID' ? 'bg-sm-ink text-white dark:bg-white dark:text-sm-ink' : 'text-gray-400 dark:text-gray-500'"
          >
            ID
          </button>
        </div>
      </div>
      
      <!-- Section: Client Details -->
      <div class="rounded-2xl p-5 border border-sm-line dark:border-white/10 space-y-5 animate-fade-in-up" style="animation-delay: 100ms;">
        <h2 class="sm-eyebrow">Client Details</h2>
        
        <div class="space-y-4">
           <div class="rounded-2xl border border-sm-line dark:border-white/10 overflow-hidden">
             
             <div class="flex px-4 py-2 border-b border-sm-hair dark:border-white/10">
                <div class="w-20 border-r border-sm-hair dark:border-white/10 mr-3">
                   <label class="sm-eyebrow">Title</label>
                   <select v-model="form.title" class="w-full bg-transparent border-none p-0 text-sm-ink dark:text-white focus:ring-0 text-sm font-semibold">
                     <option v-for="t in titleOptions" :key="t.value" :value="t.value">{{ t.label }}</option>
                   </select>
                </div>
                <div class="flex-1">
                   <label class="sm-eyebrow">PIC Name</label>
                   <input v-model="form.pic_name" type="text" class="w-full bg-transparent border-none p-0 text-sm-ink dark:text-white focus:ring-0 placeholder:text-sm-faint font-semibold" placeholder="David Martinez" />
                </div>
             </div>

             <div class="flex px-4 py-2 border-b border-sm-hair dark:border-white/10">
                <div class="flex-1 border-r border-sm-hair dark:border-white/10 mr-3">
                   <label class="sm-eyebrow">Client Email</label>
                   <input v-model="form.client_email" type="email" class="w-full bg-transparent border-none p-0 text-sm-ink dark:text-white focus:ring-0 placeholder:text-sm-faint font-semibold" placeholder="david@company.com" />
                </div>
                <div class="flex-1">
                   <label class="sm-eyebrow">Client Phone</label>
                   <input v-model="form.client_phone" type="tel" class="w-full bg-transparent border-none p-0 text-sm-ink dark:text-white focus:ring-0 placeholder:text-sm-faint font-semibold" placeholder="+62 812..." />
                </div>
              </div>

             <div class="px-4 py-2 border-b border-sm-hair dark:border-white/10">
               <label class="sm-eyebrow">Company Name</label>
               <input 
                 v-model="form.full_company_name"
                 type="text" 
                 class="w-full bg-transparent border-none p-0 text-sm-ink dark:text-white focus:ring-0 placeholder:text-sm-faint font-semibold" 
                 placeholder="Global Consulting Partners Ltd" 
               />
             </div>
             
             <div class="px-4 py-2">
               <label class="sm-eyebrow">Event Dates</label>
               <div 
                 @click="showDatePicker = true"
                 class="w-full flex items-center justify-between cursor-pointer py-1"
               >
                 <div class="flex items-center gap-2">
                   <CalendarIcon class="w-4 h-4 text-sm-muted" />
                   <span v-if="form.event_date_start" class="text-sm font-bold text-sm-ink dark:text-white">
                     {{ formatDateLabel(form.event_date_start) }} - {{ formatDateLabel(form.event_date_end) }}
                   </span>
                   <span v-else class="text-sm text-sm-faint font-medium">Select Arrival & Departure</span>
                 </div>
                 <ChevronRightIcon class="w-4 h-4 text-sm-faint" />
               </div>
             </div>

              <div class="px-4 py-2 border-t border-sm-hair dark:border-white/10">
                 <label class="sm-eyebrow">Proposal Validity</label>
                 <div 
                   @click="showValidityPicker = true"
                   class="w-full flex items-center justify-between cursor-pointer py-1"
                 >
                   <div class="flex items-center gap-2">
                     <CalendarIcon class="w-4 h-4 text-sm-muted" />
                     <span v-if="form.proposal_validity_date" class="text-sm font-bold text-sm-ink dark:text-white">
                       {{ formatDateLabel(form.proposal_validity_date) }}
                     </span>
                     <span v-else class="text-sm text-sm-faint font-medium">Select Validity Date</span>
                   </div>
                   <ChevronRightIcon class="w-4 h-4 text-sm-faint" />
                 </div>
              </div>
           </div>
        </div>
      </div>

      <!-- Section: Requirements -->
      <div class="rounded-2xl p-5 border border-sm-line dark:border-white/10 space-y-5 animate-fade-in-up" style="animation-delay: 200ms;">
        <h2 class="sm-eyebrow">Requirements</h2>
        
        <div class="grid grid-cols-2 gap-4">
           <div class="rounded-2xl border border-sm-line dark:border-white/10 px-4 py-2">
             <label class="sm-eyebrow">Participants</label>
             <input v-model="form.number_of_participants" type="tel" class="w-full bg-transparent border-none p-0 text-sm-ink dark:text-white focus:ring-0 placeholder:text-sm-faint font-semibold" placeholder="120" />
           </div>
           <div class="rounded-2xl border border-sm-line dark:border-white/10 px-4 py-2">
             <label class="sm-eyebrow">Rooms</label>
             <input v-model="form.number_of_rooms_required" type="tel" class="w-full bg-transparent border-none p-0 text-sm-ink dark:text-white focus:ring-0 placeholder:text-sm-faint font-semibold" placeholder="65" />
           </div>
        </div>
      </div>

      <!-- Section: Sales PIC -->
      <div class="rounded-2xl p-5 border border-sm-line dark:border-white/10 space-y-5 animate-fade-in-up" style="animation-delay: 300ms;">
        <h2 class="sm-eyebrow">Sales Contact</h2>

        <div class="rounded-2xl border border-sm-line dark:border-white/10 overflow-hidden">
             <div class="px-4 py-2 border-b border-sm-hair dark:border-white/10">
               <label class="sm-eyebrow">Name</label>
               <div class="text-sm font-semibold text-sm-ink dark:text-white py-1">
                 {{ form.sales_pic_name || 'Not logged in' }}
               </div>
             </div>
              <div class="px-4 py-2 border-b border-sm-hair dark:border-white/10">
                <label class="sm-eyebrow">Position</label>
                <div class="text-sm font-semibold text-sm-ink dark:text-white py-1">
                  {{ form.sales_pic_position || '-' }}
                </div>
              </div>
              <div class="px-4 py-2 border-b border-sm-hair dark:border-white/10">
                <label class="sm-eyebrow">Email</label>
                <div class="text-sm font-semibold text-sm-ink dark:text-white py-1">
                  {{ form.sales_pic_email || '-' }}
                </div>
              </div>
              <div class="px-4 py-2">
                <label class="sm-eyebrow">Phone</label>
                <div class="text-sm font-semibold text-sm-ink dark:text-white py-1">
                  {{ form.sales_pic_phone_number || '-' }}
                </div>
              </div>
        </div>
      </div>

      <!-- Section: Rates -->
      <div class="rounded-2xl p-5 border border-sm-line dark:border-white/10 space-y-5 animate-fade-in-up" style="animation-delay: 400ms;">
        <h2 class="sm-eyebrow">Proposed Rates</h2>
        
        <div class="rounded-2xl border border-sm-line dark:border-white/10 overflow-hidden">
            <div class="px-4 py-2 border-b border-sm-hair dark:border-white/10">
              <label class="sm-eyebrow">Deluxe Rate</label>
              <select v-model="form.rate_deluxe" class="w-full bg-transparent border-none p-0 text-sm-ink dark:text-white focus:ring-0 text-sm font-semibold">
                <option value="" disabled>Select Deluxe Rate</option>
                <option v-for="rate in deluxeRateOptions" :key="rate" :value="rate.toString()">
                  {{ formatCurrency(rate) }}
                </option>
              </select>
            </div>
            <div class="px-4 py-2">
              <label class="sm-eyebrow">Premiere Rate</label>
              <select v-model="form.rate_premiere" class="w-full bg-transparent border-none p-0 text-sm-ink dark:text-white focus:ring-0 text-sm font-semibold">
                <option value="" disabled>Select Premiere Rate</option>
                <option v-for="rate in premiereRateOptions" :key="rate" :value="rate.toString()">
                  {{ formatCurrency(rate) }}
                </option>
              </select>
            </div>
        </div>
      </div>

      <!-- Section: Additional Room Types -->
      <div class="rounded-2xl p-5 border border-sm-line dark:border-white/10 space-y-5 animate-fade-in-up" style="animation-delay: 450ms;">
        <h2 class="sm-eyebrow">Additional Room Types</h2>
        
        <div class="space-y-4">
          <!-- Compact Question Toggle -->
          <div class="flex items-center justify-between p-1 bg-sm-surface dark:bg-white/5 rounded-2xl border border-sm-line dark:border-white/10">
            <div class="pl-4">
              <p class="sm-eyebrow">Add more rooms?</p>
            </div>
            <div class="flex p-1 bg-white dark:bg-white/10 rounded-xl shadow-inner shadow-black/5">
              <button
                type="button"
                @click="showAdditionalRooms = true"
                class="px-5 py-1.5 rounded-lg text-[10px] font-black tracking-widest transition-all"
                :class="showAdditionalRooms ? 'bg-sm-ink text-white dark:bg-white dark:text-sm-ink scale-105' : 'text-gray-400 dark:text-gray-500'"
              >
                YES
              </button>
              <button
                type="button"
                @click="showAdditionalRooms = false; clearAdditionalRooms()"
                class="px-5 py-1.5 rounded-lg text-[10px] font-black tracking-widest transition-all"
                :class="!showAdditionalRooms ? 'bg-sm-ink text-white dark:bg-white dark:text-sm-ink scale-105' : 'text-gray-400 dark:text-gray-500'"
              >
                NO
              </button>
            </div>
          </div>

          <!-- Additional Room Type Fields -->
          <div v-if="showAdditionalRooms" class="space-y-3 animate-fade-in-up">
            <!-- Room Type 1 -->
            <div class="rounded-2xl border border-sm-line dark:border-white/10 overflow-hidden">
              <div class="grid grid-cols-2 gap-px">
                <div class="px-4 py-2 bg-white dark:bg-sm-card-dark rounded-l-xl">
                  <label class="sm-eyebrow">Room Type 1</label>
                  <select v-model="form.room_type_1" class="w-full bg-transparent border-none p-0 text-sm-ink dark:text-white focus:ring-0 text-sm font-semibold">
                    <option value="" disabled>Select Room Type</option>
                    <option v-for="option in roomTypeOptions" :key="option" :value="option">{{ option }}</option>
                  </select>
                </div>
                <div class="px-4 py-2 bg-white dark:bg-sm-card-dark rounded-r-xl">
                  <label class="sm-eyebrow">Rate</label>
                  <input v-model="form.rate_type_1" type="number" class="w-full bg-transparent border-none p-0 text-sm-ink dark:text-white focus:ring-0 placeholder:text-sm-faint font-semibold text-sm" placeholder="2750000" />
                </div>
              </div>
            </div>

            <!-- Room Type 2 -->
            <div class="rounded-2xl border border-sm-line dark:border-white/10 overflow-hidden">
              <div class="grid grid-cols-2 gap-px">
                <div class="px-4 py-2 bg-white dark:bg-sm-card-dark rounded-l-xl">
                  <label class="sm-eyebrow">Room Type 2</label>
                  <select v-model="form.room_type_2" class="w-full bg-transparent border-none p-0 text-sm-ink dark:text-white focus:ring-0 text-sm font-semibold">
                    <option value="" disabled>Select Room Type</option>
                    <option v-for="option in roomTypeOptions" :key="option" :value="option">{{ option }}</option>
                  </select>
                </div>
                <div class="px-4 py-2 bg-white dark:bg-sm-card-dark rounded-r-xl">
                  <label class="sm-eyebrow">Rate</label>
                  <input v-model="form.rate_type_2" type="number" class="w-full bg-transparent border-none p-0 text-sm-ink dark:text-white focus:ring-0 placeholder:text-sm-faint font-semibold text-sm" placeholder="3150000" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div class="pt-4 flex items-center gap-4">
        <button 
          type="button" 
          @click="resetForm"
          class="px-6 py-4 rounded-2xl border border-sm-line dark:border-white/15 text-sm-ink dark:text-white font-bold hover:bg-sm-surface dark:hover:bg-white/5 transition-colors"
        >
          Reset
        </button>
        <button 
           type="button" 
           @click="handleSave"
           :disabled="isSaving || !isFormValid"
           class="px-6 py-4 rounded-2xl border border-sm-line dark:border-white/15 text-sm-ink dark:text-white font-bold hover:bg-sm-surface dark:hover:bg-white/5 transition-colors disabled:opacity-50"
        >
          {{ isSaving ? 'Saving...' : 'Save Draft' }}
        </button>
        <button 
          type="submit" 
          :disabled="isSubmitting || !isFormValid"
          class="flex-1 py-4 rounded-2xl bg-sm-ink text-white dark:bg-white dark:text-sm-ink font-bold disabled:opacity-50 active:scale-[0.99] transition-all text-center"
        >
          <span v-if="!isSubmitting">Review Proposal</span>
          <span v-else>Processing...</span>
        </button>
      </div>

      <!-- Messages -->

      <div v-if="errorMessage" class="p-4 rounded-2xl text-sm-bad text-sm text-center">
        {{ errorMessage }}
      </div>
    </form>

    <ProcessingModal :is-open="isSubmitting" />

    <ReviewModal 
      :is-open="showReviewModal" 
      :form="form" 
      @close="showReviewModal = false"
      @confirm="handleFinalSubmit"
    />

    <ResponseModal 
      :is-open="showModal" 
      :content="responseContent" 
      @close="handleCloseResponseModal" 
    />

    <!-- Date Picker Modal -->
    <div v-if="showDatePicker" class="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
      <div class="fixed inset-0 bg-sm-ink/40 backdrop-blur-sm" @click="showDatePicker = false"></div>
      <div class="relative w-full max-w-md bg-white dark:bg-sm-card-dark rounded-t-[2.5rem] sm:rounded-[2.5rem] overflow-hidden shadow-2xl animate-fade-in-up">
        <DateRangePicker 
          :initial-start="form.event_date_start"
          :initial-end="form.event_date_end"
          mode="range"
          @select="handleDateRangeSelect"
          @close="showDatePicker = false"
        />
      </div>
    </div>

    <!-- Validity Picker Modal -->
    <div v-if="showValidityPicker" class="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
      <div class="fixed inset-0 bg-sm-ink/40 backdrop-blur-sm" @click="showValidityPicker = false"></div>
      <div class="relative w-full max-w-md bg-white dark:bg-sm-card-dark rounded-t-[2.5rem] sm:rounded-[2.5rem] overflow-hidden shadow-2xl animate-fade-in-up">
        <DateRangePicker 
          :initial-start="form.proposal_validity_date"
          mode="single"
          @select="handleValiditySelect"
          @close="showValidityPicker = false"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { postRFP } from '@/utils/api'
import type { RFPForm } from '@/types/rfp'
import ResponseModal from '@/components/ResponseModal.vue'
import ReviewModal from '@/components/ReviewModal.vue'
import ProcessingModal from '@/components/ProcessingModal.vue'
import DateRangePicker from '@/components/DateRangePicker.vue'
import { CalendarIcon, ChevronRightIcon } from '@heroicons/vue/24/outline'
import { db, ensureAuth } from '@/utils/firebase'
import { doc, getDoc, setDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { useHead } from '@vueuse/head'
import { useSessionStore } from '@/stores/session'
import userData from '@/user.json'

useHead({
  title: 'New RFP - SM Mobile App',
  meta: [
    {
      name: 'description',
      content: 'Create and manage Request for Proposal (RFP) with client details, event requirements, and room rates for The Anvaya Beach Resort Bali.'
    }
  ]
})

const route = useRoute()
const router = useRouter()
const sessionStore = useSessionStore()
const isEditing = computed(() => !!route.params.id)

const titleOptions = [
  { value: 'Mr', label: 'Mr.' },
  { value: 'Ms', label: 'Ms.' },
  { value: 'Ibu', label: 'Ibu' },
  { value: 'Bapak', label: 'Bapak' }
]

const roomTypeOptions = [
  'Premiere with Lagoon Access',
  'Deluxe Suite',
  'Premiere Suite',
  'Anvaya Suite Whirlpool',
  'Beach Front Private Suite',
  'Anvaya Suite Private Pool'
]

const deluxeRateOptions = Array.from({ length: (2750000 - 1850000) / 50000 + 1 }, (_, i) => 1850000 + (i * 50000))
const premiereRateOptions = Array.from({ length: (3050000 - 2250000) / 50000 + 1 }, (_, i) => 2250000 + (i * 50000))

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('id-ID').format(val)
}

const form = ref<RFPForm>({
  lang: 'EN',
  title: 'Mr',
  pic_name: '',
  client_email: '',
  client_phone: '',
  full_company_name: '',
  event_date_start: '',
  event_date_end: '',
  proposal_validity_date: '',
  number_of_participants: '',
  number_of_rooms_required: '',
  sales_pic_name: '',
  sales_pic_position: '',
  sales_pic_email: '',
  sales_pic_phone_number: '',
  rate_deluxe: '',
  rate_premiere: '',
  room_type_1: '',
  rate_type_1: '',
  room_type_2: '',
  rate_type_2: ''
})

const showDatePicker = ref(false)
const showValidityPicker = ref(false)

const handleDateRangeSelect = (range: { start: string, end: string }) => {
  form.value.event_date_start = range.start
  form.value.event_date_end = range.end
  showDatePicker.value = false
}

const handleValiditySelect = (range: { start: string }) => {
  form.value.proposal_validity_date = range.start
  showValidityPicker.value = false
}

const formatDateLabel = (dateString: string) => {
  if (!dateString) return ''
  const d = new Date(dateString)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const showAdditionalRooms = ref(false)

const isSubmitting = ref(false)
const isSaving = ref(false)
const errorMessage = ref('')
const showModal = ref(false)
const showReviewModal = ref(false)
const responseContent = ref<any>(null)
const lastCreatedId = ref<string | null>(null)

// Basic validation
const isFormValid = computed(() => {
  return form.value.pic_name && 
         form.value.full_company_name && 
         (form.value.client_email || form.value.client_phone) &&
         form.value.sales_pic_email &&
         form.value.event_date_start &&
         form.value.event_date_end &&
         form.value.proposal_validity_date
})

const isOnlineReact = computed(() => navigator.onLine)

const loadRFP = async () => {
  if (!route.params.id) {
    // New RFP - prefill sales contact from logged-in user
    if (sessionStore.currentUser) {
      form.value.sales_pic_name = sessionStore.currentUser.name
      form.value.sales_pic_position = sessionStore.currentUser.position
      form.value.sales_pic_email = sessionStore.currentUser.email
      form.value.sales_pic_phone_number = sessionStore.currentUser.phone
    }
    return
  }

  try {
    const docRef = doc(db, 'rfps', route.params.id as string)
    const docSnap = await getDoc(docRef)

    if (docSnap.exists()) {
      const data = docSnap.data()
      // Merge with default form to ensure all fields exist
      form.value = { ...form.value, ...data }
    } else {
      errorMessage.value = 'RFP not found'
    }
  } catch (e) {
    console.error('Error loading RFP:', e)
    errorMessage.value = 'Failed to load RFP'
  }
}

const saveToFirebase = async (generated = false) => {
  await ensureAuth()

  const data = {
    ...form.value,
    updatedAt: serverTimestamp(),
    generated
  }

  if (isEditing.value) {
    await setDoc(doc(db, 'rfps', route.params.id as string), data, { merge: true })
    return route.params.id as string
  } else {
    const docRef = await addDoc(collection(db, 'rfps'), {
      ...data,
      createdAt: serverTimestamp()
    })
    return docRef.id
  }
}

const handleSave = async () => {
  if (!isFormValid.value) return
  
  isSaving.value = true
  errorMessage.value = ''
  
  try {
    const id = await saveToFirebase(false)
    if (!isEditing.value) {
      router.replace({ name: 'rfp-edit', params: { id } })
    }
    // Optional: show toast or success state
  } catch (e: any) {
    console.error(e)
    errorMessage.value = 'Failed to save draft'
  } finally {
    isSaving.value = false
  }
}

const handleSubmit = async () => {
  if (!isFormValid.value) return
  showReviewModal.value = true
}

const handleFinalSubmit = async () => {
  showReviewModal.value = false
  isSubmitting.value = true
  errorMessage.value = ''

  try {
    // Auto-save before generating
    const id = await saveToFirebase(true)
    lastCreatedId.value = id
    // NOTE: We don't router.replace here anymore because it causes a component re-mount
    // which cancels the UI updates for the success modal.


    // Convert all form fields to strings and format rates with commas
    const rateFields = ['rate_deluxe', 'rate_premiere', 'rate_type_1', 'rate_type_2']
    const sanitizedPayload: RFPForm = Object.keys(form.value).reduce((acc, key) => {
      const val = form.value[key as keyof RFPForm]
      if (rateFields.includes(key) && val && !isNaN(Number(val))) {
        // Format as thousand-separated string: e.g. 2,100,000
        acc[key as keyof RFPForm] = new Intl.NumberFormat('en-US').format(Number(val))
      } else {
        acc[key as keyof RFPForm] = String(val ?? '')
      }
      return acc
    }, {} as RFPForm)

    const res = await postRFP(sanitizedPayload)
    
    // Handle new response format: { id: "...", success: true }
    let linkToPdf = res.link_to_pdf || null

    if (res.id && res.success) {
      linkToPdf = `https://drive.google.com/file/d/${res.id}/view`
    }

    // Save link if it exists
    if (linkToPdf) {
      await setDoc(doc(db, 'rfps', id), {
        link_to_pdf: linkToPdf
      }, { merge: true })
    }

    // Pass the link back to responseContent for the modal
    responseContent.value = {
      ...res,
      link_to_pdf: linkToPdf,
      company_name: form.value.full_company_name
    }
    showModal.value = true
  } catch (e: any) {
    console.error('Error generating RFP:', e)
    errorMessage.value = e.response?.data?.message || 'Failed to generate proposal'
  } finally {
    isSubmitting.value = false
  }
}

const handleCloseResponseModal = () => {
  showModal.value = false
  if (!isEditing.value && lastCreatedId.value) {
    router.replace({ name: 'rfp-edit', params: { id: lastCreatedId.value } })
  }
}

onMounted(() => {
  loadRFP()
})

const resetForm = () => {
  form.value = {
    lang: 'EN',
    title: 'Mr',
    pic_name: '',
    client_email: '',
    client_phone: '',
    full_company_name: '',
    event_date_start: '',
    event_date_end: '',
    proposal_validity_date: '',
    number_of_participants: '',
    number_of_rooms_required: '',
    sales_pic_name: '',
    sales_pic_position: '',
    sales_pic_email: '',
    sales_pic_phone_number: '',
    rate_deluxe: '',
    rate_premiere: '',
    room_type_1: '',
    rate_type_1: '',
    room_type_2: '',
    rate_type_2: ''
  }
  showAdditionalRooms.value = false
}

const clearAdditionalRooms = () => {
  form.value.room_type_1 = ''
  form.value.rate_type_1 = ''
  form.value.room_type_2 = ''
  form.value.rate_type_2 = ''
}
</script>
