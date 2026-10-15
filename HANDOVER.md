# Handover — Fidato Mobile

**Read the top block to the end before your first write.** Newest block first.

---

## 15 October 2026 — read this first

**Where it stands**
- A **separate system** (M-2), rebuilt natively for phones with React Native + Expo (M-3). Rules:
  `CLAUDE.md`; working agreement: `AGENTS.md`; decisions: `DECISIONS.md`; plan: `docs/PLAN.md`.
- **Slice 1 approved:** the owner looked at it on the phone on 15 Oct, "it's good".
- **PLAN § 10 steps 1-3 done:** slice 1 is in the module layout (`src/core`, `src/modules/reports`
  with `MODULE.md` / `DEFECTS.md`, `7a8a4267`); `bash scripts/gates.sh` exists and is ALL GATES
  GREEN on `ec5cfe17`; MCORE-1 (test people's names in the release bundle) fixed.
- **Not proved on a device:** Android's back button, the notch edges (the owner's look was overall).
- **Running when this was written:** API 8860 (pid 26964) and Expo 8081 (pid 44876); both phone
  bundles warm. The browser pane has a tab on `localhost:8081` (the Expo web preview).

**Who holds what**

| Module / core | Held by | Since |
|---|---|---|
| everything | the mobile chat | 15 Oct |

**Next, in order** (docs/PLAN.md § 10)
1. The owner's answers to PLAN § 8 decisions 1-3 (asked 15 Oct, below); record them as M-4 …
2. Write `src/modules/housekeeping/MODULE.md` from the web twin; then slice 2, housekeeping, with
   the outbox (Opus), by a helper in its own copy (AGENTS.md).

**Questions waiting for the owner** (asked 15 Oct, each with a recommendation; versions are SDK 57's
or the last release before 1 Oct)
1. Navigation: `expo-router` ~57.0.26 (with `expo-linking` ~57.0.12, `expo-constants` ~57.0.21,
   `react-native-screens` ~4.26.0). Recommended.
2. Data cache: `@tanstack/react-query` 5.104.0 (the PMS's own). Recommended.
3. Offline queue storage: `expo-sqlite` ~57.0.4 (recommended) or async-storage 2.2.0.
4. Icons and font: `lucide-react-native` 1.49.0 + `react-native-svg` 15.15.4; Inter by
   `expo-font` ~57.0.4 + `@expo-google-fonts/inter` 0.4.2. Recommended with slice 2.

---

## 14 October — the mobile chat's handover to the PMS's main chat

`docs/briefs/mobile-app-handover.md` (one folder up): state, proofs, how to run and stop, traps,
next slices, and the paste-ready notes written for a merge that the owner has since ruled out (M-2).
