# housekeeping — rooms and repairs on a phone (slice 2)

**Web twin:** `src/modules/housekeeping` one folder up — `pages/Housekeeping.tsx`
(`/h/:code/housekeeping`), `flows/RepairFlow.tsx` (Report a repair), `data/housekeeping.ts`; the
API in `api/src/routes/property.ts`, `api/src/modules/housekeeping/` (`housekeeping.ts`,
`roomStatus.ts`, `repairRoles.ts`). Its `MODULE.md` and `DEFECTS.md` (HK-1 … HK-14) are the source.
Mapped from the code on 15 Oct (read, not run); the key claims re-checked by the mobile chat.
**Decided:** M-5, M-6 (15 Oct). **Built** 15 Oct by three Opus helpers, merged into `mobile/app` (`88ae75c9`); held by the mobile chat. Seen in the 375 × 812 preview only, not yet on a phone.

## Screens (M-5)

| Screen | Web twin | On the phone |
|---|---|---|
| Rooms | the housekeeping board | groups Needs cleaning / Clean / Inspected / In house / Out of service; chips Mine · All · Unassigned; each room: number, type, guest or floor, Due out, who has it, **Clean**, **Inspected**, **Repair**, each disabled with its reason |
| Report a repair | RepairFlow | what needs fixing (required), the room, kind, priority |
| Out of service | OutOfOrderFlow | take a free room out (reason, from, to), put it back; **online only**, refused offline with the web's words |

**No "mark dirty"** (the web has none). **Work orders** are on the phone since 4 Nov (below: "Work
orders"). **Left on the web:** recording a repair cost (money, a photo proof), equipment repairs.

## Reads (through `src/core/api.ts`)

`GET /api/hotels/:code/rooms` · `/stays?from&to&board=1` (guest names; needs the reservation
right) · `/house-now` · `/housekeepers` · `/housekeeping/assignments` · `/repairable-equipment`
(only if equipment repairs come in).

## Writes, rules and offline (ported, not invented)

| Write | Endpoint | Enabled when (web) | Who (API) | Offline (web, `src/lib/offline.ts`) |
|---|---|---|---|---|
| Mark clean | `PUT /rooms/:n/housekeeping {state:"clean"}` | the room is dirty | inventory edit | **queued**, "Housekeeping" |
| Mark inspected | same, `{state:"inspected"}` | the room is clean | inventory edit | **queued** |
| Give / take a room | `PUT` / `DELETE /housekeeping/assignments/:n` | always | inventory edit | **queued** |
| Report a repair | `POST /work-orders` | "what needs fixing" typed | REPAIR_UPDATERS: owner, admin, GM, hotel manager, stores, housekeeping | **queued**, "Work order"; the server honours `idempotency-key` |
| Take out / put back | `POST /rooms/:n/block`, `DELETE …/block/:id` | not occupied | inventory edit | **refused** |

Reasons shown when disabled, as the web words them (`Housekeeping.tsx` 657-669): "Room N is already
marked clean." · "Room N is already inspected." · "Room N needs cleaning first." · and ", on this
phone, waiting to sync" while a tap is held. The server's own refusals: "This room is held out of
service. Release it before cleaning it." · "A dirty room is cleaned before it is inspected."

**Inventory edit** (marking, assigning): owner, admin, GM, hotel manager, revenue manager, front
desk, housekeeping, kitchen manager, stores — not chef, POS, finance, read-only.
There is **no supervisor role**: anyone with inventory edit may mark a room inspected.

**Offline, as the web:** the tap is tried first; held only when it cannot leave the phone; sent
oldest first; a network failure or 5xx stops the drain, a 4xx is kept as refused with the server's
sentence and a Discard. Held entries belong to the person who made them.

## Where the phone differs from the web (each shown to the owner)

1. **Repair, for a role the API refuses** (front desk, revenue, kitchen, chef, POS, finance): the
   web shows it open and the server answers 403; the phone shows it **disabled with the server's
   sentence** (AGENTS rule 1).
2. **A held assignment**: the web shows "Not assigned" although it was held; the phone says it is
   held.
3. **The idempotency key is sent from the first tap** (M-5), and since 4 Nov the SAME key on every
   try from one form (MHK-3), so a lost reply then Raise it again can never make a second repair;
   the web sends it only when draining (PMS request R-1).
4. **One count of what waits**: the web's board counts only held room marks; the phone counts every
   held change.

The web's own faults found on the way are in `docs/api-requests.md` for the PMS's main chat.

## Built (15 Oct)

| Screen | Route → file | Rules (checked) | Reads (key) |
|---|---|---|---|
| Rooms (title "Housekeeping", the web's) | `app/housekeeping/[code]/index.tsx` → `Rooms.tsx` | `board.ts` (`board.check.ts`) | rooms + house-now (required); stays board=1, assignments, housekeepers (each may be refused: said, not fatal) — `["housekeeping", code, "rooms", date]`; every 30 s while on screen (HK-1) |
| Report a repair | `app/housekeeping/[code]/repair.tsx?room=` → `ReportRepair.tsx` | `repair.ts` (`repair.check.ts`) | rooms + house-now — `["housekeeping", code, "repair", "rooms"]` |
| Out of service | `app/housekeeping/[code]/out-of-service.tsx?room=` → `OutOfService.tsx` | `block.ts` (`block.check.ts`) | rooms (that room's `blocks[]`) + house-now — `["housekeeping", code, "block", room]` |

Shared: `roles.ts` (`roles.check.ts`) — who may mark, give, block and repair, in the API's words.
Every accepted write re-reads the prefix `["housekeeping", code]`. A housekeeper lands on Rooms
(the web's WORKING_HOME), which then offers Sign out; others reach it from the Dashboard's
"Needs cleaning" tile, and its Back returns there. A grey button stays tappable and says why on
the card (the web's D17-8), the API's sentence first.

**Proved in the preview** (pressed by script, on each helper's own copy of the demo): marks
accepted, refused with the server's sentence, and held → sent with the tap's key; assign and
unassign, held too; a repair raised once per key (the same key twice: one work order), held and
sent once, its take-out-too refused offline and said; out of service taken and put back, refused
offline with nothing held; Reception and Accountant see the API's sentences; every button ≥ 44 px.

## Where the phone differs from the web, added while building (for the owner's yes)

5. Guest names refused (stores, chef): the web's board fails whole; the phone draws it without
   names or Due out and says why. Roster or sheet refused (finance): said in a note; Mine and
   Unassigned show a dash.
6. No board head (the navy "Empty rooms" and six counts) on the phone yet.
**All approved by the owner (M-7, 15 Oct)**, with three made stricter than the web for safety:
an ended block shows "Ended" without Put back (R-7); "take room N out of service too" only for a
room that is free and not already out; an end date at least the day after From (R-8).

7. Out of service: a day stepper (− / +) instead of a date input; a block starting later says
   "goes out on <date>"; after Put back it says the status the room came back with, not the web's
   unconditional "It returns as dirty."; the screen stays open after a write.
8. Report a repair: the same day stepper (`DayStepper.tsx`, shared) when taking the room out too;
   "Not a room" for a repair to the building; the outcome on a card with Done (no core toast).
   Rooms opens on Mine for a housekeeper with rooms on today's sheet (`firstSheet`, M-7).
9. New words: "Queued: give to X" / "Queued: unassigned" for a held assignment.

## What the core gives the screens (built 15 Oct; the core is frozen for helpers)

- **Writes:** `send(method, path, body)` in `src/core/api.ts`. It mints the idempotency key at the
  tap and sends it from the first attempt (M-5). When nothing leaves the phone it either **holds**
  the change (throws `HeldError`: say "Saved on this phone" and its message, and show the card as
  queued) or **refuses** it (throws `ApiError` 503 with the web's sentence, e.g. taking a room out
  of service). A server refusal is an `ApiError` with the server's own sentence.
- **What is held:** `list()` and `subscribe()` in `src/core/outbox.ts` (oldest first; each entry
  has `path`, `subject`, `status`). The board's "Queued: mark clean" comes from the entries whose
  path is this room's `/rooms/:n/housekeeping` (the web's `readHeld`).
- **The bar** (`src/core/HeldBar.tsx`, at the top of every signed-in screen) already shows held,
  refused (with Discard) and another person's changes, and sends them. Screens do not drain.
- **Reads:** `useRead(read, ["housekeeping", hotel.code, …])` from `src/core/ui.tsx`.
- **Icons:** `lucide-react-native` (the web's family); **type:** `t.*` and `face[500|600|700]` from
  `src/core/theme.ts`; never `fontWeight`.
- **Where a housekeeper lands:** the web sends them to the board (`navigation.ts` 636). The route
  (`app/`) is the mobile chat's: ask for it with the screen.
- **To prove the held path** (not yet exercised, nothing calls `send` until these screens): tap
  with the API stopped, or with `fetch` failing in the web preview; see the card queued, the bar
  count it, and the change land when the API is back.

## Test people (development, `x-dev-staff-id`, hotel 5EL)

`dev-housekeeping` (housekeeping, the one housekeeper), `dev-gm`, `dev-desk` (front desk: may mark
rooms, may not raise a room repair), `dev-finance` (may not mark), `dev-stores`.

## Picture match (4 Nov)

Compared by reading the code against each picture at full size (780 px wide, cut in pieces), section by
section; **never seen running** (no Expo, no API in the cloud session). The top bar, the banner and the
menus are the shell's (mobile/shell); the "Back" / "Sign out" capsules standing in for them are not
counted. Work orders are the maintenance helper's (its own section).

| Screen | Picture(s) | Result |
|---|---|---|
| Rooms (the board, title "Housekeeping") | `all/10-front-desk-housekeeping`, `roles/r-housekeeping-home` (the same body) | **MATCHES**, with the differences below |
| Report a repair | none in the set (`all/`, `new/`, `roles/` hold no picture of the form; `all/11-front-desk-work-orders` shows the Work orders list only) | **NOT COMPARED**: built to the web's RepairFlow as ported on 31 Oct |
| Out of service | none in the set | **NOT COMPARED**: built to the web's OutOfOrderFlow as ported |

Checked against the board's picture, all found as drawn: the title and its line; the green "Online"
pill; the navy Empty rooms with its white ring, "3/7"-style figure (the "/7" dimmed) and "clean", the
Clean and Inspected gauges; the six counts in two columns (Needs cleaning warm orange while some wait,
Due out warm yellow and flat, Out of service's figure orange, an arrow on each count that jumps); the
sheet chips (All rooms first and navy, a chip per person on the roster, Unassigned last); the groups in
the web's order, each with its tinted pill and dot; a card per room (number, type, Due out pill, the bed
for a room with a guest, the guest or the floor, "Who is cleaning room N", Clean · Inspected · Repair,
the yellow card for Due out); Out of service's card with Put back only.

**Differences left, each with its reason:**

1. **The sheet chips are 44 px high** (the picture's are about 35 px): the touch-target rule (AGENTS).
2. **Who is cleaning a room opens a sheet from the bottom**, not the website's native select (a phone
   has no select).
3. **Put back opens Out of service** (what holds the room out, each with Put back) rather than putting
   the room back at once: the owner's 17 September, kept from 15 Oct.
4. **`all/02-home-rooms` is not this board**: it is the website's Rooms grid (`/h/:code/stay`, the Home
   menu's "Rooms": Calendar · Rooms, Room type · Floor, Assign room, Sellable / Empty / In house, a
   tile per room by type). The phone has no such screen and none is in this lane (no new route):
   a question for the owner.
5. **The two forms** cannot be matched: no picture of them was taken. A capture of Report a repair
   (from a room's Repair) and of Out of service is needed before they can be called matched.

The writes are unchanged on 4 Nov: M-5 (the key from the first tap, Out of service online only) and
M-7 (the day stepper, Mine first for a housekeeper, ended blocks without Put back, the end a night
after From).

## Work orders (slice 7, helper "maintenance"; 31 Oct, finished 4 Nov)

| Screen | Route → file | Rules (checked) | Reads (key) |
|---|---|---|---|
| Work orders | `app/housekeeping/[code]/work-orders.tsx` → `WorkOrdersScreen.tsx` | `workOrders.ts` (`workOrders.check.ts`) | `GET /api/hotels/:code/work-orders` and `?view=closed` — `["housekeeping", code, "work-orders", view]` |

**Web twin:** `pages/WorkOrders.tsx` and `flows/RepairCosts.tsx` (shapes from `data/housekeeping.ts`;
the API's `GET /work-orders`, `PATCH /work-orders/:id`, `POST /repair-costs/:id/cancel`), ported on
31 Oct with the source named in comments. Open · Closed with their counts; each repair's card (title,
pills, the item it is on, the grey line that turns amber at a week, what was done once closed, its
cost for those the list sends costs to); **Start / Put back**; **Close** as **Fixed** or **Not
needed** with what was done (required); **Raise one** opens the repair form
(`/housekeeping/[code]/repair`); **Costs** lists each cost with paise, and **Cancel this cost** with
a reason.

**Who may, in the API's words** (`repairRoles.ts`, read back on 17 Oct): Start / Put back / Close are
grey with UPDATE_REFUSED unless the list says `mayUpdate`, and the line UPDATE_WHO stands over the
list; Cancel this cost is grey with COST_REFUSED unless `mayRecordCosts`; Raise one is roles.ts's
`whyNotRepair`. A grey button says why when tapped (D17-8), never hidden.

**Money:** the cost total and each cost are the server's figures, shown as sent (`cash`, the web's
`moneyPrecise` for a single cost); no cost is a dash, never ₹0; the phone adds nothing up. Costs
are absent (not empty) for anybody who may not see money, and then no Costs button shows.

**Offline (the web's tiers, `src/core/offline.ts`):** `PATCH /work-orders/:id` is **queued**
("Work order"): a held Start / Close says "Saved on this phone", the card turns amber with
"Queued: start / put back / close as fixed / close as not needed", and Start / Close stay grey on a
close held on this phone. `/repair-costs` is **refused** offline (the default tier), in the web's
sentence. The key is minted at the tap (M-5); one tap of Start / Put back is one change (MHK-W2).

**Left on the website** ("On the website for now"): **Record the cost** (it needs the bill's photo
or file as proof, D17-6; the phone has no picker — a package for the owner) and **See the proof**.
The equipment item is plain words (the phone has no equipment page).

**Where the phone differs from the web:** a held Start or Close is said and shown on its card, and
the Close dialog shuts (the web says nothing and stays busy, PMS R-3); a grey button says why when
tapped where the web hides it; Start / Put back is grey ("Sending…") while its tap is on its way.

### Picture match (4 Nov) — compared by reading the code against the picture, never seen running

**Work orders** — `reference/pms-shots/all/11-front-desk-work-orders.png` (+ `.txt`), the Open view,
empty, one closed. Every word of the page matches the `.txt` (title, the line under it, Raise one,
Open 0 · Closed 1, Nothing outstanding and its line, the footing). Measured on the picture (2×):
the title 26 px (t.title), Raise one 117 × 44 with its + (orange600, a capsule), the tabs' 3 px
track on grey100 with the white tab, the empty state's 44 px grey100 circle with the inbox, 84 px
above it, the body's 23 px lines and the footing's 21 px lines, 80 px between them — the code's
sizes give the same. **Differences left:**
1. **The frame** (the top bar with the menu, search, bell and account; the business-date banner):
   the shell's lane and the core (`app/_layout.tsx`), not this screen.
2. **A Back capsule** right of the title, which the picture has not: the phone has no header
   (`headerShown: false`) and no menu until the shell lands; Rooms has the same. Take it out when
   the frame's menu is merged — the mobile chat's call.
3. **The tabs are 44 px tall**, the picture's 36: the web's own Segmented grows to 44 under a finger
   (pointer-coarse); the picture was taken with a mouse.
4. **The line under the title** is drawn by the core's `Head` without the web's 21 px line height
   (the picture's two lines are 21 px apart): a core change, in the report.
5. Not in the picture, so not compared: a card (open, closed, held), the Close and Costs dialogs,
   the refused and offline states — built from the web's code on 31 Oct.
The equipment picture (`all/32-store-and-equipment-equipment.png`) was looked at only for the item's
name and tag on a card; the phone draws them as plain words, no link.
