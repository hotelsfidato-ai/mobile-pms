# Requests to the PMS (API and database)

The app has no server of its own (CLAUDE.md). When a screen needs something the PMS's API or
database does not offer, or a PMS defect blocks it, write it here; **the owner takes it to the PMS's
main chat**. Never change `api/`, `db/` or `src/` from this folder.

| # | Asked (date, module) | What the app needs, and why | Status |
|---|---|---|---|
| R-1 | 15 Oct, housekeeping | **A second repair from one tap.** The web sends `idempotency-key` only when draining the outbox, not on the first, online attempt (`src/lib/api.ts` 190-199). A `POST /work-orders` whose reply is lost is held with a new key and sent again, so the server cannot tell it from a new one. Fix for the PMS: send the key from the first attempt. *Found by reading, not reproduced.* | open |
| R-2 | 15 Oct, housekeeping | **A held assignment is shown as a failure.** `assignHousekeeper` catches the held error (`data/housekeeping.ts` 150-153, 165-168), so the board says "Not assigned" for a change that is in fact queued. *By reading.* | open |
| R-3 | 15 Oct, housekeeping | **Start and Close on Work orders give no word offline**, and the Close dialog stays busy (`WorkOrders.tsx` 75-80, 292-304). *By reading.* | open |
| R-4 | 15 Oct, housekeeping | **Repair is open to roles the API refuses** (front desk, revenue, kitchen, chef, POS, finance get a 403 after typing it: `Housekeeping.tsx` 601-617 vs `repairRoles.ts` REPAIR_UPDATERS). The PMS's rule is disabled with its reason. *By reading.* | open |
| R-5 | 15 Oct, housekeeping | Smaller, by reading: the housekeepers' list swallows every error and hides the assignee pickers silently (`data/housekeeping.ts` 122-129, the HK-4 kind); "It returns as dirty." is said even when the hotel keeps the old status (`OutOfOrderFlow.tsx` 89 vs `roomStatus.ts` 268-274); an `out_of_order` room draws no card on the board (`Housekeeping.tsx` 41-47); the board's "N changes waiting" leaves out held assignments and repairs; chef and stores reach the board by address but its stays read is refused. | open |
