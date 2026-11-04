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

**How it was found** — breaking the rule on purpose right after the rules' first commit (`73d128e`; BRIEF step 5).
Two breaks stayed green.

**What was done** — the test data was changed to figures the server can send whose float sum is wrong
(₹10.10 + ₹20.20 is 30.299999999999997 as floats); the check compares the figure, not only its
words, and now fails when the sum is made in rupees (`through an agent: got 30.299999999999997`).
Committed with the Guests screen (`1efd2cb`).

**The rule** — MEMORY 11 again: before trusting a check on money arithmetic, break it and see it fail;
pick numbers whose float arithmetic really goes wrong, and compare the number as well as the text.
