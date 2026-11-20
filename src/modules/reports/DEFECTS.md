# reports — defects (MRP-)

Every defect found in this module, numbered **MRP-1, MRP-2 …** (AGENTS.md). Each entry: what
happened, how it was found, what was done about it, and the rule it leaves. Fixed entries stay.

---

### MRP-1 · Every role but the owner's opens All properties, not its Dashboard (4 Nov) — fixed at the merge

**What happened:** on the website the GM, the hotel manager, reception, the accountant and the
revenue manager start on their property's Dashboard (`/`, pictures `roles/r-gm-home`,
`r-hotel-manager-home`, `r-reception-home`, `r-accountant-home`, `r-revenue-home`); only the owner (a
group administrator) starts on All properties (`r-owner-home`). The phone's `app/index.tsx` sends all
of them to `/all`. **How it was found:** the align helper, matching the role pictures against the
routes. **What was done:** nothing in the frozen core; the exact change is asked of the mobile chat
(the align helper's report, 4 Nov): the owner to `/all`, anybody else to the shell's
`landing(role, code)` (mobile/shell `src/core/menu.ts`: their working home, else the Dashboard).
**Fixed** by the mobile chat at the merge (4 Nov): `app/index.tsx` sends the group's owner to `/all`
and anybody else to `landing(role, code)` (`src/core/menu.ts`, pinned by `menu.check.ts`).
**The rule:** a role's first screen is its picture's (`roles/r-<role>-home`), not one screen for all.

---

## Lane m13-rep-stock (19 Nov) — letter K (MRP-K1 …)

No defect found in this lane's screens while building them (19 Nov). Three rules were broken once on
purpose and the check caught each (`stockReports.check.ts`): a missing figure drawn as 0, a total's
empty words drawn as "-", and the statement asked for days the wrong way round.

## Lane m13-rep-money (MRP-A)

### MRP-A1 · The web's accounting export writes ₹0.00 for a figure it does not have (20 Nov) — the phone differs

**What happened:** `src/modules/accounting/pages/Accounting.tsx` writes `cash(d.companyReceipt ?? 0)`
and `book.total.companyReceipt ?? 0`: an answer without the field (kept from before D27-242, its own
comment says) shows "Received from companies ₹0.00", a zero for a figure not held. **How it was found:**
porting the day book's columns. **What was done:** the phone writes a dash (`bookFigure`, checked);
the web's fault is in the lane's report for `docs/api-requests.md`. **The rule:** `?? 0` on a money
figure is a zero invented; a missing figure is a dash.

### MRP-A2 · Three web reports add their totals up in the browser, in whole rupees (20 Nov) — the phone draws none

**What happened:** the Guest ledger, the Cashier shift and the GST sales register (Compliance.tsx) sum
the server's rows in the browser (`rows.reduce`) and write every amount with `money` (whole rupees):
the GST register's CGST/SGST total is the browser's, not the server's, and ₹38,782.28 prints ₹38,782.
**How it was found:** reading the pages against the API (`reports.ts` sends rows, no total). **What was
done:** the phone shows each row as sent, paise kept, and no total, saying so on the screen and in the
export (`NO_TOTAL`); asked of the PMS: the server to send the totals rows. **The rule:** a statutory
total is the server's or it is not drawn.
