# Defects — guest services (phone)

Numbering `MGS-1`, `MGS-2`, … Each entry: what happened, how it was found, what was done about it,
and the rule it leaves. Fixed entries stay.

---

## Open

None yet.

## Fixed

### MGS-1 · Wake-up calls: Cancel it could be tapped while a call was being changed (4 Nov)

- **What happened:** on a call's card, Confirm and Done turned grey while their write was on its
  way, but Cancel it did not: a second tap could open the cancel dialog over a call the server was
  just confirming or marking done, and the server would then answer for a call that had changed.
- **How found:** reading the screen against Guest requests' card, where all three wait (the
  picture match of 4 Nov).
- **What was done:** Cancel it is disabled while `busy`, as the other two (`WakeUpCalls.tsx`).
- **The rule it leaves:** every button on a card waits while any write on that card is in flight.
