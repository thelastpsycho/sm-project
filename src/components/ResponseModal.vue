<template>
  <Transition
    enter-active-class="transition duration-200 ease-out"
    enter-from-class="transform opacity-0"
    enter-to-class="transform opacity-100"
    leave-active-class="transition duration-200 ease-in"
    leave-from-class="transform opacity-100"
    leave-to-class="transform opacity-0"
  >
    <div v-if="isOpen" class="fixed inset-0 z-[60] flex items-center justify-center p-4" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <!-- Backdrop -->
      <div class="fixed inset-0 bg-black/50 backdrop-blur-sm" @click="close"></div>

      <!-- Panel -->
      <div class="relative bg-white dark:bg-sm-card-dark w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-fade-in-up">
        
        <!-- Header -->
        <div class="px-6 py-4 border-b border-gray-100 dark:border-white/5 flex items-center justify-between bg-white/50 dark:bg-black/20 backdrop-blur-md">
          <h3 class="text-lg font-bold text-gray-900 dark:text-white" id="modal-title">
            Proposal Generated
          </h3>
          <button @click="close" class="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 transition-colors p-1 rounded-full hover:bg-gray-100 dark:hover:bg-white/5">
            <XMarkIcon class="w-6 h-6" />
          </button>
        </div>

        <!-- Content -->
        <div class="p-6 overflow-y-auto">
          
          <!-- Success View with Links -->
          <div v-if="isStructuredResponse" class="space-y-6">
            <div class="text-center space-y-2">
              <div class="w-16 h-16 bg-green-100 dark:bg-green-900/30 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckIcon class="w-8 h-8" />
              </div>
              <h4 class="text-xl font-bold text-gray-900 dark:text-white">RFP Ready!</h4>
              <p class="text-gray-500 dark:text-gray-400">
                The proposal for <span class="font-bold text-gray-900 dark:text-white">{{ content.company_name }}</span> has been generated.
              </p>
            </div>

            <div class="grid gap-4">


              <!-- PDF Link -->
              <a 
                v-if="content.link_to_pdf"
                :href="content.link_to_pdf"
                target="_blank"
                class="flex items-center gap-4 p-4 rounded-2xl bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-500/20 group hover:scale-[1.02] transition-transform cursor-pointer"
              >
                <div class="w-12 h-12 rounded-xl bg-red-100 dark:bg-red-900/40 text-red-600 flex items-center justify-center">
                  <DocumentTextIcon class="w-6 h-6" />
                </div>
                <div class="flex-1">
                  <h5 class="font-bold text-gray-900 dark:text-white">PDF Document</h5>
                  <p class="text-xs text-red-600/80 dark:text-red-400">View PDF Proposal</p>
                </div>
                <ArrowTopRightOnSquareIcon class="w-5 h-5 text-gray-400 group-hover:text-red-500 transition-colors" />
              </a>
            </div>
          </div>

          <!-- Fallback / Raw View -->
          <div v-else class="bg-gray-50 dark:bg-black/20 rounded-2xl p-4 font-mono text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
            <template v-if="formattedContent">
               {{ formattedContent }}
            </template>
            <template v-else>
               <div class="flex flex-col items-center justify-center py-8 text-gray-400">
                  <span class="mb-2">No content returned</span>
               </div>
            </template>
          </div>
        </div>

        <!-- Footer -->
        <div class="px-6 py-4 bg-gray-50 dark:bg-black/20 border-t border-gray-100 dark:border-white/5 flex gap-3">
          <button 
             type="button" 
             @click="close"
             class="px-5 py-3 rounded-xl font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/5 transition-colors"
          >
            Close
          </button>
          <button 
             type="button" 
             @click="goToHistory"
             class="flex-1 px-5 py-3 rounded-xl bg-sm-primary text-white font-bold shadow-lg shadow-blue-500/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <ClipboardDocumentListIcon class="w-5 h-5" />
            <span>Go to History</span>
          </button>
        </div>

      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { 
  XMarkIcon, 
  ClipboardDocumentListIcon,
  DocumentTextIcon,
  ArrowTopRightOnSquareIcon
} from '@heroicons/vue/24/outline'

const props = defineProps<{
  isOpen: boolean
  content: any
}>()

const emit = defineEmits(['close'])
const router = useRouter()

const close = () => {
  emit('close')
}

const goToHistory = () => {
  router.push('/rfp')
  emit('close')
}

const isStructuredResponse = computed(() => {
  return props.content && 
         typeof props.content === 'object' && 
         props.content.link_to_pdf
})

const formattedContent = computed(() => {
  if (!props.content) return ''
  // If content is an object or array, pretty print it
  if (typeof props.content === 'object') {
    return JSON.stringify(props.content, null, 2)
  }
  return props.content
})


</script>
