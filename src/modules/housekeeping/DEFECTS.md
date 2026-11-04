# housekeeping — defects (MHK-)

Every defect found in this module, numbered **MHK-1, MHK-2 …** (AGENTS.md). Each entry: what
happened, how it was found, what was done about it, and the rule it leaves. Fixed entries stay.
The web twin's own faults go to the PMS (`docs/api-requests.md`, R-1 to R-9), not here.

---

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
