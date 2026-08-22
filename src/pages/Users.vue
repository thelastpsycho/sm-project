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
              v-if="u.role === 'admin'"
              class="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-300"
              >ADMIN</span
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
import { adminApi } from '@/lib/adminApi'
import type { User, UserRole } from '@/types/user'

const store = useUsersStore()

const roleOptions = [
  { value: 'sales', label: 'Sales' },
  { value: 'admin', label: 'Admin' }
]

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

onMounted(() => store.loadUsers())
</script>
