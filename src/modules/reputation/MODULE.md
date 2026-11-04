# reputation — Reviews: who was asked for a review after they left, and asking one (Tier 2, slice 21)

**Web twin:** `src/modules/reputation/` in the PMS (`MODULE.md`, `DEFECTS.md`, `pages/Reviews.tsx`,
`data/reputation.ts`, `nav.ts`: "Reviews" at `/h/:code/reviews` in Guests & CRM, order 40, resource
`customer`); the API in `api/src/modules/reputation/reputation.ts` (its own role lists: `roleGate.ts`
744-746 and 893 say `own("reputation/reputation.ts: its own role lists")`); the one door out is
`api/src/sending.ts`. **Decided:** M-1, M-9, M-11. The web's decisions: D18-14 (ask after check-out,
with the group's own link; **nothing is pulled in** from Google, TripAdvisor or the booking sites),
D22-10 / D22-52 (a group is asked once, at its lead guest's room), D27-296 (a test hotel sends
nothing), D27-261 (Settings, Messages: review requests switched on per hotel).

## ⚠ What this screen is not

The brief for this slice spoke of "reviews with their scores and sources, and replying to one if the
web's page does it". **The web's page does none of it**, and the API has no route that reads a
review: there is no score, no average, no source and no reply anywhere in the PMS (D18-14; the
web's MODULE.md "Not in this version": pulling reviews in, replying, scoring or sentiment). So the
phone draws none, invents none, and keeps the web's last card that says so where a person would
look. **The act that leaves the hotel is the ASK** - a WhatsApp or an email to a departed guest -
and it is built as the web guards it (below).

## The web twin's map (4 Nov)

| Web page / act | Address | API it calls | Who (reputation.ts) | Offline (src/lib/offline.ts) |
|---|---|---|---|---|
| Reviews | `/h/:code/reviews` | `GET /reviews` (the link, `mayAsk`, `maySetLink`, `canSend`, `notConnected`, `daysBack` 30, the departures) | VIEW_ROLES (`customer: view`) | a read |
| Save the link / Clear it | on the link card | `PUT /reviews/link` `{ url }` (`""` clears; https only) | LINK_ROLES (`hotel: edit`) | **refused** (not listed: UNLISTED) |
| WhatsApp / Email (ask one guest) | on a departure's row | `POST /reviews/:id/ask` `{ channel }` → `sending.ts` | ASK_ROLES (`customer: create`) | **refused** |

VIEW_ROLES: owner, admin, GM, hotel manager, reception, accountant, viewer. ASK_ROLES: the first
five (the accountant and a viewer read and send nothing). LINK_ROLES: owner, admin. A group
administrator holds everything everywhere. The ask is refused, each in its own sentence: not
checked out (409), not the group's lead (409), no link (409, before the sender is touched), the
sender not connected (**503**), review requests switched off (409), and from the sender itself a
test hotel or a failed send (**502** with its reason; the sender records a "failed" row). **Neither write reads an idempotency key**
(MREP-1). **No confirmation dialog on the web**: a tap on WhatsApp or Email sends.

## Screens

| Screen | Route → file | Picture | Reads (key `["reputation", code]`) |
|---|---|---|---|
| Reviews | `app/reputation/[code]/index.tsx` → `Reviews.tsx` | `pms-shots/all/18-guests-crm-reviews` (dev-gm, 5EL) | `GET /api/hotels/:code/reviews` |

The menu's "Reviews" (Guests & CRM) opens it: `src/core/menu.ts` PHONE_ROUTES
`"/h/:code/reviews": "/reputation/:code"`. Rules and words: `rules.ts` (`rules.check.ts`); rights:
`roles.ts` (`roles.check.ts`); calls: `data.ts`. Imported, never edited: the guest-services kit
(`Btn`, `Toast`, `Failed`, `Stale`, `NotYours`, `Loading`, `body`, `message`, `saidOf`), the laundry
kit (`StatePill`, `capsLabel`), the reports kit (`InfoButton`). No poll: the web's page does not poll.

## What it does, as the web

1. **The card at the top**: in a test hotel, "This is a test hotel: nothing is sent from it."; else,
   while the sender is not connected, the server's own `notConnected` sentence.
2. **The review link**: "This property sends:" the link, or a dash; no link → the web's sentence
   that nobody can be asked yet; a link → "Set by … on …". The owner and an administrator
   (`maySetLink`, the server's) get "Paste the link" (**no placeholder**, as the web: an example
   would be copied out to a guest), **Save the link** (only once something is typed) and **Clear
   it** (only while there is a link); everybody else reads "Setting this is for the owner or an
   administrator. Ask one of them."
3. **Departures** (the last `daysBack` days, the server's bound, said behind the (i)): each row the
   guest, the booking's reference, LEFT, STAY, REVIEW ASKED (a dash for nobody asked - never
   "Pending" - or **Asked** / **Did not go** with the moment and, for a failure, the sender's
   detail in red). The ask's cell: a group's other rooms say "The group is asked once, at <lead's
   reference>."; the lead (or a room in no group) offers **WhatsApp** and **Email**, each on only
   where the booking carries a phone / an email, and only where `mayAsk && canSend && link`
   (`mayActuallySend`); a test hotel draws them off for whoever may ask.
4. **What guests wrote**: the web's sentence that nothing is pulled in.

**Scores and averages:** none exist (above). **Figures:** none on this screen; the dates are the
server's text written as the web writes them ("12 Oct 2026", "12 Oct 2026, 2:05 PM"), read from
their digits, never through `Date` (rules.ts: `app.hotel_clock` sends the property's own wall clock
with no zone, so the phone's zone cannot move it and Hermes has nothing to misread, MEMORY 7).

**Guest data (DPDP):** the phone shows what the web shows - the name, the booking's reference, the
dates and the ask's state. The read carries the guest's phone and email (the server sends them so a
way can be offered only where it would work); **neither is ever drawn**, and the answers live in
react-query's memory only (nothing on disk, `app/_layout.tsx`).

## Writes, offline and an outcome nobody knows

- **Offline:** both writes go through `send()`, and neither path is on the web's list, so each is
  refused with the web's UNLISTED sentence and **nothing is held** (`rules.check.ts`).
- **One tap, one write** (MEMORY 8): a `useRef` latch at the tap; every way greys while an ask is on
  its way; Save and Clear grey while the link is on its way.
- **An ask nobody knows the end of** (`outcomeUnknown(e)`: nothing came back, or a 5xx). The ask
  messages a guest outside the hotel and reads no key, so a lost reply then a second tap could send
  twice. The phone says "Not known whether <guest> was asked for a review", the server's (or the
  phone's) words, and "Read the list again and look at <guest>'s row before asking again"; **every
  way stays off** until a read made after that ask has landed ("Read the list again", or pull
  down), and then says the row shows whether they were asked (BRIEF-T2, MEMORY 16). This is the
  phone's own guard: the web has none (MREP-1).
- **A link save nobody knows the end of** says "Not known whether the review link was saved (or
  cleared)" and reads again; it takes taps again at once, because the server keeps one row per
  property and saving the same link twice changes nothing.
- **A refusal** (403, 409, 400): the server's own sentence, as the web's toast.

## Rights

The read is refused before it is made for a role outside VIEW_ROLES (the API's sentence, nothing
read), and a server 403 shows its own sentence the same way. Ask and Save the link follow the
server's `mayAsk` / `maySetLink`. **Where the phone differs from the web:** a role that may look and
not ask (the accountant, a viewer) reads the API's sentence "Asking a guest for a review is for the
owner, an administrator, the general manager, the hotel manager or reception." under Departures -
the web draws no button and says nothing (AGENTS rule 1: refused is said, never silently hidden).
Where nothing can send (no link, the sender not connected), no button is drawn, as the web: the
reason is the card above, once, not thirty times.

## Picture match (4 Nov)

Compared by reading the code against the picture and its words; **never seen running** (no API or
Expo runs in the cloud).

| Screen | Picture | Result |
|---|---|---|
| Reviews | `all/18-guests-crm-reviews.png` / `.txt` (dev-gm at 5EL: the sender not connected, no link, 30 departures, nobody asked) | **MATCHES**: the title and its line; the sender's card in grey-700; "The review link" with its (i), "This property sends: -", the no-link sentence, the GM's "Setting this is for the owner…" line; "Departures" with its (i), each row the name, the reference in grey tabular, LEFT / STAY / REVIEW ASKED in small capitals with a dash; no buttons (no link, not connected); "What guests wrote". Differences left: (1) the frame above (menu, search, bell, avatar, the business-date banner) is the core's, not this screen's; (2) the reference's wider letter-spacing in the picture is the web font's `tabular` features, the phone draws Inter's tabular figures; (3) the web's loading skeleton is a line of words. |

**1 of 1 screens matches its picture.** **Not pictured**, built from the web's code: a link set
("Set by … on …", Clear it), the owner's / an administrator's box and buttons, the WhatsApp / Email
ways, the Asked / Did not go pills with the moment and the detail, a group's note, a test hotel's
card and its ways drawn off, no departures (the Star and its two lines), the read failed / offline,
the read refused, a role that may not ask, an outcome not known.

## Every act of the web, and where it is

Built: the read, Save the link, Clear it, Ask by WhatsApp, Ask by email. **Left out: none.**
