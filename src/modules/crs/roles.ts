/* ══════════════════════════════════════════════════════════════════
   WHO MAY DO WHAT ON CRS BOOKINGS. The API decides (AGENTS rule 1); the
   phone shows a control the API would refuse DISABLED, with the API's own
   sentence, and reads nothing for a person the API would refuse the read.
   The lists and words are the API's, read from the PMS's code on 4 Nov
   (no API runs in the cloud, so not read back from a refused request):
     api/src/roleGate.ts   GET /crs/bookings: STAYS (`reservation` view,
                           "Reading bookings", 774); POST /crs/bookings/
                           :crsId/done: CHANGE_BOOKING (`reservation` edit,
                           "Changing a booking", 80, 703); GET and PUT
                           /crs/setup: own("crs/setup.ts"); refusalFor's
                           sentence and WHO's names, in ROLES' order
     api/src/permissions.ts  who holds `reservation` view and edit
     api/src/modules/crs/setup.ts  SETUP_ROLES and SETUP_REFUSED (26-28)
   roles.check.ts holds the lists against the core's ported matrix and the
   words as the gate builds them. If the PMS changes a role, change it here.
   ══════════════════════════════════════════════════════════════════ */

/* Changing a booking: front desk's own sentence (`reservation` edit), one list, one place. */
export { whyNotChange as whyNotDone } from "../front-desk/roles.ts";

/** `reservation` view: everyone but a chef, the Inventory Manager and an automation account. */
const READERS: readonly string[] = [
  "owner", "admin", "gm", "hotel_manager", "revenue_manager", "front_desk", "housekeeping",
  "kitchen_manager", "pos", "bar", "finance", "read_only",
];

export const READ_REFUSED =
  "Reading bookings is for the owner, an administrator, the general manager, the hotel manager, "
  + "the revenue manager, reception, housekeeping, the kitchen manager, a waiter, a bar person, the accountant or a viewer. "
  + "Ask one of them.";

/** null when the API would answer the list, else its sentence. Not rostered
    here (null role): the route answers "No such property", the read says it. */
export const whyNotRead = (role: string | null): string | null =>
  role === null || READERS.includes(role) ? null : READ_REFUSED;

/** setup.ts SETUP_ROLES: the owner and an administrator (a group administrator is the owner). */
const SETUP_ROLES: readonly string[] = ["owner", "admin"];
/** The web draws the connection card only for these (CrsBookings.tsx 307); the server refuses anybody else. */
export const maySetUp = (role: string | null) => role != null && SETUP_ROLES.includes(role);
/** setup.ts SETUP_REFUSED, word for word. */
export const SETUP_REFUSED = "Connecting the CRS is for the owner and an administrator. Ask one of them.";
