# approvals — what a manager decides away from the desk (Tier 2, slice 9)

## The web twin (mapped first, 4 Nov, from `/home/user/hotelsfidato-ai/pms`)

| Part | Where | Who (the API) | Offline (`src/lib/offline.ts`) |
|---|---|---|---|
| Page | `src/pages/Approvals.tsx`, at `/h/:code/approvals`; menu "Approvals" (`src/components/app/navigation.ts` ~372, `canSee: decidesSomething` = owner, admin, GM, hotel manager, Inventory Manager) | — | — |
| Data | `src/data/repositories/approvals.ts` (`Approval`, `KINDS`, `listApprovals`, `decide`) | — | — |
| Read the queue | `GET /api/hotels/:code/approvals?status=pending\|all` (`api/src/routes/approvals.ts`), every 15 s | `roleGate.ts` READ_RULES: `see(["notification","equipment","purchasing"])` — every role but a waiter and a bar person; each row carries the server's `mayDecide` and `blockedBecause` | a read |
| Approve · Refuse | `POST /api/hotels/:code/approvals/:id/approved\|rejected`, `{ note }` (required to refuse) | `own`: the route decides row by row — the request's approver role or a named backup, the group owner; never the person who asked; a decision is final (`app.decide_approval`) | **not listed → refused** with the UNLISTED sentence |
| (not on the page) Send back for more | the same route with `clarify` | as above | refused |
| (not on the page) Who approves what | `GET/PUT /approval-rules/:kind` | PUT: the owner only | — |

The same queue and the same decide are posted to by equipment (`src/modules/equipment/data/equipment.ts`)
and purchasing (`src/modules/purchasing/data/purchasing.ts`) from their own screens: one engine, no
second Approve button. A waiter's request (kind `pos_request`, D27-363: strike, discount, NC, void) is
DONE by its approval (`performPosRequest`), as the approver, with the till's own checks.

**Credit-limit allowances are not in the queue.** A charge or booking billed to a company over its
credit limit is refused with `needs: "credit-limit"` (`api/src/modules/finance/creditLimit.ts`); the
owner, an administrator or the GM allows it IN PLACE, with a reason, on the same write (the web's
`FolioPanel.tsx` and `BookingPage.tsx`). The allowance is a row of `credit_limit_allowances`, seen only
in the activity log ("Over the credit limit"). There is nothing to list or decide later, so this
module has no part of it: the stay's bill already asks it on the phone (`finance/BillActs.tsx`, MFIN-2),
and a booking's belongs to reservations. The till's "owner allowance" (`pos/ownerAllowance.ts`) is the
owner's meals, not an approval.

## Screens

| Screen | Route → file | Picture | Reads (key `["approvals", code, tab]`) |
|---|---|---|---|
| Approvals | `app/approvals/[code]/index.tsx` → `Approvals.tsx` | `reference/pms-shots/all/64-system-approvals` (as dev-gm, `index.json`) | `GET /approvals?status=pending\|all`, every 15 s on screen |

Rules: `rules.ts` (`rules.check.ts`), who reads: `roles.ts` (`roles.check.ts`), calls: `data.ts`, the
web kit's pieces: `kit.tsx`. Every decision re-reads `["approvals", code]`, landed or not.

## Writes, who, offline

| Write | Endpoint | Enabled when | Who | Offline |
|---|---|---|---|---|
| Approve | `POST /approvals/:id/approved` (`{}` or `{ note }`) | the row's `mayDecide` (the server's); else its `blockedBecause`, or "This one is not yours to decide." | the route | **refused**: "This cannot be done offline yet. It has not been checked as safe to hold and send later, and guessing is how a guest gets charged twice." |
| Refuse | `POST /approvals/:id/rejected` (`{ note }`) | as above; a note first (the web's sentence before sending; the server's too) | the route | **refused**, the same sentence |

One tap is one write (a `useRef` latch, MEMORY 8); a keeper per property's queue (`data.ts`, MFIN-1),
forgotten after each read of the queue. The route does not read the key today; what makes a second
decision impossible is the server's "a decision is final" (it answers "That was already approved…").

## Where the phone differs from the web

1. **The amount keeps its paise.** The web's `money()` prints whole rupees (₹450.50 reads "₹451");
   the phone writes the server's text exactly, Indian grouping, paise only when there are any
   ("450.00" is "₹450", as the picture). MAPR-1.
2. **The kind is not a link.** The web's title opens the request's own screen (purchasing, the store,
   equipment); the phone has none of those yet. When it does, the link goes back (`rules.ts` KINDS).
3. **A row sent back for more** (`clarify`) says "Asked for more by …" under it; the web says
   "Refused by …" there (its pill already says "Asked for more"). MAPR-3, a question for the owner.
4. **A refused read** (a waiter, a bar person) shows the API's sentence instead of the list; the web's
   menu does not offer them the page.
5. **The switch is 44 px a choice** (50 with its track), the picture's 30 (36): touch targets.
6. **The toast** says the server's sentence in one line at the foot of the screen, as the web's.

## Picture match (4 Nov)

Compared by reading the code against the picture (390 px wide, taken at 2x; measured on the file);
never seen running. The web's top bar and the business-date line are the shell's (mobile/shell).

| Screen | Picture | Result |
|---|---|---|
| Approvals | `all/64-system-approvals` (not blank; the `.txt` holds the four cards' words) | **Matches**, with the differences above that show in it: the title and its line; Waiting / Everything full width (44 px a choice, 5); each card — the kind (16, 600, ink) and the pill (Waiting: yellow tint, yellow dot) on one line, the detail (a waiter's request) in ink, the reason in grey-700 with the detail not said twice ("Why: The owner's guests"), the amount, "Asked by …" and "N days ago" on one wrapping line, 16 apart; under a hairline either the server's sentence ("You asked for this one, so you cannot be the person who approves it.") or "A note (required to refuse)", the two-line box with "Why, in a sentence.", and Approve and Refuse as outlined capsules (the web's default button). Not pictured, built from the web's code: the Everything tab, decided rows and their line, Approved / Refused / Asked for more pills, the empty, loading and failed states, the toasts. The card title is not orange: the picture's are not links either (cash expense and a waiter's request have no screen of their own). |

**1 of 1 screens matches its picture** (with differences 1, 5 not visible in it, and 2 not arising).

## Test people (development, `x-dev-staff-id`, hotel 5EL)

`dev-gm` (the picture's), `dev-owner`, `dev-stores` (equipment, stock), `dev-hotel-manager`: decide
what is theirs. `dev-pos`: the queue refused, the API's sentence.
