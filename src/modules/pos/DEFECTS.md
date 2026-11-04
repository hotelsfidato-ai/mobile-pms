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

None yet.

## Kitchen

### MPOS-4 · A lost reply let the same round, parcel or add-ons be sent again (4 Nov)

**What happened.** When nothing came back (or the server failed), the pad kept the round and Send
live ("the waiter changes that dish and sends again"), Open the parcel stayed live, and a sent dish's
Done (Add to …) stayed live; the batch, orders and add-on routes read no idempotency key, so a second
tap could make a second docket, a second parcel, or a second set of add-ons (a second one split off).
**How found:** applying MEMORY 16 across the modules (4 Nov). **What was done:** on
`outcomeUnknown(e)` each says "Not known whether it was sent / opened / added … look at … before
trying again" and takes no more taps until it is closed and the table read again (`useStuck`,
`notKnown` in core/ui.tsx; the order's `Outcome` carries `unknown`). Checked safe to repeat (the
server refuses a second or sets a value): Pay (settle refuses an order no longer open), Clear,
Taken, Close early / Reopen, Send to the kitchen ("already with the kitchen"), strike, one fewer,
round off, discount, hold, close unpaid, the header, the kitchen's Start / Ready; a reprint or bill
print prints the paper again, no second record. **The rule:** an unknown outcome on a route without
a key stops the button.

### MPOS-K1 · The pass drew each column as its own scroll; the PMS at phone width is one page (4 Nov)

**What happened:** By stage put Ordered and On the fire in two side-by-side scrolls under fixed
printer lines, so at 375 px the printer lines and the chef's card took the top of the screen for
good and each column scrolled on its own.
**How found:** reading `reference/pms-shots/all/45-point-of-sale-kitchen.png` (4 Nov): the picture is
18000 px tall with both columns running down it, so the web's page scrolls as one.
**What was done:** one scroll under the header holds the printer lines, the stale line, Start here
and the board (By stage and By table), with one pull to refresh (`2dd8bb6`).
**The rule:** a full-length picture taller than the screen means the page scrolls as one; draw
inner scrolls only where the picture shows a clipped box.
