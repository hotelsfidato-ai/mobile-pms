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
| A stay's bill | `app/folio/[code]/[stayId].tsx` → `Folio.tsx` | the Bill tab of the stay panel |

Opened by the desk's lists (slice 4a) with `/folio/<code>/<stayId>`. After check-out: `router.back()`,
or `/front-desk/<code>/in-house` with no history.

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

Other differences: a control the API would refuse is grey with the API's sentence, where the web
hides it (AGENTS rule 1); Rule 159 asks by the method's kind, the server's own test, not the word
"Cash"; a select is a row of capsules (no picker package); the interim bill prints the hotel's name,
not the group's logo; a departed stay offers its tax invoice here (the web does on Invoices).

## Writes and offline

All refused offline by the web's tiers (`core/offline.ts`), said in the web's words; nothing is held.

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
PAN above ₹1,00,000; the server's sentences recognised (MFIN-2). `paper.ts` (`paper.check.ts`): the
interim bill as HTML for `expo-print`.

## States

Loading "Reading the bill…" · failed, the server's sentence and Try again · no connection, its own
words · empty "Nothing posted to this folio yet." · no bill yet, a dash · refused (a role without
bills), the API's sentence and no read.
