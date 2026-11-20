# marketing — defects (phone)

Numbered `MMKT-1, MMKT-2 …`. Each entry: what happened, how it was found, what was done, and the
rule it leaves. Fixed entries stay. A fault in the PMS itself goes to `docs/api-requests.md`.

## Open

### MMKT-1 · The web rounds revenue to whole rupees (19 Nov) — open, the PMS's to decide

**What happened:** `Marketing.tsx` writes revenue and spend with `money(Number(v))`
(maximumFractionDigits 0), while the server sends booked value as numeric text with paise. **How
found:** porting `rupees()`. **What was done:** the phone keeps paise where the server sent them and
writes a whole amount as the web does ("₹11,097"), so the picture still matches (MEMORY 9).
**The rule:** a figure as the server sent it, never rounded.

## Fixed

None yet.
