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
