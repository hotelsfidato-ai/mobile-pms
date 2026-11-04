# purchasing — ask, approve, receive, away from a desk (Tier 2, slice 17)

**Web twin:** `src/modules/purchasing/` in the PMS (`MODULE.md`, `DEFECTS.md`, `pages/Purchasing.tsx`,
`pages/PurchaseRequest.tsx`, `pages/WhoMayAsk.tsx`, `pages/SupplierDuesPage.tsx`,
`components/BarBills.tsx`, `components/SupplierDues.tsx`, `data/purchasing.ts`, `nav.ts`, `routes.tsx`);
the API in `api/src/modules/purchasing/purchasing.ts` and `purchasingGrants.ts`, the Store's door in
`api/src/modules/stores/stores.ts` (`mayDeliverInto`, `deliveryFactsProblem`) and `stockGrants.ts`, the
approvals engine in `api/src/routes/approvals.ts`, the gates in `api/src/roleGate.ts` (every purchasing
route is `own(...)`: the route decides), the offline tiers in `src/lib/offline.ts`. **Decided:** M-1,
M-5, M-9, M-11. The web's decisions: D18-2 (who may raise is a setting), D18-3 (the order sent by hand),
D18-4 (the GM approves), D18-19 (one Approvals screen), D22-11 (housekeeping may raise), D27-120 (₹0
only when Free), D27-238 (GST and use-by at delivery), D27-354 (bar bills), D27-370 / 372 (supplier dues).

## The web twin's map (4 Nov)

| Web page / act | Address | API | Who (the route) | Offline (src/lib/offline.ts) |
|---|---|---|---|---|
| Purchasing (the list) | `/h/:code/purchasing` | `GET /purchasing` (requests, stores, suppliers, the Store's items, `me.mayRaise`, `me.maySetRequesters`) | VIEW_ROLES (`purchasing` view) | a read |
| Ask to buy (dialog) | on the list | `POST /purchasing/requests`; the route calls `app.request_approval` (076) | the setting `app.may_raise_purchase` (D18-2) | **refused** (not listed: UNLISTED) |
| One order | `/h/:code/purchasing/:id` | `GET /purchasing/requests/:id` (+ the list, + `GET /approvals?status=all` for its row) | VIEW_ROLES | a read |
| Agree a price | on the order | `PUT /purchasing/requests/:id/lines/:lineId` `{ unitPrice, free? }` | the setting; refused once ordered | **refused** |
| Send the order | on the order | `POST /…/:id/order` `{ supplierId }` → `app.mark_purchase_ordered` | the setting; approved and priced (the database) | **refused** |
| Record the delivery | on the order | `POST /…/:id/delivery` (lines as received, GST, use-by, `credit?`) → the Store's `receiveIntoStore` | the Store's `mayDeliverInto` = `stock` create (NOT the setting) | **refused** |
| Cancel | on the order | `POST /…/:id/cancel` `{ reason }` | the setting | **refused** |
| Approve / Refuse / Send back | on the order (web) | `POST /approvals/:id/approved\|rejected\|clarify` | the engine's `mayDecide` | **refused** |
| Download the order | on the order | `GET /purchasing/orders/:id.pdf` | VIEW_ROLES | — |
| Who may ask to buy | `/h/:code/purchasing/who-may-ask` | `GET/PUT /purchasing/requesters[/:role]` | PUT: owner, admin | **refused** |
| Bar (tab) | `?tab=bar` | `GET /bar/drinks`, `/bar/purchases`, `POST /bar/purchases[/:id/photo]` | BAR_VIEW / BAR_RECORDERS | **refused** |
| Supplier dues (tab, page) | `?tab=dues`, `/h/:code/supplier-dues` | `GET /purchasing/dues`, payment, credit note, reverse | DUES_ROLES | **refused** |

VIEW_ROLES: owner, admin, GM, hotel manager, kitchen manager, Inventory Manager, housekeeping, the
accountant, a viewer. Raising, pricing, ordering and cancelling are ONE per-property setting, answered
by the server as `me.mayRaise`. Putting a delivery on a shelf is the Store's: owner, admin, GM, hotel
manager, Inventory Manager, kitchen manager. No purchasing write is on the web's offline list, so
`send()` refuses each with the web's sentence and holds nothing (`purchase.check.ts` holds it).

## Screens

| Screen | Route → file | Picture | Reads (key `["purchasing", code, …]`) |
|---|---|---|---|
| Purchasing | `app/purchasing/[code]/index.tsx` → `Purchasing.tsx` | `pms-shots/all/34-store-and-equipment-purchasing` (as dev-gm) | `GET /purchasing` (`"list"`) |
| Ask to buy (dialog) | on Purchasing → `Ask.tsx` | not pictured | the list's read |
| One order | `app/purchasing/[code]/[id].tsx` → `Request.tsx` | not pictured | `GET /purchasing/requests/:id` (`"request", id`), the list, and while waiting `GET /approvals?status=all` (`"approval", id`) |
| Agree a price · Send · Cancel (dialogs) | on the order → `Acts.tsx` | not pictured | — |
| Record the delivery (dialog) | on the order → `Delivery.tsx` | not pictured | — |

Rules: `purchase.ts` (`purchase.check.ts`), rights: `roles.ts` (`roles.check.ts`), calls: `data.ts`,
the pieces the other kits lack: `kit.tsx` (the rest from `src/modules/guest-services/kit.tsx` and
`src/modules/laundry/kit.tsx`, imported, never edited; money and dates through approvals' `amountText`
and laundry's `dayOf` / `clockOf`, pure). Every accepted write re-reads `["purchasing", code]` and
`["approvals", code]`; an order coming back into view (after Approvals) reads again. No poll: the web's
pages do not poll.

## Purchasing and Approvals: how they relate

A request raised here calls the ONE approvals engine (`app.request_approval`, kind `purchase`, the
reason and the amount at the moment it was raised). While it waits, it is a row on the app's
**Approvals** screen (`src/modules/approvals/`, `/approvals/:code`), titled "Purchase request", where the
GM (or a named backup) approves or refuses it. **This module adds no second Approve button**: the order
shows "Waiting for the general manager", the server's `blockedBecause` when it is not this person's to
decide, and **Open Approvals** (primary when the server says `mayDecide`). Coming back, the order reads
again and shows Ready to order, Refused or Sent back, with who decided and their note. The state itself
is the server's `stateOf` (the request's status and its approval's), never copied. Two gaps, both
reported: the Approvals row is not yet a link back to the order (that module's `rules.ts` waits for this
screen), and the approval's amount is the one at raising, so a request raised unpriced shows no amount
there even after its prices are agreed (the PMS's, in the report).

## Writes, who, offline

| Write | Shown when (the web's condition) | Who (the API) | Offline |
|---|---|---|---|
| Ask to buy | always (grey before the list is read) | `me.mayRaise`; else grey, and the web's card "Your role cannot raise…" | refused, the web's sentence |
| Agree a price | the order has not gone out (`mayPrice`) | `me.mayRaise` (RAISE_REFUSED) | refused |
| Send the order | Ready to order and every line priced (`maySend`); the unpriced tile says why otherwise | `me.mayRaise` | refused |
| Record the delivery | Ordered (`mayDeliver`) | the Store's `stock` create (RECEIVE_REFUSED) | refused |
| Cancel | not delivered, not cancelled (`mayCancel`) | `me.mayRaise` | refused |
| Download the order | Ready, Ordered, Delivered | — | grey: "On the website for now" |

**One tap, one write** (MEMORY 8): every write is latched at the tap (`useRef`) and its button greys
while it is on its way. **Keepers** (`data.ts`, core `keys.ts`): one per request for the price, the
order, the delivery and the cancellation, `seen()` after each read of the request; one per property for
Ask, `seen()` after each read of the list. The purchasing routes do not read the idempotency key; what
stops a second delivery is the server's own check (the order is no longer "ordered").

**Sent as typed** (`purchase.ts` `typed`): a strict decimal, never `Number("")` (0) or `Number("0x10")`.
A quantity received left blank is refused with the web's sentence, never sent as 0; a cost left blank is
null; a price left blank is "not agreed" (null); ₹0 only ticked Free.

## Where the phone differs from the web

1. **The approval is decided in Approvals**, not on the order (the brief: one place on the phone). The
   web's order keeps Approve / Refuse / Send back (D18-19). Send back (`clarify`) is not on the phone's
   Approvals either, as the web's Approvals page. A question for the owner (the report).
2. **Record the delivery is offered by the Store's rule**, the API's: the web shows it only to a person
   on the setting, so a kitchen manager not on it cannot reach a delivery the route would take; one on
   the setting who is not a Store keeper (housekeeping) sees it and is refused. The phone shows it to the
   Store's keepers, grey with the Store's sentence to the rest (AGENTS rule 1).
3. **Money is the server's text.** The web's `money()` rounds to whole rupees (₹51.25 reads ₹51); the
   phone writes the server's figure exactly (approvals' `amountText`, MEMORY 9).
4. **A line's Amount is its parts** ("40 × ₹51.25"): the web multiplies it on the device. The order's
   Total is the server's.
5. **The GST amount at delivery is typed from the bill**: the web fills it from came × cost × rate on the
   device; the phone shows those parts beside it and fills nothing.
6. **A price is agreed in a small dialog** (Agree a price / Change the price, with Free), not typed in the
   row and saved on leaving the box: a phone has no reliable "leaving".
7. **The lines are stacked** (Ordered, Agreed price, Amount, Came, Cost under each item), where the web's
   six columns scroll sideways inside their card at 390 px.
8. **Dates are typed YYYY-MM-DD** (use-by, the bill's date and due date; M-7, no date-picker package).
   The bill's date starts at the property's own today (`hotel.today`), where the web takes the device's.
   The GST rates are four 44 px choices under the box (the web's datalist).
9. **Times are read as the server wrote them** (laundry's `dayOf` / `clockOf`, MEMORY 7); the web reads
   them in the device's zone. The same for a device in India.
10. **Download the order, Who may ask, the Bar tab and Supplier dues** stay on the website: grey or a
    card with "On the website for now" (the PDF needs `expo-file-system` ~57.0.7 and `expo-sharing`
    ~57.0.23; the bar's bill a photo, `expo-image-picker` ~57.0.20; the rest is set-up and accounts).
11. **Ask to buy is shown grey** to a person the setting leaves out, with the web's card; the web hides
    it. **Back** stays on the module's screens (HANDOVER question 3, open).
12. **The toasts** are the web's words, one line at the foot of the screen; a refusal stays inside its
    dialog in the server's words.

## Picture match (4 Nov)

Compared by reading the code against the picture (390 px wide, taken at 2x, as dev-gm; its `.txt` holds
the five cards' words; colours sampled from the file: the What-for value is grey-600 #4c5b67, the labels
grey-500, the reference and values ink-900); never seen running. The top bar and the business-date line
are the frame's (mobile/shell).

| Screen | Picture | Result |
|---|---|---|
| Purchasing | `all/34-store-and-equipment-purchasing` | **Matches**, with differences 11 (Back) and 10 (the Bar and Supplier dues tabs open a card, not their lists; not visible in the picture, which shows Restaurant and hotel): the title and its line; Ask to buy, orange with its plus; Restaurant and hotel · Bar · Supplier dues (Supplier dues for the GM, the owner, an admin, the accountant); one white card, a request a block over hairlines, the reference in ink, then STATE (Delivered green, Ready to order blue, Refused red, with their dots), WHAT FOR (grey-600), DELIVER TO, SUPPLIER ("-" before the order goes), ITEMS, TOTAL ("-" while a line is unpriced), ASKED BY, ASKED ("28 Oct 2026") in a 104 px capitals column, a chevron at the right. Not pictured, built from the web's code: Waiting for approval and Sent back (yellow), Ordered (blue), Cancelled (red), the "cannot raise" and "no store" cards, the empty, loading, failed and offline states, Who may ask (owner, admin). |
| Ask to buy | none | Not pictured: built from the web's AskDialog. |
| One order | none | Not pictured: built from the web's PurchaseRequest page; the differences above. |
| The dialogs | none | Not pictured: the web's SendDialog, CancelDialog, DeliveryDialog, LineRow. |

**1 of 1 pictured screens matches its picture** (the other four are not pictured).
`all/35-store-and-equipment-who-may-ask-to-buy` and `new/n-h-supplier-dues` were read for reference only:
both stay on the website.

## Test people (development, `x-dev-staff-id`, hotel 5EL)

`dev-gm` (the picture's; approves in Approvals), `dev-stores` (the Inventory Manager: raises, prices,
sends, receives), `dev-owner` (Who may ask grey), `dev-housekeeping` (raises once switched on; the
delivery grey with the Store's sentence), `dev-finance` (reads; Supplier dues tab), `dev-pos` (refused,
the server's sentence).
