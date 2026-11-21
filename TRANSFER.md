# Transfer — taking the newest Fidato Mobile onto the PC

**For the owner and the PC's mobile chat (21 Nov 2026).** The app was built in a cloud session from
4 to 20 Nov (M-12). Everything is on GitHub: **`hotelsfidato-ai/mobile-pms`, branch `main`**. This
file says how to bring it onto the PC, check it, and run it on a phone. Every command says where it
runs.

## What you are getting

- **Every screen of the 16 Nov website on the phone:** reports, admin, and the whole Settings
  console (M-13). The repository has 181 screen files.
- **Exports:** PDF, Excel (CSV) and Print (M-14).
- **The phones' own camera, photo, file and date pickers** everywhere the website uploads, imports,
  downloads or picks a date (M-16, M-18).
- **One rule for every write:** a write whose outcome is unknown is never sent twice (MEMORY 16, 22,
  24).
- **Nothing automatic (M-17):** no over-the-air updates, no store.
- **Not done yet:** nothing has been opened on a phone or run against an API. That is the PC's first
  job, below.

## 0 · Before you start (once)

- **Node 22** (the cloud used 22.23.4 with npm 10.9.9) and **Git for Windows** (Git Bash).
- **Expo Go** on the phone, from the Play Store or the App Store. The phone and the PC must be on the
  same Wi-Fi.
- **The PMS the app talks to must be the 16 Nov release** (PMS commit `c9394cb`) or newer. The app
  was built against it. The PC's API worktree (`D:\fidato pms moblie`) and its database
  `fidato_mobile` are older (early November).
  - **Ask the PMS's main chat** to bring that worktree's `api/` and `fidato_mobile`'s migrations up to
    the 16 Nov release.
  - The mobile chat never changes the PMS's `api/`, `db/` or `src/` (CLAUDE.md).
  - Never start or stop the PostgreSQL on 55432: it belongs to the main chat. Every database run goes
    through `D:\fidato pms\.local\dbq.sh`.
- **Never read, copy or commit any `.env`.** The app's public settings (the API address and the
  Firebase public values) are typed on the command line (step 4).

## 1 · Get the code (first time)

Keep the old `D:\fidato pms moblie\mobile` folder as it is (it is the PMS worktree's old branch
`mobile/app`). Put the new copy next to it:

```bash
# On the PC, Git Bash, in D:\fidato pms moblie - a fresh copy of the app from GitHub
git clone https://github.com/hotelsfidato-ai/mobile-pms.git mobile-pms
```

```bash
# On the PC, Git Bash, in D:\fidato pms moblie\mobile-pms - the exact packages from the lock file
npm ci
```

From now on the app lives in **`D:\fidato pms moblie\mobile-pms`**. CLAUDE.md and the older notes
say `…\mobile`: read them as `…\mobile-pms`.

## 2 · Later: take the newest copy

```bash
# On the PC, Git Bash, in D:\fidato pms moblie\mobile-pms - newest main and its packages
git checkout main && git pull && npm ci
```

## 3 · Check the copy before opening it

```bash
# On the PC, Git Bash, in D:\fidato pms moblie\mobile-pms - types, every check, both phone bundles, routes
bash scripts/gates.sh
```

It ends with **ALL GATES GREEN** (the cloud's last run was on `3337891`). If it does not, stop and
write what it said into `MEMORY.md`.

## 4 · Run it on the phone (Expo Go)

The full steps are in **`docs/TESTING.md`**. In short:

1. Start the PMS's API for the app on port 8860, database `fidato_mobile`, with the command in
   `docs/PLAN.md` § 9 (Git Bash, in `D:\fidato pms moblie\api`).
2. Start Expo:

```bash
# On the PC, Git Bash, in D:\fidato pms moblie\mobile-pms - Expo on the Wi-Fi, its own Metro cache
TEMP='D:\fidato pms moblie\.local\metro-tmp' TMP='D:\fidato pms moblie\.local\metro-tmp' EXPO_PUBLIC_API_URL=http://192.168.1.33:8860 npx expo start --lan --port 8081
```

   - For real sign-in, add the owner's four public Firebase values on the same line (M-10):
     `EXPO_PUBLIC_FIREBASE_API_KEY`, `…_AUTH_DOMAIN`, `…_PROJECT_ID` and `…_APP_ID`.
   - Without them, the development sign-in works against the local API.
3. **Warm both phone bundles first** (MEMORY 1). Open each address in the PC's browser and wait until
   it finishes:
   - `http://localhost:8081/node_modules/expo-router/entry.bundle?platform=android&dev=true`
   - `http://localhost:8081/node_modules/expo-router/entry.bundle?platform=ios&dev=true`
4. On the phone, scan Expo's QR code (on an iPhone, with the Camera app), or open
   `exp://192.168.1.33:8081` in Expo Go.

**Test against the local PMS only, never the live hotels.** Without `EXPO_PUBLIC_API_URL` the app
points at `https://api.fidatohotels.com`, which is real money.

## 5 · What to look at first

Use each role in turn:

- **The basics:** sign in, the menu, the Dashboard, and pull down to read again.
- **Unknown outcome:** take a payment on a test stay, turn the Wi-Fi off just after tapping Pay, then
  turn it on.
  - The screen should say "Not known whether it was taken".
  - It should stay locked until a fresh read.
- **An export:** PDF, Excel and Print from a report.
- **A photo:** a hotel logo, a gallery photo (taken with the camera, then shrunk), and a deposit slip.
- **A date:** a holiday, a tax band, or a reminder.
- **The night audit's close:** only after the owner has looked.

Write each fault into its module's `DEFECTS.md`: the screen, the role, the phone, and iPhone or
Android. Number each mistake in `MEMORY.md`.

## 6 · Where to read next (the PC's mobile chat)

1. `CLAUDE.md`, then `AGENTS.md`.
2. `HANDOVER.md`: its top block says where everything stands.
3. `DECISIONS.md` M-1 to M-18. The newest decisions:
   - M-13: every screen.
   - M-14: exports.
   - M-15: confirm before switching a module off.
   - M-16: pickers.
   - M-17: Expo Go, nothing automatic.
   - M-18: photo shrinking.
4. `CHANGELOG.md`, the newest entries first.
5. `docs/STATUS.md`, `docs/NATIVE.md`, `docs/PICKERS.md`, `docs/TESTING.md`.
6. `docs/api-requests.md`: R-1 to R-50 for the PMS's main chat.
   - R-32 to R-50 are new.
   - The most important ones ask the server to accept an idempotency key on deposits, payments,
     imports and uploads.

## 7 · Still waiting for the owner

- **An installable test build (EAS, M-8).** It needs the owner's yes and Expo account. Until then,
  test in Expo Go.
- **Connecting the live PMS.** This means `EXPO_PUBLIC_API_URL` and the Firebase public values
  (M-10). Nothing else in the app changes.
- **Taking R-32 to R-50 to the PMS's main chat.**
