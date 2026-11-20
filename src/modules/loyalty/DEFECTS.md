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

---

# m13-stops (20 Nov)

## MLOY-U1 · A points adjustment: the stop was the card's state, compared with a read's finish

POST …/adjust reads no key. The card kept the moment in `useState` and let it go when `dataUpdatedAt`
passed it. **Found** by the m13-stops sweep (grep for `useStuck` / `outcomeUnknown` inside sheets), reading the API to see which routes read the key. **Done:** kept by the card's name, stopped while on its way, let go only by a
read of the card begun after the loss. Redeem's key is read and kept per stay (data.ts). **The rule:** a write on a route that reads no idempotency key keeps its stop OUTSIDE the sheet and the screen (core `useScreenStop`, by name), stopped while it is on its way, and let go only by a read of the record that BEGAN after the loss and came back good.
