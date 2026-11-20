# settings — defects

Each lane appends its own section; numbers are `MSET-<lane letter><n>`.

---

## Lane m13-set-money (letter M, 20 Nov 2026)

No defect was found in the phone's own code at first. Three faults of the **web** were found while
porting (M1-M3); the phone does not copy them. They are for the PMS's main chat (`docs/api-requests.md`,
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

### MSET-M4 · The accountant could not open Taxes on the phone (the review of 20 Nov)

**What:** roleGate's GST lets the accountant set GST (`roleGate.ts` 201, `also: finance`), and the web
gives the accountant the tax card on Invoices (`finance/pages/Invoices.tsx` 488). The phone's Taxes
page asked only the console's rule (owner, administrator, GM), so the accountant was refused it; and
the phone's Invoices note sent people to "Settings › Taxes and billing", an address the web dropped.
**Found:** the independent review of `756d481`.
**Done:** Taxes opens when the console offers it **or** GST allows the role - the same set plus the
accountant, never wider than GST. `GET /tax` is `anyone`, so the accountant's read is allowed. The
Invoices note now says where the rates are set and has "Open Taxes" (`/settings/:code/taxes`).
**Rule:** a page that two web screens share opens for whoever either of them lets in.

### MSET-M5 · After a save, Edit opened on the old set and could send it back (the review of 20 Nov)

**What:** after a write the page read itself again, but its Edit buttons stayed live while that read
was in flight. A sheet opened then carried the setup from before the save, and its Save re-sent it:
PUT tax/:kind deletes and re-inserts every band (`tax.ts` 226-236), PUT plan-settings sources the
same (`planSettings.ts` 117-125), so the old set would have replaced the new one.
**Found:** the independent review of `756d481`.
**Done:** `moneyRules.ts freshBook`: after a write that landed, every write of the page is grey until
a read that began after that write's end has come back good (ordered by the core stop book's
counter). `moneyRules.check.ts` pins it (a read begun before the end lets nothing go); broken once
(any read let it go) and seen to fail.
**Rule:** a sheet that replaces a whole set opens only from a read taken after the last write.

### MSET-M6 · Independent, or a blank difference, priced a room type's plans away unasked (the review of 20 Nov)

**What:** choosing Independent for a room type, or blanking its difference, sends PUT pricing/addon
`{amount: null}` (`planSteps`); a type with no base of its own on Rates is then left with no price on
any of its plans, and nothing said so before the tap.
**Found:** the independent review of `756d481`.
**Done:** `planAsk`: the editor asks first, in plain words - "Its plans lose their price unless
<type> has its own base on Rates." - as it already did for making a type the master. Checked; broken
once (the clear not asked) and seen to fail.
**Rule:** a set-up change that can leave a price empty asks first.

### Also in this round: the core stop book

The lane's own doubt store (`moneyStop`) is gone: every page uses the core's `useScreenStop`
(`src/core/stop.ts`, main `7bd0c88`), names `settings/<code>/<page>`, with its 5 s settle after a lost
reply and its `Stopped` line. Nothing the lane needed was missing from it, except that it keeps no
words for the line: `moneyKit.tsx` keeps the last loss's "Not known whether…" sentence by name beside it.
