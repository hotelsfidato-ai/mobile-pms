# pos — the restaurant waiter on a phone (slice 3) — DRAFT, waiting on the owner

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

## Proposed for the phone (the owner decides; questions in HANDOVER)

| Screen | Web twin | On the phone |
|---|---|---|
| Tables | Floor | sections and tiles as the web, the amount or a dash, minutes, "N ready" → Taken; tap a free table → the order pad, a running one → a new round or the order |
| Order pad | OrderPad | the menu by section, dishes with their variations and sides (the web's DishDialog rules), the pad's "before tax" total, one Send |
| The order | Till / Terminal | its lines from the server (totals, tax, the server's figures only), quantity and strike (a sent dish: managers only, with a reason, disabled with it for others), Send to the kitchen, Print bill, Charge to room, and the settle methods the owner picks |

**Live updates:** polling only at first (the web's 30 s backstop, and after every write); the
stream later. **Test person:** none has the `pos` role (question 4).

## Faults found in the web and the API (in `docs/api-requests.md`, R-10 to R-14)

R-10 no `pos` test person · R-11 the printed bill's tax on a discounted bill · R-12 a round with a
table id fails as a 500 when the table already runs (a held one would stop the drain) · R-13 no
idempotency on any till write, so a round resent after a lost reply goes in twice · R-14 a room
charge held offline says the check-in sentence.
