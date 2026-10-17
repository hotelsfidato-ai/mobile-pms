# Fidato Mobile — every slice, its copy, its screens, and what happens on a failure

Kept by the mobile chat; brought up to date at every merge. Each slice is built by one helper in
**its own copy** (a git worktree under `D:\fidato pms moblie\.claude\worktrees\`, its own branch,
its own scratch database, its own ports), and merged into `mobile/app` by the mobile chat after
review and green gates.

## Screens, at a glance (17 Oct)

| | Screens | |
|---|---|---|
| ✅ Merged, seen on the owner's phone | **6** | Sign in (development) · All properties · Dashboard · Rooms · Report a repair · Out of service |
| 🔨 Written and committed in their copies, not yet gated or merged | **3** | Tables · Order pad (with a dish's sheet) · The order (with paying and printing in it) |
| ⏳ Tier 1, assigned to a copy, not started | **12** | Arrivals · In house · Walk-in · Check-in · A stay's bill and check-out · Kitchen · Work orders · Guest requests · A request · Wake-up calls · Online check-ins (desk) · The menu (every role's list of its screens) |
| ⏳ Tier 1, being built (M-10) | **2** | Real sign-in (email and password) · Switch hotel — slice 5; the owner's public sign-in settings to come |
| ⏳ Tier 2, planned (one copy each, in waves) | **15** | below |
| ◻ Tier 3, desk set-up: kept on the website unless the owner says otherwise | 9 | below |

**Tier 1 (staff work away from a desk): 6 of 23 screens merged (26%); 9 of 23 written (39%).**
**Tiers 1 and 2: 6 of 38 merged (16%); 9 of 38 written (24%).**

## Tier 1 — every slice, its copy

| Slice | Screens | Copy · branch | DB · API · Expo | Status |
|---|---|---|---|---|
| 1 Owner's figures | Sign in (dev), All properties, Dashboard | merged | `fidato_mobile` · 8860 · 8081 | ✅ owner's look: "it's good" |
| 2 Housekeeping | Rooms, Report a repair, Out of service | merged | — | ✅ owner's look: "it's good" |
| 3 Waiter | Tables + the pad | `pos-tables` · `mobile/pos-tables` | `_hk` · 8861 · 8082 | 🔨 `7d8b6cd1`, gates not run |
| 3 Waiter | The order | `pos-order` · `mobile/pos-order` | `_hk2` · 8862 · 8083 | 🔨 `fea11afd`, gates not run |
| 3 Waiter | Paying, printing (in the order) | `pos-pay` · `mobile/pos-pay` | `_hk3` · 8863 · 8084 | 🔨 `a2f82310`, gates not run |
| 4a Reception | Arrivals, In house, Walk-in, Check-in | `front-desk` · `mobile/front-desk` | `_desk` · 8864 · 8085 | ⏳ restarting |
| 4b Reception money | A stay's bill, payments, check-out | `folio` · `mobile/folio` | `_folio` · 8865 · 8086 | ⏳ restarting |
| 5 Real sign-in | Sign in, Switch hotel | `signin` · `mobile/signin` | `_signin` · 8869 · 8090 | ⏳ started 17 Oct (M-10); the owner's public settings to come |
| 6 Kitchen | Kitchen | `kitchen` · `mobile/kitchen` | `_kitchen` · 8866 · 8087 | ⏳ restarting |
| 7 Maintenance | Work orders | `maintenance` · `mobile/maintenance` | `_maint` · 8867 · 8088 | ⏳ restarting |
| 8 Guest services | Requests, a request, wake-up calls, online check-ins | `guest-services` · `mobile/guest-services` | `_gs` · 8868 · 8089 | ⏳ restarting |
| core | The menu: each role's screens, as the web's ☰ | the mobile chat, in `mobile/` | — | ⏳ after wave 2's routes exist |

## Tier 2 — managers on the move (one copy each, started as Tier 1 copies finish)

| Slice | Screen(s) | Copy (when made) |
|---|---|---|
| 9 | Approvals and credit-limit allowances | `t2-approvals` |
| 10 | Reservations: new booking, the calendar | `t2-reservations` |
| 11 | Rates: quick change | `t2-rates` |
| 12 | Night audit: the checklist and close (the owner's yes before it closes a real day) | `t2-night-audit` |
| 13 | Laundry | `t2-laundry` |
| 14 | Spa diary | `t2-spa` |
| 15 | Banquet diary | `t2-banquet` |
| 16 | Stores: counts and issues | `t2-stores` |
| 17 | Purchasing: approve, receive | `t2-purchasing` |
| 18 | Guests and companies: look up | `t2-guests` |
| 19 | Loyalty: look up | `t2-loyalty` |
| 20 | CRS bookings | `t2-crs` |
| 21 | Reviews | `t2-reviews` |
| 22 | Revenue view and rivals' prices | `t2-revenue` |
| 23 | Guest messages and connection health (view) | `t2-messages` |

**Tier 3, desk set-up (kept on the website unless the owner says otherwise):** people and roles,
properties, the Settings console, accounting export, marketing lists, the channel manager set-up,
contracts, door locks, online payments set-up, leads.

## How many run at once

The machine has 16 GB and little to spare: a helper's API and Expo (with its bundler) take about
1 GB while it previews. So **every Tier 1 helper codes at the same time**, but **only one previews at
a time** (`../.local/mobile-preview.lock`) and **only one runs the gates at a time**
(`../.local/mobile-gates.lock`). Tier 2 copies are made as Tier 1 copies merge.

## When a helper fails (it happened on 16 Oct: every helper stopped at once)

1. **Nothing committed is lost.** A helper commits after each screen (the wave rules), so its branch
   holds its work; `git -C <copy> log mobile/app..HEAD` and `git status` show where it stopped,
   and `<copy>/.local/progress.txt` says what it was doing.
2. **Locks:** a lock whose holder is gone is removed by the mobile chat (`what` names the holder and
   the time); the gate lock is never removed while a `gates.sh` is running.
3. **Servers:** a stopped helper's API and Expo are found by port and stopped by the mobile chat.
4. **Resume:** the same helper is resumed with its own context (a message to it), told what is on
   disk; if that fails, a fresh helper is sent to the same copy with the same brief plus "continue
   from the commits on your branch".
5. **Merge only what passed:** a branch merges only after its gates are green on its own commit and
   the mobile chat's review (Opus for money, permissions and the offline path).
