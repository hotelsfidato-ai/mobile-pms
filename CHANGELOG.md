# Changelog — Fidato Mobile

One entry per working session, newest first: asked for · shipped · found · proved · left open ·
commits.

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
