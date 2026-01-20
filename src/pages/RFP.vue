<template>
  <div class="pb-24 bg-gray-50 dark:bg-sm-bg-dark min-h-screen">
    <!-- Header -->
    <div class="px-6 py-6 bg-white dark:bg-sm-card-dark border-b border-gray-100 dark:border-white/5 sticky top-0 z-30 safe-area-top shadow-sm">
      <h1 class="text-xl font-bold text-gray-900 dark:text-white">{{ isEditing ? 'Edit RFP' : 'New RFP' }}</h1>
      <p class="text-xs text-gray-500 mt-1">{{ isEditing ? 'Update proposal details' : 'Create a new proposal request' }}</p>
    </div>

    <form @submit.prevent="handleSubmit" class="p-4 space-y-6">
      
      <!-- Section: Language Choice -->
      <div class="flex items-center justify-between p-1 bg-white dark:bg-sm-card-dark rounded-3xl shadow-sm border border-gray-100 dark:border-white/5 animate-fade-in-up" style="animation-delay: 50ms;">
        <div class="pl-4">
          <p class="text-[10px] font-black text-gray-900 dark:text-white uppercase tracking-widest opacity-40">Document Language</p>
        </div>
        <div class="flex p-1 bg-gray-50 dark:bg-white/5 rounded-2xl">
          <button
            type="button"
            @click="form.lang = 'EN'"
            class="px-6 py-1.5 rounded-xl text-xs font-bold transition-all"
            :class="form.lang === 'EN' ? 'bg-sm-primary text-white shadow-md shadow-blue-500/20' : 'text-gray-400 dark:text-gray-500'"
          >
            EN
          </button>
          <button
            type="button"
            @click="form.lang = 'ID'"
            class="px-6 py-1.5 rounded-xl text-xs font-bold transition-all"
            :class="form.lang === 'ID' ? 'bg-sm-primary text-white shadow-md shadow-blue-500/20' : 'text-gray-400 dark:text-gray-500'"
          >
            ID
          </button>
        </div>
      </div>
      
      <!-- Section: Client Details -->
      <div class="bg-white dark:bg-sm-card-dark rounded-3xl p-5 shadow-sm border border-gray-100 dark:border-white/5 space-y-5 animate-fade-in-up" style="animation-delay: 100ms;">
        <h2 class="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider opacity-50">Client Details</h2>
        
        <div class="space-y-4">
           <div class="bg-gray-50 dark:bg-black/20 rounded-2xl p-1">
             
             <div class="flex px-4 py-2 border-b border-gray-200 dark:border-white/5">
                <div class="w-20 border-r border-gray-200 dark:border-white/5 mr-3">
                   <label class="text-[10px] uppercase text-gray-400 font-bold tracking-wider">Title</label>
                   <select v-model="form.title" class="w-full bg-transparent border-none p-0 text-gray-900 dark:text-white focus:ring-0 text-sm font-medium">
                     <option v-for="t in titleOptions" :key="t.value" :value="t.value">{{ t.label }}</option>
                   </select>
                </div>
                <div class="flex-1">
                   <label class="text-[10px] uppercase text-gray-400 font-bold tracking-wider">PIC Name</label>
                   <input v-model="form.pic_name" type="text" class="w-full bg-transparent border-none p-0 text-gray-900 dark:text-white focus:ring-0 placeholder-gray-400 font-medium" placeholder="David Martinez" />
                </div>
             </div>

             <div class="flex px-4 py-2 border-b border-gray-200 dark:border-white/5">
                <div class="flex-1 border-r border-gray-200 dark:border-white/5 mr-3">
                   <label class="text-[10px] uppercase text-gray-400 font-bold tracking-wider">Client Email</label>
                   <input v-model="form.client_email" type="email" class="w-full bg-transparent border-none p-0 text-gray-900 dark:text-white focus:ring-0 placeholder-gray-400 font-medium" placeholder="david@company.com" />
                </div>
                <div class="flex-1">
                   <label class="text-[10px] uppercase text-gray-400 font-bold tracking-wider">Client Phone</label>
                   <input v-model="form.client_phone" type="tel" class="w-full bg-transparent border-none p-0 text-gray-900 dark:text-white focus:ring-0 placeholder-gray-400 font-medium" placeholder="+62 812..." />
                </div>
              </div>

             <div class="px-4 py-2 border-b border-gray-200 dark:border-white/5">
               <label class="text-[10px] uppercase text-gray-400 font-bold tracking-wider">Company Name</label>
               <input 
                 v-model="form.full_company_name"
                 type="text" 
                 class="w-full bg-transparent border-none p-0 text-gray-900 dark:text-white focus:ring-0 placeholder-gray-400 font-medium" 
                 placeholder="Global Consulting Partners Ltd" 
               />
             </div>
             
             <div class="px-4 py-2">
               <label class="text-[10px] uppercase text-gray-400 font-bold tracking-wider">Event Dates</label>
               <div 
                 @click="showDatePicker = true"
                 class="w-full flex items-center justify-between cursor-pointer py-1"
               >
                 <div class="flex items-center gap-2">
                   <CalendarIcon class="w-4 h-4 text-sm-primary" />
                   <span v-if="form.event_date_start" class="text-sm font-bold text-gray-900 dark:text-white transition-all">
                     {{ formatDateLabel(form.event_date_start) }} - {{ formatDateLabel(form.event_date_end) }}
                   </span>
                   <span v-else class="text-sm text-gray-400 font-medium">Select Arrival & Departure</span>
                 </div>
                 <ChevronRightIcon class="w-4 h-4 text-gray-300" />
               </div>
             </div>

              <div class="px-4 py-2 border-t border-gray-200 dark:border-white/5">
                 <label class="text-[10px] uppercase text-gray-400 font-bold tracking-wider">Proposal Validity</label>
                 <div 
                   @click="showValidityPicker = true"
                   class="w-full flex items-center justify-between cursor-pointer py-1"
                 >
                   <div class="flex items-center gap-2">
                     <CalendarIcon class="w-4 h-4 text-sm-primary" />
                     <span v-if="form.proposal_validity_date" class="text-sm font-bold text-gray-900 dark:text-white transition-all">
                       {{ formatDateLabel(form.proposal_validity_date) }}
                     </span>
                     <span v-else class="text-sm text-gray-400 font-medium">Select Validity Date</span>
                   </div>
                   <ChevronRightIcon class="w-4 h-4 text-gray-300" />
                 </div>
              </div>
           </div>
        </div>
      </div>

      <!-- Section: Requirements -->
      <div class="bg-white dark:bg-sm-card-dark rounded-3xl p-5 shadow-sm border border-gray-100 dark:border-white/5 space-y-5 animate-fade-in-up" style="animation-delay: 200ms;">
        <h2 class="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider opacity-50">Requirements</h2>
        
        <div class="grid grid-cols-2 gap-4">
           <div class="bg-gray-50 dark:bg-black/20 rounded-2xl px-4 py-2">
             <label class="text-[10px] uppercase text-gray-400 font-bold tracking-wider">Participants</label>
             <input v-model="form.number_of_participants" type="tel" class="w-full bg-transparent border-none p-0 text-gray-900 dark:text-white focus:ring-0 placeholder-gray-400 font-medium" placeholder="120" />
           </div>
           <div class="bg-gray-50 dark:bg-black/20 rounded-2xl px-4 py-2">
             <label class="text-[10px] uppercase text-gray-400 font-bold tracking-wider">Rooms</label>
             <input v-model="form.number_of_rooms_required" type="tel" class="w-full bg-transparent border-none p-0 text-gray-900 dark:text-white focus:ring-0 placeholder-gray-400 font-medium" placeholder="65" />
           </div>
        </div>
      </div>

      <!-- Section: Sales PIC -->
      <div class="bg-white dark:bg-sm-card-dark rounded-3xl p-5 shadow-sm border border-gray-100 dark:border-white/5 space-y-5 animate-fade-in-up" style="animation-delay: 300ms;">
        <h2 class="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider opacity-50">Sales Contact</h2>
        
        <div class="bg-gray-50 dark:bg-black/20 rounded-2xl p-1">
             <div class="px-4 py-2 border-b border-gray-200 dark:border-white/5">
               <label class="text-[10px] uppercase text-gray-400 font-bold tracking-wider">Name</label>
               <select 
                 v-model="form.sales_pic_name" 
                 @change="handleSalesContactChange"
                 class="w-full bg-transparent border-none p-0 text-gray-900 dark:text-white focus:ring-0 text-sm font-medium"
               >
                 <option value="" disabled>Select Sales Contact</option>
                 <option v-for="contact in salesContacts" :key="contact.name" :value="contact.name">
                   {{ contact.name }}
                 </option>
               </select>
             </div>
              <div class="px-4 py-2 border-b border-gray-200 dark:border-white/5" :class="{ 'opacity-50': form.sales_pic_name }">
                <label class="text-[10px] uppercase text-gray-400 font-bold tracking-wider">Position</label>
                <input 
                  v-model="form.sales_pic_position" 
                  type="text" 
                  :disabled="!!form.sales_pic_name"
                  class="w-full bg-transparent border-none p-0 text-gray-900 dark:text-white focus:ring-0 placeholder-gray-400 font-medium disabled:cursor-not-allowed" 
                  placeholder="Event Sales Coordinator" 
                />
              </div>
              <div class="px-4 py-2 border-b border-gray-200 dark:border-white/5" :class="{ 'opacity-50': form.sales_pic_name }">
                <label class="text-[10px] uppercase text-gray-400 font-bold tracking-wider">Email</label>
                <input 
                  v-model="form.sales_pic_email" 
                  type="email" 
                  :disabled="!!form.sales_pic_name"
                  class="w-full bg-transparent border-none p-0 text-gray-900 dark:text-white focus:ring-0 placeholder-gray-400 font-medium disabled:cursor-not-allowed" 
                  placeholder="jessica.wong@anvayabali.com" 
                />
              </div>
              <div class="px-4 py-2" :class="{ 'opacity-50': form.sales_pic_name }">
                <label class="text-[10px] uppercase text-gray-400 font-bold tracking-wider">Phone</label>
                <input 
                  v-model="form.sales_pic_phone_number" 
                  type="tel" 
                  :disabled="!!form.sales_pic_name"
                  class="w-full bg-transparent border-none p-0 text-gray-900 dark:text-white focus:ring-0 placeholder-gray-400 font-medium disabled:cursor-not-allowed" 
                  placeholder="+62 821..." 
                />
              </div>
        </div>
      </div>

      <!-- Section: Rates -->
      <div class="bg-white dark:bg-sm-card-dark rounded-3xl p-5 shadow-sm border border-gray-100 dark:border-white/5 space-y-5 animate-fade-in-up" style="animation-delay: 400ms;">
        <h2 class="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider opacity-50">Proposed Rates</h2>
        
        <div class="bg-gray-50 dark:bg-black/20 rounded-2xl p-1">
            <div class="px-4 py-2 border-b border-gray-200 dark:border-white/5">
              <label class="text-[10px] uppercase text-gray-400 font-bold tracking-wider">Deluxe Rate</label>
              <select v-model="form.rate_deluxe" class="w-full bg-transparent border-none p-0 text-gray-900 dark:text-white focus:ring-0 text-sm font-medium">
                <option value="" disabled>Select Deluxe Rate</option>
                <option v-for="rate in deluxeRateOptions" :key="rate" :value="rate.toString()">
                  {{ formatCurrency(rate) }}
                </option>
              </select>
            </div>
            <div class="px-4 py-2">
              <label class="text-[10px] uppercase text-gray-400 font-bold tracking-wider">Premiere Rate</label>
              <select v-model="form.rate_premiere" class="w-full bg-transparent border-none p-0 text-gray-900 dark:text-white focus:ring-0 text-sm font-medium">
                <option value="" disabled>Select Premiere Rate</option>
                <option v-for="rate in premiereRateOptions" :key="rate" :value="rate.toString()">
                  {{ formatCurrency(rate) }}
                </option>
              </select>
            </div>
        </div>
      </div>

      <!-- Section: Additional Room Types -->
      <div class="bg-white dark:bg-sm-card-dark rounded-3xl p-5 shadow-sm border border-gray-100 dark:border-white/5 space-y-5 animate-fade-in-up" style="animation-delay: 450ms;">
        <h2 class="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider opacity-50">Additional Room Types</h2>
        
        <div class="space-y-4">
          <!-- Compact Question Toggle -->
          <div class="flex items-center justify-between p-1 bg-gray-50 dark:bg-black/20 rounded-2xl border border-gray-100 dark:border-white/5">
            <div class="pl-4">
              <p class="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider opacity-70">Add more rooms?</p>
            </div>
            <div class="flex p-1 bg-white dark:bg-white/10 rounded-xl shadow-inner shadow-black/5">
              <button
                type="button"
                @click="showAdditionalRooms = true"
                class="px-5 py-1.5 rounded-lg text-[10px] font-black tracking-widest transition-all"
                :class="showAdditionalRooms ? 'bg-sm-primary text-white shadow-md shadow-blue-500/20 scale-105' : 'text-gray-400 dark:text-gray-500'"
              >
                YES
              </button>
              <button
                type="button"
                @click="showAdditionalRooms = false; clearAdditionalRooms()"
                class="px-5 py-1.5 rounded-lg text-[10px] font-black tracking-widest transition-all"
                :class="!showAdditionalRooms ? 'bg-sm-primary text-white shadow-md shadow-blue-500/20 scale-105' : 'text-gray-400 dark:text-gray-500'"
              >
                NO
              </button>
            </div>
          </div>

          <!-- Additional Room Type Fields -->
          <div v-if="showAdditionalRooms" class="space-y-3 animate-fade-in-up">
            <!-- Room Type 1 -->
            <div class="bg-gray-50 dark:bg-black/20 rounded-2xl p-1">
              <div class="grid grid-cols-2 gap-px">
                <div class="px-4 py-2 bg-white dark:bg-sm-card-dark rounded-l-xl">
                  <label class="text-[10px] uppercase text-gray-400 font-bold tracking-wider">Room Type 1</label>
                  <select v-model="form.room_type_1" class="w-full bg-transparent border-none p-0 text-gray-900 dark:text-white focus:ring-0 text-sm font-medium">
                    <option value="" disabled>Select Room Type</option>
                    <option v-for="option in roomTypeOptions" :key="option" :value="option">{{ option }}</option>
                  </select>
                </div>
                <div class="px-4 py-2 bg-white dark:bg-sm-card-dark rounded-r-xl">
                  <label class="text-[10px] uppercase text-gray-400 font-bold tracking-wider">Rate</label>
                  <input v-model="form.rate_type_1" type="number" class="w-full bg-transparent border-none p-0 text-gray-900 dark:text-white focus:ring-0 placeholder-gray-400 font-medium text-sm" placeholder="2750000" />
                </div>
              </div>
            </div>

            <!-- Room Type 2 -->
            <div class="bg-gray-50 dark:bg-black/20 rounded-2xl p-1">
              <div class="grid grid-cols-2 gap-px">
                <div class="px-4 py-2 bg-white dark:bg-sm-card-dark rounded-l-xl">
                  <label class="text-[10px] uppercase text-gray-400 font-bold tracking-wider">Room Type 2</label>
                  <select v-model="form.room_type_2" class="w-full bg-transparent border-none p-0 text-gray-900 dark:text-white focus:ring-0 text-sm font-medium">
                    <option value="" disabled>Select Room Type</option>
                    <option v-for="option in roomTypeOptions" :key="option" :value="option">{{ option }}</option>
                  </select>
                </div>
                <div class="px-4 py-2 bg-white dark:bg-sm-card-dark rounded-r-xl">
                  <label class="text-[10px] uppercase text-gray-400 font-bold tracking-wider">Rate</label>
                  <input v-model="form.rate_type_2" type="number" class="w-full bg-transparent border-none p-0 text-gray-900 dark:text-white focus:ring-0 placeholder-gray-400 font-medium text-sm" placeholder="3150000" />
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
          class="px-6 py-4 rounded-2xl bg-gray-100 dark:bg-white/5 text-gray-900 dark:text-white font-medium hover:bg-gray-200 transition-colors"
        >
          Reset
        </button>
        <button 
           type="button" 
           @click="handleSave"
           :disabled="isSaving || !isFormValid"
           class="px-6 py-4 rounded-2xl bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white font-medium hover:bg-gray-200 transition-colors disabled:opacity-50"
        >
          {{ isSaving ? 'Saving...' : 'Save Draft' }}
        </button>
        <button 
          type="submit" 
          :disabled="isSubmitting || !isFormValid"
          class="flex-1 py-4 rounded-2xl bg-sm-primary text-white font-bold shadow-lg shadow-blue-500/30 disabled:opacity-50 disabled:shadow-none hover:scale-[1.02] active:scale-95 transition-all text-center"
        >
          <span v-if="!isSubmitting">Review Proposal</span>
          <span v-else>Processing...</span>
        </button>
      </div>

      <!-- Messages -->

      <div v-if="errorMessage" class="p-4 rounded-2xl bg-red-50 text-red-700 text-sm text-center">
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
      <div class="fixed inset-0 bg-black/60 backdrop-blur-sm" @click="showDatePicker = false"></div>
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
      <div class="fixed inset-0 bg-black/60 backdrop-blur-sm" @click="showValidityPicker = false"></div>
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

const route = useRoute()
const router = useRouter()
const isEditing = computed(() => !!route.params.id)

const titleOptions = [
  { value: 'Mr', label: 'Mr.' },
  { value: 'Ms', label: 'Ms.' },
  { value: 'Ibu', label: 'Ibu' },
  { value: 'Bapak', label: 'Bapak' }
]

const salesContacts = [
  {
    name: 'Andi Krisnatha',
    position: 'Asst. Director of Sales & Distribution',
    email: 'andikrisnatha@theanvayabali.com',
    phone: '62811389938'
  },
  {
    name: 'Purnama',
    position: 'Sales Executive',
    email: 'purnama@theanvayabali.com',
    phone: '6285179645546'
  },
  {
    name: 'Linda Permata',
    position: 'Sales Executive',
    email: 'lindapermata@theanvayabali.com',
    phone: '6281338353759'
  },
  {
    name: 'Riska Chintya',
    position: 'Assistant Sales Manager',
    email: 'riskachintya@theanvayabali.com',
    phone: '6281236362979'
  },
  {
    name: 'Doni Dwi Artha',
    position: 'Mice Coordinator',
    email: 'micecoordinator@theanvayabali.com',
    phone: '6282147598154'
  },
  {
    name: 'Aprilia Krisdayani',
    position: 'Ecommerce Executive',
    email: 'ecommerce@theanvayabali.com',
    phone: '6285738316631'
  },
  {
    name: 'Putu Kerni',
    position: 'Sales Executive',
    email: 'putukerni@theanvayabali.com',
    phone: '6285385814948'
  }
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

const handleSalesContactChange = () => {
  const selected = salesContacts.find(c => c.name === form.value.sales_pic_name)
  if (selected) {
    form.value.sales_pic_position = selected.position
    form.value.sales_pic_email = selected.email
    form.value.sales_pic_phone_number = selected.phone
  }
}

const loadRFP = async () => {
  if (!route.params.id) return
  
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
