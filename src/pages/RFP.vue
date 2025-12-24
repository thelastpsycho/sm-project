<template>
  <div class="pb-24 bg-gray-50 dark:bg-sm-bg-dark min-h-screen">
    <!-- Header -->
    <div class="px-6 py-6 bg-white dark:bg-sm-card-dark border-b border-gray-100 dark:border-white/5 sticky top-0 z-30 safe-area-top shadow-sm">
      <h1 class="text-xl font-bold text-gray-900 dark:text-white">{{ isEditing ? 'Edit RFP' : 'New RFP' }}</h1>
      <p class="text-xs text-gray-500 mt-1">{{ isEditing ? 'Update proposal details' : 'Create a new proposal request' }}</p>
    </div>

    <form @submit.prevent="handleSubmit" class="p-4 space-y-6">
      
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

             <div class="px-4 py-2 border-b border-gray-200 dark:border-white/5">
               <label class="text-[10px] uppercase text-gray-400 font-bold tracking-wider">Company Name</label>
               <input 
                 v-model="form.full_company_name"
                 type="text" 
                 class="w-full bg-transparent border-none p-0 text-gray-900 dark:text-white focus:ring-0 placeholder-gray-400 font-medium" 
                 placeholder="Global Consulting Partners Ltd" 
               />
             </div>
             
             <div class="flex px-4 py-2">
               <div class="flex-1 mr-3">
                 <label class="text-[10px] uppercase text-gray-400 font-bold tracking-wider">Start Date</label>
                 <input v-model="form.event_date_start" type="date" class="w-full bg-transparent border-none p-0 text-gray-900 dark:text-white focus:ring-0 placeholder-gray-400 font-medium" />
               </div>
               <div class="flex-1">
                 <label class="text-[10px] uppercase text-gray-400 font-bold tracking-wider">End Date</label>
                 <input v-model="form.event_date_end" type="date" class="w-full bg-transparent border-none p-0 text-gray-900 dark:text-white focus:ring-0 placeholder-gray-400 font-medium" />
               </div>
             </div>

             <div class="px-4 py-2 border-t border-gray-200 dark:border-white/5">
                <label class="text-[10px] uppercase text-gray-400 font-bold tracking-wider">Proposal Validity</label>
                <input v-model="form.proposal_validity_date" type="date" class="w-full bg-transparent border-none p-0 text-gray-900 dark:text-white focus:ring-0 placeholder-gray-400 font-medium" />
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
               <input v-model="form.sales_pic_name" type="text" class="w-full bg-transparent border-none p-0 text-gray-900 dark:text-white focus:ring-0 placeholder-gray-400 font-medium" placeholder="Jessica Wong" />
             </div>
             <div class="px-4 py-2 border-b border-gray-200 dark:border-white/5">
               <label class="text-[10px] uppercase text-gray-400 font-bold tracking-wider">Position</label>
               <input v-model="form.sales_pic_position" type="text" class="w-full bg-transparent border-none p-0 text-gray-900 dark:text-white focus:ring-0 placeholder-gray-400 font-medium" placeholder="Event Sales Coordinator" />
             </div>
             <div class="px-4 py-2 border-b border-gray-200 dark:border-white/5">
               <label class="text-[10px] uppercase text-gray-400 font-bold tracking-wider">Email</label>
               <input v-model="form.sales_pic_email" type="email" class="w-full bg-transparent border-none p-0 text-gray-900 dark:text-white focus:ring-0 placeholder-gray-400 font-medium" placeholder="jessica.wong@anvayabali.com" />
             </div>
             <div class="px-4 py-2">
               <label class="text-[10px] uppercase text-gray-400 font-bold tracking-wider">Phone</label>
               <input v-model="form.sales_pic_phone_number" type="tel" class="w-full bg-transparent border-none p-0 text-gray-900 dark:text-white focus:ring-0 placeholder-gray-400 font-medium" placeholder="+62 821..." />
             </div>
        </div>
      </div>

      <!-- Section: Rates -->
      <div class="bg-white dark:bg-sm-card-dark rounded-3xl p-5 shadow-sm border border-gray-100 dark:border-white/5 space-y-5 animate-fade-in-up" style="animation-delay: 400ms;">
        <h2 class="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider opacity-50">Proposed Rates</h2>
        
        <div class="bg-gray-50 dark:bg-black/20 rounded-2xl p-1">
           <div class="px-4 py-2 border-b border-gray-200 dark:border-white/5">
             <label class="text-[10px] uppercase text-gray-400 font-bold tracking-wider">Deluxe Rate</label>
             <input v-model="form.rate_deluxe" type="number" class="w-full bg-transparent border-none p-0 text-gray-900 dark:text-white focus:ring-0 placeholder-gray-400 font-medium" placeholder="1950000" />
           </div>
           <div class="px-4 py-2">
             <label class="text-[10px] uppercase text-gray-400 font-bold tracking-wider">Premiere Rate</label>
             <input v-model="form.rate_premiere" type="number" class="w-full bg-transparent border-none p-0 text-gray-900 dark:text-white focus:ring-0 placeholder-gray-400 font-medium" placeholder="2350000" />
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
          <span v-if="!isSubmitting">Create RFP</span>
          <span v-else>Processing...</span>
        </button>
      </div>

      <!-- Messages -->

      <div v-if="errorMessage" class="p-4 rounded-2xl bg-red-50 text-red-700 text-sm text-center">
        {{ errorMessage }}
      </div>
    </form>

    <ProcessingModal :is-open="isSubmitting" />

    <ResponseModal 
      :is-open="showModal" 
      :content="responseContent" 
      @close="showModal = false" 
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { postRFP } from '@/utils/api'
import type { RFPForm } from '@/types/rfp'
import ResponseModal from '@/components/ResponseModal.vue'
import ProcessingModal from '@/components/ProcessingModal.vue'
import { db, ensureAuth } from '@/utils/firebase'
import { doc, getDoc, setDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore'

const route = useRoute()
const router = useRouter()
const isEditing = computed(() => !!route.params.id)

const titleOptions = [
  { value: 'Mr', label: 'Mr.' },
  { value: 'Ms', label: 'Ms.' },
  { value: 'Mrs', label: 'Mrs.' },
  { value: 'Dr', label: 'Dr.' }
]

const form = ref<RFPForm>({
  title: 'Mr',
  pic_name: '',
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
  rate_premiere: ''
})

const isSubmitting = ref(false)
const isSaving = ref(false)
const errorMessage = ref('')
const showModal = ref(false)
const responseContent = ref<any>(null)

// Basic validation
const isFormValid = computed(() => {
  return form.value.pic_name && 
         form.value.full_company_name && 
         form.value.sales_pic_email &&
         form.value.event_date_start &&
         form.value.event_date_end &&
         form.value.proposal_validity_date
})

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
  isSubmitting.value = true
  errorMessage.value = ''

  try {
    // Auto-save before generating
    const id = await saveToFirebase(true)
    if (!isEditing.value) {
      router.replace({ name: 'rfp-edit', params: { id } })
    }

    const res = await postRFP(form.value)
    
    // Save links if they exist
    if (res && (res.link_to_pdf || res.link_to_slide)) {
      await setDoc(doc(db, 'rfps', id), {
        link_to_pdf: res.link_to_pdf || null,
        link_to_slide: res.link_to_slide || null
      }, { merge: true })
    }

    responseContent.value = res
    showModal.value = true
  } catch (e: any) {
    errorMessage.value = e.message || 'Failed to submit'
  } finally {
    isSubmitting.value = false
  }
}

onMounted(() => {
  loadRFP()
})

const resetForm = () => {
  form.value = {
    title: 'Mr',
    pic_name: '',
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
    rate_premiere: ''
  }
}
</script>
