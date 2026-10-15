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

**Next, in order** (slice 2, housekeeping)
1. Core (the mobile chat): install M-4's packages; slice 1 onto `expo-router` and react-query with
   no change in what it does; then icons and Inter; then the outbox on `expo-sqlite` (Opus).
2. `src/modules/housekeeping/MODULE.md` from the web twin; every difference shown to the owner.
3. The housekeeping screens by a helper in its own copy (AGENTS.md).

**Questions waiting for the owner:** none. PLAN § 8, 1-3 answered 15 Oct: all as recommended (M-4).

---

## 14 October — the mobile chat's handover to the PMS's main chat

`docs/briefs/mobile-app-handover.md` (one folder up): state, proofs, how to run and stop, traps,
next slices, and the paste-ready notes written for a merge that the owner has since ruled out (M-2).
