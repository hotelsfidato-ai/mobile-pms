# Handover — Fidato Mobile

**Read the top block to the end before your first write.** Newest block first.

---

## 4–5 November 2026 — read this first: the work moves to the cloud (M-12)

**The cloud session, 4 Nov (latest) — read this first.**
- **All of Tier 1 is on `main`**: the nine branches are finished, reviewed and merged, each merge gated
  green (CHANGELOG 4 Nov). `docs/STATUS.md`: 28 screens, **13 match their pictures, 3 with
  differences left, 12 with no usable picture**, all by reading code against the pictures.
- **Nothing was opened on a screen.** The PC opens every screen next, on the phone or at 375 × 812,
  with each role, including the held path (MEMORY 1: warm both bundles before the phone link).
- The PMS's code cannot be read from the cloud (clone and attach refused); the pictures and the
  ported code were the spec. The remote `mobile/*` branches are stale; `main` has everything.
- Each picture folder has its own `index.json` (MEMORY 6).

**Questions waiting for the owner (each with a recommendation)**
1. **Phone-side previews:** the pad's "before tax" and the walk-in's nightly rate after a discount
   are worked out on the phone, as the web does (only previews; the server prices what is sent).
   *Keep, as the web (M-9).*
2. **Paise on a stay's bill** (₹7,582.50, where the web's headline shows ₹7,582). *Keep paise.*
3. **Back / Sign out on module screens** now that the frame is merged. *Remove where the frame's
   account menu covers it, as the pictures.*
4. **Core changes asked by the helpers:** MFIN-1 (`send()` takes a key kept from the tap, so a lost
   reply never makes a second payment), MFIN-2 (`ApiError` carries `needs`), `Head`'s line height,
   one shared `instant()` and the web's five missing colour tokens in the core. *Yes, by the mobile
   chat, Opus, gated.*
5. **Packages** (each asked when its control is built; until then "On the website for now"):
   `expo-image-picker` ~57.0.20 (Record the cost), `@react-native-community/datetimepicker` 9.1.0
   (wake-up day and time), `qrcode` 1.5.4 (room cards; the web's version). *Not now.*
6. **ID photos on the phone** (Show, Remove). *Keep on the website (DPDP).*
7. **New pictures on the PC** (`capture.mjs`): the account menu opened for each role, Online
   check-in with a guest waiting, a stay's panel and Bill tab, Check in, Settle, check-out, Report a
   repair, Out of service, the System section open. *Yes, before the next re-match.*
8. **The sign-in settings** (M-10): `EXPO_PUBLIC_FIREBASE_API_KEY`, `_PROJECT_ID`, `_APP_ID`
   (needed), `_AUTH_DOMAIN` (recommended); never in a file. *Tried first against the local API.*
9. Smaller, recommended as the helpers said: the kitchen says "not live" until a live stream;
   Switch hotel keeps the web's in-place switch; the desk's Rooms grid (`/h/:code/stay`) comes to the
   phone later in its lane; a work order's timestamps shown as the hotel's day once the PMS confirms
   the form.

**Next:** the PC's look at every screen; then Tier 2, only after the owner's yes.

**Where it is now**
- The app's own repository: **`hotelsfidato-ai/mobile-pms`** (public, the owner's choice). `main` is
  the PMS worktree's `mobile/` folder with its history. The PMS itself is not here and stays
  private: never push to it, never copy its code into this repository.
- Screens and slices: `docs/STATUS.md` (31 Oct). **On `main`, merged:** Sign in (development), All
  properties, Dashboard, Rooms, Report a repair, Out of service, the order (with paying and printing).
- **Unfinished, one branch each**, pushed as the helpers left them (never gated, not reviewed):
  `mobile/pos-tables` (Tables, the pad) · `mobile/front-desk` (Arrivals, In house, Walk-in,
  Check-in) · `mobile/folio` (a stay's bill, payments, check-out) · `mobile/kitchen` ·
  `mobile/maintenance` (work orders) · `mobile/guest-services` · `mobile/shell` (the frame: top bar,
  business-date banner, each role's menu, notifications, account menu) · `mobile/signin` (real
  Firebase sign-in, M-10; the owner's public settings still to come) · `mobile/align` (slices 1–2
  re-matched to the pictures). `folio`, `maintenance` and `shell` end with a "WIP" commit: what the
  helper had not saved when it stopped on 31 Oct. A branch's last commits say where it stopped.
- **The spec (M-11):** `reference/pms-shots/` — 158 pictures of today's PMS at 390 px, each with its
  words (`all/` 81 screens by menu, `new/` 44 addresses added since, `roles/` each role's home, menu
  and account menu), on demo data. `reference/helper-rules-31oct.md`: the rules every slice is built
  by (its paths are the PC's).

**What the cloud cannot do** (it needs the PC): run the PMS's API or database, open a screen with
data, take a new picture (`capture.mjs` needs the PMS website), give the owner the phone link, an
Expo build (M-8: the owner's yes per build). The web's code each screen ports is in the private
`hotelsfidato-ai/pms`: if it cannot be read, say so and build from the pictures and their words,
never inventing a route, a field or a rule.

**What next, in order**
1. `npm ci`, then `bash scripts/gates.sh` on `main`: proves the gates run in the cloud.
2. Finish each unfinished branch to its pictures, gates green on it, reviewed (Opus for money,
   rights and the offline path), merged into `main` — as AGENTS.md says the mobile chat does.
3. Then Tier 2 (`docs/STATUS.md`).

**Unchanged:** no decision without the owner's yes; no new package without it; never a `.env`; a
dash, never a zero; the API decides; nothing goes to the PMS repository; no deploy, no store
upload, no Expo build. Every mistake in `MEMORY.md`, every defect in its module's `DEFECTS.md`.

---

## 15 October 2026

**Where it stands**
- A **separate system** (M-2), rebuilt natively for phones with React Native + Expo (M-3). Rules:
  `CLAUDE.md`; working agreement: `AGENTS.md`; decisions: `DECISIONS.md` (M-1 to M-6); plan:
  `docs/PLAN.md`.
- **Slice 1** (the owner's figures) approved on the phone. **Slice 2** (housekeeping: Rooms, Report a
  repair, Out of service) **built and merged** into `mobile/app` by three Opus helpers (M-6); its
  core (writes with the key from the first tap, the offline queue, the held bar, Inter, icons) too.
  `bash scripts/gates.sh` ALL GATES GREEN on the merge. **The owner looked at it on the phone on
  15 Oct: "it's good".**
- The web's own faults found on the way: `docs/api-requests.md` R-1 to R-9, for the owner to take
  to the PMS's main chat.
- **Running:** API 8860 (pid 26964, on `fidato_mobile`) and Expo 8081 (listener pid 6624, its own
  Metro cache, log `../.local/mobile-expo.log`); both phone bundles warm. Stop Expo (PowerShell, this
  PC): `taskkill /PID 44692 /T /F` (the listener's own `cmd` parent; killing the top Git Bash wrapper
  can leave the listener running), then check 8081 is free. The helpers' servers are stopped.
- **Left on the machine:** the scratch databases `fidato_mobile_hk`, `_hk2`, `_hk3` (the helpers'
  test writes); drop them through `D:\fidato pms\.local\dbq.sh` when no longer wanted.

**Who holds what** (memory is short: a helper starts its own API and Expo only under `../.local/mobile-preview.lock`, one at a time, and stops both when it releases it)

| Module / core | Held by | Since |
|---|---|---|
| everything (core, reports, housekeeping) | the mobile chat | 15 Oct |
| pos: Tables and the order pad | Opus helper "tables": `.claude/worktrees/pos-tables`, `mobile/pos-tables`; Expo 8082, API 8861 (pid 28236) on `fidato_mobile_hk` | 15 Oct |
| pos: the order | Opus helper "order": `.claude/worktrees/pos-order`, `mobile/pos-order`; Expo 8083, API 8862 (pid 27776) on `fidato_mobile_hk2` | 15 Oct |
| pos: paying and printing | Opus helper "pay": `.claude/worktrees/pos-pay`, `mobile/pos-pay`; Expo 8084, API 8863 (pid 33524) on `fidato_mobile_hk3` | 15 Oct |
| front-desk (slice 4a: arrivals, check-in, in house, walk-ins) | Opus helper "desk": `.claude/worktrees/front-desk`, `mobile/front-desk`; Expo 8085, API 8864 on `fidato_mobile_desk` | 15 Oct |
| finance (slice 4b: a stay's bill, payments, check-out) | Opus helper "folio": `.claude/worktrees/folio`, `mobile/folio`; Expo 8086, API 8865 on `fidato_mobile_folio` | 15 Oct |
| pos: the kitchen (slice 6) | Opus helper "kitchen": `.claude/worktrees/kitchen`, `mobile/kitchen`; Expo 8087, API 8866 on `fidato_mobile_kitchen` | 15 Oct |
| housekeeping: work orders (slice 7, maintenance) | Opus helper "maintenance": `.claude/worktrees/maintenance`, `mobile/maintenance`; Expo 8088, API 8867 on `fidato_mobile_maint` | 15 Oct |
| guest-services (slice 8) | Opus helper "guest services": `.claude/worktrees/guest-services`, `mobile/guest-services`; Expo 8089, API 8868 on `fidato_mobile_gs` | 15 Oct |
| core: real sign-in (slice 5, M-10) | Opus helper "signin": `.claude/worktrees/signin`, `mobile/signin` (may edit the core's sign-in files only); Expo 8090, API 8869 on `fidato_mobile_signin` | 17 Oct |

**Next, in order**
1. The build route is decided (M-8): Expo's cloud for both platforms, only `mobile/` uploaded, the
   owner's Expo account; store accounts at launch. Before the first build: the owner's account,
   `eas.json`, the app's identifier (with the product-name decision), and a dry check that the
   upload holds `mobile/` alone. The first build is a test build, when slice 3 needs one.
2. Slice 3, the restaurant waiter: the web's waiter work mapped (read-only helper), then its
   `MODULE.md` and its decisions (printing, money, offline) asked of the owner.

**Questions waiting for the owner:** none. The four of 15 Oct were answered as recommended (M-7)
and built (`babf162a`, gates green): a day stepper on both forms; a housekeeper opens on Mine
when they have rooms; ended blocks without Put back; "take out too" only for a free room not
already out; an end date at least the day after From; the phone's own words approved.

---

## 14 October — the mobile chat's handover to the PMS's main chat

`docs/briefs/mobile-app-handover.md` (one folder up): state, proofs, how to run and stop, traps,
next slices, and the paste-ready notes written for a merge that the owner has since ruled out (M-2).
