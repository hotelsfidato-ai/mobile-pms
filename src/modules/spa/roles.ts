/* ══════════════════════════════════════════════════════════════════
   WHO MAY DO WHAT IN THE SPA. The API decides (AGENTS rule 1); the phone
   shows a control the API would refuse DISABLED, with the API's own
   sentence, and reads nothing for a person the API would refuse the read.

   The spa's routes decide for themselves (roleGate.ts: `own("spa/spa.ts:
   its own role lists")`), so the lists and words are
   api/src/modules/spa/spa.ts's, lines 76-95: SPA_READ_ROLES (the diary,
   the price list, the therapists), SPA_BOOK_ROLES (take, cancel and close a
   booking), SPA_LIST_ROLES (the price list and the therapists), and
   READ_REFUSED, BOOK_REFUSED, LIST_REFUSED; moduleGate's sentence, line
   154. A group administrator counts as the owner (holdsRoleHere; the
   core's roleAt). The owner's D18-21: housekeeping sees the diary and does
   not touch it. Read from the PMS's code on 4 Nov (no API runs in the
   cloud, so not read back from a refused request).
   ══════════════════════════════════════════════════════════════════ */

/** Sees the diary (SPA_READ_ROLES; since SPA-2, the matrix's `spa` view too). */
export const READERS: readonly string[] = ["owner", "admin", "gm", "hotel_manager", "front_desk", "housekeeping"];
/** Takes, cancels and charges a booking (SPA_BOOK_ROLES; the web's TAKES_A_BOOKING). */
export const BOOKERS: readonly string[] = ["owner", "admin", "gm", "hotel_manager", "front_desk"];
/** Sets the price list and the therapists (SPA_LIST_ROLES; the web's SETS_THE_LIST). */
export const LIST_KEEPERS: readonly string[] = ["owner", "admin", "gm"];

export const READ_REFUSED = "The spa diary is open to reception, housekeeping, the manager, an administrator and the owner. Ask one of them.";
export const BOOK_REFUSED = "Taking a spa booking is for reception, the manager, an administrator or the owner. Ask one of them.";
export const LIST_REFUSED = "The treatment list is set by the owner, an administrator or the general manager. Ask one of them.";

const allow = (list: readonly string[], role: string | null, refusal: string) =>
  role != null && list.includes(role) ? null : refusal;

/** Each answers null when the API would allow it, else the API's sentence. */
export const whyNotRead = (role: string | null) => allow(READERS, role, READ_REFUSED);
/** Book a treatment, Cancel, Charge to room: one list on the server. */
export const whyNotBook = (role: string | null) => allow(BOOKERS, role, BOOK_REFUSED);
export const whyNotSetUp = (role: string | null) => allow(LIST_KEEPERS, role, LIST_REFUSED);

/** The property has the spa switched off: every route answers this, 403 (moduleGate). */
export const SWITCHED_OFF = "This property has no spa. Turn it on in the property's settings if that is wrong.";

/** The web's card for a role that may only look (SpaDiary.tsx 147-154, rule 6). */
export const ONLY_LOOKS = "Your role sees the diary and does not book. Taking or cancelling a treatment is reception's, "
  + "the manager's, an administrator's or the owner's — ask one of them.";

/** The app's words for a control the phone does not have yet (the core's menu.ts ON_THE_WEBSITE). */
export const ON_THE_WEBSITE = "On the website for now";
