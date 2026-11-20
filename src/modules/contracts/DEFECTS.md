# contracts — defects (phone)

Numbered `MCON-1, MCON-2 …`. Each entry: what happened, how it was found, what was done, and the
rule it leaves. Fixed entries stay. A fault in the PMS itself goes to `docs/api-requests.md`.

## Open

### MCON-1 · Hold rooms reads no key: a lost reply then a second tap can hold the rooms twice (19 Nov) — open, the PMS's

**What happened:** `POST /api/hotels/:code/allotments` never reads `idempotency-key`, and nothing
stops a second allotment over the same nights (only the hotel's free rooms do). A reply lost after the
hold was made, and the person pressing Hold rooms again, takes the rooms twice, off sale. `POST
/companies` and `POST /contracts` are safe by their own refusals (a duplicate name; one contract in
force per date). **How found:** reading the routes for the keeper rule. **What was done:** the sheet
is latched at the tap and, on an outcome nobody knows, says "Not known whether the rooms were held".
**20 Nov, the independent review:** the first build kept that stop inside the sheet, so closing it
(the re-read fire-and-forget) and pressing Hold rooms again opened a fresh, unlocked sheet - a retype
held the rooms twice. Now the moment is the PAGE's: every write greys until a read of the company
made after it has landed without an error (`rules.ts stillUnknown`, its check broken once: a failed
re-read let the writes go), and a sheet cannot be closed while its write is on its way. **Asked of the PMS:**
read the key on POST /allotments. **The rule:** a write whose repeat makes a second thing stops on an
unknown outcome until the record is seen - held by the screen that outlives the dialog, not by the
dialog.

## Fixed

None yet.

---

# m13-stops (20 Nov)

## MCON-U1 · The company page's and the list's stop did not outlive the page

MCON-1 lifted the moment to the page, in `useState`, released by a read that FINISHED after it. Leaving the
company and coming back gave every write back. **Found** by the m13-stops sweep (grep for `useStuck` / `outcomeUnknown` inside sheets), reading the API to see which routes read the key. **Done:** kept by name
(`contracts/<code>/company/<id>`, `contracts/<code>/list`), let go only by a read that began after the loss;
the dialogs hand the error up so the page records it. **The rule:** a write on a route that reads no idempotency key keeps its stop OUTSIDE the sheet and the screen (core `useScreenStop`, by name), stopped while it is on its way, and let go only by a read of the record that BEGAN after the loss and came back good.
