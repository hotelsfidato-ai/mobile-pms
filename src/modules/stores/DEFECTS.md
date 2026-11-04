# Defects — stores (phone)

Numbering `MST-1`, `MST-2`, … Each entry: what happened, how it was found, what was done about it,
and the rule it leaves. Fixed entries stay. A fault in the PMS itself (its API or website) is not
fixed here: it goes to `docs/api-requests.md` through the mobile chat.

---

## Open

### MST-1 · The web adds rupees up in the browser on four store screens (4 Nov) — open, the PMS's

**What happened:** porting the Store, the web's page sums money the server never sends:
the Store's line "9 items · ₹34,857 on the shelf" (`Stores.tsx` `total = priced.reduce(...)`), an
item's Worth with a store picked (`here * unitCost`, rounded in the browser), the bar sheet's
"Amount, all drinks" (`BarStock.tsx` `totalAmount`), and Receive's GST amount "filled from the rate"
(`quantity * cost * rate / 100`). **How found:** reading the web twin before the first screen.
**What was done:** the phone draws none of them (the rule: money is the server's, the phone totals
nothing): the headline counts items and "not yet valued"; with a store picked the card shows the
server's whole-hotel `value` labelled "Worth, all stores"; the bar's total is not drawn; the GST
amount is typed as the bill says. **Asked of the PMS:** `GET /stores` to send the shelf's total and
each item's worth per store; `GET /bar/sheet` the day's amount. **The rule:** a sum a web page makes
is not a figure the phone may copy; ask the server for it.

### MST-2 · The store's writes do not read the idempotency key (4 Nov) — open, the PMS's

**What happened:** `api/src/modules/stores/stores.ts` (movements, transfers, counts, reverse),
`barSheet.ts` and `barRequests.ts` never read `idempotency-key`. A Receive whose reply is lost and
which is tapped again records the delivery twice. **How found:** reading the routes for the keeper
rule (BRIEF-T2 "Keys"). **What was done:** every write is latched at the tap (MEMORY 8), and offline
every one is refused (no store path is on the web's list), so only a reply lost after the server
wrote it can double it. A count carries its book, so its repeat is refused by the server ("moved
since the count was opened"); an approve or reject of a bar ask is refused once decided; an undo is
refused once undone. Receive, Issue, Waste, Return, Breakage and Move are not protected. No keeper
is used: it would send a key nobody reads. **Asked of the PMS:** read the key on
`POST /stores/movements` and `/stores/transfers`, as `finance/postings.ts` does. **The rule:** a key
the server ignores protects nothing; say which writes are exposed.

### MST-3 · A receipt, an issue or a count could be recorded twice after a lost reply (4 Nov) — narrowed at the merge

With MST-2 standing (no key read), a second tap after a lost reply records the stock twice. At the
merge the mobile chat made every stores write dialog (Act's two, Count, History's Undo, the three
sheet writes) stop on an unknown outcome (`outcomeUnknown`): "Not known whether it was recorded:
close this and look at the stock again", no more taps until closed (`kit.tsx unknownSaid`, MEMORY 16).

## Fixed

None yet.

## Seen in the web twin, not the phone's (for the PMS, through the mobile chat)

- The web's `money()` prints whole rupees, so an average of ₹167.40 a bottle reads ₹167 on the Store;
  the phone shows the server's figure to the paisa (`shelf.ts` `rupees`, MEMORY 9).
- The bar's Difference for a count a thousandth of a bottle off reads "+0" in red (`BarStock.tsx`
  `differenceText`: 0.001 is a difference, but 0.001 of a bottle rounds to no ml). Ported as the web
  draws it (`sheets.ts`); pinned in no check.
- `heldText` on the Store floors a negative drink (-0.5 of a 750 ml bottle reads "-1 + 375 ml");
  the bar sheet's `held` keeps the sign. Ported as each page draws it.
