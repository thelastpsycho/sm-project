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
        name="fade-slide" 
        mode="out-in"
      >
        <component :is="Component" />
      </transition>
    </router-view>
    
    <BottomNav v-if="showNav" />
  </div>
</template>

<style>
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.fade-slide-enter-from {
  opacity: 0;
  transform: translateY(10px);
}

.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>
