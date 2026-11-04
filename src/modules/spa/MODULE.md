# spa — the day's treatments by therapist and time, away from a desk (Tier 2, slice 14)

**Web twin:** `src/modules/spa/` in the PMS (`MODULE.md`, `DEFECTS.md`, `pages/SpaDiary.tsx`,
`pages/SpaSetup.tsx`, `data/spa.ts`, `nav.ts`: "Spa diary" at `/h/:code/spa`, resource `spa`); the
API in `api/src/modules/spa/spa.ts` (its own role lists: `roleGate.ts` says `own("spa/spa.ts: its
own role lists")`), the tables and guards in `db/migrations/119_the_spa.sql`, the offline tiers in
`src/lib/offline.ts`. **Decided:** M-1, M-9, M-11. The web's decisions: D17-54 (the per-hotel
switch), D18-6 (booked from a telephone call, against a stay), D18-8 (no therapist logins),
D18-21 (who: reception books and closes, housekeeping only looks, the owner / an administrator /
the GM set the list), D18-22 (a treatment goes on the room bill; "settled at the spa" set aside),
D27-136 / SPA-3 (a day of the guest's stay; Charge to room once checked in), D27-120 (0 only when
ticked Free).

## The web twin's map (4 Nov)

| Web page / act | Address | API it calls | Who (spa.ts) | Offline (src/lib/offline.ts) |
|---|---|---|---|---|
| Spa diary | `/h/:code/spa` | `GET /spa[?from=&to=]` (no date: the property's business date) | SPA_READ_ROLES | a read |
| Book a treatment (dialog) | on the diary | `GET /stays` (the front desk's), `GET /spa/treatments`, `GET /spa/therapists`, `POST /spa/appointments` | read; SPA_BOOK_ROLES | **refused** (not listed: UNLISTED) |
| Cancel (dialog, a reason) | on a booked row | `POST /spa/appointments/:id/cancel` | SPA_BOOK_ROLES | **refused** |
| Charge to room (dialog) | on a booked, priced row | `POST /spa/appointments/:id/close` → finance's `postCharge` (tax kind `spa`, category Spa) | SPA_BOOK_ROLES | **refused** |
| Treatments and therapists | `/h/:code/spa/setup` | `GET`, `POST`, `PATCH /spa/treatments[/:id]`, `/spa/therapists[/:id]` | read; SPA_LIST_ROLES | **refused** — stays on the website |

SPA_READ_ROLES: owner, admin, GM, hotel manager, reception, housekeeping (since SPA-2 the matrix's
`spa` view too). SPA_BOOK_ROLES: the first five. SPA_LIST_ROLES: owner, admin, GM. A group
administrator counts as the owner. Every route also asks `app.module_enabled(hotel, 'spa')` and
answers 403 "This property has no spa. Turn it on in the property's settings if that is wrong."
**No spa path is on the web's offline list**, so every spa write is refused offline with the
UNLISTED sentence and held nowhere (`diary.check.ts` holds it). **403 is "you may not", 409 "that
cannot be done"**: both are shown as the server's own sentence.

## Screens

| Screen | Route → file | Picture | Reads (key `["spa", code, …]`) |
|---|---|---|---|
| Spa diary | `app/spa/[code]/index.tsx` → `Diary.tsx` | `pms-shots/new/n-h-spa` (dev-gm) | `GET /spa[?from=day&to=day]` |
| Book a treatment (dialog) | on the diary → `Acts.tsx` `Book` | not pictured | `GET /stays`, `GET /spa/treatments`, `GET /spa/therapists` |
| Cancel this treatment (dialog) | on a row → `Acts.tsx` `Cancel` | not pictured | — |
| Charge this treatment to the room (dialog) | on a row → `Acts.tsx` `Charge` | not pictured | — |

Rules: `diary.ts` (`diary.check.ts`); rights: `roles.ts` (`roles.check.ts`); calls: `data.ts`. The
pieces are imported, never edited: the guest-services kit (`Btn`, `Dialog`, `Field`, `Input`,
`Select`, `Toast`, the states), the laundry kit (`StatePill`, `LoadFailed`) and guest-services'
`timeOf`. Every accepted write re-reads `["spa", code]`. No poll: the web's diary does not poll.

## The states a booking has (the server's)

`spa_appointments.status` is `booked`, `completed` or `cancelled` (migration 119), and `settlement`
is `room` or `spa` once completed. The diary leaves cancelled ones out (`app.spa_diary`).

| State | The row shows (the web's) | Acts |
|---|---|---|
| booked, priced | time → time, the agreed amount | Cancel, Charge to room |
| booked, unpriced (`amount` null) | a dash, and "Unpriced - it cannot be closed for money. …" | Cancel only |
| completed, `settlement: room` | pill **On the room** (info) | none |
| completed, `settlement: spa` | pill **Paid at the spa** (success) | none (nothing writes it today: D18-22) |

**There is no "arrived" or "done" state** in the web, the API or the table, and no act that writes
"paid at the spa": the phone has none either. Charge to room is the treatment's "done".

## Writes, who, offline

| Write | Endpoint | Shown when (the web) | Who | Offline |
|---|---|---|---|---|
| Book it | `POST /spa/appointments` `{stayId, treatmentId, therapistId, startsAt}` | always; the dialog checks guest, treatment, therapist, time in the web's order (`bookBody`) | `whyNotBook` | refused, the web's sentence |
| Cancel the treatment | `POST /appointments/:id/cancel` `{reason}` | booked (`actsOf`) | `whyNotBook` | refused |
| Charge to room | `POST /appointments/:id/close` `{}` | booked and priced (`actsOf`) | `whyNotBook` | refused |

**A role the API refuses** (housekeeping) sees Book a treatment, Cancel and Charge to room grey,
with the API's sentence under Book a treatment (AGENTS rule 1); the web leaves them out and shows
its own card instead ("Your role sees the diary and does not book. Taking or cancelling a treatment
is reception's, the manager's, an administrator's or the owner's — ask one of them."), which the
phone leaves out: the API's sentence under the grey button says the same. **A state that rules an act out** leaves it out, as the web: no Charge to room while
unpriced, nothing on a completed row.

**One tap, one write** (MEMORY 8): each write is latched at the tap (`useRef`), its button greys
("Booking…", "Cancelling…", "Charging…"). **Charge to room has a keeper** (`diary.ts`
`chargeKeys`, one per appointment; core `keys.ts`): tapped again after a lost reply it keeps its
key; a diary read that began after the failure and SHOWS that appointment lets it go; a read of
another day, or another hotel, does not. It stays latched until the diary is read again after it
lands. The spa API does not read the idempotency key: what keeps a treatment off the bill twice is
the server's lock on the row (`for update`) and its "That treatment is already closed and on the bill."

**The time** is typed (no time-picker package; the web has a time input), on the 24-hour clock, and
said back under the field as the diary will show it ("At 4:00 AM on 11 Oct 2026.", MSPA-1). It is
sent with the day being looked at, as typed: `2026-10-11T16:00`, no offset. No end: the length is
the treatment's.

## Money

- **A price is the price list's, the amount the server's** (`agreed_amount`, fixed when booked):
  null is unpriced, a dash, never ₹0; 0 is a price (ticked Free) and may be charged (the server
  closes it with no line on the bill).
- **A figure is shown as the server sent it** (`rupees`): "₹2,500" where whole, as the web's
  `money()`; "₹1,250.50" where it carries paise — the web's `money()` would show ₹1,251 (MEMORY 9).
- **The web adds no money on the device** here: the count under the title is a count of bookings.
  Nothing on the phone sets a price; tax is the server's (the spa's own GST rule, D18-21).

## On the website for now (grey, with the reason)

- **Treatments and therapists** (`/h/:code/spa/setup`, picture `new/n-h-spa-setup`): adding,
  changing, pricing and retiring a treatment; adding and taking a therapist off the list. Desk
  set-up (M-3); the brief keeps it on the website. Its button on the diary is grey, with
  "Treatments and therapists: On the website for now" (or the API's LIST_REFUSED sentence for a
  role that may not), and so is "Add a therapist" on the empty diary. Only how a treatment's price
  shows is used ("Aromatherapy massage · 60 min · ₹2,500", "· unpriced" in the booking's picker).

## Where the phone differs from the web (for the owner's look)

1. **Rights:** grey with the API's sentence where the web leaves the button out (Book a treatment,
   Cancel, Charge to room for housekeeping; Treatments and therapists for everybody, on the website).
2. **The time is typed** and said back under the field (MSPA-1); the web's time input picks it.
3. **The guest picker** opens from the foot of the screen (the kit's `Select`), as the web's native
   select does on a phone.
4. **Figures keep their paise** (above).
5. **Book a treatment is grey until the diary has loaded**: it books on the day being looked at.

## Picture match (4 Nov)

Compared by reading the code against the picture (`reference/pms-shots/new/`, 390 px wide, taken at
2x), measured on the file; never seen running. The web's top bar and the business-date line are the
shell's (mobile/shell), not this module's. The picture (31 Oct) is not older than the code that
matters: its words equal today's `SpaDiary.tsx`, word for word (MEMORY 14).

| Screen | Picture | Result |
|---|---|---|
| Spa diary | `new/n-h-spa` (dev-gm) | **Matches**, with these differences left: (a) **Treatments and therapists** is grey, with "Treatments and therapists: On the website for now" under the two buttons (the set-up stays on the website); (b) buttons are **44 px** (the picture's 36): touch targets of 44 px or more (AGENTS); (c) for a role the API refuses booking, Book a treatment, Cancel and Charge to room are grey with the API's sentence (the picture is the GM's, who may). The title, the count line, the two buttons in that order with their icons, the one chart card, its toolbar ("← Day before", "Today" with the calendar, "Day after →", wrapping), each therapist's grey-50 band (name semibold, "1 today" small grey), each row (the hour semibold, the amount level at the right — a grey dash when unpriced, the treatment, the guest · Room in grey, the unpriced sentence in small grey, Cancel and Charge to room at the right), the hairlines, are the web's code. |
| Book a treatment | none (a dialog) | **Not pictured**: built from `BookDialog`, its words and order; difference 2. |
| Cancel this treatment | none | **Not pictured**: built from `CancelDialog`. |
| Charge this treatment to the room | none | **Not pictured**: built from `CloseDialog`. |
| States not pictured | — | Loading ("Reading the spa diary…"), failed (the server's words), offline ("No connection"), a re-read that failed over the last answer, no therapists ("No therapists yet"), a free therapist ("Free all day."), On the room / Paid at the spa pills, a role that may only look, the spa switched off (the server's sentence): built from the web's code. |
| Treatments and therapists | `new/n-h-spa-setup` | **On the website** (not built); only how a price shows is used. |

**1 of 1 pictured screens matches its picture** (with the differences listed); three dialogs are
not pictured; the set-up screen stays on the website.
