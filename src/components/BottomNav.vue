<template>
  <div class="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3 pointer-events-none">
    
    <!-- Navigation Menu items -->
    <TransitionGroup
      enter-active-class="transition duration-300 ease-out"
      enter-from-class="transform translate-y-4 opacity-0 scale-95"
      enter-to-class="transform translate-y-0 opacity-100 scale-100"
      leave-active-class="transition duration-200 ease-in"
      leave-from-class="transform translate-y-0 opacity-100 scale-100"
      leave-to-class="transform translate-y-4 opacity-0 scale-95"
    >
      <router-link
        v-if="isOpen"
        v-for="(item, index) in navItems"
        :key="item.name"
        :to="item.to"
        @click="isOpen = false"
        class="pointer-events-auto relative z-50 flex items-center bg-white dark:bg-sm-card-dark border border-gray-100 dark:border-white/10 px-4 py-3 rounded-2xl shadow-lg shadow-black/5 hover:scale-105 active:scale-95 transition-all group"
        :style="{ transitionDelay: `${index * 50}ms` }"
      >
        <span class="text-sm font-medium text-gray-700 dark:text-gray-200 mr-3">{{ item.name }}</span>
        <div 
          class="p-2 rounded-xl transition-colors"
          :class="isActive(item) ? 'bg-sm-primary text-white' : 'bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400 group-hover:text-sm-primary'"
        >
          <component :is="item.icon" class="w-5 h-5" />
        </div>
      </router-link>
    </TransitionGroup>

    <!-- Main FAB Trigger -->
    <button
      @click="isOpen = !isOpen"
      class="pointer-events-auto w-14 h-14 rounded-full bg-sm-primary text-white shadow-xl shadow-blue-500/30 flex items-center justify-center hover:scale-110 active:scale-90 transition-all z-50"
    >
      <Transition
        mode="out-in"
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="transform rotate-90 opacity-0"
        enter-to-class="transform rotate-0 opacity-100"
        leave-active-class="transition duration-200 ease-in"
        leave-from-class="transform rotate-0 opacity-100"
        leave-to-class="transform -rotate-90 opacity-0"
      >
        <XMarkIcon v-if="isOpen" class="w-7 h-7" />
        <Bars3Icon v-else class="w-7 h-7" />
      </Transition>
    </button>

    <!-- Backdrop -->
    <Transition
      enter-active-class="transition duration-300 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-200 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div 
        v-if="isOpen" 
        @click="isOpen = false"
        class="fixed inset-0 bg-black/20 dark:bg-black/50 backdrop-blur-sm pointer-events-auto z-40"
      ></div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import {
  HomeIcon,
  ChatBubbleLeftRightIcon,
  DocumentTextIcon,
  ClipboardDocumentListIcon,
  Bars3Icon,
  XMarkIcon
} from '@heroicons/vue/24/outline'

const route = useRoute()
const isOpen = ref(false)

const navItems = [
  {
    name: 'Home',
    to: '/',
    icon: HomeIcon
  },
  {
    name: 'Chat',
    to: '/chat',
    icon: ChatBubbleLeftRightIcon
  },
  {
    name: 'Contract',
    to: '/contract',
    icon: DocumentTextIcon
  },
  {
    name: 'RFP',
    to: '/rfp',
    icon: ClipboardDocumentListIcon
  }
]

const isActive = (item: typeof navItems[0]) => {
  return item.to === '/' 
    ? route.path === '/'
    : route.path.startsWith(item.to)
}
</script>