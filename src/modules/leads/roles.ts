/* ══════════════════════════════════════════════════════════════════
   WHO MAY READ LEADS AND WHATSAPP. The API decides (AGENTS rule 1):
   api/src/roleGate.ts READ_RULES, `GET ${H}/leads` and `/leads/:ref` are
   GUESTS (`customer` view, D27-170: whoever sees guests sees leads) - the
   same readers as Guests. Their sentence is the guests module's, imported
   (src/modules/guests/roles.ts whyNotGuests, the gate's refusalFor words),
   so one list is kept. Read from the PMS's code (19 Nov), not from a
   refused request: no API runs in the cloud.
   ══════════════════════════════════════════════════════════════════ */
export { whyNotGuests as whyNotLeads } from "../guests/roles";

/** Book this lead opens New booking pre-filled from the lead (/h/:code/book?lead=<token>); the
    phone's New booking (src/modules/reservations) does not read a lead yet. */
export const BOOK_ON_WEB = "Booking from a lead: On the website for now";
