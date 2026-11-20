# settings — defects

Each lane appends its own section; numbers are `MSET-<lane letter><n>`.

---

## Lane m13-set-money (letter M, 20 Nov 2026)

No defect was found in the phone's own code of this lane. Three faults of the **web** were found
while porting; the phone does not copy them. They are for the PMS's main chat (`docs/api-requests.md`,
through the mobile chat).

### MSET-M1 · The web's Taxes can clear a heading unasked, and sends a blank amount as 0

**What:** `finance/flows/TaxRulesCard.tsx` SlabsDialog save drops every row whose rate is blank
(`.filter((r) => r.rate.trim() !== "")`) and sends `overAmount: Number(r.overAmount) || 0`. Blank
the only rate of Rooms and press Save: the PUT carries no bands, the server answers "Cleared", and
from then on no room can be billed. A blank "Above" becomes a band on everything.
**Found:** reading the web's save while porting it (20 Nov).
**Done:** the phone's `slabsBody` refuses a blank rate ("Type the rate on every row, or remove the
row.") and a blank amount ("Type the amount each band starts above - 0 for everything."); clearing a
heading is only by removing its rows, and asks first. `moneyRules.check.ts` pins both; broken once
(the row dropped again) and seen to fail.
**Rule:** a tax body never turns a blank into 0 or into "nothing".

### MSET-M2 · The web rounds the paise of a charge, a fee, a discount or a band

**What:** the money pages and the tax card print through `money()` (whole rupees): a ₹1,000.50
pickup reads ₹1,001; a ₹499.50 discount ₹500; a band above ₹7,500.50 "above ₹7,501".
**Done:** the phone prints with `inventory/rates.ts rupees` (paise kept, MEMORY 9); checked.

### MSET-M3 · The web's Rate plans shows a dash when a break-up read fails

**What:** `RatePlans.tsx` reads each room type's break-up in its own query; one that fails leaves
the plan's price null, drawn as "-", which the page's own footnote says means "not priced".
**Done:** on the phone a failed break-up fails the page's read ("The rate plans did not load", Try
again); a dash only when the server sent no price.
