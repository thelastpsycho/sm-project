import { createRouter, createWebHistory } from 'vue-router'
// Home and Login stay eager so the landing/login route paints instantly.
// Every other page is lazy-loaded (Vite splits each into its own chunk,
// fetched only when the route is visited). Routes resolve identically.
import Home from '@/pages/Home.vue'
import Login from '@/pages/Login.vue'
import { useSessionStore } from '@/stores/session'
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
      component: () => import('@/pages/Chat.vue'),
      meta: { requiresPermission: 'chat:access' }
    },
    {
      path: '/contract',
      name: 'contract',
      component: () => import('@/pages/Contract.vue'),
      meta: { requiresPermission: 'contract:access' }
    },
    {
      path: '/tactical-offer',
      name: 'tactical-offer',
      component: () => import('@/pages/TacticalOffer.vue')
    },
    {
      path: '/rfp',
      name: 'rfp-history',
      component: () => import('@/pages/RFPHistory.vue'),
      meta: { requiresPermission: 'rfp:view' }
    },
    {
      path: '/rfp/new',
      name: 'rfp-new',
      component: () => import('@/pages/RFP.vue'),
      meta: { requiresPermission: 'rfp:create' }
    },
    {
      path: '/rfp/:id',
      name: 'rfp-edit',
      component: () => import('@/pages/RFP.vue'),
      meta: { requiresPermission: 'rfp:edit' }
    },
    {
      path: '/crm',
      name: 'crm',
      component: () => import('@/pages/CRM.vue'),
      meta: { requiresPermission: 'pipeline:view' }
    },
    {
      path: '/crm/report',
      name: 'crm-report',
      component: () => import('@/pages/PipelineReport.vue'),
      meta: { requiresPermission: 'pipeline:report' }
    },
    {
      path: '/users',
      name: 'users',
      component: () => import('@/pages/Users.vue'),
      meta: { requiresPermission: 'users:access' }
    },
    {
      path: '/function-chart',
      name: 'function-chart',
      component: () => import('@/pages/FunctionChart.vue'),
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
      component: () => import('@/pages/Survey.vue')
    },
    {
      path: '/survey/thank-you',
      name: 'survey-thank-you',
      component: () => import('@/pages/SurveyThankYou.vue')
    },
    // Survey Admin — gated by the normal role/permission session (no separate PIN)
    {
      path: '/survey/admin',
      name: 'survey-admin',
      component: () => import('@/pages/SurveyAdmin.vue'),
      meta: { requiresPermission: 'survey:view' }
    }
  ]
})

router.beforeEach(async (to, from, next) => {
  const sessionStore = useSessionStore()

  // Guest survey routes are public (no app session). The admin panel
  // (survey-admin) is NOT public — it falls through to the normal session +
  // permission gating below, using the signed-in user's role.
  if (to.path.startsWith('/survey/') && to.name !== 'survey-admin') {
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