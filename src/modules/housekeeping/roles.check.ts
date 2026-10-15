/* Run: node --experimental-strip-types mobile/src/modules/housekeeping/roles.check.ts
   Who may mark, give, block and repair: the API's answers of 15 Oct. */
import { whyNotAssign, whyNotBlock, whyNotMark, whyNotRepair } from "./roles.ts";

const eq = (got: unknown, want: unknown, what: string) => {
  if (JSON.stringify(got) !== JSON.stringify(want)) throw new Error(`${what}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
};

/* The sentences the API gave dev-finance and dev-desk, word for word. */
eq(whyNotMark("finance"), "Changing a room's status is for the owner, an administrator, the general manager, the hotel manager, the revenue manager, reception, housekeeping, the kitchen manager or the Inventory Manager. Ask one of them.", "finance marks");
eq(whyNotAssign("finance"), "Giving rooms to housekeeping is for the owner, an administrator, the general manager, the hotel manager, the revenue manager, reception, housekeeping, the kitchen manager or the Inventory Manager. Ask one of them.", "finance assigns");
eq(whyNotBlock("finance"), "Taking a room out of service, or back is for the owner, an administrator, the general manager, the hotel manager, the revenue manager, reception, housekeeping, the kitchen manager or the Inventory Manager. Ask one of them.", "finance blocks");
eq(whyNotRepair("front_desk"), "Reporting a repair to a room or the building is for the owner, an administrator, the general manager, the hotel manager, the Inventory Manager or housekeeping. Ask one of them.", "reception repairs");

for (const role of ["owner", "gm", "housekeeping", "front_desk", "stores", "kitchen_manager"]) eq(whyNotMark(role), null, `${role} marks`);
for (const role of ["owner", "gm", "hotel_manager", "housekeeping", "stores"]) eq(whyNotRepair(role), null, `${role} repairs`);
for (const role of ["chef", "pos", "read_only", null]) eq(whyNotMark(role) != null, true, `${role} may not mark`);
for (const role of ["front_desk", "revenue_manager", "kitchen_manager", "chef", "finance", null]) eq(whyNotRepair(role) != null, true, `${role} may not repair`);

console.log("housekeeping roles: all checks pass");
