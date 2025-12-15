<template>
  <div class="pb-24 bg-gray-50 dark:bg-sm-bg-dark min-h-screen">
    <!-- Header -->
    <div class="px-6 py-6 bg-white dark:bg-sm-card-dark border-b border-gray-100 dark:border-white/5 sticky top-0 z-30 safe-area-top shadow-sm">
      <h1 class="text-xl font-bold text-gray-900 dark:text-white">New Contract</h1>
      <p class="text-xs text-gray-500 mt-1">Fill in the details below</p>
    </div>

    <form @submit.prevent="handleSubmit" class="p-4 space-y-6">
      
      <!-- Section: Person Information -->
      <div class="bg-white dark:bg-sm-card-dark rounded-3xl p-5 shadow-sm border border-gray-100 dark:border-white/5 space-y-5 animate-fade-in-up" style="animation-delay: 100ms;">
        <h2 class="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider opacity-50">Details</h2>
        
        <div class="grid grid-cols-2 gap-4">
           <!-- Market Select (Visual) -->
           <div class="col-span-2">
             <label class="block text-xs font-medium text-gray-500 mb-2">Market</label>
             <div class="flex bg-gray-100 dark:bg-white/5 p-1 rounded-xl">
               <button
                 v-for="opt in marketOptions"
                 :key="opt.value"
                 type="button"
                 class="flex-1 py-2 text-xs font-medium rounded-lg transition-all"
                 :class="form.market === opt.value ? 'bg-white dark:bg-white/10 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'"
                 @click="form.market = opt.value"
               >
                 {{ opt.label }}
               </button>
             </div>
           </div>
        </div>

        <!-- Custom Input Style -->
        <div class="space-y-4">
           <div class="bg-gray-50 dark:bg-black/20 rounded-2xl p-1">
             <div class="px-4 py-2 border-b border-gray-200 dark:border-white/5">
               <label class="text-[10px] uppercase text-gray-400 font-bold tracking-wider">Company</label>
               <input 
                 v-model="form.company"
                 type="text" 
                 class="w-full bg-transparent border-none p-0 text-gray-900 dark:text-white focus:ring-0 placeholder-gray-400 font-medium" 
                 placeholder="e.g. Go Vacation" 
               />
             </div>
             
             <div class="flex px-4 py-2 border-b border-gray-200 dark:border-white/5">
                <div class="w-20 border-r border-gray-200 dark:border-white/5 mr-3">
                   <label class="text-[10px] uppercase text-gray-400 font-bold tracking-wider">Title</label>
                   <select v-model="form.title" class="w-full bg-transparent border-none p-0 text-gray-900 dark:text-white focus:ring-0 text-sm font-medium">
                     <option v-for="t in titleOptions" :key="t.value" :value="t.value">{{ t.label }}</option>
                   </select>
                </div>
                <div class="flex-1">
                   <label class="text-[10px] uppercase text-gray-400 font-bold tracking-wider">Full Name</label>
                   <input v-model="form.fullName" type="text" class="w-full bg-transparent border-none p-0 text-gray-900 dark:text-white focus:ring-0 placeholder-gray-400 font-medium" placeholder="John Doe" />
                </div>
             </div>

             <div class="px-4 py-2">
               <label class="text-[10px] uppercase text-gray-400 font-bold tracking-wider">Designation</label>
               <input v-model="form.designation" type="text" class="w-full bg-transparent border-none p-0 text-gray-900 dark:text-white focus:ring-0 placeholder-gray-400 font-medium" placeholder="Manager" />
             </div>
           </div>
        </div>
      </div>

      <!-- Section: Contact -->
      <div class="bg-white dark:bg-sm-card-dark rounded-3xl p-5 shadow-sm border border-gray-100 dark:border-white/5 space-y-5 animate-fade-in-up" style="animation-delay: 200ms;">
        <h2 class="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider opacity-50">Contact</h2>
        
        <div class="bg-gray-50 dark:bg-black/20 rounded-2xl p-1">
             <div class="px-4 py-2 border-b border-gray-200 dark:border-white/5">
               <label class="text-[10px] uppercase text-gray-400 font-bold tracking-wider">Address Line 1</label>
               <input v-model="form.addressLine1" type="text" class="w-full bg-transparent border-none p-0 text-gray-900 dark:text-white focus:ring-0 placeholder-gray-400 font-medium" placeholder="Steet Address" />
             </div>
             <div class="px-4 py-2 border-b border-gray-200 dark:border-white/5">
               <label class="text-[10px] uppercase text-gray-400 font-bold tracking-wider">Address Line 2</label>
               <input v-model="form.addressLine2" type="text" class="w-full bg-transparent border-none p-0 text-gray-900 dark:text-white focus:ring-0 placeholder-gray-400 font-medium" placeholder="Apt, Suite, Etc" />
             </div>
             <div class="px-4 py-2 border-b border-gray-200 dark:border-white/5">
               <label class="text-[10px] uppercase text-gray-400 font-bold tracking-wider">Email</label>
               <input v-model="form.email" type="email" class="w-full bg-transparent border-none p-0 text-gray-900 dark:text-white focus:ring-0 placeholder-gray-400 font-medium" placeholder="user@example.com" />
             </div>
             <div class="px-4 py-2">
               <label class="text-[10px] uppercase text-gray-400 font-bold tracking-wider">Phone</label>
               <input v-model="form.phone" type="tel" class="w-full bg-transparent border-none p-0 text-gray-900 dark:text-white focus:ring-0 placeholder-gray-400 font-medium" placeholder="+1..." />
             </div>
        </div>
      </div>

       <!-- Section: Options -->
      <div class="grid grid-cols-2 gap-4 animate-fade-in-up" style="animation-delay: 300ms;">
        <!-- Allotment Toggle -->
        <label class="bg-white dark:bg-sm-card-dark p-4 rounded-3xl shadow-sm border border-gray-100 dark:border-white/5 cursor-pointer relative overflow-hidden group">
          <input type="checkbox" v-model="form.allotment" value="add" class="peer sr-only">
          <div class="absolute inset-0 bg-blue-50 dark:bg-blue-900/10 opacity-0 peer-checked:opacity-100 transition-opacity"></div>
          
          <div class="relative z-10">
            <div class="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 flex items-center justify-center mb-3">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
            </div>
            <span class="block font-medium text-gray-900 dark:text-white text-sm">Request Allotment</span>
            <span class="block text-[10px] text-gray-500 mt-1">Add to contract request</span>
          </div>
          <div class="absolute top-4 right-4 w-5 h-5 rounded-full border-2 border-gray-200 peer-checked:border-blue-500 peer-checked:bg-blue-500 transition-all"></div>
        </label>

        <!-- Notify Toggle -->
        <label class="bg-white dark:bg-sm-card-dark p-4 rounded-3xl shadow-sm border border-gray-100 dark:border-white/5 cursor-pointer relative overflow-hidden group">
          <input type="checkbox" v-model="form.notifyMe" value="yes" class="peer sr-only">
          <div class="absolute inset-0 bg-green-50 dark:bg-green-900/10 opacity-0 peer-checked:opacity-100 transition-opacity"></div>
          
          <div class="relative z-10">
             <div class="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 flex items-center justify-center mb-3">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg>
            </div>
            <span class="block font-medium text-gray-900 dark:text-white text-sm">Notifications</span>
            <span class="block text-[10px] text-gray-500 mt-1">Get email updates</span>
          </div>
          <div class="absolute top-4 right-4 w-5 h-5 rounded-full border-2 border-gray-200 peer-checked:border-green-500 peer-checked:bg-green-500 transition-all"></div>
        </label>
      </div>
      
      <!-- Notification Email (Conditional) -->
      <div v-if="form.notifyMe.includes('yes')" class="bg-white dark:bg-sm-card-dark rounded-3xl p-5 shadow-sm border border-gray-100 dark:border-white/5">
        <div class="bg-gray-50 dark:bg-black/20 rounded-2xl px-4 py-2">
           <label class="text-[10px] uppercase text-gray-400 font-bold tracking-wider">Notify Email</label>
           <input v-model="form.emailToNotify" type="email" class="w-full bg-transparent border-none p-0 text-gray-900 dark:text-white focus:ring-0 placeholder-gray-400 font-medium" placeholder="notify@example.com" />
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
          type="submit" 
          :disabled="isSubmitting || !isFormValid"
          class="flex-1 py-4 rounded-2xl bg-sm-primary text-white font-bold shadow-lg shadow-blue-500/30 disabled:opacity-50 disabled:shadow-none hover:scale-[1.02] active:scale-95 transition-all text-center"
        >
          <span v-if="!isSubmitting">Submit Contract</span>
          <span v-else>Processing...</span>
        </button>
      </div>

      <!-- Messages -->
      <div v-if="successMessage" class="p-4 rounded-2xl bg-green-50 text-green-700 text-sm text-center">
        {{ successMessage }}
      </div>
      <div v-if="errorMessage" class="p-4 rounded-2xl bg-red-50 text-red-700 text-sm text-center">
        {{ errorMessage }}
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { postContract } from '@/utils/api'
import { useSession } from '@/composables/useSession'
import type { ContractForm } from '@/types/contract'

const { ensureSession } = useSession()

const marketOptions = [
  { value: 'WW', label: 'Worldwide' },
  { value: 'Europe', label: 'Europe' },
  { value: 'Domestic', label: 'Domestic' }
]

const titleOptions = [
  { value: 'Mr.', label: 'Mr.' },
  { value: 'Ms.', label: 'Ms.' },
  { value: 'rs.', label: 'Mrs.' },
  { value: 'dr.', label: 'Dr.' }
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
const successMessage = ref('')
const errorMessage = ref('')

// Simple validation
const isFormValid = computed(() => {
  return form.value.company && form.value.fullName && form.value.email
})

const handleSubmit = async () => {
  isSubmitting.value = true
  successMessage.value = ''
  errorMessage.value = ''

  try {
    const sessionId = ensureSession()
    await postContract({ ...form.value, sessionId })
    successMessage.value = 'Contract submitted successfully!'
    setTimeout(resetForm, 2000)
  } catch (e: any) {
    errorMessage.value = e.message || 'Failed to submit'
  } finally {
    isSubmitting.value = false
  }
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