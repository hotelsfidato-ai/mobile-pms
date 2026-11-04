# revenue management — the Revenue outlook and rivals' prices (Tier 2, slice 22)

**Web twin:** `src/modules/revenue-management` in the PMS (`pages/Outlook.tsx`, `data/outlook.ts`,
`logic/outlook.ts`, `logic/pickup.ts`, `nav.ts`, `routes.tsx`, its `MODULE.md`, `DEFECTS.md`) and
`src/modules/market-rates` (`data.ts` `getNearby`, `nearbySummary`; `pages/RivalsPrices.tsx`, the
switch, a Settings page); the API in `api/src/modules/revenue-management/pickup.ts`,
`api/src/modules/reports/statistics.ts`, `api/src/modules/market-rates/routes.ts`; the gates in
`api/src/roleGate.ts`. Read at the PMS's `a4527ea` (2 Nov 2026); the page last changed on 12 Oct
(its CHANGELOG), before the picture of 31 Oct. **Decided:** M-1, M-9, M-11; the web's D18-15 (it
shows and suggests, it never changes a price) and D27-270 (rivals' prices beside each suggestion).

## The web twin's map (read first, 4 Nov)

| Web | Calls | Gate (roleGate.ts) | Offline (offline.ts) |
|---|---|---|---|
| `/h/:code/revenue-outlook`, `Outlook.tsx` (menu: Rooms and rates, after Rates; `canSee: setsRates` = `rate` edit: owner, admin, GM, revenue manager; the route guard asks the menu) | `GET /api/hotels/:code/statistics/snapshot` (the business date), `GET …/statistics/daily?from&to` (90 nights), `GET …/statistics/period?from&to` twice (this month, the same month last year) | `see(["report","rate"], "occupancy and ADR")` (974-976) | reads |
| the same page, pickup and the week-ago figure | `GET …/revenue/pickup?from&to` (from the first of the property's month) | `PRICES` = `see("rate","prices")` (977) | a read |
| the same page, "Nearby" under each suggestion | `GET …/market-rates?from&to` | `PRICES` (980) | a read |
| Settings → Modules and connections → Rivals' prices (`RivalsPrices.tsx`) | `GET/PUT …/market-rates/switch` | `see("room_config")` / `grant("room_config","edit","Switching rivals' prices")` | **desk set-up: on the website** |

**Nothing in this module writes** (D18-15; the web's `neverWritesARate.test.ts`): no `send()`, no
keeper, no outbox. Offline the screen shows what was last read (react-query) with "No connection.
Showing what was last read; pull down to read again.", or, with nothing read yet, "No connection".

## Screens

| Screen | Route → file | Web twin and picture | Reads (key `["revenue", code, …]`) |
|---|---|---|---|
| Revenue outlook | `app/revenue/[code]/index.tsx` → `Outlook.tsx` | `/h/:code/revenue-outlook`, `pms-shots/all/30-rooms-and-rates-revenue-outlook` (as dev-gm, 31 Oct) | `outlook` (snapshot, then daily), `pace` / `pickup` / `nearby` with the business date in the key; pull to refresh; no polling (the web has none) |

The menu's link: `src/core/menu.ts` PHONE_ROUTES `"/h/:code/revenue-outlook": "/revenue/:code"`,
pinned in `menu.check.ts`. No Dashboard or landing link: the web has none (the revenue manager lands
on the Dashboard, `roles/r-revenue-home`, as before).

Rules: `outlook.ts` (`outlook.check.ts`); rights: `roles.ts` (`roles.check.ts`, the API's sentences);
calls: `data.ts`; the web kit's pieces: `kit.tsx`.

## What it shows, and where each figure comes from

1. **This month, on the books** — Occupancy (`percent`, one decimal), Rooms sold, Room nights (the
   server's period); **Against last year** in points, a dash and "The property was not selling then."
   where last year's month had no rooms to sell (D17-93); **A week ago** = this month's rooms sold less
   the server's own `last7` for this month's nights (the web's sum), a dash and "The records do not
   reach back a week." where the seven-day window opens before the booking records do; else "N rooms
   booked since, still on the books." "No figures for this property yet." when the property is not
   this person's (404).
2. **What to consider** — the first five nights the web's thresholds call Soft (14 days or nearer,
   50% sold or less, by the SERVER's occupancy) or Filling well (85% or more): "Consider a lower rate
   for …" / "Consider holding or raising the rate for …", the reason ("2 days out, 23.53% sold, 13 of
   17 rooms left." — the occupancy as the server sent it), then **Nearby**: "Nearby: lowest ₹x, middle
   ₹y (n hotels, checked d MMM yyyy)", tapped open to each hotel and its price ("on Agoda" when Google
   named the site); "Nearby: -" for a night nobody checked; "Nearby: could not be read." when the
   read failed. Under it: "A suggestion never names a price, and nothing here sets one. Rates is where
   a rate is changed." (no link: the web names Rates without one).
3. **Dates worth a look** — the soft nights, softest then nearest (every night when none is soft), one
   card each: Days out (Tonight), Rooms left (never below nil, the web's rule), Of, Sold, New 1 day,
   New 7 days, New 30 days (a dash where that window opens before the property's booking records), the
   pill Soft / Filling well / On track. The line above says what the three windows mean, counted back
   from the property's own day, and — once pickup is read — why any is a dash, in one sentence.

**States:** loading (grey blocks, "Reading the coming nights"), failed with nothing read (the web's
ErrorState: "Could not read the outlook", the server's words, Try again), empty ("No nights ahead
yet"), offline ("No connection" / the last read kept). A role the menu does not give the page: the
web's RequireAccess sentence ("You are signed in as Hotel Manager, which does not include Revenue
outlook. …"), nothing read.

## What the web has that the phone leaves out

- **The Rivals' prices switch** (Settings → Modules and connections, `PUT …/market-rates/switch`):
  desk set-up, on the website (the brief). It is in the Settings menu, greyed "On the website for now"
  by the frame, as every Settings page without a phone route.
- **Rates** (where a price is changed) is its own screen (`src/modules/inventory`, `/inventory/:code`);
  this page does not link to it, as the web does not.

## Picture match (4 Nov)

Compared by reading code against `all/30-rooms-and-rates-revenue-outlook.png` (780 × 9436, the GM at
5EL on a business date of 11 Oct) and its `.txt`, section by section; **never seen running** (no
preview here). `all/29-rooms-and-rates-rate-performance` is the Rates screen (`/h/5EL/rates`), not part
of this page; `roles/r-revenue-home` is the Dashboard, unchanged; `roles/r-revenue-menu` shows "Rooms and
rates: Rates, Revenue outlook", which the frame's menu already gives the revenue manager.

| Section | Result |
|---|---|
| Top bar, business-date banner | the frame's (core), not this module's |
| Title and description | MATCHES (words; the core `Head` writes the line at 500, the web at 400 — every screen alike) |
| This month, on the books | MATCHES: chip and heading, Occupancy / Rooms sold, Room nights / Against last year with its note, A week ago across the card with its note; the dash in grey |
| What to consider | MATCHES: five items, sentence, reason, Nearby line, dividers, the closing note |
| Dates worth a look | MATCHES: heading, the long note (both dates named), one card per date with the seven capital labels in a 6.5rem column, the values, the Soft pill under them |

**1 of 1 screens matches its picture**, with these differences left, each by rule:
- **The rivals' middle price keeps its paise** (MEMORY 9): the web rounds the middle of an even count
  to the rupee (₹3,499 and ₹3,500 → web ₹3,500, phone ₹3,499.50). The picture shows "Nearby: -" on every
  night, so it cannot show either. MREV-2.
- **A failed read of this month's figures says so** ("Could not read this month's figures: …", Try
  again); the web shows "No figures for this property yet." for a failure too. MREV-1.
- **Not pictured** (built from the web's code): the opened Nearby list, Filling well and On track pills
  in the table (only when no night is soft), the empty, loading, failed and offline states, the
  refusal page.

## Gates

`node --experimental-strip-types src/modules/revenue-management/outlook.check.ts`, `roles.check.ts`,
and `bash scripts/gates.sh`. Broken on purpose and seen to fail, then restored (4 Nov): the dash on a
pickup window before the records (`pickupOn`), the middle price rounded, Soft decided on sold ÷
available instead of the server's occupancy (passed at first — the data had both soft; MEMORY 11 —
and fails since the check's 16 Oct carries 60% on 1 of 17), "A week ago" as a figure when the records
do not reach back, the page opened to every role that reads prices, and the menu's line removed
(`menu.check.ts`).
