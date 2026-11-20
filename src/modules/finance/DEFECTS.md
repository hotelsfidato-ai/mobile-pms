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

# Lane B, m13-fin-bills (19-20 Nov)

## MFIN-B1 · The stay's Issue sheet does not stop on an unknown outcome (open, not this lane's file)

`Issue.tsx` IssueSheet (the Bill tab's tax invoice) shows any failure as a refusal and leaves Issue
pressable: after a lost reply a second tap is a second request. The server answers a repeat with the
invoice already made (invoices.ts "duplicate"), so no second number is taken, but the person reads
"Could not reach the server" over an invoice that may exist. **Found** reading Issue.tsx against MEMORY
16 while building Invoices (20 Nov). **Done:** not changed (not this lane's file); Invoices' own sheet
latches the tap, stops on `outcomeUnknown` with "Not known whether it was issued: look at the Issued
list…", and reads the list again on close. **The rule:** every write's sheet uses `useStuck` /
`notKnown`, even where the server de-duplicates by state.

## MFIN-B2 · The web's money tiles are the browser's sums (a difference, asked of the PMS)

Folios' Outstanding, Overpaid and Net position and Payments' per-method tiles and Total received are
added up in the browser (`Folios.tsx` 47-51, `billing.ts` paymentsByMethod); no read sends them.
**Found** mapping the web twin (19 Nov). **Done:** the phone counts rows and shows a dash for the
figure, with a line saying why (MODULE.md differences 1-2; `books.check.ts` proves no amount is made).
**The rule:** where the web sums money in the browser, the phone shows the server's rows and asks the
API for the total.
