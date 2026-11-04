/* ══════════════════════════════════════════════════════════════════
   WHO MAY DO WHAT ON REVIEWS. The API decides (AGENTS rule 1).

   The three routes decide for themselves (roleGate.ts 744-746, 893:
   `own("reputation/reputation.ts: its own role lists")`), so the lists and
   the sentences are api/src/modules/reputation/reputation.ts's, lines
   66-102: VIEW_ROLES (`customer: view`, who opens the screen), ASK_ROLES
   (`customer: create`, who asks a guest), LINK_ROLES (`hotel: edit`, who
   types the link in) and REVIEWS_REFUSED. A group administrator holds
   everything everywhere (hasRoleAt; the core's roleAt answers "owner").

   THE SCREEN ASKS THE SERVER, NOT THIS FILE, whether to offer Ask and Save
   the link: GET /reviews sends `mayAsk` and `maySetLink`, the server's own
   answer for this person at this property (Reviews.tsx). These lists only
   refuse the read before it is made and say the sentence where a control
   is not drawn. Read from the PMS's code on 4 Nov (no API runs in the
   cloud, so not read back from a refused request).
   ══════════════════════════════════════════════════════════════════ */

/** `customer: view` - who may LOOK (reputation.ts VIEW_ROLES). */
export const VIEW_ROLES: readonly string[] = ["owner", "admin", "gm", "hotel_manager", "front_desk", "finance", "read_only"];
/** `customer: create` - who may ASK; the accountant and a viewer read and send nothing (ASK_ROLES). */
export const ASK_ROLES: readonly string[] = ["owner", "admin", "gm", "hotel_manager", "front_desk"];
/** `hotel: edit` - who may type the link in (LINK_ROLES). */
export const LINK_ROLES: readonly string[] = ["owner", "admin"];

/** reputation.ts REVIEWS_REFUSED, word for word. */
export const REFUSED = {
  view:
    "Reviews is not open to your role. The owner, an administrator, the "
    + "general manager, the hotel manager, reception, the accountant and a "
    + "viewer can see it.",
  ask:
    "Asking a guest for a review is for the owner, an administrator, the "
    + "general manager, the hotel manager or reception.",
  link:
    "Setting this property's review link is for the owner or an "
    + "administrator. Ask one of them.",
  noLink:
    "This property has no review link yet, so there is nowhere to send the "
    + "guest. The owner or an administrator can add it on this screen. The "
    + "group's own review link has not been given yet.",
  notCheckedOut:
    "A guest is asked for a review after they have left, never before. This "
    + "stay has not been checked out.",
  notLead:
    "A group is asked for a review once, at its lead guest's room. This room "
    + "is not the lead.",
} as const;

/** Reviews.tsx: where the person may not set the link, the card says this instead of the box. */
export const LINK_NOT_YOURS = "Setting this is for the owner or an administrator. Ask one of them.";

/** src/lib/testHotel.ts NOTHING_SENT: a test hotel sends nothing; the sender refuses a send with it (sending.ts, answered 502). */
export const NOTHING_SENT = "This is a test hotel: nothing is sent from it.";

/** Null when the API would let this role open Reviews, else its sentence. */
export const whyNotView = (role: string | null) => (role != null && VIEW_ROLES.includes(role) ? null : REFUSED.view);
