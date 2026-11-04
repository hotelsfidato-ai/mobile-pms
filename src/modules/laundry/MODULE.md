# laundry — a guest's bag and the hotel's own linen, away from a desk (Tier 2, slice 13)

**Web twin:** `src/modules/laundry/` in the PMS (`MODULE.md`, `DEFECTS.md`, `pages/Dockets.tsx`,
`pages/Docket.tsx`, `pages/PriceList.tsx`, `data/laundry.ts`, `nav.ts`, `routes.tsx`); the API in
`api/src/modules/laundry/laundry.ts`, its gates in `api/src/roleGate.ts` (LAUNDRY, LAUNDRY_TAKE,
LAUNDRY_CHANGE, LAUNDRY_CANCEL, LAUNDRY_CHARGE), who holds `laundry` in `api/src/permissions.ts`
(D18-8), the offline tiers in `src/lib/offline.ts`. **Decided:** M-1, M-9, M-11. The web's decisions:
D17-54 (the per-hotel switch), D18-5 (whose it is), D18-7 (the charge), D18-8 (who), D27-136 / LAU-4
(a guest in the house only).

## The web twin's map (4 Nov)

| Web page | Address | API it calls | Gate (roleGate.ts) | Offline (src/lib/offline.ts) |
|---|---|---|---|---|
| Dockets | `/h/:code/laundry` | `GET /laundry/dockets[?whose=]` | `laundry` view | a read |
| Collect a bag (dialog) | on Dockets | `GET /laundry/price-list`, `GET /stays`, `POST /laundry/dockets` | view; `reservation` view; `laundry` create | **refused** (not listed: UNLISTED) |
| A docket | `/h/:code/laundry/:id` | `GET /laundry/dockets/:id` | `laundry` view | a read |
| Record what came back | on a docket | `POST /laundry/dockets/:id/return` | `laundry` edit | **refused** |
| Charge to the room | on a docket | `POST /laundry/dockets/:id/charge` → finance's `postCharge` | `laundry` edit | **refused** |
| Cancel | on a docket | `POST /laundry/dockets/:id/cancel` | `laundry` cancel | **refused** |
| Price list | `/h/:code/laundry/price-list` | `GET`, `POST /laundry/price-list[/:id]` | view; create; edit | **refused** — stays on the website |

Every laundry route also asks `app.module_enabled(hotel, 'laundry')` and answers 403 "This property
does not run a laundry. Turn it on in the property's settings if that is wrong." where it is off.
`laundry` view: owner, admin, GM, hotel manager, reception, housekeeping, the accountant, a viewer;
create / edit / cancel: the first six. **The web's "Room charge" queue-warn tier is the till's settle
to a room only** (`isRoomCharge` on `/till/orders/:id/settle`): no laundry path is on the web's list,
so a laundry charge is refused offline with the UNLISTED sentence, held nowhere (`docket.check.ts`
holds it).

## Screens

| Screen | Route → file | Picture | Reads (key `["laundry", code, …]`) |
|---|---|---|---|
| Dockets | `app/laundry/[code]/index.tsx` → `Dockets.tsx` | `pms-shots/new/n-h-laundry` | `GET /laundry/dockets[?whose=]` |
| Collect a bag (dialog) | on Dockets → `Collect.tsx` | not pictured | `GET /laundry/price-list`; `GET /stays` once "A guest's bag" |
| A docket | `app/laundry/[code]/[id].tsx[?collected=]` → `Docket.tsx` | not pictured | `GET /laundry/dockets/:id` |

Rules: `docket.ts` (`docket.check.ts`), rights: `roles.ts` (`roles.check.ts`), calls: `data.ts`, the
pieces the guest-services kit lacks: `kit.tsx` (the rest is imported from
`src/modules/guest-services/kit.tsx`, never edited, as housekeeping imports the reports kit). Every
accepted write re-reads `["laundry", code]`. No poll: the web's pages do not poll.

## Writes, who, offline

| Write | Endpoint | Shown when (the web) | Who (the API) | Offline |
|---|---|---|---|---|
| Collect a bag | `POST /laundry/dockets` | always; the dialog checks whose, the stay, the lines, the counts in the web's order (`collectBody`) | `whyNotTake` | refused, the web's sentence |
| Record what came back | `POST /dockets/:id/return` | not cancelled and something still out (`mayReturn`) | `whyNotChange` | refused |
| Charge to the room | `POST /dockets/:id/charge` | a guest's bag, not cancelled, not on a bill, with a total (`mayCharge`) | `whyNotCharge` | refused |
| Cancel | `POST /dockets/:id/cancel` | not cancelled and not on a bill (`mayCancel`) | `whyNotCancel` | refused |

**A role the API refuses** sees the act grey with the API's sentence (AGENTS rule 1); the web shows it
and the server refuses. **A state that rules the act out** leaves it out, as the web, and the web's
card says why: "The hotel's own linen", "One thing in this bag has no price yet…", "Already on the bill".

**One tap, one write** (MEMORY 8): every write is latched at the tap (`useRef`) and its button greys
while it is on its way. **The charge has a keeper** (`data.ts`, one per docket, `seen()` after the
docket's read; core `keys.ts`). The laundry API does not read the idempotency key; what keeps a bag
off the bill twice is the server's own lock on the docket and its "That docket is already on the
bill." A lost reply on Collect it, tapped again, would make a second docket (a PMS request, below).

## Money

- **A price is the price list's, a total the server's** (`app.laundry_docket_total`): null while
  anything in the bag is unpriced, drawn as a dash, never 0; 0 is a price (free) and is shown.
- **A figure is shown as the server sent it** (`rupees`): "₹430" where it is whole, as the web's
  `money()`; "₹80.50" where it carries paise — the web's `money()` would show ₹81 (MEMORY 9).
- **A line's amount** is worked out on the device by the web (`unitPrice × quantity`). The server
  sends none, so the phone shows its parts — "Amount 4 × ₹60" — with the note "A line's amount is
  its count times each. The total above is the server's: none while anything is not priced."
- **What an order shows of the price list:** each item as "Shirt · Wash · ₹60", or "· not priced"
  (`itemWords`), in the picker only. Nothing on the phone sets a price.

## On the website for now (grey, with the reason)

- **Price list** (`/h/:code/laundry/price-list`, picture `new/n-h-laundry-price-list`): adding an
  item, setting a price, Free, Retire. Desk set-up (M-3); the brief keeps it on the website. Its
  button on Dockets is grey with "On the website for now".
- **Print** a docket: the web prints the docket page (window.print) under the group's masthead and
  logo (`useGroupSettings`) and a test hotel's TEST mark, none of which is ported. `expo-print` is
  installed; what it would print is not. Grey, "On the website for now".

## Where the phone differs from the web (for the owner's look)

1. **A Back capsule** beside each title (the phone has no breadcrumbs: the web's "Dockets › LD-0001").
2. **Rights:** grey with the API's sentence where the web shows the button and the server refuses.
3. **The docket's line table** is four columns (What it is, Went, Back, Each) with the line's amount as
   its parts under it; the web's five columns scroll sideways in the sheet. The sheet's head is the
   hotel's name and "Docket · number", without the group's logo or "by <group>" line.
4. **Collecting** ends on the docket, which says "LD-0003 is collected." (the web's toast, then its
   navigation): the route's `collected` query carries the number.
5. **The not-in-this-version note** opens under the state pill from its (i), not in a popover.
6. **Dates** are read as the property's clock text (`dayOf`, `clockOf`), never through `Date`: the
   server sends `collectedAt` as "YYYY-MM-DDTHH:MI" with no zone, and the web reads it in the
   browser's zone.

## Picture match (4 Nov)

Compared by reading the code against the picture (`reference/pms-shots/new/`, 390 px wide, taken at
2x, so 780 px in the file), measured on the file; never seen running. On every screen the web's top
bar and the business-date line are the shell's (mobile/shell), not this module's.

| Screen | Picture | Result |
|---|---|---|
| Dockets | `new/n-h-laundry` (dev-gm) | **Matches**, with these differences left: (a) a **Back** capsule beside the title (the phone's way back; the line under the title wraps a little earlier); (b) **Price list** is grey with "Price list: On the website for now" under the buttons (the price list stays on the website); (c) buttons and the segmented control are **44 px** (the picture's 36): touch targets of 44 px or more (AGENTS); (d) for a role the API refuses taking a bag in, Collect a bag is grey with the API's sentence (the picture is the GM's, who may). The words, their order, the six labelled lines of each card (Whose, State, Pieces, Still out, Total, Collected), the 104 px label column, the pill's tones, the dash for a bag with no total, the hairline between dockets and the chevron are the web's code (DataTable's phone card, StatusPill). |
| Collect a bag | none (a dialog) | **Not pictured**: built from `CollectDialog`, words and order as the web. |
| A docket | none | **Not pictured**: built from `pages/Docket.tsx`; differences 3-5 above. |
| Price list | `new/n-h-laundry-price-list` | **On the website** (not built); only what an order shows of its prices is used: the item, its service, its price or "not priced". |

**1 of 1 pictured screens matches its picture** (with the differences listed); two screens are not
pictured.

## Not in this version (the web's own list)

Linen par levels per room type, an outside laundry's bills, express surcharges, and a guest sending a
bag from their own page.
