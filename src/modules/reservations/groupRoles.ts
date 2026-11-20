/* ══════════════════════════════════════════════════════════════════
   WHO MAY DO WHAT ON GROUPS AND THE WAITLIST. The API decides (AGENTS rule
   1); a control the API would refuse is GREY with the API's own sentence,
   where the web hides it. The rules are api/src/roleGate.ts (16 Nov):
     POST /groups/:id/master       CHARGE          invoice create   "Adding to a bill"
     POST /groups/:id/lead         CHANGE_BOOKING  reservation edit "Changing a booking"
     POST /stays/:id/routing       CHANGE_BILL     invoice edit     "Changing a bill"
     POST /groups/:id/payments     PAYMENT         payment create   "Taking a payment"
     POST /groups/:id/invoice      TAX_INVOICE     invoice create   "Issuing a tax invoice"
     POST /waitlist, /:id/remove   reservation create, "Putting a guest on the waitlist",
                                   "Taking a guest off the waitlist"
     GET  /groups, /groups/:id, /waitlist   STAYS (reservation view): a refused
                                   read shows the server's sentence; not asked here.
   The bill's four are finance's sentences and the booking's front desk's,
   imported (one list, one place); the waitlist's two are new here, built as
   roleGate's refusalFor builds every sentence, over BOOK's five roles.
   ══════════════════════════════════════════════════════════════════ */

import { whyNotChange as whyNotChangeBooking } from "../front-desk/roles.ts";
import { mayAllowOverLimit, whyNotChange as whyNotChangeBill, whyNotCharge, whyNotInvoice, whyNotPay } from "../finance/roles.ts";

export { mayAllowOverLimit, whyNotChangeBill, whyNotChangeBooking, whyNotCharge, whyNotInvoice, whyNotPay };

/** `reservation` create (permissions.ts): the owner, an administrator, the GM, the hotel manager, reception. */
const BOOK: readonly string[] = ["owner", "admin", "gm", "hotel_manager", "front_desk"];
const FIVE = "the owner, an administrator, the general manager, the hotel manager or reception";
const allow = (role: string | null, doing: string) =>
  role != null && BOOK.includes(role) ? null : `${doing} is for ${FIVE}. Ask one of them.`;

export const whyNotWaitlist = (role: string | null) => allow(role, "Putting a guest on the waitlist");
export const whyNotUnwaitlist = (role: string | null) => allow(role, "Taking a guest off the waitlist");
