/* ══════════════════════════════════════════════════════════════════
   WHO MAY SEE APPROVALS. The API decides (AGENTS rule 1); the phone shows
   what the API would refuse with the API's own sentence.

   READING the queue: api/src/roleGate.ts READ_RULES
     GET /api/hotels/:code/approvals = see(["notification", "equipment",
     "purchasing"], "approvals"): view on any of the three in
     api/src/permissions.ts - every role but a waiter and a bar person.
     The sentence is refusalFor(), worked out from the matrix on 4 Nov
     (roles.check.ts holds the words).
   DECIDING a row: the route's own (roleGate "own"), row by row - the
     server's `mayDecide` and `blockedBecause` (rules.ts). Nothing here.
   If the PMS changes a role, change it here.
   ══════════════════════════════════════════════════════════════════ */

/** The roles the matrix gives view on notification, equipment or purchasing. */
const READERS: readonly string[] = [
  "owner", "admin", "gm", "hotel_manager", "revenue_manager", "front_desk", "housekeeping",
  "kitchen_manager", "chef", "stores", "finance", "read_only",
];

export const READ_REFUSED =
  "Reading approvals is for the owner, an administrator, the general manager, the hotel manager, "
  + "the revenue manager, reception, housekeeping, the kitchen manager, a chef, the Inventory Manager, "
  + "the accountant or a viewer. Ask one of them.";

/** null when the API would answer the queue, else its sentence. Not rostered
    here (null role): the route answers "No such property", the read says it. */
export const whyNotRead = (role: string | null): string | null =>
  role === null || READERS.includes(role) ? null : READ_REFUSED;
