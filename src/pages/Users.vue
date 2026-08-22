<template>
  <SmPage max-width="lg" with-bottom-nav-padding>
    <div class="flex items-center justify-between mb-4">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Team &amp; Access</h1>
        <p class="text-sm text-gray-500 dark:text-gray-400">
          {{ store.activeUsers.length }} active · {{ store.users.length }} total
        </p>
      </div>
      <SmButton size="sm" @click="openCreate">
        <PlusIcon class="w-4 h-4 mr-1" /> Add user
      </SmButton>
    </div>

    <div v-if="store.loading" class="text-center py-16 text-gray-400">Loading…</div>

    <div
      v-else
      class="rounded-2xl border border-gray-100 dark:border-white/10 overflow-hidden divide-y divide-gray-100 dark:divide-white/10"
    >
      <div
        v-for="u in store.users"
        :key="u.uid"
        class="flex items-center gap-3 px-4 py-3 bg-white dark:bg-sm-card-dark"
        :class="{ 'opacity-50': u.status === 'disabled' }"
      >
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2">
            <p class="text-sm font-medium text-gray-900 dark:text-white truncate">{{ u.name }}</p>
            <span
              v-if="u.role && u.role !== 'sales'"
              class="text-[10px] font-semibold px-1.5 py-0.5 rounded-full uppercase"
              :class="roleBadgeClass(u.role)"
              >{{ labelFor(u.role) }}</span
            >
            <span
              class="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
              :class="
                u.status === 'disabled'
                  ? 'bg-gray-100 text-gray-500 dark:bg-white/10 dark:text-gray-400'
                  : 'bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-300'
              "
              >{{ u.status === 'disabled' ? 'Deactivated' : 'Active' }}</span
            >
          </div>
          <p class="text-xs text-gray-500 dark:text-gray-400 truncate">
            {{ u.position }} · {{ u.email }}
          </p>
        </div>

        <button
          type="button"
          class="p-2 rounded-full text-gray-400 hover:text-sm-primary hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
          title="Edit"
          @click="openEdit(u)"
        >
          <PencilSquareIcon class="w-5 h-5" />
        </button>
        <button
          type="button"
          class="p-2 rounded-full transition-colors"
          :class="
            u.status === 'disabled'
              ? 'text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20'
              : 'text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'
          "
          :title="u.status === 'disabled' ? 'Reactivate' : 'Deactivate'"
          @click="askToggle(u)"
        >
          <component :is="u.status === 'disabled' ? ArrowPathIcon : NoSymbolIcon" class="w-5 h-5" />
        </button>
      </div>
    </div>

    <p v-if="apiError" class="mt-3 text-xs text-red-500">{{ apiError }}</p>

    <!-- Roles & Permissions: which screens & actions each role gets -->
    <section class="mt-8">
      <div class="flex items-start justify-between gap-3 mb-3">
        <div>
          <h2 class="text-lg font-bold text-gray-900 dark:text-white">Roles &amp; Permissions</h2>
          <p class="text-sm text-gray-500 dark:text-gray-400">
            Choose what each role can open and do. Admins always have full access.
          </p>
        </div>
        <SmButton size="sm" variant="ghost" @click="openCreateRole">
          <PlusIcon class="w-4 h-4 mr-1" /> New role
        </SmButton>
      </div>

      <div class="grid gap-4 sm:grid-cols-2">
        <div
          v-for="role in editableRoles"
          :key="role.id"
          class="rounded-2xl border border-gray-100 dark:border-white/10 bg-white dark:bg-sm-card-dark p-4"
        >
          <div class="flex items-center gap-2 mb-3">
            <span
              class="text-[10px] font-semibold px-1.5 py-0.5 rounded-full uppercase"
              :class="roleBadgeClass(role.id)"
              >{{ role.label }}</span
            >
            <span class="text-xs text-gray-400">{{ roleHint(role) }}</span>
            <button
              v-if="!role.reserved"
              type="button"
              class="ml-auto p-1.5 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
              title="Delete role"
              :disabled="permissions.saving"
              @click="askDeleteRole(role)"
            >
              <TrashIcon class="w-4 h-4" />
            </button>
          </div>

          <!-- Action capabilities (edit-all / delete). Fixed for built-in roles. -->
          <p class="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-1">
            Actions
          </p>
          <ul class="space-y-1 mb-3">
            <li v-for="cap in CAPABILITY_DEFS" :key="cap.key">
              <label
                class="flex items-center gap-2 py-1 text-sm"
                :class="role.reserved ? 'text-gray-400 cursor-not-allowed' : 'text-gray-700 dark:text-gray-200 cursor-pointer'"
              >
                <input
                  type="checkbox"
                  class="w-4 h-4 rounded border-gray-300 text-sm-primary focus:ring-sm-primary disabled:opacity-50"
                  :checked="role.capabilities.includes(cap.key)"
                  :disabled="role.reserved || permissions.saving"
                  @change="toggleCap(role, cap.key, ($event.target as HTMLInputElement).checked)"
                />
                <span>{{ cap.label }}</span>
                <span class="text-[10px] text-gray-400">({{ cap.hint }})</span>
              </label>
            </li>
          </ul>

          <!-- Screen (route) access -->
          <p class="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-1">
            Screens
          </p>
          <ul class="space-y-1">
            <li v-for="perm in ROUTE_PERMISSIONS" :key="perm.key">
              <label
                class="flex items-center gap-2 py-1.5 text-sm"
                :class="perm.locked ? 'text-gray-400 cursor-not-allowed' : 'text-gray-700 dark:text-gray-200 cursor-pointer'"
              >
                <input
                  type="checkbox"
                  class="w-4 h-4 rounded border-gray-300 text-sm-primary focus:ring-sm-primary disabled:opacity-50"
                  :checked="hasPerm(role.id, perm.key)"
                  :disabled="perm.locked || permissions.saving"
                  @change="togglePerm(role.id, perm.key, ($event.target as HTMLInputElement).checked)"
                />
                <span>{{ perm.label }}</span>
                <span v-if="perm.locked" class="text-[10px] text-gray-400">
                  ({{ perm.key === 'users' ? 'admin only' : 'always on' }})
                </span>
              </label>
            </li>
          </ul>
        </div>
      </div>
      <p v-if="permError" class="mt-2 text-xs text-red-500">{{ permError }}</p>
    </section>

    <!-- Create custom role modal -->
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div v-if="roleModalOpen" class="fixed inset-0 z-[60] flex items-center justify-center p-4">
        <div class="fixed inset-0 bg-black/50 backdrop-blur-sm" @click="roleModalOpen = false"></div>
        <div
          class="relative bg-white dark:bg-sm-card-dark w-full max-w-md rounded-3xl shadow-2xl p-6 animate-fade-in-up"
        >
          <h3 class="text-lg font-bold text-gray-900 dark:text-white mb-1">New role</h3>
          <p class="text-xs text-gray-500 dark:text-gray-400 mb-4">
            Name it, then pick its actions. It starts with no screen access — tick the
            screens on its card afterwards.
          </p>
          <form class="space-y-4" @submit.prevent="onCreateRole">
            <SmInput v-model="roleForm.label" label="Role name" placeholder="e.g. Reservations" required />
            <div>
              <p class="text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Actions</p>
              <label
                v-for="cap in CAPABILITY_DEFS"
                :key="cap.key"
                class="flex items-center gap-2 py-1 text-sm text-gray-700 dark:text-gray-200 cursor-pointer"
              >
                <input
                  type="checkbox"
                  class="w-4 h-4 rounded border-gray-300 text-sm-primary focus:ring-sm-primary"
                  :checked="roleForm.capabilities.includes(cap.key)"
                  @change="toggleNewRoleCap(cap.key, ($event.target as HTMLInputElement).checked)"
                />
                <span>{{ cap.label }}</span>
                <span class="text-[10px] text-gray-400">({{ cap.hint }})</span>
              </label>
            </div>
            <p v-if="roleFormError" class="text-xs text-red-500">{{ roleFormError }}</p>
            <div class="flex justify-end gap-2 pt-1">
              <SmButton type="button" variant="ghost" @click="roleModalOpen = false">Cancel</SmButton>
              <SmButton type="submit" :loading="roleSaving">Create role</SmButton>
            </div>
          </form>
        </div>
      </div>
    </Transition>

    <!-- Edit / create modal -->
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div v-if="modalOpen" class="fixed inset-0 z-[60] flex items-center justify-center p-4">
        <div class="fixed inset-0 bg-black/50 backdrop-blur-sm" @click="modalOpen = false"></div>
        <div
          class="relative bg-white dark:bg-sm-card-dark w-full max-w-md rounded-3xl shadow-2xl p-6 animate-fade-in-up"
        >
          <h3 class="text-lg font-bold text-gray-900 dark:text-white mb-4">
            {{ editing ? 'Edit user' : 'Add user' }}
          </h3>
          <form class="space-y-3" @submit.prevent="onSave">
            <SmInput v-model="form.name" label="Name" required />
            <SmInput
              v-model="form.email"
              type="email"
              label="Email"
              :disabled="!!editing"
              required
            />
            <SmInput v-model="form.position" label="Position" />
            <SmInput v-model="form.phone" label="Phone" />
            <SmSelect v-model="form.role" label="Role" :options="roleOptions" />
            <SmInput
              v-if="!editing"
              v-model="form.password"
              type="password"
              label="Temporary password"
              placeholder="Min 6 characters"
              required
            />
            <p v-if="formError" class="text-xs text-red-500">{{ formError }}</p>
            <div class="flex justify-end gap-2 pt-2">
              <SmButton type="button" variant="ghost" @click="modalOpen = false">Cancel</SmButton>
              <SmButton type="submit" :loading="saving">{{ editing ? 'Save' : 'Create' }}</SmButton>
            </div>
          </form>
        </div>
      </div>
    </Transition>

    <ConfirmDialog
      :open="confirm.open"
      :title="confirm.title"
      :message="confirm.message"
      :confirm-text="confirm.confirmText"
      :danger="confirm.danger"
      :loading="confirm.loading"
      @confirm="confirm.action"
      @cancel="confirm.open = false"
    />
  </SmPage>
</template>

<script setup lang="ts">
import { reactive, ref, computed, onMounted } from 'vue'
import {
  PlusIcon,
  PencilSquareIcon,
  NoSymbolIcon,
  ArrowPathIcon,
  TrashIcon
} from '@heroicons/vue/24/outline'
import SmPage from '@/components/ui/SmPage.vue'
import SmButton from '@/components/ui/SmButton.vue'
import SmInput from '@/components/ui/SmInput.vue'
import SmSelect from '@/components/ui/SmSelect.vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import { useUsersStore } from '@/stores/users'
import { usePermissionsStore } from '@/stores/permissions'
import { adminApi } from '@/lib/adminApi'
import { ROUTE_PERMISSIONS, type RoutePermission } from '@/lib/permissions'
import { CAPABILITY_DEFS, type RoleDef } from '@/lib/roles'
import type { User, UserRole, Capability } from '@/types/user'

const store = useUsersStore()
const permissions = usePermissionsStore()

// Role picker options, built from the live role registry (built-in + custom).
const roleOptions = computed(() =>
  permissions.roles.map(r => ({ value: r.id, label: roleOptionLabel(r) }))
)
function roleOptionLabel(r: RoleDef): string {
  if (r.id === 'admin') return 'Admin (full access)'
  const caps: string[] = []
  if (r.capabilities.includes('deals:editAll')) caps.push('edit all leads')
  if (r.capabilities.includes('deals:delete')) caps.push('delete leads')
  if (r.id === 'sales') caps.unshift('edit own leads')
  return caps.length ? `${r.label} (${caps.join(', ')})` : r.label
}

// ---- Roles & Permissions matrix ----
// Every role except admin is editable (admin always has full access).
const editableRoles = computed(() => permissions.roles.filter(r => r.id !== 'admin'))
const permError = ref('')

function roleHint(r: RoleDef): string {
  if (r.id === 'sales') return 'edits own leads'
  const caps: string[] = []
  if (r.capabilities.includes('deals:editAll')) caps.push('edit all leads')
  if (r.capabilities.includes('deals:delete')) caps.push('delete leads')
  return caps.length ? `can ${caps.join(' + ')}` : 'view only'
}

/** Whether a role currently has a route permission (honoring locked ones). */
function hasPerm(role: UserRole, key: RoutePermission): boolean {
  if (key === 'home') return true // always on
  if (key === 'users') return false // admin only
  return (permissions.matrix[role] ?? []).includes(key)
}

async function togglePerm(role: UserRole, key: RoutePermission, checked: boolean) {
  permError.value = ''
  const current = permissions.matrix[role] ?? []
  const next = checked ? [...new Set([...current, key])] : current.filter(p => p !== key)
  try {
    await permissions.setRolePermissions(role, next)
  } catch (err: any) {
    permError.value = err?.message ?? 'Could not save permissions.'
  }
}

/** Toggle an action capability on a custom role. */
async function toggleCap(r: RoleDef, cap: Capability, checked: boolean) {
  permError.value = ''
  const next = checked
    ? [...new Set([...r.capabilities, cap])]
    : r.capabilities.filter(c => c !== cap)
  try {
    await permissions.setRoleCapabilities(r.id, next)
    // Re-issue server-side claims to existing members so edit/delete enforcement
    // matches. Best-effort: needs the deployed/`vercel dev` server; the Firestore
    // save above already updates client-side gating regardless.
    try {
      await adminApi('syncRole', { role: r.id })
    } catch {
      permError.value =
        'Saved. Members will get the new actions on their next sign-in (session refresh needs the deployed server).'
    }
  } catch (err: any) {
    permError.value = err?.message ?? 'Could not save capabilities.'
  }
}

/** Reactive role label lookup (custom roles resolve their friendly name). */
function labelFor(id?: string | null): string {
  if (!id) return ''
  return permissions.roles.find(r => r.id === id)?.label ?? id
}

function roleBadgeClass(role: string): string {
  switch (role) {
    case 'admin':
      return 'bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-300'
    case 'manager':
      return 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300'
    case 'viewer':
      return 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300'
    case 'sales':
      return 'bg-gray-100 text-gray-500 dark:bg-white/10 dark:text-gray-400'
    default:
      // Custom roles get a distinct teal badge.
      return 'bg-teal-50 text-teal-600 dark:bg-teal-900/30 dark:text-teal-300'
  }
}

// ---- Create custom role ----
const roleModalOpen = ref(false)
const roleSaving = ref(false)
const roleForm = reactive({ label: '', capabilities: [] as Capability[] })
const roleFormError = ref('')

function openCreateRole() {
  roleForm.label = ''
  roleForm.capabilities = []
  roleFormError.value = ''
  roleModalOpen.value = true
}

function toggleNewRoleCap(cap: Capability, checked: boolean) {
  roleForm.capabilities = checked
    ? [...new Set([...roleForm.capabilities, cap])]
    : roleForm.capabilities.filter(c => c !== cap)
}

async function onCreateRole() {
  roleFormError.value = ''
  roleSaving.value = true
  try {
    await permissions.createRole(roleForm.label, roleForm.capabilities)
    roleModalOpen.value = false
  } catch (err: any) {
    roleFormError.value = err?.message ?? 'Could not create role.'
  } finally {
    roleSaving.value = false
  }
}

function askDeleteRole(r: RoleDef) {
  const inUse = store.users.filter(u => (u.role ?? 'sales') === r.id).length
  confirm.title = `Delete “${r.label}” role?`
  confirm.message = inUse
    ? `${inUse} user${inUse > 1 ? 's are' : ' is'} assigned this role. They will lose all access (except Home) until reassigned. This can't be undone.`
    : `This removes the role and its permissions. This can't be undone.`
  confirm.confirmText = 'Delete role'
  confirm.danger = true
  confirm.action = async () => {
    confirm.loading = true
    permError.value = ''
    try {
      await permissions.deleteRole(r.id)
      confirm.open = false
    } catch (err: any) {
      permError.value = err?.message ?? 'Could not delete role.'
    } finally {
      confirm.loading = false
    }
  }
  confirm.open = true
}

const modalOpen = ref(false)
const editing = ref<User | null>(null)
const saving = ref(false)
const formError = ref('')
const apiError = ref('')

const form = reactive({
  name: '',
  email: '',
  position: '',
  phone: '',
  role: 'sales' as UserRole,
  password: ''
})

function openCreate() {
  editing.value = null
  Object.assign(form, { name: '', email: '', position: '', phone: '', role: 'sales', password: '' })
  formError.value = ''
  modalOpen.value = true
}

function openEdit(u: User) {
  editing.value = u
  Object.assign(form, {
    name: u.name,
    email: u.email,
    position: u.position,
    phone: u.phone,
    role: (u.role ?? 'sales') as UserRole,
    password: ''
  })
  formError.value = ''
  modalOpen.value = true
}

async function onSave() {
  formError.value = ''
  saving.value = true
  try {
    if (editing.value?.uid) {
      // Metadata (name/position/phone) writes directly to Firestore (admin-allowed);
      // a role change also needs the custom claim, so route it through the admin API.
      await store.updateUserMeta(editing.value.uid, {
        name: form.name,
        position: form.position,
        phone: form.phone
      })
      if (form.role !== (editing.value.role ?? 'sales')) {
        await adminApi('setRole', { uid: editing.value.uid, role: form.role })
      }
    } else {
      await adminApi('create', {
        name: form.name,
        email: form.email,
        position: form.position,
        phone: form.phone,
        role: form.role,
        password: form.password
      })
    }
    await store.loadUsers(true)
    modalOpen.value = false
  } catch (err: any) {
    formError.value = err?.message ?? 'Could not save user.'
  } finally {
    saving.value = false
  }
}

const confirm = reactive({
  open: false,
  title: '',
  message: '',
  confirmText: 'Confirm',
  danger: false,
  loading: false,
  action: async () => {}
})

function askToggle(u: User) {
  if (!u.uid) return
  const disabling = u.status !== 'disabled'
  confirm.title = disabling ? `Deactivate ${u.name}?` : `Reactivate ${u.name}?`
  confirm.message = disabling
    ? 'They will be signed out and unable to log in. Their leads and history are kept.'
    : 'They will be able to sign in again.'
  confirm.confirmText = disabling ? 'Deactivate' : 'Reactivate'
  confirm.danger = disabling
  confirm.action = async () => {
    confirm.loading = true
    apiError.value = ''
    try {
      await adminApi('setStatus', { uid: u.uid, status: disabling ? 'disabled' : 'active' })
      await store.loadUsers(true)
      confirm.open = false
    } catch (err: any) {
      apiError.value = err?.message ?? 'Could not update status.'
    } finally {
      confirm.loading = false
    }
  }
  confirm.open = true
}

onMounted(() => {
  store.loadUsers()
  permissions.load()
})
</script>
