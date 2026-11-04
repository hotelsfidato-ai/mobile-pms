# Defects — revenue management (phone)

Numbering `MREV-1`, `MREV-2`, … Each entry: what happened, how it was found, what was done about it,
and the rule it leaves. Fixed entries stay.

---

## Open (the web's, kept apart on the phone)

### MREV-1 · The web shows a failed read of the month as "No figures for this property yet." (4 Nov)

- **What happened:** `Outlook.tsx` draws `!pace.data` as "No figures for this property yet.", which is
  the answer for a property that is not this person's (a 404 is null) and also for a read that failed
  (a 500, no connection): the owner is told there are no figures when they could not be read.
- **How found:** porting `Outlook.tsx` 155-168 against the four states the phone must tell apart.
- **What was done:** the phone keeps the web's words for a 404 and says "Could not read this month's
  figures: <the server's words>" with Try again for a failure. For `docs/api-requests.md` (the web's
  page, not the API).
- **The rule:** a read that failed says so; "no figures" is only for a reply that holds none.

### MREV-2 · The web rounds the rivals' middle price to the rupee (4 Nov)

- **What happened:** `market-rates/data.ts` `nearbySummary` takes the median of an even count as
  `Math.round((a + b) / 2)`, so two rivals at ₹3,499 and ₹3,500 read "middle ₹3,500", and its `money()`
  writes every price in whole rupees.
- **How found:** porting it against MEMORY 9 (a figure as the server sent it, never rounded).
- **What was done:** the phone keeps the paise: the middle is `(a + b) / 2` and every price goes
  through `rupees()` (`src/modules/inventory/rates.ts`: whole rupees when whole, else to the paisa).
  `outlook.check.ts` holds ₹3,499.50, and was seen to fail with the web's rounding put back.
- **The rule:** a price the phone derives from the server's prices keeps their paise.
