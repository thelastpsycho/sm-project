<template>
  <Transition
    enter-active-class="transition duration-300 ease-out"
    enter-from-class="opacity-0"
    enter-to-class="opacity-100"
    leave-active-class="transition duration-200 ease-in"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <div v-if="isOpen" class="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-white/90 dark:bg-sm-bg-dark/90 backdrop-blur-xl">
      <div class="max-w-md w-full text-center space-y-8">
        
        <!-- Animated Icon -->
        <div class="relative w-24 h-24 mx-auto">
          <div class="absolute inset-0 border-4 border-gray-100 dark:border-white/10 rounded-full"></div>
          <div class="absolute inset-0 border-4 border-sm-primary border-t-transparent rounded-full animate-spin"></div>
          <div class="absolute inset-0 flex items-center justify-center">
             <div class="w-12 h-12 bg-gradient-to-tr from-blue-500 to-purple-500 rounded-full animate-pulse"></div>
          </div>
        </div>

        <div class="space-y-2">
          <h3 class="text-2xl font-bold text-gray-900 dark:text-white animate-fade-in">
            Generating RFP
          </h3>
          <p class="text-gray-500 dark:text-gray-400 h-6 transition-all duration-500">
            {{ currentStep }}
          </p>
        </div>

        <!-- Progress Steps -->
        <div class="flex justify-center gap-2">
          <div 
            v-for="(step, i) in steps" 
            :key="i"
            class="h-1 rounded-full transition-all duration-500"
            :class="[
              i <= currentStepIndex ? 'w-8 bg-sm-primary' : 'w-2 bg-gray-200 dark:bg-white/10'
            ]"
          ></div>
        </div>

      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, watch, onUnmounted } from 'vue'

const props = defineProps<{
  isOpen: boolean
}>()

const steps = [
  "Connecting to workflow...",
  "Analyzing requirements...",
  "Drafting content...",
  "Generating PDF document...",
  "Creating presentation slides...",
  "Finalizing files..."
]

const currentStepIndex = ref(0)
const currentStep = ref(steps[0])
let interval: any = null

watch(() => props.isOpen, (newVal) => {
  if (newVal) {
    startProgress()
  } else {
    stopProgress()
  }
})

const startProgress = () => {
  currentStepIndex.value = 0
  currentStep.value = steps[0]
  
  if (interval) clearInterval(interval)
  
  interval = setInterval(() => {
    if (currentStepIndex.value < steps.length - 1) {
      currentStepIndex.value++
      currentStep.value = steps[currentStepIndex.value]
    }
  }, 3000) // Change step every 3 seconds
}

const stopProgress = () => {
  if (interval) clearInterval(interval)
  interval = null
}

onUnmounted(() => {
  stopProgress()
})
</script>
