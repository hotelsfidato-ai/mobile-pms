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
