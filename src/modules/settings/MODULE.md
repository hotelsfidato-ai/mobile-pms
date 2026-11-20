# settings — the Settings console's own pages on a phone (M-13, BRIEF-T4)

The web's Settings console (`/settings/<group>/<slug>`, 16 Nov release; each page registered in a
module's `*.settings.ts`) built page by page by the settings lanes. Each lane appends its own
section below; its files carry its prefix. The console's first screen is `src/modules/admin/
Settings.tsx` (`/admin/:code`); it opens a page here as soon as `PHONE_ROUTES` names it.

## Lane m13-set-messages (letter G, 20 Nov): Messages' own pages and Rivals' prices

Built 20 Nov 2026 from today's PMS (16 Nov release), read in the cloud. **Nothing was opened on a
screen**, and **none of the four pages has a picture** in `reference/pms-shots` (searched all three
`index.json`): every screen is built from the web's code, and every state is "not pictured".

### The web twin (mapped first)

| Web page (`group/slug`) | Web file | API route(s) | Who (the API) | Offline · key |
|---|---|---|---|---|
| `messages/switches` Guest messages on/off | `guest-messaging/pages/MessageSwitches.tsx`, `data/settings.ts` | `GET /:code/guest-message-settings`; `PUT /:code/guest-message-settings/:kind {isOn}` | read `see("room_config")`, write `grant("room_config","edit","Switching a guest message")`; both `app.manages_hotel` (else 404 "No such property, or it is not yours to set up.") | not listed → refused · no key (a PUT of a state) |
| `messages/daily-report-emails` Daily report emails | `guest-messaging/pages/DailyReportEmails.tsx` | `GET /:code/report-emails`; `PUT /:code/report-emails {reports:[{key,isOn,addresses}]}` (all, as a whole) | `room_config` view / edit "Choosing who gets the reports by email"; `app.manages_hotel`; the server checks each address and "At most 20" | refused · no key (a PUT of a state) |
| `messages/scheduled-reports` Scheduled reports | `reports/pages/ScheduledReports.tsx`, `reports/data/emails.ts` | `GET /:code/report-schedules`; `POST` add; `PUT /:id` change (Pause is a change); `DELETE /:id` | `room_config` view / edit "Choosing which reports go by email on a schedule"; `app.manages_hotel`; `scheduleOf` words every refusal | refused · **no key: POST adds one** |
| `connections/rivals-prices` Rivals' prices | `market-rates/pages/RivalsPrices.tsx`, `market-rates/data.ts` | `GET /:code/market-rates/switch`; `PUT /:code/market-rates/switch {isOn}` | `room_config` view / edit "Switching rivals' prices"; `app.manages_hotel` | refused · no key (a PUT of a state) |

The console offers all four to the console's default `setting` (`canAccess(role,"setting")`): the
owner, an administrator and the GM — exactly the three `app.manages_hotel` lets in.

### Screens

| Screen | Route file | Code | Reads / writes |
|---|---|---|---|
| Guest messages on/off | `app/settings/[code]/switches.tsx` | `MsgSwitches.tsx` | `msgData.ts` getMessageSwitches / setMessageSwitch |
| Daily report emails | `app/settings/[code]/daily-report-emails.tsx` | `MsgReportEmails.tsx` | getReportEmails / setReportEmails |
| Scheduled reports | `app/settings/[code]/scheduled-reports.tsx` | `MsgSchedules.tsx` | getSchedules / saveSchedule / removeSchedule |
| Rivals' prices | `app/settings/[code]/rivals-prices.tsx` | `MsgRivals.tsx` | getRivalsSwitch / setRivalsSwitch |

Shared: `MsgKit.tsx` (the page with its states, the page's write and stop, the yellow "Nothing is
sent yet" card, "Last changed by"); `msgRules.ts` (pure: shapes, who may, addresses, the schedules'
bodies and words, the invoice's "On since", the page stops) with `msgRules.check.ts`. Each route goes
through the admin module's `AdminRoute` (signed in, a property the API listed).

### Rules, per control

- **Opening:** `refusedPage` asks the core's `mayReach` of the console's address (the web's
  RequireAccess), and says RequireAccess's own sentence to anybody else.
- **Reading:** a 403 or 404 from the server is drawn as a refusal in the server's words ("Not open to
  you here"), never as a failure.
- **Writing:** `refusedWrite` is roleGate's `grant("room_config","edit",…)` with its own sentence;
  for the three who can open the pages it is always null (they all may).
- **Switches** (Guest messages, a daily report, Rivals' prices) are each phone's own `Switch`. The web
  asks nothing before switching a guest message or Rivals' prices off, so neither does the phone (the
  lane's brief: ask first only if the web asks). Guest messages: while one switch is being saved,
  every switch waits (the web's `disabled={busy}`).
- **Addresses** are other people's: the email keyboard, no capitals, no autofill or autocorrect
  (`keys.email`), one a line as the web asks; typed text is sent through the web's own `addressesIn`
  (split on spaces, commas, semicolons); the server lower-cases, de-duplicates and checks each.
- **Daily report emails** is a draft until Save (all reports as a whole, as the web). A read that
  brings something new resets the draft, as the web's `useEffect` does; a pull that brings nothing new
  keeps what is typed (react-query keeps the same answer object).
- **Scheduled reports:** the web's dialog is a bottom sheet (safe area, over the keyboard); its
  selects are the admin kit's sheets of choices; How often and File are the kit's Segmented. The
  report list and each report's allowed periods are the server's (`periods`); choosing a report keeps
  the period when it may, else takes its first (`pickReport`). Save needs a report and an address.
  "Delete" asks first with each phone's own dialog in the web's words ("Take this schedule off?" …
  "Keep it" / "Take it off").
- **One write at a time, and the unknown outcome** (MEMORY 8, 16, 22): no route here reads a key. Each
  page keeps a stop outside React, by hotel and page (`msgRules.stops`): while a write is on its way the
  page sends nothing else and a sheet cannot close; after an unknown outcome (nothing came back, or a
  5xx) the page says "Not known whether it was …", reads again, and its writes stay grey until a read
  that BEGAN after the loss is back. Leaving the page and coming back keeps the stop. On Scheduled
  reports an unknown outcome closes the sheet (the typed schedule goes, MEMORY 16), so the person sees
  the list before adding again.
- **Offline:** none of these writes is on the web's list, so `send` refuses each with the web's
  sentence and holds nothing; that refusal is an unknown outcome (it may have left), so the page stops
  until a read comes back.
- **Figures:** none; dates as the web writes them (`dayShort` = the web's `dateShort`, "16 Nov 2026";
  the invoice's moment as `toLocaleString("en-IN")` writes it, through `instant()` for Hermes).

### States (all four, different words)

Loading "Reading the … …" (each phone's spinner) · failed: the server's words and Try again, or
"No connection" when offline · refused: RequireAccess's sentence, or the server's own · empty:
Scheduled reports "No report goes on a schedule yet" (the web's); Guest messages "No message to
switch" and Daily report emails "No report to send" (phone words: the server always sends the four
messages and the four reports, so the web draws an empty card) · a failed re-read keeps the last
answer under "Could not read this again".

### Differences from the web

- The pages are not pictured: no picture to match (0 of 4 matched; 4 built from the code).
- "Add a schedule" sits above the list, not in the page head beside the title (a phone's head has
  no room); it is drawn only once the list is read, as the web's.
- The report's chooser says "Choose…" before one is picked (the kit's), not "Choose a report".
- The web sends nothing else only for the row being paused; the phone greys every write on the page
  while one is on its way (no route here reads a key).
- No export: the web downloads nothing on these pages.

### Defined as done

Accessibility: every switch carries its row's label; every list button its schedule's name
("Pause Manager report"); targets 44 px (Switch rows, the kit's buttons and choices). Packages: none.
