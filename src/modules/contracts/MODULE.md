# contracts — Contracts and one company (M-13, mobile/m13-sales, 19 Nov)

**Web twin:** `src/modules/contracts/` in the PMS (16 Nov release): `pages/Contracts.tsx`,
`pages/CompanyContracts.tsx`, `components/CompanyDialog.tsx`, `ContractDialog.tsx`,
`AllotmentDialog.tsx`, `data/contracts.ts`, `nav.ts` ("Contracts" at `/contracts`, Distribution,
resource `company`), `MODULE.md`, `DEFECTS.md`; the API `api/src/modules/contracts/contracts.ts` and
`allotments.ts`, validators `api/src/validate.ts`, gated `roleGate.ts` 781-790, 1216-1222.
**Decided:** M-1, M-9, M-11, M-13; the web's D27-178, D27-184 (C-1 to C-13), D27-383 item 8 (allotments).

## The web twin's map

| Web page / act | Address | API | Who (roleGate.ts) | Offline |
|---|---|---|---|---|
| Contracts | `/contracts` (the property in view) | `GET /company-records` | see("company", "companies"): owner, admin, GM, hotel manager, reception, accountant, viewer | a read |
| One company | `/contracts/:companyId` | `GET /companies/:id/contracts` | the same | a read |
| Add company | dialog | `POST /companies` | `company` create: owner, admin, GM, reception (C-7: reception without credit, the route asks) | **refused** (UNLISTED) |
| Edit company | dialog | `PATCH /companies/:id` | `company` edit: owner, admin, GM | **refused** |
| Add / Edit contract | dialog | `POST /contracts`, `PUT /contracts/:id` | `company` edit | **refused** |
| Hold rooms / Change / Stop holding | dialog | `POST /allotments`, `PUT /allotments/:id` (`{ active: false }` stops) | `company` edit | **refused** |
| Book from it | → `/h/:code/book?allotment=` | | `reservation` create | — |
| PDF / Excel | ExportButtons `contracts` | listFiles | `holds: money`: `export` on `report` | — |

No route reads an idempotency key (MCON-1). None moves money: a contract prices the NEXT booking.

## Screens

| Screen | Route → file | Picture | Reads (keys) |
|---|---|---|---|
| Contracts | `app/contracts/[code]/index.tsx` → `Contracts.tsx` | `new/n-contracts` (dev-owner, GO) | `["contracts", code, "list"]` |
| One company | `app/contracts/[code]/[id].tsx` → `Company.tsx` | not pictured | `["contracts", code, "company", id]` |
| The three forms | `Dialogs.tsx` (sheets: `kit.tsx`) | not pictured | — |

`all/74-coming-soon-contracts` is a redirect to the Dashboard (index.json: path `/`): not this screen.
Rules and words: `rules.ts` (`rules.check.ts`); rights `roles.ts`; calls `data.ts`. Imported, never
edited: front desk's validators (`gstinProblem`, `phoneProblem`, `emailProblem`, `dateProblem`),
`moneyPrecise`, `addDays`, `Toggle`, `Pill`, `PageHead`; guest-services' kit; inventory's `whyNot`
(the gate's refusalFor); the guests module's read and add sentences; reputation's `day`; marketing's
`rupees`. Menu: PHONE_ROUTES `"/contracts": "/contracts/:code"`.

## Money: a company's contract prices

- **Typed as typed:** each single and double is `Number` of the typed text; a blank is `null` ("not
  agreed": the booking takes the day's price, C-4); a row with both blank is not sent. **Nothing is
  filled in**: a new contract starts with every price blank (its start date is the business date, as
  the web). `rules.check.ts` holds it (broken once: a blank read as 0 fails it).
- Refused before it is sent, in the server's words: no rate typed, a rate of 0 or not a number, a
  discount outside 0-100, commission outside 0-100 (only an agent carries one).
- On screen a price keeps its paise (`moneyPrecise`, MEMORY 9); credit limits are written whole or
  with paise as sent. The phone works out no price for a stay: that is `GET /contract-price`'s.
- **Dates are each phone's own date picker** (M-16, 20 Nov; were typed "YYYY-MM-DD"); an allotment's
  nights inside its contract (the web's min and max). The rules' sentences still stand behind them.

## Rights, offline and an outcome nobody knows

- The web HIDES Add contract, Edit company, Edit, Hold rooms and Change from those who may not; the
  phone draws them greyed with the API's sentence (AGENTS rule 1). Reception's Add company sheet has
  only name, GSTIN and address, as the web's (credit is the three's).
- Every write goes through `send()`: refused offline with the UNLISTED sentence, nothing held.
- One tap, one write (a latch); a sheet cannot be closed (X, back, swipe, Cancel) while a write is on
  its way, so its answer always reaches the page. On an outcome nobody knows (`outcomeUnknown`) the
  sheet says "Not known whether …" and hands the moment to the PAGE, which greys Add contract, Edit
  company, Edit, Hold rooms and Change (and the list greys Add company) with that line until a read of
  the company (the list) made after the moment has landed without an error (`rules.ts stillUnknown`,
  "Read the company again"). Closing the sheet and opening a fresh one cannot hold the rooms twice
  (MCON-1, the independent review of 20 Nov). Every close reads the company and Companies and agents
  again (MEMORY 16).
- A repeated **Stop holding** answering 404 "No such allotment here" is read as already stopped
  (`alreadyStopped`), not as a failure.
- **Stop holding** asks first with the phone's own dialog, in the web's words ("What it still holds
  goes back on sale now. Bookings made from it stand." — "Yes, stop holding", destructive).

## Picture match (19 Nov)

Compared by reading code against the picture; **never seen running**.

| Screen | Picture | Result |
|---|---|---|
| Contracts | `new/n-contracts.png` / `.txt` (dev-owner) | **MATCHES**: the title and its line, the orange Add company with its plus, one card per company with its name, GSTIN, CITY, CREDIT ("Allowed · 30 days · -", "No"), CONTRACT HERE, and the arrow. Left: (1) the frame is the core's; (2) the PDF / Share export buttons sit above Add company (today's web, newer than the picture). |

**1 of 1 pictured screens matches.** **Not pictured**, built from the web's code: one company, its
contracts and allotments, the three forms, an empty list, a role that may not add, a failed read.

## Every act of the web, and where it is

Built: the list, one company, Add company, Edit company, Add contract, Edit contract, Hold rooms,
Change, Stop holding, the export. **Left out:** Book from it — greyed, "Booking from an allotment: On
the website for now": the phone's New booking (`src/modules/reservations/`, another lane's) does not
read `?allotment=` yet.

## m16 pickers (20 Nov)

Lane m16-pick-front (M-16; PICKERS 3.15). Valid from / to (`Dialogs.tsx:173-174`) and an allotment's First and Last night (`:271, 273`, inside the contract: the web's min and max) are `DateField`, opening on the hotel's today (`data.today`). The rules and their sentences are unchanged. Nothing opened on a screen.
