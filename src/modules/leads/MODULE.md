# leads — Leads and WhatsApp (M-13, mobile/m13-sales, 19 Nov)

**Web twin:** `src/modules/leads/` in the PMS (16 Nov release): `pages/Leads.tsx`, `data/leads.ts`,
`nav.ts` ("Leads and WhatsApp" at `/h/:code/leads`, Sales and marketing, resource `customer`),
`MODULE.md`, `DEFECTS.md`; the API `api/src/modules/leads/leads.ts` (+ `live.ts`, `firestore.ts`),
gated in `api/src/roleGate.ts` 984-987. **Decided:** M-1, M-9, M-11, M-13; the web's D27-100,
D27-168, D27-170 (read live, the PMS keeps no copy; whoever sees guests sees leads).

## The web twin's map

| Web page / act | Address | API | Who (roleGate.ts) | Offline |
|---|---|---|---|---|
| Leads and WhatsApp | `/h/:code/leads` | `GET /leads[?before=]` (50 at a time) | GUESTS: `customer` view | a read |
| An enquiry's conversation | in the page | `GET /leads/:ref` (and `replyUrl`) | GUESTS | a read |
| Book this lead | → `/h/:code/book?lead=<token>` (reads `GET /leads/:ref/booking`) | | GUESTS, then `reservation` create | — |
| Reply in the leads app | the leads app's own page | — | — | — |
| PDF / Excel | ExportButtons `leads` | listFiles | `holds: guests`: `export` on `report` | — |

**Nothing here writes or sends.** The leads app's refusals are states in the server's words: 429
(its free reads used up) and 502 (it did not answer). Not connected, or the property not in the
leads app, are 200 answers with `connected` / `inApp` false.

## Screens

| Screen | Route → file | Picture | Reads (keys) |
|---|---|---|---|
| Leads and WhatsApp | `app/leads/[code]/index.tsx` → `Leads.tsx` | `new/n-h-leads` (dev-gm, 5EL, "Not connected yet") | `["leads", code]` (infinite), `["leads", code, "lead", ref]` |

Rules and words: `rules.ts` (`rules.check.ts`); the lane's export rule `lane.ts` (`lane.check.ts`);
the lane's kit `kit.tsx` (Panel, Line, RowCard, Blank, Exports), shared with Marketing, Contracts,
Guest feedback and Possible same person; calls `data.ts`; who `roles.ts` (Guests' readers, the guests
module's sentence). Menu: PHONE_ROUTES `"/h/:code/leads": "/leads/:code"`.

As the web: never re-read on focus or on a timer (each read counts against the leads app's free
allowance), `staleTime` 60 s; the chips count what was READ so far; an enquiry opens in place of the
list with "Back to the enquiries"; a status the phone does not know is grey in its own word. Times
are instants from the leads app, written on the phone's clock as the web's are on the browser's,
through the core's `msAt` (MEMORY 7). "Value typed there" keeps its paise (MEMORY 9; the web rounds).

**Guest data (DPDP):** what the web shows (name, phone, last message, the conversation), held in
react-query's memory only. The export carries the guests' phones: for those who download reports.

## Picture match (19 Nov)

Compared by reading code against the picture; **never seen running**.

| Screen | Picture | Result |
|---|---|---|
| Leads and WhatsApp | `new/n-h-leads.png` / `.txt` | **MATCHES** the pictured state: the title, its line, the card with the plug in a grey disc, "Not connected yet" and its sentence. Differences left: (1) the frame above is the core's; (2) the PDF / Share export buttons sit under the head (today's web, D27-383 item 1, is newer than the 31 Oct picture), and they wait ("Ready once the figures are read") because nothing is read when not connected, as the web's are disabled. |

**Not pictured**, built from the web's code: the list with its chips, an enquiry and its conversation,
Show older enquiries, the property not in the leads app, the cap or the app down, a failed read, the
read refused.

## Every act of the web, and where it is

Built: the list, the chips, Show older enquiries, an enquiry's conversation, Reply in the leads app
(opens its page in the phone's browser), the export (print / PDF, share). **Left out:** Book this lead
— drawn greyed, "Booking from a lead: On the website for now": the phone's New booking
(`src/modules/reservations/NewBooking.tsx`, another lane's) does not read `?lead=` yet.
