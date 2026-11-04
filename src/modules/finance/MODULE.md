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
