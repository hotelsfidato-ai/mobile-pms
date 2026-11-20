# guests — defects

Every defect found in this module, numbered **MGU-1, MGU-2 …** (M + the PMS's GUE). Each entry: what
happened, how it was found, what was done, and the rule it leaves. Fixed entries stay. A lesson that
would bite any module goes in `MEMORY.md`; a fault in the PMS itself in `docs/api-requests.md`.

## Open

None.

## Fixed

### MGU-1 · The paise check passed with the paise rule taken out (4 Nov)

**What happened** — Companies and agents' tiles and group lines are the web's own sums, which the
phone adds in whole paise. The first `lookup.check.ts` used revenues of ₹100.10 and ₹200.20: breaking
the rule (no rounding to the paisa) left the check green, because `100.1 × 100` and `200.2 × 100` are
exact in floating point and the formatter's two decimals hid the rest. The check would have passed a
sum that drifts.

**How it was found** — breaking the rule on purpose before the rules were first committed (BRIEF
step 5): two breaks stayed green.

**What was done** — the test data was changed to figures the server can send whose float sum is wrong
(₹10.10 + ₹20.20 is 30.299999999999997 as floats); the check compares the figure, not only its
words, and now fails when the sum is made in rupees (`through an agent: got 30.299999999999997`).
Fixed before the rules' first commit (`73d128e`).

**The rule** — MEMORY 11 again: before trusting a check on money arithmetic, break it and see it fail;
pick numbers whose float arithmetic really goes wrong, and compare the number as well as the text.

---

## Lane S — Possible same person (mobile/m13-sales, 19 Nov)

### MGU-S1 · The four same-person writes read no key (19 Nov) — open, the PMS's

**What happened:** `POST /crm/joins`, `/crm/joins/:id/undo`, `/crm/not-same` and
`/crm/not-same/:id/undo` (people.ts) never read `idempotency-key`. A join whose reply is lost and is
pressed again is most likely refused by the database (the joined record no longer stands), but the
answer the person reads is then a refusal of something that was done. **How found:** reading the
routes for the keeper rule. **What was done:** every button is latched at the tap, and on an outcome
nobody knows the screen says "Not known whether …" and stops until the lists are read again (MEMORY
16). **Asked of the PMS:** read the key on the four. **The rule:** a write that reads no key stops on
an unknown outcome until the record is seen.
