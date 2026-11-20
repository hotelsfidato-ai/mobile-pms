# Testing on a phone — Expo Go from the PC (M-17)

The owner's route (20 Nov): the app runs from the PC in **Expo Go** on the phone. Nothing is uploaded
to Expo, no store, no over-the-air update (`expo-updates` is not installed). Every module the app
uses (SQLite, print, files, sharing, photo / file / date pickers) is part of Expo Go for SDK 57.

**Test against the local PMS, not the live hotels.** A phone that reaches the live API can take real
payments and change real settings. The local API on port 8860 uses the database `fidato_mobile`.

## Once: get the app onto the PC

The app's code now lives on GitHub in `hotelsfidato-ai/mobile-pms` (M-12), branch `main`.

```bash
# On the PC, Git Bash, in D:\fidato pms moblie - a fresh copy of the app next to the old folder
git clone https://github.com/hotelsfidato-ai/mobile-pms.git mobile-pms
```

```bash
# On the PC, Git Bash, in D:\fidato pms moblie\mobile-pms - the app's packages (exact versions from the lock)
npm ci
```

Later, to take the newest work:

```bash
# On the PC, Git Bash, in D:\fidato pms moblie\mobile-pms
git pull && npm ci
```

## Each time: start the API, then Expo

1. The PMS's API for the app, port 8860, database `fidato_mobile` — the command in `docs/PLAN.md`
   § 9 (Git Bash, in `D:\fidato pms moblie\api`). Never start or stop the PostgreSQL on 55432 (it
   belongs to the PMS's main chat).
2. Expo, port 8081, its own Metro cache, the PC's address on the Wi-Fi:

```bash
# On the PC, Git Bash, in D:\fidato pms moblie\mobile-pms - Expo for the phone on the same Wi-Fi
TEMP='D:\fidato pms moblie\.local\metro-tmp' TMP='D:\fidato pms moblie\.local\metro-tmp' EXPO_PUBLIC_API_URL=http://192.168.1.33:8860 npx expo start --lan --port 8081
```

   To sign in with real accounts instead of the development sign-in, also give the owner's public
   Firebase settings on the same line (`EXPO_PUBLIC_FIREBASE_API_KEY`, `…_AUTH_DOMAIN`,
   `…_PROJECT_ID`, `…_APP_ID`; M-10). They come from the owner, never from any `.env`.

3. **Warm both phone bundles before opening it on the phone** (MEMORY 1): open these two addresses
   in the PC's browser and wait until each finishes loading:
   `http://localhost:8081/node_modules/expo-router/entry.bundle?platform=android&dev=true`
   `http://localhost:8081/node_modules/expo-router/entry.bundle?platform=ios&dev=true`
4. On the phone (same Wi-Fi): install **Expo Go** from the Play Store or the App Store, then scan
   the QR code Expo prints (iPhone: with the Camera app), or open `exp://192.168.1.33:8081`.

## What to try first (each role)

- Sign in; the menu for the role; the Dashboard's figures; pull down to read again.
- A payment on a test stay; turn the Wi-Fi off just after tapping Pay, turn it on, and see "Not
  known whether it was taken" and the screen stop until it reads again (MEMORY 16, 22).
- An export: PDF, Excel and Print from a report.
- A photo: a hotel logo or a deposit slip (the phone asks for photos permission once).
- A date: a holiday, a tax band, a reminder — the phone's own date picker.
- The night audit's close: **only after the owner has looked** (HANDOVER).

Write what you see into the module's `DEFECTS.md` (the screen, the role, the phone, iPhone or
Android). The test build for installing without Expo Go (EAS, M-8) waits for the owner's yes.
