# loyalty — who is in house and their points; join, use points, leave (Tier 2, slice 19)

**Web twin:** `src/modules/loyalty/` in the PMS (`MODULE.md`, `DEFECTS.md`, `pages/Loyalty.tsx`,
`MemberCard.tsx`, `data/loyalty.ts`, `nav.ts`: "Loyalty" at `/h/:code/loyalty`, resource `customer`,
Sales and marketing, in nobody's working menu); the API in `api/src/modules/loyalty/loyalty.ts`, its
gates in `api/src/roleGate.ts` (LOYALTY_MEMBER, LOYALTY_POINTS, GUESTS), the rules in
`db/migrations/178_loyalty.sql` and `213_redeeming_points_right.sql`. **Decided:** M-1, M-9, M-11.
The web's decisions: D27-178, D27-179 (L1-L18: the earn rate a setting with **no default**, **no
tiers**), D27-305 (Use points: reception and above, not the accountant), D27-307 (4) (Join and Leave:
`customer` edit).

## The web twin's map (4 Nov)

| Web page / act | Address | API it calls | Who | Offline (src/lib/offline.ts) |
|---|---|---|---|---|
| Loyalty | `/h/:code/loyalty` | `GET /loyalty` (the rules, the switch, who is in house, `maySetRules`, `isOn`, `isManager`, `mayRedeem`) | GUESTS (`customer` view) | a read |
| Join (dialog) | a non-member's row | `POST /loyalty/guests/:id/join` `{agreed: true}` | LOYALTY_MEMBER (`customer` edit) | **refused** (UNLISTED) |
| Use points (dialog) | a member on a direct stay | `POST /loyalty/stays/:id/redeem` `{points}`, **idempotency-key read** | LOYALTY_POINTS (`reservation` edit), then `app.redeems_loyalty_points` | **refused** |
| Leave (dialog) | a member's row | `POST /loyalty/guests/:id/leave` | LOYALTY_MEMBER | **refused** |
| The rules (card) | on the page, `maySetRules` | `PUT /loyalty/rules` `{name, pointsPer100}` | own: `app.sets_group_settings` | **refused** |
| Points by hotel (card) | on the page, `isManager` | `GET /loyalty/by-hotel?month=` | GUESTS, then `app.is_crm_manager` | a read |
| The member card | Guest 360 (`/crm/guests/:id`) | `GET /loyalty/guests/:id`, `POST …/adjust` `{points, reason}`, `POST …/leave` | GUESTS, then `app.loyalty_card` / own: `app.loyalty_adjust` (owner, admin, GM) | adjust **refused** |

`customer` view: owner, admin, GM, hotel manager, reception, accountant, viewer. `customer` edit and
`reservation` edit: owner, admin, GM, hotel manager, reception. `app.is_crm_manager`: owner, admin,
GM. A group administrator counts as the owner. **No loyalty path is on the web's offline list**, so
every loyalty write is refused offline with the UNLISTED sentence and held nowhere
(`loyalty.check.ts` holds it). **403 is "you may not", 409 `{ok: false, reason}` "that cannot be
done"**: both shown as the server's own sentence. Every route answers "No such property." (404) for a
hotel the person is not rostered at.

## Screens

| Screen | Route → file | Picture | Reads (key `["loyalty", code, …]`) |
|---|---|---|---|
| Loyalty | `app/loyalty/[code]/index.tsx` → `Loyalty.tsx` | `pms-shots/new/n-h-loyalty` (dev-gm, 31 Oct) | `GET /loyalty`; `GET /loyalty/by-hotel?month=` (managers) |
| Join / Use points / Leave (dialogs) | on a row → `Acts.tsx` | not pictured | — |
| The member card (a card, no route) | `MemberCard.tsx`, for Guest 360 | not pictured (the web never placed it) | `GET /loyalty/guests/:id` |

Rules: `loyalty.ts` (`loyalty.check.ts`); rights: `roles.ts` (`roles.check.ts`); calls: `data.ts`;
two pieces of its own: `kit.tsx` (`LCard`, `Typed`). Imported, never edited: the guest-services kit
(`Btn`, `Dialog`, `Field`, `Foot`, `InDialog`, `Empty`, `Loading`, `NotYours`, `Stale`, `Toast`), the
laundry kit (`Fact`, `LoadFailed`, `Note`), the front desk's `Tick`, guests' `whyNotGuests`. Every
accepted write reads `["loyalty"]` again (every hotel, as the web: a member's points are the
group's). No poll: the web's page does not poll.

**"Find a member and see their card":** the web's Loyalty page has no search, and its card (points,
statement, Adjust, Leave) is the member card on Guest 360 for the owner, an administrator and the GM.
The phone's Guest 360 (the guests module: `/guests/:code/find/:id`) is the way to find any guest; its
Loyalty panel says "On the website for now" until the mobile chat places `MemberCard` there (the
exact diff is in the report). **No tiers:** the owner's L12 (D27-179) — the web has none.

## Writes, who, offline, keys

| Write | Shown when (the web) | Enabled when | Who | Key | Unknown outcome |
|---|---|---|---|---|---|
| Join | not a member | the tick, and the programme has words | `mayJoin` | none (R-30) | the dialog takes no more taps until closed |
| Use points | a member on a direct stay | a whole number from 500 | `mayRedeem` (the server's) | **one keeper per stay** | the figure emptied, "Not known whether the points were used", the list read again |
| Leave | a member | — | `mayJoin` | none | the dialog stops |
| Save the rules | always (the phone) | — | `maySetRules` (the server's) | none (a PUT: a repeat is the same rules) | said, read again |
| Adjust (card) | a member | a whole number other than 0, and a reason | owner, admin, GM | none (R-30) | the figure emptied, Adjust stops until the card is read again |
| Leave loyalty (card) | a member, after Leave | — | `customer` edit | none | stops until the card is read again |

**One tap, one write** (MEMORY 8): each write is latched at the tap (`useRef`), its button greys
("Joining…", "Using…", "Leaving…", "Saving…", "Adjusting…"). **The redeem keeper** (`loyalty.ts`
`redeemKeys`, core `keys.ts`): Use points tapped again after a lost reply keeps its key and the
server answers as the first did; a read of the screen that began after the failure and SHOWS that
stay lets it go; another hotel's read does not.

**Typed figures go as typed** (a blank is never 0): Use points keeps digits only and is grey below
500; the adjustment keeps digits and a minus and is grey for a blank, "-", or 0; the earn rate goes as
the text typed (a blank is `null`, none), so the server refuses "5..5" in its own sentence — the web
sends `Number(text)`, and NaN reaches the server as `null`, clearing the rate.

## Where the phone differs from the web (for the owner's look)

1. **A role without a right sees the control grey, not missing** (AGENTS rule 1): Join, Use points and
   Leave grey, the card's head saying who may in the web's words; The rules' fields read-only and Save
   grey with the route's 403 sentence; Points by hotel with its MANAGERS_ONLY sentence and nothing
   read. The web leaves all of these out.
2. **The month of Points by hotel is a stepper** (‹ October 2026 ›, 44 px each), under the card's
   head, as M-7 decided for days: no date-picker package. The web has a month input beside the title.
   It opens on the phone's own month, as the web opens on the browser's.
3. **A member's points not sent are a dash** (the web draws `points ?? 0`); the server sends a balance
   for every member, so this shows only if it ever does not.
4. **Buttons are 44 px tall** (the web's `pointer-coarse` size); the picture was taken with a mouse.
5. **Refusals inside a dialog** (the web toasts "Not done" behind it); successes as the web's toast.

## Picture match (4 Nov)

Compared by reading the code against the picture and its words; **never seen running** (no API or
Expo runs in the cloud).

| Screen | Picture | Match |
|---|---|---|
| Loyalty | `new/n-h-loyalty.png` + `.txt` (dev-gm, 5EL: no name, no rate, loyalty off, ten guests in house, none a member, no points that month) | **MATCHES**, differences left: the month stepper (2, no package); 44 px buttons (4); the frame and banner above are the core's |
| Join, Use points, Leave | none | not pictured: from the web's code |
| Member card | none | not pictured: from the web's code |

`all/78-coming-soon-loyalty` is **not a loyalty screen**: its `index.json` path is `/` and its words
are the Dashboard's (the Coming soon address redirects since the module was built on 30 September;
MEMORY 12), so it says nothing of unbuilt parts. Words checked section by section: the head's line
("No programme name yet · no earn rate set: stays earn nothing"), the off note, In house's rows
(room, GUEST, POINTS "Not a member", Join), The rules (its two fields, their hints, Save the rules),
Points by hotel ("Earned and used in the month, 1 point = ₹1.", "No points that month", "Points
earned or used at any hotel appear here.").

## Left on the website

- Nothing of the Loyalty page. The member card is built here but placed by the guests module (Guest
  360 is theirs); until then Guest 360's panel says so.
- L17 (expiry), the CA's answers and the phone code before points are used are not built on the web
  either.
