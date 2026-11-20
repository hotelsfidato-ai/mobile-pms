# marketing — Marketing (M-13, mobile/m13-sales, 19 Nov)

**Web twin:** `src/modules/marketing/` in the PMS (16 Nov release): `pages/Marketing.tsx`,
`data/numbers.ts`, `nav.ts` ("Marketing" at `/h/:code/marketing`, Sales and marketing, resource
`marketing`), `logic/lists.ts` (the opt-in guest lists: **no screen and no route on the web**),
`MODULE.md`, `DEFECTS.md`; the API `api/src/modules/marketing/numbers.ts`, gated `roleGate.ts` 996.
**Decided:** M-1, M-9, M-11, M-13; the web's D22-17, D25-39 (opt-in), D27-168, D27-170, D27-173.

## The web twin's map

| Web page / act | Address | API | Who | Offline |
|---|---|---|---|---|
| Marketing | `/h/:code/marketing` | `GET /marketing/numbers?month=YYYY-MM` | see("marketing", "marketing numbers"): the owner, an administrator, the GM | a read |
| PDF / Excel (each table) | ExportButtons `marketing-campaigns`, `marketing-sources` | listFiles | `holds: money`: `export` on `report` | — |

**Nothing is sent to a guest from Marketing**, on the web or here: the lists in `logic/lists.ts` have
no screen and no route (the web's MODULE.md, Requests), so there is no send to guard.

## Screens

| Screen | Route → file | Picture | Reads (key) |
|---|---|---|---|
| Marketing | `app/marketing/[code]/index.tsx` → `Marketing.tsx` | `new/n-h-marketing` (dev-gm, 5EL) | `["marketing", code, month]` |

Rules and words: `rules.ts` (`rules.check.ts`); calls `data.ts`; the lane's kit
`../leads/kit.tsx`. Menu: PHONE_ROUTES `"/h/:code/marketing": "/marketing/:code"`.

**Figures:** every one is the server's row (campaigns: spend, bookings, revenue; sources: bookings,
revenue). The web shows no total and neither does the phone. A figure nobody has (spend not read, no
charge) is a dash; paise are kept where the server sent them (MMKT-1). Not re-read on focus (the spend
is a read of the leads app), `staleTime` 60 s, as the web.

**The month:** the web's `<input type="month">` needs a date picker on a phone
(`@react-native-community/datetimepicker` 9.1.0, not installed): the phone offers a list, a year ahead
down to two years back, opening on the property's own month (`hotel.today`; the web takes the
browser's).

## Picture match (19 Nov)

Compared by reading code against the picture; **never seen running**.

| Screen | Picture | Result |
|---|---|---|
| Marketing | `new/n-h-marketing.png` / `.txt` | **MATCHES**, with differences: the title, its line; "Month" and its box; Campaigns with its line, the empty state "No campaigns this month" and its sentence, the spend note under it; By booking source with its line and a card per source: its name, BOOKINGS, REVENUE (₹ in Indian grouping, whole as the picture). Left: (1) the frame is the core's; (2) the month box opens a list, not the web's calendar ("October 2026", the web "October, 2026"); (3) each card carries its export buttons under its head (today's web, newer than the picture, puts them in the head's actions). |

**Not pictured**, built from the web's code: campaigns with spend and platform, the leads app's own
sentence (`appError`), no stays, a failed read, the read refused.

## Every act of the web, and where it is

Built: choose the month, both tables, both exports. **Left out: none.**
