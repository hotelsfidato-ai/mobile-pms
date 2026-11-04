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
