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
