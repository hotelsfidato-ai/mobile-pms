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
- **Slice 2 (housekeeping) decided (M-5)** and briefed: `src/modules/housekeeping/MODULE.md`. Nothing
  of it built yet. The web's own faults found on the way: `docs/api-requests.md` R-1 to R-5, for the
  owner to take to the PMS's main chat.
- **Not proved on a device:** Android's back button, the notch edges (the owner's look was overall);
  the router build has been opened only in the 375 × 812 preview, not yet on the phone.
- **Running when this was written:** API 8860 (pid 26964, untouched) and Expo 8081 (restarted for
  the router: pid 35748 under a Git Bash wrapper; log `../.local/mobile-expo.log`); both phone
  bundles warm. Stop Expo by its tree: `taskkill /PID <cmd.exe parent of 35748> /T /F` (PowerShell).

**Who holds what**

| Module / core | Held by | Since |
|---|---|---|
| everything | the mobile chat | 15 Oct |

**Next, in order** (slice 2, housekeeping)
1. Core (the mobile chat, Opus): writes in `src/core/api.ts` (PUT/POST/DELETE, the idempotency key
   from the first tap); the outbox on `expo-sqlite`, ported from `src/lib/offline.ts` and
   `outbox.ts` (tiers, oldest first, 4xx kept as refused with Discard, entries per person); the
   housekeeping test people in the dev sign-in and in `check-no-dev-login.mjs`'s markers; icons and
   Inter (M-4). Each with its `*.check.ts`.
2. The screens (Rooms, Report a repair, Out of service) by a helper in its own copy (AGENTS.md),
   Sonnet for the screens; the mobile chat reviews and merges.
3. The owner's look on the phone, then slice 3.

**Questions waiting for the owner:** none (M-4 and M-5 answered 15 Oct).

---

## 14 October — the mobile chat's handover to the PMS's main chat

`docs/briefs/mobile-app-handover.md` (one folder up): state, proofs, how to run and stop, traps,
next slices, and the paste-ready notes written for a merge that the owner has since ruled out (M-2).
