# Defects — loyalty (the phone)

**Read this before your first edit here.** Every defect found in this module: what happened, how it
was found, **what was done about it**, and the rule it leaves. Numbered `MLOY-1`, `MLOY-2`, … A lesson
that would bite another module goes in `MEMORY.md` instead. Fixed entries stay.

---

## Open

None.

## Found in the web, avoided here (for `docs/api-requests.md`)

- **The rules' earn rate: NaN is sent as null.** `Loyalty.tsx` 213 sends `Number(rate)`; a rate typed
  "5..5" (the box keeps digits and points) is NaN, which JSON sends as `null`, and the server reads
  `null` as "no rate": the group's rate is cleared and stays earn nothing, with "Rules saved". The
  phone sends the text typed (`rateBody`), so the server refuses it in its own sentence
  (`loyalty.check.ts` pins it).
- **Adjust reads no idempotency key** (`POST /loyalty/guests/:id/adjust`, R-30's class): a lost reply
  then a second tap adds the points twice (1 point = ₹1 off a bill). The phone empties the figure and
  stops Adjust until the card is read again (MEMORY 16).
