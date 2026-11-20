# finance — defects (MFIN-n)

Each entry: what happened, how it was found, what was done about it, the rule it leaves. Fixed
entries stay.

## MFIN-1 · A press of Take payment is not one key across repeats (fixed 4 Nov, the core)

The web keeps one key per press until the payment lands, so a repeat after a lost reply answers
"already done" (28 September, One press, one payment). The core's `send()` mints a new key on every
call, so on the phone a reply lost on the way back, then a second press, would be a second receipt.
**Found** reading `send()` against `SettleDialog` (17 Oct). **Done:** a press that could not reach
the server (503) re-reads the bill and empties the amount, so a repeat is typed on purpose with the
bill in view; Add charge the same. **The fix is the core's:** `send(method, path, body, pressKey?)`,
the diff is in the report of 31 Oct. **4 Nov:** every write's button goes through `useOnce` (Kit.tsx), so
two taps before `busy` draws are one request; what is left is a deliberate second press after a
lost reply, which only the core's key can make safe. **Fixed by the mobile chat (4 Nov):**
`core/keys.ts` `keyKeeper` keeps a request's key (who, method, path, body) only while its outcome
is unknown: tried again unchanged before the bill could be read, the SAME key (made once); changed,
a new key; landed or refused by the server (a 4xx other than 409/425/429), forgotten; the bill read
again after it failed (`readBill` → `seen`), forgotten — the person sees what was made, so a guest
paying ₹500 twice is two payments; the server's "not yet" (409, 425, 429), kept until a read begun
30 s later; another person signed in, never shared. `send(…, keeper)` reports each outcome on the
ticket `begin` gave it; `data.ts` keeps one keeper per stay's bill, so another stay's read changes
nothing (`keys.check.ts`; each rule broken once). Two earlier versions were stopped by the reviews of
4 Nov: kept until it landed, it would swallow a deliberate second ₹500 (MEMORY 13); cleared by any
read, a 409's key went at Settle's immediate re-read, and one stay's read cleared another's. **The rule:** a write
that moves money carries one key from the tap to the answer.

## MFIN-2 · The server's `needs` does not reach the screen (fixed 4 Nov, the core)

The API answers a refusal with `needs` ("credit", "late-reason", "credit-limit") and the core's
`ApiError` keeps only the sentence, so the screen recognises the server's own sentences
(`asksCredit`, `overLimit`, `asksLateReason`, checked in `bill.check.ts`). The web's own comment
says why this is weak: "the sentence is not an interface". **Done:** recognised, with a check per
sentence. **Fixed by the mobile chat (4 Nov):** `ApiError.needs` carries it; Settle, Check out and
Add charge take the way through when `needs` names it or the sentence is recognised (`bill.ts`
`asks`, checked) — either is enough, since the three values were recorded on 31 Oct and cannot be
re-read from the cloud. **Confirmed 4 Nov** against today's PMS: `credit`, `credit-limit` (`api/src/modules/finance/`) and `late-reason` (`front-desk/operations.ts` 993) are the API's own values.

## MFIN-3 · `[stayId]` is not matched by the gate's route list (fixed 4 Nov)

`scripts/gates.sh` `routes()` lists the bundle's screens with `\[[a-z]+\]`, and the brief named this
route `app/folio/[code]/[stayId].tsx`: a capital in a segment's name, so the bundle's routes could
never equal `app/` (the front desk met the same, MFD-1). **Found** reading the gate against the route
(31 Oct). **Done (4 Nov):** the file is `app/folio/[code]/[id].tsx`; the address every link builds,
`/folio/<code>/<stay id>`, is unchanged (the desk links by string). **The rule:** route parameters
are lower case until the gate's pattern changes.

## MFIN-4 · Figures rounded, clamped and dashed on the bill (fixed 4 Nov)

Three ways the screen showed a figure the server did not send: (1) a second formatter
(`rupeesRound`, the web's money()) printed the headline, the tabs, Settle and "still owed" in whole
rupees, so ₹7,582.50 read ₹7,583 and twenty paise owed read "₹0 is still owed"; (2) Settle clamped a
bill's balance at zero (`Math.max(…, 0)`), so an overpaid bill read "₹0 outstanding"; (3) the
tax-invoice row printed a settled ₹0 as a dash, the mark of a figure not sent. **Found** reading every
figure of the module against the brief's money rules (4 Nov), before anything ran. **Done:** one
formatter, `rupees`, to the paisa on the core's dash; `owedLine` says the server's balance with its
word; `startAmount` starts blank when nothing is owed; `typedShown` dashes nothing typed; each in
`bill.check.ts`, the clamp broken once and seen to fail. **The rule:** on a bill a figure is shown as
the server sent it - never rounded, never clamped - and a dash means only "not sent".

---

## Lane m13-fin-desk (letter D)

### MFIN-D1 · The web's drawer read turns every failure into "No drawer open" (avoided, 19 Nov)

`getCashierDrawer` (web `data/cashier.ts`) catches every error and returns null, and the page then
offers to open a drawer: offline, refused or a server failure all read as "the shift has not
started". **Found** reading the web twin before porting. **Done:** the phone reads through the
core's `api()`; a failure is its own state (no connection, or the server's sentence). For the web:
in the report. **The rule:** a read that failed is never drawn as an empty state.

### MFIN-D2 · A count of nothing is saved as ₹0 counted (avoided, 19 Nov)

The web's Save the count is enabled with nothing typed and sends `{ denominations: [] }`; the
server (`cashier.ts` /count) then sets `counted_cash` to the sum of nothing, ₹0 - a count nobody
made, which the close then reads as "short by" the whole drawer. **Found** reading the route
against the page. **Done:** `countBody` is null until a box is typed, and Save waits for it
(`desk.check.ts`, broken once: a blank box sent as 0 fails). **The rule:** a blank is never a zero,
in a count as in a price.

### MFIN-D3 · A mistyped note opens a drawer on a figure nobody counted (avoided, 19 Nov)

The web adds `Number(box) || 0` for the opening float, so "-3" × ₹500 lowers the float and "abc"
vanishes; the server checks only that the opening is ≥ 0. **Done:** `openingOf` refuses a box that
is not a whole number with the count's own sentence ("A count is a whole number of notes or coins
- zero or more."), checked and broken once. **The rule:** what is typed is sent or refused, never
quietly changed.

### MFIN-D4 · The server's "no" is a 409, which the key keeper reads as "not yet" (noted, 19 Nov)

The cashier, deposits, company payments and Form III routes answer their own refusals with 409
(`{ ok: false, reason }`); `core/keys.ts` keeps a 409's key 30 s as a "not yet". Harmless today
(none of these routes reads a key), and the sentence is shown as the server's. **The rule:** if
the API starts reading keys on these routes, it should answer a refusal with 422, or the keeper
needs to know these routes.


### MFIN-D5 · An unknown outcome unlocked when its sheet closed (fixed 20 Nov)

The first build kept the stop inside each sheet (`useStuck`): closing the sheet unmounted it, and a
second Record deposit or Pay bill could be sent before the list was read again - a second deposit
or payment, since none of these routes reads a key. **Found** by the mobile chat's rule from the
reviews of 20 Nov. **Done:** the stop lives at the screen (`DeskKit useStop`): an unknown outcome
closes its sheet, says so, re-reads, and every write on the screen waits until a read that began
after the loss has come back (`desk.ts stillUnknown`, checked; "began < stuckAt" broken once and
seen to fail). **The rule:** an unknown outcome is lifted by a fresh read, never by a closed dialog.

### MFIN-D6 · A sheet could be closed while its write was on its way (fixed 20 Nov)

The latch lived in the sheet: Cancel, the backdrop or the back gesture closed it mid-write, and a
new sheet tapped again sent a second POST before the first answered - two deposits, two company
payments, two paid-outs, as none of these routes reads a key; the first reply then closed the
second sheet. **Found** by the independent money review (13add26). **Done:** a write on its way is
counted outside the screen (`deskStop.begin/end`, checked); `useWrite` refuses while any write of
the screen is out; the sheet's Cancel is grey and its backdrop and back do nothing. **The rule:** a
write that reads no key holds the whole screen until it has answered.

### MFIN-D7 · Leaving the screen dropped the stop (fixed 20 Nov)

The stop was the screen's state, so leaving and coming back forgot an unknown outcome while the
cached read was from before it; with the first read failing, every write was live. **Found** by the
money review. **Done:** the moment of loss is kept by `<code>/<screen>` outside the screen
(`deskStop`), forgotten only by a read begun after it (checked: a screen opened again with no read
stays stopped; broken once). **The rule:** an unknown outcome outlives the screen that met it.

### MFIN-D8 · A supplier's total was looked up by its name (fixed 20 Nov)

The report groups owed bills by supplier id (or the typed name) but labels each total "<name>,
owed"; two suppliers of one name would each show one of the two figures. **Found** by the money
review. **Done:** a name labelling two totals gives a dash on both (`duesTotals`, checked, broken
once). Asked of the PMS: the supplier's id in the total rows. **The rule:** a figure is matched by
its key, never by its words.
# Lane B, m13-fin-bills (19-20 Nov)

## MFIN-B1 · The stay's Issue sheet does not stop on an unknown outcome (closed by m13-stops, 20 Nov)

`Issue.tsx` IssueSheet (the Bill tab's tax invoice) shows any failure as a refusal and leaves Issue
pressable: after a lost reply a second tap is a second request. The server answers a repeat with the
invoice already made (invoices.ts "duplicate"), so no second number is taken, but the person reads
"Could not reach the server" over an invoice that may exist. **Found** reading Issue.tsx against MEMORY
16 while building Invoices (20 Nov). **Done:** not changed (not this lane's file); Invoices' own sheet
latches the tap, stops on `outcomeUnknown` with "Not known whether it was issued: look at the Issued
list…", and reads the list again on close. **The rule:** every write's sheet uses `useStuck` /
`notKnown`, even where the server de-duplicates by state.
**Closed (m13-stops, 20 Nov):** `Issue.tsx` IssueSheet now says an unknown outcome as "Not known whether it
was issued" (the error's words, where to look, and that issuing again takes no second number), cannot be
closed while the request is on its way (back, the backdrop and Keep it do nothing), and closing it reads
the bill's rows again, so a number taken shows. No stop is held: POST …/invoice reads no key, but answers
a repeat for the same bill with the invoice already made (invoices.ts, under a per-folio advisory lock), so
Issue again is safe and says the number.

## MFIN-B2 · The web's money tiles are the browser's sums (a difference, asked of the PMS)

Folios' Outstanding, Overpaid and Net position and Payments' per-method tiles and Total received are
added up in the browser (`Folios.tsx` 47-51, `billing.ts` paymentsByMethod); no read sends them.
**Found** mapping the web twin (19 Nov). **Done:** the phone counts rows and shows a dash for the
figure, with a line saying why (MODULE.md differences 1-2; `books.check.ts` proves no amount is made).
**The rule:** where the web sums money in the browser, the phone shows the server's rows and asks the
API for the total.

## MFIN-B3 · A credit note's totals printed positive (fixed 20 Nov)

`InvoiceDoc.tsx` put the document's sign on the invoice's totals as well as its lines. The server
already stores a credit note's totals negative (`api/src/modules/finance/invoices.ts` 812-814 inserts
`-taxable_value … -total`), so the sign was applied twice: a credit note whose lines read −₹1,000.00
showed Taxable value, SGST, CGST, Total tax and Total as +₹1,050.00, while the Issued list showed
−₹1,050.00. **Found** by the mobile chat's independent review (20 Nov). **Done:** `books.ts`
`invoiceTotals` prints the five totals exactly as sent; only a line (read from the ledger, positive)
takes the sign; the words follow the figure as sent ("Minus One Thousand Fifty Rupees Only"). Checked
in `books.check.ts`, the double sign put back once and seen to fail. **The web has the same fault**
(`src/modules/finance/pages/Invoice.tsx` 622-629: `sign(data.sgst.amount)`, `sign(data.cgst.amount)`,
`sign(data.total)` on a credit note's already negative figures) - for `docs/api-requests.md`.
**The rule:** a figure the server stores signed is printed as sent; a sign is put only on what the
server sends unsigned.

## MFIN-B4 · An unknown outcome hid the error's own words (fixed 20 Nov)

Issue (`Invoices.tsx`) and Cancel (`InvoiceDoc.tsx`) said `notKnown(…).line`, which drops the error:
offline, the person never read "An invoice cannot be raised offline…". **Found** by the same review.
**Done:** both say the title and `notKnown(…).body` (the error's words, then where to look), as
WalkIn, StayActs and LostProperty do; the button stays stuck until the sheet is closed and the record
read again. **The rule:** an unknown outcome says what came back, not only that it is unknown.

## m16 pickers (20 Nov, lane m16-pick-money)

## MFIN-P1 · A stored bill could only be opened under a name the phone made up (fixed 20 Nov, core)

The core's `downloadToShare(path, fileName, mimeType)` saves the file under the name it is given. A
paid-out's photo, a deposit slip and a bar bill's photo come back with only their bytes: the phone
does not know whether each is a JPEG, a HEIC or a PDF (the movement says only `photo: true`, the
deposit a `slipId`, the bar bill a `photoId`; reception and the bar hold no grant on the
attachments list that names them). iPhone's share sheet goes by the file's name alone, so a PDF named
`bill.jpg` would not open. **Found** reading expo-sharing's native code while wiring row 1.1.
**Done:** one line in `src/core/Download.tsx` - a blank `fileName` downloads into the cache folder,
where expo-file-system names the file from the server's `Content-Disposition` (iOS
`suggestedFilename`, Android `URLUtil.guessFileName`); the screens pass `""` and `*/*`
(`billPick.ts` STORED_NAME, STORED_TYPE). Named in the lane's report for the mobile chat.
**The rule:** a file the server stores and the phone did not name is opened under the server's name.
