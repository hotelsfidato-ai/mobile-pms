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
