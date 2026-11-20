# finance — a stay's bill, payments and check-out on a phone (slice 4b)

**Web twin:** `src/modules/finance` one folder up — `flows/FolioPanel.tsx` (the Bill tab of the stay
panel), `sections.ts`, `flows/BillPrint.tsx`, `flows/IssueInvoiceDialog.tsx`, `pages/Invoices.tsx`,
`data/*`; front desk's `flows/LateCheckOutFlow.tsx`, `components/ReadyReasons.tsx`, `checkOut` in
`data/operations.ts`; the rules in `src/lib/rules.ts`; the API in `api/src/modules/finance/`
(`folios.ts`, `postings.ts`, `invoices.ts`, `billing.ts`, `cashLimit.ts`, `creditLimit.ts`),
`front-desk/operations.ts` (check-out) and `api/src/roleGate.ts`. Its `MODULE.md` and `DEFECTS.md`
(FIN-1 …) are the source. **Bill at the desk, Folio in Finance:** these are the desk's words.

**Scope:** the one screen a desk works a bill from. The web's Finance pages (Folios, Invoices,
Payments, Cashiering, Company accounts) are not built here.

## Screen

| Screen | Route → file | Web twin |
|---|---|---|
| A stay's bill | `app/folio/[code]/[id].tsx` → `Folio.tsx` | the Bill tab of the stay panel |

Opened by the desk's lists and the stay (slice 4a: Due out's rows, the stay's Bill tab and "Settle and
check out") with `/folio/<code>/<stay id>`. The parameter is `[id]`, lower case, for the gate (MFIN-3).
Back and check-out: `router.back()` (to the stay or Due out), or `/front-desk/<code>/in-house` with no
history. The stay itself is the front desk's screen; this one never draws it.

## What the server gives, what the phone shows

**The phone adds nothing up, never computes a tax, never numbers an invoice.** `bill.ts` only places
lines.

| On screen | The server's figure |
|---|---|
| A line's amount, its date, category, who posted it | `GET /stays/:id/postings` |
| The headline and the closing row | `GET /stays/:id/folio` `.balance`; 404 `noBill` is "No bill yet" and a dash |
| Each bill's tab, and Which bill in Settle | `GET /stays/:id/folios` `.balance` |
| Everything's tab | `/folio` `.balance` (the web adds the tabs) |
| Net, CGST and SGST per rate, VAT per rate, Total charges, Received | `GET /stays/:id/bill` (`app.stay_bill`): `net`, `taxes[]`, `vat[]`, `total`, `paid` |
| Nights to come, tonight's night and its GST | the same read: `nightsToCome`, `tonight` |
| What was over the bill, a credit limit | the server's own refusal sentence, with its figure |
| Add charge's rate | `GET /tax/room/rate?amount=` |
| Includes GST's split | `GET /tax/room/before-gst?gross=` |
| The invoice's next number, each bill's state | `GET /invoice-series`, `GET /billable` |

## Where the phone differs from the web, and why

Each is the web adding a figure itself, which the brief forbids:

1. **A section has no Subtotal or tax rows.** The sections place the lines; one block of the
   server's totals sits under them (the printed bill's: Net, CGST, SGST, VAT, then Total charges).
   Asked of the API as a section list on `/bill` (requests).
2. **Charges to come** shows the nights, the rate, tonight's night and its GST; not the nights' sum,
   their GST or "Due once they are posted". While nights are to come the headline and the closing
   row say Balance, grey, with the pill Charges to come: never "Overpaid" over a stay still running
   (D27-199). Asked of the API too.
3. **Settle has no Remaining**, and more than the bill is said by the server's refusal, with its
   figure, on the first press; the web's tick then sends it. One round trip, no write.
4. **Add charge has no CGST / SGST / Total preview:** the rate only.
5. **Change rate** prints the server's before-GST and with-GST figures, not the web's subtraction.
6. **The stay panel's foot** (Charged, Paid, Due) adds two figures on the web; Total charges and
   Received in the ledger are the server's own.
7. **A bill's tab** shows that bill's lines and its balance; the stay's totals only on Everything.

8. **Every figure to the paisa** (₹7,582.50), where the web's money() prints whole rupees on the
   headline, the tabs, Settle and the "still owed" sentence: the phone never rounds a figure the
   server sent (MFIN-4). The web's moneyPrecise, which its paper uses, is the one formatter here.
9. **Settle shows the server's balance as sent**: an overpaid bill says "₹784.00 overpaid", never
   "₹0 outstanding"; the amount starts at the balance only when it owes, else blank (MFIN-4).

Other differences: a control the API would refuse is grey with the API's sentence, where the web
hides it (AGENTS rule 1); Rule 159 asks by the method's kind, the server's own test, not the word
"Cash"; a select is a row of capsules (no picker package); the interim bill prints the hotel's name,
not the group's logo; a departed stay offers its tax invoice here (the web does on Invoices).

## Writes and offline

All refused offline by the web's tiers (`core/offline.ts`), said in the web's words; nothing is held.
Every path is in `writes.ts`, and `writes.check.ts` proves each is refused with its sentence. Every
write's button goes through `useOnce` (Kit.tsx): one press, one request (MFIN-1).

| Write | Endpoint | Who (API) | Offline |
|---|---|---|---|
| Take a payment | `POST /stays/:id/payments` | payment create | refused, "A receipt cannot be taken offline…" |
| Check out | `POST /stays/:id/check-out` | reservation edit (not the accountant) | refused, "This settles or re-shapes a bill…" |
| Second bill | `POST /stays/:id/folios` | invoice create | refused, the same |
| Tax invoice | `POST /stays/:id/invoice` | invoice create | refused, "An invoice cannot be raised offline…" |
| Add a charge | `POST /stays/:id/charges` | invoice create | refused, "The ledger is append-only…" |
| Reverse, move | `POST …/charges/:id/reverse`, `POST /postings/:id/transfer` | invoice edit; a payment only the four of D27-125 | refused, the same |
| Edit a charge, change the rate | `POST …/charges/:id/edit`, `POST /stays/:id/rate` | reservation approve | refused, unlisted: "This cannot be done offline yet…" |

Every accepted write re-reads `["finance", code]` and `["front-desk", code]`.

## Rules (each ported, each checked)

`roles.ts` (`roles.check.ts`): who may, in the API's sentences. `bill.ts` (`bill.check.ts`): where a
line sits; the headline; `whyNotLeave` (`canCheckOut`); a line's acts in the server's words; the
PAN above ₹1,00,000; the server's sentences recognised (MFIN-2); the one formatter, to the paisa;
Settle's figures as sent (`owedLine`, `startAmount`, `startBill`, `typedShown`). `writes.ts`
(`writes.check.ts`): every write refused offline in the web's sentence. `paper.ts`
(`paper.check.ts`): the interim bill as HTML for `expo-print`.

## States

Loading "Reading the bill…" · failed, the server's sentence and Try again · no connection, its own
words · empty "Nothing posted to this folio yet." · no bill yet, a dash · refused (a role without
bills), the API's sentence and no read.

## Money: where each rule is enforced

| Rule | Where |
|---|---|
| Every line, tax, total, balance is the server's; nothing summed | `bill.ts` `inSections` (places lines, a section has no total: checked); `paper.ts` `totalRows` (the server's rows); `Folio.tsx` `Ledger` (Total charges, Received, the closing row: `bill.total`, `bill.paid`, `/folio` `.balance`) |
| Never rounded | `bill.ts` `rupees` (two places, the only formatter on a bill; checked at ₹7,582.50 and ₹0.20) |
| A dash for a figure not sent, a real zero a figure | `bill.ts` `rupees(null/NaN)`, `owedLine(null)`, `typedShown("")` (checked); `Issue.tsx` (₹0.00 settled, not a dash) |
| Never clamped | `bill.ts` `owedLine`, `startAmount`; `Settle.tsx` `owedOn` (checked: an overpaid bill is overpaid) |
| Refused offline in the web's sentence | `writes.ts` + `writes.check.ts`; `data.ts` sends only through the core's `send()` |
| One press, one request | `Kit.tsx` `useOnce`, on every write's button (Settle, check out, the late departure, add charge, second bill, change rate, reverse, edit, move, issue) |
| Who may, in the API's words, disabled with its reason | `roles.ts` (checked); `Folio.tsx` (Settle's refusal wins over "nothing owed", and is printed under the buttons); `CheckOut.tsx` (the reason under Check out) |

## Picture match (4 Nov)

Compared by reading the code against the pictures and their words, **never seen running**.

| Screen | Pictures | Result |
|---|---|---|
| A stay's bill (`/folio/<code>/<id>`) | **None shows it.** `all/36-finance-folios` (the Finance list of folios), `38-finance-payments` (every receipt of the hotel), `39-finance-cashiering` (the drawer) are Finance pages this lane does not build (Scope); a word search of all 158 pictures finds no Bill tab, Settle or check-out sheet. `06`/`07` (In house, Due out) show how it is reached. | **No picture to match: kept to the ported code.** What the pictures do say, the screen does: 07's "Check-out stays disabled with its reason until each balance clears" (`CheckOut.tsx`: the button grey, the reason under it); 07's "Settle from the Bill tab" (Settle is the main button while money is owed); 36's "A positive balance is owed by the guest; a negative one is owed to them. Both are real and both print - neither is hidden or shown as zero" (`owedLine`, MFIN-4). Differences left: the pictures' figures are whole rupees (₹7,582), the bill's are to the paisa (₹7,582.50) - on purpose (difference 8). |

0 of 1 screens matched to a picture: the one screen has none. Asked of the mobile chat: a capture of
the stay panel's Bill tab, Settle and the check-out sheet (in house, due out, split, checked out).

---

# Lane m13-fin-desk (19-20 Nov): the finance desk

Five web screens on the phone, NEW files only: `desk.ts` (+ `desk.check.ts`, the rules and the
API's sentences), `deskData.ts` (reads and writes), `DeskKit.tsx` (the sheet with safe areas, the
pill with a warning tone, the four read states, the export, one write per intent), and one screen
each: `Cashiering.tsx`, `CityLedger.tsx`, `CashDeposits.tsx`, `FormC.tsx`, `SupplierDues.tsx`.
Routes `app/finance/[code]/{cashiering,city-ledger,cash-deposits,form-c,supplier-dues}.tsx`. The
existing `Kit.tsx` (Btn, Field, Input, Choice, Tick, SaidCard, Refused) is imported, never edited.

## The web twin's map (today's PMS, 16 Nov)

| Web address | Page and data | API (read · writes) | Who (roleGate.ts) | Offline (offline.ts) |
|---|---|---|---|---|
| `/h/:code/cashiering` | finance `pages/Cashiering.tsx`, `data/cashier.ts` | `GET /cashier-shift` · `POST /cashier-shift/{open,count,movements,close}` | read MONEY (`payment` view); write DRAWER (`payment` create) | refused, the Payment sentence |
| `/h/:code/city-ledger` | finance `pages/Billing.tsx` PropertyCityLedgerPage, `flows/CompanyPayments.tsx`, `data/companyPayments.ts` | `GET /reports/city-ledger?from&asOn`, `GET /company-payments` · `POST /company-payments`, `POST /company-payments/:id/reverse` | read MONEY_REPORT / `invoice` view; record `payment` create; reverse `payment` edit | refused, unlisted |
| `/h/:code/cash-deposits` | finance `pages/CashDeposits.tsx`, `data/deposits.ts` | `GET /cash-deposits` · `POST /cash-deposits`, `/:id/reverse`, `/:id/verify`, `/days/:date/explain` | the route's own (deposits.ts): see owner, admin, GM, accountant, viewer; record/reverse/explain owner, admin, GM; verify owner, accountant (`canRecord`, `canVerify`) | refused, unlisted |
| `/h/:code/form-c` | guests `pages/FormC.tsx`, `data/formC.ts` | `GET /form-c` · `POST /form-c/:reservationId`, `PUT /form-c/:reservationId/details` | read GUEST_ID, write FORM_C (`customer` edit: owner, admin, GM, hotel manager, reception) | refused, "This change" (`/form-c`) |
| `/h/:code/supplier-dues` | purchasing `pages/SupplierDuesPage.tsx`, `components/SupplierDues.tsx`, `data/purchasing.ts` | `GET /purchasing/dues`, `GET /reports/supplier-dues` (totals) · `POST /purchasing/dues/:id/payment`, `/credit-notes`, `/reverse` | DUES_ROLES (owner, admin, GM, accountant), PURCHASING_REFUSED's words | refused, unlisted |

None of these write routes reads an idempotency key: every write here is latched at the tap
(`useWrite`), and once its outcome is unknown THE SCREEN STOPS (`useStop` in DeskKit, MEMORY 16,
the reviews of 20 Nov): its sheet closes - the amount typed goes with it - the screen says "Not
known whether it was …: look at … before trying again", reads the record again, and every write
on the screen stays grey until a read that BEGAN after the loss has come back
(`desk.ts stillUnknown`, as pos `dayEnd.ts`; checked and broken once). Closing a sheet unlocks
nothing. A keeper per screen per hotel (`deskData.ts`) is passed to `send()` all the same.

## Money: what the server gives, what the phone shows

Every figure is the server's, to the paisa (`bill.ts` `rupees`), a dash where none was sent.

| The web adds in the browser | The phone shows instead |
|---|---|
| Company accounts' "₹X owed" (the balances summed) | the City ledger report's own **Total** row (`ledgerOwed`); no pill when the report sent none |
| A ledger figure not sent, `Number(v ?? 0)` = ₹0 | a dash (`ledgerRows`) |
| Supplier dues' "Owed to suppliers" and each supplier's total | the Supplier dues report's own total rows for the same day (`duesTotals`); a dash when that report is not read |
| The drawer's Counted and the difference, live from the typed notes | the server's `counted` and `variance`, after Save the count; the typed tally shows on the Save / Open button only, as the person's own |
| The drawer's per-kind sums (Paid out, Cash in, To the safe) | left out: each movement is listed with its own amount; Expected is the server's |
| The close's "To deposit: counted - kept", the last close's "to deposit" | left out; after a close the server's own `toDeposit` is said |

The one sum the phone makes is the web's own: the notes the person typed (value × count), shown
as theirs; a count is SENT as typed (each box with something in it; a blank box is not sent; a
mistyped box is sent for the server to refuse, QA FI-10).

## Where the phone differs from the web, and why

1. **A count of nothing is not saved** (Save waits for a typed box): the web sends `[]` and the
   server saves ₹0 counted, a figure nobody counted (D27-190's own rule). MFIN-D2.
2. **Open refuses a box that is not a whole number** with the count's own sentence: the web's
   `Number(x) || 0` opens on a float nobody counted (a "-3" lowers it). MFIN-D3.
3. **A failed read of the drawer says so**: the web's `getCashierDrawer` turns every failure into
   "No drawer open". MFIN-D1.
4. **A refused act is grey with the server's words** where the web hides it (AGENTS rule 1):
   Verify for the GM ("That is for the owner or the accountant."), Record deposit / Explain /
   Reverse for the accountant and a viewer, Record payment and Reverse on Company accounts.
5. **On the website for now** (a package the phone lacks): a paid-out's bill photo and the slip's
   photo, to add or to open (`expo-image-picker` ~57.0.20). Drawn grey; a tap says why. The
   account's Statement, "Money owed by age" and the supplier's Statement open the reports lanes'
   screens (`/reports/:code/company-statement?account=`, `/dues-by-age`,
   `/supplier-statement?supplier=`), on main since 20 Nov.
6. **Dates are typed YYYY-MM-DD** (M-7: no date-picker package): Deposited on, Received on, Paid
   on, a credit note's date, the right bill's dates; the server checks each.
7. **Selects are capsules** (Kit `Choice`); **TDS deducted is a Switch** (docs/NATIVE.md).
8. **Exports** (core `ExportButtons`) on the three lists the web exports: Cash deposits, Company
   accounts (with the report's Total row) and Form III (the passport masked to its last four, as
   the server's file, `maskId`). Refused, as the server refuses a file, for a role that does not
   download reports, in its words (`whyNotExport`).
9. **The Form III card** is a sheet with the web's lines and Print (expo-print, M-9); a test
   hotel's card says TEST · NOT VALID.

## States (each screen)

Loading ("Reading …") · no connection (its own card: nothing here can be changed offline) ·
failed (the server's sentence and Try again) · empty (the web's words) · refused (the API's
sentence, no read).

## Picture match (20 Nov)

Compared by reading the code against the pictures and their words, **never seen running**.

| Screen | Picture | Result |
|---|---|---|
| Cashiering, no drawer open | `all/39-finance-cashiering` | **Matches** in words, order and grouping: the title, "Your drawer · 11 Oct 2026", the card's title and line, the handed float's sentence (₹2,000.00, paise as the picture), eight note rows ₹500…₹2 with ×, a box showing 0 and a dash, the grey "Count a float to open by hand" with the wallet. Left: the box is 96 px where the picture's is wider. The open shift, the movement and close sheets are **not pictured** (built from the web's code). |
| Company accounts | `all/40-finance-company-accounts` | **Matches** in words and order: title with the yellow pill, the period line, Record payment (orange), each account a card of OPENING / SENT TO THE ACCOUNT / RECEIVED / BALANCE, the footnote, Payments received and its empty words. Left, on purpose: figures to the paisa (₹7,768.00, MFIN-4); the pill is the report's Total; the export row (M-13); the Statement and "Money owed by age" links (the web's code of 16 Nov, newer than the picture: MEMORY 14). |
| Form III | `all/41-finance-form-c` | **Matches**: title and red pill, the line under, the yellow "does not file" notice, the unrecorded adults' sentence, the guest's card (name; nationality · room · in the room; adults recorded in yellow; PASSPORT; ARRIVAL with the time, the overdue pill and "by …"; Record number; DEPARTURE In house; Complete details and the printer). Left: the export row. |
| Cash deposits | `new/n-h-cash-deposits` | **Matches**: the title and line, Cash to deposit with each day (long date, the points, To deposit / Deposited / Difference in red, Record deposit, Explain), Deposits with the line, the recorded line, the amount, Add slip photo and Reverse. Left: Add slip photo is grey (no picker); Verify shows grey for the GM with the server's words, where the web hides it; the export row. |
| Supplier dues | `new/n-h-supplier-dues` | **Matches** in words and order: the title and line, "Owed to suppliers: ₹2,152.50 · 1 bill", the supplier's card with Statement, Credit note and its total, the bill with its order's reference, dates, Amount, Left, overdue in red, Record payment, Credit note, Reverse. Left, on purpose: the web's table is a card of labelled figures (it scrolled sideways in the picture); the totals are the report's. |

**5 of 5 screens match their pictures** in words, order and grouping, each with the differences
listed and their reasons; the states the pictures do not show are built from the web's code.

---

# Lane B, m13-fin-bills (19-20 Nov): Folios, Invoices, Payments, an invoice's page

**Web twin:** `src/modules/finance/pages/Folios.tsx`, `Billing.tsx` (PaymentsPage), `Invoices.tsx`,
`Invoice.tsx`, `VatBill.tsx`, `flows/CreditNoteFlow.tsx`, `flows/IssueInvoiceDialog.tsx`; data
`data/folios.ts`, `data/billing.ts`; the API `api/src/modules/finance/folios.ts` (GET /folios),
`billing.ts` (GET /payments, /billable), `invoices.ts` (GET /invoices, /invoices/:number,
/invoice-series, /vat-bills, /vat-bills/:number; POST /stays/:id/invoice, /invoices/:number/credit-note,
/vat-bills/:number/cancel), `front-desk/stays.ts` (GET /stays?owing=1). **Gates** (`roleGate.ts`):
every read here is BILLS (`invoice` view: owner, admin, GM, hotel manager, reception, accountant,
viewer) except GET /payments, MONEY (`payment` view, the same seven); Issue is TAX_INVOICE (`invoice`
create: the six without the viewer); a credit note CREDIT_NOTE and a VAT bill's cancellation VAT_CANCEL
(`invoice` approve: owner, admin, GM, accountant). **Offline** (`core/offline.ts`): Issue and a credit
note refused, "An invoice cannot be raised offline…"; a VAT bill's cancellation refused, unlisted,
"This cannot be done offline yet…". Nothing is held.

## Screens

| Screen | Route → file | Web twin |
|---|---|---|
| Folios | `app/finance/[code]/folios.tsx` → `Folios.tsx` | `/h/:code/folios` |
| Invoices | `app/finance/[code]/invoices.tsx` → `Invoices.tsx` | `/h/:code/invoices` |
| Payments | `app/finance/[code]/payments.tsx` → `Payments.tsx` | `/h/:code/payments` |
| A tax invoice or credit note | `app/finance/[code]/invoice.tsx?number=…` → `InvoiceDoc.tsx` | `/h/:code/invoices/doc/*` |
| A VAT bill | `app/finance/[code]/vat-bill.tsx?number=…` → `InvoiceDoc.tsx` | `/h/:code/invoices/vat/*` |

A document's number carries slashes (5EL/2026-27/00001): it rides as `?number=`, because the gate's
route check reads only lower-case `[segments]` and a catch-all would never match (MEMORY 10). A folio
row opens the stay's own bill, `/folio/<code>/<stay id>` (Folio.tsx, unchanged). Menu: PHONE_ROUTES
`/h/:code/folios|invoices|payments` → `/finance/:code/…`.

Files (new): `books.ts` + `books.check.ts` (the rules, the API's sentences, the write paths),
`booksData.ts` (reads and writes), `BooksKit.tsx` (Act, BookSheet with safe areas, More, Note),
`Folios.tsx`, `Payments.tsx`, `Invoices.tsx`, `InvoiceDoc.tsx`. Imported, never edited: finance's
`bill.ts` (`rupees`), `data.ts` (`issueInvoice`, the stay's key keeper), `Kit.tsx`, `roles.ts`; the
front desk's `desk.ts`, `kit.tsx`, `StayList.tsx` (`NotRead`, `Kept`); guests' `Tile`, `Line`;
reports' `IconChip`; guest-services' `dateTime`; the core's `ExportButtons`.

## Money: where each rule is enforced

| Rule | Where |
|---|---|
| Every figure the server's, to the paisa | `bill.ts` `rupees` everywhere; `books.ts` `balanceShown` (checked at ₹7,582.50, ₹0.20, an overpaid ₹784 that is never ₹0, a real ₹0.00, a dash for not sent) |
| The phone sums no money | `books.ts` `openCounts`, `methodCounts` COUNT rows (checked: no amount field is made); no total anywhere |
| Never clamped | `balanceShown` (`Math.abs` with "over" and the colour, as StayTable; the clamp broken once and seen to fail) |
| Who may, in the API's words, disabled with its reason | `books.ts` `whyNotReadBills`, `whyNotReadPayments`, `whyNotCreditNote`, `whyNotCancelVat`; finance `roles.ts` `whyNotInvoice` (checked; the credit note's list widened once and seen to fail) |
| Refused offline in the web's sentence | `books.check.ts` runs `ruleFor` on each write path |
| One tap, one write; an unknown outcome stops the button | `Invoices.tsx` IssueSheet and `InvoiceDoc.tsx` CancelSheet: a `useRef` latch at the tap, `useStuck` + `notKnown` on `outcomeUnknown`, closed → the list read again. The server also answers a repeat with the document already made (invoices.ts "duplicate") |
| A key per document | `booksData.ts` one keeper per invoice / VAT bill, `seen()` after its read; Issue uses the stay's keeper in `data.ts` |
| A server time read as ISO | Payments' `at` through guest-services `dateTime` → `instant()` (checked) |

## Where the phone differs from the web, and why

1. **Folios' three tiles** (Outstanding, Overpaid, Net position) and the overpaid banner's "₹X to
   return" are the browser's sums of the balances. The server sends no total: the tiles keep their
   counts ("12 folios owing", "Nothing to refund") and show a dash, with a line saying why. Asked of
   the PMS (a total on GET /folios).
2. **Payments' tile per way of paying and Total received** are the browser's sums. The phone counts
   the live receipts per method ("290 receipts", reversals out) and shows a dash for the figure;
   the tiles are ordered by count, where the web orders by the summed amount. Asked of the PMS.
3. **Every figure to the paisa** (₹1,050.00) where the web's money() prints whole rupees (finance
   difference 8, MFIN-4).
4. **A settled bill's balance on Invoices is ₹0.00**, where the web prints a dash: a dash means
   "not sent" (MFIN-4).
5. **An invoice's page** prints each line's own taxable value and its own GST (rate and amount, as the
   server sent them) and the invoice's stored Taxable value, SGST, CGST, Total tax and Total. The web's
   per-line CGST/SGST split (`splitByLine`), the rate-wise tax table (`rateWise`), Total charges, Total
   discount, Total payment and Balance are worked out in the browser, so they are not drawn; the
   payments received are listed, not totalled. No logos, no signature lines, no UPI QR (a package).
6. **Print and Send invoice** are grey, "On the website for now": the printed tax invoice is the
   legal document and carries the browser's per-line split (Rule 46); Send needs guest messaging's
   connection state, not on the phone. Asked of the owner.
7. **GST and VAT rates** (TaxRulesCard, for the four who may set one): a note "On the website for
   now", not the form.
8. **Long lists page by 50** with "Show more" and "N of M shown" (Invoices' ready-to-bill list ran
   to 765 rows in the picture); the web draws every row.
9. **Group bills** are listed with their balance but are not links: a group's page is not on the
   phone.
10. **Cancel this invoice / VAT bill** for a role the API refuses is grey with the server's sentence
    ("Issuing a credit note is for…"), where the web's button carries its own words ("Cancelling an
    invoice is for…"). Not offered on a credit note or a cancelled document, as the web.
11. Not offered on Payments, as the web: a refund (it is taken on the stay's bill, FolioPanel).

## States

Each screen: loading ("Reading the open folios…", "Reading the invoices…", "Reading the payments…",
"Reading the invoice…"), failed (the server's words and Try again), offline ("No connection … once
the line is back", the front desk's `NotRead`; a failed re-read over rows shown says so, `Kept`),
empty (the web's words: "Every folio is settled", "Nothing has departed yet", "No invoice has been
issued", "No payments yet"), refused (the API's sentence, no read).

## Picture match (20 Nov)

Compared by reading the code against the pictures and their words, **never seen running**.

| Screen | Pictures | Result |
|---|---|---|
| Folios | `all/36-finance-folios` (dev-gm) | **Differences left:** (1) the three tiles show a dash for the figure (difference 1); (2) balances to the paisa (₹1,050.00, difference 3); (3) "Show more" past 50 rows; (4) export buttons at the foot (the web's are in the table's head). The rest matches: title and "12 open" pill, the description, the tiles' labels, chips and notes in order, the search box with "12 of 12", each card (room, state pill, chevron, guest, reference, Type / Arrival / Departure / Balance in red), the closing note. |
| Invoices | `all/37-finance-invoices` (dev-gm) | **Differences left:** (1) figures to the paisa; (2) a settled balance ₹0.00, not "-" (difference 4); (3) "Show more" past 50 (the picture's list is 765 rows); (4) the GST and VAT rates note (the picture, as the GM, ends with the web's tax card). The rest matches: the pill "765 ready to bill", the two notes with the series line, each bill's card (guest, room · reference, BILLED TO, NIGHTS, CHARGES, TAX, BALANCE, Issue), Issued with its description and cards. |
| Payments | `all/38-finance-payments` (dev-gm) | **Differences left:** (1) the method tiles and Total received show a dash (difference 2); (2) amounts to the paisa; (3) "Show more" past 50. The rest matches: the description, the tiles' labels and "N receipts" / "Reversals excluded" notes, each receipt's card (time, GUEST with room · reference, struck when reversed, METHOD pill with "Reversed", NARRATION, TAKEN BY, AMOUNT struck when reversed), the closing note on reversals. |
| An invoice's page, a VAT bill's page | **None** (no picture of `/invoices/doc/…` or `/invoices/vat/…`) | Not pictured: built from `Invoice.tsx` and `VatBill.tsx`. |

**3 of 5 screens have pictures; none of the 3 matches exactly** — every difference left is one of the
money rules (no phone sum, paise kept, a dash only for "not sent") or the phone's paging.
