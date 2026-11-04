/* ══════════════════════════════════════════════════════════════════
   WHO MAY DO WHAT WITH BOOKINGS. The API decides (AGENTS rule 1); the
   phone shows a control the API would refuse DISABLED, with the API's own
   sentence. Built from today's PMS, never read back live (this copy has
   no API):
     api/src/roleGate.ts     STAYS (GET /stays, /calendar-prices: see
                             "reservation", "bookings"), BOOK, ROOMING,
                             refusalFor's sentence, WHO's words, ROLES' order
     api/src/permissions.ts  the matrix: `reservation` view
     src/modules/reservations/data/booking.ts  LIST_KEEPERS
   Booking, giving a room, the advance and a complimentary room are front
   desk's sentences (front-desk/roles.ts), imported: one list, one place.
   ══════════════════════════════════════════════════════════════════ */

export { mayGiveComp, whyNotBook, whyNotPay, whyNotRoom } from "../front-desk/roles.ts";

/** `reservation` view, in ROLES' order: everyone but a chef and the Inventory Manager. */
const SEE: readonly string[] = [
  "owner", "admin", "gm", "hotel_manager", "revenue_manager", "front_desk", "housekeeping", "kitchen_manager", "pos", "bar", "finance", "read_only",
];
const WHO: Readonly<Record<string, string>> = {
  owner: "the owner", admin: "an administrator", gm: "the general manager", hotel_manager: "the hotel manager",
  revenue_manager: "the revenue manager", front_desk: "reception", housekeeping: "housekeeping", kitchen_manager: "the kitchen manager",
  pos: "a waiter", bar: "a bar person", finance: "the accountant", read_only: "a viewer",
};
const list = (names: string[]) => (names.length <= 1 ? names.join("") : `${names.slice(0, -1).join(", ")} or ${names[names.length - 1]}`);

/** Reading the book and the Calendar: null when the API allows it, else its sentence. */
export const whyNotSee = (role: string | null) =>
  role != null && SEE.includes(role) ? null : `Reading bookings is for ${list(SEE.map((r) => WHO[r]!))}. Ask one of them.`;

/** Over a company's credit limit (D27-275): who may allow it, with a reason (LIST_KEEPERS). */
export const OVER_LIMIT_WHO = "The owner, an administrator or the general manager can allow it.";
