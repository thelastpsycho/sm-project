<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import BottomNav from '@/components/BottomNav.vue'
import { useThemeStore } from '@/stores/theme'

const themeStore = useThemeStore()
const route = useRoute()

onMounted(() => {
  themeStore.applyTheme()
})

const showNav = computed(() => !['login', 'chat'].includes(route.name as string))
</script>

<template>
  <div class="relative min-h-screen overflow-x-hidden safe-area-top">
    <router-view v-slot="{ Component }">
      <transition 
        name="fade" 
        mode="out-in"
      >
        <component :is="Component" :key="route.fullPath" />
      </transition>
    </router-view>
    
    <BottomNav v-if="showNav" />
  </div>
</template>

<style>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
