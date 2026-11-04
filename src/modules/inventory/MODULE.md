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
4. **Dates are stepped** (− / +, M-7), not typed in a date input.
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
