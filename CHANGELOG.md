# Changelog — Fidato Mobile

One entry per working session, newest first: asked for · shipped · found · proved · left open ·
commits.

---

## 2026-11-04 · all of Tier 1 merged: the nine branches finished in the cloud (M-12)

**Asked for:** "start all and complete all the pending screens".

**Shipped** (merged into `main`, each merge gated green on its own commit, pushed; tip `b628aae`
before these notes). Nine Opus helpers, one copy each (`/home/user/wt/<name>/mobile`, its own gate
logs and Metro cache), one gate run at a time; the mobile chat reviewed and merged each:
- **work orders** `da301c3` (MHK-W1 a timestamp read as its day, MHK-W2 one tap one change)
- **kitchen** `e90e524` (the pass scrolls as one page, MPOS-K1; a column counts its struck dishes)
- **a stay's bill** `6ff663a` (MFIN-4: no rounded, clamped or dashed figure the server did not send;
  every write refused offline in the web's sentence, checked; route `[id]`, MFIN-3)
- **Tables and the pad** `40f66e0` (MPOS-1 Postgres time on a phone, MPOS-2, MPOS-3 one tap one
  round; at the merge: a tile prints from the picture's round printer, `PrintBill round`)
- **front desk** `5e00ff1` (MFD-3 the stay's foot and Due out are the server's figures; MFD-4 to -7)
- **guest services** `1ef35c3` (MGS-1; at the merge MGS-2: a server moment read as Hermes can)
- **the frame** `f908380` (every role's menu to its picture, one entry lit, MCORE-3; each menu link
  checked to land on a real route file)
- **real sign-in** `99c6e42` (MCORE-4, MCORE-5: with no settings the form is off and names the
  missing `EXPO_PUBLIC_FIREBASE_*`; the dev-login gate broken once and seen failing)
- **slices 1-2 re-matched** `b628aae` (the Dashboard's work tiles open the desk; at the merge MRP-1:
  each role lands on its picture's first screen, the owner on All properties)
- Notes: `docs/STATUS.md` (28 screens: 13 match their pictures, 3 with differences left, 12 with no
  usable picture), `docs/api-requests.md` R-16 to R-24, `src/core/DEFECTS.md` MCORE-4 and -5,
  MEMORY 6 to 12, `.gitignore` ignores `.env`.

**Proved:** ALL GATES GREEN on every merge commit (types, every check, both phone bundles, no test
sign-in, the bundle's routes exactly `app/`); each helper broke its new rules once and saw the check
fail. The mobile chat's review: a scan of every diff (bare `fetch`, `?? 0`, `Math.*`, sums, writes
not through `send()`, `.env`, packages) and a read of every flagged money line.

**Not proved:** nothing was opened on a screen, a phone or a preview; no API was run; no held,
refused or sent path was exercised. Every picture comparison is code read against the picture.

**Found:** the helpers' own `git push` of their branches was refused by the session's permission
check; their commits reached GitHub through `main`. The remote `mobile/*` branches are therefore
stale (31 Oct); `main` holds all of the work.

**Left open:** the owner's questions (HANDOVER); Tier 2, after the owner's yes.

---

## 2026-11-04 · the cloud session's first steps (M-12): the gates run here; the PMS cannot be read

**Asked for:** `npm ci` and the gates on `main`; read the PMS's code; then the 9 branches, one at
a time, asking before each.

**Shipped:** nothing in the app. These notes only.

**Proved (in the cloud container, Linux, Node 22.23.4, npm 10.9.9)**
- `npm ci` installs from the lock file as it stands.
- `bash scripts/gates.sh` on `main` (`dafdea8`), **unchanged**: ALL GATES GREEN — types, all 10
  `*.check.ts`, the android and ios exports, no test sign-in in either bundle, the bundle's routes
  exactly `app/`. About 65 s. `gates.sh` needed no change: `..` here is `/home/user`, so its logs
  and Metro cache go to `/home/user/.local/` (outside the repository, nothing to commit); no gate
  lock is needed with one session.
- The 9 branches, probed in throwaway copies (deleted after): each type-checks with 0 errors and
  passes its own checks; each merges into `main` without a conflict; none adds a package.

**Found:** the PMS's code cannot be read here. `git clone https://github.com/hotelsfidato-ai/pms`
is refused (private, no credentials), and attaching it to the session is refused ("you don't have
access"). Every screen is built from `reference/pms-shots/` (pictures and words) alone.

**Left open:** the 9 branches (next: `mobile/pos-tables`, after the owner's yes); Tier 2.

---

## 2026-10-15 · slice 2 built: Rooms, Report a repair, Out of service (three Opus helpers)

**Asked for:** "send a helper to build the housekeeping screens"; then "use Opus and multiple
agents" (M-6); after the restart, "continue building and finish all the pending things".

**Shipped** (merged into `mobile/app`; tip `0d016b3f` before these notes)
- The shared rules first, by the mobile chat: `roles.ts` (who may mark, give, block, repair, in the
  API's own sentences, read back from it as dev-finance and dev-desk; `roles.check.ts`), `roleAt()`
  and `Hotel.id` in the core, fixed routes for the three screens.
- **Rooms** (rooms helper, `468b47a3`), **Report a repair** (repair helper, `06d18e0c`), **Out of
  service** (block helper, `cf254d91`): see `src/modules/housekeeping/MODULE.md` "Built". Each in
  its own copy, ports and scratch database (`fidato_mobile_hk`, `_hk2`, `_hk3`).
- A housekeeper lands on Rooms (the web's WORKING_HOME) with Sign out; the Dashboard's "Needs
  cleaning" tile opens Rooms (the web's Dashboard.tsx 312), whose Back returns there.
- At merge: one block-reasons list; `scope.staffId` in the core type; Rooms' back says "Back".
- **MCORE-2 fixed:** every copy had shared one Metro cache, so previews served another copy's
  screens. `gates.sh` now gives each copy its own cache and refuses a bundle whose routes are not
  exactly its `app/` (proved failing on two mismatched exports); 8081 restarted with its own cache.
- MHK-1, MHK-2 (fixed by the helpers); MEMORY 4 (the shared browser pane), 5 (the Metro cache);
  M-6; R-6 to R-9 for the PMS; AGENTS.md (copies' Expo with their own cache, the pane, the gate
  lock); PLAN § 9's Expo command.
- The three copies' junctions out, the copies in the Recycle Bin, their branches deleted.

**Proved**
- `bash scripts/gates.sh` ALL GATES GREEN on `8cb43c0e` (the merge): types, all six checks
  (offline, figures, roles, board, repair, block), both phone bundles with no test sign-in and
  exactly the six routes of `app/`. Each helper's own gates were green too.
- The helpers, each on its own API and copy of the demo, pressed by script at 375 × 812: marks
  accepted / refused with the server's sentence / held and sent with the tap's key; assign and
  unassign; a repair once per key (the same key twice: one work order), held and sent once; out of
  service taken and put back, refused offline with nothing held; Reception and Accountant see the
  API's sentences; every button ≥ 44 px.
- The mobile chat, on 8081 against the phone's demo, by script: Housekeeping signs in → lands on
  `/housekeeping/5EL` with Sign out → Repair (`?room=208`) → Back → Out of service → Back → Sign
  out; Owner → All properties → Dashboard → "Needs cleaning" → Rooms → Back → Dashboard. No writes.
- Both phone bundles warm on 8081 (under 0.2 s), each carrying all six routes.

**Not proved**
- Nothing of slice 2 on a phone: Expo Go, the SQLite queue, Android's back button, a screen reader.
- The empty state of Report a repair; Owner, GM and Hotel Manager on the housekeeping screens.

**Then the owner's four answers (M-7), built** (`babf162a`): a day stepper on both forms
(`DayStepper.tsx`, shared); a housekeeper opens on Mine when they have rooms; an ended block shows
"Ended" without Put back; "take out too" only for a free room not already out; an end date at
least the day after From. A check for each, each broken once and caught. Gates green on
`babf162a`; seen on 8081 by script: the repair form's steppers (Until starts the day after From,
its minus disabled there), room 308's ended block without Put back beside its open one with it.

**The owner's look on the phone (15 Oct): "it's good".**

**Left open:** the build route (M-3) and slice 3, the restaurant waiter.

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
