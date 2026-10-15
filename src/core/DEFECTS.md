# core — defects (MCORE-)

Every defect found in the core (`app/`, `src/core/*`, `package.json`, `app.json`), numbered
**MCORE-1, MCORE-2 …** (AGENTS.md). Each entry: what happened, how it was found, what was done about
it, and the rule it leaves. Fixed entries stay.

---

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
