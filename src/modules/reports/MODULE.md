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
- The GSTR-1 file (JSON, for the GST portal): a byte-exact server download; "on the website for now"
  (or the web's own sentence for a role that may not download reports).
- The accounting export's own files (day book CSV/.xlsx in the server's layout, Tally XML): "on the
  website for now".
- The server's own PDF/.xlsx of a report: replaced by the phone's PDF/CSV of the same rows (M-14).
