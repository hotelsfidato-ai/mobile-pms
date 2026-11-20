# inventory — Rates, the quick change (Tier 2, slice 11)

**Built** 4 Nov 2026 by the cloud helper "t2-rates" on `mobile/t2-rates`, from `main` at `cfce55d`.
Read against the PMS at `a4527ea` (2 Nov) and the pictures; **never opened on a screen** (the cloud
has no API, no Expo and no phone). Defects: `DEFECTS.md`, prefix **MINV-**.

## The web twin, mapped first

| | |
|---|---|
| Page | `src/modules/inventory/pages/Rates.tsx` at `/h/:code/rates`; `/pricing`, `/grids`, `/rate-plans` redirect to it (`routes.tsx`). One screen since D27-188/D27-194 replaced Pricing, Rate plans, the Rate calendar and Rate performance. Menu: "Rates", Rooms and rates, `resource: "rate"` (`nav.ts`) |
| Data | `data/pricing.ts` (getPricing, getBreakup, setBasePrice; setBasis, setAddon), `data/rates.ts` (getInventory, setRestriction), `data/rateGrid.ts` (getRateDays), `data/rateSetup.ts` (removeRate, setRackRate) |
| Routes and gates (`api/src/roleGate.ts`) | `GET /:code/pricing` and `GET /:code/rates`: PRICES = `rate` view · `GET /:code/inventory`: `inventory` or `reservation` view · `PUT /:code/pricing/base`, `/basis`, `/addon`, `PUT /room-types/:id/rate`, `DELETE /rate-plans/:id`: PRICE = `rate` edit, "Setting a price" · `POST /:code/restrictions`: RESTRICTION = `rate` edit, "Setting a stop sell or a minimum stay". `rate` edit is exactly RATE_SETTER_ROLES: owner, admin, GM, revenue manager (INV-5) |
| Offline (`src/lib/offline.ts`) | **no rate write is listed**, so every one is refused with the unlisted sentence ("This cannot be done offline yet. …"); the web's MODULE.md: "Offline, a rate or room write is refused" |

API code read: `api/src/modules/inventory/pricing.ts` (GET 66-296, PUT base 359-430), `rates.ts`
(inventory 468-529, restrictions 778-844), `rateGrid.ts` (34-77), `rateSetters.ts`,
`api/src/validate.ts` priceProblem.

## The screen

| Screen | Route | Web twin | File |
|---|---|---|---|
| Rates (Prices · Rooms left) | `app/inventory/[code]/index.tsx` → `/inventory/5EL` | `/h/:code/rates` | `Rates.tsx`, `Grid.tsx`, `Dialogs.tsx`, `kit.tsx` |

**The quick change** — what a revenue manager or GM changes from a phone:

1. **A room type's base for a day, or through a later day**: tap a price in the calendar (the
   web's BaseDialog: Base per night, Free, Through, Clear, Set base), or **Set prices** (the same
   dialog with a Room type and a From). `PUT /pricing/base {roomTypeId, from, to, price, free?}`;
   `to` is the first day NOT covered (half-open). With a base room type chosen, only its base (and
   an Independent type's) is typed; the others follow it, as the web.
2. **Closing or opening a day** (Rooms left, tap a day): Stop sell, Closed to arrival, Closed to
   departure, Minimum and Maximum nights, Through. `POST /restrictions` (inclusive range). Unticking
   everything opens the day: the server removes the empty rule.

**Read, as the web reads it:** each type's base with its rooms left (`GET /pricing?plan=EP` and
`GET /inventory`), each type's break-up (`GET /pricing?breakup=<type>`: 2 guests, CP … AI, a
further adult or child only where one fits), how each day sold (`GET /rates`: paying rooms sold,
occupancy, ADR, revenue), How rates are built and Prices set before (from `GET /pricing`).

**Left on the website** (heavy set-up; drawn as the picture, the control disabled with "On the
website for now"): How rates are built's **Edit** (the base room type, each type's difference, the
add-ons: `PUT /pricing/basis`, `/pricing/addon`), Prices set before's **Remove** (`DELETE
/rate-plans/:id`, `PUT /room-types/:id/rate`), and the four report links (Manager report, Monthly
occupancy, Monthly statistics, Revenue outlook — no phone screens). Not on this screen at all, and
staying on the website: room types and rooms, rate plans and meal plans (settings console),
cancellation terms, booking sources, the old `PUT /pricing/offset` (no web screen calls it).

## The rules (each ported, with its source in a comment)

- **Money is the server's.** Every figure on the screen is the server's, drawn as sent:
  `rates.ts rupees` keeps paise (₹4,099.50, never rounded to ₹4,100 — MEMORY 9; the web's money()
  rounds). Not set is a dash, never ₹0; a typed 0 is "Free" only when the server says 0.
- **What is typed is what is sent.** The price field keeps only digits and one point with two
  places (`typedPrice`), so the field shows exactly the figure the server gets; empty sends nothing
  (Set base is off), never a zero and never a clear. A typed 0 not ticked Free is sent and the
  server refuses it in its own words ("0 is kept only when it is ticked Free…"). Nights are digits;
  empty is no rule, never 0. After a write the grid is read again: what shows is the server's.
- **Rights are the API's** (`roles.ts`, the role gate's own grants and `refusalFor` sentence, over
  the core's port of the matrix). A refused control is disabled with that sentence, never hidden.
- **One tap, one write**: each dialog latches at the tap (`useRef`, MEMORY 8). A price is a PUT of
  a value and a restriction an upsert, so no key keeper is needed (nothing moves money).
- **Offline as the web**: both writes are refused by `send()` with the web's sentence (ApiError
  503), shown in the dialog; nothing is held.
- Reads through `useRead` with keys `["inventory", code, …]`; a write invalidates `["inventory", code]`.

## States

Loading "Reading the rates…" / "Reading the prices…" (break-up cells "…") · failed: the read's
title and the server's words, Try again; over a last good read, "Could not read this again: …" ·
offline: "No connection" and its own words · empty: "No room types" and the web's sentence · a role
the API refuses: the API's "Reading prices is for …" sentence and nothing read.

## Where the phone differs from the web (each for the owner's eye)

1. **Set prices, Edit and Remove for a role that may not set a price** (hotel manager, reception,
   viewer): the web hides them; the phone shows them disabled with the API's sentence (AGENTS rule 1).
2. **Edit and Remove** are disabled for the rate setters too: "On the website for now" (set-up, the brief).
3. **Paise are shown** where the server sends them (ADR is usually not whole: ₹3,222.22 where the
   web shows ₹3,222) — MEMORY 9.
4. **Dates** are the phone's own date picker (M-16), as the web's date inputs.
5. **The toolbar's arrows are 44 px**, the web's 36 (touch targets).
6. A read that fails says so (the web's `getInventory` turns every failure into "No room types").

## Picture match (4 Nov)

Compared by reading the code against the pictures, never seen running.

| Screen | Pictures | Result |
|---|---|---|
| Rates, Prices | `all/27-rooms-and-rates-pricing`, `all/28-rooms-and-rates-rate-calendar` (the same page as dev-gm: identical `.png` and `.txt`, both `/h/5EL/rates`) | **Matches, with the differences left below** |
| Rates, Rooms left | not pictured | built from `Rates.tsx` InventoryGrid and Legend |
| Base and Set prices dialogs, Restriction dialog | not pictured | built from `Rates.tsx` BaseDialog and RestrictionDialog |

Section by section, Prices: the title and its line · the Prices / Rooms left switch, full width ·
Set prices, orange · the edge-to-edge card: ‹ › and "11 Oct 2026 – 24 Oct 2026" · the head
"BASE, ONE GUEST, ROOM ONLY", each day's weekday and date, the business date navy, weekends grey ·
each room type's grey row (its base, "N left", red at 0; a price set before grey and italic, a
derived one grey, a base bold) and its break-up rows · Paying rooms sold with the orange capsule
and the occupancy · ADR · Revenue · "Tap any price …" and the key · How rates are built · Prices
set before · the four report names. Same words, order, grouping; colours from `theme.ts`.

Differences left, each with its reason:

1. **Edit** (How rates are built) and **Remove** (Prices set before) are disabled with "On the
   website for now" under the card's line — heavy set-up stays on the website (the brief).
2. **The report links are grey**, with "On the website for now" — the phone has none of those screens.
3. **ADR (and any price with paise) shows its paise** — MEMORY 9; the picture's ₹3,222 reads
   ₹3,222.22 if that is what the server sent.
4. **The arrows are 44 px circles** (the picture's are 36): touch targets.
5. **The italic of a price set before** is the phone's slant of Inter Medium (no italic face is
   loaded; `fontStyle: "italic"`); it may not slant on iOS.
6. The top bar and the business-date banner are the frame's (`app/_layout.tsx`), not this screen's.

**1 of 1 pictured screens matches its picture** (with the six differences above); 2 states/dialogs
not pictured.

## Definition of done

```
Screen          Rates, app/inventory/[code]/index.tsx (/inventory/:code); the menu's Rates (PHONE_ROUTES line asked of the mobile chat)
Web twin        /h/:code/rates (Rates.tsx); differences above
Picture         all/27 and all/28 (one page); compared by reading code only
Reads/Writes    GET /inventory, /pricing?plan=EP, /pricing?breakup=, /rates · PUT /pricing/base, POST /restrictions - data.ts
Rules           roles.ts (PRICES, PRICE, RESTRICTION; the gate's sentence), rates.ts; checks beside each
Offline         both writes refused with the web's unlisted sentence; nothing held
States          loading · failed · empty · offline · refused, different words
What I saw      nothing: never opened on a screen (the cloud has no API or phone)
Accessibility   44 px targets; every icon button labelled (arrows, steppers, close); cells labelled "<type> on <date>"
Packages        none
```

---

# Lane m13-config — the property's set-up (19-20 Nov 2026, M-13)

**Built** by the cloud helper "m13-config" on `mobile/m13-config`, from `main` at `296c018` (main
merged in twice: `fcd62f6` export and NATIVE.md, `28fb63e` gates). Read against the PMS at
`c9394cb` (16 Nov) and the pictures; **never opened on a screen** (the cloud has no API, no Expo and
no phone). New files only: `config.ts` (+check), `configRoles.ts` (+check), `configData.ts`,
`configKit.tsx`, `suChannels.ts`, `RoomTypes.tsx`, `CancellationTerms.tsx`, `BookingSources.tsx`,
`Places.tsx`, `Channels.tsx`, `GroupRates.tsx`; routes `app/inventory/[code]/{room-types,
booking-sources,cancellation-terms,channels,places,group-rates}.tsx`. Defects: MINV-C1 to C3.

## The web twin, mapped first

| Screen | Web page | Reads · writes | Who (api/src/roleGate.ts and the routes) |
|---|---|---|---|
| Room types | `/settings/rooms/room-types` (`/h/:code/room-types` redirects), `inventory/pages/RoomSetup.tsx`, `data/roomSetup.ts` | GET `/room-setup`, `/amenities`, `/room-types/:id/amenities` · POST/PATCH/DELETE `/room-types`, `/rooms`; PUT `/room-types/:id/amenities` | read SETUP (`room_config` view); add SETUP_ADD (`room_config` create), change/remove SETUP_CHANGE (`room_config` edit) = owner, admin, GM; the page is the settings console's (owner, admin, GM) |
| Cancellation terms | `/h/:code/cancellation-terms`, `inventory/pages/CancellationTerms.tsx`, `data/rateSetup.ts` | GET/POST `/cancellation-policies`, DELETE `/:id`, PUT `/:id/default` | read PRICES (`rate` view); write TERMS (`rate` edit: owner, admin, GM, revenue manager) |
| Booking sources | `/h/:code/booking-sources`, `guests/pages/BookingSources.tsx`, `guests/data/bookingSources.ts` | GET/POST `/booking-sources`, PATCH `/:id`, PUT `/:id/commission` | read `reservation` or `commission` view; add/change `own`: the database's `app.is_manager()` (owner, admin or GM at ANY hotel, or a group administrator; migration 198); commission COMMISSION (owner, admin, GM) |
| Channel manager | `/h/:code/channels`, `channel-manager/pages/ChannelManager.tsx`, `components/SuSetup.tsx`, `data/su.ts` | GET `/api/channel-manager/su`, `/channel-manager/{content,availability,bookings}` · POST `su/login`, PUT `hotel`, `room-types/:id`, `rate-plans/:plan`, POST `content/send`, `availability/send`, `bookings/:id/done` | the page: the menu's owner, admin, GM (`seesComingSoon`); the SU setup `own`: access.ts SU_ROLES (owner, admin); the bookings CHANNEL_BOOKING_ROLES (+ GM) |
| Places and suppliers | `/h/:code/places`, `src/pages/PlacesAndSuppliers.tsx` | GET `/places` (with `mayChange`, `whoMay`) · POST/PUT `/places`, `/suppliers` | read anyone rostered; change `own`: routes/places.ts PLACE_KEEPERS (owner, admin, GM, hotel manager, Inventory Manager); the page: the Store's or equipment's readers |
| Group rate change | `/group-rates`, `inventory/pages/GroupRates.tsx`, `data/groupRates.ts` | GET/POST `/api/group/rate-change` | `own`: groupRates.ts, PUT pricing/base's PRICE rule at every property; the page: a price setter over more than one real property |

**Offline** (`src/lib/offline.ts`, the core's copy checked equal): none of these writes is listed,
so every one is refused by `send()` with the web's sentence for an unlisted write; nothing is held.
The right's sentences are the gate's own (`configRoles.ts`, pinned in its check).

## The rules (config.ts, configRoles.ts; each with its source)

- **No price is invented, typed is sent.** A room type is created unpriced (no rate field). A
  retention, a commission, a group price change are typed into fields that keep only what can be
  sent (`typedFigure`, `typedCount`, `typedSigned`: a minus only on By ₹ / By %), so NaN never
  reaches a body (MINV-1). Empty is null, never 0: a blank free window is "no free window", a typed
  0 is "check-in time"; a blank commission is "no rate agreed" (a dash), 0 is "0%". The money box
  placeholders are "-", not the web's "1500".
- **Figures are the server's**: a flat fee, a rack rate, a site's total, a group run's old and new
  price are shown as sent, paise kept (rates.ts `rupees`, MEMORY 9); missing is a dash. Group rate
  change shows the server's preview and saves exactly what was shown; the phone works nothing out.
- **Rights**: every refused control is grey with the API's sentence (Add, Edit, New policy,
  Commission, the SU setup's card), never hidden. Places use the server's own `mayChange`/`whoMay`.
- **Asked first** (the brief; each phone's own `Alert`): Remove a room type, Remove a room (the web
  asks too, in these words), Retire a policy and Switch off a place or a supplier (the web does not
  ask: the phone does, in the web's toast words).
- **One tap, one write**: every write latches at the tap. **Unknown outcome** (MEMORY 16): an add
  whose reply was lost (room type, room, several rooms, policy, source, place, supplier) and a send
  to SU take no more taps until the screen is read again (`useStuck`, `notKnown`); Group rate
  change empties its figure and says so. PUTs and PATCHes that set a value need no stop.
- **Exports**: Cancellation terms and Booking sources carry `ExportButtons` (the web's two list
  exports; neither holds money or guests, so every reader may export).

## Picture match (19-20 Nov)

Compared by reading the code against the pictures, never seen running.

| Screen | Picture | Result |
|---|---|---|
| Room types | `all/23-configuration-room-types` (dev-gm, 31 Oct) | **Matches, with differences 1-4** |
| Cancellation terms | `all/25-configuration-cancellation-terms` (the empty state) | **Matches, with difference 5**; the list and the form not pictured (built from the code) |
| Booking sources | `all/26-configuration-booking-sources` | **Matches, with difference 6** |
| Channel manager | `all/73-coming-soon-channel-manager` (the GM: no SU setup) | **Matches, with difference 7**; the SU setup (owner, admin) not pictured |
| Places and suppliers | `all/33-store-and-equipment-places-and-suppliers` | **Matches, with difference 8** |
| Group rate change | none (new on 16 Nov) | built from the code; not pictured |
| `all/24-configuration-rate-plans` | `/h/5EL/rate-plans` redirects to Rates | the Rates screen's (t2-rates); not this lane's |

Differences left, each with its reason:

1. **Import** and a type's **Photos**: on the phone since M-16 (below).
2. **The rooms are not dragged into order**: the grip is not drawn; the line under Rooms says
   putting them in order is on the website. The **colour** is typed (#1f6f5c) beside a swatch: no colour picker.
3. **Edit and the room tiles for a role that may not change the setup** are grey with the gate's
   sentence (the settings console only lets the owner, admin and GM in, so this is only seen if the
   matrix changes).
4. A room type's sheet is one column (the web's two-column grid of counts is too narrow at 375).
5. **New policy and Write the first one** are grey with the gate's sentence for a role that reads
   prices but may not write terms (reception, the hotel manager); the web shows them and the server
   refuses. The export buttons sit above New policy (the picture predates the export, D27-383).
6. **Commission and Edit** are grey for a role the server would refuse, the two sentences said once
   under the explainer; the export buttons sit above Add a source (newer than the picture). The
   channel code is picked from SU's list in a searchable sheet (the web's select of 260 sites).
7. Each section's (i) note is said under its heading (no tooltip on a phone); "Booking sources" in
   the last card is a link to the phone's own screen. Set-up fields are one column.
8. A supplier's phone number is a link that opens the dialler (NATIVE.md).

**5 of 5 pictured screens match their pictures** (with the eight differences above); Group rate
change and the SU setup are not pictured.

## Definition of done

```
Screens         Room types, Cancellation terms, Booking sources, Channel manager, Places and suppliers, Group rate change
                app/inventory/[code]/{room-types,cancellation-terms,booking-sources,channels,places,group-rates}.tsx
Web twins       above; differences above
Pictures        all/23, 25, 26, 33, 73; compared by reading code only
Reads/Writes    configData.ts, every call through api()/send()
Rules           config.ts, configRoles.ts, their checks (each broken once on purpose)
Offline         every write refused with the web's unlisted sentence; nothing held
States          loading (spinner, words) · failed (the server's words, Try again) · offline (No connection) · empty (the web's words) · refused (the API's sentence, or "This page is not part of your role")
What I saw      nothing: never opened on a screen
Accessibility   44 px targets, icon buttons labelled, native Switch and Alert, safe areas in every sheet
Packages        none (expo-document-picker, expo-image-picker asked)
```

## m16 pickers (20 Nov) — lane m16-pick-pos, PICKERS.md 2.9, 2.10

Nothing here was opened on a phone or a preview: built from the web's code at c9394cb.

| Row | Control | Where | How |
|---|---|---|---|
| 2.9 | Import (room types, then rooms) | `RoomTypes.tsx`, pos `ImportSheet.tsx` | The shared sheet with core `ROOM_TYPE_SPEC` / `ROOM_SPEC`; POST `/room-types/import`, `/rooms/import` `{ rows, dryRun }` (`configData.ts` importSetup). After room types land, closing the sheet offers the rooms file, as the web. Grey with SETUP_ADD's sentence. |
| 2.10 | A room type's photos | `TypePhotos.tsx` (the type's Photos tab) | Take or choose (`pickPhoto`, full quality) → `fitPhoto(PHOTO)`: redrawn on the phone as the web's shrinkPhoto (upright, 1600 px at most on the long side, never enlarged, a JPEG at 0.85; expo-image-manipulator ~57.0.21, M-18); the server checks 600 KB and its sentence is shown → POST `…/photos { data }`; Earlier / Later (PUT `…/photos/order`, the whole list), Delete asked first (the phone's own dialog, M-16); shown from `{ type, data }` with `dataUrl`. Changing is SETUP_CHANGE's. |
| opt. | Group rates' From / Through; the rate dialogs' From / Through | `GroupRates.tsx`, `Dialogs.tsx` | `DateField` (the M-7 stepper gone). |

**Repeats (the API, read 20 Nov):** POST a photo reads no key and adds a SECOND photo on a repeat, so
an add whose reply was lost greys Add until the list is read again (`photosStop`); a landed order or
delete greys the arrows until a read begun after it (`<name>/fresh`, MEMORY 24). An import of room
types or rooms updates on a repeat; the real import is still one per tap (`setupImportStop`).
