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

## Seen in the web twin, not the phone's (for the PMS, through the mobile chat)

- The web's `money()` prints whole rupees, so a laundry price of ₹80.50 reads ₹81 on Dockets and on a
  docket; the phone shows the server's figure (`docket.ts` `rupees`, MEMORY 9).
- A docket line's Amount is multiplied in the browser (`unitPrice * quantity`); the server sends no
  line amount. The phone shows the parts.
- The laundry routes do not read the `idempotency-key`: Collect it tapped again after a lost reply
  makes a second docket. The charge is safe (the docket is locked and "already on the bill").
