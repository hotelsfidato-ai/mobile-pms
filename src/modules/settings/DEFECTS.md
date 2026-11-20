# settings — defects (prefix MSET-, then the lane's letter)

Every defect found in the Settings console's own pages on the phone: what happened, how it was
found, what was done about it, and the rule it leaves. Fixed entries stay. Each lane appends its own
section; numbers carry the lane's letter so two lanes never take the same one.

## Lane m13-set-messages (letter G, 20 Nov)

None found in the phone's pages while building them.

Found in the web or the API (for `docs/api-requests.md`, through the mobile chat):
- **`POST /:code/report-schedules` reads no `idempotency-key`** (api/src/modules/reports/emails.ts
  371-384), R-30's class: a lost reply then a second Save adds the schedule twice, and each sends the
  report every night. The phone stops the page until a read begun after the loss is back; ask the PMS
  to read the key.
- **The web's Scheduled reports sends a second write while one is on its way**: only the row being
  paused shows loading, so Edit, Delete and another row's Pause stay live (ScheduledReports.tsx
  108-115). Harmless for the PUTs, but a Delete and a Pause of the same row can cross. The phone greys
  every write while one is out.

## Lane m13-set-lists (letter L, 20 Nov)

Found by the independent review of `ac26af2` (20 Nov), all fixed on this branch:

- **MSET-L1 (medium): a second tap sent a whole list without the first change.** ID types
  (`idTypesOff`), Reservation types (`statusColours`) and Front desk rules' required fields
  (`requiredBookingFields`) are sent whole, built from the last read, and the server puts the list in
  place of its own (api lists.ts 272-277). After a write landed the controls were live again before
  the read came back, so a quick second switch sent a list missing the first. *Found:* the review.
  *Done:* after a write that landed the page stays grey until a read BEGUN after the write's end has
  come back (`<name>/fresh` in the core's stop book, lists.ts `writeOnce` / `watchPage`), and each
  control shows the value it sent meanwhile; check cases in `lists.check.ts` (broken once: without
  the mark, "landed, not yet read again" fails). *Rule:* a write that sends a whole list built from a
  read waits for the next read before the next write. **The web has the same race**
  (FrontDeskPage.tsx 69-70, ListPages.tsx 163-166 and 202-204: each change is sent from the hotel
  list in hand, re-read only after) - for `docs/api-requests.md`: ask the PMS to send one item's
  change (add or remove one ID type, one colour, one field) rather than the whole list.
- **MSET-L2: leaving the page mid-write let a second write go.** The page's latch was a `useRef` and
  the doubt a module map that only knew a lost write, not one on its way. *Done:* both replaced by the
  core's stop book (`src/core/stop.ts`, `stops`), which holds a write on its way outside React and
  waits 5 s after a lost reply before a read may let it go. *Rule:* MEMORY 22.
- **MSET-L3: Move up on two rows of the same order did nothing** (ported from the web's `swap`,
  which gives the moving row one more whichever way it moves; the server orders a tie by name).
  *Done:* on a tie the row to come first keeps the order and the other takes one more
  (`swapSorts(moving, other, up)`, only the sorts that change are sent); check cases apply each move
  to the server's order. The web's own Move up on a tie still does nothing - for the PMS.
- **MSET-L4: Times and rules drew the web's built-in defaults when the server sent no rules**, and
  Save would have sent them as the hotel's. *Done:* it says "The server sent no front desk settings
  for this property." with no card and no Save, as Front desk rules does.

Found in the web or the API (for `docs/api-requests.md`, through the mobile chat):
- **`POST /:code/holidays` fails on a day that is not real** (api/src/modules/front-desk/lists.ts
  137-152): the check is only the shape `^\d{4}-\d{2}-\d{2}$`, then `$2::date` throws for
  "2026-02-30" and the route answers a 500, not a sentence. The web's date box never sends one; the
  phone checks the day before it asks. Ask the PMS to refuse it with "Choose the day."
- **Two refusals say less than the truth.** `PATCH /lists/:kind/:id` turns ANY database error into
  "That one is on the list already." (line 94), and `POST /vip-levels` turns any into "The group's
  VIP levels are set by the owner or an administrator." (line 184) - while row security
  (`app.sets_group_settings`, 192) lets a GM change them too, and VipLevelsPage says "Only the owner
  or an administrator changes it". The phone shows the server's words as sent.
- **No idempotency key on these writes** (lists, holidays, VIP levels, desk-settings, front-desk).
  A repeat of an add is refused by the unique names ("on the list already", "a holiday already"),
  and the PATCHes set values, so a lost reply is not doubled; the phone still stops the page until a
  read begun after the loss is back (MEMORY 22).
- **The web's ListEditor moves with two PATCHes** (`swap`), not one: a failure between them leaves
  two rows on one sort until the next move. The phone does the same (ported), and reads again.

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
