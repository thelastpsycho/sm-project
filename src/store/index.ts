import { createPinia } from 'pinia'

const pinia = createPinia()

export default pinia

export { useThemeStore } from '@/stores/theme'
export { useSessionStore } from '@/stores/session'
export { useChatStore } from '@/stores/chat'