# Defects — banquet (phone)

Numbering `MBQ-1`, `MBQ-2`, … Each entry: what happened, how it was found, what was done about it,
and the rule it leaves. Fixed entries stay. A fault in the PMS itself (its API or website) is not
fixed here: it goes to `docs/api-requests.md` through the mobile chat.

---

## Open

None yet.

## Fixed

### MBQ-1 · An advance could be taken twice after a lost reply (4 Nov) — fixed at the merge

**What happened:** on a failure the payment dialog re-read the function (which lets the key go,
`core/keys.ts`) but stayed open with the amount still typed: a lost reply, then a second tap, went
with a new key and made a second advance. **How found:** the independent review before the merge.
**What was done:** when the outcome is unknown (`core/api.ts outcomeUnknown`: nothing came back, or
a 5xx) the amount and the credit tick are emptied and the dialog says "Not known whether it was
taken"; the bill read again is then in view. **The rule:** a key may be let go only once the
person can see the record; a form left filled is not seeing it.

### MBQ-2 · Registering again after a server failure made a second enquiry (4 Nov) — fixed

Register had no keeper, so a 5xx after the server committed, then a second tap, sent a new key. It
now keeps one key per property while the request is unchanged (the server reads it, 062), let go
when the diary is read again; the words say it is made once.

### MBQ-3 · A course could be added twice after a lost reply (4 Nov) — narrowed

`POST /catering` reads no key (PMS R-27 kind). On an unknown outcome the change dialogs now take no
more taps and say "Not known whether it was added: close this and look at the function before
trying again". The server's key is still asked for.

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
