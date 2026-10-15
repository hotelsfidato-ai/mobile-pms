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
