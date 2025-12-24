<template>
  <nav class="fixed bottom-6 left-4 right-4 z-50">
    <div class="max-w-md mx-auto bg-white/80 dark:bg-sm-card-dark/80 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg shadow-black/5">
      <div class="grid grid-cols-4 h-16 items-center">
        <router-link
          v-for="item in navItems"
          :key="item.name"
          :to="item.to"
          :class="navItemClasses(item)"
          class="flex flex-col items-center justify-center space-y-1 transition-all duration-300 relative group"
        >
          <div 
            class="absolute inset-0 bg-sm-primary/10 rounded-xl scale-0 transition-transform duration-300"
            :class="{ 'scale-75': route.path === item.to }"
          ></div>
          <component 
            :is="item.icon" 
            class="h-6 w-6 z-10 transition-transform duration-300"
            :class="{ '-translate-y-0.5': route.path === item.to }"
          />
          <span 
            class="text-[10px] font-medium z-10 transition-opacity duration-300"
            :class="{ 'opacity-100': route.path === item.to, 'opacity-70': route.path !== item.to }"
          >
            {{ item.name }}
          </span>
        </router-link>
      </div>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import {
  HomeIcon,
  ChatBubbleLeftRightIcon,
  DocumentTextIcon,
  ClipboardDocumentListIcon
} from '@heroicons/vue/24/outline'

const route = useRoute()

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

const navItemClasses = (item: typeof navItems[0]) => {
  const isActive = item.to === '/' 
    ? route.path === '/'
    : route.path.startsWith(item.to)

  return isActive
    ? 'text-sm-primary dark:text-blue-400'
    : 'text-gray-500 dark:text-gray-400 hover:text-sm-primary dark:hover:text-blue-400'
}
</script>