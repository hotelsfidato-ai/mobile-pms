# banquet — the halls' diary and a function's page, away from the desk (Tier 2, slice 15)

**Web twin:** `src/modules/banquet/` in the PMS (`MODULE.md`, `DEFECTS.md`, `pages/Banquet.tsx`,
`pages/BanquetEvent.tsx`, `components/FunctionBill.tsx`, `pages/BanquetSetup.tsx`, `data/banquet.ts`,
`nav.ts`, `routes.tsx`); the API in `api/src/modules/banquet/banquet.ts` (and finance's per-bill door:
`folioBalance`, `takeFolioPayment`, `issueFolioInvoice`), its gates in `api/src/roleGate.ts`, who holds
`reservation` and `invoice` in `api/src/permissions.ts`, the offline tiers in `src/lib/offline.ts`. Read
at the PMS's `a4527ea` (2 Nov), the last change to every banquet file. **Decided:** M-1, M-5, M-9,
M-11. The web's decisions: D17-21 (restaurant orders on a function), D27-120 (0 only with Free),
D27-124 (the banquet tax unset), D27-132 to D27-138 (the function's bill), D27-154 (reopening),
D27-305 (a package is retired, never changed).

## The web twin's map (4 Nov)

| Web page / act | Address | API it calls | Gate (roleGate.ts) | Offline (src/lib/offline.ts) |
|---|---|---|---|---|
| Diary | `/h/:code/banquet` | `GET /banquet[?from=&to=]` | STAYS: `reservation` view | a read |
| Register a function (dialog) | on Diary | `GET /banquet/setup`, `POST /banquet/events` | view; FUNCTION_BOOK `reservation` create | **queued** ("Function enquiry"); the server reads the key (062) |
| One function | `/h/:code/banquet/:id` | `GET /banquet/events/:id` | STAYS; WITHHELD blanks `folioId`, `bill`, `invoice` without `invoice` view | a read |
| Confirm and hold the hall | on a function | `POST /events/:id/confirm` | FUNCTION_CHANGE (edit) | **refused** ("Confirming takes the hall…") |
| Cancel | on a function | `POST /events/:id/cancel` | FUNCTION_CANCEL | **refused** (UNLISTED) |
| Set / Change the hall price | on a function | `PATCH /events/:id` `{agreedAmount, free}` | FUNCTION_CHANGE | **refused** |
| Add a course, remove one | on a function | `POST /events/:id/catering`, `DELETE …/catering/:lineId` | FUNCTION_CHANGE | **refused** |
| Take an advance, Settle | the bill card | `POST /events/:id/payments` | FUNCTION_MONEY `reservation` approve | **refused**; the server reads the key |
| Bill the function, Reopen the bill | the bill card | `POST /events/:id/bill`, `/reopen` | FUNCTION_MONEY | **refused** |
| Issue tax invoice | the bill card | `POST /events/:id/invoice` | FUNCTION_INVOICE `invoice` approve | **refused** |
| Halls and packages | `/h/:code/banquet/setup` | `GET /setup`, `POST`/`PATCH /venues`, `/packages` | `reservation` or `room_config` view; HALLS `room_config` edit | **refused** — stays on the website |

Every banquet route but `attachable` (the till's) asks `app.module_enabled(hotel, 'banquet')` and
answers 403 "This property has no banquet hall. Turn it on in the property's settings if that is
wrong." where it is off. `reservation` view: owner, admin, GM, hotel manager, revenue manager,
reception, housekeeping, kitchen manager, waiter, bar, accountant, viewer; create / edit / cancel:
owner, admin, GM, hotel manager, reception; approve: owner, admin, GM. `invoice` approve: owner, admin,
GM, accountant. **Idempotency keys (PMS R-13), checked:** the server reads `idempotency-key` on
registering (`banquet_events.idempotency_key`) and on a payment (finance's `postedWith`); confirm,
cancel, the price, catering, the bill, reopening and the invoice do not. Confirm, Cancel, the bill
and the invoice are guarded by the function's state instead (a second press is refused, or the
invoice answers the one already issued); **a course added twice after a lost reply is two courses**
(a PMS request, below).

## Screens

| Screen | Route → file | Picture | Reads (key `["banquet", code, …]`) |
|---|---|---|---|
| Diary | `app/banquet/[code]/index.tsx` → `Diary.tsx` | `pms-shots/new/n-h-banquet` (dev-gm) | `GET /banquet[?from=&to=]` |
| Register a function (dialog) | on Diary → `Register.tsx` | not pictured | `GET /banquet/setup` |
| One function | `app/banquet/[code]/[id].tsx[?registered=&warning=]` → `Fn.tsx` | not pictured | `GET /banquet/events/:id` |
| Price, course, cancel (dialogs) | on a function → `Changes.tsx` | not pictured | `GET /banquet/setup` (Add a course) |
| The bill card and its dialogs | on a function → `Bill.tsx` | not pictured | — |

Rules: `rules.ts` (`rules.check.ts`), rights: `roles.ts` (`roles.check.ts`), calls: `data.ts`, the
pieces the other kits lack: `kit.tsx`. Imported, never edited: the guest-services kit (Btn, Dialog,
Select, Toast…), laundry's `LoadFailed`, `Note` and its `rupees`, `dayOf`, `clockOf`, finance's `Pill`,
`Field`, `Input`, `Tick`, `IconBtn` and its payment rules (`payingWays`, `asksPan`, `asks`,
`asksCredit`, `owedLine`, `startAmount`, `typed`), housekeeping's `Day` stepper. Every accepted write
re-reads `["banquet", code]`. No poll: the web's pages do not poll.

## Writes, who, offline

| Write | Shown when (the web) | Who (the API) | Offline |
|---|---|---|---|
| Register a function | always (the dialog is ready with a hall, a title, a host, both times) | `whyNotBook` | **held** with its key; said "Saved on this phone" |
| Confirm and hold the hall | an enquiry (`mayConfirm`) | `whyNotChange` | refused, the web's sentence |
| Cancel | not cancelled, not billed (`mayCancel`) | `whyNotCancel` | refused |
| Set / Change the hall price | not billed (`mayChangeFood`) | `whyNotChange` | refused |
| Add a course, remove one | not billed | `whyNotChange` | refused |
| Take an advance, Bill the function | confirmed (`billActs`) | `whyNotMoney` | refused |
| Settle | billed and the server's balance owed | `whyNotMoney` | refused |
| Issue tax invoice | billed, no invoice standing | `whyNotInvoice` | refused |
| Reopen the bill | billed, no invoice standing | `whyNotMoney` | refused |

**A role the API refuses** sees the act grey with the API's sentence once under the buttons (AGENTS
rule 1): the web shows Confirm, Cancel, the price and the courses and the server refuses; it leaves
the bill's buttons out for a role without the grant. **A state that rules an act out leaves it out**,
as the web. **One tap, one write** (MEMORY 8): each write is latched at the tap (`useRef`) and its
button greys while it is on its way. **A keeper per function** (`data.ts`, `seen()` after the
function's read; core `keys.ts`) carries the payment, the bill, reopening and the invoice.

## Money

- **Every figure is the server's** (`rupees`): the agreed amount, the hall, the catering, the
  restaurant orders, the total, each order's amount, the bill's Charged so far / Billed, GST, Paid and
  Balance — "₹50,000" where whole, "₹1,25,449.50" where it carries paise (the web's `money()` rounds
  them: MEMORY 9). A figure not sent is a dash, never 0; 0 is shown where the server sent 0.
- **The total is null while anything is unpriced**, a dash, with the server's `unpriced` sentence
  under it. **Catering with no course is a dash**, not ₹0 of food (the web's QA BQ-5).
- **A course's amount** (plates × rate) is multiplied on the device by the web; the server sends none.
  The phone shows its parts ("120 plates · ₹850 each", or "no rate agreed"), and no figure at the
  right of the row; the catering total is the server's, on The money.
- **A negative balance is "Paid ahead"** with its size as sent (the web's label), never "₹0".
- **Settle** starts at the server's balance where it owes (finance's `startAmount`); its description
  is the server's balance and its word (`owedLine`: "₹X outstanding" / "overpaid"). **More than the
  bill** is told by the server's own refusal (`needs: "credit"`, or its sentence recognised), then the
  tick "Hold it as the host's credit": the web works out the difference on the device, the phone
  does not. An advance is held as credit by the server itself (`heldAsCredit` forced, D27-137).
- **The PAN** is asked above ₹1,00,000 in cash by the method's kind (finance's `asksPan`, the
  server's own test); the web's banquet dialog asks by the label "Cash".
- **Typed figures:** blank is unpriced (null), never 0 (MLDY-1); 0 only with Free ticked (the server's
  `priceProblem`); a word typed as an amount, a rate or the guests is "Not a figure." and not sent
  (the web would send `Number("abc")`, which reaches the server as null: unpriced, unsaid).

## On the website for now (grey, with the reason)

- **Halls and packages** (`/h/:code/banquet/setup`, picture `new/n-h-banquet-setup`): add a hall, edit
  one, add a package, switch one off or on. Desk set-up (the brief; M-3). Its button on the Diary, and
  "Add a hall" in the no-halls state, are grey with "On the website for now". Only how a package's
  price shows is used: "Dinner buffet · ₹850 a head" in Add a course.
- **The tax invoice's page and its credit note** (`/h/:code/invoices/doc/:number`): the bill card
  names the invoice; its page is the finance module's, not on the phone.
- **Amending a function's times, guests, title or notes**: the web's PATCH takes them, but no web
  screen offers them (only the hall price). Nothing to port.

## Where the phone differs from the web (for the owner's look)

1. **A Back capsule** beside each title (the web's "← Diary" button on a function, and no breadcrumb).
2. **Rights:** grey with the API's sentence where the web shows the button and the server refuses, or
   leaves the bill's buttons out.
3. **From and Until** are a day stepper and a 24-hour time box (M-7: no date-picker package), sent
   as the web's datetime-local text on the property's clock.
4. **Registering ends on the function**, which says "Registered" or "Registered as an enquiry" with
   the server's warning (the web's toast, then its navigation): the route's `registered` and `warning`.
5. **A refusal stays on the screen** in a card, its title as the web's toast ("The hall is not free"
   with the server's sentence); offline the web's sentence alone (the web titles that "The hall is not
   free" too).
6. **The invoice** is its number, not a link.
7. **Dates** are read as the property's clock text (`dayOf`, `clockOf`, `timeOf`), never through
   `Date`: the server sends "YYYY-MM-DDTHH:MI" with no zone (app.hotel_clock), and the web reads it in
   the browser's zone.
8. **Not up to date** is the app's line ("Could not read this again…"), not the web's yellow strip.

## Picture match (4 Nov)

Compared by reading the code against the picture (`reference/pms-shots/new/`, 390 px wide, taken at
2x), never seen running. The picture's top bar and business-date line are the shell's (mobile/shell),
not this module's. The banquet pages last changed on 2 Nov (`a4527ea`), the pictures were taken 4 Nov.

| Screen | Picture | Result |
|---|---|---|
| Diary | `new/n-h-banquet` (dev-gm) | **Matches**, with these differences left: (a) a **Back** capsule beside the title; (b) **Halls and packages** is grey with "Halls and packages: On the website for now" under the two buttons (set-up stays on the website); (c) buttons are **44 px** (the picture's 36): touch targets of 44 px or more (AGENTS); (d) for a role the API refuses booking, Register a function is grey with the API's sentence (the picture is the GM's, who may). The words, their order, the head's sentence, the two buttons with their icons, the toolbar's "← Earlier", "From today" (calendar) and "Later →" wrapping as the picture, the hall's grey-50 row with "2 in this window", each function's title, pill (Confirmed green, Enquiry grey), reference, clock and times, host, guests, "Registered by", the amount (a dash when unpriced) and the chevron are the web's code. |
| Register a function | none (a dialog) | **Not pictured**: built from `RegisterDialog`; difference 3. |
| One function | none | **Not pictured**: built from `pages/BanquetEvent.tsx` and `FunctionBill.tsx`; differences 1, 2, 4-7, and a course's amount shown as its parts. |
| Halls and packages | `new/n-h-banquet-setup` | **On the website** (not built); only a package's price words are used. |

**1 of 1 pictured screens matches its picture** (with the differences listed); four are not pictured.

## Not in this version (the web's own open items)

Correcting a billed function's figures after a credit note, and refunding a cancelled function's
advance (the web's DEFECTS BQ-9, "Left open"); a function billed to a company (the server reads one,
no screen sets it).
