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

Shared: `MsgKit.tsx` (the page with its states, the page's write on the core's stop book, the yellow "Nothing is
sent yet" card, "Last changed by"); `msgRules.ts` (pure: shapes, who may, addresses, the schedules'
bodies and words, the invoice's "On since", the page's stop name) with `msgRules.check.ts`. Each route goes
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
- **One write at a time, and the unknown outcome** (MEMORY 8, 16, 22): no route here reads a key
  (POST /report-schedules adds one, with no unique index behind it, so its stop matters). Each page is
  one name in the core's stop book (`src/core/stop.ts`, `useScreenStop`; `settings/<code>/<page>`,
  msgRules `stopName`): while a write is on its way the page sends nothing else and a sheet cannot
  close; after an unknown outcome (nothing came back, or a 5xx) the page says "Not known whether it
  was …", reads again, and shows the core's `Stopped` card with "Read it again"; its writes stay grey
  until a read that BEGAN after the loss comes back good (when nothing came back or a gateway gave up,
  one begun 5 s after it: the server may still be committing). Leaving the page and coming back keeps
  the stop. On Scheduled
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

## Lane m13-set-lists (letter L, 20 Nov): Lists and Front desk

Built 20 Nov 2026 from today's PMS (16 Nov release), read in the cloud. **Nothing was opened on a
screen**, and **none of the eight pages has a picture** in `reference/pms-shots` (searched the
words of all three folders: only "Set up this hotel" names the lists). Every screen is built from
the web's code; every state is "not pictured".

### The web twin (mapped first)

| Web page | Address | Web files | Reads | Writes | Who (the API) | Offline |
|---|---|---|---|---|---|---|
| Market segments | `/settings/lists/market-segments` | `front-desk/settings/ListPages.tsx` MarketSegmentsPage, `ListEditor.tsx`, `data/lists.ts` | `GET /:code/lists/market_segment` | `POST /:code/lists/:kind`, `PATCH …/:id` (label, colour, sort, active), `DELETE …/:id` | read `anyone`; writes SETUP_CHANGE (`room_config` edit: owner, Admin, GM), rows `app.manages_hotel` | refused |
| Ready reasons | `/settings/lists/reasons` | ReasonsPage (four tabs) | `GET /:code/lists/reason_block\|reason_cancel\|reason_void\|reason_correction` | as above | as above | refused |
| VIP levels | `/settings/lists/vip` | VipLevelsPage (with colour) | `GET /:code/vip-levels` (the group's one list) | `POST /:code/vip-levels`, `PATCH …/:id`, `DELETE …/:id` | SETUP_CHANGE; rows `app.sets_group_settings` (owner, Admin, GM at any hotel) | refused |
| Holidays | `/settings/lists/holidays` | HolidaysPage | `GET /:code/holidays` | `POST /:code/holidays {day, name, colour}`, `DELETE …/:id` | SETUP_CHANGE, rows `app.manages_hotel` | refused |
| ID types | `/settings/lists/id-types` | IdTypesPage | the hotel list's `deskRules.idTypesOff` (`GET /api/hotels`) | `PATCH /:code/desk-settings {idTypesOff}` | SETUP_CHANGE | refused |
| Reservation types | `/settings/lists/reservation-types` | ReservationTypesPage | `deskRules.statusColours` | `PATCH /:code/desk-settings {statusColours}` (null: the built-in ones) | SETUP_CHANGE | refused |
| Front desk rules | `/settings/front-desk/front-desk` | `front-desk/settings/FrontDeskPage.tsx`, `components/FrontDeskRules.tsx` | `deskRules` | the rules card: `PATCH /:code/front-desk`; the sections: `PATCH /:code/desk-settings` | SETUP_CHANGE | refused |
| Times and rules | `/settings/front-desk/times-and-rules` | `admin/pages/ConsolePages.tsx` FrontDeskSettings (stand-in): `inventory/components/FrontDeskCard.tsx` + the same rules card | `GET /:code/room-setup` `frontDesk` (SETUP: `room_config` view), `deskRules` | `PATCH /:code/front-desk` (hours; `nightAuditOpensAt` only when changed) | SETUP_CHANGE; the night audit time also `isOwnerOrAdmin` (owner, Admin) | refused |

The console's guard (`setting`) and SETUP_CHANGE are the same three people today (owner, Admin,
GM): `lists.check.ts` pins it, so no page is offered that would refuse every control. None of these
routes reads an idempotency key; every one is refused offline ("This cannot be done offline yet…").

**Times and rules is not Front desk rules under another address.** They are two web pages that share
one card (the front desk's rules); Times and rules adds the hours and charges, Front desk rules adds
phase 5's sections. Both are built, one phone screen each, sharing the card.

### Screens (routes under `app/settings/[code]/`, through admin's `Route.tsx` AdminRoute)

| Screen | Route → file | Reads (react-query key) |
|---|---|---|
| Market segments | `market-segments.tsx` → `Lists.tsx` MarketSegments (ListScreen) | `["settings", code, "list", kind]` |
| Ready reasons | `reasons.tsx` → `Lists.tsx` Reasons (ListScreen, four tabs) | the same, per tab |
| VIP levels | `vip.tsx` → `Lists.tsx` VipLevels (ListScreen) | `["settings", "group", "list", "vip"]` |
| Holidays | `holidays.tsx` → `Lists.tsx` HolidaysScreen | `["settings", code, "holidays"]` |
| ID types | `id-types.tsx` → `Lists.tsx` IdTypesScreen | `["settings", code, "desk-rules"]` (`GET /api/hotels`) |
| Reservation types | `reservation-types.tsx` → `Lists.tsx` ReservationTypesScreen | the same |
| Front desk rules | `front-desk.tsx` → `ListsDesk.tsx` FrontDeskRulesScreen | the same |
| Times and rules | `times-and-rules.tsx` → `ListsDesk.tsx` TimesAndRulesScreen | `["settings", code, "front-desk-hours"]` and the desk rules |

Files: `lists.ts` (the pure rules: the table of kinds `LIST_PAGES`, REASON_TABS, ID_TYPES, STATES,
the editor's search, move and swap, colours, days, the rules' figures and body, the hours, who may
set the night audit time, the page's stop on the core's book), `lists.check.ts`, `listsData.ts` (the calls), `listsKit.tsx`
(the page frame, one write at a time, the colour field), `Lists.tsx`, `ListsDesk.tsx`.

The three list-pattern pages are ONE screen (`ListScreen` + `ListEditor`) driven by the table of
kinds, as the web drives `ListEditor` with its four calls.

### Rules, offline, states

- **Who:** the page is offered as the console offers it (`mayReach` of its address); anyone else
  reads RequireAccess's sentence. Every control is greyed with the API's sentence when the role may
  not change the set-up (SETUP_CHANGE, inventory `configRoles.ts`). The night audit's opening time
  is drawn read-only for the GM with the route's own sentence ("…for the owner or an administrator.
  Ask one of them."); the hours still save without it, as on the web.
- **One write at a time** (MEMORY 8, 22), kept in the core's stop book (`src/core/stop.ts`, the
  review of 20 Nov), by name `settings/<code>/<page>` (the VIP levels `settings/group/vip`; every page
  built from the desk's rules shares `settings/<code>/desk-rules`, and Times and rules adds
  `…/front-desk-hours`): a page sends nothing while a write is out, leaving and coming back included;
  its sheet cannot close meanwhile. **An unknown outcome** (nothing came back, or a 5xx): the page's
  writes stay grey ("Not known whether the last change was saved…") until a read BEGUN after the loss
  (and the book's 5 s settle when nothing came back) has come back good. The page reads again at once.
- **After a write that landed** (MSET-L1) the page's controls stay grey until a read begun after the
  write's end has come back (`<name>/fresh` in the same book): ID types, the booking colours, the
  required fields and the rules are sent as whole lists built from the last read, and a second tap
  before it would drop the first change. Meanwhile each control shows the value it sent.
- **After a save** the page reads again; ID types, Reservation types, Front desk rules, Times and
  rules and Holidays also read the frame's hotel list again (`useSession().refresh`, the web's
  `refreshHotels`), so the desk, the Calendar and Rates use it at once.
- **States:** loading (each phone's spinner, "Reading the segments…"), failed (the server's words,
  Try again), offline (No connection: not read on this phone yet), empty ("No segments yet." /
  "Nothing matches." / "No holidays yet."), a failed re-read over the last answer (Stale).
- **Figures:** the early and late charges as the server sends them, a dash when there is none
  (never ₹0), paise kept when there are any (the web rounds to the rupee: MEMORY 9).

### Differences from the web (each for the owner's yes)

1. **Delete asks first** (BRIEF-T4: destructive acts ask), with the phone's own dialog: a list row
   ("Delete <name>?", "It goes from the list. One in use cannot be deleted: switch it Off
   instead."), a holiday ("<day> is no longer shaded on the Calendar and Rates."), and **Back to the
   built-in colours** ("Every booking state takes its built-in colour on the Calendar again."). The
   web does each at one tap; the words are the phone's own, from the page's sentences.
2. **Rename and delete sit in a row's sheet** (tap its name), with a VIP level's colour; the web
   renames in place and has a bin on the row. Move up / down (44 px arrows) and On/Off stay on the
   row.
3. **Colours are typed** `#RRGGBB` with their square (no colour box on a phone, no package); checked
   with the server's sentence "A colour is like #DF6128." before they are sent; sent in capitals as
   the web's colour box gives them.
4. **The holiday's day is typed YYYY-MM-DD** (M-7, no date picker), and must be a real day ("A date
   is written YYYY-MM-DD."): the web's date box gives no other, and the API would fail (not refuse
   in words) on a 30 February.
5. **The hours are typed HH:MM** (no time picker), checked with the route's own sentence ("Check-in
   time is a 24-hour time, like 13:00.") before they are sent.
6. **The rules dialog sends only its own fields** (overbooking, advance, weekend, ID, nationality,
   title, the GM's undo); the web sends the whole rules record less the way of paying. The route
   reads only these, so the change is the same.
7. **Reasons' four tabs** are a segmented control (each phone's width); the web's Tabs.
8. **A hotel the server sent no desk settings for:** Front desk rules and Times and rules say so in a
   line, with no rules card and no Save (MSET-L4; the web shows Front desk rules' title alone, and on
   Times and rules draws its built-in defaults, START, as if they were the hotel's, and Save sends
   them); ID types and Reservation types start on the web's defaults, as the web.
9. **Move up / down on two rows of the same order** (MSET-L3) moves them: the row to come first
   keeps the order and the other takes one more. The web gives the moving row one more either way,
   so its Move up on a tie does nothing.
10. **After each change the page waits for the read** (MSET-L1): its controls are grey until the
   change has been read back; the web leaves them live.

### Not built

Nothing in the lane is left out. No download on these pages on the web, so no export.

## Lane m13-set-money — Rates and tax, and Money (20 Nov 2026)

**Built** 20 Nov 2026 on `mobile/m13-set-money`, from `873d6fe`; main `7bd0c88` merged for the review's fixes. Read against the PMS's 16 Nov
release (read-only checkout). **Never opened on a screen** (the cloud has no API, no Expo, no phone).
Defects: `DEFECTS.md`, prefix **MSET-M**.

### The web twin, mapped first

| Page (web) | Phone route | Web source | Reads | Writes (roleGate) |
|---|---|---|---|---|
| `/settings/rates/plans` Rate plans | `/settings/:code/plans` | `inventory/pages/RatePlans.tsx` | `GET /inventory`, `/pricing?plan=EP`, `/pricing?breakup=`, `/plan-settings` (PRICES, `rate` view); `GET /booking-sources` (`reservation` or `commission` view) | `PUT /plan-settings/:type/:plan` On/Off and sources, `PUT /plan-settings/order`, `PUT /pricing/basis`, `PUT /pricing/addon` (PRICE, `rate` edit) |
| `/settings/rates/meal-plans` Meal plans | `/settings/:code/meal-plans` | `inventory/pages/MealPlans.tsx` | `GET /plan-settings` | `PUT /meal-days/:plan` (PRICE) |
| `/settings/rates/taxes` Taxes (also the accountant, from Invoices) | `/settings/:code/taxes` | stand-in `admin/pages/ConsolePages.tsx TaxesSettings` → `finance/flows/TaxRulesCard.tsx` | `GET /tax` (anyone rostered) | `PUT /tax/:kind`, `PUT /tax/:kind/sac`, `PATCH /menu-categories/:name/tax-kind` (GST: `room_config` edit **and the accountant**) |
| `/settings/money/payment-methods` | `/settings/:code/payment-methods` | `finance/pages/money/PaymentMethods.tsx` | `GET /payment-methods` (see `setting`) | `POST`, `PATCH /:id`, `DELETE /:id`, `POST /:id/default`, `PUT /order` (MONEY_SETTING, `room_config` edit) |
| `/settings/money/extra-charges` | `/settings/:code/extra-charges` | `…/money/ExtraCharges.tsx` | `GET /extra-charges` | the list as above; `PATCH /front-desk` early and late fees (SETUP_CHANGE) |
| `/settings/money/discounts` Room discounts | `/settings/:code/discounts` | `…/money/Discounts.tsx` | `GET /discounts` | `POST`, `PATCH /:id`, `DELETE /:id` (MONEY_SETTING; no order) |
| `/settings/money/commission` | `/settings/:code/commission` | `…/money/Commission.tsx` | `GET /commission` | `PUT /booking-sources/:id/commission` (COMMISSION) |
| `/settings/money/pickup` Pickup and drop | `/settings/:code/pickup` | `…/money/Pickup.tsx` (ExtraCharges, transport) | `GET /extra-charges` | the extra-charges list |

API code read: `api/src/modules/finance/money.ts` (every route, its checks and sentences),
`finance/tax.ts` (GET, PUT kind, sac, menu category), `inventory/planSettings.ts`,
`inventory/pricing.ts` (basis 300-350, addon 532-600), `roleGate.ts` (grants 174, 201-211; the money
reads 1022-1025; the sentence 1289-1329). **Who opens a page:** the console's own `canSee`
(`menu.ts mayReach`): the owner, an administrator and the GM for all eight; Taxes also opens for
the accountant (roleGate GST), as the web's Invoices card does. **Offline:** none of
these writes is in `src/lib/offline.ts`, so `send()` refuses each with the web's unlisted sentence;
nothing is held. **Keys:** none of these routes reads an idempotency key.

### Files

`moneyRules.ts` (shapes, rules, grants, the doubt) with `moneyRules.check.ts`; `moneyData.ts`
(reads and writes, through `core/api.ts`); `moneyKit.tsx` (useWriter, refusedPage, ListCard = the
web's MoneyList, Why, TickBox, MoveButtons); screens `MoneyLists.tsx` (Payment methods, Extra
charges, Pickup and drop, Room discounts), `MoneyCommission.tsx`, `MoneyTaxes.tsx`, `MoneyPlans.tsx`
(Rate plans, Meal plans). Reused, not copied: `inventory/rates.ts` rupees, typedPrice, dateShort and
the pricing shapes; `inventory/config.ts` figureOf and the commission rules (commissionValue,
commissionNote, commissionOf - the Booking sources screen's); `inventory/data.ts` readInventory,
readPricing, readBreakup (Rates' reads); `inventory/configData.ts` readSources; `inventory/configKit`
and `inventory/kit` pieces; `admin/roles.ts` notYourRole, `admin/Route.tsx` AdminRoute.

### The rules (each ported, with its source in a comment)

- **Money and tax are the server's.** Every figure, rate and percentage as sent, paise kept
  (`rupees`: ₹1,000.50, never the web's rounded ₹1,001). Missing is a dash: a heading with no bands,
  a plan not priced, a commission not agreed, a discount with neither figure.
- **Typed is sent as typed** (`typedPrice`: digits, one point, two places). Blank is null: an extra
  charge "Included, no charge", a fee "no fee", a commission "not agreed", a difference cleared.
  Never `Number(x) || 0`. The one sum on the phone is Rate plans' green offset (the web's own: a
  plan's price less the master's, both the server's), done in whole paise.
- **Taxes, stricter than the web** (MSET-M1): a band with a blank rate is never dropped, a blank
  amount never sent as 0; clearing a whole heading asks first. A band's dates are shown, not changed
  (no date picker); a save sends them back exactly as read.
- **Rights are the API's**: the grants and the role gate's sentence ported (`whyNot`, checked equal to
  inventory/configRoles.ts for the shared grants); a refused control is grey with that sentence. A
  page the console does not offer says "This page is not part of your role…".
- **Destructive acts ask first** (each phone's own dialog): Delete (the web deletes at one tap),
  clearing a tax heading, making a room type the master (every derived plan moves).
- **One tap, one write; the unknown outcome** (MEMORY 8, 16, 22): `useWriter` runs every write
  through the core's stop book (`src/core/stop.ts`, `ui.tsx useScreenStop`; one store for the app,
  names `settings/<code>/<page>`). While a write is on its way the page sends nothing else and its
  sheet cannot be closed; after an unknown outcome (nothing came back, or 5xx) the page's writes stay
  grey under the core's `Stopped` line ("Not known whether it was …", Read it again) until a good read
  of the page that **began** after the loss, and after the core's 5 s settle for a lost reply, has come
  back. Leaving the page does not lift it. A sheet that saw the loss also stays grey until it is closed.
- **Fresh after a write** (MSET-M5, `moneyRules.ts freshBook`): after a write that landed, the page's
  writes stay grey until a read begun after that write's end has come back, so no sheet opens on the
  old set and sends it back (PUT tax/:kind and plan-settings sources replace the whole set).
- **Who opens Taxes**: the console's three, and the accountant (roleGate GST), who reaches it from
  Invoices' "Open Taxes" (MSET-M4). Never wider than GST.
- **Asked first on Rate plans** (MSET-M6, `planAsk`): making a type the master, and clearing a type's
  difference (Independent, or the difference left blank), which leaves its plans unpriced unless it
  has its own base on Rates.
- Reads through `useRead` keyed `["settings", code, <page>]`; a change on Rate plans has Rates read
  again too; Payment methods re-reads the session (the desk reads the hotel's list there).

### States

Loading "Reading the …" (each phone's own spinner) · failed: "The … did not load" and the server's
words, Try again; over a last good read "Could not read this again: …" · offline: "No connection" and
its own words · empty: the web's words ("No payment methods yet.", "No room types yet", "No contract
carries a commission.", a tax heading "Not set" and a dash) · refused: the role's sentence.

### Where the phone differs from the web (each for the owner's eye)

1. **Reorder**: the web drags; the phone has Move up / Move down in a row's editor (the whole order
   is sent, as the web's drop).
2. **Taxes**: stricter on blanks (MSET-M1); a band's dates cannot be changed on the phone (needs
   `@react-native-community/datetimepicker` 9.1.0); no placeholder "5" in the GST field (no figure
   suggested).
3. **Delete, clear a heading, make the master, clear a difference** ask first; the web does them at the tap.
4. **Controls a role may not use are grey with the API's sentence**, where the web hides them (Rate
   plans, Meal plans) or lets the server refuse (Taxes' Edit).
5. **Commission**: each source opens in a sheet (the web types in the row); a contract's company is
   text, not a link (no company page on the phone yet).
6. **Rate plans**: a break-up read that fails fails the page (the web shows a dash, which reads as
   "not priced"); the editor's summary sits under the step.
7. **Paise shown** where the server sends them (the web's money() rounds).
8. A page not offered to the role says so; the web sends that person to the first page they may open.
9. After a save, the page's acts are grey for the moment its re-read takes (MSET-M5); the web leaves them live.

### Picture match (20 Nov)

| Screen | Picture | Result |
|---|---|---|
| Taxes | `new/n-admin-configuration` (taken at `/settings/rates/taxes`, as the owner) | Matches by reading: the card's heading and line, a tile per heading (label, bands as "5% up to the next band / 18% above ₹7,500", the sentence, HSN/SAC, Edit or Set it; unset dashed with "Not set" and a dash), then "The till's half" with a heading picker per menu category. Left: the picker is the phone's sheet, not a native select |
| Rate plans, Meal plans, Payment methods, Extra charges, Room discounts, Commission, Pickup and drop | none (`new/n-settings-rates-taxes` failed to capture; no other) | Not pictured: built from the web's code |

1 of 8 screens has a picture, and it matches by reading the code against it. Never seen running.

### Definition of done

```
Screens       8 routes above; the console (admin/Settings.tsx) opens them through PHONE_ROUTES
Reads/Writes  moneyData.ts, inventory/data.ts, inventory/configData.ts - all through core/api.ts
Rules         moneyRules.ts (+ check); refused = grey with the API's sentence
Offline       every write refused with the web's unlisted sentence; nothing held
States        loading · failed · empty · offline · refused, different words
What I saw    nothing on a screen (cloud); compared by reading code with the one picture
Accessibility 44 px targets, labels on icon buttons (Edit/Delete/Remove/Add), Switch and checkbox roles
Packages      none added
```
