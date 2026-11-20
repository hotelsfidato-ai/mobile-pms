# reports — the owner's figures on a phone (slice 1, aligned to the pictures 31 Oct)

**Web twin:** `src/modules/reports` one folder up — `pages/AllProperties.tsx` (`/all-properties`)
and `pages/Dashboard.tsx` (`/`); today's copy to read is `.claude/worktrees/pms-ref`. Its `MODULE.md`
and `DEFECTS.md` are the source of the rules.
**Held by:** the mobile chat (HANDOVER "who holds what"). **Seen and approved by the owner on the
phone:** 15 Oct 2026, before the 31 Oct alignment (M-11), which has not yet been shown to them.

## Screens

| Screen | File | Web twin | Picture (M-11) | On the phone |
|---|---|---|---|---|
| All properties | `AllProperties.tsx` | `/all-properties` | `pms-shots/new/n-all-properties.png` | the group in one navy card, "Needs you", every real property in one white block; tap opens its Dashboard |
| Dashboard | `Dashboard.tsx`, `Charts.tsx` | `/` | `pms-shots/all/01-home-dashboard.png` | four work tiles, the navy Occupancy with its ring, the three figures with Last 14 days, Occupancy by day, Revenue, Nights ahead, Money, The house now, Quick reports |

`kit.tsx` holds the web kit's small pieces the Dashboard and the housekeeping board share (IconChip,
Ring, AnchorGauge, InfoButton, Term, Swatch, SplitBar, Fade) and the tokens `core/theme.ts` lacks.
Charts are `react-native-svg`, already installed; no package was added.

Sign in (development), who is signed in and the routes are the core's (`src/core/SignIn.tsx`,
`src/core/session.tsx`, `app/`: `/all`, `/hotel/[code]`). The top bar, the menu and the business-date
banner are the shell's (M-11); the "All" and "Sign out" capsules stand in for them until it lands.

**Left on the website for now:** the quick reports, the No-shows report and the lists behind "Needs
you" (each greyed with its arrow; a tap says "On the website for now"), the Calendar behind Nights
ahead. **The work tiles open their lists** (4 Nov): Arrivals `/front-desk/:code`, Due out
`/front-desk/:code/in-house?view=due-out`, In house `/front-desk/:code/in-house` (mobile/front-desk's
routes, resolved once it is merged), Needs cleaning `/housekeeping/:code`.

## Reads (all through `src/core/api.ts`; read only, nothing queued offline)

Each stands alone, as the web's queries do: one that fails says so where its figures would be.

| Endpoint | Screen | A failure shows |
|---|---|---|
| `GET /api/hotels` | sign-in → All properties | the error on Sign in |
| `GET /api/hotels/:code/statistics/period?from&to` (today, month, the month a year back) | All properties | "Could not read every property's figures"; a 404 is a dash |
| `GET /api/hotels/:code/notifications` | All properties ("Needs you") | nothing waiting (as the web) |
| `GET /api/hotels/:code/reports/manager?asOn` | Dashboard: figures, Revenue, Money | "Could not read today's figures"; a 404 is a dash |
| `GET /api/hotels/:code/stays?from&to&board=1`, `/rooms`, `/house-now` | Dashboard: the tiles, The house now | as above |
| `GET /api/hotels/:code/due-out` | Dashboard (Due out) | a 403 (a role without money) is no figure, not an error |
| `GET /api/hotels/:code/reports/monthly-statistics?month` (and the month before, while the last 14 days cross a month start) | Dashboard: Occupancy by day, Last 14 days | "Could not read the month's occupancy" in its card |
| `GET /api/hotels/:code/statistics/daily?from&to` | Dashboard: Nights ahead | "Could not read the nights ahead" in its card |

Offline, a read that fails over figures already on screen says "No connection. Showing the figures
as last read; pull down to read again."

## Rules (ported, source named in each file)

- Every money and occupancy figure on the Dashboard is the **Manager Report's** row for the
  property's business date (`pick`), so the phone, the web and the printed report agree. The charts
  read the Monthly statistics report and the daily statistics, as the web does; the only sums done
  here are Revenue's percentage shares, as the web's.
- Group figures are **added up from totals**, never averaged from each property's rates (`addUp`);
  one property missing = no group figure.
- Today's work counts as the web's Dashboard does (D27-243, `todaysWork`): blocked rooms are not
  dirty or empty; every room with a guest is in house (D21-36); a voided booking is no arrival
  (D27-326). Its counts and The house now come from one list (`houseRooms`), so they cannot disagree.
- The report's 0 for a rate over no rooms is a gap, never a zero (`monthDays`); a day the reads do
  not hold is a gap (`lastDays`); a night the statistics do not hold is a dash (`nightsAhead`).
- Real hotels only, never a test hotel (D27-296 (11)); each property on its own business date;
  a business date behind today goes into "Needs you".
- A figure not held is a dash, never a zero (`src/core/format.ts`).

## Checks

```bash
# this PC, Git Bash, in D:\fidato pms moblie\mobile
node --experimental-strip-types src/modules/reports/figures.check.ts                 # the counting rules
node --experimental-strip-types src/modules/reports/figures.live.ts http://127.0.0.1:8860 dev-owner   # what the screens will show, from a running API
```

## Picture match (4 Nov)

Compared by reading the code against each picture at full size (780 px wide, cut in pieces), section by
section; **never seen running** (no Expo, no API in the cloud session). The top bar, the business-date
banner and the menus are the shell's (mobile/shell), so the "All" and "Sign out" capsules standing in
for them are not counted as differences.

| Screen | Picture(s) | Result |
|---|---|---|
| Dashboard | `all/01-home-dashboard`, `roles/r-gm-home`, `r-hotel-manager-home` (and `r-reception-home`, `r-accountant-home`, `r-revenue-home`: the same body) | **MATCHES**, with the differences below |
| All properties | `new/n-all-properties`, `roles/r-owner-home` | **MATCHES**, with the differences below |

**Closed on 4 Nov:** the arrows on Arrivals, Due out and In house (they now open the front desk's
lists; before, only Needs cleaning opened anything and the other three had no arrow); the No-shows
arrow; the arrow on every "Needs you" row.

**Differences left, each with its reason:**

1. **Quick reports, the No-shows report and the "Needs you" lists are greyed** (the picture's are live
   white capsules and arrows): none of those screens is on the phone; a tap says "On the website for now".
   A notification carries no address in the ported type (`Notification`: id, title, body,
   actionRequired), so a row cannot be sent to its screen without inventing one.
2. **The Occupancy by day axis writes "100%" whole**; the website cuts it to ".00%" at phone width (the
   website's fault, already noted in `Charts.tsx`).
3. **The Dashboard is not the first screen of a GM, hotel manager, reception, accountant or revenue
   manager** (their pictures `roles/r-*-home` are the Dashboard; the phone sends everybody but
   housekeeping, the waiter and the kitchen to All properties). The landing is `app/index.tsx`, the
   core: asked of the mobile chat (MRP-1).
4. **The revenue manager's Due out** says "1 still to leave" (the picture `r-revenue-home` agrees: the
   due-out read is refused to that role, and no money figure is drawn). Listed only because it differs
   from the GM's picture by design.
5. **Figures and colours** come from the server and `core/theme.ts` + `kit.tsx`'s `more` (copied from
   the web's `theme.css`), not from the pictures: the pictures' figures are demo data.

Not compared (no picture of them): the read-failed, offline and empty states, the (i) notes and the
tapped chart readings.

---

## Lane m13-rep-stock (19 Nov): the store, bar and supplier reports

**Built** 19 Nov 2026 by the cloud helper "m13-rep-stock" on `mobile/m13-rep-stock`, from `main` at
`296c018` (then `origin/main` merged once for `docs/NATIVE.md` and `src/core/Export.tsx`). Read
against the PMS at `c9394cb` (16 Nov) and the pictures of 31 Oct; **never opened on a screen** (no
API, no Expo, no phone in the cloud). Defects: `DEFECTS.md`, letter **K** (MRP-K1 …).

### The web twin, mapped first

| | |
|---|---|
| Pages | `pages/Store.tsx` (the nine Store and equipment reports, Bar stock, FLR-1A/2A/3A, FLR-3), `pages/Ledgers.tsx` (`SupplierDuesPage`, `SupplierStatementPage`), each a `DocumentReport` (`components/DocumentReport.tsx`) in `ReportShell` drawn by `ReportView`; Bar stock is `WindowReport` (`pages/Voids.tsx`, From and To, opening on the business date alone, 16 Nov). Routes: `routes.tsx`, each in `RequireAccess` with its own menu entry (`nav.ts`) |
| Reads | `GET /api/hotels/:code/reports/<key>?asOn&month&from&supplier` (`data/document.ts getReport`; a 404 is "no report"). The statement's supplier list: `GET /api/hotels/:code/purchasing/dues` (`suppliers`) |
| Who may (`api/src/roleGate.ts`) | `STORE_REPORTS` = `stock` export + the hotel manager and the viewer ("Reading the store's reports …"): the nine Store reports, Equipment, Bar stock, FLR-1A/2A/3A, FLR-3. `SUPPLIER_DUES` = `invoice` approve ("Reading what is owed to suppliers …"): Supplier dues, the statement. `/purchasing/dues`: `own` (supplierDues.ts DUES_ROLES). Bar stock and both FLR registers: 403 `BAR_STOCK_OFF` where the property's Bar stock is switched off (`reports/documents.ts`, `build.ts switchedOff`); the statement without a supplier: 400 "Pick a supplier for the statement." |
| Offline (`src/lib/offline.ts`) | Reads only; nothing is written by these screens, so no tier applies. The web's Email (a POST) is not built here |

API code read: `api/src/modules/reports/document.ts`, `documents.ts`, `build.ts`, `builders/stock.ts`,
`barStock.ts`, `flr.ts`, `equipment.ts`, `supplierDues.ts`, `purchasing/supplierDues.ts` (the list).

### The screens (one route per report, all one screen)

| Web address | Phone route | Heading while it loads (Store.tsx / Ledgers.tsx) | Asks |
|---|---|---|---|
| `/reports/stock-on-hand` | `/reports/:code/stock-on-hand` | Closing stock | as on the business date |
| `/reports/stock-movements` | `/reports/:code/stock-movements` | Stock movement by day | the 1st of its month to it |
| `/reports/stock-consumption` | `/reports/:code/stock-consumption` | Consumption | the 1st to it |
| `/reports/stock-wastage` | `/reports/:code/stock-wastage` | Wastage and breakage | the 1st to it |
| `/reports/stock-count-differences` | `/reports/:code/stock-count-differences` | Count differences | the 1st to it |
| `/reports/stock-dead` | `/reports/:code/stock-dead` | Dead stock | as on |
| `/reports/stock-cover` | `/reports/:code/stock-cover` | Days of cover | as on |
| `/reports/supplier-spend` | `/reports/:code/supplier-spend` | Supplier spend | the 1st to it |
| `/reports/equipment` | `/reports/:code/equipment` | Equipment report | as on |
| `/reports/bar-stock` | `/reports/:code/bar-stock` | Bar stock | From and To, both the business date at first |
| `/reports/flr-daily` | `/reports/:code/flr-daily` | FLR-1A/2A/3A (daily register) | as on |
| `/reports/flr-monthly` | `/reports/:code/flr-monthly` | FLR-3 (monthly register) | its month, up to the business date |
| `/reports/supplier-dues` | `/reports/:code/supplier-dues` | Supplier dues | owed on it, paid the 1st to it |
| `/reports/supplier-statement` | `/reports/:code/supplier-statement` (`?supplier=`) | Supplier statement / "Statement: <name>" | a supplier, From and To; nothing asked until one is picked |

Files: `stockReports.ts` (+ `.check.ts`: the cell formats, the cards, each report's question, the
outcome, the stamp, the export), `stockData.ts` (the reads), `StockReport.tsx` (the screen),
`StockReportRoute.tsx` (session, hotel, the stores' `Guard` = the web's RequireAccess), and the
fourteen `app/reports/[code]/<key>.tsx`. Imported, not edited: `stores/Guard`, `stores/shelf`
(`dayText`), `finance/bill` (`rupees`, the web's moneyPrecise), `housekeeping/DayStepper` (`Day`,
M-7), `laundry/kit` (`LoadFailed`), `guest-services/kit` (`Back`), `core/Export` (`ExportButtons`).

### The rules

- **Every figure is the server's cell, as sent.** The phone formats each as the web's `formatCell`
  does (money to the paisa with ₹ in Indian grouping, a percent to two places, a count in Indian
  grouping, a ratio to two places, dates dd/mm/yyyy) and adds nothing up: every total on screen is a
  total row the server sent. The bar's "9 + 30 ml" is the server's text. **The excise registers**
  (FLR-1A/2A/3A, FLR-3) draw every size column the server sends, its 0 as 0 and its null as "-",
  in its own group, in its order - none is dropped, merged or summed. No report of this lane has a
  column the web adds up in the browser.
- **A report too wide for a phone is cards** (BRIEF-T3, NATIVE.md): a section's band heading, then
  one card per row - its first column names it (a bare day number is said with its column's name,
  "Date 11"), each figure under its label, a group's figures (Opening Balance 2000, 1000, 750 …)
  side by side under the group's heading; a total ruled off and bold; a band row a sub-heading; an
  indent kept; a negative money figure red. A total's empty words are left blank, as the web; a
  column with no heading and nothing in it is not drawn (FLR-3's second column on Sold and Closing).
- **The states:** loading ("Reading the consumption report…"); failed ("<What> did not load" and the
  server's words, or offline "No connection" and "This device is offline, so … cannot load …"),
  Try again; refused ("<What> is not available" and the API's own sentence: the role, Bar stock off);
  no report ("This property has no report to show."); nothing asked ("Choose above what the report
  is of."); a read again that fails over a report on screen keeps it and says "Not up to date: …".
- **The export** (`exportOf`): the core's ExportButtons (PDF, Excel-readable CSV and Print, M-14), from the cards
  shown: sections with the same columns keep them; the excise registers (columns differ by section)
  go one line per row with their figures in words. The server's totals go as its rows. Email is not built (below).
- **Dates** move by the day stepper (M-7, no date-picker package); To never before From.
- **Rights are the API's:** the route asks the menu (`mayReach`), as RequireAccess; the read's own
  refusal is shown in its words.

### Left on the website, each with its reason

- **A real .xlsx** waits for a package (the core's Excel is a CSV Excel opens, M-14). **Email this report** (`EmailReport`,
  D27-383 item 5: `GET`/`POST /reports/:key/email`): a write with its own dialog shared by every
  report of the three report lanes; asked of the mobile chat to build once (not in this lane's
  prompt). It says "Email: On the website for now." under the export.
- **"by <group>" and the group's logo** under the property's name (the group's settings read,
  `useGroupSettings`): not ported; the name alone is drawn.

### Picture match (19 Nov)

Compared by reading the code against each picture (780 px wide, cut in pieces); never seen running.
The top bar, the banner and the menu are the frame's.

| Screen | Picture | Result |
|---|---|---|
| Consumption | `new/n-reports-stock-consumption` | MATCHES, with the differences below |
| Equipment report | `new/n-reports-equipment` | MATCHES, with the differences below |
| FLR-1A/2A/3A | `new/n-reports-flr-daily` | MATCHES, with the differences below |
| FLR-3 | `new/n-reports-flr-monthly` | MATCHES, with the differences below |
| Bar stock | `new/n-reports-bar-stock` | MATCHES, with the differences below (plus 5) |
| Closing stock, Stock movement, Wastage, Count differences, Dead stock, Days of cover, Supplier spend, Supplier dues, Supplier statement | none (their captures failed: `new/index.json` "no answer in 30 s") | not pictured: built from the web's code, the same screen as the five above |

Differences left:
1. **The web's table is cards** on the phone (the brief's rule): the same sections, rows, figures and
   order; the column headings become each figure's label.
2. **Print, PDF, Excel, CSV** are the core's PDF, Excel (an Excel-readable CSV) and Print (M-14), in
   the core's order; no separate CSV button; the web's Email (16 Nov, after the pictures) is not built.
3. **"by <group>"** under the property's name is not drawn (the pictures show none for 5EL either).
4. **The total's dashed rules** may draw solid on Android (React Native draws a dashed style only on
   a border all round).
5. **Bar stock's From and To** (the web's of 16 Nov, after the picture of 31 Oct - MEMORY 14) are on
   the phone as day steppers; the picture has no controls.
6. Figures and names are the server's, never the picture's (demo data).

**5 of 5 pictured screens match their pictures** (with the differences above); 9 are not pictured.
Not compared: the refused, failed, offline, empty and choose-first states (not pictured).
