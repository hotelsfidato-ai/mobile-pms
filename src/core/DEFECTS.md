# core — defects (MCORE-)

Every defect found in the core (`app/`, `src/core/*`, `package.json`, `app.json`), numbered
**MCORE-1, MCORE-2 …** (AGENTS.md). Each entry: what happened, how it was found, what was done about
it, and the rule it leaves. Fixed entries stay.

---

### MCORE-6 · The longer-password dialog drew under Android's status bar unpadded (20 Nov) — fixed

**What happened.** `SignIn.tsx PasswordDue`'s `Modal` had no `statusBarTranslucent` and no safe-area
padding, and its password box had no keyboard lift (docs/NATIVE.md, safe areas). **How found:** the
mobile chat's sweep of modals against NATIVE.md. **What was done (m13-fixes):** `statusBarTranslucent`,
its backdrop padded with `useSafeAreaInsets()` (top and bottom at least 16), and a
`KeyboardAvoidingView` (padding on iPhone, height on Android). `onRequestClose` was already there and
stays a no-op on purpose: the web's PasswordDue cannot be closed until the password is set, so
Android's back does nothing. Not opened on a phone here. **The rule:** every `Modal`, a core one too,
sets `statusBarTranslucent`, pads with the insets and names `onRequestClose`.

### MCORE-5 · A fault in the build's sign-in settings would read as the person's own mistake (4 Nov) — fixed

**What happened:** a wrong Firebase setting (invalid-api-key, configuration-not-found,
operation-not-allowed, app-not-authorized) was told as "That email and password do not match."
**How found:** the signin helper, reading `firebase.ts` against the installed SDK 12.18.0's codes.
**What was done:** those codes say the build's sign-in is not set up correctly, naming the code; with
no settings at all the form is off and names the missing `EXPO_PUBLIC_FIREBASE_*` values; Firebase's
start is guarded so bad settings never white-screen the app (`firebase.ts`, `signin.check.ts`).
**The rule:** a fault in the build's settings is never told to the person as their own mistake.

### MCORE-4 · A kept session flashed the sign-in form at start (4 Nov) — fixed

**What happened:** `Checking` was imported in `app/index.tsx` but never drawn, so while Firebase read
the kept session the form showed, then a signed-in person jumped in. **How found:** the signin
helper, reading the code. **What was done:** `app/index.tsx` draws `Checking` while `starting`.
**The rule:** a state you import must be drawn.

### MCORE-3 · The menu lit Arrivals on every front-desk screen (4 Nov) — fixed

**What happened:** the menu lit an entry when the screen's route started with the entry's route, as
the web's `matchPrefix` does. The web's addresses never nest (`/h/:code/arrivals`,
`/h/:code/in-house`), but the phone's do: Arrivals is `/front-desk/:code` and In house, Walk-ins and
the stay all sit under it. On In house both Arrivals and In house were lit and Arrivals' Today and
Upcoming opened under it. **How it was found:** reading `ShellMenu.tsx` against the reception
picture while adding the front desk's routes (shell helper, 4 Nov). **What was done:** one entry is
lit, chosen by `menu.ts` `activeRoute`: the exact route (with its `?view=` tab), else the same
screen without its query, else the longest prefix; `menu.check.ts` pins it and fails when the first
prefix is taken instead (seen). **The rule:** a web rule that leans on the web's addresses is
re-checked against the phone's routes before it is ported.

### MCORE-2 · One Metro cache for every copy: a preview served another copy's screens (15 Oct) — fixed

**What happened:** the helpers' copies share `mobile/node_modules` through a junction, and every
Expo used Metro's one cache in `%TEMP%\metro-cache`. expo-router's route list (`_ctx`, with the app
folder written in) was cached once for all copies: 8084 (out of service) and 8082 (rooms) served the
repair copy's routes, and a gate's export could have carried another copy's screens.
**How it was found:** the block and rooms helpers, by `/_sitemap` and their bundles.
**What was done:** `scripts/gates.sh` gives each copy its own cache (`TEMP`/`TMP` under its
`.local/metro-tmp`) and refuses a bundle whose routes are not exactly the copy's `app/` files
(proved failing on two mismatched exports); 8081 restarted with its own cache; every Expo command
in AGENTS.md and PLAN § 9 carries it. **The rule:** a copy never shares Metro's cache; check
`/_sitemap` before trusting a preview.

### MCORE-1 · The test people's names reached the release bundle (15 Oct) — fixed

**What happened:** `SignIn.tsx` kept its development sign-in list (`dev-owner`, `dev-gm`,
`dev-hotel-manager`, `dev-finance`) in a plain top-level `const`. The buttons are drawn only under
`__DEV__`, and the header that signs in (`x-dev-staff-id`) was already dropped from a release
bundle, but the minifier kept the list itself: the four names sat in both exported bundles
(Android and iPhone `.hbc`). Not a way in on its own — no header, no buttons — but the PMS's rule
is no trace at all.
**How it was found:** the new `scripts/check-no-dev-login.mjs`, on its first run against the
slice 1 export.
**What was done:** the list is `__DEV__ ? [...] : []`, so the minifier drops it; the check passes
on both bundles, and fails on both again when the old line is put back (both seen 15 Oct).
**The rule:** anything that exists only for development sits **behind `__DEV__` itself**, not in a
value that only a `__DEV__` branch reads. `scripts/gates.sh` refuses a bundle that carries it.

---

# m13-stops (20 Nov)

## MCORE-U1 · The unknown-outcome stop lived inside the sheet that sent the write

`useStuck` (ui.tsx) is component state: closing and reopening a sheet, switching a tab, or leaving the
screen and coming back gave a fresh, unstopped act, so a write whose reply was lost could be sent again -
on a route that reads no key, a second real write. Where a module lifted the moment to its screen
(contracts, waitlist, pos Day end, loyalty, reputation), it was `useState` (gone on a remount) compared
with a read's FINISH (`dataUpdatedAt`), so a read already on its way at the loss let it go. **Found** by the m13-stops sweep (grep for `useStuck` / `outcomeUnknown` inside sheets), reading the API to see which routes read the key.
**Done:** `src/core/stop.ts` (pure, `stop.check.ts`): one book, by name, outside every component; one
counter orders each loss and each read's start; `lost`, `sending` (stopped while a write is on its way),
`good(name, ticket)` lets go only a loss before the read's start; `unknown` is the loss alone (the words).
`useScreenStop(name)` in ui.tsx: `stuck`, `unknown`, `isStuck()`, `stop(e)`, `guard(write)` (on its way,
then lost on `outcomeUnknown`), `watch(read)` (wraps a screen's read; a read react-query cancelled lets
nothing go); `Stopped` is the screen's line with a way to read again. The check was broken once each way
(a read begun before the loss let go; the in-flight stop removed) and failed, then restored by copying the
file back (MEMORY 18). **The rule:** a write on a route that reads no idempotency key keeps its stop OUTSIDE the sheet and the screen (core `useScreenStop`, by name), stopped while it is on its way, and let go only by a read of the record that BEGAN after the loss and came back good.
