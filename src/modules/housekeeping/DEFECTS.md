# housekeeping — defects (MHK-)

Every defect found in this module, numbered **MHK-1, MHK-2 …** (AGENTS.md). Each entry: what
happened, how it was found, what was done about it, and the rule it leaves. Fixed entries stay.
The web twin's own faults go to the PMS (`docs/api-requests.md`, R-1 to R-9), not here.

---

### MHK-3 · A lost reply let a repair, or a take-out, be made twice (4 Nov) — fixed

**What happened.** `send()` mints a key per call, so Raise it tapped again after a lost reply sent
the same repair under a new key, and the server (which reads the key, 062) made a second; Raise it
was guarded only by `busy`. Out of service's "Take out of service" stayed live after a lost reply,
and POST block reads no key: a second tap made a second block. **How found:** applying MEMORY 16
across the modules (4 Nov). **Done:** Report a repair sends ONE key per form on every try (a
keeper whose key is fixed, core/keys.ts), latched at the tap; a lost reply says "Not known whether
it was raised … Raise it again: the server makes it once"; an unknown take-out of the repair's room
says "not known whether room … was taken out" (a second is refused by the server). Take out of
service, on an unknown outcome, says "Not known whether it was taken out" and takes no more taps
until the room is opened again (`useStuck`, `notKnown` in core/ui.tsx). Checked safe to repeat:
the room's state and its assignment (set a value), Put back, a work order's Start / Done / Cancel
(refused once closed), Cancel a cost ("already cancelled"). **The rule:** a key the server reads is
kept for the whole intent; an unknown outcome on a route without one stops the button.

### MHK-2 · Mine: a person's name looked up by a room's key (15 Oct) — fixed before it ran

**What happened:** in `Rooms.tsx`, `nameOf` first looked a staff id up in the sheet, which is keyed
by room number. **How it was found:** the rooms helper, re-reading its code before opening it.
**What was done:** the roster first, then the sheet's own `staffName`, then a dash. **The rule:** a
`Map`'s key is written next to its name.

### MHK-1 · A refused take-out emptied the note (15 Oct) — fixed

**What happened:** `OutOfService.tsx` cleared the note after every attempt, a refused one too.
**How it was found:** the block helper, reading its own code while proving the offline refusal.
**What was done:** cleared only on success, as the web's `setNote("")`; a refused (500) take-out
seen keeping the note. **The rule:** reset a form field only on the success path.

---

## Work orders (helper "maintenance") — MHK-W1, MHK-W2 …

### MHK-W2 · Two quick taps of Start sent two changes (4 Nov) — fixed before it ran

**What happened:** `WorkOrdersScreen.tsx` sent `PATCH /work-orders/:id` on every tap of Start /
Put back, with nothing to stop a second tap while the first was on its way; `send()` mints a new
idempotency key per call, so two taps were two changes (online: two writes; offline: two held
entries). **How it was found:** the maintenance helper, reading the screen against M-5 ("the key
from the first tap"). **What was done:** the screen keeps the order being sent and `whyNotUpdate`
says "Sending…" until it answers; checked, broken once. **The rule:** a write button is grey while
its own write is on its way — the key is per tap, so a second tap is a second change.

### MHK-W1 · A timestamp would have printed "NaN Oct 2026" (4 Nov) — fixed before it ran

**What happened:** the card's dates and a cost's went through the core's `dateShort` / `dateLong`,
which read "2026-10-10" only; given "2026-10-10T08:21:34Z" they print `NaN` (seen in the check).
The shapes do not say whether `raisedAt`, `closedAt`, `recordedAt` and a cancelling's `at` are dates
or timestamps. **How it was found:** the maintenance helper, reading the Costs dialog. **What was
done:** `workOrders.ts` takes the first ten characters (`day`, `longDay`); checked with both forms,
broken once. **The rule:** a date from the API goes through one helper that accepts a date and a
timestamp alike; a timestamp's day is then the UTC day (asked of the owner).

---

## Minibar and Checklists (lane m13-hk) — MHK-K1 …

### MHK-K1 · The money check passed with a zero turned into a dash (19 Nov) — fixed before it ran

**What happened:** `care.ts money` was broken on purpose to `!n ? DASH : …` to prove its check; the check still
passed, because no case held a real zero — a ₹0.00 the server sent would have read "-". Restoring it with
`git checkout` restored nothing (the file was new and untracked: MEMORY 18 again); it was put back by hand.
**How it was found:** the lane's own break-once. **What was done:** `care.check.ts` now holds
`money(0) = "₹0.00"`; broken again, it failed; restored from a copy. **The rule:** a dash is for "not sent" only;
a check of a figure rule holds a zero, and a file is copied aside before it is broken.

### MHK-K2 · A take's key died with its dialog, so a second refill and charge were one reopen away (20 Nov) — fixed

**What happened:** the take's idempotency key was minted per TakeDialog mount, the dialog could be closed while
its request was in flight (Cancel, ✕, the shade, Android's back), and Record for a room was never held. After a
lost reply or a 5xx, close + reopen + Record sent a NEW key: `POST /minibar/records` would issue a second refill
and post a second charge. After an unknown outcome the room also stayed editable, so a new room + Record replayed
the old key and the server answered `duplicate: true` with the FIRST take — which the phone toasted as "On room
205's bill". And the `?room=` link opened the take without asking who may. **How it was found:** the independent
review of lane m13-hk (H1, H2, H5). **What was done:** the take's keeper lives on the Minibar screen; on an
unknown outcome the take is locked as sent (room, counts, "not sure"), its button says Try again (the same take,
the same key), and Record for a room is grey with "Not known whether the last take was recorded…" until a read
that BEGAN after the failure has come back (`care.ts stillUnknown`, checked); `duplicate` is read and said as
"This take was already recorded … Nothing more was sent" (checked); no dialog of the lane closes while its write
is on its way (`careKit Dialog busy`, Cancel grey); the deep link asks `whyNotOpenTake` as the button does. The
desk's decision waits the same way (a read begun after). **The rule:** a key that guards money lives as long as
the doubt, not as long as a dialog — hold it where the person can come back to it, and unlock only on a read
begun after the failure. **The web's MinibarFlow.tsx (40-44) has the same flaw:** it mints a new `pressKey`
each time the window opens (for `docs/api-requests.md`).
