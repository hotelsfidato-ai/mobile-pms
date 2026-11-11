# Fidato Mobile — every slice, its copy, its screens, and what happens on a failure

Kept by the mobile chat; brought up to date at every merge. Each slice is built by one helper in
**its own copy** (a git worktree under `D:\fidato pms moblie\.claude\worktrees\`, its own branch,
its own scratch database, its own ports), and merged into `mobile/app` by the mobile chat after
review and green gates.

## Screens, at a glance (4 Nov, after the cloud session; Tier 2 added the same day)

**All of Tier 1 is merged into `main`** (`b628aae`, ALL GATES GREEN on each merge commit): the nine
branches the helpers left on 31 Oct were finished in the cloud (M-12), one copy each, and merged.
**Nothing was opened on a screen** in the cloud (no API, no Expo there): every picture comparison
below is the code read against the picture (`reference/pms-shots/`), never seen running. The PC
opens them next.

| | Screens | |
|---|---|---|
| ✅ Matches its picture (only the phone's own rules differ: 44 px touch, Back until the frame, "On the website for now") | **13** | All properties · Dashboard · Rooms · Tables · Arrivals (Today, Upcoming) · In house (now, Due out) · Walk-ins record · Kitchen · Work orders · Guest requests · Wake-up calls · Lost property · Notifications |
| 🟠 Differences left, each listed in its MODULE.md | **1** | Walk-in (picture 14: no server quote for GST and Due, R-22). Resolved since: Guest messages is its own screen (Tier 2, slice 23); the menus' extra System entry is the web's development-only "Design system" (`01ed1a5`) |
| ⬜ No usable picture yet (built from the ported code) | **12** | Sign in · Report a repair · Out of service · The order (with paying, printing) · Order pad · A stay · Check in · Take a walk-in · A stay's bill and check-out · Online check-in (picture blank) · Guest services hub · the account menu (pictures never opened it) |
| ✅ Tier 2, merged 4 Nov (15 slices, built from today's PMS code) | **15** | below: every pictured first screen matches its picture |
| ◻ Tier 3, desk set-up: kept on the website unless the owner says otherwise | 9 | below |

**Tier 1: 28 screens on `main`. 13 match their pictures, 3 have differences left, 12
have no usable picture.** Real sign-in is built and waits for the owner's public settings (M-10).

## Tier 1 — every slice (all merged, 4 Nov)

| Slice | Screens | Merged | Picture match (4 Nov, by reading) |
|---|---|---|---|
| 1 Owner's figures | Sign in (dev), All properties, Dashboard | ✅ 15 Oct; re-matched `b628aae` | All properties, Dashboard match; each role lands on its picture's first screen (MRP-1) |
| 2 Housekeeping | Rooms, Report a repair, Out of service | ✅ 15 Oct; re-matched `b628aae` | Rooms matches; the two forms have no picture |
| 3 Waiter | Tables, the pad, the order (paying, printing) | ✅ `40f66e0` | Tables matches (round printer on a tile); pad and order: no picture |
| 4a Reception | Arrivals, In house, Walk-ins, Take a walk-in, Walk-in, a stay, Check in | ✅ `5e00ff1` | 04-08 match; walk-in 5 differences; stay and Check in: no picture here |
| 4b Reception money | A stay's bill, payments, check-out | ✅ `6ff663a` | no picture shows the bill |
| 5 Real sign-in | Sign in, staying signed in, sign-out | ✅ `99c6e42` | no picture; waits for the owner's settings |
| 6 Kitchen | Kitchen | ✅ `e90e524` | matches ("not live" until the live stream; Set up on the website) |
| 7 Maintenance | Work orders | ✅ `da301c3` | matches (Record the cost needs a picker package) |
| 8 Guest services | Hub, Requests, Wake-up calls, Lost property, Online check-in, Messages | ✅ `1ef35c3` | 3 of 6 match (only empty states pictured) |
| core | The frame: top bar, banner, each role's menu, notifications, account menu | ✅ `f908380` | Notifications matches; menus 6 of 11; account menus not pictured |

## Tier 2 — managers on the move (from today's PMS code, read in the cloud since 4 Nov)

**All of Tier 2 merged (4 Nov):** 15 slices, each reviewed (night audit, laundry and banquet by an independent second look), gates green on every merge; 15 of 15 pictured first screens match their pictures (by reading); nothing opened on a screen. A sweep brought the unknown-outcome rule (MEMORY 16) to every Tier 1 module (`fa07f58`).

| Slice | Screen(s) | Copy (when made) |
|---|---|---|
| 9 | Approvals (credit-limit allowances are asked at the write itself, not here) | ✅ merged 4 Nov, `48cd846` · picture 64 matches |
| 10 | Reservations: Calendar, All bookings, New booking | ✅ merged 4 Nov, `becd16b` · Calendar matches; All bookings and New booking follow today's code (2 Nov), newer than pictures 12 and 14 |
| 11 | Rates: set a price, close or open a day | ✅ merged 4 Nov, `963f46c` · pictures 27/28 match |
| 12 | Night audit: the checklist and the close (the owner looks before it closes a real day) | ✅ merged 4 Nov, `c68ff47` · picture 49 with differences (newer code, 2 Nov) |
| 13 | Laundry: dockets, collect a bag, a docket, charge to the room | ✅ merged 4 Nov, `03f02b5` · picture n-h-laundry matches |
| 14 | Spa diary: the day by therapist, book, cancel, charge to the room | ✅ merged 4 Nov, `2557f33` · picture n-h-spa matches |
| 15 | Banquet diary: register, a function, confirm, price, courses, advance, bill, settle, invoice | ✅ merged 4 Nov, `4c157c8` · picture n-h-banquet matches |
| 16 | Stores: the shelf, receive, issue, move, count, history; Inventory, Bar stock, Kitchen stock | ✅ merged 4 Nov, `cf04894` · pictures 31, n-h-inventory, n-pos-bar-stock match |
| 17 | Purchasing: ask, price, order, receive (decided in Approvals) | ✅ merged 4 Nov, `41487bf` · picture 34 matches |
| 18 | Guests, Companies and agents, Guest 360 (blacklist and offers marks) | ✅ merged 4 Nov, `693bafc` · pictures 15, 16, 19 match |
| 19 | Loyalty: in house, join, use points, leave, the rules, points by hotel; the member card on Guest 360 | ✅ merged 4 Nov, `022a53b` · picture n-h-loyalty matches |
| 20 | CRS bookings: each booking and what it became, Done; the connection card (owner, admin) | ✅ merged 4 Nov, `e8a7c62` · picture n-h-crs-bookings matches |
| 21 | Reviews: the review link, the departures, ask by WhatsApp or email (the web has no scores or replies) | ✅ merged 4 Nov, `724a8f3` · picture 18 matches |
| 22 | Revenue outlook with the rivals' prices, read only | ✅ merged 4 Nov, `50434bd` · picture 30 matches |
| 23 | Guest messages (what was sent) and Connection health, read only | ✅ merged 4 Nov, `2eb44cf` · picture 17 matches; health not pictured |

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
