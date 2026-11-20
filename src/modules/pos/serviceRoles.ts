/* ══════════════════════════════════════════════════════════════════
   WHO MAY DO WHAT ON BILL HISTORY, CLOSE RESTAURANT DAY, CHARGES TO
   ROOMS AND TABLE BOOKINGS (the m13-pos-service lane, 19 Nov). The API
   decides (AGENTS rule 1); the phone shows a control the API would
   refuse DISABLED, with the API's own sentence. Read from today's PMS:
     api/src/roleGate.ts      DAY_END (payment create + pos, bar,
                              kitchen_manager), GET till/day-end (payment
                              view + the same three), TILL_READ (payment
                              view + pos, bar: till/bills, till/waiters,
                              GET table-bookings), TABLE_ANSWER (payment
                              create + pos, bar), BILLS (invoice view:
                              GET pos/tickets), refusalFor's sentence and
                              its WHO words, in ROLES' order
     api/src/permissions.ts   who holds payment and invoice (the matrix)
     api/src/modules/pos/till.ts 2152, 2196-2200  BILL_HISTORY_ROLES and
                              its 403 sentence for a range or a filter
   The pos module's own roles.ts (15 Oct) predates the Bar role (D27-324):
   its TILL lists lack `bar` and say "a till operator"; this lane does not
   edit it and asks the mobile chat to (report). If the PMS changes a
   role, change it here. Pure: serviceRoles.check.ts runs it under node.
   ══════════════════════════════════════════════════════════════════ */

/** `payment` create in the matrix: the till's people before the names. */
const PAY_CREATE: readonly string[] = ["owner", "admin", "gm", "hotel_manager", "front_desk", "finance"];

/** roleGate DAY_END: the writes of Close restaurant day. */
const DAY_END: readonly string[] = [...PAY_CREATE, "pos", "bar", "kitchen_manager"];
/** GET till/day-end: `payment` view (the viewer too) and the same three. */
const DAY_END_READ: readonly string[] = [...DAY_END, "read_only"];
/** roleGate TILL_READ: `payment` view + the waiter and the bar. */
const TILL_READ: readonly string[] = [...PAY_CREATE, "pos", "bar", "read_only"];
/** roleGate TABLE_ANSWER: `payment` create + the waiter and the bar (= nav.ts mayRingUp). */
const TABLE_ANSWER: readonly string[] = [...PAY_CREATE, "pos", "bar"];
/** roleGate BILLS: `invoice` view. */
const BILLS: readonly string[] = ["owner", "admin", "gm", "hotel_manager", "front_desk", "finance", "read_only"];
/** till.ts BILL_HISTORY_ROLES (D27-372): a range of dates or any filter. */
export const BILL_HISTORY_ROLES: readonly string[] = ["owner", "admin", "gm", "hotel_manager", "finance", "front_desk"];

const allow = (list: readonly string[], role: string | null, refusal: string) =>
  role != null && list.includes(role) ? null : refusal;

/** Each answers null when the API would allow it, else the API's sentence. */
export const whyNotCloseDay = (role: string | null) =>
  allow(DAY_END, role, "Closing the restaurant's day is for the owner, an administrator, the general manager, "
    + "the hotel manager, reception, the kitchen manager, a waiter, a bar person or the accountant. Ask one of them.");
export const whyNotReadDay = (role: string | null) =>
  allow(DAY_END_READ, role, "Reading the restaurant's day is for the owner, an administrator, the general manager, "
    + "the hotel manager, reception, the kitchen manager, a waiter, a bar person, the accountant or a viewer. Ask one of them.");
export const whyNotReadBills = (role: string | null) =>
  allow(TILL_READ, role, "Reading the restaurant's orders is for the owner, an administrator, the general manager, "
    + "the hotel manager, reception, a waiter, a bar person, the accountant or a viewer. Ask one of them.");
export const whyNotAnswerTable = (role: string | null) =>
  allow(TABLE_ANSWER, role, "Answering a table booking is for the owner, an administrator, the general manager, "
    + "the hotel manager, reception, a waiter, a bar person or the accountant. Ask one of them.");
export const whyNotReadRoomCharges = (role: string | null) =>
  allow(BILLS, role, "Reading bills is for the owner, an administrator, the general manager, the hotel manager, "
    + "reception, the accountant or a viewer. Ask one of them.");
/** A range of dates or any filter but a day or a number (till.ts 2196-2200). */
export const whyNotWideSearch = (role: string | null) =>
  allow(BILL_HISTORY_ROLES, role, "Bill history is for the managers, the Accountant and Reception. "
    + "On the Till, look up one day's bills or a bill's number.");
