/* ══════════════════════════════════════════════════════════════════
   WHO MAY DO WHAT ON A STAY'S BILL. The API decides (AGENTS rule 1); the
   phone shows a control the API would refuse DISABLED, with the API's
   own sentence. The lists and words are the API's:
     api/src/roleGate.ts         BILLS (invoice view), CHARGE and
                                 TAX_INVOICE (invoice create), CHANGE_BILL
                                 (invoice edit), EDIT_BILL (reservation
                                 approve), PAYMENT (payment create),
                                 CHECK_OUT (reservation edit), and
                                 refusalFor's sentence
     api/src/permissions.ts      who holds each grant
     api/src/modules/finance/postings.ts   PAYMENT_REVERSAL_WHO (D27-125)
   Each list read from permissions.ts on 17 Oct; each sentence read back
   from the API with a refused request (roles.check.ts). If the PMS
   changes a role, change it here.
   ══════════════════════════════════════════════════════════════════ */

/** invoice view: reading a bill, and the interim bill. */
const BILLS: readonly string[] = ["owner", "admin", "gm", "hotel_manager", "front_desk", "finance", "read_only"];
/** invoice create = invoice edit = payment create, today: adding to a bill, a
    second bill, the tax invoice; reversing or moving a line; taking money. */
const DESK_AND_ACCOUNTS: readonly string[] = ["owner", "admin", "gm", "hotel_manager", "front_desk", "finance"];
/** reservation edit: checking a guest out. */
const CHECK_OUT: readonly string[] = ["owner", "admin", "gm", "hotel_manager", "front_desk"];
/** reservation approve: editing a charge, changing the rate (D27-157). */
const EDITORS: readonly string[] = ["owner", "admin", "gm"];
/** invoice approve: reversing a payment (D27-125). */
const PAYMENT_REVERSERS: readonly string[] = ["owner", "admin", "gm", "finance"];

const ALL = "the owner, an administrator, the general manager, the hotel manager, reception";
const allow = (list: readonly string[], role: string | null, refusal: string) =>
  role != null && list.includes(role) ? null : refusal;

/** Each answers null when the API would allow it, else the API's sentence. */
export const whyNotReadBill = (role: string | null) =>
  allow(BILLS, role, `Reading bills is for ${ALL}, the accountant or a viewer. Ask one of them.`);
export const whyNotCharge = (role: string | null) =>
  allow(DESK_AND_ACCOUNTS, role, `Adding to a bill is for ${ALL} or the accountant. Ask one of them.`);
export const whyNotChange = (role: string | null) =>
  allow(DESK_AND_ACCOUNTS, role, `Changing a bill is for ${ALL} or the accountant. Ask one of them.`);
export const whyNotPay = (role: string | null) =>
  allow(DESK_AND_ACCOUNTS, role, `Taking a payment is for ${ALL} or the accountant. Ask one of them.`);
export const whyNotInvoice = (role: string | null) =>
  allow(DESK_AND_ACCOUNTS, role, `Issuing a tax invoice is for ${ALL} or the accountant. Ask one of them.`);
export const whyNotCheckOut = (role: string | null) =>
  allow(CHECK_OUT, role, "Checking a guest out is for the owner, an administrator, the general manager, "
    + "the hotel manager or reception. Ask one of them.");
export const whyNotEdit = (role: string | null) =>
  allow(EDITORS, role, "Editing a charge on a bill is for the owner, an administrator or the general manager. "
    + "Ask one of them.");
/** The route lets reception in; the payment door asks again (postings.ts). */
export const whyNotReversePayment = (role: string | null) =>
  allow(PAYMENT_REVERSERS, role, "Reversing a payment is for the owner, an administrator, the general manager "
    + "or the accountant. Ask one of them.");
/** Over a company's credit limit: who may allow it (creditLimit.ts, app.manages_hotel). */
export const mayAllowOverLimit = (role: string | null) => role != null && EDITORS.includes(role);
