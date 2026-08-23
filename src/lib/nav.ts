// Single source of truth for primary navigation, shared by the desktop side rail
// (SideRail.vue) and the mobile FAB sheet (BottomNav.vue). Ordering follows the
// action-queue redesign: Pipeline sits near the top since it's the daily driver.
import {
  HomeIcon,
  Squares2X2Icon,
  ChartBarIcon,
  CalendarDaysIcon,
  ChatBubbleLeftRightIcon,
  ClipboardDocumentListIcon,
  DocumentTextIcon,
  ClipboardDocumentIcon,
  UsersIcon,
  PlusIcon
} from '@heroicons/vue/24/outline'
import type { Permission } from '@/lib/permissions'

export interface NavItem {
  name: string
  to: string
  icon: unknown
  permission?: Permission // when set, only shown to roles granted this permission
  exact?: boolean // match the path exactly (Home)
}

export const NAV_ITEMS: NavItem[] = [
  { name: 'Home', to: '/', icon: HomeIcon, permission: 'home:access', exact: true },
  { name: 'Pipeline', to: '/crm', icon: Squares2X2Icon, permission: 'pipeline:view' },
  { name: 'Report', to: '/crm/report', icon: ChartBarIcon, permission: 'pipeline:report' },
  { name: 'Function Chart', to: '/function-chart', icon: CalendarDaysIcon, permission: 'function:view' },
  { name: 'Chat', to: '/chat', icon: ChatBubbleLeftRightIcon, permission: 'chat:access' },
  { name: 'New RFP', to: '/rfp/new', icon: PlusIcon, permission: 'rfp:create' },
  { name: 'RFP History', to: '/rfp', icon: ClipboardDocumentListIcon, permission: 'rfp:view' },
  { name: 'Contract', to: '/contract', icon: DocumentTextIcon, permission: 'contract:access' },
  { name: 'Survey Admin', to: '/survey/admin', icon: ClipboardDocumentIcon, permission: 'survey:view' },
  { name: 'Team & Access', to: '/users', icon: UsersIcon, permission: 'users:access' }
]

// Active-state test shared by both nav surfaces. Home matches exactly; everything
// else matches on path prefix so nested routes (e.g. /rfp/:id) stay highlighted.
// /crm is special-cased so /crm/report doesn't also light up Pipeline.
export function isNavActive(item: NavItem, path: string): boolean {
  if (item.exact) return path === item.to
  if (item.to === '/crm') return path === '/crm'
  if (item.to === '/rfp') return path === '/rfp'
  return path.startsWith(item.to)
}
