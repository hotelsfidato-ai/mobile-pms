# equipment — defects (prefix MEQ-)

Each entry: what happened, how it was found, what was done, the rule it leaves. Fixed entries stay.

---

### MEQ-1 · The web rounds a cost's paise, and adds a count's total itself (19 Nov) — not copied

**What happened:** the web's `words.ts costText` writes a cost with `money()` (whole rupees: ₹450.50 reads ₹451)
and a count's total as `money(i.totalCost ?? 0)`; the item page's repairs card sums the repairs' costs in the
browser ("Cost recorded: ₹…"). **How it was found:** porting `words.ts` and `ItemRepairs.tsx` against MEMORY 9
and the brief's "money is the server's". **What was done:** `register.ts rupees` keeps paise when there are any
(whole rupees otherwise, as the picture's ₹38,000); the total is the server's `totalCost` or a dash; the repairs'
sum is not drawn, each repair's own `costTotal` is. Checked (`register.check.ts`: a server total that is not
cost x count shows as sent), broken once (cost x count: the check failed), restored. **The rule:** a figure on the
phone is the server's, never one the phone multiplied or added; for `docs/api-requests.md`: the web's two.

### MEQ-2 · Adding equipment reads no idempotency key (19 Nov) — guarded on the phone

**What happened:** `POST /equipment` (and every register write) takes no key; a lost reply then a second tap of
Add makes a second counted line (a tagged one is stopped by its tag). **How it was found:** reading the route
for the unknown-outcome rule (MEMORY 16). **What was done:** each dialog latches its tap and, on an unknown
outcome, says "Not known whether it was added: look at the register…" and takes no more taps until closed;
closing reads again. **The rule:** where the server reads no key, the dialog stops; asked of the PMS for
`docs/api-requests.md` (honour the key on `POST /equipment`).

### MEQ-3 · The stop after an unknown outcome lived inside each dialog (20 Nov) — fixed

**What happened:** Move, Status and Retire (with a count) and Add (a counted line) read no key; their
`useStuck` sat inside each dialog, so closing and reopening it before the re-read landed let the same change be
sent again (a second split, a second line). Report a repair said "Not raised" on a 5xx, and its key died with the
form. **How it was found:** the independent review (H3, H4). **What was done:** the Item and Register screens
keep the mark (`stillUnknown`, reads stamped with when they began): every act is grey with "Not known whether
it was made…" until a read begun after the failure has come back; no dialog closes while busy; the repair's
keeper is the Item screen's, kept across reopening until such a read (POST /work-orders reads it), and an
unknown outcome says "Not known whether it was raised" with "Raise it again sends the same repair".
**The rule:** the stop belongs to the screen that outlives the dialog.

## m16 pickers (20 Nov) — lane m16-pick-pos

### MEQ-P1 · The import's preview says a repeat "corrects prices rather than adding a second copy" (20 Nov) — the web's words, kept
**What:** the shared ImportDialog says it under every preview; for the equipment file it is untrue (every
row is created, never updated: api equipment.ts import). **Found:** reading the API for 2.11's repeat.
**Done:** the phone keeps the web's words (one sheet, as the web) and guards the repeat itself (one
import per tap, the screen's stop). For the PMS: the dialog's line should follow the file (a request
for docs/api-requests.md, through the mobile chat). **Rule:** check what a repeat does on the server,
not what the dialog says.
