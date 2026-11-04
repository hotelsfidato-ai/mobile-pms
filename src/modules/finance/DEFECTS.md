# finance — defects (MFIN-n)

Each entry: what happened, how it was found, what was done about it, the rule it leaves. Fixed
entries stay.

## MFIN-1 · A press of Take payment is not one key across repeats (open: a core change; narrowed 4 Nov)

The web keeps one key per press until the payment lands, so a repeat after a lost reply answers
"already done" (28 September, One press, one payment). The core's `send()` mints a new key on every
call, so on the phone a reply lost on the way back, then a second press, would be a second receipt.
**Found** reading `send()` against `SettleDialog` (17 Oct). **Done:** a press that could not reach
the server (503) re-reads the bill and empties the amount, so a repeat is typed on purpose with the
bill in view; Add charge the same. **The fix is the core's:** `send(method, path, body, pressKey?)`,
the diff is in the report of 31 Oct. **4 Nov:** every write's button goes through `useOnce` (Kit.tsx), so
two taps before `busy` draws are one request; what is left is a deliberate second press after a
lost reply, which only the core's key can make safe. **The rule:** a write that moves money carries
one key from the tap to the answer.

## MFIN-2 · The server's `needs` does not reach the screen (open: a core change)

The API answers a refusal with `needs` ("credit", "late-reason", "credit-limit") and the core's
`ApiError` keeps only the sentence, so the screen recognises the server's own sentences
(`asksCredit`, `overLimit`, `asksLateReason`, checked in `bill.check.ts`). The web's own comment
says why this is weak: "the sentence is not an interface". **Done:** recognised, with a check per
sentence. **The fix is the core's:** `ApiError.needs`, the diff is in the report.

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
