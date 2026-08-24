<template>
  <Transition
    enter-active-class="transition duration-300 ease-out"
    enter-from-class="opacity-0"
    enter-to-class="opacity-100"
    leave-active-class="transition duration-200 ease-in"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <div v-if="isOpen" class="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <!-- Backdrop -->
      <div class="fixed inset-0 bg-sm-ink/40 backdrop-blur-sm shadow-2xl" @click="$emit('close')"></div>

      <!-- Panel -->
      <div class="relative bg-white dark:bg-sm-card-dark w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-fade-in-up">
        
        <!-- Header -->
        <div class="px-8 py-6 border-b border-sm-hair dark:border-white/5 flex items-center justify-between bg-white/50 dark:bg-black/20 backdrop-blur-md">
          <div>
            <h3 class="text-xl font-black text-sm-ink dark:text-white uppercase tracking-tight">
              Review Proposal
            </h3>
            <p class="text-xs text-sm-faint font-medium mt-0.5">Please check the information below before generation</p>
          </div>
          <button @click="$emit('close')" class="text-sm-faint hover:text-sm-muted dark:hover:text-gray-300 transition-colors p-2 rounded-full hover:bg-sm-surface dark:hover:bg-white/5">
            <XMarkIcon class="w-6 h-6" />
          </button>
        </div>

        <!-- Content -->
        <div class="p-8 overflow-y-auto space-y-8 custom-scrollbar">
          
          <!-- Section: Document -->
          <div class="space-y-4">
             <div class="flex items-center gap-2 mb-2">
                <div class="w-1.5 h-6 bg-sm-primary rounded-full"></div>
                <h4 class="text-xs font-black uppercase tracking-widest text-sm-faint">Document Settings</h4>
             </div>
             <div class="bg-sm-surface dark:bg-white/5 rounded-2xl p-4 flex items-center justify-between">
                <span class="text-sm font-bold text-sm-muted">Language</span>
                <span class="px-3 py-1 bg-sm-ink text-white dark:bg-white dark:text-sm-ink text-2xs font-black rounded-lg">{{ form.lang }}</span>
             </div>
          </div>

          <!-- Section: Client Details -->
          <div class="space-y-4">
             <div class="flex items-center gap-2 mb-2">
                <div class="w-1.5 h-6 bg-sm-primary rounded-full"></div>
                <h4 class="text-xs font-black uppercase tracking-widest text-sm-faint">Client Information</h4>
             </div>
             <div class="grid grid-cols-2 gap-4">
                <div class="bg-sm-surface dark:bg-white/5 rounded-2xl p-4">
                   <p class="text-2xs font-black text-sm-faint uppercase tracking-widest mb-1">Company</p>
                   <p class="text-sm font-bold text-sm-ink dark:text-white">{{ form.full_company_name }}</p>
                </div>
                <div class="bg-sm-surface dark:bg-white/5 rounded-2xl p-4">
                   <p class="text-2xs font-black text-sm-faint uppercase tracking-widest mb-1">PIC Name</p>
                   <p class="text-sm font-bold text-sm-ink dark:text-white">{{ form.title }} {{ form.pic_name }}</p>
                </div>
                <div class="bg-sm-surface dark:bg-white/5 rounded-2xl p-4 overflow-hidden">
                   <p class="text-2xs font-black text-sm-faint uppercase tracking-widest mb-1">Email</p>
                   <p class="text-xs font-bold text-sm-ink dark:text-white truncate">{{ form.client_email || '-' }}</p>
                </div>
                <div class="bg-sm-surface dark:bg-white/5 rounded-2xl p-4">
                   <p class="text-2xs font-black text-sm-faint uppercase tracking-widest mb-1">Phone</p>
                   <p class="text-sm font-bold text-sm-ink dark:text-white">{{ form.client_phone || '-' }}</p>
                </div>
             </div>
          </div>

          <!-- Section: Event Dates -->
          <div class="space-y-4">
             <div class="flex items-center gap-2 mb-2">
                <div class="w-1.5 h-6 bg-sm-primary rounded-full"></div>
                <h4 class="text-xs font-black uppercase tracking-widest text-sm-faint">Event Timeline</h4>
             </div>
             <div class="bg-sm-surface dark:bg-white/5 rounded-3xl p-6 relative overflow-hidden">
                <div class="absolute top-0 right-0 p-4 opacity-5">
                   <!-- <CalendarIcon class="w-20 h-20" /> -->
                </div>
                <div class="flex items-center justify-between relative z-10">
                   <div>
                      <p class="text-2xs font-black text-sm-faint uppercase tracking-widest mb-1">Arrival</p>
                      <p class="text-lg font-black text-sm-ink dark:text-white">{{ formatDate(form.event_date_start) }}</p>
                   </div>
                   <ArrowLongRightIcon class="w-8 h-8 text-sm-primary" />
                   <div class="text-right">
                      <p class="text-2xs font-black text-sm-faint uppercase tracking-widest mb-1">Departure</p>
                      <p class="text-lg font-black text-sm-ink dark:text-white">{{ formatDate(form.event_date_end) }}</p>
                   </div>
                </div>
                <div class="mt-4 pt-4 border-t border-sm-line dark:border-white/5 flex items-center justify-between">
                   <span class="text-2xs font-black text-sm-faint uppercase tracking-widest">Proposal Valid Until</span>
                   <span class="text-sm font-bold text-sm-ink dark:text-white">{{ formatDate(form.proposal_validity_date) }}</span>
                </div>
             </div>
          </div>

          <!-- Section: Proposed Rates -->
          <div class="space-y-4">
             <div class="flex items-center gap-2 mb-2">
                <div class="w-1.5 h-6 bg-sm-primary rounded-full"></div>
                <h4 class="text-xs font-black uppercase tracking-widest text-sm-faint">Proposed Rates</h4>
             </div>
             <div class="space-y-2">
                <div class="bg-sm-surface dark:bg-white/5 rounded-2xl p-4 flex items-center justify-between">
                   <div class="flex items-center gap-3">
                      <div class="w-10 h-10 bg-sm-primary/5 rounded-xl flex items-center justify-center">
                        <HomeIcon class="w-5 h-5 text-sm-primary" />
                      </div>
                      <span class="text-sm font-bold text-sm-ink dark:text-white">Deluxe Room</span>
                   </div>
                   <span class="text-sm font-black text-sm-primary">IDR {{ formatPrice(form.rate_deluxe) }}</span>
                </div>
                <div class="bg-sm-surface dark:bg-white/5 rounded-2xl p-4 flex items-center justify-between">
                   <div class="flex items-center gap-3">
                      <div class="w-10 h-10 bg-sm-primary/5 rounded-xl flex items-center justify-center">
                        <HomeIcon class="w-5 h-5 text-sm-primary" />
                      </div>
                      <span class="text-sm font-bold text-sm-ink dark:text-white">Premiere Room</span>
                   </div>
                   <span class="text-sm font-black text-sm-primary">IDR {{ formatPrice(form.rate_premiere) }}</span>
                </div>

                <!-- Additional Rooms -->
                <template v-if="form.room_type_1">
                   <div class="bg-sm-surface dark:bg-white/5 rounded-2xl p-4 flex items-center justify-between">
                      <div class="flex items-center gap-3">
                         <div class="w-10 h-10 bg-sm-primary/5 rounded-xl flex items-center justify-center rotate-3">
                           <HomeIcon class="w-5 h-5 text-sm-primary" />
                         </div>
                         <span class="text-sm font-bold text-sm-ink dark:text-white">{{ form.room_type_1 }}</span>
                      </div>
                      <span class="text-sm font-black text-sm-primary">IDR {{ formatPrice(form.rate_type_1) }}</span>
                   </div>
                </template>
                <template v-if="form.room_type_2">
                   <div class="bg-sm-surface dark:bg-white/5 rounded-2xl p-4 flex items-center justify-between">
                      <div class="flex items-center gap-3">
                         <div class="w-10 h-10 bg-sm-primary/5 rounded-xl flex items-center justify-center -rotate-3">
                           <HomeIcon class="w-5 h-5 text-sm-primary" />
                         </div>
                         <span class="text-sm font-bold text-sm-ink dark:text-white">{{ form.room_type_2 }}</span>
                      </div>
                      <span class="text-sm font-black text-sm-primary">IDR {{ formatPrice(form.rate_type_2) }}</span>
                   </div>
                </template>
             </div>
          </div>

          <!-- Section: Sales Contact -->
          <div class="space-y-4">
             <div class="flex items-center gap-2 mb-2">
                <div class="w-1.5 h-6 bg-sm-primary rounded-full"></div>
                <h4 class="text-xs font-black uppercase tracking-widest text-sm-faint">Sales Contact</h4>
             </div>
             <div class="bg-gray-900 text-white rounded-3xl p-6">
                <div class="flex items-center gap-4 mb-4">
                   <div class="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center">
                      <UserCircleIcon class="w-8 h-8 text-sm-primary" />
                   </div>
                   <div>
                      <p class="text-sm font-black">{{ form.sales_pic_name }}</p>
                      <p class="text-2xs text-sm-faint uppercase font-bold tracking-widest">{{ form.sales_pic_position }}</p>
                   </div>
                </div>
                <div class="grid grid-cols-2 gap-4 border-t border-white/10 pt-4">
                   <div>
                      <p class="text-2xs font-black text-sm-muted uppercase mb-0.5">Email</p>
                      <p class="text-2xs font-bold truncate">{{ form.sales_pic_email }}</p>
                   </div>
                   <div class="text-right">
                      <p class="text-2xs font-black text-sm-muted uppercase mb-0.5">Phone</p>
                      <p class="text-2xs font-bold">{{ form.sales_pic_phone_number }}</p>
                   </div>
                </div>
             </div>
          </div>

        </div>

        <!-- Footer -->
        <div class="px-8 py-6 bg-sm-surface dark:bg-white/5 border-t border-sm-hair dark:border-white/5 flex gap-4">
          <button 
             type="button" 
             @click="$emit('close')"
             class="flex-1 px-6 py-4 rounded-2xl font-black text-2xs uppercase tracking-widest text-sm-muted bg-white dark:bg-white/5 border border-sm-line dark:border-white/5 hover:bg-sm-surface dark:hover:bg-white/10 transition-all active:scale-95"
          >
            Edit Data
          </button>
          <button 
             type="button" 
             @click="$emit('confirm')"
             class="flex-1 px-6 py-4 rounded-2xl bg-sm-ink text-white dark:bg-white dark:text-sm-ink font-black text-2xs uppercase tracking-[0.2em] shadow-xl shadow-blue-500/20 hover:scale-[1.02] active:scale-95 transition-all text-center"
          >
            Generate RFP
          </button>
        </div>

      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { 
  XMarkIcon, 
  CalendarIcon, 
  ArrowLongRightIcon,
  HomeIcon,
  UserCircleIcon
} from '@heroicons/vue/24/outline'

defineProps<{
  isOpen: boolean
  form: any
}>()

defineEmits(['close', 'confirm'])

const formatDate = (dateString: string) => {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric' 
  })
}

const formatPrice = (price: string | number) => {
  if (!price) return '0'
  const val = typeof price === 'string' ? Number(price.replace(/,/g, '')) : price
  return new Intl.NumberFormat('id-ID').format(val)
}
</script>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.1);
  border-radius: 10px;
}
.dark .custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
}
</style>
