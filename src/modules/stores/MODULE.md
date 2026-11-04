# stores — the Store, its counts and issues (Tier 2, slice 16)

**Built** 4 Nov 2026 by the cloud helper "t2-stores" on `mobile/t2-stores`, from `main` at `89ed9f4`.
Read against the PMS at `a4527ea` (2 Nov) and the pictures; **never opened on a screen** (the cloud
has no API, no Expo and no phone). Defects: `DEFECTS.md`, prefix **MST-**.

## The web twin, mapped first

| | |
|---|---|
| Pages | `src/modules/stores/pages/Stores.tsx` at `/h/:code/stores` (the Shelf, with its dialogs and the count sheet); `StoreDays.tsx` at `/h/:code/stores/days`; `Inventory.tsx` at `/h/:code/inventory` (Bar = `BarStock.tsx`'s body, Restaurant = `KitchenStock.tsx`'s); `BarStock.tsx` at `/pos/:code/bar-stock`; `KitchenStock.tsx` at `/pos/:code/kitchen-stock`. Guarded by `RequireAccess` (the menu's reach). Menus (`nav.ts`): Store for housekeeping, the Inventory Manager, the kitchen manager; Inventory for the Inventory Manager; Bar stock for owner/admin/GM/bar; Kitchen stock for the kitchen manager and the chef only |
| Data | `data/stores.ts` (getStore, getStockHistory, recordStockMovement, moveStock, reverseStockMovement, saveStockCount; addStockItem, setStockItem, importStockItems), `data/kitchen.ts`, `data/barSheet.ts`, `data/barPours.ts`, `lib/tiles.ts` |
| Routes and who may | Every route is `own(...)` in `api/src/roleGate.ts`; the route asks `stockGrants.ts`. `GET /stores`, `/stores/items/:id/movements`, `/stores/days`: stock **view** (owner, admin, GM, hotel manager, Inventory Manager, kitchen manager, chef, housekeeping, accountant, viewer). `POST /stores/movements` receipt · issue · wastage · return · breakage, `/stores/transfers`, `/stores/items`, `/stores/import`: **create** (owner, admin, GM, hotel manager, Inventory Manager, kitchen manager); adjustment, `/stores/counts`, `/movements/:id/reverse`, `PATCH /stores/items/:id`: **edit** (the same less the kitchen manager). `GET /kitchen-stock/sheet`: view; `POST /kitchen-stock/count`, `PUT /store`, `PUT /recipes`: KITCHEN_KEEPERS (owner, admin, GM, Inventory Manager). `GET /bar/sheet`, `/bar/requests`, `/bar/pours`: view + the bar; `POST /bar/count`, `/bar/requests`: BAR_KEEPERS (owner, admin, GM, bar, Inventory Manager); approve/reject: BAR_APPROVERS (owner, admin, GM, Inventory Manager), never one's own; `/bar/closed`: owner, admin, GM. Every `/bar/` route: Bar stock switched on (barGate.ts) |
| Offline (`src/lib/offline.ts`) | **No store, kitchen-stock or bar path is listed** (`/kitchen(\/|$)` is the till's kitchen, not `/kitchen-stock/`), so every write is refused with the unlisted sentence; the web's MODULE.md: "Offline, a store write is refused" |

API code read: `api/src/modules/stores/stores.ts` (GET 440-660, movements 928-1158, reverse
1160-1236, counts 1320-1427, transfers 1429-1499), `kitchenSheet.ts`, `barSheet.ts`,
`barRequests.ts`, `barGate.ts`, `stockGrants.ts`.

## Floor work and desk set-up (from the web's MODULE.md)

**On the phone (the floor):** what is in the store, per store (look-up); **Receive** a delivery,
**Issue** to an outlet or a department, **Waste**, **Return to supplier**, **Move to another store**
(or into use, for crockery), **Broken** (crockery), **Correct the count**, an item's **History** and
its **Undo**; **Count a store**; the kitchen's **Today's sheet** and its closing count; the bar's
**Today's sheet**, its closing and morning counts, "The bar did not open today", and the counter's
**Requests** (ask the store, approve and move, reject).

**On the website (the desk), drawn grey with "On the website for now":** Add an item, Import, Set
levels (and a cylinder's deposit), the Days view, the stock Reports, Print the sheet, Use by on a
delivery (no date picker on the phone), the kitchen's Recipes and which store is the kitchen's
(Change), the bar's Bills and Set up, the excise registers (FLR-1A/2A/3A, FLR-3 PDFs) and the Bar
stock report. Places and suppliers, Equipment and Purchasing are other lanes.

## The screens

| Screen | Route | Web twin | File |
|---|---|---|---|
| Store (the Shelf) | `app/stores/[code]/index.tsx` → `/stores/5EL` | `/h/:code/stores` | `Store.tsx`, `Act.tsx` (the acts' dialogs), `kit.tsx` |
| An item's history | `app/stores/[code]/history/[id].tsx` | the History dialog | `History.tsx` |
| Count a store | `app/stores/[code]/count.tsx` (`?store=`) | the count sheet (`?count=1`) | `Count.tsx` |
| Inventory (Bar · Restaurant) | `app/stores/[code]/inventory.tsx` (`?tab=restaurant`) | `/h/:code/inventory` | `Sheets.tsx` |
| Bar stock | `app/stores/[code]/bar-stock.tsx` | `/pos/:code/bar-stock` | `Sheets.tsx` |
| Kitchen stock | `app/stores/[code]/kitchen-stock.tsx` | `/pos/:code/kitchen-stock` | `Sheets.tsx` |

Each route asks `mayReach` (the web's RequireAccess) through `Guard.tsx` and draws the web's "This
page is not part of your role" otherwise. The Inventory Manager lands on the Store (their working
home, `/h/:code/stores`, now on the phone).

## The rules (each ported, with its source in a comment)

- **Money is the server's** (`shelf.ts`). On hand, what each store holds, the average cost, worth,
  the deposit held, a GST line in the history: as sent, to the paisa (`rupees`, MEMORY 9); nothing
  received is a dash. The phone adds no rupees up (MST-1): the headline counts items; with a store
  picked, Worth is the server's whole-hotel figure, "Worth, all stores"; the bar's "Amount, all
  drinks" is not drawn; Receive's GST amount is typed from the bill, never worked out.
- **What is typed is sent; a blank is never a zero** (`typed`, `moveBody`, `countBody`,
  `kitchenBody`, `barBody`). Digits and one point; a sign, a letter, "1e2" or a comma is not a
  figure and is not sent. A count line left blank is not counted; a typed 0 is counted. A cylinder's
  empties are asked every time (0 an answer, blank not); a cost left blank sends no cost (never 0;
  0 only ticked Free); GST all three or none. A correction sends the difference from THAT store's
  book; Issue and the rest send a positive quantity and the server signs it.
- **Rights are the API's** (`roles.ts`, the routes' own sentences; `roles.check.ts` holds the lists
  to the core's matrix). A refused act is grey with the sentence (Count a store and Correct the count
  for the kitchen manager) - except the look-only roles, who get the web's one sentence and History
  only: the owner's choice of 16 September (Stores.tsx LOOK_ONLY), kept.
- **One tap, one write**: every write latched at the tap (`useRef`, MEMORY 8); no keeper, as the
  store's routes read no key (MST-2).
- **Offline as the web**: every write refused by `send()` with the web's unlisted sentence, said in
  the dialog; nothing is held.
- Reads through `useRead` with keys `["stores", code, …]`; a write invalidates `["stores", code]`.
  The modules switch is the frame's own read (`["modules", code]`): Bar stock off drops the Bar tab.

## States

Loading ("Reading the store…", "…the history…", "…the kitchen's sheet…", "…the bar's sheet…",
"…the requests…") · failed: the read's title ("The store did not load") and the server's words,
Try again; over a last good read, "Could not read this again" · offline: "No connection" and the
web's own sentence ("This device is offline, so the store cannot load. It loads by itself as soon
as the connection is back.") · empty: "Nothing in the store yet", "Nothing is below level" (a tile),
"Nothing has moved yet", "Nothing in Kitchen store yet", "Nothing in the Bar counter", "No requests
yet" · refused: the API's sentence and nothing read; the menu's "This page is not part of your role".

## Picture match (4 Nov)

Compared by reading the code against the pictures, never seen running.

| Screen | Pictures | Result |
|---|---|---|
| Store (Shelf) | `all/31-store-and-equipment-store` (GM), `roles/r-inventory-home` (the Inventory Manager: the same page) | **Matches, with the differences left below** |
| Inventory, Bar, Today's sheet | `new/n-h-inventory` (GM) | **Matches in words and order, drawn as cards** (below) |
| Bar stock | `new/n-pos-bar-stock` (GM; Inventory's Bar without the Bar/Restaurant switch) | as Inventory, Bar |
| Kitchen stock | `new/n-pos-kitchen-stock` is the GM's "This page is not part of your role" | **Matches** (`Guard.tsx`, the web's words); the sheet itself not pictured |
| Inventory, Restaurant; Requests; the acts' dialogs; History; Count a store | not pictured | built from `KitchenStock.tsx`, `BarStock.tsx` Requests, `Stores.tsx` MoveDialog, TransferDialog, HistoryDialog, CountSheet |

Store, section by section: the title and its line · Shelf | Days, Reports, Import · Count a store,
Add an item (orange) · Store and its picker (All stores, the stores, the places in use) · the eight
tiles, scrolling, warm when there is a job, navy when picked · each group's heading and count pill ·
each card: the name and Low, the grey line (level, last moved, counted), On hand (Full and Empty for
a cylinder) and Worth with its average, Receive · Issue · More, and under a hairline the below-level
line (yellow), what each store holds, the deposit, "Nothing on hand to issue - receive a delivery
first."; a low card's yellow ring. Same words, order and grouping; colours from `theme.ts`.

Differences left, each with its reason:

1. **The headline has no "₹34,857 on the shelf"**: a sum the browser makes (MST-1); it reads
   "9 items, 3 not yet valued".
2. **Days, Reports, Import and Add an item are grey**, with one caption "… On the website for now"
   under the buttons (the desk's set-up; the brief).
3. **Averages and prices show their paise** where the server sends them (₹167.40/bottle where the
   picture shows ₹167), MEMORY 9.
4. **With one store picked, Worth is the server's whole-hotel figure**, labelled "Worth, all stores"
   (MST-1); not pictured.
5. **More's chevron sits before the word** (the shared kit's button draws an icon first).
6. **A Back capsule** beside each title (every phone screen's), and the frame's top bar and banner
   are `app/_layout.tsx`'s.
7. Inventory, Bar: **each drink is a card of labelled figures** (Opening, From the store, Sold, Other
   moves, Closing; Counted, Difference, Morning), not the web's wide excise table; the paper format's
   NIP/30/60/90/ml and Rate/Amount are one line under the figures; **"Amount, all drinks" is not
   drawn** (MST-1); **the Day is stepped** (‹ 11 Oct 2026 ›, M-7), not a date input; the FLR buttons
   and the Bar stock report are grey ("On the website for now"); Bills and Set up open a card saying so.

**3 of 3 pictured screens match their pictures** (Store; Inventory/Bar stock; Kitchen stock's
refusal) with the differences above; 6 screens, states or dialogs not pictured.

## Definition of done

```
Screens         Store, History, Count a store, Inventory, Bar stock, Kitchen stock - app/stores/[code]/…
Web twin        Stores.tsx, Inventory.tsx, BarStock.tsx, KitchenStock.tsx; differences above
Picture         all/31, roles/r-inventory-home, new/n-h-inventory, n-pos-bar-stock, n-pos-kitchen-stock (read as code only)
Reads/Writes    data.ts: GET /stores, /stores/items/:id/movements, /kitchen-stock/sheet, /bar/sheet, /bar/requests, /bar/pours, /modules ·
                POST /stores/movements, /stores/transfers, /stores/movements/:id/reverse, /stores/counts, /kitchen-stock/count,
                /bar/count, /bar/closed, /bar/closed/undo, /bar/requests, /bar/requests/:id/approve|reject
Rules           roles.ts (+check), shelf.ts (+check), sheets.ts (+check)
Offline         every write refused with the web's unlisted sentence; nothing held
States          loading · failed · empty · offline · refused, different words
What I saw      nothing: never opened on a screen (the cloud has no API or phone)
Accessibility   44 px targets (tiles 64, count boxes 44, the history's Undo 44); icon buttons labelled
Packages        none
```
