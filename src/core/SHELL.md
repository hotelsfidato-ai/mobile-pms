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
entry more than the ported list. The pictures never show System open, so the entry cannot be named
here and none is invented: the ported list stands until the entry is read from the PMS's
`navigation.ts` (a question for the owner in the report).

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
