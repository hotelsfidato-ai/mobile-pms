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

## Till and Terminal (lane m13-till, 19 Nov)

### MPOS-T1 · The phone refuses the Bar person the till the API allows (19 Nov)

**What happened.** `roles.ts` (15 Oct) lists who rings up as the owner, an administrator, the GM,
the hotel manager, reception, the waiter and the accountant, and says "a till operator". Today's
API (`roleGate.ts` 228) adds the Bar person (D27-324) and says "a waiter, a bar person or the
accountant". Every screen that asks `whyNotRing` (Tables, the pad, the order, Pay) greys every
till button for a Bar person, whose landing is Tables. **How found:** mapping today's roleGate
against `roles.ts` for the Till. **What was done:** the Till and the Terminal ask `till.ts ringWhy`
(today's list and sentence); `till.check.ts` holds it equal to `roles.ts` for every other role, so
a drift shows (broken once: without the Bar person it fails). `roles.ts` is not this lane's: the
mobile chat should give it the Bar person and today's sentence. **The rule:** a ported list of who
may is dated; a lane re-reads the gate it builds on.

### MPOS-T2 · A voided or NC bill opened from the Till reads "Closed unpaid - null" (19 Nov)

**What happened.** The Till's Settled today and An earlier day's bill list voided (`void`) and no
charge (`no_charge`) bills, as the web. The order screen they open (`order.ts finished()`,
`OrderScreen.tsx`) knows only open, settled and abandoned: such a bill reads "Closed unpaid - null"
and offers no Print the bill, where the web says "VOID - <reason>." / "NC · No charge, …" and
prints it (`Terminal.tsx` 1066-1083). **How found:** following a Till row to the screen it opens.
**What was done:** nothing here (the order lane's files, never edited from this lane); for the
mobile chat. **The rule:** a list that opens another lane's screen is followed through every
status it can show.

## The service lane (Bill history, Close restaurant day, Charges to rooms, Table bookings), 20 Nov

### MPOS-S1 · The module's roles.ts predates the Bar role (20 Nov)

**What happened.** `src/modules/pos/roles.ts` (15 Oct) lists TILL and TILL_READ without `bar` and its
sentences say "a till operator"; today's API (roleGate TILL, TILL_READ; the Bar role D27-324) lets a bar
person in and its refusal says "a waiter, a bar person". A bar person would see the till's controls grey
with an old sentence. **How found:** mapping this lane's gates from today's `roleGate.ts`. **What was
done:** this lane's own rights are in `serviceRoles.ts` with today's lists and sentences (checked in
`roomCharges.check.ts`); `roles.ts` is not this lane's to edit — asked of the mobile chat (report).
**The rule:** a role list is read from today's `roleGate.ts` and `permissions.ts`, not copied from an
older module file.

### MPOS-S2 · A Record whose reply is lost could put a second paid-out in the tin (20 Nov, before it shipped)

**What happened.** `POST /till/day-end/movements` reads no idempotency key; a second tap after a lost
reply inserts a second movement (and a second approval request for an expense). **How found:** reading
till.ts 4728-4800 while porting the sheet. **What was done:** the sheet empties its amount, says "Not
known whether it was recorded" and is stuck until closed (useStuck); the close re-reads the day; the
API fault goes to the PMS (report). **The rule:** a write on a route without a key that makes a new
record stops on an unknown outcome (MEMORY 16).

### MPOS-S3 · Save the count could be tapped with nothing typed, and the server took it as ₹0 counted (20 Nov, the independent review)

**What happened.** With a blank grid the Cash step offered "Save the count - ₹0"; it sends an empty list of
notes and the server writes counted ₹0, which unlocks the close as short by the whole of Expected. **The web
does the same** (DayEnd.tsx CashStep: the button is enabled with nothing typed; till.ts `day-end/count`
records `coalesce(sum, 0)` from no rows) - for `docs/api-requests.md`: the count route should refuse an
empty list. **How found:** the mobile chat's independent review of this lane. **What was done:** `whyNotSave`
in `dayEnd.ts` greys Save, with its reason, until something is typed (a typed 0 is an answer), as Open the
day already waited; `dayEnd.check.ts` holds it (broken once: without the blank guard it answers null).
**The rule:** a blank is never a zero, in what the phone sends as much as in what it shows (MEMORY 9).

### MPOS-S4 · Closing a stuck Record sheet let a fresh sheet record the same paid-out again (20 Nov, the independent review)

**What happened.** MPOS-S2's stop lived inside the sheet: closing it started a re-read, but Record opened a
fresh, un-stuck sheet at once, so on poor Wi-Fi a lost ₹500 paid-out could be recorded twice (and a second
approval raised). **How found:** the independent review. **What was done:** the lost moment is kept by the
screen (above the Cash step, which remounts) and Record stays grey with "Not known whether it was recorded"
until a read of the day that came back after it (`stillUnknown`, checked; Close uses the same rule). Also
found: Close's `Alert.alert` buttons do nothing on react-native-web, so the PC preview asks with the
browser's own confirm, same words. **The rule:** an unknown outcome is held where the record is read, not
in the dialog that sent it.

## m13-pos-setup (the Menu and Restaurant setup, 19-20 Nov) — lane letter M

### MPOS-M1 · A check of "off till" passed only in India's time (19 Nov)

**What happened:** `menuEdit.check.ts` expected "Off till 04:46 pm" for a Postgres time of
16:46+05:30; the cloud machine runs in UTC, so the phone's own clock (rightly) wrote 11:16 am and the
check failed - it had been written for one time zone, as a phone in another would show.
**How found:** running the check in the cloud copy, before any commit.
**What was done:** the check computes the expected words from the same instant in the machine's own
zone, and is run under `TZ=Asia/Kolkata` and UTC; the reading itself stays ISO-only (MEMORY 7, 17).
**The rule:** a check of a time on screen never hard-codes a wall-clock hour; it takes the instant and
the zone the phone would have.

### MPOS-M2 · A typo in a "blank is none" figure would have cleared the setting (19 Nov)

**What happened:** the web's Parcels, Service charge and Owner's allowance send `Number(typed)`; for
"20o" that is NaN, which JSON writes as `null` - the server reads "none" and clears the charge.
**How found:** porting Setup.tsx's `save` (reading, not run).
**What was done:** the phone's `typed()` (setup.ts) sends nothing for text that is not a figure and says
"A figure, or leave it blank for none."; a band's rate on Taxes the same (`slabsBad`). Checked in
setup.check.ts. The web's fault goes to `docs/api-requests.md` through the mobile chat (report).
**The rule:** a figure whose blank means none is parsed to number-or-null on the phone, and anything
else is refused before it leaves.

## m13-fixes (20 Nov)

### MPOS-T1 and MPOS-S1 — fixed (20 Nov)

`roles.ts` now carries today's lists, re-read from the PMS (16 Nov release): roleGate.ts TILL 228
(`payment` create + `pos`, `bar`) and TILL_READ 878 (`payment` view + `pos`, `bar`), the holders of
`payment` worked out from permissions.ts's own matrix, and the sentences as refusalFor (1326) words
them, in ROLES' order with WHO's names: "... reception, a waiter, a bar person or the accountant."
(and "... a bar person, the accountant or a viewer." for reading). The strike list (till.ts 2996) had
not changed. `till.ts ringWhy` now simply asks `whyNotRing`, so every till screen answers alike.
`roles.check.ts` holds both lists over every role of ROLES and both sentences word for word; broken
once (the Bar person taken out of TILL), it failed; put back, it passes. `serviceRoles.ts` keeps its
own copies for its lane's gates (equal lists for TILL_READ).

### MPOS-T2 — fixed (20 Nov)

`order.ts finished()` now says a voided, NC or joined bill as the web's OrderPanel (Till.tsx
1593-1609): "VOID - <reason>. Voided by <name> at <HH:MM>[; refund reference <ref>]." and "NC · No
charge - <reason>. Approved by <name> at <HH:MM>." (a missing one a dash, as the web), "Joined to
another table: ...". `types.ts` gains the web's statuses and the void / NC fields (data/till.ts
287-303). An NC bill's figures are the web's two rows, "Bill total" (the server's net) and "NC · No
charge ₹0 to pay" (Till.tsx 1547-1551); a voided or NC bill offers Print the bill as the web
(1617, `printable`); the pill says NC (1413, `statusWord`). `order.check.ts` holds each; broken once
(the void branch skipped), it failed with "Closed unpaid - null".

---

# m13-stops (20 Nov)

## MPOS-U1 · A parcel or a counter order opened twice

POST /till/orders reads no key and a parcel has no table to clash on. The stop was the sheet's or the
card's - and Till and Terminal said "to open another, leave this screen and come back", which let it go.
**Found** by the m13-stops sweep (grep for `useStuck` / `outcomeUnknown` inside sheets), reading the API to see which routes read the key. **Done:** `parcelsStop(code, outlet)`: New parcel and Open grey until a read of the floor or
the open orders begun after the loss; the sheets cannot close mid-write; the advice is now to read the
orders again. **The rule:** a write on a route that reads no idempotency key keeps its stop OUTSIDE the sheet and the screen (core `useScreenStop`, by name), stopped while it is on its way, and let go only by a read of the record that BEGAN after the loss and came back good.

## MPOS-U2 · A round sent twice from a reopened pad

POST /till/orders/batch reads no key, and the round's draft survives closing the pad. **Done:**
`roundStop(code, orderId)`: Send greys on that order's pad until a read of the order begun after the loss
(a round that opened a table: a read of the floor); the pad stays dead until closed.

## MPOS-U3 · A table booking made twice

POST table bookings reads no key. **Done:** `tableBookingStop`: New booking greys until a read of the list
as first opened, begun after the loss.

## MPOS-U4 · A drawer movement: the moment was screen state, compared with a read's finish

MPOS-S4 lifted it to the screen in `useState` with `stillUnknown(at, dataUpdatedAt)`. **Done:**
`drawerStop`: kept by name, stopped while on its way, let go only by a read of the day begun after the
loss. Left: Close the day (refused once closed), set-up acts (upserts or unique names), settle (refused
once the order is not open).

**The review of 20 Nov (on 5fc5064):** an order opened with no table or for the counter shows only in the
open orders, never on the floor, so it has its own name (`openStop`), let go only by a /till/orders read;
parcels keep `parcelsStop`, let go by either read. A new table's first round is kept by its table
(`roundStop(code, undefined, table)`), and a floor read lets go each table it shows.

## m16 pickers (20 Nov) — lane m16-pick-pos

### MPOS-P1 · A stored bill that is a PDF opens named as a picture (20 Nov) — fixed 20 Nov: opened under the server's own name (m16-core2's safe server-named download)
**What:** a paid-out's bill may be a photo or a PDF (BILL takes both), but the list says only `photo: true`,
and the core's `downloadToShare` needs the type before it downloads. The phone names it `bill-….jpg`,
`image/jpeg`, as the web shows it (an `<img>`, which breaks for a PDF too). **Found:** writing 2.1.
**Done:** named as a picture (the common case, the web's own assumption); said in `BillPhoto.tsx` and
in the lane's report. **Rule:** the core's download should take the server's Content-Type (or the
file's first bytes) when the caller cannot know it — asked of the mobile chat.

### MPOS-P2 · A coupon's limit typed with a comma would have saved "no limit" (20 Nov) — fixed before the merge
**What:** the coupon's "Bills it may go on" and "Least bill" went through `Number(text)`: "1,500" or "999,50"
is NaN, which JSON writes as null, and the server (till.ts 3532-3541) saves null as NO limit - and skips its
"cannot take off more than its least bill" guard (till.ts 3576). **Found:** the independent review of
0d933d5. **Done:** `couponPart` reads each with `typed()`: not a figure is said under the box ("Not a
figure: type it as 1500, with no commas.") and Save stays grey; nothing is sent. Checked, broken once.
**For docs/api-requests.md (through the mobile chat):** the web's Menu.tsx 466-470 has the same gap, and
the server should refuse a limit that is present but not a number rather than read it as none.
**Rule:** never `Number(text)` into a body whose null means "none".

### MPOS-P3 · A chosen bill photo could be dropped without a word (20 Nov) — fixed
**What:** in Record, a photo was sent only when the server answered with the movement's id; with no id it
was dropped and "Recorded" said. **Found:** the review. **Done:** "Recorded, without its photo" and the way
to add it on the paid-out in the list.
