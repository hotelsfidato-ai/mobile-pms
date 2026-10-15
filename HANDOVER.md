# Handover — Fidato Mobile

**Read the top block to the end before your first write.** Newest block first.

---

## 15 October 2026 — read this first

**Where it stands**
- A **separate system** (M-2), rebuilt natively for phones with React Native + Expo (M-3). Rules:
  `CLAUDE.md`; working agreement: `AGENTS.md`; decisions: `DECISIONS.md`; plan: `docs/PLAN.md`.
- **Slice 1 built** (the owner's figures: Sign in (dev) → All properties → Dashboard), branch
  `mobile/app`, commits `b0c575a1 … 8b99f4e2` plus the handover `7a4af7ee`. Figures equal the PMS's
  Manager Report on the demo; type check clean; opened at 375 × 812 in the preview.
- **Not yet proved:** the owner's look on the phone, Android's back button, the notch and status-bar
  edges on a real phone, rupee formatting on the device.
- **Running when this was written:** API 8860 (pid 26964) and Expo 8081 (pid 44876); both phone
  bundles warmed on 15 Oct (0.06 s).

**Who holds what**

| Module / core | Held by | Since |
|---|---|---|
| everything | the mobile chat | 15 Oct |

**Next, in order** (docs/PLAN.md § 10)
1. The owner's look at slice 1 on the phone (`exp://192.168.1.33:8081`, Expo Go, same Wi-Fi), and
   their changes.
2. Slice 1 into the module layout; `MODULE.md` / `DEFECTS.md` for reports.
3. `mobile/scripts/gates.sh` and the "no dev sign-in in a release build" check.
4. Decisions before slice 2: navigation, data cache, phone storage (PLAN § 8, 1-3).
5. Slice 2, housekeeping, with the outbox (Opus).

**Questions waiting for the owner:** none until the phone look.

---

## 14 October — the mobile chat's handover to the PMS's main chat

`docs/briefs/mobile-app-handover.md` (one folder up): state, proofs, how to run and stop, traps,
next slices, and the paste-ready notes written for a merge that the owner has since ruled out (M-2).
