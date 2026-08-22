<script setup lang="ts">
import { onMounted, computed, watch } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import BottomNav from '@/components/BottomNav.vue'
import { useThemeStore } from '@/stores/theme'
import { useSessionStore } from '@/stores/session'
import { useCrmStore } from '@/stores/crm'
import { usePermissionsStore } from '@/stores/permissions'
import { listenForegroundPush } from '@/lib/push'

const themeStore = useThemeStore()
const session = useSessionStore()
const crm = useCrmStore()
const permissions = usePermissionsStore()
const route = useRoute()

onMounted(() => {
  themeStore.applyTheme()
  // Foreground push (app open): refresh deals so the bell badge updates live.
  listenForegroundPush(() => crm.loadDeals())
})

// Keep deals loaded app-wide once signed in, so the notification bell badge is live
// on every screen (not just /crm). Reloads when a user signs in.
watch(
  () => session.isAuthenticated,
  isAuth => {
    if (isAuth) {
      crm.loadDeals()
      permissions.load() // hydrate the role->permission matrix so nav reflects it
    }
  },
  { immediate: true }
)

const showNav = computed(() => !['login', 'survey'].includes(route.name as string))
</script>

<template>
  <div class="relative min-h-screen overflow-x-hidden safe-area-top bg-sm-bg dark:bg-sm-bg-dark transition-colors duration-300">
    <router-view v-slot="{ Component }">
      <transition 
        name="fade" 
      >
        <component :is="Component" :key="route.fullPath" />
      </transition>
    </router-view>
    
    <BottomNav v-if="showNav" />
  </div>
</template>

<style>
/* 
  Simultaneous Cross-fade 
  Note: This requires the container to be relative (which it is)
*/
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* 
  Prevent layout jump during transition by taking the leaving element out of flow.
  CAUTION: This assumes pages share the same top alignment.
*/
.fade-leave-active {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  pointer-events: none; /* Prevent clicks on fading out element */
}
</style>
