<template>
  <div class="min-h-screen bg-white dark:bg-sm-bg-dark">
    <div class="max-w-[1100px] mx-auto lg:mx-0 px-6 lg:px-12 pt-10 lg:pt-9 pb-32">
    <div class="flex items-end justify-between gap-4 mb-6">
      <div>
        <span class="sm-eyebrow">Access</span>
        <h1 class="sm-display text-[30px] mt-2">Team <span class="text-sm-faint font-semibold">/ {{ store.activeUsers.length }} active of {{ store.users.length }}</span></h1>
      </div>
      <SmButton size="sm" @click="openCreate">
        <PlusIcon class="w-4 h-4 mr-1" /> Add user
      </SmButton>
    </div>

    <div v-if="store.loading" class="text-center py-16 text-sm-faint">Loading…</div>

    <div v-else class="border-t border-sm-line dark:border-white/10">
      <div
        v-for="u in store.users"
        :key="u.uid"
        class="flex items-center gap-3 px-1 py-3.5 border-b border-sm-hair dark:border-white/5"
        :class="{ 'opacity-50': u.status === 'disabled' }"
      >
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2">
            <p class="text-[15px] font-bold text-sm-ink dark:text-white truncate">{{ u.name }}</p>
            <span
              v-if="u.role && u.role !== 'sales'"
              class="text-[10px] font-bold uppercase tracking-[0.06em]"
              :class="roleBadgeClass(u.role)"
              >{{ labelFor(u.role) }}</span
            >
            <span
              class="text-[10px] font-bold uppercase tracking-[0.06em]"
              :class="u.status === 'disabled' ? 'text-sm-faint' : 'text-sm-won'"
              >{{ u.status === 'disabled' ? 'Deactivated' : 'Active' }}</span
            >
          </div>
          <p class="text-xs text-sm-muted truncate">
            {{ u.position }} · {{ u.email }}
          </p>
        </div>

        <button
          type="button"
          class="p-2 rounded-full text-sm-muted hover:text-sm-ink dark:hover:text-white hover:bg-sm-surface dark:hover:bg-white/5 transition-colors"
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
              ? 'text-sm-won hover:bg-green-50 dark:hover:bg-green-900/20'
              : 'text-sm-bad hover:bg-red-50 dark:hover:bg-red-900/20'
          "
          :title="u.status === 'disabled' ? 'Reactivate' : 'Deactivate'"
          @click="askToggle(u)"
        >
          <component :is="u.status === 'disabled' ? ArrowPathIcon : NoSymbolIcon" class="w-5 h-5" />
        </button>
      </div>
    </div>

    <p v-if="apiError" class="mt-3 text-xs text-sm-bad">{{ apiError }}</p>

    <!-- Roles & Permissions: the granular per-role access grid -->
    <section class="mt-8">
      <div class="flex items-start justify-between gap-3 mb-3">
        <div>
          <h2 class="sm-display text-[20px]">Roles &amp; Permissions</h2>
          <p class="text-sm text-sm-muted mt-1">
            Tick exactly what each role can do — per feature. Admins always have full access.
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
          class="rounded-2xl border border-sm-line dark:border-white/10 p-4"
        >
          <div class="flex items-center gap-2 mb-3">
            <span
              class="text-[10px] font-bold uppercase tracking-[0.06em]"
              :class="roleBadgeClass(role.id)"
              >{{ role.label }}</span
            >
            <span class="text-xs text-sm-muted">{{ grantedCount(role.id) }} permissions</span>
            <button
              v-if="!role.reserved"
              type="button"
              class="ml-auto p-1.5 rounded-full text-sm-faint hover:text-sm-bad hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
              title="Delete role"
              :disabled="permissions.saving"
              @click="askDeleteRole(role)"
            >
              <TrashIcon class="w-4 h-4" />
            </button>
          </div>

          <!-- One block per feature, its actions as checkboxes -->
          <div v-for="group in PERMISSION_CATALOG" :key="group.resource" class="mb-3 last:mb-0">
            <p class="sm-eyebrow mb-1.5">
              {{ group.label }}
            </p>
            <div class="flex flex-wrap gap-x-4 gap-y-1">
              <label
                v-for="action in group.actions"
                :key="action.key"
                class="flex items-center gap-1.5 text-sm"
                :class="group.locked || group.adminOnly ? 'text-sm-faint cursor-not-allowed' : 'text-sm-ink-soft dark:text-gray-200 cursor-pointer'"
              >
                <input
                  type="checkbox"
                  class="w-4 h-4 rounded border-sm-line text-sm-ink focus:ring-sm-ink disabled:opacity-50"
                  :checked="hasPerm(role.id, permKey(group.resource, action.key))"
                  :disabled="group.locked || group.adminOnly || permissions.saving"
                  @change="togglePerm(role.id, permKey(group.resource, action.key), ($event.target as HTMLInputElement).checked)"
                />
                <span>{{ action.label }}</span>
              </label>
              <span v-if="group.locked" class="text-[10px] text-sm-faint self-center">always on</span>
              <span v-else-if="group.adminOnly" class="text-[10px] text-sm-faint self-center">admin only</span>
            </div>
          </div>
        </div>
      </div>
      <p v-if="permError" class="mt-2 text-xs text-sm-bad">{{ permError }}</p>
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
        <div class="fixed inset-0 bg-sm-ink/30 backdrop-blur-[2px]" @click="roleModalOpen = false"></div>
        <div
          class="relative bg-white dark:bg-sm-card-dark w-full max-w-md rounded-3xl shadow-2xl p-6 animate-fade-in-up"
        >
          <h3 class="text-lg font-extrabold tracking-[-0.01em] text-sm-ink dark:text-white mb-1">New role</h3>
          <p class="text-xs text-sm-muted mb-4">
            Name it — it starts with no access. Tick its permissions on the card afterwards.
          </p>
          <form class="space-y-4" @submit.prevent="onCreateRole">
            <SmInput v-model="roleForm.label" label="Role name" placeholder="e.g. Reservations" required />
            <p v-if="roleFormError" class="text-xs text-sm-bad">{{ roleFormError }}</p>
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
        <div class="fixed inset-0 bg-sm-ink/30 backdrop-blur-[2px]" @click="modalOpen = false"></div>
        <div
          class="relative bg-white dark:bg-sm-card-dark w-full max-w-md rounded-3xl shadow-2xl p-6 animate-fade-in-up"
        >
          <h3 class="text-lg font-extrabold tracking-[-0.01em] text-sm-ink dark:text-white mb-4">
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
            <p v-if="formError" class="text-xs text-sm-bad">{{ formError }}</p>
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
    </div>
  </div>
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
import SmButton from '@/components/ui/SmButton.vue'
import SmInput from '@/components/ui/SmInput.vue'
import SmSelect from '@/components/ui/SmSelect.vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import { useUsersStore } from '@/stores/users'
import { usePermissionsStore } from '@/stores/permissions'
import { adminApi } from '@/lib/adminApi'
import {
  PERMISSION_CATALOG,
  isLockedPermission,
  isAdminOnlyPermission,
  permKey,
  type Permission
} from '@/lib/permissions'
import type { RoleDef } from '@/lib/roles'
import type { User, UserRole } from '@/types/user'

const store = useUsersStore()
const permissions = usePermissionsStore()

// Role picker options, built from the live role registry (built-in + custom).
const roleOptions = computed(() =>
  permissions.roles.map(r => ({ value: r.id, label: r.label }))
)

// ---- Roles & Permissions matrix ----
// Every role except admin is editable (admin always has full access).
const editableRoles = computed(() => permissions.roles.filter(r => r.id !== 'admin'))
const permError = ref('')

// Permission keys that also drive server-side claims — toggling them re-syncs members.
const CLAIM_KEYS: Permission[] = ['pipeline:edit', 'pipeline:delete']

/** Count of granted (non-locked) permissions, for the card summary. */
function grantedCount(role: UserRole): number {
  return (permissions.matrix[role] ?? []).length
}

/** Whether a role currently holds a permission key (honoring locked/admin-only). */
function hasPerm(role: UserRole, key: Permission): boolean {
  if (isLockedPermission(key)) return true
  if (isAdminOnlyPermission(key)) return false
  return (permissions.matrix[role] ?? []).includes(key)
}

async function togglePerm(role: UserRole, key: Permission, checked: boolean) {
  permError.value = ''
  try {
    await permissions.togglePermission(role, key, checked)
    // Edit/delete map to Firebase claims — re-issue them to members so server-side
    // enforcement matches. Best-effort: needs the deployed / `vercel dev` server;
    // the Firestore save above already updates client-side gating regardless.
    if (CLAIM_KEYS.includes(key)) {
      try {
        await adminApi('syncRole', { role })
      } catch {
        permError.value =
          'Saved. Members get the updated edit/delete access on next sign-in (session refresh needs the deployed server).'
      }
    }
  } catch (err: any) {
    permError.value = err?.message ?? 'Could not save permissions.'
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
      return 'text-sm-primary'
    case 'manager':
      return 'text-sm-primary'
    case 'viewer':
      return 'text-sm-warn'
    case 'sales':
      return 'text-sm-muted'
    default:
      // Custom roles get a distinct accent.
      return 'text-sm-wed'
  }
}

// ---- Create custom role ----
const roleModalOpen = ref(false)
const roleSaving = ref(false)
const roleForm = reactive({ label: '' })
const roleFormError = ref('')

function openCreateRole() {
  roleForm.label = ''
  roleFormError.value = ''
  roleModalOpen.value = true
}

async function onCreateRole() {
  roleFormError.value = ''
  roleSaving.value = true
  try {
    await permissions.createRole(roleForm.label)
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
