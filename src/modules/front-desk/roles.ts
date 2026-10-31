/* ══════════════════════════════════════════════════════════════════
   WHO MAY DO WHAT AT THE FRONT DESK. The API decides (AGENTS rule 1); the
   phone shows a control the API would refuse DISABLED, with the API's own
   sentence. The lists and words are the API's:
     api/src/roleGate.ts      CHECK_IN, ROOMING (`reservation` edit),
                              BOOK (`reservation` create), PAYMENT
                              (`payment` create), STAYS (`reservation`
                              view) and refusalFor's sentence
     api/src/permissions.ts   the matrix those grants read
     src/modules/reservations/data/booking.ts   LIST_KEEPERS (comp)
   The sentences were read back from the API on 17 Oct (roles.check.ts).
   If the PMS changes a role, change it here.
   ══════════════════════════════════════════════════════════════════ */

/** `reservation` edit: check in, give a room (the matrix's five). */
const EDIT: readonly string[] = ["owner", "admin", "gm", "hotel_manager", "front_desk"];
/** `reservation` create: a booking, a walk-in's too. */
const CREATE = EDIT;
/** `payment` create: New booking's advance. */
const PAY: readonly string[] = [...EDIT, "finance"];
/** `invoice` view (D27-143): the bill's figures, the Bill tab. */
const BILLS: readonly string[] = [...EDIT, "finance", "read_only"];
/** A complimentary room (reservations' LIST_KEEPERS): the owner, an administrator or the GM. */
const KEEPERS: readonly string[] = ["owner", "admin", "gm"];

const FIVE = "the owner, an administrator, the general manager, the hotel manager or reception";

const allow = (list: readonly string[], role: string | null, refusal: string) =>
  role != null && list.includes(role) ? null : refusal;

/** Each answers null when the API would allow it, else the API's sentence. */
export const whyNotCheckIn = (role: string | null) =>
  allow(EDIT, role, `Checking a guest in is for ${FIVE}. Ask one of them.`);
export const whyNotRoom = (role: string | null) =>
  allow(EDIT, role, `Giving a booking a room, or moving it is for ${FIVE}. Ask one of them.`);
export const whyNotBook = (role: string | null) =>
  allow(CREATE, role, `Making a booking is for ${FIVE}. Ask one of them.`);
export const whyNotPay = (role: string | null) =>
  allow(PAY, role, `Taking a payment is for ${FIVE.replace(" or reception", ", reception or the accountant")}. Ask one of them.`);

/** The bill's figures and the Bill (the web's `can(role, "view", "invoice")`). */
export const seesBills = (role: string | null) => role != null && BILLS.includes(role);
/** "Settle and check out" leads to a payment and the check-out: for whoever
    may do either (StayDrawer.tsx, the owner, 24 September). */
export const maySettle = (role: string | null) => role != null && (PAY.includes(role) || EDIT.includes(role));
/** Complimentary on New booking (BookingPage.tsx `keeper`). */
export const mayGiveComp = (role: string | null) => role != null && KEEPERS.includes(role);
