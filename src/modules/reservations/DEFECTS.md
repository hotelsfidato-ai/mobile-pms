# Reservations — defects (MRS-)

Each entry: what happened, how it was found, what was done, the rule it leaves. Fixed entries stay.

### MRS-1 · The web's New booking stays on "Loading…" when its inventory read fails (4 Nov)

**What:** `BookingPage.tsx` draws its loading page while `inventory.isLoading || !from || !to`; `from`
is set only once the inventory answers, so a failed read leaves "Loading…" and a skeleton for good, with
no reason and no way to try again. **Found:** reading the web's code while porting it. **Done:** the phone
starts its dates from the business date (or the Calendar cell's night) and says "Could not read the room
types" with Try again, or "No connection" offline; the web's fault is in the report for
`docs/api-requests.md`. **Rule:** every first read has a failed state with words; a page never waits on a
read that has already failed.

### MRS-2 · The pictures are older than the PMS's code for two of this slice's screens (4 Nov)

**What:** All bookings (picture 12: "815 on file", every booking) and New booking (picture 14: the
company's three boxes always shown) were shot on 31 Oct; the PMS changed both on 2 Nov (D27-387: the last
90 days and a search; D27-392: Normal guest / Company guest). **Found:** the page's code did not say what
the picture said; `git log` on the page dated the change. **Done:** All bookings follows today's code (the
owner's later decision, and a phone cannot read every booking ever made); New booking follows the picture
and front desk's walk-in, which shares its rules (a question for the owner). Both listed in MODULE.md's
picture match. **Rule:** before matching a picture, date the page's last change against the picture's.

### MRS-3 · A lost reply let New booking make the same booking twice (4 Nov)

**What:** when nothing came back (or the server failed), New booking said "Not booked" and let go
of its latch; POST bookings reads no idempotency key, so Save tapped again made a second booking. The
advance's "Not known whether it was taken" sat under "Advance not taken:". **Found:** applying MEMORY 16
across the modules (4 Nov). **Done:** on `outcomeUnknown(e)` it says "Not known whether it was booked …
look at All bookings before trying again" and its four buttons take no more taps until the page is
left (`useStuck`, `notKnown` in core/ui.tsx); the advance says "Not known whether the advance was taken"
alone (its keeper per booking was already there; the payments route reads the key). Checked safe to
repeat: Assign room (the server refuses "already in room …"), check in ("Already checked in"), confirm
a waiting booking, Room type / Floor (a preference). **Rule:** an unknown outcome on a route without a
key stops the button.

## Lane m13-groups (20 Nov)

### MRS-G1 · Putting a guest on the waitlist twice after a lost reply (20 Nov)

**What:** `POST /waitlist` reads no idempotency key and inserts a row each time; the web's dialog keeps
its button live after a failure, so a lost reply then a second tap puts the guest on twice. **Found:**
reading `api/src/modules/reservations/waitlist.ts` while porting. **Done:** on `outcomeUnknown(e)` the
phone says "Not known whether it was added: look at the Waitlist before trying again" and the button
takes no more taps until the sheet is closed and the list read (`useStuck`); asked of the PMS (the
report). **Rule:** a write on a route without a key stops on an unknown outcome (MEMORY 16).

### MRS-G2 · Book from the waitlist cannot reach the phone's New booking (20 Nov)

**What:** the web's Book opens `/h/:code/book?waitlist=<id>`, which fills the form from the entry and
sends `waitlistId` so saving takes the guest off the list. The phone's New booking (another lane's file)
reads only `room` and `date`. Opening it without the entry would book the guest and leave them waiting.
**Found:** mapping the web twin. **Done:** Book is greyed "On the website for now"; the change is in the
report for the mobile chat. **Rule:** a door that opens another screen carries what that screen needs,
or stays shut with its reason.

### MRS-G3 · Add to the waitlist let go before the list was really read again (20 Nov)

**What:** MRS-G1's stop lived inside the Add sheet (`useStuck`); closing the sheet only asked for the
list again, and the sheet closed on a tap above, Cancel or Android's back even while the add was on
its way. A lost reply, a re-read that failed or landed before the commit, then a fresh sheet: the
guest added twice (POST /waitlist reads no key). **Found:** the independent review of this lane.
**Done:** the screen keeps the unknown moment; Add (on the page and in the sheet) is grey with "Not
known whether it was added: look at the Waitlist before trying again" until a waitlist read that
finished after that moment came back without an error (`stillUnknown` in waitlist.ts, checked, broken
once); "Read the waitlist again" beside it; the sheets (Add, Remove, Settle) do not close while their
write is on its way. **Rule:** an unknown outcome is held by the screen that outlives the dialog, and
only a good read finished after it lets it go (MEMORY 16, as guests' SamePerson).
