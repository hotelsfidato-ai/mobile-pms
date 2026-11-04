/* ══════════════════════════════════════════════════════════════════
   WHO MAY DO WHAT ON THE BANQUET DIARY. The API decides (AGENTS rule 1);
   the phone shows a control the API would refuse DISABLED, with the API's
   own sentence, and reads nothing for a person the API would refuse the
   read. The lists and words are the API's:
     api/src/roleGate.ts   GET /banquet and /banquet/events/:id: STAYS
                           (reservation view); GET /banquet/setup:
                           reservation or room_config view; FUNCTION_BOOK
                           (create), FUNCTION_CHANGE (edit: confirm, amend,
                           catering), FUNCTION_CANCEL (cancel),
                           FUNCTION_MONEY (reservation approve: an advance,
                           the bill, settling, reopening), FUNCTION_INVOICE
                           (invoice approve); refusalFor's sentence, WHO's
                           names, in ROLES' order. WITHHELD blanks folioId,
                           bill and invoice for a role without invoice view.
     api/src/permissions.ts  who holds `reservation` and `invoice`
     api/src/modules/banquet/banquet.ts   moduleGate's sentence
   Read from the PMS's code on 4 Nov (no API runs in the cloud, so not read
   back from a refused request: roles.check.ts holds the words as the gate
   builds them). If the PMS changes a role, change it here.
   ══════════════════════════════════════════════════════════════════ */

/** `reservation` view: every read the diary makes. */
const READERS: readonly string[] = [
  "owner", "admin", "gm", "hotel_manager", "revenue_manager", "front_desk", "housekeeping",
  "kitchen_manager", "pos", "bar", "finance", "read_only",
];
/** `reservation` create = edit = cancel, today. */
const DESK: readonly string[] = ["owner", "admin", "gm", "hotel_manager", "front_desk"];
/** `reservation` approve (D27-132). */
const MONEY: readonly string[] = ["owner", "admin", "gm"];
/** `invoice` approve (D22-33). */
const INVOICE: readonly string[] = ["owner", "admin", "gm", "finance"];

const FIVE = "the owner, an administrator, the general manager, the hotel manager or reception";
const allow = (list: readonly string[], role: string | null, refusal: string) =>
  role != null && list.includes(role) ? null : refusal;

/** Each answers null when the API would allow it, else the API's sentence. */
export const whyNotRead = (role: string | null) =>
  allow(READERS, role, "Reading bookings is for the owner, an administrator, the general manager, the hotel manager, "
    + "the revenue manager, reception, housekeeping, the kitchen manager, a waiter, a bar person, the accountant or a viewer. "
    + "Ask one of them.");
export const whyNotBook = (role: string | null) => allow(DESK, role, `Booking a function is for ${FIVE}. Ask one of them.`);
export const whyNotChange = (role: string | null) => allow(DESK, role, `Changing a function is for ${FIVE}. Ask one of them.`);
export const whyNotCancel = (role: string | null) => allow(DESK, role, `Cancelling a function is for ${FIVE}. Ask one of them.`);
export const whyNotMoney = (role: string | null) =>
  allow(MONEY, role, "Taking money for a function, or billing it is for the owner, an administrator or the general manager. Ask one of them.");
export const whyNotInvoice = (role: string | null) =>
  allow(INVOICE, role, "Issuing a function's tax invoice is for the owner, an administrator, the general manager or the accountant. "
    + "Ask one of them.");

/** The property has banquet switched off: every route but `attachable` answers this, 403 (moduleGate). */
export const SWITCHED_OFF = "This property has no banquet hall. Turn it on in the property's settings if that is wrong.";

/** The app's words for a control the phone does not have yet (the core's menu.ts ON_THE_WEBSITE). */
export const ON_THE_WEBSITE = "On the website for now";
