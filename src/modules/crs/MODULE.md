# crs — the bookings the Fidato CRS sold for this hotel, and what became of each (Tier 2, slice 20)

**Web twin:** `src/modules/crs/` in the PMS (`MODULE.md`, `DEFECTS.md`, `pages/CrsBookings.tsx`,
`data/crs.ts`, `components/CrsFacts.tsx`, `nav.ts`: "CRS bookings" under Bookings at
`/h/:code/crs-bookings`, resource `reservation`, in reception's working menu); the API in
`api/src/modules/crs/routes.ts` (the list, Done) and `setup.ts` (the connection card); the gates in
`api/src/roleGate.ts`; the tables in `db/migrations/160_crs_bridge.sql`. **Decided:** M-1, M-9,
M-11. The web's decisions: D27-168, D27-171, D27-174 (CRS-1, "partly"), D27-284 (CRS-2).

## The web twin's map (4 Nov)

| Web page / act | Address | API it calls | Who (roleGate.ts) | Offline (src/lib/offline.ts) |
|---|---|---|---|---|
| CRS bookings (the list, the connection line) | `/h/:code/crs-bookings` | `GET /crs/bookings` | STAYS: `reservation` view — everyone but a chef and the Inventory Manager | a read |
| Done on a change made in the CRS | a row's "Changed in the CRS" | `POST /crs/bookings/:crsId/done` (no body; 409 "That note is not here, or is already done.") | CHANGE_BOOKING: `reservation` edit — owner, admin, GM, hotel manager, reception | **refused** (not listed: UNLISTED) |
| Connection to the CRS (card on the page) | drawn for the owner and an administrator only | `GET` / `PUT /crs/setup` (400 setupProblem's sentence, 409 already connected / not on the list) | own: setup.ts SETUP_ROLES owner, admin (a group administrator is the owner); 403 SETUP_REFUSED | **refused** |
| A booking's CRS facts (front door, `CrsFacts`) | on the front desk's stay panel | `GET /crs/bookings?reservation=<id>` | STAYS | a read |

**The web has no accept, decline or "open the stay" here.** The PMS only reads the CRS: a booking it
sold becomes a **waiting** (tentative) booking with the room held, confirmed where every booking
is; the answer to the CRS's register goes by itself once every room has one. The page draws each
booking it became as "reference · state" words, not a link. **No money:** the answer carries no
rate and no deposit; nothing on this page is a figure.

## Screens

| Screen | Route → file | Picture | Reads (key `["crs", code, …]`) |
|---|---|---|---|
| CRS bookings | `app/crs/[code]/index.tsx` → `Bookings.tsx` | `pms-shots/new/n-h-crs-bookings` (dev-gm) | `GET /crs/bookings` |
| Connection to the CRS (card, owner / admin) | on the page → `Setup.tsx` | not pictured (the picture is the GM's) | `GET /crs/setup` (`["crs", code, "setup"]`) |

Rules: `bookings.ts` (`bookings.check.ts`); rights: `roles.ts` (`roles.check.ts`); calls: `data.ts`.
The pieces are imported, never edited: the front desk's kit (`Pill`, `Field`, `Box`, `Pick`,
`Toggle`) and its `whyNotChange` (Done's sentence), the guest-services kit (`Box`, `Btn`, `Refused`,
`Failed`, `Stale`, `Loading`, `NotYours`, `Toast`), the laundry kit's `Fact` (the DataTable's phone
card line). Done and Save re-read `["crs", code]` either way. No poll: the web's page does not poll.

**The four states:** loading "Reading the CRS bookings…"; failed "CRS bookings did not load" with
the server's sentence and Try again; offline "No connection" (nothing read yet) or the last read
with "No connection. Showing what was last read" over it; empty, the web's "No CRS booking has
arrived yet" with its Network icon. A role the API refuses the read: its sentence, nothing read.

**Writes:** Done (latched at the tap; every Done greys while one is on its way, as the web's
`isPending`); a role without `reservation` edit sees Done grey with the API's sentence under it.
Save the connection (latched). Both refused offline with the web's sentence, held nowhere. A
failure says the server's words, else the web's ("Not marked done." / "Not saved."); **nothing came
back or a 5xx** (`outcomeUnknown`): "Not known whether it was marked done." / "Not known whether
the connection was saved." and the list is read again. Neither moves money and neither route reads
an idempotency key, so no keeper: a repeated Done is the server's 409 and changes nothing; a
repeated Save is the same whole replace (the form stays as typed, as the web's).

**The front door:** `bookings.ts` `factsOf` and `data.ts` `crsFactsOf` are the web's `CrsFacts`,
for the front desk's stay panel to place (the web draws it there since 4 Oct). Not placed: the
stay panel is the front desk's module.

## Left out, with the reason

- **Accept / decline / open the stay from a CRS booking:** the web has none on this page (above).
  Question for the owner in the report: a tap on "AKK-1042 · Waiting for the hotel" opening the
  front desk's stay panel (`/front-desk/[code]/stay/[id]`, the id is the reservation's).
- **Nothing else:** every act the web's page has is on the phone.

## Picture match (4 Nov)

Compared by reading the code against the picture, never seen running.

- **CRS bookings** — `new/n-h-crs-bookings.png` / `.txt` (dev-gm, `index.json`: path
  `/h/5EL/crs-bookings`, 844 tall, not blank). The title, its line, the yellow card "The CRS login
  is not in the server's settings yet, so nothing is read." (yellow-50 on a yellow-100 ring, ink
  text), and the empty card (white, grey-200 ring, the Network icon in a 44 grey-100 circle, "No
  CRS booking has arrived yet" and its sentence, centred) in that order: **MATCHES**. The top bar,
  the business-date banner and the account are the frame's (core). Differences left:
  - the empty card's description wraps at the card's width; the web caps it at `max-w-sm` (384 px),
    wider than a phone's card, so the same at 375.
  - **not pictured** (built from the web's code): a populated row, the last-read line, Done, the
    refused Done, the failed and offline states. The row's label column is the laundry kit's fixed
    104 px; the web's grows to its widest label (`minmax(6.5rem, auto)`), so "Changed in the CRS"
    may take two lines on the phone where the web's takes one.
- **Connection to the CRS** — not pictured (the picture's GM is not shown the card). Built from
  `CrsBookings.tsx` 77-196 in its order; on a phone the web's two-column grids are one column, as
  the web's own below `sm`. The web's select is the phone's sheet (`Pick`), its Switch the phone's.
- `all/75-coming-soon-fidato-crs` is **not this screen**: `index.json` shows `/coming-soon/crs`
  landed on `/` (the Dashboard; the Coming soon page is gone, `routes.tsx`). Nothing to match.

**1 of 1 pictured screens matches its picture** (its pictured state); the connection card and the
populated rows are not pictured.
