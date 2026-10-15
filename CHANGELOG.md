# Changelog — Fidato Mobile

One entry per working session, newest first: asked for · shipped · found · proved · left open ·
commits.

---

## 2026-10-15 · slice 2's core: writes, the offline queue, test people, Inter and icons

**Asked for:** "start slice 2's core: writes with the idempotency key, the offline queue on
expo-sqlite, the housekeeping test people, icons and Inter."

**Shipped** (all core, by the mobile chat)
- `src/core/offline.ts`: the web's `src/lib/offline.ts` ported whole (22 rules, identical patterns
  and tiers, compared by script), the connection state and the drain, pure so node can check it.
  `newKey()` makes a v4 UUID (the API's column is `uuid`); Math.random where the phone has no
  `crypto.randomUUID` (a key must be unique, not secret).
- `src/core/outbox.ts` on expo-sqlite (oldest first, survives a closed app); `outbox.web.ts` keeps
  the same queue in localStorage for the web preview only.
- `src/core/api.ts`: `send()` — the key minted at the tap and sent from the first attempt (M-5);
  held (`HeldError`) or refused (the web's sentence) when nothing leaves the phone; `sendHeld()`
  re-sends with the same key. Reads now mark the connection up or down.
- `src/core/HeldBar.tsx`: the web's OfflineBar, same sentences: refused with Discard, another
  person's, held with Send now. The phone has no "online" event without another package, so it
  also retries on coming back to the app and every 30 s while something waits.
- Test people Housekeeping and Reception (the web's labels); the no-dev check knows every web test
  person. Inter by weight (500/600/700 only, so the app carries three font files, not eighteen):
  `face[...]` replaces every `fontWeight`; lucide chevrons for "›" and "‹ All"; the web's info and
  red-100 colours in the theme.
- `src/modules/housekeeping/MODULE.md`: what the core gives the screens.

**Proved**
- `offline.check.ts`: housekeeping's tiers, the drain (oldest first; a refusal kept with the
  server's words and the drain goes on; a network failure or a 5xx stops it with the rest kept in
  order; another person's waits), 2,000 keys all v4 and unique. Broke it twice — a drain that
  skips a network failure, repairs moved to "refuse" — and saw both fail.
- On the real API (8860) from the 375 × 812 preview: three held changes seeded, signed in as
  Housekeeping: the good one sent and removed, `"bogus"` refused with the server's sentence and
  kept, Reception's left waiting; a held change went with **exactly the key it was given**, as
  the person who made it; Discard removed the refused one; Reception's sent when Reception signed
  in. Rooms 201 and 202 still clean. Inter's three faces loaded.
- `bash scripts/gates.sh` ALL GATES GREEN (no test person in either release build; only the three
  Inter files in it); both phone bundles warm (under 0.2 s).

**Not proved**
- `send()`'s held path (nothing calls it until the housekeeping screens); the SQLite store and the
  30 s retry on a phone; the screens in Inter on a phone.
- 16 console 401s and three Metro "index.ts" errors in the preview tab came from before this work
  (counts unchanged across a fresh three-person run); not chased further.

**Commits:** this entry's commit.

---

## 2026-10-15 · the owner's look at slice 1, the module layout, the gates, slice 2 decided (PLAN § 10)

**Asked for:** start PLAN § 10 — the owner's look at slice 1 on the phone first, nothing before it.

**Shipped**
- The owner looked at slice 1 on the phone: **"it's good"** (no changes asked).
- Slice 1 in the module layout, no change in what it does: `src/core/` (api with the hotel types,
  `format.ts` new, theme, ui, SignIn) and `src/modules/reports/` (figures, AllProperties,
  Dashboard, `MODULE.md`, `DEFECTS.md`) — `7a8a4267`.
- `scripts/gates.sh` (types, every `*.check.ts`, both phone bundles, no test sign-in in either) and
  `scripts/check-no-dev-login.mjs`, ported from the PMS's; AGENTS.md's gate section points at it;
  `src/core/DEFECTS.md` — `ec5cfe17`.
- **M-4** (PLAN § 8, 1-3, all as recommended) — `da0c5531`. Its packages installed in `mobile/`;
  Expo's installer took the newest patch inside the approved ranges (expo-router 57.0.27,
  expo-constants 57.0.22, expo-linking 57.0.13). `expo` stays 57.0.28 although Expo suggests
  57.0.29 (not approved).
- Slice 1 on `expo-router` and react-query, no change in what it does: `app/` (`_layout`, `index`,
  `all`, `hotel/[code]`), `src/core/session.tsx`; `useRead` on `useQuery` with the hotel in every
  key; signing in or out empties the cache; `App.tsx` and `index.ts` gone — `a6a26ba5`.
- Slice 2's brief, `src/modules/housekeeping/MODULE.md` (from a read-only map of the web twin, its
  key claims re-checked), and **M-5**: all four (mark clean/inspected, give rooms, report a repair,
  out of service online only), no dirty button, Inspected as the web, the idempotency key from the
  first tap.
- `docs/api-requests.md` R-1 to R-5: the web's housekeeping faults, found by reading, for the PMS.

**Found**
- **MCORE-1:** the four test people's names were in both release bundles (the header was not, so
  no way in); the list now sits behind `__DEV__`. Found by the new check on its first run.

**Proved**
- `bash scripts/gates.sh` ALL GATES GREEN on `ec5cfe17` (clean). The figures check refused a
  broken rupee format; the no-dev check refused the pre-fix bundle, and both bundles with the old
  line put back.
- `figures.live.ts` (dev-owner, 8860) equals the screens: 5EL 14 Oct, occupancy 35.29 / 23.33 /
  59.68 %, room revenue ₹17,635 / ₹1,75,950 / ₹57,02,509.
- The 375 × 812 preview (Expo web): signed in as Owner, All properties → Dashboard → back → sign
  out, the same figures. The pane was hidden, so the buttons were pressed by script and read as
  text; no screenshot.
- On the router build (`a6a26ba5`): gates green; Expo restarted (new pid 35748) and both phone
  bundles warmed (Android 0.08 s, iOS 0.18 s); the preview as Owner, GM and Hotel Manager: `/` →
  `/all` → `/hotel/5EL` → back → sign out, the same figures; a reload on `/hotel/5EL` lands on sign
  in; no console errors. Not exercised: an unknown hotel's address (the web build's history
  could not be driven fairly).

**Left open**
- Slice 2's build: core first (writes in `api.ts` with the key, the outbox on `expo-sqlite`, icons
  and Inter, the housekeeping test people), then the screens by a helper.
- Not proved on a device: Android's back button and the notch edges (the owner's look was overall).

**Commits:** `7a8a4267`, `ec5cfe17`, `1a9e5864`, `da0c5531`, `a6a26ba5`, and this note.

---

## 2026-10-15 · a separate system, and the plan for the native rebuild

**Asked for:** keep the app separate from the PMS (M-2); rebuild the PMS natively for phones in its
own folder with its own chat and helpers, nothing copied into `D:\fidato pms`; plan the build,
production and quality system with its own defects, following the PMS's principles (M-3).

**Shipped** (docs only, in `mobile/`)
- `CLAUDE.md`, `AGENTS.md`, `DECISIONS.md` (M-1 to M-3), `HANDOVER.md`, `MEMORY.md` (1-3),
  `CHANGELOG.md`, `docs/PLAN.md`, `docs/api-requests.md`.

**Found**
- The app's plan carried "D27-322", a number the PMS had already used: the app's decisions are now
  M-numbers (MEMORY 3).

**Proved**
- No code changed. Both phone bundles warmed (Android and iOS, 0.06 s), API 8860 and Expo 8081
  answering.

**Left open**
- The owner's look at slice 1 on the phone; then PLAN § 10.

---

## 2026-10-14 · the plan with the owner, and slice 1 (the owner's figures)

**Asked for:** a React Native + Expo app in the PMS's style, from its own chat; plan with the owner
first (`docs/briefs/mobile-app.md`, one folder up).

**Shipped**
- M-1 (recorded then as "D27-322"): every role slice by slice, figures first; Android and iOS; the
  web's offline rules; the same accounts; only the new app. Expo SDK 57 / RN 0.86.3 / React 19.2.3,
  safe-area-context and the web preview.
- Slice 1: Sign in (development), All properties, one property's Dashboard — `App.tsx`, `src/*`; the
  PMS's endpoints and rules ported (`src/figures.ts`).

**Found**
- Expo Go hung on the owner's first open (MEMORY 1); an interrupted npm install broke the lock file
  (MEMORY 2).

**Proved**
- `figures.check.ts` passes and refused a broken arrivals rule; `tsc` clean; every read 200 for four
  roles; figures equal the Manager Report on the demo; opened at 375 px, no errors.
  Not proved: the owner's phone, Android back, real-device edges.

**Commits:** `b0c575a1 … 8b99f4e2`, handover `7a4af7ee`
