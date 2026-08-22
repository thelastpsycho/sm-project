# Development Roadmap — Sales Management App (The Anvaya)

**North-star goal:** help the sales team **sell more and close faster.**
**Primary users:** the whole sales team — executives (day-to-day) *and* managers (oversight).
**Top priorities chosen:** (1) Pipeline forecasting & KPIs, (2) Tasks & follow-up reminders.
**Format:** full roadmap, phased and prioritized so you can decide sequencing.

Two hard metrics every phase should move:
- **Win rate** = Win / (Win + Lost) — are we closing more of what we work?
- **Sales cycle & freshness** — days from lead → Confirmed, and "no lead sits untouched."

Everything below builds on what already exists: the CRM pipeline (`src/pages/CRM.vue`,
`src/stores/crm.ts`, `src/types/crm.ts`), the report page (`src/pages/PipelineReport.vue`),
and the already-scoped auth + notifications work (`docs/auth-notifications-plan.md`).

---

## Phase sequencing at a glance

| Phase | Theme | Why it's here | Size | Depends on |
|------|-------|---------------|------|-----------|
| **1** | Foundation: real identity + accountability | Unblocks per-user tasks, KPIs, reminders; adds the stage/status timestamps forecasting needs | L | — |
| **2** | Follow-up discipline (Tasks & reminders) | The #1 "close faster" lever — no lead goes cold | M | 1 |
| **3** | Forecasting & KPIs | The "sell more" brain — see what will close & how the team performs | M–L | 1 (timestamps) |
| **4** | Prioritization & lead intelligence | Work the right leads first | M | 2, 3 |
| **5** | Faster quoting (doc automation) | Shorten proposal turnaround | L | 1 |
| **6** | Client-facing portal | External approvals auto-advance the pipeline | L | 5 |

Recommended order = the numbers. Phases 1–3 deliver the two priorities you picked;
4 sharpens them; 5–6 are strategic stretches.

---

## Phase 1 — Foundation: identity + accountability  *(prerequisite)*
Already planned in detail in **`docs/auth-notifications-plan.md`** — pulled in here because
tasks, reminders, KPIs, and "who did what" all need real user identity, and forecasting
needs the entered-a-stage timestamps.

**Deliverables**
- Firebase Auth (email/password) replacing PIN; `users` collection with **role** and
  **active/deactivated** status; server-enforced `firestore.rules`.
- `stageEnteredAt` / `statusEnteredAt` timestamps on deals (feeds cycle-time & aging).
- Alert engine (`src/lib/crmAlerts.ts`) + in-app inbox + web push.

**Sell-more payoff:** accountability (leads tied to a real person), and the data plumbing
for every later phase. **Success check:** every deal has an identifiable owner; aging-lead
alerts fire.

---

## Phase 2 — Follow-up discipline: Tasks & reminders  *(priority #2)*
**Goal:** never drop a lead; make "next action" a habit, not a note.

**Deliverables**
- **Per-deal tasks** — `deals/{id}/tasks` subcollection: `{ title, type: call|email|meeting|whatsapp|site-visit, dueDate, done, assigneeEmail }`. Shown as a Tasks tab in `DealModal.vue`.
- **"My Tasks" page** (`src/pages/MyTasks.vue`) — Today / Overdue / Upcoming across *all* your deals; one-tap complete + snooze. This is the executive's daily driver.
- **Reminders** — extend the Phase-1 alert engine with task-due / task-overdue triggers alongside the existing aging-lead + next-action alerts (in-app bell + push).
- **Activity log** — `deals/{id}/activity` auto-entries on stage/status change, comment, task done. Powers "last touched" and manager visibility later.
- **Quick actions** on the card/list: "Log a call", "Set next action", "Snooze 3 days".

**Sell-more payoff:** faster, disciplined follow-up is the biggest cycle-time lever.
**Success check:** overdue-task count trends down; every Active deal has a next action.
**Size:** M. **Data added:** `tasks`, `activity` subcollections.

---

## Phase 3 — Forecasting & KPIs  *(priority #1)*
**Goal:** see what's likely to close, and how each person + the team is performing.
Built as tabs on the existing `src/pages/PipelineReport.vue`.

**Deliverables**
- **Weighted pipeline / forecast** — assign a default close-probability per stage
  (New 10% → Proposal 30% → Negotiation 50% → Contract 80% → Confirmed 100%; editable in
  an admin settings doc). Weighted value = `totalRevenue × probability`.
- **Forecast by expected-close month** — add an `expectedCloseDate` (default from
  `arrivalDate`); show Committed (Contract/Confirmed) vs Best-case per month/quarter.
- **Conversion funnel & win rate** — stage-to-stage conversion, overall win rate,
  loss reasons breakdown (`reasonWonLost`) → "why we lose."
- **Sales-cycle length** — from `createdAt`/`stageEnteredAt` → Confirmed (needs Phase 1).
- **Per-owner leaderboard** — deals, weighted pipeline, wins, revenue, win rate, avg cycle.
- **Targets vs actuals** — a `targets` collection (monthly/quarterly target per owner +
  team) with an admin editor and progress bars on the report + each owner's home.

**Sell-more payoff:** managers coach with numbers; execs see their gap to target and which
deals move the needle. **Success check:** forecast vs actual within a sane error band after
a couple of months; targets visible to everyone.
**Size:** M–L. **Data added:** `expectedCloseDate` on deals, `settings/forecast` probabilities, `targets` collection.

---

## Phase 4 — Prioritization & lead intelligence
**Goal:** work the *right* leads first.

**Deliverables**
- **Lead priority score** = value × stage-probability × urgency (arrival proximity) ×
  freshness penalty. Sort the board/list by priority; a "Hot leads" smart list.
- **Smart lists / saved filters** — presets on `CRM.vue`: My Overdue, Closing This Month,
  High-Value At-Risk, Untouched 7+ days (reuses the alert logic + existing filter panel).
- **At-risk flags on cards** — surface "arrival near, not Confirmed" and "stuck too long"
  visually on `DealCard.vue`.

**Sell-more payoff:** attention goes to winnable, time-sensitive, high-value deals.
**Success check:** high-priority leads have more recent activity than the tail.
**Size:** M. **Data added:** none (derived).

---

## Phase 5 — Faster quoting: document automation  *(stretch)*
**Goal:** cut proposal turnaround time. Bridges the CRM to the existing document pages
(`Contract.vue`, `TacticalOffer.vue`, `RFP.vue`).

**Deliverables**
- **Generate from a deal** — one click on a deal prefills a Tactical Offer / Contract
  (company, dates, rooms, ADR, revenue); the generated doc links back to the deal and can
  auto-advance the stage (e.g. → Proposal / Contract).
- **Reusable templates + PDF export**; groundwork for e-sign in Phase 6.

**Sell-more payoff:** less admin, faster to a signable offer. **Size:** L.
**Data added:** `documents` link on deals (or reuse existing doc stores).

---

## Phase 6 — Client-facing proposal portal  *(future)*
**Goal:** let clients view & approve proposals; approval auto-advances the deal.

**Deliverables**
- Shareable read-only proposal/contract link (public route like the survey guest flow).
- Client questions/approval → writes back to the deal, moves stage to Contract/Confirmed,
  notifies the owner.

**Sell-more payoff:** removes back-and-forth friction at the close. **Size:** L.

---

## Quick wins you can ship early (independent of the big phases)
Small, high-value, low-risk — good for momentum between phases:
- **Overdue highlight everywhere** — the board/list already know `isOverdue`; add a red dot
  + a header count of overdue next-actions.
- **"Closing this month" filter preset** on the existing filter panel.
- **Loss-reason mini-chart** on the report (data already captured in `reasonWonLost`).
- **Owner leaderboard (counts + revenue)** — a first cut before full KPIs.
- **Board sort** by value / arrival date.

---

## Cross-cutting (do alongside, not a phase)
- **Data hygiene:** required fields on create (owner, segment, expected close), light dedupe.
- **Analytics:** log key actions (stage moves, task completes) for later insight.
- **Mobile polish:** the team is mobile-first — keep new views one-hand friendly.

---

## Suggested first move
Phase 1 is the unlock for both of your priorities, so start there — but you can ship the
**Quick wins** immediately for visible progress while Phase 1 lands. After Phase 1, do
**Phase 2 (Tasks/reminders)** and **Phase 3 (Forecasting/KPIs)** in that order (tasks create
the activity data that makes the KPIs meaningful).

> Open questions to settle before building each phase:
> - Phase 3: what are the real **sales targets** (per person? team? monthly/quarterly?) and
>   your gut-feel **close probabilities** per stage?
> - Phase 2: which **task types** matter (call/email/site-visit/WA?) and who can assign
>   tasks to whom (self only, or managers assign to execs)?
