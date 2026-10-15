# Handover — Fidato Mobile

**Read the top block to the end before your first write.** Newest block first.

---

## 15 October 2026 — read this first

**Where it stands**
- A **separate system** (M-2), rebuilt natively for phones with React Native + Expo (M-3). Rules:
  `CLAUDE.md`; working agreement: `AGENTS.md`; decisions: `DECISIONS.md`; plan: `docs/PLAN.md`.
- **Slice 1 approved** on the phone (15 Oct, "it's good"); now in the module layout and on
  `expo-router` + react-query (M-4), no change in what it does (`a6a26ba5`). `bash scripts/gates.sh`
  is ALL GATES GREEN on it; MCORE-1 fixed.
- **Slice 2 (housekeeping) decided (M-5)** and briefed: `src/modules/housekeeping/MODULE.md`.
  **Its core is built** (15 Oct): `send()` with the key from the first tap, the web's offline tiers
  and drain (`src/core/offline.ts`, checked), the queue on expo-sqlite (`outbox.ts`), the held bar,
  the Housekeeping and Reception test people, Inter and lucide icons. Proved on the real API from
  the preview; **not yet on a phone**, and `send()`'s held path waits for the first screen. The
  screens are not built. The web's own faults: `docs/api-requests.md` R-1 to R-5, for the owner to
  take to the PMS's main chat.
- **Not proved on a device:** Android's back button, the notch edges (the owner's look was overall);
  the router build has been opened only in the 375 × 812 preview, not yet on the phone.
- **Running when this was written:** API 8860 (pid 26964, untouched) and Expo 8081 (restarted for
  the router: pid 35748 under a Git Bash wrapper; log `../.local/mobile-expo.log`); both phone
  bundles warm. Stop Expo by its whole tree (PowerShell, this PC): `taskkill /PID 34616 /T /F` (the
  Git Bash wrapper; then check 8081 is free).

**Who holds what**

| Module / core | Held by | Since |
|---|---|---|
| core, reports, everything else | the mobile chat | 15 Oct |
| housekeeping: Rooms | Opus helper "rooms": `.claude/worktrees/housekeeping`, `mobile/housekeeping`; Expo 8082, API 8861 (pid 31984) on `fidato_mobile_hk` | 15 Oct |
| housekeeping: Report a repair | Opus helper "repair": `.claude/worktrees/hk-repair`, `mobile/hk-repair`; Expo 8083, API 8862 (pid 42108) on `fidato_mobile_hk2` | 15 Oct |
| housekeeping: Out of service | Opus helper "block": `.claude/worktrees/hk-block`, `mobile/hk-block`; Expo 8084, API 8863 (pid 24180) on `fidato_mobile_hk3` | 15 Oct |

**Next, in order** (slice 2, housekeeping)
1. The screens (Rooms, Report a repair, Out of service) by a helper in its own copy (AGENTS.md),
   Sonnet for the screens, from `src/modules/housekeeping/MODULE.md` ("What the core gives the
   screens"); the mobile chat adds the routes (a housekeeper lands on Rooms), reviews (Opus for the
   held path) and merges.
2. The owner's look on the phone: Inter, the held bar, then slice 2's screens; then slice 3.

**Questions waiting for the owner:** none (M-4 and M-5 answered 15 Oct).

---

## 14 October — the mobile chat's handover to the PMS's main chat

`docs/briefs/mobile-app-handover.md` (one folder up): state, proofs, how to run and stop, traps,
next slices, and the paste-ready notes written for a merge that the owner has since ruled out (M-2).
