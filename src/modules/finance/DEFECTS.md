# finance — defects (MFIN-n)

Each entry: what happened, how it was found, what was done about it, the rule it leaves. Fixed
entries stay.

## MFIN-1 · A press of Take payment is not one key across repeats (open: a core change)

The web keeps one key per press until the payment lands, so a repeat after a lost reply answers
"already done" (28 September, One press, one payment). The core's `send()` mints a new key on every
call, so on the phone a reply lost on the way back, then a second press, would be a second receipt.
**Found** reading `send()` against `SettleDialog` (17 Oct). **Done:** a press that could not reach
the server (503) re-reads the bill and empties the amount, so a repeat is typed on purpose with the
bill in view; Add charge the same. **The fix is the core's:** `send(method, path, body, pressKey?)`,
the diff is in the report of 31 Oct. **The rule:** a write that moves money carries one key from the
tap to the answer.

## MFIN-2 · The server's `needs` does not reach the screen (open: a core change)

The API answers a refusal with `needs` ("credit", "late-reason", "credit-limit") and the core's
`ApiError` keeps only the sentence, so the screen recognises the server's own sentences
(`asksCredit`, `overLimit`, `asksLateReason`, checked in `bill.check.ts`). The web's own comment
says why this is weak: "the sentence is not an interface". **Done:** recognised, with a check per
sentence. **The fix is the core's:** `ApiError.needs`, the diff is in the report.

## MFIN-3 · `[stayId]` is not matched by the gate's route list (open: scripts/)

`scripts/gates.sh` `routes()` lists the bundle's screens with `\[[a-z]+\]`, and the brief names
this route `app/folio/[code]/[stayId].tsx`: a capital in a segment's name. See the report for the
one-character diff and what the gate said.
