# Defects — guest services (phone)

Numbering `MGS-1`, `MGS-2`, … Each entry: what happened, how it was found, what was done about it,
and the rule it leaves. Fixed entries stay.

---

## Open

None yet.

## Fixed

### MGS-3 · A lost reply let a request, a call, an item or a reply be made twice (4 Nov)

- **What happened:** New request, Set the call, Log it and Send reply were guarded only by `busy`
  and came live again after any failure; their routes read no idempotency key, so a second tap
  after a lost reply (nothing came back, or a 5xx) made a second request, a second wake-up call, a
  second kept item or a second message to the guest.
- **How found:** applying MEMORY 16 across the modules (4 Nov).
- **What was done:** each is latched at the tap; on `outcomeUnknown(e)` it says "Not known whether
  it was raised / set / logged / sent … look at … before trying again" and takes no more taps until
  the dialog is closed (closing now reads the list again) or the thread is left (`useStuck`,
  `notKnown` in core/ui.tsx). Checked safe to repeat (the server refuses a second): Take it / Done
  / Cancel it on a request, Confirm / Done / Cancel on a call, Returned / Disposed on an item,
  Confirm / Set aside on online check-in, Mark handled.
- **The rule it leaves:** an unknown outcome on a route without a key stops the button.

### MGS-1 · Wake-up calls: Cancel it could be tapped while a call was being changed (4 Nov)

- **What happened:** on a call's card, Confirm and Done turned grey while their write was on its
  way, but Cancel it did not: a second tap could open the cancel dialog over a call the server was
  just confirming or marking done, and the server would then answer for a call that had changed.
- **How found:** reading the screen against Guest requests' card, where all three wait (the
  picture match of 4 Nov).
- **What was done:** Cancel it is disabled while `busy`, as the other two (`WakeUpCalls.tsx`).
- **The rule it leaves:** every button on a card waits while any write on that card is in flight.

### MGS-2 · A server moment in Postgres's own text would read as NaN on a phone (4 Nov)

- **What happened:** `rules.ts` read every moment with `new Date(text)`. The API sends some times as
  Postgres's own text ("2026-10-31 07:35:58.215147+05:30", seen on the KOT stations' `seenAt`,
  MPOS-1); a browser and node read that, Hermes (the phone's engine) does not, and the card's time
  and age would say NaN. Not seen on a guest-services read: the risk is the same reader.
- **How found:** the mobile chat's review at the merge, after the tables helper's MPOS-1.
- **What was done:** `toDate` reads a moment through `instant()` (the same conversion as
  `pos/floor.ts`), with a check on the converted text (node reads both forms, so the result alone
  proves nothing).
- **The rule it leaves:** every server time goes through one ISO conversion before `Date`.
