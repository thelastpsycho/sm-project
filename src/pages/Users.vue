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
              >{{ u.role }}</span
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

    <!-- Roles & Permissions: which screens each role can open -->
    <section class="mt-8">
      <div class="mb-3">
        <h2 class="text-lg font-bold text-gray-900 dark:text-white">Roles &amp; Permissions</h2>
        <p class="text-sm text-gray-500 dark:text-gray-400">
          Choose which screens each role can open. Admins always have full access.
        </p>
      </div>

      <div class="grid gap-4 sm:grid-cols-2">
        <div
          v-for="role in editableRoles"
          :key="role"
          class="rounded-2xl border border-gray-100 dark:border-white/10 bg-white dark:bg-sm-card-dark p-4"
        >
          <div class="flex items-center gap-2 mb-3">
            <span
              class="text-[10px] font-semibold px-1.5 py-0.5 rounded-full uppercase"
              :class="roleBadgeClass(role)"
              >{{ role }}</span
            >
            <span class="text-xs text-gray-400">{{ roleHint(role) }}</span>
          </div>

          <ul class="space-y-1">
            <li v-for="perm in ROUTE_PERMISSIONS" :key="perm.key">
              <label
                class="flex items-center gap-2 py-1.5 text-sm"
                :class="perm.locked ? 'text-gray-400 cursor-not-allowed' : 'text-gray-700 dark:text-gray-200 cursor-pointer'"
              >
                <input
                  type="checkbox"
                  class="w-4 h-4 rounded border-gray-300 text-sm-primary focus:ring-sm-primary disabled:opacity-50"
                  :checked="hasPerm(role, perm.key)"
                  :disabled="perm.locked || permissions.saving"
                  @change="togglePerm(role, perm.key, ($event.target as HTMLInputElement).checked)"
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
import { reactive, ref, onMounted } from 'vue'
import {
  PlusIcon,
  PencilSquareIcon,
  NoSymbolIcon,
  ArrowPathIcon
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
import type { User, UserRole } from '@/types/user'

const store = useUsersStore()
const permissions = usePermissionsStore()

const roleOptions = [
  { value: 'sales', label: 'Sales (edit own leads)' },
  { value: 'manager', label: 'Manager (edit all leads)' },
  { value: 'viewer', label: 'Viewer (read-only)' },
  { value: 'admin', label: 'Admin (full access)' }
]

// ---- Roles & Permissions matrix ----
const editableRoles: UserRole[] = ['manager', 'sales', 'viewer']
const permError = ref('')

const roleHints: Record<string, string> = {
  manager: 'can edit all leads',
  sales: 'edits own leads',
  viewer: 'read-only'
}
function roleHint(role: string): string {
  return roleHints[role] ?? ''
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

function roleBadgeClass(role: string): string {
  switch (role) {
    case 'admin':
      return 'bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-300'
    case 'manager':
      return 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300'
    case 'viewer':
      return 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300'
    default:
      return 'bg-gray-100 text-gray-500 dark:bg-white/10 dark:text-gray-400'
  }
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
