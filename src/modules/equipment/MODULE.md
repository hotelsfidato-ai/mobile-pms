# equipment — the register of durable things, on a phone (lane m13-hk, 19 Nov)

**Web twin (the PMS's 16 Nov release, read only):** `src/modules/equipment/` — `pages/EquipmentRegister.tsx`
(`/h/:code/equipment`), `pages/EquipmentItem.tsx` (`/h/:code/equipment/:id`), `flows/AddEquipmentDialog.tsx`,
`flows/ItemDialogs.tsx`, `flows/Decide.tsx`, `words.ts`, `data/equipment.ts`; its repairs are housekeeping's
`components/ItemRepairs.tsx` and `flows/RepairFlow.tsx`. API: `api/src/modules/equipment/equipment.ts` and
`grants.ts` (every route asks it first: roleGate marks them `own`); deciding is the core's
`api/src/routes/approvals.ts`; repairs `api/src/modules/housekeeping/housekeeping.ts` (`/work-orders`).
Mapped from the code on 19 Nov; **never seen running** (no API, no Expo in the cloud session).

## The web twin's map

| Web | Calls | Who (grants.ts) | Offline (`src/lib/offline.ts`) |
|---|---|---|---|
| Register | `GET /equipment`, `GET /approvals?status=pending` (its equipment rows) | view: all but the revenue manager, a waiter, the bar | reads |
| Add an item | `GET /equipment/options`, `POST /equipment` | create: owner, admin, GM, hotel manager, Inventory Manager | **refused** (on no list) |
| Import | `POST /equipment/import` (dry run, then apply) | create | refused — **not built** (a file) |
| Export | `GET /equipment/export` (CSV) and the list's PDF / Excel | export: owner, admin, GM, accountant | — |
| An item | `GET /equipment/items/:id` | view | reads |
| Change details | `PATCH /equipment/items/:id` | edit (= create's five) | refused |
| Move / Ask to take out | `POST …/move` — out of a store is ASKED (view, a reason); otherwise edit | view / edit | refused |
| Under repair / Back in use | `POST …/status` | edit | refused |
| Retire | `POST …/retire` — a tagged item retired without `approve` waits in the inbox | edit | refused |
| Approve / Refuse a waiting request | `POST /approvals/:id/approved\|rejected` | the server's `mayDecide` / `blockedBecause` | refused |
| Its repairs | `GET /work-orders?item=`, `POST /work-orders` with `equipmentItemId` | REPAIR_REPORTERS (all who work with things) | **queued** ("Work order"), the server reads the key |

## Built

| Screen | Route → file | Rules (checked) | Reads (key) |
|---|---|---|---|
| Equipment (the register) | `app/equipment/[code]/index.tsx` → `Register.tsx` | `register.ts` (`register.check.ts`) | `["equipment", code, "list"]`, `["equipment", code, "approvals"]`, options `["equipment", code, "options"]` |
| An item | `app/equipment/[code]/[id].tsx` → `Item.tsx`, `ItemDialogs.tsx` | the same | `["equipment", code, "item", id]`, its repairs `["housekeeping", code, "item-repairs", id]` |
| (shared) | `Decide.tsx` — Approve / Refuse through `src/modules/approvals/data.ts` `decide` | `approvals/rules.ts` | — |
| (shared) | `data.ts` — every call | — | — |

The kit is housekeeping's `careKit.tsx` (lane m13-hk's, by import). Menu: `PHONE_ROUTES` `"/h/:code/equipment"`
→ `/equipment/:code` (the web's entry is already in `src/core/menu.ts`: the Inventory Manager's and housekeeping's
working menus).

**Who may:** worked out from the core's matrix (`src/core/menu.ts can`, the web's `words.ts whoMay`), so
"Adding and changing equipment is for the Owner, Admin, General Manager, Hotel Manager or Inventory Manager." is
the web's sentence; a button the person may not use is grey with it, never hidden. A request waiting in the
inbox, or a retired item, locks Change / Move / Status / Retire with the web's sentence. **Deciding** is the ONE
approvals engine: `mayDecide` / `blockedBecause` are the server's; Approve and Refuse go through the app's
Approvals (`decide`, its keeper); refusing needs a reason; an Open Approvals button where the inbox could not be
read or the outcome is unknown.

**Money:** a cost is the hotel's typed figure, shown as sent — "₹38,000" as the picture, but with its paise when it
has them (the web's `money()` rounds them, MEMORY 9); a count's total is the server's `totalCost` (never the
phone's cost x count); none typed is a dash, never ₹0. A repair's cost only where the list sends money (`costs`
present), the server's `costTotal`. **The web's "Cost recorded: ₹…" over the repairs is a sum the browser makes;
the phone does not draw it** and shows each repair's own cost.

**Keys and unknown outcomes:** the register's routes read no idempotency key. A second move, status or retirement
is refused by the server's own state; a second ADD is not (a counted line would be added twice). So every dialog
latches its tap and, on an unknown outcome (`outcomeUnknown`), says "Not known whether it was …" and takes no
more taps until it is closed — closing reads the item again (MGS-3). The repair form reads the key: one key for
the whole form (`formKeeper`, MHK-3), held offline as the web holds a work order.

**Export:** `<ExportButtons>` (the core's PDF / Excel / share) with the rows the list shows, in the web's
`ITEM_EXPORT` columns, for those with the export right; anyone else reads the web's who-may sentence.

## Left out, each with its reason

- **Import** — it reads a spreadsheet file: no document picker on the phone (`expo-document-picker` ~57.0.3, the
  owner's yes needed). Drawn grey "On the website for now".
- **The three dates** (bought on, warranty ends, service contract ends) on Add and Change details — a date
  picker (`@react-native-community/datetimepicker` 9.1.0, not approved). Add leaves them blank (a dash); Change
  sends only what changed, so they stay as they are. Said in each form.
- **The CSV of every line, retired ones included** (`GET /equipment/export`): the core's export makes the list's
  own rows into PDF / Excel; the separate CSV door is not used.
- **Take the room out of service too**, from an item's repair (RepairFlow's take-out): the repair is raised
  without it; Out of service is the room's own screen.
- **Record a repair cost / see its proof** — in Work orders on the web, and on the phone "On the website for now"
  there already (a photo).

## Picture match (19 Nov)

| Screen | Picture | Result |
|---|---|---|
| Equipment (the register) | `reference/pms-shots/all/32-store-and-equipment-equipment` (31 Oct, as the GM) | **MATCHES, with differences** |
| An item | none in the set | **NOT COMPARED** — built from today's code |

Checked against the picture: the title "Equipment" and its line ("1 line in the hotel"); Where (Everywhere) and
Status (Any status) as two labelled fields, one under the other; a white card per line with the name, the category
grey under it, and TAG OR COUNT · WHERE · STATUS (the green "In use" pill with its dot) · COST (₹38,000) ·
WARRANTY ENDS (a dash) as labelled rows in small capitals, a chevron on the right. Differences left:
1. **Export is the core's two buttons** (PDF or print / share, now real PDF and Excel files, M-14) instead of the
   web's one "Export": the core's ExportButtons, the same on every screen.
2. **Import is grey "On the website for now"** (a file picker) — the picture's Import opens the web's import.
3. **The three buttons are stacked** (export row, Import with its sentence, Add an item) rather than one row: a
   grey button carries its sentence under it (AGENTS rule 1).
4. **The picture is of 31 Oct;** today's page adds the waiting tile (not pictured: built from the code).

**1 of 2 screens matches its picture (with the differences above); 1 has no picture.**

## Test people

`dev-stores` (Inventory Manager: add, edit, approve), `dev-hotel-manager` (retiring a tagged item waits),
`dev-desk` (view: may only ask to take a thing out of a store), `dev-finance` (view, export), `dev-revenue`
(refused the register).

**Amended 20 Nov (the review, MEQ-3):** the unknown-outcome stop is the Item's and the Register's (a read begun
after the failure unlocks it), not each dialog's; no dialog closes while busy; the repair's key is the Item
screen's, kept across reopening until such a read.
