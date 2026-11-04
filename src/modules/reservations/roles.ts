/* ══════════════════════════════════════════════════════════════════
   WHO MAY DO WHAT WITH BOOKINGS. The API decides (AGENTS rule 1); the
   phone shows a control the API would refuse DISABLED, with the API's own
   sentence. Reading the book and the Calendar (roleGate's STAYS,
   `reservation` view: everyone but a chef and the Inventory Manager) is
   not asked here: a refused read shows the server's own sentence.
     api/src/roleGate.ts     BOOK, ROOMING, PAYMENT
     src/modules/reservations/data/booking.ts  LIST_KEEPERS (comp, the
                             over-limit allow)
   Booking, giving a room, the advance and a complimentary room are front
   desk's sentences (front-desk/roles.ts), imported: one list, one place.
   ══════════════════════════════════════════════════════════════════ */

export { mayGiveComp, whyNotBook, whyNotPay, whyNotRoom } from "../front-desk/roles.ts";

/** Over a company's credit limit (D27-275): who may allow it, with a reason (LIST_KEEPERS). */
export const OVER_LIMIT_WHO = "The owner, an administrator or the general manager can allow it.";
