# Guest messaging — what the system sent guests, and the connections' health (read only)

Tier 2, slice 23 (branch `mobile/t2-messages`, 4 Nov). Two read-only screens: **Guest messages** (the
record of every message the system tried to send a guest) and **Connection health** (every outside
connection green, amber, red or grey). **Nothing here writes.** Defects: `DEFECTS.md`, prefix `MGM-`.

## The web twin (mapped first, from the PMS read only on 4 Nov)

| Web | Page | Address (nav) | API read | Gate (who) | Offline |
|---|---|---|---|---|---|
| `src/modules/guest-messaging/` | `pages/GuestMessages.tsx`, data `data/guestMessages.ts` | `/h/:code/guest-messages` — Guests & CRM (`nav.ts`, resource `customer`, reception's working menu) and Settings → Messages → Guest messages (the same page, `menu.ts` SETTINGS_PAGES) | `GET /api/hotels/:code/guest-messages[?reservation=<id>]` (`api/src/modules/guest-messaging/messages.ts`) | roleGate `own`: the route's `VIEW_ROLES` = `customer` view (D27-144): owner, admin, GM, hotel manager, reception, accountant, viewer; others 403 `MESSAGES_REFUSED` | a read; no tier |
| `src/modules/connections-health/` | `pages/ConnectionHealth.tsx`, data `data.ts` | `/settings/connections/connection-health` — Settings → Modules and connections (`health.settings.ts`) | `GET /api/hotels/:code/connections-health` (`api/src/modules/connections-health/health.ts`) | roleGate `see("setting", "the connections' health")`: owner, admin, GM; others 403 with refusalFor's sentence; another hotel's people 404 | a read; no tier |

The web keeps them apart (two services, two menus, two resources), so the phone has two routes:
`app/guest-messages/[code]/index.tsx` and `app/connections/[code]/index.tsx`. Both screens' code is
this module's.

**Left on the website (set-up, or another lane's act):**
- Settings → Messages → **Guest messages on/off** (`pages/MessageSwitches.tsx`, `/settings/messages/switches`)
  and **Daily report emails** (`pages/DailyReportEmails.tsx`, `/settings/messages/daily-report-emails`):
  set-up screens, writes; the menu shows them as "On the website for now" (no PHONE_ROUTES line).
- **Send check-in link** (`SendCheckInLink.tsx`, `POST /stays/:id/checkin-link`), **Send invoice**
  (`SendInvoice.tsx`, `POST /invoices/:number/send`) and **View voucher**: buttons the web places on
  the booking's and the invoice's own screens (the lanes that own them); Guest messages itself
  "never sends and has no button that does".

## Not the same as guest services' Messages

`src/modules/guest-services/Messages.tsx` (`/guest-services/[code]/messages`) is the **desk's card of
messages FROM guests** — what a guest wrote on their own page (`MessagesToTheDesk`, D23-14), with Reply
and Mark handled, for the desk's five roles. **This module is what the SYSTEM SENT TO guests** (the
`messages_sent` record: confirmations, vouchers, sign-in codes, check-in links), read only, for the
`customer` readers. On the web the first is a card at the top of the second's page; on the phone it
stays guest services' screen, and Guest messages shows a "Messages from guests" link to it for the
desk's roles (guest services' `whyNotDesk`, imported, not edited).

## Screens

| Screen | Route | File | Reads |
|---|---|---|---|
| Guest messages | `/guest-messages/[code]` (`?reservation=<id>`: one booking and its group, as the web) | `GuestMessages.tsx` | `getGuestMessages` (`data.ts`) |
| Connection health | `/connections/[code]` | `ConnectionHealth.tsx` | `getConnectionsHealth` (`data.ts`) |

Menu (`src/core/menu.ts` PHONE_ROUTES, this branch's two lines): `/h/:code/guest-messages` →
`/guest-messages/:code`; `/settings/connections/connection-health` → `/connections/:code`.

## Rules (`rules.ts`, `roles.ts`; checks beside them)

- **Rights are the API's** (`roles.ts`): a role the route would refuse sees the API's own sentence
  in place of the screen ("What was sent is not available" / "The connections' health is not
  available", ReadFailed's refused shape). Not rostered (no role): the read is made and the server's
  answer shown.
- **State**: `sent` "Delivered to the sender" (success), `failed` "Did not go" (danger); an unknown
  state as itself, neutral.
- **To**: the channel's own form (email's address, WhatsApp's number), else the other, else a dash.
- **Sent by — three answers** (MSG-2): the name; "A member of staff" when a person sent it but this
  reader may not see who; "The system" only when nobody did.
- **Booking**: the reference only where it was a booking; a dash otherwise (D17-49). **What came
  back**: the server's words, or a dash.
- **The day** is the property's own (`app.hotel_clock`, "YYYY-MM-DDTHH:MI"), read as written, never
  through the phone's zone: "28 Oct 2026", the web's dateShort.
- **Two empties**: connected and nothing sent ("Nothing has been sent yet"), or not connected
  ("Nothing has been sent, because nothing can be yet"). The note "Nothing is sent yet - <the
  sender's own sentence>" only when the server says it cannot send and gives its sentence.
- **Health**: green "Working", amber "Needs a look", red "Not working", grey "Not set up"; the
  colour and the sentence are the server's (`judge`), never judged on the phone. "Last success: … ·
  Last error: … - <its words>" with the web's dateTime ("31 Oct 2026, 7:35 AM", the device's clock as
  the browser's); every server time through `instant()` (MEMORY 7); a dash for none.

**Guest data (DPDP):** the guest's number and address appear exactly as the web shows them to the
same roles (the server sends them to `customer` readers only). No message text exists to show: the
wording lives in n8n.

## States (both screens)

Loading ("Reading what was sent…" / "Reading the connections' health…") · failed (the page's "… did
not load" and the server's words, Try again) · offline ("No connection", yellow, pull down to read
again) · empty (the two empties above; health always lists the server's connections) · a failed
re-read over the last answer says so above it (`Stale`). Refused: the API's sentence.

## Picture match (4 Nov)

Compared by reading the code against the picture; **nothing was opened on a screen**.

| Screen | Picture | Result |
|---|---|---|
| Guest messages | `reference/pms-shots/all/17-guests-crm-guest-messages` (`/h/5EL/guest-messages`, as dev-gm, 31 Oct; checked not blank, 10880 px tall, its `.txt` full) | **Matches**, section by section: the title and its line; the yellow note ("Nothing is sent yet - " in the heavier face, then the sender's sentence); the card "N bookings no message can reach" with its line under a hairline, each row reference (tabular, medium), guest, "Arrives d MMM yyyy", why, inset grey-100 lines; one card of attempts, each the day (medium) then WHAT / BOOKING / TO (envelope or telephone, grey-400) / STATE (pill) / SENT BY / WHAT CAME BACK (grey-600), labels small capitals grey-500 in a 114 px column. **Differences left:** (1) a "Messages from guests" capsule under the title for the desk's roles — on the web the guests' messages are a card on this page that draws nothing when there are none (the picture shows none); the phone keeps them on guest services' screen and links to it. (2) The web's weights 400/500 are the phone's 500/600 (the core's Inter faces; the app's body text is 500). (3) The phone's gaps between cards are the core Screen's 12 px; the web's are 20 (mb-5). (4) The offline line says "pull down to read it again", not the web's "loads by itself": the phone's cache does not re-read on reconnect. |
| Connection health | **No picture.** `all/68-system-administration-integrations` is the admin Integrations page (`/admin/integrations`), refused to the GM ("This page is not part of your role"), not this page; no `.txt` in `all/`, `new/` or `roles/` holds "Connection health"'s words. | **Not pictured**: built from the web's code (`ConnectionHealth.tsx`): the title and its line, one card of connections (label medium, summary grey-600, the "Last success" line small grey-500, the pill on the right), the alert sentence under it. |

**1 of 1 pictured screens matches its picture; Connection health is not pictured.**

## Not pictured, built from the web's code

The refused state, the two empties, the failed and offline states of both screens; the
`?reservation=` view (the description "What this system sent about this booking").
