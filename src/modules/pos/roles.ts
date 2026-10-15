/* ══════════════════════════════════════════════════════════════════
   WHO MAY DO WHAT AT THE TILL. The API decides (AGENTS rule 1); the
   phone shows a control the API would refuse DISABLED, with the API's
   own sentence. The lists and words are the API's:
     api/src/roleGate.ts             TILL (`payment` create + `pos`) and
                                     TILL_READ (`payment` view + `pos`)
     api/src/modules/pos/till.ts     STRIKES_SENT (2594-2596)
   The two gate sentences were read back from the API on 15 Oct as
   dev-housekeeping. Reception passes the role gate but the till also
   asks whether the hotel lets reception ring up (`app.may_use_pos`):
   `GET /till/access` answers that, as the web's PosGate does.
   ══════════════════════════════════════════════════════════════════ */

const TILL: readonly string[] = ["owner", "admin", "gm", "hotel_manager", "front_desk", "pos", "finance"];
const TILL_READ: readonly string[] = [...TILL, "read_only"];
/** A dish the kitchen already has comes off only by these, with a reason
    (the owner's answers of 28 September). */
const STRIKES_SENT: readonly string[] = ["owner", "admin", "gm", "hotel_manager", "kitchen_manager"];

const allow = (list: readonly string[], role: string | null, refusal: string) =>
  role != null && list.includes(role) ? null : refusal;

/** Each answers null when the API would allow it, else the API's sentence. */
export const whyNotRing = (role: string | null) =>
  allow(TILL, role, "Ringing up an order is for the owner, an administrator, the general manager, the hotel manager, "
    + "reception, a till operator or the accountant. Ask one of them.");
export const whyNotRead = (role: string | null) =>
  allow(TILL_READ, role, "Reading the restaurant's orders is for the owner, an administrator, the general manager, "
    + "the hotel manager, reception, a till operator, the accountant or a viewer. Ask one of them.");
export const whyNotStrikeSent = (role: string | null) =>
  allow(STRIKES_SENT, role, "The kitchen already has this. Only the owner, an administrator, the GM, the hotel manager "
    + "or the kitchen manager can take it off now.");
