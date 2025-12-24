import { createRouter, createWebHistory } from 'vue-router'
import Home from '@/pages/Home.vue'
import Chat from '@/pages/Chat.vue'
import Contract from '@/pages/Contract.vue'
import Login from '@/pages/Login.vue'
import RFP from '@/pages/RFP.vue'
import RFPHistory from '@/pages/RFPHistory.vue'
import { useSessionStore } from '@/stores/session'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: Home
    },
    {
      path: '/chat',
      name: 'chat',
      component: Chat
    },
    {
      path: '/contract',
      name: 'contract',
      component: Contract
    },
    {
      path: '/rfp',
      name: 'rfp-history',
      component: RFPHistory
    },
    {
      path: '/rfp/new',
      name: 'rfp-new',
      component: RFP
    },
    {
      path: '/rfp/:id',
      name: 'rfp-edit',
      component: RFP
    },
    {
      path: '/login',
      name: 'login',
      component: Login
    }
  ]
})

router.beforeEach((to, from, next) => {
  const sessionStore = useSessionStore()
  // Ensure session is initialized
  sessionStore.ensureSession()

  if (!sessionStore.isAuthenticated && to.name !== 'login') {
    next({ name: 'login' })
  } else if (sessionStore.isAuthenticated && to.name === 'login') {
    next({ name: 'home' })
  } else {
    next()
  }
})

export default router