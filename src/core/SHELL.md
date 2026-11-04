# the frame — the top bar, the business-date banner, each role's menu, the account menu, notifications

**Lane:** `mobile/shell`. **Files:** `app/_layout.tsx`, `app/notifications/[code].tsx`,
`src/core/Shell.tsx`, `ShellAccount.tsx`, `ShellMenu.tsx`, `ShellNotes.tsx`, `menu.ts` + `menu.check.ts`.
**Web twins:** `src/components/app` (TopBar, BusinessDateBehind, TestHotelStripe, Sidebar,
SpaceSwitcher, AccountMenu, NotificationBell, CommandPalette), `navigation.ts` and each module's
`nav.ts`, `settingsConsole.ts`, `api/src/permissions.ts`, `src/pages/Notifications.tsx` (each named
in its file). **Decided:** M-9, M-11.

## Reads (the server's, never the phone's)

| What | Endpoint | Key |
|---|---|---|
| The properties and their business dates (the banner), re-read on every screen | `GET /api/hotels` | `["shell", "hotels"]` |
| A property's switches (the menu's sections) | `GET /api/hotels/:code/modules` | `["modules", code]` |
| Notifications (the bell, the drawer, the screen), every 30 s | `GET /api/hotels/:code/notifications?asOn=` | `["notifications", code]` |

No writes. "Read" is kept in memory for the person, as the web keeps it, and forgotten at sign-out.
The banner shows only when both dates came from the server; the bell's count only when the list was
read; the drawer says "-" until then (never "You are all caught up" while loading or failed).

## What a menu entry does on the phone (PHONE_ROUTES, `menu.ts`)

An entry whose web screen the merged app has opens that route. **Every other entry stays in its
place, greyed, with "On the website for now" under it, and does nothing when tapped** (the previous
helper's choice, kept): the phone never opens a browser and never hides an entry the web shows.
Mapped (4 Nov): Dashboard, All properties, Notifications, Housekeeping, Work orders, Tables, Kitchen,
Arrivals (Today, Upcoming), In house (In house now, Due out), Walk-ins, Guest requests, Wake-up calls,
Lost property, Online check-in. Not mapped on purpose: Guest messages (the phone's Messages is only
its card), Rooms (`/h/:code/stay`, the desk's rack, is not the phone's housekeeping board).
`menu.check.ts` refuses a mapping to a route outside the brief's route map.

## Picture match (4 Nov)

Compared by reading the code against `reference/pms-shots/roles/` and `all/65-system-notifications`
(on `main`); **never seen running** (no preview in the cloud session).

**Phone-wide differences, every role (reasons):**
1. Entries without a phone screen are grey with "On the website for now" under them; the picture
   draws every entry white on one line (AGENTS rule 1: shown, never hidden, with the reason).
2. "Collapse" at the foot is left out: it narrows the web's rail; the phone's drawer closes by the
   scrim or Back. "Find a screen" is there, greyed, with the reason (the search is on the website).
3. The banner's "Night audit" is underlined as the web's link for a role that may open it, then
   "On the website for now" in grey: the phone has no Night audit screen.

| Role (picture) | Home bar and banner | Menu, item by item | Account menu |
|---|---|---|---|
| Owner (`r-owner-*`) | matches, but difference 3 | spaces and every entry match; **System folds as 4 in the picture, 3 here** | **no picture**: `r-owner-account.png` is the home screen unchanged (the capture's press did not open it) |
| General Manager (`r-gm-*`) | matches, but 3 | match; **System 3 in the picture, 2 here** | no picture (same) |
| Hotel Manager (`r-hotel-manager-*`) | matches, but 3 | match; **System 2, here 1** | no picture |
| Reception (`r-reception-*`) | matches, but 3 | **MATCHES** (Laundry 1, System 1 folded) | no picture |
| Housekeeping (`r-housekeeping-*`) | **MATCHES** (no link) | **MATCHES** | no picture |
| Waiter (`r-waiter-*`) | **MATCHES**; no badge as the picture (the API refuses the waiter's list) | **MATCHES** | no picture |
| Chef (`r-chef-*`) | **MATCHES**: Kitchen covers the frame | **MATCHES** | no picture |
| Kitchen Manager (`r-kitchen-manager-*`) | **MATCHES**: Kitchen covers the frame | **MATCHES** | no picture |
| Inventory Manager (`r-inventory-*`) | **MATCHES** (no link) | **MATCHES** (System 1 folded) | no picture |
| Accountant (`r-accountant-*`) | matches, but 3 | match; **System 2, here 1** | no picture |
| Revenue Manager (`r-revenue-*`) | matches, but 3 | match (no space switcher, as the picture); **System 2, here 1** | no picture |

"MATCHES" for a menu means the same spaces, sections, entries, order, folds and counts, apart from
the phone-wide differences 1-2. **The System section:** for every role whose menu is not a working
menu (owner, GM, hotel manager, accountant, revenue manager) the picture's folded System holds one
entry more than the ported list. The pictures never show System open; the entry is now read from the PMS's code: it is the
web's **Design system** (`devOnly`), which the pictures carry because they were taken on a
development build (see the section below). The ported list stands.

**Notifications (`all/65-system-notifications`, the route `/notifications/:code`):** the title with its
yellow count pill, the line under it, each card's pill with its dot and tone, the time and "Open", the
title and the body: matches. Difference left: "Open" only where the phone has the screen; otherwise
"On the website for now" under the card (difference 1's reason).

**Account menu:** ported from AccountMenu.tsx (name, email, the group administrator line, the
properties this person may work in with a tick, Start on greyed with the reason, Sign out through
`session.tsx`'s `signOut`). Not compared: no picture shows it open.

**Count:** 0 of 11 roles have home bar, menu and account menu all matching their pictures (no
account-menu picture exists); home bar and banner 5 of 11 match outright (the other 6 differ by
difference 3 only); menu 6 of 11 match outright (the other 5 differ by the System count only);
notifications: matches but for difference 1.

## Menu re-checked against today's PMS (4 Nov)

Read against today's PMS (`hotelsfidato-ai/pms` at `a4527ea`, 2 Nov): `src/components/app/navigation.ts`
(SECTION_LAYOUT, CORE_ENTRIES, WORKING_MENUS, WORKING_HOME, every function), each of the 31
`src/modules/*/nav.ts`, `settingsConsole.ts` and the ten `src/modules/*/*.settings.ts` it gathers,
`src/lib/permissions.ts`, `api/src/permissions.ts`, `crm/access.ts`, `approvals.ts`'s
APPROVER_ROLES, `guest-services/requestRoles.ts`, `spa/data/spa.ts`, `purchasing/data/purchasing.ts`,
and `navigation.test.ts`.

**How:** besides reading entry by entry, the web's own `navigation.ts` was run under node (a
throw-away loader in the session's scratch folder, nothing kept: icons as their names,
`import.meta.env.DEV` false as in a production build, the console's `import.meta.glob` as the ten
files) and its answers compared with `menu.ts`'s for all 15 roles, modules all on:
`spacesFor`, `sidebarFor` in every space (with the ↗ and "Not built yet" marks), `navigationFor`
(every section's key, label, switch, reception switch, space and items with their children),
`flatNavigationFor` (each screen's label, address, icon, resource, matchPrefix, listed, notBuilt,
module, in order) and `workingHomeFor`. The matrix: `can()` for every role × resource × action
against `api/src/permissions.ts`.

**Result: no difference. `menu.ts`'s lists did not change.**
- The matrix, ROLE_LABELS and every rule an entry asks are the web's.
- **Approvals** is already where the web has it: the home group, order 15, after the Dashboard
  (D27-363, 25 Oct), in nobody's working menu, for APPROVER_ROLES (owner, admin, GM, hotel manager,
  Inventory Manager). The port was made with it there; only a comment saying so was added.
- **The one entry more in the pictures' folded System** (owner 4, GM 3, hotel manager 2,
  accountant 2, revenue manager 2) is the web's **Design system** (`/design-system`,
  CORE_ENTRIES order 30, `devOnly`, resource `dashboard`). Run with `DEV` true, the web gives
  exactly those counts; run as a production build, it gives the phone's. The pictures were taken
  on a development build (`reference/pms-shots/roles/index.json`: signed in as `dev-owner`,
  `dev-gm` …). Reception's and the Inventory Manager's working menus never had it, so their
  pictures matched. The phone leaves `devOnly` out (a production app); the System difference in
  the table above is closed by explanation, not by code.
- Admin's **Console** is also `devOnly` (and `listed: false`): left out the same way.

**`menu.check.ts` now also pins** every role's whole reach (`flatNavigationFor`'s count, as the
web gives it), that no `devOnly` address reaches anybody, and Approvals' place and who reaches it.
Broken once each: Approvals moved back to System (the owner's pinned Front office list failed);
the Viewer taken out of the stock reports' rule (the reach counts failed); restored.

**What the web does that the phone's frame does not yet** (none of it is the menu's lists):
- **Find a screen** and every entry's `keywords`: greyed, "On the website for now".
- The web's **`mayReach` as a route guard**: `entryFor` answers for a path with no entry of its
  own (LIST_OF: a stay's bill under In house, a restaurant bill under Till; else the longest entry
  above it), refuses a path no entry covers, and asks the property's switches. The phone's
  `mayReach` is an exact address match for the banner's Night audit link only; the phone's own
  screens are guarded by the API's answers.
- The rail's **Collapse** (the phone's drawer closes by its scrim or Back), and the tooltips of
  the collapsed rail.

