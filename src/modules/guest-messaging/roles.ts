/* ══════════════════════════════════════════════════════════════════
   WHO MAY READ WHAT WAS SENT, AND THE CONNECTIONS' HEALTH. The API decides
   (AGENTS rule 1); the phone shows a read the API would refuse as the
   API's own sentence, never a screen that looks empty.

   GUEST MESSAGES: api/src/roleGate.ts READ_RULES
     GET /api/hotels/:code/guest-messages = own("guest-messaging/messages.ts")
     - the route decides: VIEW_ROLES (a copy of grantsFor(role, "customer"),
     D27-144), refused 403 with MESSAGES_REFUSED.
   CONNECTION HEALTH: GET /api/hotels/:code/connections-health =
     see("setting", "the connections' health"): view on `setting` in
     api/src/permissions.ts - the owner, an administrator, the GM. The
     sentence is refusalFor() of that rule, worked out from the matrix on
     4 Nov (roles.check.ts holds the words).
   A group administrator is the owner everywhere (the gate's own reading).
   If the PMS changes a role, change it here.
   ══════════════════════════════════════════════════════════════════ */

/** api/src/modules/guest-messaging/messages.ts VIEW_ROLES. */
const MESSAGE_READERS: readonly string[] = [
  "owner", "admin", "gm", "hotel_manager", "front_desk", "finance", "read_only",
];

/** messages.ts MESSAGES_REFUSED, word for word. */
export const MESSAGES_REFUSED =
  "What was sent to a guest is part of their guest record, and your role "
  + "cannot open guests at this property.";

/** The roles the matrix gives view on `setting`. */
const HEALTH_READERS: readonly string[] = ["owner", "admin", "gm"];

export const HEALTH_REFUSED =
  "Reading the connections' health is for the owner, an administrator or the general manager. Ask one of them.";

/* Not rostered here (a null role): the route answers "No such property", and the read says it. */

/** null when the API would answer the list, else its sentence. */
export const whyNotMessages = (role: string | null): string | null =>
  role === null || MESSAGE_READERS.includes(role) ? null : MESSAGES_REFUSED;

/** null when the API would answer the health page, else its sentence. */
export const whyNotHealth = (role: string | null): string | null =>
  role === null || HEALTH_READERS.includes(role) ? null : HEALTH_REFUSED;
