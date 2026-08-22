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

// Register the FCM service worker (production only) so background push works and the
// app is installable. It has no fetch handler, so it does not cache the app shell.
if (import.meta.env.PROD) {
  registerPushSw()
}

// Hide loading spinner and show app
window.addEventListener('load', () => {
  const loading = document.getElementById('loading')
  const appElement = document.getElementById('app')

  if (loading && appElement) {
    loading.style.display = 'none'
    appElement.style.display = 'block'
  }
})
