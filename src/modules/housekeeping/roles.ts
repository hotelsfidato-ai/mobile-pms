/* ══════════════════════════════════════════════════════════════════
   WHO MAY DO WHAT IN HOUSEKEEPING. The API decides (AGENTS rule 1); the
   phone shows a control the API would refuse DISABLED, with the API's
   own sentence. The lists and words are the API's:
     api/src/roleGate.ts            ROOM_STATE, HOUSEKEEPING_ROUNDS,
                                    OUT_OF_SERVICE (inventory edit) and
                                    refusalFor's sentence
     api/src/modules/housekeeping/repairRoles.ts   REPAIR_UPDATERS
   Read back from the API on 15 Oct as dev-finance and dev-desk. If the
   PMS changes a role, change it here.
   ══════════════════════════════════════════════════════════════════ */

/** Inventory edit (api/src/permissions.ts), in the matrix's order. */
const INVENTORY_EDIT: readonly string[] = [
  "owner", "admin", "gm", "hotel_manager", "revenue_manager", "front_desk", "housekeeping", "kitchen_manager", "stores",
];
const EDITORS = "the owner, an administrator, the general manager, the hotel manager, the revenue manager, "
  + "reception, housekeeping, the kitchen manager or the Inventory Manager";

/** Room repairs: reporting one not on a piece of equipment, and updating any (the owner's D22-34). */
export const REPAIR_UPDATERS: readonly string[] = ["owner", "admin", "gm", "hotel_manager", "stores", "housekeeping"];

const allow = (list: readonly string[], role: string | null, refusal: string) =>
  role != null && list.includes(role) ? null : refusal;

/** Each answers null when the API would allow it, else the API's sentence. */
export const whyNotMark = (role: string | null) =>
  allow(INVENTORY_EDIT, role, `Changing a room's status is for ${EDITORS}. Ask one of them.`);
export const whyNotAssign = (role: string | null) =>
  allow(INVENTORY_EDIT, role, `Giving rooms to housekeeping is for ${EDITORS}. Ask one of them.`);
export const whyNotBlock = (role: string | null) =>
  allow(INVENTORY_EDIT, role, `Taking a room out of service, or back is for ${EDITORS}. Ask one of them.`);
export const whyNotRepair = (role: string | null) =>
  allow(REPAIR_UPDATERS, role, "Reporting a repair to a room or the building is for the owner, an administrator, "
    + "the general manager, the hotel manager, the Inventory Manager or housekeeping. Ask one of them.");
