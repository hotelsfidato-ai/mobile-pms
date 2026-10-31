/* Run: node --experimental-strip-types mobile/src/modules/guest-services/roles.check.ts
   Who may see and act in guest services: the API's lists and sentences, read back on 17 Oct
   as dev-desk, dev-gm, dev-housekeeping, dev-kitchen and dev-finance. */
import {
  teamsFor, whyNotClear, whyNotDesk, whyNotLost, whyNotRequests, whyNotWakeUps,
} from "./roles.ts";

const eq = (got: unknown, want: unknown, what: string) => {
  if (JSON.stringify(got) !== JSON.stringify(want)) throw new Error(`${what}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
};

/* The sentences the API gave, word for word. */
eq(whyNotRequests("finance"), "Guest requests are for the front desk, housekeeping, the kitchen and the restaurant. Ask one of them.", "finance requests");
eq(whyNotWakeUps("housekeeping"), "Wake-up calls are for the front desk. Ask one of them.", "housekeeping wake-ups");
eq(whyNotLost("kitchen_manager"), "Lost property is for the front desk and housekeeping. Ask one of them.", "kitchen lost");
eq(whyNotClear("housekeeping"), "Returning or disposing of lost property is for the front desk. Ask one of them.", "housekeeping clears");
eq(whyNotDesk("housekeeping"), "Online check-in is handled by reception, the manager, an administrator or the owner. Ask one of them.", "housekeeping desk");

/* Which teams each sees (requests.ts teamsFor). */
eq(teamsFor("front_desk"), ["housekeeping", "maintenance", "fnb"], "the desk sees all three");
eq(teamsFor("owner"), ["housekeeping", "maintenance", "fnb"], "the owner");
eq(teamsFor("housekeeping"), ["housekeeping", "maintenance"], "housekeeping");
eq(teamsFor("stores"), ["maintenance"], "the Inventory Manager");
for (const role of ["kitchen_manager", "chef", "pos", "bar"]) eq(teamsFor(role), ["fnb"], role);
for (const role of ["finance", "revenue_manager", "read_only", null]) eq(teamsFor(role), [], `${role} sees none`);

/* Who passes each gate. */
for (const role of ["owner", "admin", "gm", "hotel_manager", "front_desk"]) {
  for (const why of [whyNotRequests, whyNotWakeUps, whyNotLost, whyNotClear, whyNotDesk]) eq(why(role), null, `${role} ${why.name}`);
}
eq(whyNotLost("housekeeping"), null, "housekeeping logs lost property");
eq(whyNotRequests("housekeeping"), null, "housekeeping sees requests");
for (const role of ["housekeeping", "stores", "kitchen_manager", "chef", "pos", "finance", null]) {
  eq(whyNotWakeUps(role) != null && whyNotDesk(role) != null && whyNotClear(role) != null, true, `${role} is not the desk`);
}

console.log("guest services roles: all checks pass");
