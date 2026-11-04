# reservations — the book, the Calendar and New booking (slice 10)

**Web twin** (today's PMS, read-only at `/home/user/hotelsfidato-ai/pms`, 2 Nov `a4527ea`):

| Web page (phone width) | Its data | API routes it calls | Gate (`api/src/roleGate.ts`) | Offline (`src/lib/offline.ts`) |
|---|---|---|---|---|
| Calendar `/h/:code/calendar` — `src/modules/front-desk/pages/StayView.tsx` (view `calendar`), `flows/AssignRoomFlow.tsx` | `front-desk/data/stayview.ts` getStayView | `GET /rooms` · `/stays?from&to&board=1` · `/house-now` · `/calendar-prices?from&days` · (`/folios` open, for the tooltip's balance: not read here) · `PUT /api/me/preferences` · `POST /stays/:id/assign` | reads: `anyone` (rooms, house-now), STAYS = `reservation` view (stays, calendar-prices); preferences SELF; assign ROOMING (`reservation` edit) | reads held; preferences **refused** (not listed); assign **held, warned** |
| All bookings `/h/:code/reservations` — `src/modules/reservations/pages/Reservations.tsx` | `front-desk/data/stays.ts` fetchStaysWhere | `GET /stays?since=` · `/stays?q=` | STAYS | read |
| New booking `/h/:code/book` (`?room=&date=`) — `pages/BookingPage.tsx`, `flows/BookedCard.tsx` | `data/groups.ts` createBooking, `data/booking.ts`; inventory's, guests', finance's, front desk's doors | `POST /bookings` · `POST /stays/:id/payments` · `/check-in` · `/assign` · `/confirm`; every list the walk-in reads (MFD module) | BOOK (`reservation` create); PAYMENT; CHECK_IN, ROOMING (`reservation` edit) | booking **refused** (not listed); payment **refused** (the web's sentence); check-in, assign **held, warned**; confirm refused |

`reservation` view is everyone but a chef and the Inventory Manager (`api/src/permissions.ts`): a refused
read shows the server's own sentence ("Reading bookings is for …").

**Decided:** M-1, M-5, M-7 (day steppers), M-9, M-11. **Pictures:** `reference/pms-shots/all/03-home-calendar`,
`12-bookings-all-bookings`, `14-bookings-new-booking` (all as dev-gm, `all/index.json`).

## Screens

| Screen | Route | File | Web twin |
|---|---|---|---|
| Calendar | `/reservations/<code>/calendar` | `Calendar.tsx`, `AssignRoom.tsx` | `/h/:code/calendar`; picture 03 |
| All bookings | `/reservations/<code>` | `AllBookings.tsx` | `/h/:code/reservations`; picture 12 |
| New booking | `/reservations/<code>/book` (`?room=306&date=2026-10-11` from an empty cell) | `NewBooking.tsx` | `/h/:code/book`; picture 14 |

Rules, each with a check: `chart.ts` (the tape chart, ported from `stayview.ts` and `StayView.tsx`),
`book.ts` (what New booking adds to the walk-in: lines, rooms, any day), `bookings.ts` (All bookings'
tiles and search), `roles.ts`. Calls: `data.ts`. **Imported, never copied:** front desk's
`booking.ts` (price of a line, discount, GSTIN, the one-room reasons), `data.ts` (rooms, house-now,
every list and write of the booking), `desk.ts`, `guestId.ts`, `GuestIdFields`, `Companions`,
`kit.tsx`, `StayList.tsx` (NotRead, Kept, the held marks); reports' `IconChip`.

## How each act goes

- **A bar** opens the stay (`/front-desk/<code>/stay/<id>`), where its pill, bill and acts are front desk's.
- **An empty cell** opens New booking on that room and night: tonight's is a walk-in (the Walk-in
  source, Check in now the filled button). A role that may not book gets the API's sentence when it taps.
- **Assign room**: a booking still to arrive with no room, then a room free of a guest and of a block
  on its nights; front desk's assign (held offline, warned). Greyed with the sentence for a role refused.
- **Room type / Floor**: per person on the server (087), as the web; a refused save says "Not remembered".
- **New booking**: one line seeded; "Another room" adds a line; more than one room shows "Group name" and
  is a group the server makes. Save booking, Save and assign room (a picked room kept, per booking in the
  lines' order, `toAssign`), Check in now (one room, arriving today): the booking, the advance FIRST
  (D27-328), the check-in, the assigns; each later step said on the Booked card. Over a company's credit
  limit (`needs: "credit-limit"`, D27-275): the server's sentence under the buttons, "Allow, with reason"
  for the owner, an administrator or the GM, the sentence of who can for anyone else.
- **One tap, one write** (MEMORY 8): New booking and Assign room are latched at the tap. The advance has a
  keeper per booking's bill (`data.ts`, MFIN-1); it is sent once from this page.

**Money is the server's (MFD-3).** The night price, the GST rate and the tariff are the server's. The
web's Room charges, GST and Due (New booking) and a line's tax in rupees are sums the browser makes: the
phone shows each line's night price and its GST rate and says the bill carries the totals (PMS request
R-22 asks for a quote). The Calendar's "4.1k" is the server's night price as the web prints it; its
availability, occupancy percent and tile counts are the web's own counting of the server's rows, ported.

## Where the phone differs from the web

1. **Greyed, not hidden** (AGENTS rule 1): Assign room for a role without `reservation` edit; an empty
   cell for one that may not book says why when tapped (the web draws a plain cell).
2. **Rooms** (the desk's tiles, `/h/:code/stay`) is not on the phone: its segment says "On the website for now".
3. **No tooltip**: the web's hover over a bar (dates, rate, balance) is the stay's own screen on a tap; the
   open bills are not read for it.
4. **Dates** are the day stepper (M-7): Arrival, Departure, "Bookings leaving from".
5. **On the website for now** (greyed): the guest's page link, Send voucher, View voucher (Booked card);
   left out: the sales-people list's keeper button (KeepListDialog), "Book this lead" (`?lead=`), the
   Start here cards above the chart, the group's page (Open the booking opens the lead room's stay).
6. **New booking follows the picture and the walk-in**, not the PMS's D27-392 of after the picture (Normal
   guest / Company guest, a company guest's GSTIN required, the GSTIN looked up on Companies and agents):
   a question for the owner.
7. **All bookings follows today's PMS** (D27-387, 2 Nov, after the picture): the last 90 days and a search.

## Picture match (4 Nov)

Compared by reading the code against each picture and its words, section by section; **never seen
running** (this copy has no phone, no preview and no API). Sizes: the pictures were shot with a mouse;
every target here is 44 px or more.

| Screen | Picture | Result |
|---|---|---|
| Calendar | `all/03-home-calendar` | **Matches in look**: the eyebrow, Calendar, the hotel's name; Calendar · Rooms; Room type · Floor and + Assign room; the eight tiles (Sellable navy, the chips' colours, Arriving and Due out warm with a count, Needs cleaning green at 0); the toolbar's round ‹ ›, "11 Oct 2026 – 24 Oct 2026", the seven-colour key; the 72 px room column with its sparkle and wrench; three nights and a quarter, today navy; each type's row (the free count, red at 0, over "4.1k"); the bars in the web's colours with the source's icon; the pinned footer (Available, the orange bar, the percent). **Left:** (1) Rooms opens nothing (website); (2) no fade at the chart's right edge (the web's mask); (3) a bar has no tooltip (it opens the stay). |
| All bookings | `all/12-bookings-all-bookings` | **Differences left:** (1) the pill says "N shown" and the line "Bookings leaving from … on, and everything ahead …", with a "Bookings leaving from" stepper above the search, where the picture says "815 on file" and "Every booking on the file, in any state": the PMS changed after the picture (D27-387, 2 Nov), the phone follows today's code; (2) the stepper is the phone's (M-7), the web a date box. **The rest matches:** the search box "Guest, reference or room", the five tiles scrolling (All navy, Due in orange, In house blue), "N of N", each card (room or a dash, the state's pill and chevron, guest, reference, Type · Plan · Source · Arrival · Departure · Nights · Rate). |
| New booking | `all/14-bookings-new-booking` | **Differences left:** (1) a line's price says "₹3,699.00 a night + tax (5%) · 1 night", not "+ ₹184.95 tax"; The booking card shows Nights, Rooms, "1 × Deluxe ₹3,699 a night · GST 5%" and a sentence, not Room charges, GST and Due (MFD-3, R-22); (2) Arrival and Departure are day steppers (M-7), not date boxes. **The rest matches:** the title and its line, Guest (Salutation · Full name, Phone, Email, Company name, GSTIN, Company address, WhatsApp), Stay with + Another room (Booking source, Room type, Meal plan, Rooms · Adults, Children · Rate, Rate includes GST, Room "Assign later", Complimentary, "0 left · this books more than that", the price line), ID, Advance, the five folds in order, the card's divided rows, Save booking filled and the other two plain, the reason under them. |
| Assign room | none | **Not pictured**: built from `AssignRoomFlow.tsx`. |
| The Booked card | none | **Not pictured**: built from `BookedCard.tsx`. |

**1 of 3 pictured screens matches in look** (the Calendar, with three behaviours left); All bookings and
New booking keep the differences above, each with its reason. Groups (`all/13-bookings-groups`) is not
this slice: on the website.
