import { createRouter, createWebHistory } from 'vue-router'
import Home from '@/pages/Home.vue'
import Chat from '@/pages/Chat.vue'
import Contract from '@/pages/Contract.vue'
import TacticalOffer from '@/pages/TacticalOffer.vue'
import Login from '@/pages/Login.vue'
import RFP from '@/pages/RFP.vue'
import RFPHistory from '@/pages/RFPHistory.vue'
import CRM from '@/pages/CRM.vue'
import PipelineReport from '@/pages/PipelineReport.vue'
import Users from '@/pages/Users.vue'
import FunctionChart from '@/pages/FunctionChart.vue'
import Survey from '@/pages/Survey.vue'
import SurveyThankYou from '@/pages/SurveyThankYou.vue'
import SurveyAdminLogin from '@/pages/SurveyAdminLogin.vue'
import SurveyAdmin from '@/pages/SurveyAdmin.vue'
import { useSessionStore } from '@/stores/session'
import { useAdminStore } from '@/stores/admin'
import { usePermissionsStore } from '@/stores/permissions'
import type { Permission } from '@/lib/permissions'

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
      component: Chat,
      meta: { requiresPermission: 'chat:access' }
    },
    {
      path: '/contract',
      name: 'contract',
      component: Contract,
      meta: { requiresPermission: 'contract:access' }
    },
    {
      path: '/tactical-offer',
      name: 'tactical-offer',
      component: TacticalOffer
    },
    {
      path: '/rfp',
      name: 'rfp-history',
      component: RFPHistory,
      meta: { requiresPermission: 'rfp:view' }
    },
    {
      path: '/rfp/new',
      name: 'rfp-new',
      component: RFP,
      meta: { requiresPermission: 'rfp:create' }
    },
    {
      path: '/rfp/:id',
      name: 'rfp-edit',
      component: RFP,
      meta: { requiresPermission: 'rfp:edit' }
    },
    {
      path: '/crm',
      name: 'crm',
      component: CRM,
      meta: { requiresPermission: 'pipeline:view' }
    },
    {
      path: '/crm/report',
      name: 'crm-report',
      component: PipelineReport,
      meta: { requiresPermission: 'pipeline:report' }
    },
    {
      path: '/users',
      name: 'users',
      component: Users,
      meta: { requiresPermission: 'users:access' }
    },
    {
      path: '/function-chart',
      name: 'function-chart',
      component: FunctionChart,
      meta: { requiresPermission: 'function:view' }
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

router.beforeEach(async (to, from, next) => {
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

  // Ensure device/chat session id exists, then wait for Firebase Auth to resolve
  // (restores the session on refresh before we decide whether to redirect).
  sessionStore.ensureSession()
  await sessionStore.authReady

  // Not signed in → always to login (before any permission checks).
  if (!sessionStore.isAuthenticated && to.name !== 'login') {
    next({ name: 'login' })
    return
  }
  if (sessionStore.isAuthenticated && to.name === 'login') {
    next({ name: 'home' })
    return
  }

  // Route/permission gating (editable role->permission matrix). 'home' is always
  // allowed, so redirecting there can never loop.
  const requiredPerm = to.meta.requiresPermission as Permission | undefined
  if (requiredPerm) {
    const permissions = usePermissionsStore()
    await permissions.load()
    if (!permissions.has(sessionStore.currentUser, requiredPerm)) {
      next({ name: 'home' })
      return
    }
  }

  next()
})

export default router