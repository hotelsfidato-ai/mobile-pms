# guest services — requests, replies, wake-up calls and online check-in at the desk (slice 8)

**Web twins:** `src/modules/guest-services` one folder up (`pages/Requests.tsx`, `pages/WakeUpCalls.tsx`,
`pages/LostProperty.tsx`, `data/`, `requestRoles.ts`, its `MODULE.md`, `DEFECTS.md`), the staff side of
`src/modules/online-checkin` (`pages/Desk.tsx`, `pages/IdPhotosAtDesk.tsx`, `HotelCard.tsx`,
`MessagesToTheDesk.tsx`, `formIII.ts`, `data/desk.ts`); the API in `api/src/modules/guest-services/`
(`requests.ts`, `wakeAndLost.ts`), `api/src/routes/guestDoor.ts`, `guestMessages.ts`,
`guestDoorKit.ts`. **Decided:** M-9, M-11. The guest's own page stays on the web (PLAN § 3).

## Screens

| Screen | Route → file | Web twin and picture | Reads (key `["guest-services", code, …]`) |
|---|---|---|---|
| Guest services (the way in) | `app/guest-services/[code]/index.tsx` → `Hub.tsx` | no twin: the web's menu | none |
| Guest requests | `…/requests.tsx` → `Requests.tsx` | `/h/:code/requests`, `pms-shots/new/n-h-requests` | `GET /requests?view=open\|done`, every 30 s on screen |
| Wake-up calls | `…/wake-up-calls.tsx` → `WakeUpCalls.tsx` | `/h/:code/wake-up-calls`, `n-h-wake-up-calls` | `GET /wake-up-calls?view=open\|done`, every 30 s on screen |
| Lost property | `…/lost-property.tsx` → `LostProperty.tsx` | `/h/:code/lost-property`, `n-h-lost-property` | `GET /lost-property?view=kept\|cleared` |
| Online check-in | `…/online-checkin.tsx` → `OnlineCheckin.tsx` | `/h/:code/online-checkin`, `all/09-front-desk-online-check-in` | `GET /online-checkin` |
| Messages from guests | `…/messages.tsx[?reservation=]` → `Messages.tsx` | the card in Guest messages | `GET /online-checkin/messages[?reservation=]` |

Rules: `rules.ts` (`rules.check.ts`), rights: `roles.ts` (`roles.check.ts`), calls: `data.ts`, the web
kit's pieces: `kit.tsx`. Every accepted write re-reads the screen's own key.

## Writes, who, offline

| Write | Endpoint | Enabled when (web) | Who (API) | Offline |
|---|---|---|---|---|
| Raise a request | `POST /requests` | a room and "what" | anybody with a team (`teamsFor`) | **refused**, the web's UNLISTED sentence |
| Take it · Done · Cancel it | `PATCH /requests/:id` | Take it while open; Done on something broken needs what was done; Cancel needs why | the request's team, and the desk | **refused** |
| Set a call | `POST /wake-up-calls` | a room, day, time | the desk (`DESK`) | **refused** |
| Confirm · Done · Cancel it | `PATCH /wake-up-calls/:id` | Confirm while asked, Done once set; Cancel needs why | the desk | **refused** |
| Log an item | `POST /lost-property` | what and where | the desk and housekeeping | **refused** |
| Returned · Disposed | `PATCH /lost-property/:id` | words | the desk (`mayClear`) | **refused** |
| Confirm against the ID · Not right | `POST /online-checkin/submissions/:id/confirm`, `/set-aside` | waiting | the desk (`DESK_ROLES`) | **refused** |
| Done · Declined (spa, laundry) · Mark handled (a message) | `POST /online-checkin/requests/:id` | open | the desk | **refused** |
| Send reply | `POST /online-checkin/messages/:reservationId/reply` | 1 to 500 characters, not checked out | the desk | **refused** |

**A request that is a repair:** "Something broken" is a work order like any other: the server writes it,
housekeeping's Work orders shows it too, and closing it asks what was done. Housekeeping and food and
drink stay off Work orders. The phone sends only the team.

**Nothing here is held:** `src/lib/offline.ts` does not list these paths (the web's MODULE.md says so
on purpose), so the core's `send` refuses each with "This cannot be done offline yet…" and no entry
reaches the outbox.

## On the website for now (grey, with the reason)

- **Printing a room card, every room's, and the hotel's card:** needs a QR library, `qrcode` 1.5.4
  (the website's; `expo-print` is installed). A card is shown once and printing kills the old one, so
  a live button with no QR would leave a room with no card.
- **The ID photo:** Show, Remove, and "ID photos kept". The question for the owner: should an ID's
  picture open on a phone at all? It cannot be proved locally either (Drive).

## Where the phone differs from the web (for the owner's look)

1. **The way in** is the phone's own screen; the web has its menu. An entry a role may not open is grey
   with the API's sentence; the web hides it (AGENTS rule 1).
2. **Returned and Disposed** for housekeeping: grey with the API's sentence; the web hides them.
3. **Wake-up time** is typed (`timeOf` reads 7:30, 730, 07.30); the web has a time input. **The day** is
   housekeeping's day stepper (M-7).
4. **Messages from guests** is a screen, so an empty list says so; on the web it is a card that draws
   nothing. **Guest messages' record of what the system sent** is not here (Tier 2).
5. **A section's note** behind the (i) opens under the title, not in a popover.
6. **A refused write in a dialog** is said inside it: a toast would sit behind the dialog.
7. **The web's top bar and the business-date line** are the shell's, not this module's.

The web's dates are "d MMM yyyy" (`rules.ts`): the core's `dateShort` is "d MMM", which is the web's
`dateCompact`, though its comment says otherwise.

## Picture match (4 Nov)

Compared by reading the code against each picture (`reference/pms-shots/`, 390 px wide, taken at 2x,
so 780 px in the file), measured on the file; never seen running. Two differences are the phone's
on every screen here and are not repeated below: (a) the web's top bar and the business-date line
are the shell's (mobile/shell), and a **Back** capsule sits beside each title, so the line under the
title wraps a little earlier than the picture's; (b) a **segmented control is 44 px a choice** (50 with
its track), the picture's 30 (36): touch targets of 44 px or more (AGENTS).

| Screen | Picture | Result |
|---|---|---|
| Guest services (the way in) | `all/76-coming-soon-guest-services` | **No picture to match.** The web's old coming-soon address now opens the Dashboard (its words are the Dashboard's): guest services is live there and has no page of its own, only menu entries. The way in lists them in the menu's order (Online check-in, Guest requests, Wake-up calls, Lost property; Guest messages from Guests & CRM), and greys exactly what the web's menu leaves out for a role (`roles.check.ts`, against the web's nav lists as the shell ported them). |
| Guest requests | `new/n-h-requests` | **Matches** (the empty Open view, as the desk): title and line, New request (orange 600, 44 tall, a plus), Open / Done, last 24 h, the team filter All / Housekeeping / Something broken / Food and drink scrolling inside itself and cut at the page's edge, the empty state's icon, words and the 84 px above it. The cards, the dialogs and the Done view are not pictured: built from the ported code. |
| Wake-up calls | `new/n-h-wake-up-calls` | **Matches** (the empty To make view): Set a call, To make / Done, last 24 h, "No calls to make" and its line. Cards and dialogs not pictured. |
| Lost property | `new/n-h-lost-property` | **Matches** (the empty Kept view): Log an item, Kept / Returned or disposed, "Nothing kept" and its line. Cards and dialogs not pictured. |
| Online check-in | `all/09-front-desk-online-check-in` | **Cannot be compared: the picture is blank** (a grey page; its `.txt` is empty: the page had not drawn when it was taken). Built from the ported code alone. Ask for it to be taken again, with a guest's details waiting. Grey, on the website for now: printing every card, a room's card and the hotel's card (needs `qrcode`); Show and Remove the ID photo, and the kept list's own buttons (their words are not in the ported code, so the list carries the line instead). |
| Messages from guests | `all/17-guests-crm-guest-messages` | **Does not match: a different part.** The picture is the web's Guest messages page: what the system sent guests ("Nothing is sent yet" note, "N bookings no message can reach", each message's What / Booking / To / State / Sent by / What came back). None of that is on the phone: no ported code holds its route or shape (Tier 2, PLAN § 3). The messages TO the desk, which this screen is, are a card on that page that draws nothing when there are none, so the picture does not show it. |

**3 of 6 screens match their pictures** (with the two differences above); one has no picture of its
own, one a blank picture, one a picture of a part the phone does not have.

## Test people (development, `x-dev-staff-id`, hotel 5EL)

`dev-desk`, `dev-gm`: everything. `dev-housekeeping`: requests (housekeeping, something broken), lost
property (log, not clear). `dev-kitchen`: requests (food and drink). `dev-finance`: nothing.
