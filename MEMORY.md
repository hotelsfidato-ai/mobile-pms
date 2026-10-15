# Memory — the mobile app's mistakes, numbered

A mistake that would bite any module goes here, numbered. A defect in one module goes in that
module's `DEFECTS.md` instead. Read the newest first.

---

### 3 · Two decision lists, one number (14-15 Oct)

The mobile chat wrote the app's plan as "D27-321", saw the PMS take 321, renumbered it "D27-322" —
and the PMS had meanwhile used 322 too ("Add a property's message"). Two different decisions now
carry the same number in two places. **The rule:** the app's decisions are numbered **M-1, M-2 …**
in `mobile/DECISIONS.md` (M-2); the old "D27-322" on this branch is M-1.

### 2 · An interrupted npm install left a lock file that broke the type check (14 Oct)

`npm install` was stopped half-way; `package-lock.json` kept empty versions and a truncated
`csstype`, and `tsc` then failed inside `node_modules` with errors that looked like the app's.
**The rule:** when `tsc` fails inside `node_modules`, delete `mobile/node_modules` and
`mobile/package-lock.json` and install again, before touching the app's code.

### 1 · Expo Go sat on "loading" on the owner's first open (14 Oct)

The phone reached Metro (seen connected from 192.168.1.37), but the first phone bundle after an Expo
restart took **195 s** on a D: drive busy with other work, and Expo Go gave up first. Once built, the
bundle was served in 0.06 s. **The rule:** after any Expo start, request **both** phone bundles (the
manifest's `launchAsset.url`, with `expo-platform: android` and `ios`) and wait until each answers in
under a second **before** giving the owner the link.
