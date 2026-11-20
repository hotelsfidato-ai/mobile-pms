# pos — the restaurant waiter on a phone (slice 3)

**Web twin:** `src/modules/pos` one folder up — `pages/Floor.tsx` (Tables, `/pos/:code/tables`, the
waiter's first screen: WORKING_HOME), `flows/OrderPad.tsx` (a round built on the device, one Send),
`pages/Till.tsx` / `pages/Terminal.tsx` (the order: lines, strike, send, settle), `data/till.ts`;
the API in `api/src/modules/pos/till.ts` and `kotSection.ts`. Its `MODULE.md` and `DEFECTS.md`
(POS-1 …) are the source. Mapped from the code on 15 Oct (read, not run). **Money: Opus, and a
second look before merging (AGENTS rule 7).**

## What the web does, in short (cited in the map; the mobile chat keeps the full report)

- **Who:** the till is `payment` create, plus the `pos` role by name (`roleGate.ts` TILL). Reading
  the floor, orders and menu: `payment` view plus `pos`. A sent dish comes off only by the owner,
  an administrator, the GM, the hotel manager or the kitchen manager, with a reason.
- **Screens:** Tables (sections, tiles: blank · running · kot · printed · paid · closed, minutes,
  amount or a dash, "N ready" with Taken, Print bill, Clear); the order pad (a round built on the
  device, kept as a draft, sent as one `POST /till/orders/batch` with `send:true`); the order (add a
  dish, quantity, strike, Send to the kitchen = a KOT number, Taken, settle).
- **Money is the server's:** every total comes from the database (`app.pos_order_total`, tax per
  group, discount shared in proportion); price and tax rate are copied onto the line when written;
  a dish with no tax rate is refused ("a missing rate is not zero"). The device adds only the pad's
  running "before tax" figure. No service charge exists. Cash is rounded to the rupee at settle.
- **Room charge:** the whole bill only, to a checked-in guest with an open folio
  (`app.pos_chargeable_rooms`); two open bills on a room asks whose. Held offline (queue-warn), the
  risk the owner accepted on 8 September: the guest may check out first, and the refusal is kept
  and shown. The restaurant day cannot close while a bill is open.
- **Offline (the web's list, already in `src/core/offline.ts`):** orders, rounds, lines, quantity,
  strike, send, taken — held; settle by cash / card / UPI / split / function — refused; a room
  charge — held with a warning; customise and add-ons, bill printing — refused. Discount,
  promotion, round-off, close unpaid and clear are held too, with no recorded decision (question 3).
- **Printing:** no print code on any device. KOTs: Send stamps them on the server, and a "station"
  (a Windows PC in Chrome kiosk-printing) polls and prints them. Bills: `POST bill-print` queues it
  for the bill-printer computer; only when none is chosen does the web print from the browser
  (question 2).
- **Live:** the server streams `/live` (SSE); the web also polls (floor 30 s) as a backstop.

## Decided (M-9, 15 Oct): every waiter act, exactly as the web's mobile version

**The reference is the web as it draws itself today at phone width:** `../.local/pos-reference/`
(eight pictures and a README, captured from the running website, looking only), then the web's own
code (`Floor.tsx`, `OrderPad.tsx`, `DishDialog.tsx`, `Till.tsx`, `Terminal.tsx`, `BillSlip.tsx`,
`printBill.tsx`). Same words, same order of controls, same states. Where the web is broken on a
phone (R-15: the Till runs off the right edge) the phone draws the same thing, unclipped.

**Built by the mobile chat first (`5971acf5`):** `types.ts` (the till's shapes, copied by name
from the web's `data/till.ts`), `roles.ts` (`whyNotRing`, `whyNotRead`, `whyNotStrikeSent`: the
API's lists and sentences), `Pay.tsx` (the contract below), `expo-print` ~57.0.2, the test waiter
`dev-pos` (`scripts/dev-pos.sql`, "Waiter" on the sign-in), a waiter landing on Tables, a room
charge's own held words (R-14).

## The split: three Opus helpers, one part each

| Helper (copy, branch) | Builds | Its route (NEW files only) | Its own files (prefix) |
|---|---|---|---|
| tables (`pos-tables`, `mobile/pos-tables`) | Tables (the floor: tiles and states, the key, the KOT printer lines, Close early / Reopen, "N ready" → Taken, Clear) **and the order pad** (menu by section, search, a dish's sheet with variations, sides and the kitchen note, the round, Send = one batch) | `app/pos/[code]/tables.tsx` → `/pos/5EL/tables`; `app/pos/[code]/pad.tsx` → `/pos/5EL/pad?table=N1` or `?order=<id>&table=T9`, shown as a modal sheet like the web's | `Tables*`, `OrderPad*`, `DishSheet*`, `floor.ts`, `pad.ts` (+ `.check.ts`) |
| order (`pos-order`, `mobile/pos-order`) | The order (the web's Till order card at phone width): header, lines from the server, quantity, strike (a sent dish: managers only, with a reason), Taken, Send to the kitchen, Change discount / promotion, Round off, Close unpaid, Clear | `app/pos/[code]/order/[id].tsx` → `/pos/5EL/order/<id>` | `Order*`, `order.ts` (+ `.check.ts`) |
| pay (`pos-pay`, `mobile/pos-pay`) | Paying and printing: Charge to room (choose the guest when a room has two bills; the whole bill only), Cash · Card · UPI, Part - pay two ways, the cash limit, and **Print bill** (to the bill printer, else from the phone with expo-print) | none (components) | `Pay.tsx` (replaces the stub), `pay.ts`, `bill.ts` (+ `.check.ts`) |

**How the parts meet (fixed now, so nobody waits):**
- Tables opens the pad by `router.push("/pos/<code>/pad?table=<T>")` (a free table) or
  `"?order=<id>&table=<T>"` (a new round on a running one), and the order by
  `router.push("/pos/<code>/order/<id>")` (the web's Eye). The order adds a round the same way.
- `PayActions` (props `{ hotel, order, role, onChanged }`) sits under the order's own buttons;
  `PrintBill` (`{ hotel, orderId, onPrinted? }`) on the order and on a tile. Until merged, the stub
  draws nothing: build against its props.
- Reads: `useRead(fn, ["pos", code, "<tables|pad|order|pay>", …])`; after any accepted write
  invalidate the prefix `["pos", code]`. Polling as the web's backstop (the floor every 30 s, while
  on screen); the live stream later.
- Every write through `send()`; a `HeldError` said as held (never a failure), an `ApiError` 503 is
  the web's refusal sentence, any other `ApiError` the server's own words.
- **Money is the server's.** The phone never totals a bill: Net, Discount, Taxable, Tax, Total,
  Round off and Payable come from the order. The pad's "before tax" figure is the web's
  `src/modules/pos/lib/pricing.ts`, ported with its check. A printed bill takes its tax lines from
  the server's figures, never per line (R-11).

## Faults found in the web and the API (in `docs/api-requests.md`, R-10 to R-14)

R-10 no `pos` test person · R-11 the printed bill's tax on a discounted bill · R-12 a round with a
table id fails as a 500 when the table already runs (a held one would stop the drain) · R-13 no
idempotency on any till write, so a round resent after a lost reply goes in twice · R-14 a room
charge held offline says the check-in sentence.

## Tables and the order pad — picture match (4 Nov, the tables helper)

Compared by **reading the code against the pictures** (`reference/pms-shots/`, 390 px, demo data),
section by section. **Nothing was opened on a screen** in the cloud session: no phone, no preview.

| Screen | Route, files | Picture(s) | Result |
|---|---|---|---|
| Tables | `app/pos/[code]/tables.tsx`; `Tables.tsx`, `TablesKit.tsx`, `floor.ts` (+ check) | `all/42-point-of-sale-tables`, `new/n-pos-tables` (the same screen), `roles/r-waiter-home` (the waiter: Start here, no "Set up") | **Matches, three differences left** (below) |
| The order pad, with a dish's sheet and Customise | `app/pos/[code]/pad.tsx`; `OrderPad.tsx`, `DishSheet.tsx`, `OrderPadCustomise.tsx`, `pad.ts` (+ check) | **none in the set** — no capture opens a pad, a dish or Customise (`all/43`, `new/n-pos-till` are the Till's order list, not the pad) | **Not compared**: built from the web's code as ported on 15 and 31 Oct; its shared pieces (buttons, inputs, the dialog card, the KOT lines) are the ones Tables matches |

**Tables, section by section (all/42, r-waiter-home):** the title and its sentence (word for word);
New parcel (lg, the bag) and Close early (md, the door) in one row; the waiter's Start here card
(the compass on orange-50, "Got it", three jobs with their icons, "On this screen" on the first two)
between the buttons and the KOT lines; the red KOT lines ("Kitchen KOTs wait: Virtual Kitchen not
seen since 7:35 AM") with "Set up" only for those who may set KOTs up (the waiter has none, as in
r-waiter-home); the key in the web's six words and swatches; Parcels above the room, a parcel's tile
named by its customer ("Rahul"); sections A/C, Non A/C, Bar, two tiles across; a free tile (the
name in grey-700, "6 seats", the chevron), a running one ("5096 min", the name, "₹210", the
chevron, then the print and the Eye as 44 px rounds), a joined one ("Joined to AC3", the Eye
alone), closed unpaid ("Closed unpaid", "3 ready" in the success pill, Clear; with no ready dish
the words fall to the foot, as AC10), paid ("₹441", Clear, no chevron). Colours are `theme.ts`
tokens, and `theme.css` values where the phone's theme has none yet (success, yellow, grey-400).
Clear and Got it are drawn 32 px high as in the picture, their touch kept at 44 px.

**Differences left on Tables, each with its reason:**
1. **The print button on a running tile.** The picture draws a 44 px round printer beside the Eye.
   `PrintBill` is `Pay.tsx`'s (the pay helper's, on `main`; a stub that draws nothing on this
   branch): on `main` it draws the labelled "Print the bill" button and its refusal line, too wide
   for a tile. Needs `round` on `PrintBill` (the exact diff is in the helper's report) and `round`
   passed from `Tables.tsx`'s tile.
2. **"Settle a bill" in Start here has a chevron on the web** — it links to the web's Till, which
   the phone does not have; the phone reaches the order from its table's Eye. Drawn as told, not
   linked, without the chevron.
3. **The frame** (the top bar, the business-date banner, the account menu) belongs to the shell
   helper. Until it is merged Tables keeps its own "Sign out" (a waiter lands here with nothing
   behind it) or "Back"; the picture has neither on the page.

**Fixed on 4 Nov:** MPOS-1 (a server time in Postgres's text, read by the phone's engine), MPOS-2
(the dish sheet's ₹0 before a variation), MPOS-3 (a second tap ringing a round twice).
**Open for the owner:** a dish marked off until a time (`offUntil`) is not shown as off on the pad's
menu — only `isActive` is (as ported); the web's rule cannot be read from here.

## Kitchen (the pass, slice 6; the kitchen helper)

| | |
|---|---|
| Screen | The pass: `app/pos/[code]/kitchen.tsx` → `/pos/5EL/kitchen` (`?by=table` for By table), `src/modules/pos/KitchenBoard.tsx`; the chef's and the kitchen manager's landing (the web's WORKING_HOME, `2d086c3`); the GM reaches Tables from its Console |
| Web twin | `src/modules/pos/pages/Kitchen.tsx`, `components/KotStation.tsx` (the KOT printer lines), `components/app/StartHere.tsx` (the chef's card) |
| Reads | `GET /api/hotels/:code/kitchen` (every 6 s while on screen and the app in front: the web's rate with its stream down) · `GET /api/hotels/:code/till/kot-setup` (every 30 s); keys `["pos", code, "kitchen", "board" \| "kot-setup"]` |
| Writes | `POST /api/hotels/:code/kitchen/lines/:id/preparing` (Start) and `…/ready` (Ready), through `send()` (its key from the first tap); `PUT /api/me/preferences` (Got it on Start here). Served / Taken is the waiter's (Tables, the order), not the pass's: a Ready dish leaves the board |
| Rules | `kitchen.ts` + `kitchen.check.ts`: who moves (roleGate PASS and its sentence), the two columns and their empty words, the wait ticking from the read, red at 10 min and yellow at 5, the estimate's dash, by table and its courses, the kind filter, a column's count (struck dishes counted, not working), the printer lines' words, a held move |
| Offline | Start and Ready are held (`offline.ts` "Kitchen", queue): "Saved on this phone", "Queued: Start" on the ticket, a second tap refused with "Start is held on this phone, waiting to sync." |
| States | loading "Loading the kitchen board…" · failed (ReadFailed) · offline before a first read "No connection" · a failed re-read keeps the tickets with "Not up to date: … Showing what loaded at …" · empty columns "Nothing ordered yet." / "Nothing on the fire." · By table "Nothing with the kitchen." |
| Accessibility | Start / Ready 56 px, the choices and Set up 44 px, Console 48 px; every button labelled; a refused button is grey and says why when tapped |

### Picture match (4 Nov)

Compared by reading the code against the pictures (`reference/pms-shots/all/45-point-of-sale-kitchen`,
`new/n-pos-kitchen`, `roles/r-chef-home`, `roles/r-kitchen-manager-home`, each `.png` and `.txt`);
**never seen running**.

**The pass — matches, with these differences left:**
1. **"LIVE" (green) is "not live" (amber) on the phone.** The web has a live stream; the phone only
   reads every 6 s, so saying LIVE would be untrue. Question for the owner (keep until the stream
   is built).
2. **Set up is grey, the picture's red.** It goes to Restaurant setup, which is not on the phone:
   drawn disabled, saying "On the website for now". Shown, as the web, for the owner, an
   administrator, the GM and the kitchen manager; not for the chef (the chef's picture has none).
3. **Back / Sign out in the header** when the chef or kitchen manager lands here: the pictures
   have no such button because the web's account menu is in its top bar. Until the shell's frame
   (top bar, account menu) is merged, it is the only way out; to be taken off then.
4. **The top bar and the business-date banner** (the pictures' first lines) are the shell's frame,
   not this screen.
5. **The header stays at the top while the board scrolls.** The picture is one long page (fixed in
   MPOS-K1); whether the web's header stays at the top cannot be told from a full-length picture.
6. **The cancelled card, By table, the chef's Start here and a held ticket** are not in the pictures
   (the cancelled card is in the words only, below the picture's 18000 px; the test chef had put
   Start here away): drawn from the ported code; the cancelled card's words match the `.txt`.
7. **A ticket without a table** reads its order type ("take away · …"): the words show
   "PARCEL · RAHUL · …" and "ROOM 203 · …", which may come from the table field or from fields the
   ported `KitchenLine` does not carry. Not checked against the API here; nothing invented.

**Kitchen stock** (`new/n-pos-kitchen-stock`): a different screen (the GM's "This page is not part
of your role" for Kitchen stock), not part of the pass: **not built**, not in this lane.

1 of 1 screens built here matches its pictures apart from the differences above.

## The Menu and Restaurant setup (the m13-pos-setup lane, 19-20 Nov)

**Web twin (today's PMS, 16 Nov release, read only):** `src/modules/pos/pages/Menu.tsx` (Dishes, Sides,
Promotions; `components/NumberedAddonsTab.tsx` the Add-ons tab; `components/DishProfitTab.tsx` Profit per
dish), `pages/Setup.tsx` (Ready to open, the name, Parcels, Service charge, Owner's allowance, Taxes =
`finance/flows/TaxRulesCard.tsx`, Sections and tables, `components/KotSection.tsx`, Table booking hours),
`data/till.ts`, `data/tableBookings.ts`, `finance/data/tax.ts`. **Routes and gates (api/src/roleGate.ts):**
every Menu write `MENU` (`menu` edit: owner, admin, GM, kitchen manager); setup's name, charges, sections,
tables `TILL_SETUP` and the hours `TABLE_HOURS` (`room_config` edit: owner, admin, GM); the KOT section
`KOT_SWITCH` (the menu's four), its design `kotDesign.ts` (owner, admin, GM); the allowance
`ownerAllowance.ts` (owner, admin; the server answers `mayEdit`); the rates and the menu sections' tax
heading `GST` (+ the accountant); the alcohol switch `moduleSwitches.ts` (owner, admin). Reads: the menu
`MENU_READ`, the setup `SETUP`, the profit `reservation` approve. **The web's guards:** Menu: the POS
gate only; Setup: RequireAccess (`room_config` or `menu` edit), the kitchen manager the KOT section only.
**Offline (`src/core/offline.ts`, the web's):** a dish's off / on / take off and a preparation time are
held; everything else here is refused offline (send()).

| | |
|---|---|
| Screens | `app/pos/[code]/menu.tsx` → `MenuScreen.tsx` (+ `MenuDishes.tsx`, `MenuSheets.tsx`, `MenuSides.tsx`, `MenuAddons.tsx`, `MenuProfit.tsx`); `app/pos/[code]/setup.tsx` → `SetupScreen.tsx` (+ `SetupKot.tsx`, `SetupTaxes.tsx`); the pieces both share `SetupKit.tsx` |
| Menu links | PHONE_ROUTES `/pos/:code/menu`, `/pos/:code/setup` (with pins and the MERGED alternative); Ready to open's lines; the Kitchen board's Set up |
| Rules | `setup.ts` + `setup.check.ts`, `menuEdit.ts` + `menuEdit.check.ts` (broken on purpose: a blank price added at ₹0, a blank figure sent as 0, the allowance's missing "left" written ₹0.00 - each failed, each restored) |
| Writes | through `send()` only, by `useActs` (SetupKit): latched at the tap; done said and every `["pos", code]` read asked again; held said as held; refused in the server's words; an unknown outcome (`outcomeUnknown`) says "Not known whether it was …" and that control takes no taps until the page is pulled down and read again (none of these routes reads a key, and a toggle repeated flips back) |
| Reads | `useRead` with `["pos", code, "menu" or "setup", …]`; four states each (Reading … · the web's ReadProblem: failed / no connection / refused · the web's empty words · "Not up to date" over a kept answer) |
| Native (docs/NATIVE.md) | sheets with safe areas and the keyboard lift, the right keyboard per field, the phone's Switch for every tick and switch, the phone's own Alert for Take away a section (the web's words), ripple on Android, 44 px |
| Exports | the dishes (the web's DISH_EXPORT columns) through `ExportButtons` |

**What the phone leaves on the website, said in place ("On the website for now"):** This computer
(naming a KOT computer, ticking what it prints, the Fidato Printer download, the test prints and the
Reprints - a phone prints through no printer and names no device, as the Kitchen board); Import the
menu and Import sides (a file picker: `expo-document-picker` ~57.0.3, not installed); a coupon's two
days and a tax band's dates (a date picker: `@react-native-community/datetimepicker` 9.1.0, not
installed - a band's dates are shown and kept as they are when its rate is saved). Profit per dish moves
its days a day at a time (M-7's stepper). The web's Menu has no dish photo, so none is built.

### Picture match (20 Nov)

Compared by **reading the code against the pictures** (`reference/pms-shots/new/n-pos-setup`,
`new/n-pos-menu`, `all/46-point-of-sale-menu` - the same screen as n-pos-menu; each `.png` cut into
pieces and its `.txt`), never seen running.

**Restaurant setup** (`n-pos-setup`, as dev-gm, 31 Oct; the picture stops at 18000 px inside the KOT's
design): the sections in the web's order and words, Ready to open's six cards with the success tick,
the name card, Parcels, Owner's allowance (disabled boxes and "Set by the owner or an Admin." for the
GM), Taxes (the switch, the GST card's tiles with Not set and dashed edges, the till's half), the
section cards with two tiles across, One table / A numbered run, New section, the KOT section. **Differences
left:** (1) **Service charge** is not in the picture: added to the web on 1 Nov (Setup.tsx 260), built from
the code (MEMORY 14). (2) **The allowance's bills** are cards of labelled figures, not the web's five-column
table (too wide for a phone). (3) **Checkboxes are the phone's Switch** (NATIVE.md, 19 Nov). (4) **Selects
open a sheet of choices** (the phone has no NativeSelect). (5) **This computer** is drawn with its words,
fields and ticks greyed "On the website for now" (above). (6) **The KOT preview** is drawn in Inter, the
web's in the printer's monospace. (7) **A tax band's dates** are shown as a line, not two date boxes.
(8) **"left" with no figure** shows a dash where the web writes ₹0.00. (9) The top bar and the
business-date banner are the frame's (Shell), not this screen's.

**Menu** (`n-pos-menu`, `all/46`, as dev-gm, 31 Oct): the title with its "22 items" pill, Import sides and
Import the menu (greyed: the picker), Dishes / Add-ons, the "These prices are yours" banner, Add a part
of the menu, each part's card (course and minutes rounds, the heading select), each dish (rate, price or
a dash, MRP, course, minutes, Add / Change variations, Out of stock, Take off), the variation line and
the sides under a dish, the new-dish row (Dish, Price, Free, 5%, Add), Sides with Change / Remove / Add
option. **Differences left:** (1) **The export buttons** (PDF or print, Share) are above the tabs; the web's
ExportButtons sit in its header, added after the picture (D27-383 item 1). (2) **Profit per dish** (a third
tab for the owner, an Admin and the GM) and **Promotions'** coupon words are not in the picture: built from
today's code. (3) **Minutes, course and MRP** open a small sheet with one box; the web types into the
round itself. (4) **Free** is the phone's Switch. (5) The frame, as above.

**2 of 2 screens match their pictures, with the differences above.**

**Questions for the owner (in the lane's report):** the new-dish row starts at 5% as the web's select
does - keep, or start with no rate chosen; Switch off a KOT kind, Remove a computer and Remove a side
ask nothing first on the web - keep, or ask with the phone's own Alert.
