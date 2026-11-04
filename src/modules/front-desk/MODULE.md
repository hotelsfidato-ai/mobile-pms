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
3. **Take a walk-in** is the phone's own screen, and Open Calendar opens it, until slice 10.
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
| Walk-ins | `all/08-front-desk-walk-ins` | **Matches**: "N on record" grey, "N today" (a dash until read, MFD-4), the Calendar card and its orange Open Calendar →, Type · Plan · Arrival · Departure · Nights · Rate, "Day use". **Left:** Open Calendar opens Take a walk-in, not a Calendar (none on the phone until slice 10). |
| A walk-in (New booking on a room) | `all/14-bookings-new-booking` | **Differences left:** (1) the price line says "₹3,699.00 a night + tax (5%) · 1 night", not "+ ₹184.95 tax", and The booking card shows Nights, Rooms, "1 × Deluxe ₹3,699 a night", GST 5% and a sentence, not Room charges, GST in rupees and Due: the web adds those itself and the phone may not (MFD-3; a question for the owner); (2) the description names the room ("A walk-in into room 306 …"); (3) Arrival is fixed text and Departure the day stepper (M-7), not date boxes; (4) Check in now is the filled button (the job a walk-in is opened for), Save booking in the picture of a plain New booking; (5) Rooms greyed at 1 and Another room greyed, "On the website for now". The rest matches: Guest, Stay (now its Rooms · Adults / Children · Rate grid), ID, Advance, the five folds in order, the card's divided rows, the three buttons and the reason under them. |
| The stay (panel) | none in this copy (the 31 Oct captures under `flows/desk/` were not carried to the cloud) | **Not compared to a picture today.** Built to the web's StayDrawer as the previous helper captured it. **Changed:** the foot is the server's figures (MFD-3), and while nights are to come says Balance with "Charges to come" instead of the web's Due. |
| Check in | none in this copy (as above) | **Not compared to a picture today.** **Changed:** the move sentence says the rate and the GST rate, not the web's total (MFD-3). |
| Take a walk-in | none: the phone's own screen | Nothing to compare. |
| The desk's landing | `roles/r-reception-home` | The Dashboard (reports' module and `app/hotel/`, not this lane). **Left:** its Arrivals, Due out and In house tiles open nothing on the phone; they open this module on the web: a core change, in the report. |

**4 of 6 pictures match with nothing left** (04, 05, 06, 07); 08 matches but for where Open
Calendar goes; 14 keeps the five differences above. The stay and Check in have no picture here.
