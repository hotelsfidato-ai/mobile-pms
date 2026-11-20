# front desk — reception's day on a phone (slice 4a)

**Web twin:** today's PMS, `.claude/worktrees/pms-ref` (MFD-2): `src/modules/front-desk` —
`pages/Arrivals.tsx`, `InHouse.tsx`, `WalkIns.tsx`, `components/StayTable.tsx` (its `StayCards`),
`flows/StayDrawer.tsx`, `CheckInFlow.tsx`, `data/stays.ts`, `data/operations.ts`;
`src/modules/reservations/pages/BookingPage.tsx` and `flows/BookedCard.tsx` (a walk-in is that page
opened from an empty room, D27-163); `src/modules/guests/components/GuestIdFields.tsx`,
`ForeignGuestFields.tsx`, `StayCompanions.tsx`, `ReturningGuest.tsx`, `BookingSiteBlacklist.tsx`;
`api/src/validate.ts`, `api/src/roleGate.ts`, `api/src/modules/front-desk/operations.ts`.
**The pictures (M-11):** `../.local/pms-shots/all/` 04-08 and 14; the panel and the check-in sheet
from `flows/desk/`. **Decided:** M-1, M-5, M-9, M-11.

## Screens

| Screen | Route | File | Web twin, picture |
|---|---|---|---|
| Arrivals: Today · Upcoming | `/front-desk/<code>` · `?view=upcoming` | `Arrivals.tsx` | `/h/:code/arrivals`, `/arrivals/upcoming`; 04, 05 |
| In house: In house now · Due out | `/front-desk/<code>/in-house` · `?view=due-out` | `InHouse.tsx` | `/h/:code/in-house`, `/in-house/due-out`; 06, 07 |
| Walk-ins (the record) | `/front-desk/<code>/walk-ins` | `WalkIns.tsx` | `/h/:code/walk-ins`; 08 |
| The stay | `/front-desk/<code>/stay/<id>` (`?offer=1`: Check in offered) | `Stay.tsx`, `StayActs.tsx` (More options) | the stay panel; `flows/StayActions.tsx` and its flows |
| Check in | `/front-desk/<code>/check-in/<id>` | `CheckIn.tsx` | the check-in dialog |
| Take a walk-in | `/front-desk/<code>/take-walk-in` | `TakeWalkIn.tsx` | **the phone's own**: the empty tiles of Rooms, until the Calendar (slice 10) |
| A walk-in (New booking on a room) | `/front-desk/<code>/walk-in?room=306` | `WalkIn.tsx` | `/h/:code/book?room=&date=`; 14 |

Shared: `StayList.tsx` (the cards, the filter, the four states, the blacklist warning), `GuestIdFields.tsx`,
`Companions.tsx`, `kit.tsx` (the web kit's pieces). Rules, each with a check: `desk.ts`, `guestId.ts`,
`booking.ts`, `roles.ts`. Calls: `data.ts`. **Hand-off:** the Bill, payments, settling and check-out
are `/folio/<code>/<id>` (the folio helper's): Due out's rows, the Bill tab, Settle and check out.

## Reads and writes

Reads: `/stays?from&to` · `/stays` (Walk-ins, as the web) · `/stays/:id` · `/stays?from&to&board=1`
(Take a walk-in) · `/rooms` · `/house-now` · `/stays/:id/folio` and `/stays/:id/bill` (a role with bills: the foot) · `/due-out`
(Due out's banner, as the Dashboard) ·
`/early-arrival` · `/stays/:id/express-check-in` · `/stays/:id/guest-marks` · `/stays/:id/companions`
· `/online-checkin` · `/guests/blacklist-warnings` · `/guests/returning` · `/booking-sources` ·
`/inventory` · `/tariff` · `/contract-price` · `/tax/room/rate` · `/tax/room/before-gst` · `/modules`
· `/companies` · `/billing-companies` · `/sales-people` · `/room-promotions` · `/lists/market_segment`.
Keys: `["front-desk", code, …]`; every write re-reads the prefix (a check-in, everything).

| Write | Endpoint | Who (API) | Offline (`src/core/offline.ts`) |
|---|---|---|---|
| Check in | `POST /stays/:id/check-in` | `reservation` edit | **held**, warned; its row marked "Queued: check in" |
| Give a room (walk-in's picked room) | `POST /stays/:id/assign` | `reservation` edit | **held**, warned |
| A booking (walk-in) | `POST /bookings` | `reservation` create | **refused** (not listed) |
| The advance | `POST /stays/:id/payments` | `payment` create | **refused**, the web's sentence |
| Another adult | `POST·PUT·DELETE /stays/:id/companions…` | `customer` edit | **refused** (not listed) |
| The WhatsApp tick | `POST /stays/:id/whatsapp` | `customer` edit | **refused** (not listed) |
| Form III | carried by the check-in's body; `/form-c` itself is refused | | as the check-in |
| Mark VIP | `POST /guests/:id/vip` | `customer` edit | **held** ("VIP") |
| Amend · Move · Exchange · Inclusions | `PATCH /stays/:id`, `POST …/move`, `…/exchange`, `…/inclusions` | `reservation` edit | **refused** |
| Take out of the room | `POST /stays/:id/unassign` | `reservation` edit | **held**, warned |
| Void · Cancel · Confirm | `POST …/void`, `…/cancel` (`dryRun` previews), `…/confirm` | `reservation` cancel, create | **refused** |

**Rights:** `roles.ts`, the API's sentences read back on 31 Oct (a refused curl as dev-housekeeping).
Check in, Book: greyed with the sentence, where the web hides them. Who sees bills: `invoice` view.
**Money is the server's (MFD-3):** the balances, the bill's total and paid, the departures' owing,
the tariff and the GST rate. The phone adds nothing up and works out no tax: where the web makes a
sum (the foot's Charged, Due with charges to come, the move sentence, the walk-in's card), the phone
says its parts. The one figure it still derives is the walk-in's night after a typed discount (the
web's `priced`, in whole paise); the server charges it.

## Where the phone differs from the web

1. **Greyed, not hidden** (AGENTS rule 1): Check in, the walk-in's buttons.
2. **Touch sizes:** the web's own `pointer-coarse` 44 px (the pictures were shot with a mouse: 30 px
   tabs, 36 px boxes).
3. **Take a walk-in** is the phone's own screen; since 4 Nov Open Calendar opens the Calendar (slice 10, `/reservations/<code>/calendar`).
4. **A walk-in is one room, tonight:** Another room greyed ("On the website for now"), the Rooms box
   greyed at 1, no group, Arrival fixed; the Departure is the day stepper (M-7). Form III's dates are typed YYYY-MM-DD; the expected times HH:MM.
5. **Greyed "On the website for now":** Edit guest, View voucher, Change rate, Print registration card,
   Add the photo (needs `expo-image-picker` ~57.0.20), Send voucher.
6. **Not on the phone yet, drawn nowhere:** Guest 360, the guest page link, the CRS facts, key cards, a
   company's credit-limit allow (the core's `ApiError` has no `needs`).
7. **Dates** on More options use the day stepper (M-7); the web's dialogs are full-screen sheets here.
8. **Font:** the web's body is Inter 400; the core loads 500-700 (report).

## Picture match (4 Nov)

Compared by reading the code against each picture and its words, section by section; **never seen
running** (this copy has no phone, no preview and no API). Sizes: the pictures were shot with a
mouse, so their 30 px tabs and 36 px boxes are 44 px here (the web's own `pointer-coarse`), on
every screen. The top bar, the business-date banner and the menu are the shell's.

| Screen | Picture | Result |
|---|---|---|
| Arrivals · Today | `all/04-front-desk-arrivals` | **Matches**: title, the blue "N expected" pill, the line, Today N / Upcoming, the filter box and "N of N", each card (room or a dash, the state's pill and chevron, guest, reference, Type · Plan · Source · Departure · Nights · Rate), Due in orange, No show red, In house blue, Checked out grey. |
| Arrivals · Upcoming | `all/05-front-desk-arrivals-upcoming` | **Matches**: the fortnight's line (the day after to 14 days on), Upcoming's count only once read, the same columns. |
| In house · In house now | `all/06-front-desk-in-house` | **Matches**: "N rooms" (the server's count of rooms), Type · Plan · Arrival · Departure · Balance; a balance red when owed, green at ₹0, a dash for a role without bills. |
| In house · Due out | `all/07-front-desk-in-house-due-out` | **Matches**, the banner now from the server's `/due-out` (MFD-3): "1 departure still owing ₹7,582" and its line, red tint; a row opens the Bill (the folio's) for a role with bills. |
| Walk-ins | `all/08-front-desk-walk-ins` | **Matches**: "N on record" grey, "N today" (a dash until read, MFD-4), the Calendar card and its orange Open Calendar →, Type · Plan · Arrival · Departure · Nights · Rate, "Day use". Open Calendar opens the Calendar (slice 10, 4 Nov). |
| A walk-in (New booking on a room) | `all/14-bookings-new-booking` | **Differences left:** (1) the price line says "₹3,699.00 a night + tax (5%) · 1 night", not "+ ₹184.95 tax", and The booking card shows Nights, Rooms, "1 × Deluxe ₹3,699 a night", GST 5% and a sentence, not Room charges, GST in rupees and Due: the web adds those itself and the phone may not (MFD-3; a question for the owner); (2) the description names the room ("A walk-in into room 306 …"); (3) Arrival is fixed text and Departure the day stepper (M-7), not date boxes; (4) Check in now is the filled button (the job a walk-in is opened for), Save booking in the picture of a plain New booking; (5) Rooms greyed at 1 and Another room greyed, "On the website for now". The rest matches: Guest, Stay (now its Rooms · Adults / Children · Rate grid), ID, Advance, the five folds in order, the card's divided rows, the three buttons and the reason under them. |
| The stay (panel) | none in this copy (the 31 Oct captures under `flows/desk/` were not carried to the cloud) | **Not compared to a picture today.** Built to the web's StayDrawer as the previous helper captured it. **Changed:** the foot is the server's figures (MFD-3), and while nights are to come says Balance with "Charges to come" instead of the web's Due. |
| Check in | none in this copy (as above) | **Not compared to a picture today.** **Changed:** the move sentence says the rate and the GST rate, not the web's total (MFD-3). |
| Take a walk-in | none: the phone's own screen | Nothing to compare. |
| The desk's landing | `roles/r-reception-home` | The Dashboard (reports' module and `app/hotel/`, not this lane). **Left:** its Arrivals, Due out and In house tiles open nothing on the phone; they open this module on the web: a core change, in the report. |

**4 of 6 pictures match with nothing left** (04, 05, 06, 07); 08 matches but for where Open
Calendar goes; 14 keeps the five differences above. The stay and Check in have no picture here.

## m13-rooms (19 Nov): Rooms, the house as tiles

**Web twin:** `/h/:code/stay` — `src/modules/front-desk/pages/StayView.tsx` (view `floor`: the head,
`FilterTiles`, `StaleRooms`, the skeleton, `todaysStays`, `bookRoom`) and `flows/HouseFloor.tsx` (the
tiles); data `data/stayview.ts` `getStayView` and `data/stays.ts` `fetchStays`, `getHouseNow`.
Reads: `GET /rooms`, `/stays?from=<today>&to=<today+13>&board=1`, `/house-now` (the house, D21-36),
`/stays?from=<today>&to=<today>` (who is in each room today) — all `STAYS` (`reservation` view) or the
rooms read; the web also reads `/calendar-prices` and the open bills there, which only the Calendar
draws (left out here). Picture: `all/02-home-rooms` (dev-gm, 375 px). Offline: reads only; the two
writes below are the web's tiers through `send()`.

| | |
|---|---|
| Route | `/front-desk/<code>/rooms` (`app/front-desk/[code]/rooms.tsx`); PHONE_ROUTES `"/h/:code/stay"` |
| Files | `Rooms.tsx` (the screen, its read), `rooms.ts` + `rooms.check.ts` (the tile rules) |
| Reused, imported | reservations' `chart.ts` (`buildChart`, `groupsOf`, `roomVisible`, `PILLS`, `PILL_LABEL`: the Calendar's port of getStayView, so one house, one answer), `data.ts` `rememberGrouping`, `AssignRoom.tsx`; this module's `readRooms`, `readHouse`, kit, `roles.ts`; reports' `IconChip` |
| A tile with a guest | `/front-desk/<code>/stay/<id>?offer=1` (the web's panel offers Check in by default, `StayDrawer` `offerCheckIn = true`); Check in itself is `/check-in/<id>` from there |
| A free or needs-cleaning tile | `/front-desk/<code>/walk-in?room=<n>` (the web's `/h/:code/book?room=&date=<business date>`); refused (`reservation` create): no arrow, the tap says the API's sentence |
| Out of service | opens nothing, a guest in it or not (the web's button is disabled) |
| Assign room | reservations' `AssignRoom` (`POST /stays/:id/assign`, held offline, warned); greyed with `whyNotRoom` where the web hides it |
| Room type / Floor | `PUT /api/me/preferences {roomGrouping}` (sets a value: safe to repeat; refused offline, "Not remembered") |
| Calendar | the switch opens `/reservations/<code>/calendar` |

**Rooms is not the housekeeping board.** `/housekeeping/<code>` (the web's `/h/:code/housekeeping`,
picture `all/10`) is housekeeping's job list: rooms grouped by cleaning state (Needs cleaning, Clean,
Inspected, In house, Out of service), Mine / All / Unassigned, and it WRITES on the room (Clean,
Inspected, who has it, Repair). Rooms is the desk's view of who is in the house today: grouped by
room type or floor, coloured by the guest's state (Free, In house, Arriving, Due out, Needs cleaning,
Out of service), and its taps lead to the stay or a walk-in; it marks nothing on a room.

**The four states:** loading, the tiles' shape (10 and 7); failed, "The rooms did not load" and the
server's words, Try again; offline with nothing read, the web's "No connection" sentence; no rooms,
"No rooms set up yet / Add them in Room types."; a filter leaving none, "No rooms are <tile> today."
(the phone's, as the Calendar; the web draws nothing). A failed re-read keeps the tiles with the
web's StaleRooms line above them.

### Picture match (19 Nov)

Compared by reading the code against `all/02-home-rooms.png` and its words; **never seen running**.

| Section | Result |
|---|---|
| Head | **Matches**: BUSINESS DATE · <day>, "Rooms", the property's name. |
| Calendar · Rooms switch, full width | **Matches** (Rooms chosen). |
| Room type · Floor and "+ Assign room" | **Matches**; Assign room greyed with the API's sentence for a role the web hides it from. |
| The count tiles | **Matches**: Sellable navy when chosen, Empty, In house, …, each icon chip, scrolling inside its row, 116 px wide. |
| Group heads | **Matches**: the type and its grey count pill. |
| The tiles | **Matches**: two across, the odd last one taking the row (307); the number, the pill (white, dot, the state's ink and ring), the red "dirty" mark, the guest, "to 13 Oct 2026" / "out today" in yellow, the type in grey, "Free" plain, the chevron; the six tints. |

**1 of 1 picture matches.** Not pictured, built from the web's code: Floor grouping, a chosen filter,
the four states, the stale line, out of service. **Differences left:** (1) the web's StartHere card
(a new clerk's first jobs, by role) is not drawn (nor on the Calendar); (2) "No rooms are … today."
is the phone's own (the web shows nothing); (3) the stale line has no time "as they were at 4:10 pm"
(the core's read gives no time) and keeps Try again offline (the phone cannot tell the read will
resume by itself); (4) the grouping chosen here is remembered for this run, not handed to the
Calendar's own (each screen keeps its own until the session's scope carries it).

**Native (docs/NATIVE.md, 19 Nov):** the tiles and the count tiles ripple on Android and shade on
iPhone, never both; every tap is 44 px or more (tiles 92); the room number shrinks to fit (0.8) rather
than clip; pull down reads again (the core's `Screen`); no sheet of its own (Assign room is
reservations'). **Export:** the web's Rooms offers no download or print, so no `ExportButtons` here.
