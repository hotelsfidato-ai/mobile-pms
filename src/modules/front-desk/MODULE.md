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
| The stay | `/front-desk/<code>/stay/<id>` (`?offer=1`: Check in offered) | `Stay.tsx` | the stay panel |
| Check in | `/front-desk/<code>/check-in/<id>` | `CheckIn.tsx` | the check-in dialog |
| Take a walk-in | `/front-desk/<code>/take-walk-in` | `TakeWalkIn.tsx` | **the phone's own**: the empty tiles of Rooms, until the Calendar (slice 10) |
| A walk-in (New booking on a room) | `/front-desk/<code>/walk-in?room=306` | `WalkIn.tsx` | `/h/:code/book?room=&date=`; 14 |

Shared: `StayList.tsx` (the cards, the filter, the four states, the blacklist warning), `GuestIdFields.tsx`,
`Companions.tsx`, `kit.tsx` (the web kit's pieces). Rules, each with a check: `desk.ts`, `guestId.ts`,
`booking.ts`, `roles.ts`. Calls: `data.ts`. **Hand-off:** the Bill, payments, settling and check-out
are `/folio/<code>/<id>` (the folio helper's): Due out's rows, the Bill tab, Settle and check out.

## Reads and writes

Reads: `/stays?from&to` · `/stays` (Walk-ins, as the web) · `/stays/:id` · `/stays?from&to&board=1`
(Take a walk-in) · `/rooms` · `/house-now` · `/stays/:id/folio` (a role with bills) ·
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

**Rights:** `roles.ts`, the API's sentences read back on 31 Oct (a refused curl as dev-housekeeping).
Check in, Book: greyed with the sentence, where the web hides them. Who sees bills: `invoice` view.
Money: the balances, the tariff and the tax rate are the server's. **The phone's sums:** the web's
own previews, in whole paise: the walk-in's price line and "The booking" card, the check-in's move
sentence, "N departures still owing ₹X". Each is what the picture shows; the server charges.

## Where the phone differs from the web

1. **Greyed, not hidden** (AGENTS rule 1): Check in, the walk-in's buttons.
2. **Touch sizes:** the web's own `pointer-coarse` 44 px (the pictures were shot with a mouse: 30 px
   tabs, 36 px boxes).
3. **Take a walk-in** is the phone's own screen, and Open Calendar opens it, until slice 10.
4. **A walk-in is one room, tonight:** no Another room, no Rooms box, no group, Arrival fixed; the
   Departure is the day stepper (M-7). Form III's dates are typed YYYY-MM-DD; the expected times HH:MM.
5. **Greyed "On the website for now":** More options (amend, move, exchange, inclusions, void, change
   rate), Print registration card, Add the photo (needs `expo-image-picker` ~57.0.20), Send voucher.
6. **Not on the phone yet, drawn nowhere:** Mark VIP and Edit guest, Guest 360, the guest page link,
   the CRS facts, key cards, a company's credit-limit allow (the core's `ApiError` has no `needs`).
7. **The stay's foot** says Charged · Paid · Balance from the folio; the web's "Due" with charges to
   come is finance's figure (the folio helper's).
8. **Font:** the web's body is Inter 400; the core loads 500-700 (report).
