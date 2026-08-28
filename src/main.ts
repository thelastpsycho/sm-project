import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import { createHead } from '@vueuse/head'

import App from './App.vue'
import { registerPushSw } from './lib/push'

import './assets/base.css'

const head = createHead()

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(head)

app.mount('#app')

// Reveal the app as soon as Vue has mounted (interactive) rather than waiting for
// the window 'load' event (which blocks on fonts/images/manifest). Same visual
// outcome — spinner removed, #app shown — just earlier.
document.getElementById('loading')?.remove()
document.getElementById('app')?.style.removeProperty('display')

// Register the FCM service worker (production only) so background push works and the
// app is installable. It has no fetch handler, so it does not cache the app shell.
if (import.meta.env.PROD) {
  registerPushSw()
}
