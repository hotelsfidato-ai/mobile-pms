# core — defects (MCORE-)

Every defect found in the core (`app/`, `src/core/*`, `package.json`, `app.json`), numbered
**MCORE-1, MCORE-2 …** (AGENTS.md). Each entry: what happened, how it was found, what was done about
it, and the rule it leaves. Fixed entries stay.

---

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
