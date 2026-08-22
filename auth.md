# Auth model & CRM privileges

> Updated after the Firebase Auth + notifications migration. Auth is now
> **Firebase Authentication (email/password)** and CRM privileges are
> **server-enforced** in `firestore.rules`.

## How auth works

- **Firebase Auth (email/password).** `src/stores/session.ts` signs in via
  `signInWithEmailAndPassword`, restores the session with `onAuthStateChanged`
  (exposes an `authReady` promise the router awaits), and hydrates `currentUser`
  from the `users/{uid}` Firestore doc (name/position/phone/**role**/**status**).
  `currentUser.email` remains the identity used everywhere; `ownerId` is unchanged.
- **`users` collection** (doc id = auth uid): `{ email, name, position, phone,
  role: 'admin'|'sales', status: 'active'|'disabled', fcmTokens?, notificationsSeenAt? }`.
  Managed on the admin-only `/users` screen (`src/pages/Users.vue`).
- **Admin = custom claim `admin: true`** (set by the migration/admin API). `firestore.rules`
  read the claim; `src/lib/crmUtils.ts` also falls back to the `ADMIN_EMAILS` allow-list.
- **Deactivation** disables the Auth account (`disabled: true`) *and* sets
  `users/{uid}.status = 'disabled'`; the session store also signs out a user whose
  status flips mid-session.

## CRM privilege rules

Client helpers in `src/lib/crmUtils.ts` (now take the session user, not just email):
`isAdmin(user)`, `canDeleteDeals(user)`, `canEditDeal(user, deal)`.
- **View** — any signed-in user (non-editable deals open read-only).
- **Comment** — any signed-in user.
- **Edit / board drag** — owner (`ownerId === email`) or admin; unassigned = anyone.
- **Delete** — admin only.

Server-enforced mirror in `firestore.rules`:
- `deals` read/create: signed in; update: admin claim OR `ownerId == ''` OR
  `ownerId == request.auth.token.email`; delete: admin claim.
- `deals/{id}/comments` read/create: signed in; update/delete: author or admin.
- `users`: read signed in; self-update (own doc) or admin; create/delete admin only.

## One-time setup (manual — must be done by a human in the console/dashboard)

1. **Firebase Console → Authentication →** enable the **Email/Password** provider.
2. **Cloud Messaging →** generate a **Web Push certificate (VAPID) key**.
3. **Project Settings → Service accounts →** generate a private key JSON. Save it as
   `scripts/serviceAccount.json` (gitignored) for local scripts, and as the
   `FIREBASE_SERVICE_ACCOUNT` env var (the JSON string) on Vercel.
4. Set env vars (Vercel project + local `.env`):
   - `VITE_FIREBASE_VAPID_KEY` (client, from step 2)
   - `FIREBASE_SERVICE_ACCOUNT` (server, from step 3)
   - `CRON_SECRET` (any strong random string; guards `/api/cron/notify`)
5. **Deploy the rules:** `firebase deploy --only firestore:rules`.
6. **Migrate users:** `node scripts/migrateUsersToAuth.mjs` — creates Auth accounts +
   `users` docs from `src/user.json`, sets the admin claim, and prints a
   password-reset link per user. Share the links (or have people use “Forgot password?”).
7. **Backfill timestamps:** `node scripts/backfillEnteredAt.mjs` — fills
   `stage/statusEnteredAt` on legacy deals (needed for “stuck in stage” alerts).

## Notes / caveats

- **iOS web push** requires the app be **installed to the home screen** (iOS 16.4+); the
  in-app bell inbox is the fallback for everyone else.
- `src/user.json` is retained only as the migration seed + the owner-name list used by
  a few pages; it is no longer the auth source.
- Duplicate emails in `user.json` (e.g. two people sharing `micecoordinator@…`) collapse
  to one Auth account — resolve those before/after migration if both need to log in.
