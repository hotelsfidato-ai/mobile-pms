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

## Lane mobile/m13-rep-ops (19-20 Nov): All reports, the operations reports, Group reports

**Web twin (today's PMS, 16 Nov release):** `src/modules/reports/pages/Index.tsx` (`/reports`),
`ManagerReport.tsx`, `NightAudit.tsx`, `Statistics.tsx` (three), `Ledgers.tsx` `NoShowPage`,
`Voids.tsx` `ItemSalesPage` (`WindowReport`), `GroupReports.tsx` (`/group-reports`); drawn by
`components/DocumentReport.tsx` → `ReportShell.tsx` + `ReportView.tsx`; data `data/document.ts`
(`getReport`, `GROUP_REPORTS`, `groupQuery`), `groupHotels.ts`; menu rules `nav.ts`; guard
`components/app/RequireAccess.tsx`.
**API and gates (`api/src/roleGate.ts`):** `GET /api/hotels/:code/reports/{manager,night-audit,no-show,
monthly-occupancy,monthly-statistics,yearly-statistics,item-sales}` → `REPORTS = see("report", "reports")`
(1033-1044); `GET /api/group/reports/:key?hotels=…` → `own` (reports/group.ts: every property asked the
one-property rule with the person's role there; a refusal names the property). `GET /api/hotels/:code/modules`
(the shell's read, for the bar's switch). **Offline:** reads only; this lane writes nothing to the API (the
stars are kept on the phone, as the web keeps them in the browser).

| Screen | Route | File | Picture |
|---|---|---|---|
| All reports | `/reports/[code]` | `ReportsIndex.tsx` | `all/50-reports-all-reports` |
| Manager report | `/reports/[code]/manager` | `OpsReport.tsx` `ManagerReport` | `all/51-reports-manager-report` |
| Night audit report | `/reports/[code]/night-audit` | `NightAuditReport` | `all/52-reports-night-audit-report` |
| No show | `/reports/[code]/no-show` | `NoShowReport` | `all/54-reports-no-show` |
| Monthly occupancy | `/reports/[code]/monthly-occupancy` | `MonthlyOccupancy` | `all/55-reports-monthly-occupancy` |
| Monthly statistics | `/reports/[code]/monthly-stats` | `MonthlyStatistics` | `all/56-reports-monthly-statistics` |
| Yearly statistics | `/reports/[code]/yearly-stats` | `YearlyStatistics` | `all/57-reports-yearly-statistics` |
| Item sales | `/reports/[code]/item-sales` | `ItemSales` | not pictured (16 Nov) |
| Group reports | `/reports/[code]/group-reports` | `GroupReports.tsx` | not pictured (16 Nov) |

Pieces: `opsDoc.ts` (the document contract; ReportView's `formatCell`, `factsLine`; a section as lines or
cards; the chart's axis; the export table; the day words), `opsIndex.ts` (Index.tsx's 37 rows in 4 groups,
each with its nav.ts rule and switch; the guard's and the API's sentences), `opsGroup.ts` (GROUP_REPORTS,
`hotelsWhere`, the question and its words), `opsData.ts` (the reads; the stars in AsyncStorage),
`OpsDocView.tsx` (masthead, sections, chart, footnotes, "Printed … who"; the four states),
`OpsReport.tsx` (one report screen, the seven pages, the day stepper). Checks: `opsDoc.check.ts`,
`opsIndex.check.ts`, `opsGroup.check.ts`.

**Every row opens a phone screen** (20 Nov, after the stock and money lanes merged): all 37 of the
index's rows have their `app/reports/[code]/<name>.tsx`, and `opsIndex.check.ts` fails if one is lost.
The phone's Accounting export (`/reports/accounting`, the money lane's) is reached from the menu, as on
the web, whose index does not list it.

**Rules.** Every figure is the server's document: money with its paise (`₹7,582.50`), a percent to two
places, Indian digits, `25/08/2026`, a moment in the property's time through `instant()` (Postgres's
text reads NaN on Hermes); null is `-`, never 0; a negative sum of money red; a total row is the server's
row, where it put it — **nothing on these screens adds a column up** (the web's ReportView does not
either; Group reports' totals are reports/group.ts's). The day, month and year are the property's
business date's (REP-1); Item sales asks From and To with day steppers (M-7), From never after To.
A section of one label and one figure is lines; a wider one (the Manager report's Today/PTD/YTD, the
night audit's, the statistics grid) is a card per row: its first column as its name, every other
column as a labelled figure, two across, in the web's order. Who sees what: the web's menu rule for
each row (`can` of the core's matrix, identical to `api/src/permissions.ts` on 19 Nov — compared role
by role, resource by resource, action by action); the core's 4 Nov menu port lacks the entries added
since, so the rules are carried in `opsIndex.ts` and the check holds them equal to the core's
`mayReach` wherever the port has the entry (29 of the 37 rows, every role).

**Files (M-14):** the core's `ExportButtons` (PDF, Excel as CSV, Print) from `exportOf(doc)`: the rows as
the screen writes them; sections with one set of columns keep them, mixed sections become "line and its
figures"; a chart alone (Monthly occupancy) its days. **Left on the website:** Email (the web's dialog,
`POST /reports/:key/email`; a write with no key the phone could reuse - one shared build for every
report lane is better than seven).

## Picture match (19-20 Nov, lane m13-rep-ops)

Compared by reading the code against each picture at full size (780 px, cut in 1500 px pieces);
**never seen running** (no Expo, no API in the cloud). The pictures are of 31 Oct (the GM, development
build): the top bar and the banner are the shell's.

| Screen | Result |
|---|---|
| All reports | **Matches**, with: today's page lists 37 reports (the picture 29 of 29: NC bills, Item sales, Money owed by age, Statement of account, Commission owed, GSTR-1, Input tax credit and GST on advances came since, MEMORY 14) — built from today's code |
| Manager report | **Matches**, with differences 1-3 |
| Night audit report | **Matches**, with differences 1-3 |
| No show | **Matches**, with differences 1-3 |
| Monthly occupancy | **Matches**, with differences 1, 2, 4 |
| Monthly statistics | **Matches**, with differences 1-4 |
| Yearly statistics | **Matches**, with differences 1-3 |
| Item sales, Group reports | not pictured: built from the web's code |

1. **The table is cards on the phone.** The web's table runs off a 390 px screen and scrolls sideways
   (the picture shows "TODAY" with PTD cut off); the phone shows each row as a card of labelled figures
   in the web's order (BRIEF-T3, NATIVE.md). A two-column section stays lines with its header.
2. **The file buttons** are the core's PDF, Excel, Print (the picture's Print, PDF, Excel, CSV); the
   web's Email (since the picture) is on the website for now, said under them.
3. **No "by <group>" line or logo** under the property in the masthead: the group's settings are not
   read on the phone (no ported read); the picture shows neither, the property has none set.
4. **The chart** is drawn with react-native-svg and scrolls sideways inside the report, as the web's at
   640 px; the series' key sits above it on the right; a day the server does not hold has no bar and
   no figure (the web draws `?? 0`, a bar of no height, and no label: the same to the eye).

**6 of 6 pictured screens match their pictures** (with the differences above); 2 not pictured.

Not compared (no picture): reading, could not read (online, offline), no such property, the page
guard, the test hotel's mark, the stars, an empty search, Group reports' states.
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

## m13-rep-money — the money and tax reports (19-20 Nov, lane A)

### The web twin's map

| Web address | Web page (PMS `src/modules/…`) | API read (the server's) | Who may read (`api/src/roleGate.ts`) | Who may take it away |
|---|---|---|---|---|
| `/reports/city-ledger` | reports `pages/Ledgers.tsx` CityLedgerPage | `GET …/reports/city-ledger?asOn&from&ignoreZero` (ReportDoc) | MONEY_REPORT: `invoice` view | `reportFiles.ts` MONEY_REPORTS |
| `/reports/dues-by-age` | Ledgers.tsx DuesByAgePage | `…/reports/dues-by-age?asOn` | MONEY_REPORT | MONEY_REPORTS |
| `/reports/company-statement` | Ledgers.tsx CompanyStatementPage | `…/reports/company-statement?asOn&from&account`; the accounts from `…/reports/city-ledger?ignoreZero=0` | MONEY_REPORT | MONEY_REPORTS |
| `/reports/commission` | Ledgers.tsx CommissionPage | `…/reports/commission?asOn&from` | `commission` view | COMMISSION_REPORTS |
| `/reports/tds` | Ledgers.tsx TdsPage | `…/reports/tds?asOn&from` | SUPPLIER_DUES: `invoice` approve | DUES_REPORTS |
| `/reports/petty-cash` | Ledgers.tsx PettyCashPage | `…/reports/petty-cash?asOn&from` | MONEY_REPORT | MONEY_REPORTS |
| `/reports/lodging-tax` | Ledgers.tsx LodgingTaxPage | `…/reports/lodging-tax?month` | REPORTS: `report` view | REPORT_EXPORTERS |
| `/reports/gstr-1` | reports `pages/Gst.tsx` Gstr1Page | `…/reports/gstr-1?month`; the JSON `…/reports/gstr-1.json` | REPORTS (the file: `report` export) | REPORT_EXPORTERS |
| `/reports/input-tax-credit` | Gst.tsx InputTaxCreditPage | `…/reports/input-tax-credit?month` | SUPPLIER_DUES | DUES_REPORTS |
| `/reports/gst-advances` | Gst.tsx GstAdvancesPage | `…/reports/gst-advances?month` | MONEY_REPORT | MONEY_REPORTS |
| `/reports/voids`, `/reports/nc-bills` | reports `pages/Voids.tsx` WindowReport | `…/reports/voids` / `nc-bills?asOn&from` | REPORTS | REPORT_EXPORTERS |
| `/reports/guest-ledger` | reports `pages/Compliance.tsx` | `…/reports/guest-ledger?from&to` (rows) | MONEY_REPORT | `listExports.ts` exportRefusal (money) |
| `/reports/cashier-shift` | Compliance.tsx | `…/reports/cashier-shift?from&to` (rows) | MONEY_REPORT | exportRefusal (money) |
| `/reports/gst-sales` | Compliance.tsx | `…/reports/gst-sales?from&to` (rows) | REPORTS | exportRefusal (money) |
| `/reports/c-form` | Compliance.tsx | `…/reports/c-form?from&to` (rows, `note`) | GUEST_ID: `customer` edit | exportRefusal (guests; ID numbers masked) |
| `/reports/accounting` | accounting `pages/Accounting.tsx` | `…/accounting/day-book?from&to`, `…/accounting/tally-ledgers` (GET, PUT), `…/night-audit/undos` | `accounting/routes.ts` MAY_EXPORT (owner, admin, GM, accountant) | the same |

Offline: every one is a read (`useRead`, kept by react-query); the one write, PUT tally-ledgers, is
not in the web's tiers (`core/offline.ts` UNLISTED: refused offline with its sentence, `send()` does it).

### Files (new, this lane's)

- `money.ts` (+ `money.check.ts`): the ReportDoc contract (a copy of `data/document.ts`), `formatCell`
  (ReportView's, paise kept), `docCards` (the server's sections, rows, bands and **its own total rows**
  as cards, in the web's column order), the four lists' shapes, the accounting export's words, the
  export tables (`docTable` lays a document out as the web's CSV does; `cFormTable` masks the passport
  and visa to their last four, as the server's files do).
- `moneyRoles.ts`: who may read each report and who may take it away, with the API's own sentences
  (roleGate `refusalFor`, `reportFiles.ts`, `listExports.ts exportRefusal`, accounting's NOT_YOURS).
  The phone asks before reading, as the web's RequireAccess does; a 403 still shows the server's words.
- `MoneyKit.tsx`: the page (head, export, settings), the steppers (a day, a month, a range: the app's
  day stepper, M-7), `Files` (`<ExportButtons table>` or the refusal), the four states, the masthead,
  the cards, a choice sheet (safe area) and the on/off switch.
- `MoneyReports.tsx` (the twelve document reports), `MoneyLists.tsx` (the four row lists),
  `MoneyAccounting.tsx` (the accounting export).
- Routes: `app/reports/[code]/<name>.tsx`, seventeen. The index `/reports` is m13-rep-ops'.

### Rules kept

- **Every figure the server's.** A document's total rows are drawn as the server sent them; the phone
  adds nothing (`money.check.ts` holds a server total that differs from the rows' sum). GST, TDS and the
  lodging tax figures pass through `formatCell` only.
- **Where the web adds up in the browser** — the Total rows of the Guest ledger, the Cashier shift and
  the GST sales register (Compliance.tsx `rows.reduce`) — **the server's rows are shown and the sum is
  NOT drawn**; each list says so under its rows (`NO_TOTAL`) and in its export's note. The GST
  register's "N documents" is a count of the rows, kept.
- **Paise kept** everywhere (₹7,767.90). The web's four list tables write whole rupees (`money`); the
  phone writes paise (MEMORY 9).
- **A dash, never a zero:** the day book's "Received from companies" when the answer has none (the web
  writes `?? 0` there, MRP-A1).
- The periods are the web's: the month so far for a range, the business date's month for a month,
  never after the business date where the web's input has a `max`.

### Picture match (20 Nov)

Compared by reading the code against each picture (780 px, cut in pieces); **never seen running**. The
pictures were taken on 31 Oct; the web pages changed after (D27-383 of 12 Nov: PDF and Excel on the
four lists, the GST and owed-by-age reports, NC bills of 16 Nov), so where the code is newer the code
wins (MEMORY 14). Every web table too wide for a phone becomes cards of labelled figures in the web's
column order (BRIEF-T3), which the web itself does only on the Accounting export's day book.

| Screen | Picture(s) | Result |
|---|---|---|
| City ledger | `all/53-reports-city-ledger` | MATCHES, with differences 1-3 |
| Lodging tax | `all/58-reports-lodging-tax` | MATCHES, with differences 1-3 |
| GST sales register | `all/59-reports-gst-sales-register` | MATCHES, with differences 1, 2, 4 |
| Form III register | `all/60-reports-form-f-c-form` | MATCHES, with differences 1, 2 |
| Guest ledger | `all/61-reports-guest-ledger` | MATCHES, with differences 1, 2, 4 |
| Cashier shift | `all/62-reports-cashier-shift` | MATCHES, with differences 1, 2, 4 |
| Accounting export | `all/63-reports-accounting-export` | MATCHES, with differences 1, 5, 6 |
| Petty cash | `new/n-reports-petty-cash` | MATCHES, with differences 1-3 |
| GSTR-1, Input tax credit, GST on advances, Money owed by age, Statement of account, Commission owed, TDS, Voids, NC bills | not pictured (`n-reports-tds`, `-voids` failed to load: `new/index.json`) | built from the web's code |

**Differences left, each with its reason:**

1. **The buttons:** the phone's are PDF, Excel (CSV) and Print (`src/core/Export.tsx`, M-14) made from
   the rows on screen; the web's are Print, PDF, Excel and CSV made by the server, and Email. **Email**
   (`POST /reports/:key/email`) is "on the website for now" (a dialog not built: ponytail; its route is
   known). A person who may read but not download a report sees the server's sentence instead.
2. **Cards, not a table;** no "Printed … / who" footer (that line is for paper; the phone's PDF says when
   it was made).
3. **The date inputs are steppers** (M-7, no date-picker package); the switch is the phone's own.
4. **No Total row** on the GST register, the guest ledger and the cashier shift: the web adds those in the
   browser; the server sends none (rule above). Amounts keep their paise where the picture rounds.
5. **The Export button:** the chosen format's own file (the day book in the server's CSV/.xlsx layout,
   Tally Prime / ERP 9 XML) is on the website for now; the day book drawn on screen goes out as PDF, CSV
   or print. The Tally ledger names are read and **saved** on the phone (PUT, as the web).
6. **"Received from companies"** is a dash where the server sends no figure (the web writes ₹0.00).

**8 of 8 pictured screens match their pictures**, with the differences above; 9 more are not pictured.

### Every web act of this lane left out, and why

- Email a report (`POST /reports/:key/email`): a dialog not built yet; "on the website for now".
- The GSTR-1 file (JSON, for the GST portal): a byte-exact server download; on the phone since 20 Nov (M-16, "m16 pickers" below); before that "on the website for now"
  (or the web's own sentence for a role that may not download reports).
- The accounting export's own files (day book CSV/.xlsx in the server's layout, Tally XML): "on the
  website for now".
- The server's own PDF/.xlsx of a report: replaced by the phone's PDF/CSV of the same rows (M-14).

## m16 pickers (20 Nov, lane m16-pick-money)

`docs/PICKERS.md` Lane 1, row 1.13 and its steppers (M-16).

- **1.13 The GSTR-1 file (JSON)** (`MoneyReports.tsx` `Gstr1`): the core's `DownloadButton`, GET
  `/reports/gstr-1.json?month=<YYYY-MM>`, saved under the server's own name
  (`<CODE>-GSTR1-<GSTIN>-<month>.json`, the GSTIN the phone does not hold), for whoever
  `mayDownloadGstr1` lets; anyone else keeps the refusal line. A month the server cannot make
  ("The GSTR-1 file was not made. …") is said under the button in its words. Email stays on the
  website.
- **Every report's day is each phone's own date picker** (was stepped, M-7), the day sent as the same
  text: MoneyKit's `DayStep` and `RangeStep` (Money owed by age, the statement, commission, TDS,
  petty cash, the accounting range), Item sales' From and To (`OpsReport.tsx` `DayPick`), the group
  reports' From and As on (`GroupReports.tsx`), the stock reports' From and To (`StockReport.tsx`).
  The web's min and max stay. **A month stays stepped** (MonthStep, the group reports' Month): the
  picker picks days.

Nothing here was opened on a phone or the preview: the cloud runs no API, Expo or simulator. Proved
by the type check, the module's checks and the gates on a clean commit; the pickers, the share sheet
and the uploads are the core's (lane m16-core), used as `docs/PICKERS.md` says.
