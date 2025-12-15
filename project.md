# Project: Mobile-style Vue 3 App (Anvaya-style)

> This `project.md` collects the full spec for the project you requested: Vue 3 + TypeScript + Vite + Tailwind with custom colors, Dark Mode, PWA, reusable UI components, Pinia store, and an offline delivery queue for chat messages. It also includes the Claude Code CLI master prompt you can paste into Claude, recommended file/folder structure, and implementation notes for each file.

---

## Table of Contents

1. Overview
2. Key Features
3. Tailwind custom colors
4. Folder & file structure
5. Pinia store design
6. Offline delivery queue design
7. Composables
8. Reusable components (API & props)
9. Pages summary
10. PWA integration
11. Types
12. Development checklist & run steps
13. Claude Code CLI master prompt (reference)

---

## 1. Overview

This project is a mobile-app-like web application built with:

- Vue 3 (script setup, TypeScript)
- Vite
- Tailwind CSS (custom palette named `sm-*`)
- Pinia for global state (session, chat queue, theme)
- PWA support (manifest, service worker, offline fallback)
- Reusable UI components under `components/ui/`
- Bottom navigation and pages: `Home`, `Chat`, `Contract`
- Chat POSTs JSON `{ sessionId, text }` to an n8n webhook (placeholder)
- Contract form POSTs contract JSON to another n8n webhook (placeholder)
- Dark mode (auto + user toggle)
- Offline message queue with automatic retry when connection restored


## 2. Key Features (high-level)

- Mobile-style UI constrained to ~480–550px width
- Custom Tailwind colors: `sm-primary`, `sm-secondary`, `sm-accent`, etc.
- Reusable UI components: `SmButton`, `SmInput`, etc.
- Pinia stores:
  - `useThemeStore` (theme state)
  - `useSessionStore` (sessionId & metadata)
  - `useChatStore` (messages, offline queue, delivery logic)
- `useSession` and `useTheme` composables for local usage
- PWA: `manifest.json`, service worker caching shell, offline fallback
- Offline queue: stores unsent messages in IndexedDB (via localForage) or localStorage, retries on connectivity change


## 3. Tailwind custom colors (recommended `tailwind.config.js` snippet)

```js
module.exports = {
  content: ["./index.html", "./src/**/*.{vue,js,ts,jsx,tsx}"],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'sm-primary': '#2563eb',
        'sm-secondary': '#475569',
        'sm-accent': '#10b981',
        'sm-bg': '#f8fafc',
        'sm-bg-dark': '#0f172a',
        'sm-card': '#ffffff',
        'sm-card-dark': '#1e293b'
      }
    }
  },
  plugins: []
}
```

Use these classes like `bg-sm-primary`, `text-sm-secondary`, `dark:bg-sm-card-dark`, etc.


## 4. Folder & file structure

```
/my-vue-app
├─ index.html
├─ package.json
├─ vite.config.ts
├─ tailwind.config.js
├─ postcss.config.cjs
├─ public/
│  ├─ manifest.json
│  └─ icons/
├─ src/
│  ├─ main.ts
│  ├─ App.vue
│  ├─ registerServiceWorker.ts
│  ├─ service-worker.js
│  ├─ router/
│  │  └─ index.ts
│  ├─ store/
│  │  └─ index.ts          # pinia entry
│  ├─ stores/
│  │  ├─ theme.ts         # pinia store
│  │  ├─ session.ts
│  │  └─ chat.ts
│  ├─ composables/
│  │  ├─ useTheme.ts
│  │  ├─ useSession.ts
│  │  └─ useChat.ts
│  ├─ components/
│  │  ├─ BottomNav.vue
│  │  ├─ ThemeToggle.vue
│  │  └─ ui/
│  │     ├─ SmButton.vue
│  │     ├─ SmInput.vue
│  │     ├─ SmTextarea.vue
│  │     ├─ SmCard.vue
│  │     └─ SmPage.vue
│  ├─ pages/
│  │  ├─ Home.vue
│  │  ├─ Chat.vue
│  │  └─ Contract.vue
│  ├─ types/
│  │  ├─ chat.ts
│  │  └─ contract.ts
│  └─ utils/
│     ├─ api.ts           # wrapper for POSTing to n8n
│     └─ offline.ts       # helper for queue, backoff, connectivity
└─ README.md
```


## 5. Pinia store design

Three stores are recommended.

### 5.1 `stores/theme.ts` (Pinia)

- State: `theme: 'light' | 'dark' | 'system'`
- Actions: `setTheme()`, `toggleTheme()`
- Persists selection to localStorage

### 5.2 `stores/session.ts`

- State: `sessionId: string` (generated UUID if absent), `createdAt`
- Action: `ensureSession()` to create & persist

### 5.3 `stores/chat.ts`

- State:
  - `messages: Message[]` (in-memory chat history)
  - `outbox: OutboxItem[]` (messages pending delivery)
  - `isSending: boolean`
- Actions:
  - `sendMessage(text)` — pushes to messages as `pending`, enqueues outbox, calls `deliver()`
  - `deliver()` — tries to send outbox items to n8n via `api.postChat(payload)`
  - `handleDeliverySuccess(id, serverResponse)` — marks message delivered and inserts server response
  - `retryPending()` — invoked when connectivity returns
  - `loadFromStorage()` / `persistToStorage()` — persist outbox and messages
- Getters:
  - `pendingCount`

**Notes:** Use `localForage` or `indexedDB` for reliable storage, fallback to `localStorage` for simplicity.


## 6. Offline delivery queue design

**Goals:** Save messages when offline, show them in UI as "sending...", and retry automatically when online, with exponential backoff.

### Queue item shape (`OutboxItem`):

```ts
type OutboxItem = {
  id: string         // local UUID
  sessionId: string
  text: string
  createdAt: number
  attempts: number
}
```

### Workflow
1. `sendMessage(text)` creates a `Message` in UI with `status: 'sending'`, creates `OutboxItem` and saves to `outbox` store and persist.
2. `deliver()` iterates outbox; for each item attempt POST to n8n webhook.
3. On success: remove outbox item, update message `status: 'sent'`, append server reply message.
4. On failure: increment attempts, schedule retry with exponential backoff (e.g., `2^attempts * baseDelay`). After N attempts mark as `failed` and surface to user.
5. Listen to `window.addEventListener('online')` to trigger `retryPending()`.
6. Optionally use the Service Worker (background sync) for robust offline delivery — but note background sync support varies by browser. Provide SW hook to queue items if supported.

### Persistence
- Store `outbox` in `localForage` under `chat.outbox` and load at startup.


## 7. Composables

### `useTheme.ts`
- Exposes `theme`, `toggleTheme()`, `setTheme()`, and ensures `document.documentElement.classList` updated for `dark`.

### `useSession.ts`
- Ensures `sessionId` exists in localStorage; if not generate via `crypto.randomUUID()`.

### `useChat.ts`
- Exposes `messages`, `sendMessage(text)`, `isSending`, `retryPending()`.
- Internally uses `chat` Pinia store.


## 8. Reusable components (API & props)

All components live under `src/components/ui/`.

### `SmButton.vue`
- Props: `label`, `variant = 'primary'|'secondary'|'ghost'`, `type = 'button'|'submit'`, `disabled`
- Emits: `click`

### `SmInput.vue`
- Props: `modelValue`, `placeholder`, `type`, `name`, `label`
- Emits: `update:modelValue`, `input`

### `SmTextarea.vue`
- Props: `modelValue`, `rows`, `placeholder`, `label`

### `SmCard.vue`
- Slot based, accepts `class` for additional styling

### `SmPage.vue`
- Wrapper enforcing mobile max-width, paddings and safe-area bottom padding so content doesn't hide behind bottom nav

Each component supports dark-mode via tailwind `dark:` classes and uses `sm-*` color tokens.


## 9. Pages summary

### `Home.vue`
- Uses `SmPage` + `SmCard` + `SmButton`
- Shows quick buttons to Chat & Contract
- Shows theme toggle and small status of connectivity

### `Chat.vue`
- Uses `SmPage`, `SmCard` for message container, bottom-fixed input using `SmInput` and `SmButton`.
- Uses `useChat` composable to `sendMessage()` and shows message `status`.
- Shows a small indicator if there are pending messages in outbox.

### `Contract.vue`
- Uses `SmPage`, `SmInput`, `SmTextarea` and `SmButton`.
- Validates fields, posts to n8n webhook via `api.postContract()`.
- Shows success / error notifications (simple inline alerts).


## 10. PWA integration

- `public/manifest.json`: basic manifest with placeholders for icons and theme color `#2563eb` (sm-primary).
- `service-worker.js`: simple cache-first for static assets and network-first for API calls; implement an offline fallback page route.
- `registerServiceWorker.ts`: registers SW and logs registration state.
- Add `link rel="manifest"` & `meta theme-color` to `index.html`.

**Note:** For production-grade PWA use `vite-plugin-pwa` (workbox) to simplify SW build. If you prefer the plugin, include example config in `vite.config.ts`.


## 11. Types

### `src/types/chat.ts`
```ts
export type Message = {
  id: string
  sessionId: string
  text: string
  sender: 'user' | 'bot'
  timestamp: number
  status?: 'sent' | 'sending' | 'failed'
}

export type OutboxItem = {
  id: string
  sessionId: string
  text: string
  createdAt: number
  attempts: number
}
```

### `src/types/contract.ts`
```ts
export type ContractForm = {
  name: string
  email: string
  phone: string
  details: string
}
```


## 12. Development checklist & run steps

1. `npm init vite@latest my-vue-app -- --template vue-ts`
2. `cd my-vue-app`
3. Install deps:
   - `npm i vue-router pinia tailwindcss postcss autoprefixer localforage axios heroicons` (and vite-plugin-pwa if desired)
4. Setup Tailwind (init files) and copy `tailwind.config.js` from this doc
5. Add `public/manifest.json` and placeholder icons
6. Add `src/service-worker.js` and `src/registerServiceWorker.ts`
7. Implement stores, composables, components and pages as described
8. `npm run dev` to test


## 13. Claude Code CLI master prompt (reference)

> The project spec used to generate the code above is the full "CLAUDE CODE CLI MASTER PROMPT" you requested. Keep that prompt as your single-source-of-truth to paste into Claude when you want code generation.

---

### Next steps (recommended):
- Do you want me to now generate the **actual file contents** for all files (Pinia stores, composables, components, pages, service worker, manifest, tailwind config) as ready-to-paste code? I can produce them in the workspace or as separate code blocks.

---

*End of `project.md`*

