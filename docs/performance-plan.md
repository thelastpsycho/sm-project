# First-Load Performance Plan

**Goal:** make the first load (cold cache / fresh deploy) noticeably faster **without changing any app functionality or behavior.** Every change below is a delivery/loading optimization — same features, same data, same UI.

---

## Baseline (measured with Chrome DevTools)

Traced `https://sm.anvayabali.com/` while signed in.

| Metric | Warm cache | Cold cache, Slow 4G + 4× CPU |
|---|---|---|
| TTFB (Vercel) | 41–127 ms | 42 ms |
| Main JS download | cached (304) | **2,728 ms** |
| First Contentful Paint | ~0.9–1.2 s | **~4,120 ms** |
| DOMContentLoaded | ~190 ms | 3,476 ms |

**Key facts**
- Server/hosting is fine (TTFB ~40 ms, Vercel cache HIT). The cost is 100% client-side.
- Main bundle `assets/index-*.js` = **1.14 MB uncompressed / 363 KB gzipped**, shipped as **one monolithic file with no code-splitting**. Nothing renders until it downloads + parses + executes.
- CSS = 77 KB uncompressed / 12.7 KB gzipped (also one file).
- Firestore realtime `Listen/channel` handshakes (~600 ms each, several) fire on **every** page — including Home — because the whole `deals` collection is subscribed at boot.
- No `limit()` on any Firestore query — every query pulls the entire collection.
- The HTML spinner stays up until the `window.load` event (waits for all resources) rather than first mount.

---

## Root causes → fixes (priority order)

### 1. Monolithic JS bundle — biggest win

**Cause:** `src/router/index.ts` statically imports every page (`import Home from ...`, `import CRM from ...`, all 14). Vite bundles all of them + the full Firebase SDK + every dependency into one paint-blocking chunk. Loading Home downloads the code for Chat, RFP, CRM, Survey, Contract, etc.

**Fix — lazy-load routes (no behavior change; routes resolve identically):**

In `src/router/index.ts`, replace the static page imports with dynamic imports in each route's `component`:

```ts
// remove: import CRM from '@/pages/CRM.vue'  (and the other page imports)

routes: [
  { path: '/', name: 'home', component: () => import('@/pages/Home.vue') },
  { path: '/crm', name: 'crm', component: () => import('@/pages/CRM.vue'),
    meta: { requiresPermission: 'pipeline:view' } },
  // ...same pattern for every route
]
```

Keep `Home` (and `Login`) eager if you prefer instant first paint on the landing route — everything else should be lazy. Vite auto-splits each dynamic import into its own chunk, fetched only when that route is visited.

**Expected effect:** initial chunk drops from ~1.14 MB to a fraction of it; FCP on cold 4G roughly halves or better.

---

### 2. Split heavy vendor libs into cacheable chunks

**Cause:** Firebase SDK, Vue, and other vendor code live in the same chunk as app code, so any app change on the next deploy busts the whole file's cache.

**Fix — `manualChunks` in `vite.config.ts` (pure build config, no runtime change):**

```ts
export default defineConfig({
  plugins: [vue(), vueDevTools()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  server: { host: true },
  build: {
    target: 'es2020',            // see item 6
    rollupOptions: {
      output: {
        manualChunks: {
          firebase: ['firebase/app', 'firebase/firestore', 'firebase/auth'],
          vue: ['vue', 'vue-router', 'pinia'],
        },
      },
    },
  },
})
```

**Effect:** Firebase/Vue chunks stay cached across deploys (returning users re-download only changed app code). Also parallelizes downloads.

> Consider adding `rollup-plugin-visualizer` temporarily to confirm what's fat in the bundle before/after.

---

### 3. Don't stream the whole `deals` collection on Home

**Cause:** `src/App.vue` (lines ~29–37) subscribes app-wide the moment you authenticate:

```ts
watch(() => session.isAuthenticated, isAuth => {
  if (isAuth) { crm.subscribe(); permissions.load() }
  ...
}, { immediate: true })
```

`crm.subscribe()` (`src/stores/crm.ts:87`) opens `onSnapshot(query(collection(deals), orderBy('updatedAt','desc')))` — the **entire** deals collection — on every page, only to power the notification-bell badge. This is the cluster of ~600 ms Firestore channel handshakes seen on Home.

**Fix options (pick one; both preserve current behavior):**

- **(a) Scope the boot subscription to what the badge needs.** The bell only needs recent/unread activity, not all deals. Add a narrower query (e.g. `orderBy('updatedAt','desc')`, `limit(N)`, or a filter on unread) used solely for the badge, and let `/crm` and `/crm/report` keep their own full `subscribe()` (they already call it at `CRM.vue:790` and `PipelineReport.vue:542`).
- **(b) Lazy-subscribe.** Only call `crm.subscribe()` on routes that render deals. The badge count can come from a lightweight aggregate/`limit()` query instead of the full stream.

**Effect:** removes a full-collection realtime download from the critical path of Home and every non-CRM page.

---

### 4. Add `limit()` + pagination to all list queries

**Cause:** no query is bounded. First load scales linearly with collection size:
- `src/stores/crm.ts` — deals (live), comments
- `src/stores/functionChart.ts` — functions
- `src/stores/users.ts` — users
- `src/stores/survey.ts` — events, responses

**Fix:** add `limit(N)` and "load more" pagination (`startAfter`) to list views. UI shows the same records, just fetched in pages. This is future-proofing — cheap now, prevents slow-load creep as data grows.

---

### 5. Enable Firestore offline persistence (instant returning-user paint)

**Cause:** every load re-fetches from the network before data shows.

**Fix:** initialize Firestore with local cache in `src/lib/firebase.ts`:

```ts
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore'

db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
})
```

**Effect:** returning users paint cached deals/functions immediately, then live-update. No behavior change — same data, served from cache first.

---

### 6. Drop legacy-JS polyfills

**Cause:** trace flagged ~18.9 KB of transpiled polyfills for features modern browsers already support. `tsconfig`/Vite build target isn't pinned modern.

**Fix:** set `build.target: 'es2020'` (item 2) and `"target": "ES2020"` in `tsconfig.app.json`. App is a PWA on modern mobile browsers — no old-browser support to lose.

---

### 7. Reveal the app on mount, not on `window.load`

**Cause:** `index.html` keeps `#app` at `display:none` and only reveals it in `main.ts` on the `window` `load` event, which waits for **all** subresources (fonts, images, manifest).

**Fix:** reveal on Vue mount instead:

```ts
// main.ts, after app.mount('#app')
app.mount('#app')
document.getElementById('loading')?.remove()
document.getElementById('app')!.style.removeProperty('display')
```

**Effect:** UI appears as soon as it's interactive rather than after every asset finishes. Same UI.

---

### 8. Stop fonts from blocking render

**Cause:** `index.html` loads Google Fonts as a render-blocking `<link rel="stylesheet">` in `<head>`.

**Fix (no visual change with a good fallback):** the URL already has `&display=swap`. Make the stylesheet non-blocking:

```html
<link rel="stylesheet"
      href="https://fonts.googleapis.com/css2?family=Nunito+Sans:...&display=swap"
      media="print" onload="this.media='all'">
```

Or self-host the WOFF2 and `preload` it. Keeps the same font; removes it from the critical path.

---

## Suggested execution order

| Step | Change | Effort | Impact | Risk |
|---|---|---|---|---|
| 1 | Lazy-load routes (`src/router/index.ts`) | S | **High** | Low |
| 2 | `manualChunks` + build target (`vite.config.ts`) | S | Med–High | Low |
| 3 | Scope/lazy the boot `deals` subscription | M | Med–High | Low–Med |
| 4 | Reveal app on mount (`main.ts` + `index.html`) | S | Med | Low |
| 5 | Non-blocking fonts (`index.html`) | S | Low–Med | Low |
| 6 | Firestore offline persistence | S | Med (repeat visits) | Low |
| 7 | `limit()` + pagination on list queries | M | Future-proof | Low–Med |
| 8 | Modern build target / drop polyfills | S | Low | Low |

Steps 1–2 alone should resolve most of the "blank screen on first load." Step 3 addresses the "my data is slow to appear / lots of network chatter" half.

## How to verify after each step

1. `npm run build` and check the emitted chunk sizes (initial JS should shrink).
2. In Chrome DevTools: hard-reload with **Disable cache** on, throttle to **Slow 4G + 4× CPU**, and re-run a performance trace.
3. Compare **FCP** and **main-chunk download time** against the baseline table above.
4. Smoke-test every route + the notification bell to confirm identical behavior.

---

*None of these change what the app does — only how fast it delivers and boots. Functionality, data, and UI stay identical.*
