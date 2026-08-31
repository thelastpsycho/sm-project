<template>
  <div class="pb-32 bg-white dark:bg-sm-bg-dark min-h-screen">
    <!-- Header -->
    <div class="px-6 py-6 border-b border-sm-line dark:border-white/10 sticky top-0 z-30 safe-area-top bg-white/90 dark:bg-sm-bg-dark/90 backdrop-blur">
      <h1 class="sm-display text-title">New Contract</h1>
      <p class="text-xs text-sm-muted mt-1.5">Fill in the details below</p>
    </div>

    <form @submit.prevent="handleSubmit" class="p-4 lg:px-8 space-y-6 max-w-[760px] mx-auto lg:mx-0">
      
      <!-- Section: Person Information -->
      <div class="rounded-2xl p-5 border border-sm-line dark:border-white/10 space-y-5 animate-fade-in-up" style="animation-delay: 100ms;">
        <h2 class="sm-eyebrow">Details</h2>
        
        <div class="grid grid-cols-2 gap-4">
           <!-- Market Select (Visual) -->
           <div class="col-span-2">
             <label class="block sm-eyebrow mb-2">Market</label>
             <div class="flex bg-sm-surface dark:bg-white/5 p-1 rounded-xl">
               <button
                 v-for="opt in marketOptions"
                 :key="opt.value"
                 type="button"
                 class="flex-1 py-2 text-xs font-medium rounded-lg transition-all"
                 :class="form.market === opt.value ? 'bg-sm-ink text-white dark:bg-white dark:text-sm-ink' : 'text-sm-muted hover:text-sm-ink dark:hover:text-white'"
                 @click="form.market = opt.value"
               >
                 {{ opt.label }}
               </button>
             </div>
           </div>
        </div>

        <!-- Custom Input Style -->
        <div class="space-y-4">
           <div class="rounded-2xl border border-sm-line dark:border-white/10 overflow-hidden">
             <div class="px-4 py-2 border-b border-sm-hair dark:border-white/10">
               <label class="sm-eyebrow">Company</label>
               <input 
                 v-model="form.company"
                 type="text" 
                 class="w-full bg-transparent border-none p-0 text-sm-ink dark:text-white focus:ring-0 placeholder:text-sm-faint font-semibold" 
                 placeholder="e.g. Go Vacation" 
               />
             </div>
             
             <div class="flex px-4 py-2 border-b border-sm-hair dark:border-white/10">
                <div class="w-20 border-r border-sm-hair dark:border-white/10 mr-3">
                   <label class="sm-eyebrow">Title</label>
                   <select v-model="form.title" class="w-full bg-transparent border-none p-0 text-sm-ink dark:text-white focus:ring-0 text-sm font-semibold">
                     <option v-for="t in titleOptions" :key="t.value" :value="t.value">{{ t.label }}</option>
                   </select>
                </div>
                <div class="flex-1">
                   <label class="sm-eyebrow">Full Name</label>
                   <input v-model="form.fullName" type="text" class="w-full bg-transparent border-none p-0 text-sm-ink dark:text-white focus:ring-0 placeholder:text-sm-faint font-semibold" placeholder="John Doe" />
                </div>
             </div>

             <div class="px-4 py-2">
               <label class="sm-eyebrow">Designation</label>
               <input v-model="form.designation" type="text" class="w-full bg-transparent border-none p-0 text-sm-ink dark:text-white focus:ring-0 placeholder:text-sm-faint font-semibold" placeholder="Manager" />
             </div>
           </div>
        </div>
      </div>

      <!-- Section: Contact -->
      <div class="rounded-2xl p-5 border border-sm-line dark:border-white/10 space-y-5 animate-fade-in-up" style="animation-delay: 200ms;">
        <h2 class="sm-eyebrow">Contact</h2>
        
        <div class="rounded-2xl border border-sm-line dark:border-white/10 overflow-hidden">
             <div class="px-4 py-2 border-b border-sm-hair dark:border-white/10">
               <label class="sm-eyebrow">Address Line 1</label>
               <input v-model="form.addressLine1" type="text" class="w-full bg-transparent border-none p-0 text-sm-ink dark:text-white focus:ring-0 placeholder:text-sm-faint font-semibold" placeholder="Steet Address" />
             </div>
             <div class="px-4 py-2 border-b border-sm-hair dark:border-white/10">
               <label class="sm-eyebrow">Address Line 2</label>
               <input v-model="form.addressLine2" type="text" class="w-full bg-transparent border-none p-0 text-sm-ink dark:text-white focus:ring-0 placeholder:text-sm-faint font-semibold" placeholder="Apt, Suite, Etc" />
             </div>
             <div class="px-4 py-2 border-b border-sm-hair dark:border-white/10">
               <label class="sm-eyebrow">Email</label>
               <input v-model="form.email" type="email" class="w-full bg-transparent border-none p-0 text-sm-ink dark:text-white focus:ring-0 placeholder:text-sm-faint font-semibold" placeholder="user@example.com" />
             </div>
             <div class="px-4 py-2">
               <label class="sm-eyebrow">Phone</label>
               <input v-model="form.phone" type="tel" class="w-full bg-transparent border-none p-0 text-sm-ink dark:text-white focus:ring-0 placeholder:text-sm-faint font-semibold" placeholder="+1..." />
             </div>
        </div>
      </div>

       <!-- Section: Options -->
      <div class="grid grid-cols-2 gap-4 animate-fade-in-up" style="animation-delay: 300ms;">
        <!-- Allotment Toggle -->
        <label class="p-4 rounded-2xl border border-sm-line dark:border-white/10 cursor-pointer relative overflow-hidden group">
          <input type="checkbox" v-model="form.allotment" value="add" class="peer sr-only">
          <div class="absolute inset-0 bg-blue-50 dark:bg-blue-900/10 opacity-0 peer-checked:opacity-100 transition-opacity"></div>
          
          <div class="relative z-10">
            <div class="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 flex items-center justify-center mb-3">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
            </div>
            <span class="block font-bold text-sm-ink dark:text-white text-sm">Request Allotment</span>
            <span class="block text-2xs text-sm-muted mt-1">Add to contract request</span>
          </div>
          <div class="absolute top-4 right-4 w-5 h-5 rounded-full border-2 border-gray-200 peer-checked:border-blue-500 peer-checked:bg-blue-500 transition-all"></div>
        </label>

        <!-- Notify Toggle -->
        <label class="p-4 rounded-2xl border border-sm-line dark:border-white/10 cursor-pointer relative overflow-hidden group">
          <input type="checkbox" v-model="form.notifyMe" value="yes" class="peer sr-only">
          <div class="absolute inset-0 bg-green-50 dark:bg-green-900/10 opacity-0 peer-checked:opacity-100 transition-opacity"></div>
          
          <div class="relative z-10">
             <div class="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 flex items-center justify-center mb-3">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg>
            </div>
            <span class="block font-bold text-sm-ink dark:text-white text-sm">Notifications</span>
            <span class="block text-2xs text-sm-muted mt-1">Get email updates</span>
          </div>
          <div class="absolute top-4 right-4 w-5 h-5 rounded-full border-2 border-gray-200 peer-checked:border-green-500 peer-checked:bg-green-500 transition-all"></div>
        </label>
      </div>
      
      <!-- Notification Email (Conditional) -->
      <div v-if="form.notifyMe.includes('yes')" class="rounded-2xl p-5 border border-sm-line dark:border-white/10">
        <div class="rounded-2xl border border-sm-line dark:border-white/10 px-4 py-2">
           <label class="sm-eyebrow">Notify Email</label>
           <input v-model="form.emailToNotify" type="email" class="w-full bg-transparent border-none p-0 text-sm-ink dark:text-white focus:ring-0 placeholder:text-sm-faint font-semibold" placeholder="notify@example.com" />
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
          type="submit" 
          :disabled="isSubmitting || !isFormValid"
          class="flex-1 py-4 rounded-2xl bg-sm-ink text-white dark:bg-white dark:text-sm-ink font-bold disabled:opacity-50 active:scale-[0.99] transition-all text-center"
        >
          <span v-if="!isSubmitting">Submit Contract</span>
          <span v-else>Processing...</span>
        </button>
      </div>

      <div v-if="errorMessage" class="p-4 rounded-2xl text-sm-bad text-sm text-center">
        {{ errorMessage }}
      </div>
    </form>

    <!-- Submission Modal (Human in the Loop) -->
    <div v-if="isApprovalModalOpen" class="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-sm-ink/40 backdrop-blur-md" @click="closeModal"></div>
      
      <div class="relative bg-white dark:bg-sm-card-dark w-full max-w-sm rounded-[2.5rem] shadow-2xl overflow-hidden animate-fade-in-up">
        <div class="p-8 text-center">
          <div class="w-20 h-20 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
          </div>
          
          <h2 class="text-2xl font-extrabold tracking-[-0.02em] text-sm-ink dark:text-white mb-2">Contract Submitted</h2>
          <p class="text-sm-muted mb-8 text-sm">Your request has been sent and is currently waiting for approval.</p>
          
          <button 
            @click="closeModal"
            class="w-full py-4 bg-sm-ink text-white dark:bg-white dark:text-sm-ink font-bold rounded-2xl active:scale-[0.99] transition-all"
          >
            Great, Thanks!
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { postContract } from '@/utils/api'
import { useSession } from '@/composables/useSession'
import type { ContractForm } from '@/types/contract'
import { useHead } from '@vueuse/head'

useHead({
  title: 'Submit Contract',
  meta: [
    {
      name: 'description',
      content: 'Submit new contract requests with client details, contact information, and allotment options for The Anvaya Beach Resort Bali.'
    }
  ]
})

const { ensureSession } = useSession()

const marketOptions = [
  { value: 'WW', label: 'Worldwide' },
  { value: 'Europe', label: 'Europe' },
  { value: 'Domestic', label: 'Domestic' }
]

const titleOptions = [
  { value: 'Mr.', label: 'Mr.' },
  { value: 'Ms.', label: 'Ms.' },
  { value: 'Bapak', label: 'Bapak' },
  { value: 'Ibu', label: 'Ibu' }
]

const form = ref<ContractForm>({
  market: 'WW',
  company: '',
  title: 'Mr.',
  fullName: '',
  designation: '',
  addressLine1: '',
  addressLine2: '',
  email: '',
  phone: '',
  allotment: [],
  notifyMe: [],
  emailToNotify: ''
})

const isSubmitting = ref(false)
const errorMessage = ref('')
const isApprovalModalOpen = ref(false)

// Simple validation
const isFormValid = computed(() => {
  return form.value.company && form.value.fullName && form.value.email
})

const handleSubmit = async () => {
  isSubmitting.value = true
  errorMessage.value = ''

  try {
    const sessionId = ensureSession()
    await postContract({ ...form.value, sessionId })
    isApprovalModalOpen.value = true
  } catch (e: any) {
    errorMessage.value = e.message || 'Failed to submit'
  } finally {
    isSubmitting.value = false
  }
}

const closeModal = () => {
  isApprovalModalOpen.value = false
  resetForm()
}

const resetForm = () => {
  form.value = {
    market: 'WW',
    company: '',
    title: 'Mr.',
    fullName: '',
    designation: '',
    addressLine1: '',
    addressLine2: '',
    email: '',
    phone: '',
    allotment: [],
    notifyMe: [],
    emailToNotify: ''
  }
}
</script>