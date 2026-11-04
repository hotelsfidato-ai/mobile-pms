# Defects — laundry (phone)

Numbering `MLDY-1`, `MLDY-2`, … Each entry: what happened, how it was found, what was done about it,
and the rule it leaves. Fixed entries stay. A fault in the PMS itself (its API or website) is not
fixed here: it goes to `docs/api-requests.md` through the mobile chat.

---

## Open

None yet.

## Fixed

### MLDY-1 · A count left blank in "Record what came back" sent 0 (4 Nov) — fixed

**What happened:** `Number("")` is 0, so a count field cleared and left blank sent `quantity: 0`, and
the server set that line's returned count to 0 and reopened a returned docket (the web's
ReturnDialog does the same). **How found:** the independent review before the merge. **What was
done:** a blank field keeps the count already recorded (`docket.ts returnBody`, checked, broken
once); none came back is typed as 0. **The rule:** a blank field is never a zero.

### MLDY-2 · Collect it came live again after a lost reply (4 Nov)

**What happened:** Collect it was latched only while its write was on its way; after a lost reply
(nothing came back, or a 5xx) it said "Not collected" and could be tapped again, and POST dockets
reads no idempotency key: a second docket for one bag. **How found:** applying MEMORY 16 across the
modules (4 Nov). **What was done:** on `outcomeUnknown(e)` it says "Not known whether it was
collected … look at the dockets before trying again", the dockets are read again, and Collect it
takes no more taps until the dialog is closed (`useStuck`, `notKnown` in core/ui.tsx). Checked safe
to repeat: Record what came back (sets each line's count), Cancel (a cancelled docket stays
cancelled), Charge (a keeper per docket; the server refuses a second, "already on the bill").
**The rule:** an unknown outcome on a route without a key stops the button.

## Seen in the web twin, not the phone's (for the PMS, through the mobile chat)

- The web's `money()` prints whole rupees, so a laundry price of ₹80.50 reads ₹81 on Dockets and on a
  docket; the phone shows the server's figure (`docket.ts` `rupees`, MEMORY 9).
- A docket line's Amount is multiplied in the browser (`unitPrice * quantity`); the server sends no
  line amount. The phone shows the parts.
- The laundry routes do not read the `idempotency-key`: Collect it tapped again after a lost reply
  makes a second docket. The charge is safe (the docket is locked and "already on the bill").
