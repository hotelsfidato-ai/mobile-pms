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
