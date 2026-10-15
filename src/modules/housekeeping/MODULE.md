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

**No "mark dirty"** (the web has none). **Left on the web:** work orders (Start, Close: the
maintenance slice), repair costs (money, a photo proof), equipment repairs.

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
3. **The idempotency key is sent from the first tap** (M-5), so a lost reply can never make a
   second repair; the web sends it only when draining (PMS request R-1).
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
