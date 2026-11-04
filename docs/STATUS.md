# Fidato Mobile — every slice, its copy, its screens, and what happens on a failure

Kept by the mobile chat; brought up to date at every merge. Each slice is built by one helper in
**its own copy** (a git worktree under `D:\fidato pms moblie\.claude\worktrees\`, its own branch,
its own scratch database, its own ports), and merged into `mobile/app` by the mobile chat after
review and green gates.

## Screens, at a glance (4 Nov, after the cloud session)

**All of Tier 1 is merged into `main`** (`b628aae`, ALL GATES GREEN on each merge commit): the nine
branches the helpers left on 31 Oct were finished in the cloud (M-12), one copy each, and merged.
**Nothing was opened on a screen** in the cloud (no API, no Expo there): every picture comparison
below is the code read against the picture (`reference/pms-shots/`), never seen running. The PC
opens them next.

| | Screens | |
|---|---|---|
| ✅ Matches its picture (only the phone's own rules differ: 44 px touch, Back until the frame, "On the website for now") | **13** | All properties · Dashboard · Rooms · Tables · Arrivals (Today, Upcoming) · In house (now, Due out) · Walk-ins record · Kitchen · Work orders · Guest requests · Wake-up calls · Lost property · Notifications |
| 🟠 Differences left, each listed in its MODULE.md | **3** | Walk-in (picture 14: no server quote for GST and Due, R-22) · Messages from guests (picture 17 shows the sent-messages record, not on the phone) · the menu for each role (6 of 11 match outright; 5 lack one System entry the pictures never show open) |
| ⬜ No usable picture yet (built from the ported code) | **12** | Sign in · Report a repair · Out of service · The order (with paying, printing) · Order pad · A stay · Check in · Take a walk-in · A stay's bill and check-out · Online check-in (picture blank) · Guest services hub · the account menu (pictures never opened it) |
| ⏳ Tier 2, planned (one copy each, in waves) | **15** | below |
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
