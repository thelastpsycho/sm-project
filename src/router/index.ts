import { createRouter, createWebHistory } from 'vue-router'
import Home from '@/pages/Home.vue'
import Chat from '@/pages/Chat.vue'
import Contract from '@/pages/Contract.vue'
import Login from '@/pages/Login.vue'
import RFP from '@/pages/RFP.vue'
import RFPHistory from '@/pages/RFPHistory.vue'
import Survey from '@/pages/Survey.vue'
import SurveyThankYou from '@/pages/SurveyThankYou.vue'
import SurveyAdminLogin from '@/pages/SurveyAdminLogin.vue'
import SurveyAdmin from '@/pages/SurveyAdmin.vue'
import { useSessionStore } from '@/stores/session'
import { useAdminStore } from '@/stores/admin'

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
    },
    // Survey Routes (Guest)
    {
      path: '/survey/:eventId',
      name: 'survey',
      component: Survey
    },
    {
      path: '/survey/thank-you',
      name: 'survey-thank-you',
      component: SurveyThankYou
    },
    // Survey Routes (Admin)
    {
      path: '/survey/admin/login',
      name: 'survey-admin-login',
      component: SurveyAdminLogin
    },
    {
      path: '/survey/admin',
      name: 'survey-admin',
      component: SurveyAdmin,
      meta: { requiresAdminAuth: true }
    }
  ]
})

router.beforeEach((to, from, next) => {
  const sessionStore = useSessionStore()

  // Check for admin auth on survey admin routes
  if (to.meta.requiresAdminAuth) {
    const adminStore = useAdminStore()
    adminStore.checkAuth()
    if (!adminStore.isAuthenticated) {
      next({ name: 'survey-admin-login' })
      return
    }
  }

  // Regular session auth for app routes
  if (to.path.startsWith('/survey/')) {
    // Survey routes don't need session auth
    next()
    return
  }

  // Ensure session is initialized for app routes
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