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
