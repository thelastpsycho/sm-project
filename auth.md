# Auth model & CRM privileges

> Reference notes for future changes. Nothing to do now — this documents the
> current state and its known limitation.

## How auth works today

- **No Firebase Auth per user.** Login is **PIN-based in-app**: `src/stores/session.ts`
  matches the entered PIN against `src/user.json` and stores the matched user
  (name/email/position/pin) in `localStorage`. `currentUser.email` is the identity
  used everywhere.
- **Firestore rules are public.** `firestore.rules` grants `allow read, write: if true`
  for `deals/{document=**}` (and the other app collections). There is no
  `request.auth`, so the database cannot enforce per-user rules.
- **All privilege checks are therefore client-side UI gating.** They prevent honest
  mistakes but are bypassable by a determined user via direct Firestore calls.

## CRM privilege rules (implemented)

Defined in `src/lib/crmUtils.ts`:

- `ADMIN_EMAILS` — currently `['andikrisnatha@theanvayabali.com']` (Andi).
  `DELETE_ADMIN_EMAILS` is kept as a back-compat alias.
- `isAdmin(email)` — email is in `ADMIN_EMAILS`.
- `canDeleteDeals(email)` — **delete = admin only** (delegates to `isAdmin`).
- `canEditDeal(email, deal)` — **edit**:
  - admin → any lead;
  - unassigned lead (no `ownerId`) → anyone logged in can edit/claim;
  - otherwise → owner only (`deal.ownerId === email`).

Behaviour wired to these:

- **View** — everyone. Non-editable deals open read-only in `DealModal.vue`:
  "View Deal" title + lock badge, form disabled via `<fieldset :disabled>` in
  `DealForm.vue`, Save button hidden.
- **Comment** — everyone (`DealComments` stays enabled even in view-only mode).
- **Board drag** — owner/admin only. Locked cards get the `drag-locked` class and are
  excluded via vuedraggable `filter=".drag-locked"`; `onDragChange` also refuses
  non-editable moves defensively (`src/pages/CRM.vue`). `DealCard.vue` shows a lock icon.
- **Delete** — admin only (trash icon renders only for admins).

## Known limitation / future hardening

To make these rules **server-enforced**, introduce real per-user auth (e.g. Firebase
Auth, one account per sales user) so `firestore.rules` can check
`request.auth.token.email` against `ownerId` for `deals/{id}` updates, and against
`ADMIN_EMAILS` for deletes. Until then, treat CRM privileges as UI-level only.
