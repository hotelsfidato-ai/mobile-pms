# housekeeping — rooms and repairs on a phone (slice 2)

**Web twin:** `src/modules/housekeeping` one folder up — `pages/Housekeeping.tsx`
(`/h/:code/housekeeping`), `flows/RepairFlow.tsx` (Report a repair), `data/housekeeping.ts`; the
API in `api/src/routes/property.ts`, `api/src/modules/housekeeping/` (`housekeeping.ts`,
`roomStatus.ts`, `repairRoles.ts`). Its `MODULE.md` and `DEFECTS.md` (HK-1 … HK-14) are the source.
Mapped from the code on 15 Oct (read, not run); the key claims re-checked by the mobile chat.
**Decided:** M-5 (15 Oct). **Held by:** the mobile chat (core first); then a helper in its own copy.

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

## Test people (development, `x-dev-staff-id`, hotel 5EL)

`dev-housekeeping` (housekeeping, the one housekeeper), `dev-gm`, `dev-desk` (front desk: may mark
rooms, may not raise a room repair), `dev-finance` (may not mark), `dev-stores`.
