# pos — defects (MPOS-)

Every defect found in this module, numbered **MPOS-1, MPOS-2 …** (AGENTS.md). Each entry: what
happened, how it was found, what was done about it, and the rule it leaves. Fixed entries stay.
The web twin's own faults go to the PMS (`docs/api-requests.md`), not here.

---

## The tables helper (Tables and the order pad), 4 Nov

### MPOS-1 · A server time in Postgres's own text reads as NaN on a phone (4 Nov)

**What happened.** Tables read every server time with `new Date(text)` / `Date.parse(text)`: the
KOT printer line's "not seen since", Close early's `closedUntil`, and a side's or an add-on's
`offUntil` on the dish sheet and in Customise. The API sends some of these as Postgres's own text
("2026-10-31 07:35:58.215147+05:30"). A browser reads that; Hermes (the phone's engine) reads only
ISO and answers NaN: the red line would say "not seen since NaN undefined NaN, 12:NaN PM", a
restaurant closed early would show as open (no banner, no Reopen, New parcel offered), and a side
that is off today would be offered. **How found:** reading the kitchen helper's commit `c00fc74`
(the same fault on the pass, read back from the API on 31 Oct) against `floor.ts`; the checks run
under node, which reads both forms, so they could not have caught it. **What was done:** `instant`
(the kitchen's rule, the same text) and `at()` in `floor.ts`; `since`, `closure` and `offNow` read
through them; an unreadable time is a dash, never NaN, and never a closure. `floor.check.ts` checks
the text itself (broken once: without the "T" it fails). **The rule:** every server time on the
phone goes through `instant`/`at` — never `new Date(serverText)`. (For the mobile chat: one copy in
`src/core/format.ts` for every module, MEMORY.)

### MPOS-2 · The dish sheet showed ₹0 (or the sides alone) before a variation was chosen (4 Nov)

**What happened.** The sheet's footer was `cash(unitPriceOf(...) * qty)`; `unitPriceOf` (the web's
`pricing.ts`) prices a missing variation at zero, so Bhaaji Pau showed ₹0, or ₹50 with two sides,
until Oil or Butter was tapped — a figure the system does not hold. **How found:** reading the
sheet against "a dash, never a zero" (AGENTS rule 2). **What was done:** `sheetFigure()` in
`pad.ts` answers null (a dash) until one of each variation type is chosen; `pad.check.ts` holds it
(broken once: without the guard it answers 50). Add was already off until then. **The rule:** a
figure built from a choice not yet made is a dash.

### MPOS-3 · A second tap before the first answer could ring a round, or open a parcel, twice (4 Nov)

**What happened.** Send on the pad, Open the parcel, and a tile's Clear / Taken / Close early /
Reopen were guarded only by a `busy` state, which reaches the button a render later; two quick taps
in between would send two writes, each with its own idempotency key (and the till has no
idempotency yet, R-13): the kitchen would get the round twice and the bill would carry it twice.
**How found:** reviewing every write path on the pad for money. **What was done:** a latch (`useRef`)
set at the tap and cleared when the answer is in, on Send, Open the parcel and every tile write.
**The rule:** a money write is latched at the tap, not by the state that draws the spinner.
