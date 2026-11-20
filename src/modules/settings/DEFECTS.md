# settings — defects

Each lane appends its own section; numbers `MSET-<lane letter><n>`.

## Lane P — mobile/m13-set-property (20 Nov)

### MSET-P1 · The web clears a child age typed as anything but a whole number (open, the PMS's) — for docs/api-requests.md

**What happened:** the web's Policies → Child ages sends `Number(text)`; "7.5" goes as 7.5 (the server
refuses it), but "abc" or "1e" become `NaN`, which JSON writes as `null`, and the server takes null as
"not set": the age is cleared without a word. **How found:** porting `Policies.tsx` ChildAges against
`api/src/modules/admin/property.ts` child-ages. **What was done:** the phone sends blank as null, digits
as the number, anything else as typed, so the server answers "An age is a whole number up to 17."
(`propertyRules.ts` `ageOf`, checked, and broken once). **For docs/api-requests.md:** the web's `Policies.tsx` ChildAges should send the typed text (or refuse it) instead of `Number(text)`, so `abc` is refused in the server's words instead of quietly clearing the age.
**The rule:** a typed number goes as typed after the web's own validation, never through `Number()`
whose NaN becomes a silent null.

### MSET-P2 · A property's detail read carries its whole staff list (open, the PMS's) — for docs/api-requests.md

**What happened:** Profile and Policies read GET `/api/admin/hotels/:code` for the property's own fields and
house policies (`.property`). The same answer carries `staff` (every person rostered there: name, email,
role, sign-in state) and `grantableRoles`, which these pages never show. **How found:** the independent
review of this lane (20 Nov). **What was done:** the phone reads and draws only `.property`; nothing of the
staff list is kept beyond react-query's cache for the page. **For docs/api-requests.md (DPDP):** a slimmer
read for a property's profile (its fields, FSSAI and house policies only), e.g. GET `/:code/property-detail`,
so a profile page does not fetch people's details it does not need. **The rule:** read what the screen
shows; a wide answer is asked to be narrowed at the source.

### MSET-P3 · The session's hotels went stale after sign-in (fixed in the core, 20 Nov)

**What happened:** the session read each property's `today`, business date and front desk rules only at
sign-in and after a night audit on this phone; the frame re-read GET /api/hotels on every screen but kept it
to itself. Past midnight, Set up this hotel's "Remind me → Tomorrow" sent today's date (the server takes it
as due today), and a day later "Tomorrow" was refused; Documents' desk rules stayed as at sign-in. **How
found:** the independent review. **What was done:** `src/core/hotels.ts` `freshHotels` (checked, broken
once): the frame's answer, for the same person, replaces the session's hotels whenever they changed; a moved
business date reads every list again (the web's refreshDates). **For docs/api-requests.md:** the web's own
refreshDates replaces its hotels only when a business date moved, so the web's `today` and desk rules stay
stale past midnight the same way (its Remind me sends the old today). **The rule:** a date or rule the server
sends with the session is kept as current as the frame's read, never only from sign-in.
