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

## Till and Terminal (lane m13-till, 19 Nov)

**The web twin's map** (today's PMS, 16 Nov release, read-only checkout):
- Pages: `src/modules/pos/pages/Till.tsx` (TillPage: Start an order, Open orders, Settled today,
  An earlier day's bill; beside them the open order's OrderPanel and the menu) and
  `pages/Terminal.tsx` (the outlet chosen once on the device, then Start an order / the open
  orders / guests' room-service orders, and the bill pane); both inside `PosGate`
  (`GET /till/access`). Pieces: `components/NewParcel.tsx`, `GuestOrders.tsx`, `KotStation.tsx`
  (KotStatus), `components/app/StartHere.tsx`, `modules/guests/components/Preferences.tsx`
  (RoomPreferences).
- Reads and their gates (`api/src/roleGate.ts`): `GET /till/orders`, `/till/bills`,
  `/till/guest-orders` (TILL_READ: `payment` view + waiter + Bar person), `/till/menu` (MENU_READ),
  `/till/kot-setup` (KOT_READ), `/pos/outlets` (`payment`/`invoice`/`setting` view + waiter + Bar),
  `/guest-preferences` (`reservation` view + waiter + Bar).
- Writes: `POST /till/orders` (Open, New parcel), `POST /till/orders/batch {guestOrderId}`
  (Accept and send), `POST /till/guest-orders/:id/decline` — all TILL (`payment` create + waiter +
  Bar person, roleGate 228). None reads an idempotency key (R-13).
- Offline (`src/core/offline.ts`, the web's): the first two are "Order" (queue: held); Decline is
  not on the list (refused with the web's sentence). Settling is the order screen's (refused).

**How the Till relates to Tables, the pad and the order (nothing of theirs edited):** the web's
Till is one page — the lists, and beside them the open order (OrderPanel) and the menu. On the
phone the open order IS the order screen (`OrderScreen.tsx`, `/pos/:code/order/:id`, the port of
OrderPanel, with `Pay.tsx` settling and printing) and the menu IS the order pad (`OrderPad.tsx`).
A row opens the order; Open and New parcel make the order, then open the order and its pad over
it (`TillKit.goToOrder`), as the web shows the new order with its menu. The Terminal does the same
on its outlet: its bill pane is the same order screen (the web: "a terminal that could do something
the till could not would be a second system").

| | Till | Terminal |
|---|---|---|
| Route, files | `app/pos/[code]/till.tsx`; `Till.tsx`, `TillKit.tsx`, `till.ts` (+ check) | `app/pos/[code]/terminal.tsx`; `Terminal.tsx`, `TillKit.tsx`, `till.ts` (+ check) |
| Reads | orders (every 30 s on screen, again on coming back: the web's live stream is not on the phone), the menu (only "There is no menu yet" and its failure; the pad's key), KOT lines, bills by number | outlets, orders (30 s), guest orders (20 s, as the web), guests' preferences, KOT lines |
| Writes | Open, New parcel | Open the order, New parcel, Accept and send, Decline |
| Rights | `till.ts ringWhy`: today's TILL and its sentence (MPOS-T1); refused buttons grey, the tap says why | the same |
| Unknown outcome | Open and New parcel: one tap one order (latched); after nothing came back or a 5xx, "Not known whether it was opened", no more taps until the screen is left and the list read again (Open) or the sheet closed (parcel) | the same; Accept and Decline are refused a second time by the server ("already answered"), so they say "Not known…" and read again |
| States | loading (grey block, "Reading today's orders") · failed / offline before a read (ReadProblem: its words differ) · a failed re-read (Stale line) · empty (as the web: no list card, Start an order stays) · no menu ("There is no menu yet") | loading ("Loading the outlets…") · failed · none ("No outlet is configured") · the same list states |
| Native (docs/NATIVE.md) | the parcel sheet pads the safe areas, lifts over the keyboard, closes on the back gesture; phone-pad for the phone; Android ripple on rows | 64 px thumb buttons, ripple; no frame (core `coversTheFrame`) |
| Exports | the web offers no download of these lists: none | none |

### Picture match (19 Nov)

Compared by reading the code against the pictures (`reference/pms-shots/all/43-point-of-sale-till`
= `new/n-pos-till`, the GM, 2929 px; `all/44-point-of-sale-terminal` = `new/n-pos-terminal`, the
GM, the outlet's choice); **never seen running**.

**Till — matches, with these differences left:**
1. **The top bar and the business-date banner** are the frame's (`src/core/Shell.tsx`), not this screen.
2. **NC rows show their value** ("NC ₹441"), the picture "NC" alone: today's code (D27-394, `Till.tsx`
   625) is newer than the 31 Oct picture (MEMORY 14).
3. **A figure with paise keeps them** (₹1,481.50) where the web's money() rounds (MEMORY 9); whole
   figures look as the picture.
4. **Day** (the web's date picker) is drawn, greyed, and says "On the website for now": a date
   picker needs `@react-native-community/datetimepicker` 9.1.0 (not installed). The bill number asks
   alone (two characters, as the web).
5. **The open order beside the lists** (OrderPanel and the menu, at a tablet's width) is the order
   screen and the pad on the phone (above).
6. **Start here** (the waiter's and the Bar person's) is not in the GM's picture: drawn from
   `StartHere.tsx`; its first two jobs open Tables, the third is "On this screen".
7. **The live stream** (`useLiveOrders`) is not on the phone: the list is read every 30 s on screen.

**Terminal — the outlet's choice matches** (eyebrow, title, sentence, the outlets' tiles with name,
code and arrow, "← Back to the console"). **Not pictured**, built from `Terminal.tsx`: the terminal
after the choice (header, Console, KOT lines, room-service orders, Start an order, open orders,
"This terminal is locked to …", Change outlet). Differences left:
1. **The outlet is kept per property** (`fidato.terminal-outlet.<code>`): the web's one key carries
   one hotel's outlet into another's till (AGENTS rule 5).
2. **A room-service order's total is not drawn:** the web adds the guest's basket up in the browser
   (`GuestOrders.tsx` 65); the server sends no total and the phone never totals.
3. **The bill pane, the menu beside it, the running-total bar** (with its ₹0.00 for no order) are
   the order screen and the pad; the Terminal-only acts there — a note per dish (the speech
   bubble), the tip for the staff, the coupon, the voluntary service charge, No charge (NC), Move
   and Join — are the order screen's to have or not (the order lane's).
4. **"Console"** replaces the Terminal by the Till (the web's link to `/pos/:code/till`).

2 of 2 screens match their pictures apart from the differences above (the Terminal: its pictured
state only).

**Web addresses of this lane:** `/pos/:code/till` → built at `/pos/:code/till`;
`/pos/:code/terminal` → built at `/pos/:code/terminal` (and the web's old `/h/:code/till`,
`/h/:code/till/terminal` redirect there on the web).

## The service lane: Bill history, Close restaurant day, Charges to rooms, Table bookings (m13-pos-service, 19-20 Nov)

**Web twin, mapped from today's PMS (16 Nov release), read not run:**
- **Bill history** `/pos/:code/bill-history` — `pages/BillHistory.tsx`; `GET /till/bills` (TILL_READ;
  a range of dates or any filter only for BILL_HISTORY_ROLES, till.ts 2152, its own 403 sentence),
  `GET /till/waiters` (TILL_READ), `GET /till/orders/:id` and the Till's reprint `POST bill-print`
  (TILL; refused offline). The web's first question is from = to = the business day, so anyone
  outside BILL_HISTORY_ROLES is refused by the server: the phone shows that sentence as the screen.
- **Close restaurant day** `/pos/:code/day-end` — `pages/DayEnd.tsx`; `GET /till/day-end?outlet=REST`
  (payment view + pos, bar, kitchen_manager), `POST day-end/open | movements | count | close`
  (DAY_END: payment create + pos, bar, kitchen_manager). Offline: every day-end write refused
  ("Bill settlement" tier, `offline.ts`). The movement's photo route (`POST …/movements/:id/photo`)
  needs a picker: not built.
- **Charges to rooms** `/pos/:code/room-charges` — `pages/Pos.tsx`; `GET /pos/outlets`,
  `GET /pos/tickets` (BILLS: invoice view). Read only.
- **Table bookings** `/pos/:code/table-bookings` — `pages/TableBookings.tsx`; `GET /table-bookings?date=`
  (TILL_READ, read every 60 s), `POST /table-bookings`, `/:id/confirm | decline | arrive | seat |
  no-show | cancel` (TABLE_ANSWER: payment create + pos, bar). Offline: not in the web's list, so
  refused ("This cannot be done offline yet"). The hours (`GET/PUT /table-bookings/hours`) are
  Restaurant setup's, another lane's.
- The web's PosGate (`GET /till/access`) wraps Bill history, Close restaurant day and Table bookings:
  the phone asks it too (`useAccess`, TablesKit).

**Files (new only):** `serviceRoles.ts` (the API's lists and sentences), `billHistory.ts`, `dayEnd.ts`,
`roomCharges.ts`, `tableBookings.ts` (each with its `.check.ts`; `serviceRoles` is checked in
`roomCharges.check.ts`), `serviceData.ts` (reads and writes), `ServiceKit.tsx` (the pieces the four
share, drawn to docs/NATIVE.md), `BillHistory.tsx`, `DayEnd.tsx`, `RoomCharges.tsx`,
`TableBookings.tsx`; routes `app/pos/[code]/{bill-history,day-end,room-charges,table-bookings}.tsx`.
Reused by import: `TablesKit` (useAccess, ReadProblem, Refused, Stale, SaidBar, ty), `Pay.tsx`'s
`PrintBill` (the reprint), `bill.ts` (`billRows`), `types.ts` (`Order`).

**Money is the server's.** Every figure shown is a field the server sends, written as sent (paise
kept, MEMORY 9: `rupees`/`precise` in `dayEnd.ts`). Where the web adds figures up in the browser, the
phone shows the server's rows instead:
- Close restaurant day: the Complimentary tile's "₹X not in sales" and the NC card's total line (the
  web sums the NC values) are left out; each NC bill's value is on its row. "The sum" lists each
  movement that counts as its own row instead of the web's per-kind totals. The Cash step's Counted
  and its variance box are the server's saved count and variance, not the web's live sum of the notes
  typed (the Save button still says the typed sum, which is what the person counted and what the notes
  sent make). The Finalize hint "To deposit: ₹X" (count − float, worked in the browser) is not drawn;
  the hint always says "From ₹0 to the ₹X counted. The rest is deposited."
- Charges to rooms: each bill shows "₹before tax + ₹tax tax" as sent, not the web's amount + tax;
  the Bills heading's "₹X on folios" pill (a browser sum) is not drawn; the export has Before tax and
  Tax, not Amount.
- The notes and coins typed (Open the day, Count the drawer) are added by the phone as on the web,
  whole notes only, in integers: Open the day must send that figure (the API takes `opening`).

**Unknown outcome (MEMORY 16):** Record a movement (the route reads no key; a repeat is a second
movement) empties its amount, says "Not known whether it was recorded" and takes no more taps until its
sheet is closed (the day is then read again). Close empties the float kept and stays grey until the day
has been read again after the lost reply. A new table booking (a repeat books a second table) stops
"Book the table" until the sheet is closed. Count (replaced whole), Open (a second is refused) and
every act on a booking (refused from a state it may not be done in) are safe to repeat; each is
latched at the tap (MEMORY 8). Close asks first with the phone's own dialog (docs/NATIVE.md).

**States:** loading ("Loading the restaurant day…", "Loading the bills…", …) · failed (ReadProblem: the
server's refusal, "did not load", or unreachable with no copy) · empty (the web's words for each) ·
a failed re-read keeps the figures with Stale's "Not up to date: …". Offline writes are refused with the
web's sentence (send()).

### Picture match (20 Nov)

Compared by **reading the code against the pictures**; **nothing was opened on a screen**. The
pictures were taken on 31 Oct as the GM; the code is today's (16 Nov), so where they differ the code
wins (MEMORY 14).

| Screen | Picture(s) | Result |
|---|---|---|
| Close restaurant day | `all/47-point-of-sale-close-restaurant-day` = `new/n-pos-day-end` (identical files) | Matches in order and words, with the differences below |
| Charges to rooms | `all/48-point-of-sale-charges-to-rooms` = `new/n-pos-room-charges` (identical) | Matches, differences below |
| Bill history | `new/n-pos-bill-history` | Matches, differences below |
| Table bookings | `new/n-pos-table-bookings` | Matches the empty page; New booking and the day are today's code, not pictured |

**Differences left, each with its reason:**
1. All four: the top bar and the business-date banner are the shell's frame, not these screens.
2. Close restaurant day: the money rows above (server's figures only). The NC card's line is today's
   code ("Bills given free, at their menu prices…", with each value) not the picture's ("no value is
   counted for them"). The step tiles truncate their words at 375 px as the picture does. The movement's
   photo (take, pick, open) is "On the website for now" (`expo-image-picker` ~57.0.20). The Record sheet,
   the Cash and Finalize steps, a closed day and a blocker are **not pictured**: built from the code.
3. Charges to rooms: the picture's single amount ("₹294") is "₹<before tax> + ₹<tax> tax" on the phone (the server's two figures);
   no "₹3,343 on folios" pill; the Till link in "This is the outside door" is plain words (the Till is
   another lane's screen). The refusals box and an empty list are not pictured.
4. Bill history: "Download to Excel" (picture) is today's ExportButtons (PDF or print, share) — the
   web's CSV/Excel file itself waits for `expo-file-system` ~57.0.7 + `expo-sharing` ~57.0.23 (or the
   core's export, M-14). From / To are typed (2026-10-27) with − / + day steppers, not the web's date
   picker (`@react-native-community/datetimepicker` 9.1.0). An NC bill reads "NC ₹336.00" (today's code,
   D27-394), the picture "NC". The opened bill and its reprint are not pictured.
5. Table bookings: the description is today's longer sentence; New booking, the day stepper and every
   card are not pictured. The acts are drawn **greyed with the API's sentence** for anyone who may not
   answer (a viewer), where the web hides them (AGENTS rule 1). The time is typed (20:30), not picked.

**4 of 4 screens match their pictures apart from the differences above.**

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
left:** (1) **Service charge** is not in the picture of 31 Oct; today's code has it (Setup.tsx, its "260"), so it is
built from the code (MEMORY 14; the PMS checkout's history is squashed, so its date cannot be read). (2) **The allowance's bills** are cards of labelled figures, not the web's five-column
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
ExportButtons sit in its header and are not in the picture of 31 Oct (D27-383 item 1, today's code). (2) **Profit per dish** (a third
tab for the owner, an Admin and the GM) and **Promotions'** coupon words are not in the picture: built from
today's code. (3) **Minutes, course and MRP** open a small sheet with one box; the web types into the
round itself. (4) **Free** is the phone's Switch. (5) The frame, as above.

**2 of 2 screens match their pictures, with the differences above.**

**Questions for the owner (in the lane's report):** the new-dish row starts at 5% as the web's select
does - keep, or start with no rate chosen; Switch off a KOT kind, Remove a computer and Remove a side
ask nothing first on the web - keep, or ask with the phone's own Alert.
