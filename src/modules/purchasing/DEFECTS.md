# Defects — purchasing (phone)

Numbering `MPUR-1`, `MPUR-2`, … Each entry: what happened, how it was found, what was done about it,
and the rule it leaves. Fixed entries stay. A fault in the PMS itself (its API or website) is not
fixed here: it goes to `docs/api-requests.md` through the mobile chat.

---

## Open

None yet.

## Fixed

### MPUR-2 · A delivery or a request could be recorded twice after a lost reply (4 Nov) — narrowed

The purchasing routes read no key, so a second tap after a lost reply records the goods (or asks)
twice. Since 4 Nov, on an unknown outcome (`outcomeUnknown`) the dialog takes no more taps and says
"Not known whether it was recorded: close this and look at the order before trying again". The
server's key is asked for (PMS R-30).

### MPUR-1 · The order's acts read "not on the setting" before the setting was read (4 Nov) — fixed

**What happened:** the order's Send, Cancel and Agree a price take who may from the list's read
(`me.mayRaise`). Until that read came back, `whyNotAct(undefined)` answered the server's refusal, so
for a moment the Inventory Manager would have read "Raising a purchase request here is a setting for
this property, and your role is not on it" under buttons that were theirs. **How found:** reading
`Request.tsx` back after its first commit (d70cdbb). **What was done:** until the list is read the
acts are grey with no sentence; a failed read says so ("Could not read who may act on this order: …").
**The rule:** an answer not read yet is not a no; never show a refusal the server has not made.

## Seen in the web twin, not the phone's (for the PMS, through the mobile chat)

- The web's `money()` prints whole rupees, so an agreed price of ₹51.25 reads ₹51 on the order and a
  total of ₹2,152.50 reads ₹2,153 on the list; the phone shows the server's figure (MEMORY 9).
- A line's Amount is multiplied in the browser (`quantity × unitPrice`), and the delivery's GST amount is
  filled from came × cost × rate in the browser; the server sends neither. The phone shows the parts.
- The purchasing routes do not read the `idempotency-key`: Ask to buy tapped again after a lost reply
  makes a second request (and a second approval). A second delivery is refused by the order's state.
- The approval's amount is the request's total when it was raised (`app.request_approval` in
  `POST /purchasing/requests`); pricing a line later (`PUT …/lines/:lineId`) does not change it, so a
  request raised unpriced reaches the approver with no amount, even after every line is priced.
- The web offers Record the delivery only to a person on the raise setting (`mayAct`), while the route
  asks only the Store's `stock` create: a kitchen manager not on the setting cannot reach a delivery the
  server would take, and housekeeping on it sees a button the server refuses.
