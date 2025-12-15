<template>
  <div class="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-sm-bg-dark transition-colors duration-300">
    <div 
      class="max-w-sm w-full mx-auto p-8 flex flex-col items-center"
      :class="{ 'animate-shake': error }"
    >
      <div class="text-center mb-10">
        <h1 class="text-2xl font-semibold text-gray-900 dark:text-white mb-2 tracking-tight">
          Welcome Back
        </h1>
        <p class="text-sm text-gray-500 dark:text-gray-400">
          Enter your passcode to unlock
        </p>
      </div>

      <!-- Dots Display -->
      <div class="flex justify-center items-center mb-12 h-12">
        <div class="flex gap-4">
          <div
            v-for="i in 4"
            :key="i"
            class="w-4 h-4 rounded-full transition-all duration-300"
            :class="[
              pin.length >= i
                ? 'bg-sm-primary scale-110' 
                : 'bg-gray-300 dark:bg-gray-700'
            ]"
          ></div>
        </div>
      </div>
      
      <div class="h-6 text-center mb-6">
        <p v-if="error" class="text-red-500 text-xs font-medium transition-opacity duration-200">
          Incorrect PIN
        </p>
      </div>

      <!-- On-Screen Keypad -->
      <div class="grid grid-cols-3 gap-6 w-full max-w-[280px]">
        <button 
          v-for="(n, index) in [1, 2, 3, 4, 5, 6, 7, 8, 9]" 
          :key="n"
          @click="addDigit(n)"
          class="w-16 h-16 rounded-full bg-gray-200 dark:bg-white/10 text-2xl font-medium text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-white/20 active:bg-gray-400 dark:active:bg-white/30 transition-all flex items-center justify-center select-none active:scale-90 animate-fade-in-up"
          :style="{ animationDelay: `${index * 50}ms` }"
        >
          {{ n }}
        </button>
        
        <!-- Empty Placeholder -->
        <div class="w-16 h-16"></div>
        
        <button 
          @click="addDigit(0)"
          class="w-16 h-16 rounded-full bg-gray-200 dark:bg-white/10 text-2xl font-medium text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-white/20 active:bg-gray-400 dark:active:bg-white/30 transition-all flex items-center justify-center select-none active:scale-90 animate-fade-in-up"
          style="animation-delay: 450ms"
        >
          0
        </button>
        
        <button 
          @click="backspace"
          class="w-16 h-16 rounded-full flex items-center justify-center text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-white/5 active:opacity-50 transition-all select-none active:scale-90 animate-fade-in-up"
          style="animation-delay: 500ms"
        >
          <BackspaceIcon class="w-8 h-8" />
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useSessionStore } from '@/stores/session'
import { BackspaceIcon } from '@heroicons/vue/24/outline'

const router = useRouter()
const sessionStore = useSessionStore()

const pin = ref('')
const error = ref(false)

const addDigit = (digit: number) => {
  if (pin.value.length < 4) {
    pin.value += digit.toString()
  }
}

const backspace = () => {
  if (pin.value.length > 0) {
    pin.value = pin.value.slice(0, -1)
  }
}

watch(pin, (newPin) => {
  if (newPin.length === 4) {
    if (sessionStore.login(newPin)) {
      router.push('/')
    } else {
      error.value = true
      setTimeout(() => {
        pin.value = ''
        error.value = false
      }, 500)
    }
  }
})
</script>
