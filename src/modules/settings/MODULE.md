# settings — the web's Settings console pages, on a phone (M-13, BRIEF-T4)

Each lane appends its own section below. Routes: `app/settings/[code]/<slug>.tsx` (the web's slug);
`/settings` itself opens the admin console (`/admin/:code`).

---

# Lane m13-set-money — Rates and tax, and Money (20 Nov 2026)

**Built** 20 Nov 2026 on `mobile/m13-set-money`, from `873d6fe`. Read against the PMS's 16 Nov
release (read-only checkout). **Never opened on a screen** (the cloud has no API, no Expo, no phone).
Defects: `DEFECTS.md`, prefix **MSET-M**.

## The web twin, mapped first

| Page (web) | Phone route | Web source | Reads | Writes (roleGate) |
|---|---|---|---|---|
| `/settings/rates/plans` Rate plans | `/settings/:code/plans` | `inventory/pages/RatePlans.tsx` | `GET /inventory`, `/pricing?plan=EP`, `/pricing?breakup=`, `/plan-settings` (PRICES, `rate` view); `GET /booking-sources` (`reservation` or `commission` view) | `PUT /plan-settings/:type/:plan` On/Off and sources, `PUT /plan-settings/order`, `PUT /pricing/basis`, `PUT /pricing/addon` (PRICE, `rate` edit) |
| `/settings/rates/meal-plans` Meal plans | `/settings/:code/meal-plans` | `inventory/pages/MealPlans.tsx` | `GET /plan-settings` | `PUT /meal-days/:plan` (PRICE) |
| `/settings/rates/taxes` Taxes | `/settings/:code/taxes` | stand-in `admin/pages/ConsolePages.tsx TaxesSettings` → `finance/flows/TaxRulesCard.tsx` | `GET /tax` (anyone rostered) | `PUT /tax/:kind`, `PUT /tax/:kind/sac`, `PATCH /menu-categories/:name/tax-kind` (GST: `room_config` edit **and the accountant**) |
| `/settings/money/payment-methods` | `/settings/:code/payment-methods` | `finance/pages/money/PaymentMethods.tsx` | `GET /payment-methods` (see `setting`) | `POST`, `PATCH /:id`, `DELETE /:id`, `POST /:id/default`, `PUT /order` (MONEY_SETTING, `room_config` edit) |
| `/settings/money/extra-charges` | `/settings/:code/extra-charges` | `…/money/ExtraCharges.tsx` | `GET /extra-charges` | the list as above; `PATCH /front-desk` early and late fees (SETUP_CHANGE) |
| `/settings/money/discounts` Room discounts | `/settings/:code/discounts` | `…/money/Discounts.tsx` | `GET /discounts` | `POST`, `PATCH /:id`, `DELETE /:id` (MONEY_SETTING; no order) |
| `/settings/money/commission` | `/settings/:code/commission` | `…/money/Commission.tsx` | `GET /commission` | `PUT /booking-sources/:id/commission` (COMMISSION) |
| `/settings/money/pickup` Pickup and drop | `/settings/:code/pickup` | `…/money/Pickup.tsx` (ExtraCharges, transport) | `GET /extra-charges` | the extra-charges list |

API code read: `api/src/modules/finance/money.ts` (every route, its checks and sentences),
`finance/tax.ts` (GET, PUT kind, sac, menu category), `inventory/planSettings.ts`,
`inventory/pricing.ts` (basis 300-350, addon 532-600), `roleGate.ts` (grants 174, 201-211; the money
reads 1022-1025; the sentence 1289-1329). **Who opens a page:** the console's own `canSee`
(`menu.ts mayReach`): the owner, an administrator and the GM for all eight. **Offline:** none of
these writes is in `src/lib/offline.ts`, so `send()` refuses each with the web's unlisted sentence;
nothing is held. **Keys:** none of these routes reads an idempotency key.

## Files

`moneyRules.ts` (shapes, rules, grants, the doubt) with `moneyRules.check.ts`; `moneyData.ts`
(reads and writes, through `core/api.ts`); `moneyKit.tsx` (useWriter, refusedPage, ListCard = the
web's MoneyList, Why, TickBox, MoveButtons); screens `MoneyLists.tsx` (Payment methods, Extra
charges, Pickup and drop, Room discounts), `MoneyCommission.tsx`, `MoneyTaxes.tsx`, `MoneyPlans.tsx`
(Rate plans, Meal plans). Reused, not copied: `inventory/rates.ts` rupees, typedPrice, dateShort and
the pricing shapes; `inventory/config.ts` figureOf and the commission rules (commissionValue,
commissionNote, commissionOf - the Booking sources screen's); `inventory/data.ts` readInventory,
readPricing, readBreakup (Rates' reads); `inventory/configData.ts` readSources; `inventory/configKit`
and `inventory/kit` pieces; `admin/roles.ts` notYourRole, `admin/Route.tsx` AdminRoute.

## The rules (each ported, with its source in a comment)

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
- **One tap, one write; the unknown outcome** (MEMORY 8, 16, 22): `useWriter` latches at the tap;
  while a write is on its way the page sends nothing else and its sheet cannot be closed; after an
  unknown outcome (nothing came back, or 5xx) the page's writes stay grey with "Not known whether it
  was …" until a read of the page that **began** after the loss has come back. The doubt lives in
  `moneyStop` (module level, keyed hotel + page), so leaving the page does not lift it. A sheet that
  saw the loss also stays grey until it is closed.
- Reads through `useRead` keyed `["settings", code, <page>]`; a change on Rate plans has Rates read
  again too; Payment methods re-reads the session (the desk reads the hotel's list there).

## States

Loading "Reading the …" (each phone's own spinner) · failed: "The … did not load" and the server's
words, Try again; over a last good read "Could not read this again: …" · offline: "No connection" and
its own words · empty: the web's words ("No payment methods yet.", "No room types yet", "No contract
carries a commission.", a tax heading "Not set" and a dash) · refused: the role's sentence.

## Where the phone differs from the web (each for the owner's eye)

1. **Reorder**: the web drags; the phone has Move up / Move down in a row's editor (the whole order
   is sent, as the web's drop).
2. **Taxes**: stricter on blanks (MSET-M1); a band's dates cannot be changed on the phone (needs
   `@react-native-community/datetimepicker` 9.1.0); no placeholder "5" in the GST field (no figure
   suggested).
3. **Delete, clear a heading, make the master** ask first; the web does them at the tap.
4. **Controls a role may not use are grey with the API's sentence**, where the web hides them (Rate
   plans, Meal plans) or lets the server refuse (Taxes' Edit).
5. **Commission**: each source opens in a sheet (the web types in the row); a contract's company is
   text, not a link (no company page on the phone yet).
6. **Rate plans**: a break-up read that fails fails the page (the web shows a dash, which reads as
   "not priced"); the editor's summary sits under the step.
7. **Paise shown** where the server sends them (the web's money() rounds).
8. A page not offered to the role says so; the web sends that person to the first page they may open.

## Picture match (20 Nov)

| Screen | Picture | Result |
|---|---|---|
| Taxes | `new/n-admin-configuration` (taken at `/settings/rates/taxes`, as the owner) | Matches by reading: the card's heading and line, a tile per heading (label, bands as "5% up to the next band / 18% above ₹7,500", the sentence, HSN/SAC, Edit or Set it; unset dashed with "Not set" and a dash), then "The till's half" with a heading picker per menu category. Left: the picker is the phone's sheet, not a native select |
| Rate plans, Meal plans, Payment methods, Extra charges, Room discounts, Commission, Pickup and drop | none (`new/n-settings-rates-taxes` failed to capture; no other) | Not pictured: built from the web's code |

1 of 8 screens has a picture, and it matches by reading the code against it. Never seen running.

## Definition of done

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
