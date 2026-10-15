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
  `bash scripts/gates.sh` ALL GATES GREEN on the merge. **The owner looked at it on the phone on
  15 Oct: "it's good".**
- The web's own faults found on the way: `docs/api-requests.md` R-1 to R-9, for the owner to take
  to the PMS's main chat.
- **Running:** API 8860 (pid 26964, on `fidato_mobile`) and Expo 8081 (listener pid 6624, its own
  Metro cache, log `../.local/mobile-expo.log`); both phone bundles warm. Stop Expo (PowerShell, this
  PC): `taskkill /PID 44692 /T /F` (the listener's own `cmd` parent; killing the top Git Bash wrapper
  can leave the listener running), then check 8081 is free. The helpers' servers are stopped.
- **Left on the machine:** the scratch databases `fidato_mobile_hk`, `_hk2`, `_hk3` (the helpers'
  test writes); drop them through `D:\fidato pms\.local\dbq.sh` when no longer wanted.

**Who holds what** (memory is short: a helper starts its own API and Expo only under `../.local/mobile-preview.lock`, one at a time, and stops both when it releases it)

| Module / core | Held by | Since |
|---|---|---|
| everything (core, reports, housekeeping) | the mobile chat | 15 Oct |
| pos: Tables and the order pad | Opus helper "tables": `.claude/worktrees/pos-tables`, `mobile/pos-tables`; Expo 8082, API 8861 (pid 28236) on `fidato_mobile_hk` | 15 Oct |
| pos: the order | Opus helper "order": `.claude/worktrees/pos-order`, `mobile/pos-order`; Expo 8083, API 8862 (pid 27776) on `fidato_mobile_hk2` | 15 Oct |
| pos: paying and printing | Opus helper "pay": `.claude/worktrees/pos-pay`, `mobile/pos-pay`; Expo 8084, API 8863 (pid 33524) on `fidato_mobile_hk3` | 15 Oct |
| front-desk (slice 4a: arrivals, check-in, in house, walk-ins) | Opus helper "desk": `.claude/worktrees/front-desk`, `mobile/front-desk`; Expo 8085, API 8864 on `fidato_mobile_desk` | 15 Oct |
| finance (slice 4b: a stay's bill, payments, check-out) | Opus helper "folio": `.claude/worktrees/folio`, `mobile/folio`; Expo 8086, API 8865 on `fidato_mobile_folio` | 15 Oct |
| pos: the kitchen (slice 6) | Opus helper "kitchen": `.claude/worktrees/kitchen`, `mobile/kitchen`; Expo 8087, API 8866 on `fidato_mobile_kitchen` | 15 Oct |
| housekeeping: work orders (slice 7, maintenance) | Opus helper "maintenance": `.claude/worktrees/maintenance`, `mobile/maintenance`; Expo 8088, API 8867 on `fidato_mobile_maint` | 15 Oct |
| guest-services (slice 8) | Opus helper "guest services": `.claude/worktrees/guest-services`, `mobile/guest-services`; Expo 8089, API 8868 on `fidato_mobile_gs` | 15 Oct |

**Next, in order**
1. The build route is decided (M-8): Expo's cloud for both platforms, only `mobile/` uploaded, the
   owner's Expo account; store accounts at launch. Before the first build: the owner's account,
   `eas.json`, the app's identifier (with the product-name decision), and a dry check that the
   upload holds `mobile/` alone. The first build is a test build, when slice 3 needs one.
2. Slice 3, the restaurant waiter: the web's waiter work mapped (read-only helper), then its
   `MODULE.md` and its decisions (printing, money, offline) asked of the owner.

**Questions waiting for the owner:** none. The four of 15 Oct were answered as recommended (M-7)
and built (`babf162a`, gates green): a day stepper on both forms; a housekeeper opens on Mine
when they have rooms; ended blocks without Put back; "take out too" only for a free room not
already out; an end date at least the day after From; the phone's own words approved.

---

## 14 October — the mobile chat's handover to the PMS's main chat

`docs/briefs/mobile-app-handover.md` (one folder up): state, proofs, how to run and stop, traps,
next slices, and the paste-ready notes written for a merge that the owner has since ruled out (M-2).
