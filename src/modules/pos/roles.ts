/* ══════════════════════════════════════════════════════════════════
   WHO MAY DO WHAT AT THE TILL. The API decides (AGENTS rule 1); the
   phone shows a control the API would refuse DISABLED, with the API's
   own sentence. The lists and words are today's PMS (16 Nov release),
   re-read on 20 Nov (MPOS-T1, MPOS-S1: the 15 Oct lists had no Bar
   person and said "a till operator"):
     api/src/roleGate.ts             TILL 228 (`payment` create + `pos`,
                                     `bar`), TILL_READ 878 (`payment` view
                                     + `pos`, `bar`), the sentence
                                     refusalFor 1326 with WHO 1289
     api/src/permissions.ts          ROLES (the order the sentence names
                                     them in) and who holds `payment`
     src/modules/pos/nav.ts          mayRingUp 11 (the web's same list)
     api/src/modules/pos/till.ts     STRIKES_SENT 2996-3008
   Reception passes the role gate but the till also asks whether the
   hotel lets reception ring up (`app.may_use_pos`): `GET /till/access`
   answers that, as the web's PosGate does. If the PMS changes a role,
   change it here.
   ══════════════════════════════════════════════════════════════════ */

/** `payment` create in the matrix, then the waiter and the Bar person by name. */
const TILL: readonly string[] = ["owner", "admin", "gm", "hotel_manager", "front_desk", "pos", "bar", "finance"];
const TILL_READ: readonly string[] = [...TILL, "read_only"];
/** A dish the kitchen already has comes off only by these, with a reason
    (the owner's answers of 28 September). */
const STRIKES_SENT: readonly string[] = ["owner", "admin", "gm", "hotel_manager", "kitchen_manager"];

const allow = (list: readonly string[], role: string | null, refusal: string) =>
  role != null && list.includes(role) ? null : refusal;

/** Each answers null when the API would allow it, else the API's sentence. */
export const whyNotRing = (role: string | null) =>
  allow(TILL, role, "Ringing up an order is for the owner, an administrator, the general manager, the hotel manager, "
    + "reception, a waiter, a bar person or the accountant. Ask one of them.");
export const whyNotRead = (role: string | null) =>
  allow(TILL_READ, role, "Reading the restaurant's orders is for the owner, an administrator, the general manager, "
    + "the hotel manager, reception, a waiter, a bar person, the accountant or a viewer. Ask one of them.");
export const whyNotStrikeSent = (role: string | null) =>
  allow(STRIKES_SENT, role, "The kitchen already has this. Only the owner, an administrator, the GM, the hotel manager "
    + "or the kitchen manager can take it off now.");
