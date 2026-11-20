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
