# Defects — banquet (phone)

Numbering `MBQ-1`, `MBQ-2`, … Each entry: what happened, how it was found, what was done about it,
and the rule it leaves. Fixed entries stay. A fault in the PMS itself (its API or website) is not
fixed here: it goes to `docs/api-requests.md` through the mobile chat.

---

## Open

None yet.

## Fixed

None yet.

## Seen in the web twin, not the phone's (for the PMS, through the mobile chat)

- **Add a course does not read the `idempotency-key`** (`POST /banquet/events/:id/catering`): tapped
  again after a lost reply it adds a second course. Refused offline, so only a lost reply bites.
- **A course's amount is multiplied in the browser** (`c.pax * c.ratePerHead`); the server sends none.
  The phone shows the parts.
- **The web's `money()` prints whole rupees** on the diary, the money card and the bill card, so a
  balance of ₹1,25,449.50 reads ₹1,25,450; the phone shows the server's figure (MEMORY 9).
- **The web's PayDialog works out "more than the bill" on the device** (`value - max(balance, 0)`) and
  clamps the outstanding figure in its description to ₹0 over a paid-ahead bill; the server already
  answers with `needs: "credit"` and its own figure. The phone uses the server's answer.
- **The server's credit sentence says "the guest's credit"** on a function, whose payer is its host
  (`takeFolioPayment`, one sentence for stays and functions); the web's tick says "host's".
- **A function registered offline leaves the web's dialog on "Registering…"**: `submit` has no
  `catch`, so the HeldError skips `setBusy(false)` and `onDone` (by reading `pages/Banquet.tsx`).
- **A word typed as an amount is sent as unpriced**: the web sends `Number("abc")`, which JSON writes
  as null. The phone refuses it as "Not a figure." before sending.
- **Offline, Confirm says "The hall is not free"** over the offline sentence (the toast's title for
  every `ok: false`).
