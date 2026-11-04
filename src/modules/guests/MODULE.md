# guests — look up a guest or a company (Tier 2, slice 18)

**Web twin:** `src/modules/guests/` in the PMS (`MODULE.md`, `DEFECTS.md`, `pages/Guests.tsx` —
`GuestsPage` and `CompaniesPage` —, `data/directory.ts`, `logic/contactKeys.ts`, `nav.ts`) and
`src/modules/crm/` (`MODULE.md`, `pages/Guest360.tsx`, `data/crm.ts`, `access.ts`, `nav.ts`), the
contracts module's `listCompanyRecords` and `CompanyDialog` (Add company / Edit on Companies and
agents); the API in `api/src/modules/guests/directory.ts` and `people.ts`, its gates in
`api/src/roleGate.ts`, who holds `customer` and `company` in `api/src/permissions.ts`, the offline
tiers in `src/lib/offline.ts`. **Decided:** M-1, M-9, M-11. The web's decisions: D21-2 (never
automatic), D21-4 (Guest 360 for the owner, an administrator, the GM), D21-13 (the desk sees a name
and a count), D21-21 (the blacklist warns, never refuses), D21-22 / D25-39 (no offers, opt-in),
D27-184 (Add company), D27-382 (Edit company). Not this slice: `BookingSources.tsx`, `FormC.tsx`.

## The web twin's map (4 Nov)

| Web page | Address | API it calls | Gate (roleGate.ts) | Offline (src/lib/offline.ts) |
|---|---|---|---|---|
| Guests | `/guests` (the property in view) | `GET /guests?asOn=<business date>` | GUESTS: `customer` view | a read |
| Companies and agents | `/companies` (the property in view) | `GET /companies`; `GET /company-records` (contracts) | `company` view | a read |
| Add company / Edit (dialog) | on Companies and agents | `POST /companies`, `PATCH /companies/:id` | `company` create / edit | **refused** (UNLISTED) — on the website |
| Guest 360's search | `/crm/guests` | `GET /crm/guests?q=` | GUESTS, then people.ts `isManager` | a read |
| Guest 360 | `/crm/guests/:id` | `GET /crm/guests/:id`, `GET /crm/offers-yes`, `GET /loyalty/guests/:id` (MemberCard) | GUESTS, then `isManager` | a read |
| Blacklist / clear | on Guest 360 | `POST`, `DELETE /crm/guests/:id/blacklist` | `own`: `isManager` | **refused** (UNLISTED) |
| Their yes / no offers / clear a no | on Guest 360 | `POST /crm/offers-yes`, `POST /crm/no-offers`, `DELETE /crm/no-offers/:id` | `own`: `isManager` | **refused** (UNLISTED) |
| Edit guest (dialog) | on Guest 360 | `GET /guests/:id/record`, `PATCH /guests/:id` | GUEST: `customer` edit | **refused** — on the website |
| Possible same person | `/crm/same-person` | `GET /crm/same-person`, joins, not-same | GUESTS, then `isManager` | refused — **on the website** (merging two guests) |

`customer` view = `company` view: the owner, an administrator, the GM, the hotel manager, reception,
the accountant and a viewer. `company` create: the owner, an administrator, the GM, reception (C-7);
`company` edit: the first three. Guest 360 and every `/crm` route: the owner, an administrator and the
GM only (`app.is_crm_manager()`); the gate lets the other readers through and people.ts answers 403
"This is for the owner, an administrator or a general manager." The web's only held guest write is the
VIP mark (`/guests/:id/vip`, front desk's on the stay); no `/crm` path is on the list, so each of this
module's writes is refused offline with the UNLISTED sentence (`lookup.check.ts` holds it).

## Screens

| Screen | Route → file | Picture | Reads (key `["guests", code, …]`) |
|---|---|---|---|
| Guests | `app/guests/[code]/index.tsx` → `Guests.tsx` | `all/15-guests-crm-guests` (dev-gm) | `GET /guests?asOn=` |
| Companies and agents | `app/guests/[code]/companies.tsx` → `Companies.tsx` | `all/16-guests-crm-companies-and-agents` (dev-gm) | `GET /companies`, `GET /company-records` (id and name kept) |
| Guest 360's search | `app/guests/[code]/find/index.tsx` → `Find.tsx` | `all/19-guests-crm-guest-360` (dev-gm) | `GET /crm/guests?q=` from two letters |
| Guest 360 | `app/guests/[code]/find/[id].tsx` → `Guest.tsx` | not pictured | `GET /crm/guests/:id`, `GET /crm/offers-yes` |

Rules: `lookup.ts` (`lookup.check.ts`), rights: `roles.ts` (`roles.check.ts`), calls: `data.ts`, the
pieces the imported kits lack: `kit.tsx`. Imported, never edited: guest-services' kit (Btn, Input,
Field, Empty, Box, Toast, …), laundry's `rupees`, `dayOf`, `LoadFailed`, `capsLabel`, the reports
kit's `IconChip`, front desk's `Pill`, `PageHead` and `stayedWords`. Every accepted write re-reads
`["guests", code]`. No poll: the web's pages do not poll.

## Guest data (India's DPDP Act)

- **No more than the web shows, to no more people.** Guests and Companies and agents to the API's
  readers; Guest 360 to the three, its sentence to anyone else, nothing read for them.
- **An ID document never reaches the phone**: Guest 360 sends only `hasId`, shown as "an ID is on file"
  or "no ID on file". No photo is sent or shown anywhere in this module.
- **A company's record** (`/company-records`) carries its GSTIN, contact and credit terms: the phone
  keeps only its id and name (`readCompanyNames`), to know which rows have a record and to list the
  companies with no booking. Credit limits and balances are never worked out on the phone: Owed is the
  server's `openBalance`.
- **Nothing is kept beyond the screen's read**: every read is a react-query entry, emptied at sign-in
  and sign-out (`session.tsx`); no storage, no outbox entry (no write is held).
- **The yes list** (`GET /crm/offers-yes`) is the web's way of answering one guest's "agreed to
  offers": it sends every phone and email key that said yes, group-wide. The phone asks it only about
  this guest and shows nothing else of it; a narrower answer is a PMS request (below).

## Writes, who, offline

| Write | Endpoint | Shown when (the web) | Who (the API) | Offline |
|---|---|---|---|---|
| Blacklist | `POST /crm/guests/:id/blacklist {reason}` | not blacklisted; on once a reason is typed | the three | refused, the web's sentence |
| Clear the blacklist | `DELETE /crm/guests/:id/blacklist` | blacklisted | the three | refused |
| Record their yes | `POST /crm/offers-yes {phone, email}` | a phone or email on file and not agreed | the three | refused |
| Record "no offers" | `POST /crm/no-offers {phone, email}` | a phone or email on file | the three | refused |
| Clear (a no) | `DELETE /crm/no-offers/:id` | each "no" on file | the three | refused |

**One tap, one write** (MEMORY 8): latched at the tap (`useRef`), every button grey while it travels.
None moves money: no keeper. A refusal is the server's words in the toast ("Not changed").
Blacklisted / Blacklist cleared say so (the web's toasts); the offers say nothing on success, as the
web, and the card reads again.

## Money

- **A figure is the server's, shown as sent**: total spend, balance, revenue, owed, charged — laundry's
  `rupees` (whole rupees as the web's `money()`, paise where sent: ₹7,582.50, never ₹7,583, MEMORY 9).
- **A balance's side is its colour** (the web's `money(Math.abs(…))`): owed red, in credit blue, its
  spoken label says which ("₹1,050 in credit"); nothing is a grey dash.
- **The only sums are the web's own** on Companies and agents — the three tiles and each group's
  "₹… · N bookings" — which the API does not send. Ported as the web adds them, in whole paise so a
  float never moves a rupee; "Owed to the property" counts only the sources that owe (a source in
  credit is not taken off another's balance), as the web; drawn only when there is revenue.
- **A dash, never a zero**: revenue before any booking; commission (charged outside the system); a
  missing phone, email, nationality, room type, source or date. A real zero the server sends (a guest
  who spent nothing yet) is ₹0, as the web.

## On the website for now (grey, with the reason)

- **Add company** and **Edit** (Companies and agents): the contracts module's company form — name,
  kind, GSTIN, billing address, contact, credit allowed, credit days and limit, with its own checks.
  Drawn where the web draws them (Edit only for the owner, an administrator, the GM, on rows with a
  record), grey; under Add company the API's sentence for a role it refuses, else "Adding or changing a
  company: On the website for now".
- **Edit guest** (Guest 360): `EditGuestFlow`, a form of its own (title, name, phone, email,
  nationality, address); front desk greys it the same way on the stay.
- **Loyalty** (Guest 360's MemberCard, the loyalty module's: points, statement, Adjust, Leave): a card
  saying so.
- **Undo a join** and the **Possible same person** list (`/crm/same-person`, picture 20): merging two
  guests and taking a join apart stay on the website (the brief). No phone route, no menu link.

## Where the phone differs from the web (for the owner's look)

1. **The guest page has a Back capsule** beside its title (the web's breadcrumb "Guest 360 › name").
2. **Guest 360's page sits under its search** (`/guests/<code>/find/<id>`), so the frame marks
   Guest 360 there.
3. **Touch targets are 44 px**: the search boxes and buttons (the pictures were taken with a mouse:
   36 px boxes, 32 px buttons).
4. **Loading is said in words** ("Reading the guests…"), not a skeleton; a failed read says what did
   not load, and offline says so in the web's yellow.
5. **Figures keep their paise** where the server sends them; the web's `money()` would round.
6. **The Guests list draws as it scrolls** (a FlatList); every guest the server sent is there.
7. **Find a guest by a booking's reference** is not here: neither web page does it (Guests finds by
   name; Guest 360 by name, phone or email). All bookings finds a booking by its reference.

## Picture match (4 Nov)

Compared by reading the code against the pictures (`reference/pms-shots/all/`, 390 px wide, taken at
2x), measured on the file; **never seen running**. On every screen the web's top bar and the
business-date banner are the shell's (mobile/shell), not this module's. The Guests and Companies pages
last changed in the PMS's import of 2 Nov (`a4527ea`), after the pictures of 31 Oct; the code read is
today's and the pictures show the same words.

| Screen | Picture | Result |
|---|---|---|
| Guests | `all/15-guests-crm-guests` | **Matches**, with these differences left: (a) the search box is 44 px tall (the picture's 35): touch targets; (b) the picture's figures are all whole rupees, the phone keeps paise when sent; (c) body text is Inter 500, the web's 400 (the core loads 500, 600, 700). The title with its neutral "456 guests" pill, the description, the 256 px search, the yellow overlap note (its triangle, title and words), each card's avatar (24 px, grey-500, white initials), name and "overlapping stays" mark, the six lines in the web's order with the 104 px capitals column, "first visit" and the blue "back …", the grey dash for no balance, the hairlines between guests are the web's code (DataTable's phone card). |
| Companies and agents | `all/16-guests-crm-companies-and-agents` | **Matches**, with these differences left: (a) **Add company is grey** (the picture's orange) with its reason under it; (b) **Edit is grey**, 44 px (the picture's 31); (c) paise kept when sent. The title, description, the three tiles (their chips' tones, labels, figures and notes), each group's title, count pill (orange, blue, grey), blurb and right-aligned line, each source's six lines, red Owed, the dashes and the closing note are the web's code. |
| Guest 360's search | `all/19-guests-crm-guest-360` | **Matches**, with one difference left: the search box is 44 px (the picture's 35). Title, description, the glass inside the box, its words, the two-letter hint. The results, "Nobody found" and the refused states are not pictured: built from `Guest360SearchPage`. |
| Guest 360 | none | **Not pictured**: built from `Guest360Page`, `BlacklistCard`, `NoOffersCard`; differences 1, 2 and the website list above. |
| Possible same person | `all/20-guests-crm-possible-same-person` | **On the website** (not built). |

**3 of 3 pictured screens match their pictures** (with the differences listed); one screen is not
pictured; one stays on the website.

## The PMS requests (for `docs/api-requests.md`)

- `GET /crm/offers-yes` answers one guest's "agreed to offers" by sending every phone and email key
  that said yes across the group (DPDP: more than the screen needs). A boolean on `GET /crm/guests/:id`
  would do.
- `GET /companies` sends no totals: the web and the phone add the split and each group's line on the
  device. Server totals would make them the server's.
- `GET /guests` sends every name at once (456 in the picture), with no search or paging: the phone
  filters on the device.
- A Guests row's `id` is the name's key, not a guest record, so the list cannot open Guest 360 for a
  manager.
