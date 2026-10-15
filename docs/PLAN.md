# Fidato Mobile — the native rebuild plan (15 October 2026)

**Status:** planned with the owner (M-1, M-2, M-3). Slice 1 is built; nothing else is started.
Every "the owner decides" below is asked when its slice comes, with a recommendation.

## 1 · What is being built

The Fidato PMS, rebuilt for phones as **real installed apps for Android and iPhone** from **one
React Native + Expo code base** (M-3), for **every role**, the work done away from a desk first.
It is a **separate system** (M-2): its own folder, branch, chat, rules, decisions, defects and
releases. It uses the PMS's live API and accounts; it has no server or database of its own.

## 2 · Architecture

```
Phone (Android / iPhone)
 └─ the app (Expo SDK 57 · React Native 0.86.3 · React 19.2.3 · TypeScript)
     ├─ core/        api client · sign-in · outbox (offline queue) · storage · theme · ui · navigation
     └─ modules/     one per PMS service: screens · data calls · ported rules
            │  HTTPS, the signed-in person's Firebase token on every call
            ▼
   the PMS API  (api.fidatohotels.com; local: 8860 on fidato_mobile)  →  PostgreSQL (rights enforced there)
```

| Part | Plan | Decided? |
|---|---|---|
| Language and framework | TypeScript, React Native, Expo SDK 57 | ✅ M-1 |
| Screens and layout | Fidato tokens and Type Ladder from the PMS's `theme.css` (`core/theme.ts`, done) | ✅ |
| Navigation | `expo-router` (Expo's own, file-based) instead of slice 1's hand-made screen switch | owner, before slice 2 |
| Reading data | A small shared cache with the hotel in every key; `@tanstack/react-query` (the PMS uses it) | owner, before slice 2 |
| Writing offline | The web's rules ported (`src/lib/offline.ts`, `outbox.ts`): tiers, idempotency keys, first in first out | ✅ M-1 |
| Phone storage for the queue | `expo-sqlite` (an ordered, durable queue) — or `@react-native-async-storage/async-storage` | owner, at slice 2 |
| Sign-in | Firebase Auth with the same accounts; the JavaScript SDK first (works in Expo Go); token kept with `expo-secure-store` | owner, its own slice |
| Icons and font | `lucide-react-native` + `react-native-svg` (the PMS's icon family); Inter by `expo-font` | owner |
| Printing (KOT, bills) | Bluetooth / network printers need a development build and a printer library | owner, at the waiter slice |
| Camera (guest ID) | `expo-camera`, for the front desk's ID capture | owner, at the front desk slice |
| Push notifications | `expo-notifications` plus a PMS change to send them | owner, later; a PMS request |

**Rules carried over:** the API decides rights; a blocked action is disabled with its reason; a dash,
never a zero; the hotel in every request and cache key; dev sign-in only in development builds.

## 3 · The rebuild order: every PMS service, phone-suited first

Each slice: **one role, 2-3 screens, shown running to the owner before the next starts** (M-1).
Times are building-and-testing estimates for one helper, before the owner's look.

**Tier 1 · daily work away from a desk (in this order):**

| Slice | Role | PMS services | Phone screens | Writes / offline | Effort |
|---|---|---|---|---|---|
| 1 ✅ | Owner, GM | reports | Sign in (dev), All properties, Dashboard | read only | done |
| 2 | Housekeeping | housekeeping, guest-services (repairs) | My rooms, mark clean/dirty/inspected, raise a repair | first writes; **the outbox is built here** | 4-6 days |
| 3 | Restaurant waiter | pos | Tables, order pad, KOT to the kitchen, charge to a room | money: Opus; printing | 5-8 days |
| 4 | Reception | front-desk, finance, reservations | Arrivals, in house, check in, settle, check out | money and permissions: Opus; settlement refused offline | 6-9 days |
| 5 | Real sign-in | core | Firebase sign-in, stay signed in, sign out, switch hotel | the owner's yes to read live data | 2-3 days |
| 6 | Kitchen | pos (kitchen) | The pass: KOTs in, ready, served | live updates | 2-4 days |
| 7 | Maintenance | equipment, guest-services | Work orders: mine, start, done, cost | writes | 2-3 days |
| 8 | Guest services | guest-services, online-checkin (desk side) | Requests, replies, wake-up calls | writes | 2-3 days |

**Tier 2 · managers on the move (one slice each, 1-3 days):** approvals and credit-limit allowances
(GM) · reservations (new booking, calendar) · rates quick change (inventory) · night audit (GM: the
checklist and close, after the owner's yes) · laundry · spa diary · banquet diary · stores (counts,
issues) · purchasing (approve, receive) · guests and companies (look up) · loyalty (look up) · CRS
bookings · reviews (reputation) · revenue view and rivals' prices (revenue-management, market-rates)
· guest messages and connection health (view).

**Tier 3 · desk and set-up work: last, or kept on the web (the owner decides each):** admin
(people, roles, properties) · the Settings console · accounting export · marketing lists · the
channel manager set-up · contracts · room systems (door locks) · online payments set-up · leads.
The guest's own check-in page stays on the web: the app is for staff.

**Rough total:** Tier 1 about 6-9 weeks; Tier 2 about 4-6 weeks; Tier 3 decided later. These are
estimates for steady work with helpers in parallel where modules do not touch the same core.

## 4 · How each module is built

1. The mobile chat writes the module's `MODULE.md`: the web twin's screens, endpoints and rules,
   and what the phone version keeps, drops or changes (each difference shown to the owner).
2. A helper builds it in its own copy (AGENTS.md), ports the rules with the source named, adds the
   module's checks, and opens every screen on a phone or the preview.
3. The mobile chat reviews (Opus for money, permissions, the outbox), runs the gates, merges into
   `mobile/app`, recycles the copy, and shows the owner on the phone.
4. Anything the API lacks becomes a request in `docs/api-requests.md` for the PMS.

## 5 · Quality and defects (the PMS's system, mirrored)

| PMS | Mobile |
|---|---|
| `CLAUDE.md`, `AGENTS.md`, `HANDOVER.md`, `CHANGELOG.md` | the same four in `mobile/` |
| decisions D-numbers | `mobile/DECISIONS.md`, **M-1, M-2 …** |
| `MEMORY.md`, numbered mistakes | `mobile/MEMORY.md`, numbered |
| `src/modules/<x>/DEFECTS.md`, prefixes HK-, POS-, FD- | `mobile/src/modules/<x>/DEFECTS.md`, prefixes **MHK-, MPOS-, MFD- …**, core **MCORE-** |
| `scripts/gates.sh`, the release script | `mobile/scripts/gates.sh` (§ 6), a mobile release checklist (§ 7) |
| the definition of done per screen | AGENTS.md, with offline and accessibility added |
| the manual moves with the screen (D27-293) | the owner decides whether the app gets its own manual chapters before staff use it |

## 6 · Testing

- **Gates** (`mobile/scripts/gates.sh`, the mobile chat's first build): the type check; every
  `*.check.ts` (pure rules: figures, offline tiers, money arithmetic); both phone bundles exported;
  a **"no dev sign-in in a release build"** check, ported from the PMS's `check-no-dev-login`.
- **Against a running API** (`*.live.ts`): every read a screen makes answers for each role that uses
  it, and the figures equal the web's for the same hotel and day.
- **On devices**: each slice opened on an Android phone and an iPhone (Expo Go now, a development
  build once native pieces arrive), at small and large sizes, in light and dark.
- **A test framework** (jest-expo and React Native Testing Library, or Maestro for whole flows) is a
  new package: the owner decides when screens grow past what `*.check.ts` can hold (recommended at
  slice 3, the first money screens).

## 7 · Build and production

**Stages:** Expo Go (now) → a **development build** (needed once printing, the camera or
`expo-sqlite` arrive) → **internal test builds** to a few staff phones → **store releases**.

**Two routes for the builds (decided after slice 2, M-3):**

| | Expo's cloud builds (EAS) | Building on this PC |
|---|---|---|
| Android | ✅ | ✅ after installing the Android tools and a JDK (several GB) |
| iPhone | ✅ without a Mac | ❌ needs a Mac |
| Code leaves this machine | **yes**: needs the owner's explicit yes (19 Sep rule) | no |
| Cost | free tier, then paid plans by build count | free, slower |

**What the owner sets up when the time comes:** a Google Play Console account (one-time fee) and an
Apple Developer account (yearly fee); the app's name (the product-name work, e.g. Kyadou, is still
open), its icon and splash, its store listing and privacy policy. **The signing keys stay with the
owner, never in git.**

**Updates:** store releases only, or also **over-the-air updates** (EAS Update: small fixes without a
store review; code leaves the machine: the owner's yes).

**The release checklist (mirrors the PMS's release script):** the gates green on the exact commit;
version and build number raised; the release build points at the live API, carries no dev sign-in
and only the public sign-in settings; `CHANGELOG.md` entry; the owner's steps, each labelled with
where it runs; a test build on two phones before the store.

**Security and privacy:** no secret is ever in the app (only Firebase's public settings); the
sign-in token in the phone's secure store; guest data cached as little as possible and cleared on
sign-out; the offline queue cleared once sent; India's DPDP Act as the PMS follows it. **Crash
reporting** (e.g. Sentry) sends data to a third party: the owner decides, after store release.

## 8 · Open decisions (asked at their slice, each with a recommendation)

1. Navigation `expo-router`; data cache `@tanstack/react-query` — before slice 2 (recommended: yes).
2. Phone storage for the offline queue: `expo-sqlite` — at slice 2 (recommended).
3. Icons `lucide-react-native` + `react-native-svg`; Inter by `expo-font` — any time (recommended).
4. Real sign-in: Firebase's JavaScript SDK; trying it reads live data with the owner's account — its
   slice (recommended after slice 4).
5. Printers for KOT and bills — slice 3. 6. Camera for guest IDs — the front desk.
7. The production route and store accounts — after slice 2. 8. Over-the-air updates. 9. Crash
reporting. 10. Push notifications (a PMS change). 11. A manual for the app. 12. The app's name and
icon (with the product-name decision).

## 9 · Running it (this PC)

```bash
# Git Bash, in D:\fidato pms moblie\api - the PMS's API for the app, port 8860, database fidato_mobile
DATABASE_URL="postgres://pms_app:CHANGE_ME_app@127.0.0.1:55432/fidato_mobile" PORT=8860 NODE_ENV=development ALLOW_DEV_AUTH=1 DB_POOL_MAX=5 CORS_ORIGIN="http://localhost:8081" node_modules/.bin/tsx src/server.ts

# Git Bash, in D:\fidato pms moblie\mobile - Expo, port 8081 (do not set CI=1)
EXPO_PUBLIC_API_URL=http://192.168.1.33:8860 npx expo start --lan --port 8081
```

Then warm both phone bundles (MEMORY 1); the owner opens `exp://192.168.1.33:8081` in Expo Go on the
same Wi-Fi. `CHANGE_ME_app` is the local scripts' default password, not a secret. Rebuilding
`fidato_mobile`: `docs/briefs/mobile-app-handover.md` § 5 (one folder up).

## 10 · The mobile chat's first steps

1. **The owner's look at slice 1 on the phone** — nothing else starts before it (M-1).
2. Move slice 1 into the module layout (`src/core`, `src/modules/reports`) with no change in what it
   does; write `MODULE.md` and an empty `DEFECTS.md` for it.
3. Build `mobile/scripts/gates.sh` and the "no dev sign-in" check.
4. Ask decisions 1-3 (§ 8); then slice 2, housekeeping, with the outbox (Opus).
