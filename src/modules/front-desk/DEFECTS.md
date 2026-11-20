# front desk — defects (MFD-n)

What happened, how it was found, what was done, the rule it leaves. Fixed entries stay.

## MFD-1 · The brief's route name would have failed the gate

`check-in/[stayId].tsx` (the brief's example) has a capital in its parameter; the gate's route check
(`scripts/gates.sh`, `\[[a-z]+\]`) cannot read it, so the bundle's routes would not equal `app/`.
**Done:** `[id]` here. **The rule:** route parameters are lower case until the gate's pattern changes
(the folio copy's `app/folio/[code]/[stayId].tsx` meets the same pattern: said in the report).

## MFD-2 · The spec moved under the copy

This copy's root is the PMS of 15 October; M-11's pictures are today's (`pms-ref`). Check-in lists
every room type (D27-330), blocks refuse a room (D27-339), voids leave the lists (FD-32), the walk-in
page gained the guest's company and a special request. Found by reading picture 14 against the
copy's `BookingPage.tsx`. **Done:** every rule re-read from `.claude/worktrees/pms-ref`.
**The rule:** the web twin is `pms-ref`, not the copy's own root.

## MFD-3 · The phone added money up itself

The stay's foot showed Charged as the folio's balance plus its payments, and while nights were still
to come a "Due" the phone worked out from the rate, the nights and the GST rate; Due out's banner
added the departures' balances; the check-in's move sentence and Change dates said a total of
nights; the walk-in's price line worked out the tax a night and its booking card added Room
charges, GST and Due; an inclusion's line multiplied its rate by its quantity. Each was the web's
own preview, and picture 14 shows some of them, but the brief says the phone never totals a bill or
a tax. Found on 4 Nov by reading every `paise`, `* nights` and `+` on money in the module against
the brief (the folio copy's MODULE.md had already taken the same line).
**Done:** the foot shows the bill's own `total` and `paid` (`/stays/:id/bill`) and the folio's
balance; while nights are to come it says Balance, grey, with "Charges to come", never Overpaid
(`desk.ts footOf`, as the folio's `headline`); Due out's banner is the server's `/due-out` count and
sum, as the Dashboard's tile; the move and the amend say the rate a night and the server's GST
rate; the walk-in says the night's price and "+ tax (5%)", and its card the night's price, the GST
rate and that the bill carries the totals; an inclusion says "2 × ₹500". Checks: `footOf` (the
bill's total, never balance + paid; the sign kept while nights are to come; dashes with no bill),
`summary` (no total or tax key), `moveWords`, `amendLine`; each new rule broken once.
**The rule:** a money figure on the phone is one the server sent; a sum the web makes is said as
its parts, and asked of the API (a quote for New booking) in the report.

## MFD-4 · A figure not read yet was said as a fact

Walk-ins said "0 today" before the list was read; a returning guest whose visit count the server
did not send was "Has not stayed with the group yet"; Check in said "Rooms are ready from ." when
the property's clock was not read. Found reading the screens for `?? 0` and `?? ""` on 4 Nov.
**Done:** "- today", no visit words without the count, "Rooms are ready from -.".
**The rule:** a count or a time not read is a dash, the same as money.

## MFD-5 · Two taps under 44 px

The check-in's (i) beside Room and ID was 28 px tall, and the stay's phone and email links 24 px.
Found reading every `minHeight` under 44 on 4 Nov. **Done:** the (i) row is 44 px; the links keep
their line and gain a 10 px reach on every side (`hitSlop`). **The rule:** every tap is 44 px, by
size or by reach.

## MFD-6 · The offline words could never show

The stay and Check in asked "did the read fail?" before "is there a line?", so with no connection a
first read always fell into "Could not read the stay" and the offline sentence under it was dead
code; Take a walk-in had no offline state at all. Found on 4 Nov checking the four states of every
screen. **Done:** one `NotRead` (StayList.tsx): offline it says "No connection … has not been read
on this phone yet", online the server's words; the lists, the stay, Check in's rooms and Take a
walk-in use it, and Take a walk-in keeps its last tiles with `Kept`. **The rule:** a failed read
asks about the line first.

## MFD-7 · A refused tick did not say why

The stay's "Agreed to WhatsApp" went grey for a role the API refuses (`customer` edit) and said
nothing when tapped. Found on 4 Nov checking every greyed control for its sentence. **Done:** `Tick`
takes the API's `reason` and says it when tapped (and to a screen reader as its hint), as `Button`
and `MarkLink` do. **The rule:** a greyed control without its sentence is a hidden one.

## MFD-8 · A booking, an exchange or an added line could be made twice from one intent

When nothing came back (or the server failed), the walk-in said "Not booked" and kept its three
buttons live; an exchange, an added inclusion and an added adult kept theirs too (and none was
latched at the tap). POST bookings, exchange, inclusions and companions read no idempotency key, so
a second tap made a second booking, swapped the rooms back, or wrote a second line or person. The
walk-in's advance said "Advance not taken" when it may have been. Found on 4 Nov applying MEMORY 16
across the modules. **Done:** each is latched at the tap; on `outcomeUnknown(e)` it says "Not known
whether it was booked / exchanged / added: look at … before trying again" and takes no more taps
until it is closed (`useStuck`, `notKnown` in core/ui.tsx); the advance says "Not known whether the
advance was taken … look at the bill" and has a keeper per stay (the payments route reads the key),
as reservations' New booking. Checked safe to repeat (the server refuses a second or sets a value):
check-in, assign, move, unassign, void, confirm, cancel, amend, WhatsApp, VIP, edit an adult, remove
a line or an adult. **The rule:** an unknown outcome on a route without a key stops the button.

# m13-rooms (19 Nov), lane letter R

## MFD-R1 · The Calendar still sends Rooms to the website

The Calendar's Calendar · Rooms switch (`src/modules/reservations/Calendar.tsx`) answers a tap on
Rooms with "Rooms, the house as tiles, is on the website for now." Found on 19 Nov building Rooms,
which is now `/front-desk/<code>/rooms`. **Done:** nothing here (reservations' file, another lane);
the exact change is in the lane's report for the mobile chat. **The rule:** a screen that lands
looks for the greyed links that pointed at it.

## m13-fixes (20 Nov)

### MFD-9 · The stay lists' file rounded the balance and dropped its sign — fixed (20 Nov)

**What happened.** The brief named a rounded `cash` figure in `StayList.tsx`. On the card it is the
web's own: StayTable.tsx 140-160 writes `money(Math.abs(balance))` (whole rupees) with " over" for a
negative one, and the phone's `cash` is the web's `money` - so the card was left as the web draws it.
The rounding that was wrong was in the file: `valueText` wrote the card's "₹785 over" for the export,
where the web's StayTable EXPORT (62-76) hands over the raw figure, "a balance signed (negative is
owed to the guest)", and the server prints it to the paisa (reportRender.ts formatCell "rupees"). The
Rate column the same. **How found:** following the brief's grep to the web's StayTable. **What was
done:** `desk.ts fileMoney` (the server's figure to the paisa, its sign kept, a dash when not sent)
for the Rate and Balance cells of the file; `desk.check.ts` holds it (broken once to the rounded
`Math.abs` form, it failed). **The rule:** a list's file carries the server's figure, not the card's
words for it (MEMORY 9).

---

# m13-stops (20 Nov)

## MFD-U1 · Exchange rooms could be sent again - and a second exchange swaps them back

POST /stays/:id/exchange reads no key; the sheet held the stop. **Found** by the m13-stops sweep (grep for `useStuck` / `outcomeUnknown` inside sheets), reading the API to see which routes read the key. **Done:** `stayStop`:
Exchange with another guest greys on the stay (More options says why; the stay shows the line) until a
read of the stay begun after the loss; closing reads it; the sheet cannot close mid-write. **The rule:** a write on a route that reads no idempotency key keeps its stop OUTSIDE the sheet and the screen (core `useScreenStop`, by name), stopped while it is on its way, and let go only by a read of the record that BEGAN after the loss and came back good.

## MFD-U2 · An inclusion added twice

POST …/inclusions reads no key. **Done:** `inclusionsStop`: Add greys until a read of the list begun after
the loss (the sheet shows it); the sheet cannot close mid-write.

## MFD-U3 · An adult added twice

POST …/companions reads no key. **Done:** `adultsStop`: Add an adult greys until a read of the stay's adults
begun after the loss; closing reads them; the sheet cannot close mid-write (Edit is a PUT: no stop).

## MFD-U4 · A walk-in booked twice by going back and opening it again

POST /bookings reads no key; the walk-in's stop was its screen's. **Done:** `walkInStop`: the walk-in's
three buttons stay grey, with "Open Arrivals", until a read of today's Arrivals begun after the loss (a
walk-in is always today's).
