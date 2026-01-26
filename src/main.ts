import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import { createHead } from '@vueuse/head'

import App from './App.vue'

import './assets/base.css'

const head = createHead()

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(head)

app.mount('#app')

// Hide loading spinner and show app
window.addEventListener('load', () => {
  const loading = document.getElementById('loading')
  const appElement = document.getElementById('app')

  if (loading && appElement) {
    loading.style.display = 'none'
    appElement.style.display = 'block'
  }
})
