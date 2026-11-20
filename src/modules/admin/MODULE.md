# admin — who works where, what each role may do, and how the property is set up (M-13, lane m13-admin)

The phone's Administration: People, Users, Roles and permissions, Sign-ins and devices, Activity, the
Audit log, Integrations, System health, Properties, the Settings console and its own pages (Modules,
Signing in, Bank details), and Backfill data. Built 19-20 Nov 2026 from today's PMS (16 Nov release,
`c9394cb`), read in the cloud. **Nothing was opened on a screen**: every comparison below is the code
read against the picture.

## The web twin (mapped first)

| Web page | Address(es) | Data → API route | Who (the API) | Offline |
|---|---|---|---|---|
| `pages/People.tsx` | `/people` (RequireAccess `user`: owner, Admin, GM, hotel manager) | `GET /api/admin/staff` (row security; each row `mayEdit`/`maySwitch`/`maySetPassword`/`mayTwoStepOff`, and `rosterAt` with `app.grantable_roles`); `POST /api/admin/staff`, `POST …/:id/access`, `DELETE …/:id/access/:code`, `POST …/:id/deactivate`, `…/reactivate`, `…/password`, `PATCH …/:id`, `PUT …/:id/home-screen`, `POST …/:id/two-step/off` | every write `own` in `roleGate.ts`: `app.require_hotel_admin`, `app.may_switch_person`, `app.may_set_password`, `app.manages_person`, `app.may_see_sign_ins` | not listed → **refused** |
| `pages/Admin.tsx` UsersPage | `/admin/users` (`user`) | `GET /api/hotels/:code/staff` | `see("user")` | a read |
| `pages/Admin.tsx` RolesPage | `/admin/roles` → `/settings/people/roles` (`setting` and `role`: owner, Admin) | none: the matrix is `src/lib/permissions.ts` (the core's `menu.ts` port) | — | — |
| `pages/SignIns.tsx` | `/admin/sign-ins` → `/settings/people/devices` (owner, Admin) | `GET /api/admin/staff` (Whose), `GET /api/admin/staff/:id/sign-ins`, `POST /api/admin/sign-ins/:id/sign-out` | `app.devices_of`, `app.sign_out_device` | refused |
| `pages/Activity.tsx` | `/admin/activity` → `/settings/people/activity` (owner, Admin, GM) | `GET /:code/activity?scope&who&kind&from&to&offset&limit` | `mayRead("audit_log")`; `scope=group` owner and Admin | a read |
| `pages/Admin.tsx` AuditLogPage | `/admin/audit-log` → `/settings/people/audit-log` | `GET /:code/audit-log?who&from&to&offset&limit` | `mayRead("audit_log")` | a read |
| `pages/Admin.tsx` IntegrationsPage | `/admin/integrations` (`integration`: owner, Admin) | `GET /:code/integrations`, `GET /api/channel-manager/su` | `see("integration")`; `maySetUpSu` | a read |
| `pages/SystemHealth.tsx` | `/admin/system-health` (`role`: owner, Admin) | `GET /:code/system-health`, every 60 s | `SYSTEM_HEALTH` | a read |
| `pages/Properties.tsx` | `/properties` (`hotel`) | `GET /api/hotels/:code` each, `GET /api/admin/hotels` (group administrator), `GET /:code/tax`; `POST /api/admin/hotels/:code/close\|reopen` | `own`: a group administrator | refused |
| `pages/Settings.tsx` + `settingsConsole.ts` | `/settings/<group>/<slug>` (`setting`: owner, Admin, GM; then each page's rule) | each page its own | — | — |
| `ConsolePages.tsx` ModulesSettings | `/settings/connections/modules` (owner, Admin) | `GET /:code/modules`, `POST /:code/modules/:module {enabled}` | `maySwitchModules` | refused |
| `ConsolePages.tsx` SigningInSettings | `/settings/people/signing-in` | `GET /api/me/two-step`, `PUT /api/admin/two-step-required` | `app.set_two_step_required` (owner, Admin) | refused |
| `ConsolePages.tsx` BankSettings | `/settings/money/bank` | `GET/PUT/DELETE /:code/bank-details` | `app.manages_hotel` | refused |
| `backfill/BackfillPage.tsx` | `/settings/property/backfill-data`; `/h/:code/backfill` for the Accountant | `GET /:code/backfill`; `POST /:code/backfill/:kind/:id/remove {reason}` | `BACKFILL_READ` (`invoice` approve), writes `BACKFILL` / the server's `mayWrite` | refused |
| `pages/Console.tsx` | `/admin/console` | — | development builds only | **not built** (the brief) |

## Screens (routes under `app/admin/[code]/`, all through `Route.tsx` AdminRoute)

| Screen | Route → file | Web addresses (PHONE_ROUTES) | Reads (keys `["admin", code, …]`) |
|---|---|---|---|
| Settings console | `index.tsx` → `Settings.tsx` | `/settings` | none: the core's `sidebarFor(role, code, undefined, "settings")` |
| People | `people.tsx` → `People.tsx` | `/people` | `people` |
| Users | `users.tsx` → `Users.tsx` | `/admin/users` | `users` |
| Roles and permissions | `roles.tsx` → `Roles.tsx` | `/admin/roles`, `/settings/people/roles` | none |
| Sign-ins and devices | `sign-ins.tsx` → `SignIns.tsx` | `/admin/sign-ins`, `/settings/people/devices` | `people`, `sign-ins, <person>` |
| Audit log | `audit-log.tsx` → `Logs.tsx` | `/admin/audit-log`, `/settings/people/audit-log` | `audit-log, <query>` |
| Activity | `activity.tsx` → `Logs.tsx` | `/admin/activity`, `/settings/people/activity` | `activity, <query>` |
| Integrations | `integrations.tsx` → `Server.tsx` | `/admin/integrations` | `integrations` |
| System health | `system-health.tsx` → `Server.tsx` | `/admin/system-health` | `system-health`, every 60 s on screen |
| Properties | `properties.tsx` → `Properties.tsx` | `/properties` | `properties …`, `tax-in-use` per property |
| Modules | `modules.tsx` → `Modules.tsx` | `/settings/connections/modules` | `modules` (and re-reads the frame's `["modules", code]`) |
| Signing in | `signing-in.tsx` → `SigningIn.tsx` | `/settings/people/signing-in` | `two-step` |
| Bank details | `bank.tsx` → `Bank.tsx` | `/settings/money/bank` | `bank-details` |
| Backfill data | `backfill.tsx` → `Backfill.tsx` | `/h/:code/backfill`, `/settings/property/backfill-data` | `backfill` |

Rules: `rules.ts` (`rules.check.ts`); who opens and reads what: `roles.ts` (`roles.check.ts`); calls:
`data.ts`; the web kit's pieces, built native (docs/NATIVE.md): `kit.tsx`.

## Who may do what — exactly the web's, never wider

- **Opening a screen** asks the core's `mayReach` (the web's navigation, ported), as the web's
  `RequireAccess` does; refused, the web's own sentence: "This page is not part of your role / You are
  signed in as …, which does not include …". `roles.check.ts` pins who opens each one.
- **People's buttons** are offered only where the server's row says (`mayEdit`, `maySwitch`,
  `maySetPassword`, `mayTwoStepOff`); the property and role pickers hold only `rosterAt` (a GM is never
  offered Owner or Admin, D22-2); the ✕ only on a place the person runs, in a role they could give
  there, never their own (`mayTake`, the owner's rule of 24 Sep). The server asks again; its refusal
  is its own sentence in the toast.
- **Every write is refused offline** with the web's sentence ("This cannot be done offline yet…"):
  none is on the web's list, and `send()` holds nothing.
- **Asks first, with the phone's own dialog (Alert.alert), in the web's words:** removing a person's
  property (ConfirmRemoveAccess's words), signing out a device (SignIns' words), removing a backfilled
  line (RemoveDialog, a reason required, in a sheet). **The phone asks where the web does not** (the
  brief: a destructive act asks first): Deactivate (with the words the web says after it), Close a
  property and Remove bank details (the phone's own sentence; question 2).
- **One tap, one write; an unknown outcome** (nothing came back, or a 5xx) says "Not known whether it
  was …" and the act takes no more taps until the record is read again: a sheet until it is closed,
  a card until a read that began after the failure has come back (`useAct` in `kit.tsx`, MEMORY 8,
  16). The admin routes read no idempotency key; a keeper per list sends one all the same (MFIN-1).
- **Integrations**: the web shows no key, secret, password or address, only Set up / Not set up and
  the server's sentence; neither answer carries one, and the phone shows the same and types nothing.

## Where the phone differs from the web

1. **People's acts sit under the name** in a row of their own; at 390 px the web squeezes the name
   into a column beside them (picture 22: "D27371 / HK / d27…", the email cut). The email opens mail.
2. **A role is chosen in a sheet** (the web's native select); the password has Show, as the web's.
3. **Deactivate, Close and Remove bank details ask first** (above); the web does each at one tap.
4. **Roles and permissions shows one role's column at a time**, chosen above it, the resources in the
   matrix's order; the web's 15-column table scrolls sideways at phone width.
5. **The logs' filters apply with Show** (the web filters as each letter is typed), and the dates are
   typed as the API takes them (YYYY-MM-DD, checked before asking): the web's date box needs
   `@react-native-community/datetimepicker` 9.1.0, not approved.
6. **Sparklines are bars** (no chart package), the same figures oldest on the left.
7. **The Settings console opens on its list of pages**; the web opens straight on Profile with the
   list as a sidebar.
8. **Exports** are the core's (print / save as PDF, share) of the rows on screen, where the web offers
   PDF / Excel: People, Users, Audit log, Activity, Sign-ins, Properties, each Backfill register.

## Left on the website (each greyed "On the website for now", never hidden)

- **Properties:** Add a property (the provisioning key), Edit a property, a test hotel's Make / Open
  / Reset / Re-copy setup (typed RESET, RE-COPY), the owner's full reset (typed code, backup, clear),
  and "Open" (one property's page, `/properties/:code`, not in this lane).
- **Backfill:** Add and Correct (a day, a room, an outlet, a returning guest, a send tick: a date
  picker package and a long form), and **Day by day** — the web adds that table up in the browser; the
  phone never totals money (BRIEF-T3).
- **Settings pages of this module not built:** Profile (and its commissioning checklist, FSSAI,
  registrations), Set up this hotel, Logo and photos (`expo-image-picker` ~57.0.20), Highlights,
  Amenities, Policies, Documents (print a sample), Group, Taxes, Times and rules, Bring in old data (a
  file: `expo-document-picker`). **Other modules' console pages** (Room types, Rate plans, Meal plans,
  Payment methods, Extra charges, Room discounts, Commission, Pickup, the Lists, Front desk rules,
  Guest messages on/off, Daily report emails, Scheduled reports, Rivals' prices) are their lanes': the
  console opens each the moment its PHONE_ROUTES line lands.
- **`/admin/console`**: development builds only — not built.

## Picture match (20 Nov, by reading the code against the pictures)

| Screen | Picture(s) | Result |
|---|---|---|
| People | `all/22` (dev-gm) | **Matches** in words, order and pills (No password yet, the red line under it, the chips `5EL · Reception` with ✕, Password / Edit / Deactivate, Set a password, the (i) line), with differences 1 and 3. Not pictured: the sheets, Switched off, Two-step on, the stranded card, the empty state. |
| Users | `all/66` (dev-gm) | **Matches**: initials, name, email, ROLE, PROPERTIES, STATUS, LAST SEEN per card, the (i) line; the role's sentence (the web's tooltip) is written under it. |
| Audit log | `all/69` (dev-gm, `/settings/people/audit-log`) | **Matches** the badge "Entries 1-100", the filters, Newer / Older, each entry's When, BUSINESS DATE, ACTION pill, SUBJECT, DETAIL, BY; difference 5. |
| Activity | `new/n-admin-activity` (dev-owner) | **Matches** the switch This hotel / Across the group, By, Kind, From, To, Newer / Older, each entry's WHO, WHICH RECORD, WHAT CHANGED; difference 5. |
| Sign-ins and devices | `new/n-admin-sign-ins` (dev-owner) | **Matches** the title, line and "Whose / Pick a person"; the list and the sign-out are not pictured. |
| System health | `new/n-admin-system-health` (dev-owner) | **Matches** the four tiles and their rows, Requests with Last hour / day / week and the three tiles, Hotels' cards with the Day pill, Slowest routes, Leads app reads with its limit, Errors and slow queries; difference 6. |
| Properties | `all/21` (dev-gm), `new/n-admin-properties` (dev-owner) | **Matches** the GM's card (Rooms sellable today, Types, Check in / out, the GST rows, Open, Open the Calendar) and the owner's (code, All rooms, GSTIN, the checked-in sentence, Calendar, Edit, Close). Differences left: Open, Edit, the Test hotel block and Add a property are "On the website for now". |
| Integrations | `all/68` (dev-gm refused) | **Matches** the refusal's words; the owner's cards are not pictured. |
| Roles and permissions | `all/67` is the Profile page (the redirect landed on the console's first page) | not pictured; difference 4. |
| Settings console | `all/70` is Profile; `new/n-settings` failed to capture | not pictured; difference 7. |
| Modules, Signing in, Bank details, Backfill | none | not pictured; built from the web's code. |

**8 of 14 screens are pictured; 7 of those 8 match their pictures (Properties has its
website-only controls left).** Six are not pictured.

## Test people (development, `x-dev-staff-id`)

`dev-owner` (a group administrator: everything, Properties' admin cards), `dev-admin`, `dev-gm` (the
pictures' People, Users, Audit log; refused Integrations, Roles, Sign-ins, Modules), `dev-hotel-manager`
(People and Users only), `dev-finance` (Backfill read only, "Only the owner, an administrator or the
general manager enters and corrects these."), `dev-desk` (Properties only).
