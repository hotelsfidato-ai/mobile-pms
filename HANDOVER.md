# Handover — Fidato Mobile

**Read the top block to the end before your first write.** Newest block first.

---

## 15 October 2026 — read this first

**Where it stands**
- A **separate system** (M-2), rebuilt natively for phones with React Native + Expo (M-3). Rules:
  `CLAUDE.md`; working agreement: `AGENTS.md`; decisions: `DECISIONS.md` (M-1 to M-6); plan:
  `docs/PLAN.md`.
- **Slice 1** (the owner's figures) approved on the phone. **Slice 2** (housekeeping: Rooms, Report a
  repair, Out of service) **built and merged** into `mobile/app` by three Opus helpers (M-6); its
  core (writes with the key from the first tap, the offline queue, the held bar, Inter, icons) too.
  `bash scripts/gates.sh` ALL GATES GREEN on the merge. **Not yet seen on a phone.**
- The web's own faults found on the way: `docs/api-requests.md` R-1 to R-9, for the owner to take
  to the PMS's main chat.
- **Running:** API 8860 (pid 26964, on `fidato_mobile`) and Expo 8081 (listener pid 6624, its own
  Metro cache, log `../.local/mobile-expo.log`); both phone bundles warm. Stop Expo (PowerShell, this
  PC): `taskkill /PID 44692 /T /F` (the listener's own `cmd` parent; killing the top Git Bash wrapper
  can leave the listener running), then check 8081 is free. The helpers' servers are stopped.
- **Left on the machine:** the scratch databases `fidato_mobile_hk`, `_hk2`, `_hk3` (the helpers'
  test writes); drop them through `D:\fidato pms\.local\dbq.sh` when no longer wanted.

**Who holds what**

| Module / core | Held by | Since |
|---|---|---|
| everything (core, reports, housekeeping) | the mobile chat | 15 Oct |

**Next, in order**
1. The owner's look at slice 2 on the phone (`exp://192.168.1.33:8081`, Expo Go, same Wi-Fi; sign in
   as Housekeeping, and as Owner → a property → "Needs cleaning"), and their changes.
2. The owner's answers below; then the build route decision (M-3: after slice 2) and slice 3, the
   restaurant waiter.

**Questions waiting for the owner** (asked 15 Oct, each with a recommendation; see MODULE.md
"Where the phone differs")
1. Dates on the phone: a day stepper on both forms (no package) or the native picker
   `@react-native-community/datetimepicker` 9.1.0 (SDK 57's). Recommended: the stepper.
2. A housekeeper's first chip on Rooms: Mine when they have rooms today (the web opens on All).
3. Safety differences from the web: ended blocks without Put back (R-7); "take out too" only for a
   room that is free and not already out; an end date at least the day after From (R-8).
4. The phone's own words and differences (MODULE.md 5-9; "IT" for the "it" kind).

---

## 14 October — the mobile chat's handover to the PMS's main chat

`docs/briefs/mobile-app-handover.md` (one folder up): state, proofs, how to run and stop, traps,
next slices, and the paste-ready notes written for a merge that the owner has since ruled out (M-2).
