# Plan: Firebase Auth (email/password) + per-user pipeline notifications

## Context
Two problems to solve together:

1. **PIN login is impractical.** Auth today is a 4-digit PIN matched against static
   `src/user.json` in `src/stores/session.ts`, with the "logged-in" flag kept in
   `localStorage`. Adding/removing users means editing a JSON file and redeploying,
   and `firestore.rules` are wide open (`allow read, write: if true`) — so the CRM
   edit/delete privileges we added are **client-side only** (documented in `auth.md`).
2. **No notifications.** The team wants to be nudged about aging leads: untouched 7+
   days, stuck in a stage/status too long without reaching Confirmed, action-due /
   overdue, and arrival-date-near-but-not-Confirmed.

Switching to **Firebase Authentication (email/password)** gives every user a real
identity (email — which is already how `ownerId` works, so deals need no re-keying),
lets us **server-enforce** the CRM privileges in `firestore.rules`, and provides the
per-user identity + device token that **web push** notifications require. We'll deliver
both **an in-app notification inbox** (works immediately, no backend) and **web push**
(a daily Vercel Cron job), plus the alert types above.

Confirmed decisions: email+password auth · in-app inbox **and** web push · all four
alert triggers · build both in one plan.

Deploy target is **Vercel** (`vercel.json`, static SPA today — no `api/` functions
yet). There is a basic cache `service-worker.js` that isn't even registered, and a
`public/manifest.json` that `index.html` doesn't link. FCM `messagingSenderId` is
already configured.

---

## Part A — Firebase Auth (email/password) + user management

### A1. Firebase wiring — `src/lib/firebase.ts`
Export `auth = getAuth(app)`. (Add `firebase/auth` imports.)

### A2. `users` Firestore collection (source of truth for user management)
Doc id = auth `uid`, fields `{ email, name, position, phone, role: 'admin' | 'sales', status: 'active' | 'disabled', fcmTokens?: string[], notificationsSeenAt?: Timestamp }`. Replaces the "manage users by editing user.json" pain. `src/user.json` is kept only as the **migration seed** and offline owner-name fallback.
- New `src/stores/users.ts` — `loadUsers()` (all users, for the owner picker + admin screen), keyed by email + uid. Helper `activeUsers` filters `status === 'active'`.
- **Admin flag via custom claim** (`admin: true`) set by the migration/admin endpoint — used by `firestore.rules` (rules can read a claim cheaply; reading another collection per-write is costly).
- **Active / deactivated status.** Every user has `status` (default `'active'` on creation/migration). Deactivating a user is the way to off-board someone **without deleting their leads or comment history** — their name stays on existing deals, but they can no longer sign in or receive notifications. This is enforced in two places:
  - the **auth account** is disabled via the Admin SDK (`admin.auth().updateUser(uid, { disabled: true })`) so Firebase itself refuses the sign-in, **and**
  - the `users/{uid}.status` field mirrors it so the app/UI, owner picker, and cron can see and act on it without an extra Admin lookup.

### A3. Session store — `src/stores/session.ts` (rewrite core)
- `login(email, password)` → `signInWithEmailAndPassword`; `logout()` → `signOut`.
- `onAuthStateChanged` hydrates `currentUser` from `auth.currentUser` + the `users/{uid}` doc (name/position/phone/**role**/**status**). Expose an `authReady` promise/ref so the router waits before deciding redirects (avoids login flicker on refresh).
- **Reject deactivated users:** if the hydrated `users/{uid}.status === 'disabled'` (belt-and-suspenders alongside the disabled auth account), immediately `signOut` and surface "This account has been deactivated." The disabled auth account already blocks the sign-in itself; this covers a user who was deactivated mid-session.
- Add `sendPasswordReset(email)` wrapper.
- Keep `currentUser.email` as the identity used everywhere (owner matching unchanged).

### A4. Login page — `src/pages/Login.vue`
Replace the PIN keypad with an email + password form (reuse `SmInput`/`SmButton`, keep the existing card shell, dark mode, and shake-on-error). Add a "Forgot password?" link → `sendPasswordReset`. On success → `router.push('/')`.

### A5. Router guard — `src/router/index.ts`
`beforeEach` awaits `session.authReady`, then gates non-`/survey/` routes on `session.isAuthenticated` (now derived from Firebase auth state) instead of the localStorage PIN flag. Survey/chat guest routes stay public.

### A6. Privilege helpers — `src/lib/crmUtils.ts`
`isAdmin` / `canEditDeal` / `canDeleteDeals` currently key off a hardcoded
`ADMIN_EMAILS` list. Change them to read `role === 'admin'` from the passed user
(keep the email allow-list as a fallback during migration). Edit/claim/delete logic is
otherwise unchanged (owner-or-admin edit; unassigned = anyone; delete = admin).

### A7. Server-enforced rules — `firestore.rules`
Lock down `deals` now that `request.auth` exists (mirrors the client rules, closing the
`auth.md` gap):
```
match /deals/{id} {
  allow read:   if request.auth != null;
  allow create: if request.auth != null;
  allow update: if request.auth != null && (
                   request.auth.token.admin == true
                   || resource.data.ownerId == ''
                   || resource.data.ownerId == request.auth.token.email);
  allow delete: if request.auth != null && request.auth.token.admin == true;
  match /comments/{c} {
    allow read, create: if request.auth != null;                 // everyone can comment
    allow update, delete: if request.auth != null &&
      (request.auth.token.admin == true ||
       resource.data.authorId == request.auth.token.email);
  }
}
match /users/{uid} {
  allow read:  if request.auth != null;
  allow update: if request.auth.uid == uid;         // self: fcmTokens / notificationsSeenAt
  allow create, delete: if request.auth.token.admin == true;
}
```
Survey/chat collections stay as-is (public, PIN-less guest flows).

### A8. In-app user management (admin screen)
New `src/pages/Users.vue` (admin-only route + nav item) listing `users` with an
**Active / Deactivated** status badge, letting an admin edit role/position/phone and
**toggle active status** (with a `ConfirmDialog`), plus create via the admin API.
Deactivate/reactivate calls `api/admin/users` which flips both the auth account's
`disabled` flag and the `users/{uid}.status` field together. MVP fallback: accounts can
be created in the Firebase Console; this screen manages metadata/roles/status. Full
in-app create/disable uses `api/admin/users` (see Backend). Deactivated users are shown
greyed and excluded from the deal owner picker's assignable list (existing owners still
render by name).

---

## Part B — Notifications

### B1. Data-model additions — `src/types/crm.ts` + `src/stores/crm.ts`
Add `stageEnteredAt?: string` and `statusEnteredAt?: string` (ISO) to `Deal` — needed
for "stuck in stage/status." Set them:
- `createDeal` → both = now.
- `moveStatus` / `moveStage` → the changed one = now.
- `updateDeal` → when the patch changes status/stage vs. the current deal, stamp the
  corresponding `*EnteredAt`.
- `mapDoc` converts the timestamps like it does `createdAt`/`updatedAt`.
Legacy deals: `scripts/backfillEnteredAt.mjs` sets missing values to `updatedAt ?? createdAt`; the alert engine also treats missing as `createdAt` defensively.

### B2. Shared alert engine — `src/lib/crmAlerts.ts` (framework-agnostic)
Pure functions, importable by **both** the Vite app and the Vercel function:
- `AlertType = 'untouched' | 'stuck' | 'action-due' | 'arrival-risk'`.
- `interface Alert { id; type; severity; dealId; company; message; since }` (stable `id = ${dealId}:${type}`).
- `computeDealAlerts(deal, cfg, now)` implements the four rules; reuses `isOverdue` from `crmUtils`. "Stuck" excludes Won/Lost/Confirmed. "arrival-risk" = arrival within N days and stage ≠ Confirmed.
- `computeUserAlerts(deals, userEmail, cfg, now)` → alerts for that user's owned deals.
- `cfg` thresholds (untouchedDays=7, per-stage SLA days, arrivalWithinDays=14) as constants with an optional `settings/crmAlerts` Firestore override.

### B3. In-app inbox (bell) — no backend
- `src/stores/notifications.ts`: `myAlerts` (from `crm.deals` + session user via `computeUserAlerts`), `unreadCount`, `markAllRead()` (writes `users/{uid}.notificationsSeenAt`, also cached in localStorage). Unread = alerts with `since > notificationsSeenAt`.
- `src/components/NotificationPanel.vue`: slide-over list grouped by type; each row → navigate `/crm?deal=<id>`.
- **Bell button with unread badge** added next to the `BottomNav.vue` FAB. Load deals app-wide after auth (call `crm.loadDeals()` from `App.vue` on `authReady`) so the badge is live everywhere.
- `CRM.vue`: on mount, if `?deal=<id>` present, open that deal's modal.

### B4. Web push (FCM)
- `src/lib/push.ts`: `enablePush()` → `getMessaging`, request permission, `getToken({ vapidKey: VITE_FIREBASE_VAPID_KEY })`, save via `arrayUnion` to `users/{uid}.fcmTokens`; `onMessage` (foreground) → in-app toast + refresh inbox.
- `public/firebase-messaging-sw.js`: FCM background handler (`onBackgroundMessage` → `showNotification`).
- Registration/PWA: register the service worker in `main.ts` (currently never called) and **link `manifest.json` in `index.html`** so the app is installable — required for **iOS web push** (iOS 16.4+, installed to home screen). A "Enable notifications" toggle on `Users.vue`/a settings area or a one-time post-login prompt (not auto-nagging).
- Caveat to surface: iOS only delivers web push to the **installed** PWA.

### B5. Backend — Vercel serverless + Cron (new `api/` dir)
- `api/cron/notify.ts` (Node, `firebase-admin` from `FIREBASE_SERVICE_ACCOUNT` env):
  reads all deals + **active** users (skips `status === 'disabled'`), runs
  `computeUserAlerts` per user, sends FCM `sendEachForMulticast` to each user's
  `fcmTokens` (pruning invalid tokens), and optionally writes `users/{uid}/notifications`
  history docs. Guarded by `CRON_SECRET` (`authorization: Bearer …`).
- `vercel.json`: add
  `"crons": [{ "path": "/api/cron/notify", "schedule": "0 1 * * *" }]` (01:00 UTC ≈
  09:00 WITA, daily).
- `api/admin/users.ts` (optional, powers A8): create users, **activate/deactivate**
  (`updateUser(uid, { disabled })` + write `users/{uid}.status`), and set the `admin`
  custom claim via Admin SDK; guarded by verifying the caller's ID token + admin claim.
- Add `firebase-admin` (+ `@vercel/node` types) to `devDependencies`; it's imported
  only under `api/`, so it never enters the client bundle.

---

## Env & secrets (Vercel project settings + `.env`)
- `VITE_FIREBASE_VAPID_KEY` — Web Push certificate key (client).
- `FIREBASE_SERVICE_ACCOUNT` — service-account JSON (server, cron + admin API).
- `CRON_SECRET` — shared secret guarding `/api/cron/notify`.
Enable **Email/Password** provider in Firebase Console → Authentication.

## Migration scripts (`scripts/`, run once, follow existing `.mjs` pattern)
- `scripts/migrateUsersToAuth.mjs` — from `user.json`: create an Auth account per user
  (temp password + `sendPasswordResetEmail`, or a set initial password), set the
  `admin` claim for admins, and seed the `users/{uid}` docs with `status: 'active'`.
  **Real-world step:** tell the team to set their password via the reset email on first
  login.
- `scripts/backfillEnteredAt.mjs` — set `stageEnteredAt`/`statusEnteredAt` on legacy
  deals to `updatedAt ?? createdAt`.

## Files
- **New:** `src/stores/users.ts`, `src/stores/notifications.ts`, `src/lib/crmAlerts.ts`,
  `src/lib/push.ts`, `src/components/NotificationPanel.vue`, `src/pages/Users.vue`,
  `public/firebase-messaging-sw.js`, `api/cron/notify.ts`, `api/admin/users.ts`,
  `scripts/migrateUsersToAuth.mjs`, `scripts/backfillEnteredAt.mjs`.
- **Edit:** `src/lib/firebase.ts` (export `auth`), `src/stores/session.ts` (Auth),
  `src/pages/Login.vue` (email/password), `src/router/index.ts` (async guard),
  `src/lib/crmUtils.ts` (role-based), `firestore.rules` (lock deals/users),
  `src/types/crm.ts` + `src/stores/crm.ts` (entered-at timestamps),
  `src/components/BottomNav.vue` (bell + Users nav), `src/App.vue` (load deals on
  auth; foreground push toast), `index.html` (link manifest), `src/main.ts` (register
  SW), `vercel.json` (crons), `package.json` (`firebase-admin`).

## Reuse (don't rebuild)
- Firestore CRUD/store style: `src/stores/crm.ts`, `src/stores/survey.ts`.
- UI kit `Sm*`, modal/slide-over patterns, `ConfirmDialog`.
- `isOverdue`, `formatDate`, privilege helpers in `src/lib/crmUtils.ts`.
- Existing (unregistered) `src/registerServiceWorker.ts` + `public/manifest.json`.
- One-off script scaffold: `scripts/setWinStageConfirmed.mjs` / `reimportDeals.mjs`.

## Verification
1. `npm run type-check` and `npm run build` pass.
2. **Auth:** enable Email/Password; run `migrateUsersToAuth.mjs`; `npm run dev` → log in
   with a migrated email/password; refresh keeps the session (no flicker); logout works;
   "forgot password" sends a reset email.
3. **Rules:** in the Firebase Rules Playground (or live), a non-owner non-admin update
   to a deal is **denied**; owner and admin succeed; delete only succeeds for admin;
   any signed-in user can add a comment.
4. **Deactivation:** as admin, deactivate a user on `Users.vue` → that user can no longer
   sign in ("account deactivated"), a mid-session user is signed out, they drop out of
   the owner picker and the cron's recipients, but their name still shows on their
   existing deals/comments. Reactivating restores sign-in.
5. **Timestamps:** move a deal's stage → `stageEnteredAt` updates; edit unrelated
   fields → it does not.
6. **Inbox:** create/adjust deals to trigger each of the four alert types → bell badge
   shows the unread count; opening the panel lists them; a row opens the right deal;
   "mark all read" clears the badge and persists across reload.
7. **Push:** on an installed PWA (Android/desktop; iOS 16.4+ installed), enable
   notifications → token saved to `users/{uid}.fcmTokens`; manually invoke
   `/api/cron/notify` with the `CRON_SECRET` → a push arrives for a user with alerts;
   foreground receipt shows the in-app toast.
8. **Cron:** confirm the Vercel Cron entry is scheduled in the dashboard.

## Risks / caveats
- **iOS web push** only works for the **installed** PWA on iOS 16.4+ — the in-app inbox
  is the reliable fallback for everyone else.
- **User migration is a real-world coordination step** (passwords reset via email);
  plan a cutover moment so no one is locked out.
- **`firebase-admin` service account** is a powerful secret — server-only env var,
  never in the client bundle.
- Larger surface than a typical change; Part A (auth) and Part B (notifications) can be
  landed as sequential PRs even though they're one plan.

## Out of scope
- WhatsApp / email-digest delivery (can add later as extra cron channels).
- SSO / Google Workspace sign-in (email+password chosen).
- Real-time (onSnapshot) live board updates; per-notification granular mute settings.
