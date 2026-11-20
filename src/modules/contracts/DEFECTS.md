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
is latched at the tap and, on an outcome nobody knows, says "Not known whether the rooms were held"
and takes no more taps until it is closed and the company read again (MEMORY 16). **Asked of the PMS:**
read the key on POST /allotments. **The rule:** a write whose repeat makes a second thing stops on an
unknown outcome until the record is seen.

## Fixed

None yet.
