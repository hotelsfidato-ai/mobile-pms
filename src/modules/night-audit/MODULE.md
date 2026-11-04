# night audit — the checklist and the close of the day (Tier 2, slice 12)

**Web twin:** `src/modules/night-audit` in the PMS (`pages/NightAudit.tsx`, `data/nightAudit.ts`,
`nav.ts`, `routes.tsx`, its `MODULE.md`, `DEFECTS.md`); the API in `api/src/modules/night-audit/`
(`checklist.ts`, `nightAudit.ts`), its gates in `api/src/roleGate.ts`, its offline tier in
`src/lib/offline.ts`; the business date in `api/src/businessDate.ts` (`app.business_date()`: the day
after the last **completed** run). Read at the PMS's `a4527ea` (2 Nov 2026). **Decided:** M-1, M-5,
M-9, M-11.

## The web twin's map (read first, 4 Nov)

| Web | Calls | Gate (roleGate.ts) | Offline (offline.ts) |
|---|---|---|---|
| `/h/:code/night-audit`, `NightAudit.tsx` (menu: Reports, first; `report`) | `GET /api/hotels/:code/night-audit?asOn=` the checklist, `canRun` (blockers), `lastRun`, `calendarDate`, `lastCompletedAt`, `early` | `REPORTS` = `report` view: owner, admin, GM, hotel manager, revenue manager, reception, accountant, viewer | a read |
| the same page | `GET …/night-audit/runs` Closed days (60) · `GET …/night-audit/undos` Cancelled audits | `REPORTS` | reads |
| Run night audit → the window → Close D | `POST …/night-audit/run` `{ businessDate, reason? }` | `CLOSE_DAY` = `invoice` create: owner, admin, GM, hotel manager, reception, accountant | **refused**: "The night audit closes the day for the whole property and moves the business date. It needs the server." |
| Correct / Corrections (`CorrectDay.tsx`) | `GET …/days/:date/charges`, `POST …/days/:date/corrections` | `REPORTS`; `CORRECT_DAY` = `reservation` approve (owner, admin, GM) | refused |
| Admin → Cancel audits (`CancelAudits.tsx`) | `GET/POST …/night-audit/undo`, `PUT …/undo-mode` | `UNDO_DAY` = `role` view (owner, admin) | refused |

## Screens

| Screen | Route → file | Web twin and picture | Reads (key `["night-audit", code, …]`) |
|---|---|---|---|
| Night audit | `app/night-audit/[code]/index.tsx` → `NightAudit.tsx` | `/h/:code/night-audit`, `pms-shots/all/49-reports-night-audit` (as dev-gm, 31 Oct) | `checklist`, `runs`, `undos`; pull to refresh; no polling (the web has none) |

Rules: `audit.ts` (`audit.check.ts`); rights: `roles.ts` (`roles.check.ts`, the API's sentences);
calls: `data.ts`; the web kit's pieces: `kit.tsx`.

## The close: what the button does and what stops it

- **Run night audit** is shown to a role that may close the day (`CLOSE_DAY`); the revenue manager and
  the viewer read the screen and are not shown it (the web's D27-305). It is **disabled** while
  `canRun.allowed` is false — the server's answer, from the same `blockersFor` the run refuses with —
  and each blocking item is listed above it with the server's sentence and what it names (rooms and
  guests, the open drawers, the outlets, the drinks to count). The blockers today: a day that has not
  begun at the hotel (`not-begun`), the audit's opening hour not reached (`not-yet`), departures not
  checked out, no GST rule for rooms, a front-desk drawer open, a till with orders today and no day end,
  the bar not counted; and, for a person the 16 hours refuse, the 16 hours' sentence.
- Pressed, it opens the web's window: **"Close {day}?"**, Closing / Today at the hotel / Last audit,
  the 16 hours' paragraph and a required **Why now** (500 characters) when the server says
  `early`, the paragraph "The property moves to …", and the box **"I have checked the day being closed,
  today's date and the last audit."** **Close {d MMM yyyy}** stays grey until the box is ticked and,
  when asked, a reason is written.
- **Close** sends `POST /api/hotels/:code/night-audit/run` with `{ businessDate: <the day the screen
  shows> }` (+ `reason` only when the 16 hours ask), through `send()` with this property's keeper
  (`core/keys.ts`), latched at the tap so one tap is one request (MEMORY 8). In one transaction the
  server posts tonight's room charge on every in-house stay, marks the arrivals who never came as
  no-shows (a retention only where the booking carries terms) and completes the run, which moves the
  business date. The route keys nothing itself: a second close of the same day is stopped by the day it
  names (NA-2), the run's lock (NA-3) and its "already closed" answer (D17-12).
- **What comes back:** the green card (the server's rooms posted, revenue, complimentary, no-shows; the
  restaurant's day as read; the two drawers apart), then every read on the phone is read again (the date
  moved). A 409 is the server's sentence in red; a 409 for a day already closed shows "Nothing was run
  again. The record that was made:" and the record (read again from `/runs`, MNA-1). Offline: the web's
  sentence, nothing held. A 403: the API's "Closing the day is for … Ask one of them."

## Differences from the web (each for the owner)

1. The checklist is read without `?asOn=`: the web sends the date its session learned at sign-in; the
   server then answers for the day it is on (`checklist.ts` 32), which is the only day Run may close.
   Run still names the day the screen shows, so a screen left open over another device's close is
   refused (NA-2), as on the web.
2. Each blocking item is its own paragraph, with what it names under it (the server's `blockers[].rooms`);
   the web prints `canRun.reason`, the same sentences joined, and not the names.
3. Revenue with paise keeps them (₹3,699.50); the web's `money()` rounds to the rupee (MEMORY 9).
   A rooms-posted figure the server did not send is a dash; the web writes `?? 0`.
4. **Correct** / **Corrections** on a closed day are greyed, "On the website for now": the correction
   panel (`CorrectDay.tsx`, money: a reversal and a new charge on a closed day) is not in this slice.
5. Open on "In-house folios carrying a balance" (`/h/:code/folios`) and "Postings reversed today"
   (`/admin/audit-log`) says "Open: On the website for now": the phone has neither screen.
6. Cancelled audits are read and listed; cancelling (Admin's `CancelAudits`) stays on the website.

## Picture match (4 Nov)

Compared by reading the code against the picture (`all/49-reports-night-audit.png`, 390 px wide at 2x;
its `.txt` holds the same words; its `index.json` path is `/h/5EL/night-audit` as dev-gm, so it is the
screen); **never seen running**. The top bar and the business-date line are the shell's.

| Screen | Picture | Result |
|---|---|---|
| Night audit | `all/49-reports-night-audit` | **Matches, with differences left.** Matches: the title and its yellow "5 to look at" pill, the line under it with *night audit* underlined dotted; the one card of six checks in the server's order, each with its 28 px chip (yellow triangle / green tick), label, count (yellow-800, grey-500 when ok), detail and an orange **Open →** on the right; the Run card (moon chip, "Run the audit and roll to …", the reasons, "Last run: 10 Oct 2026" in small grey, the grey **Run night audit** capsule); Closed days with its note ("Days from Tuesday, 1 September 2026 on can be corrected…") and each day as the web's phone card (the date, then RAN BY · CLOSED · ROOMS POSTED · ROOM REVENUE · NO-SHOWS in small capitals beside the values). **Differences left:** (a) the four reasons are four paragraphs, not one (difference 2), with the rooms each names under it; (b) two checks' Open is "Open: On the website for now" under the detail (difference 5); (c) **Correct** is greyed with "On the website for now" under it (difference 4); (d) the picture predates D27-389/390 (2 Nov): no "Why early" row, "Under 16 hours" pill or Cancelled audits card is pictured — built from today's code, shown only when the server sends them. |

**0 of 1 screens match exactly; 1 of 1 matches with the differences above.** Not pictured, built from
the web's code: the window before Run (with and without the 16 hours), the green card, the red refusal,
the already-closed record, Cancelled audits, the refused role, loading, a failed read, no connection, no
day closed yet. `all/52-reports-night-audit-report` is the printed report at `/reports/night-audit`, not
part of the checklist screen: left out.
