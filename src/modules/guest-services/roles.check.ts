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

/* The web's menu agrees (4 Nov): the roles each entry's canSee lets in, as
   the shell's port of the web's navigation gives them (src/core/menu.ts on
   mobile/shell: guest-services/requestRoles.ts REQUEST_ROLES, nav.ts
   WAKE_UP_ROLES and LOST_ROLES, online-checkin/nav.ts DESK_ROLES), over
   every role of api/src/permissions.ts. So the Guest services way in greys
   exactly what the web's menu leaves out, and opens what it lists. */
const ROLES = ["owner", "admin", "gm", "hotel_manager", "revenue_manager", "front_desk", "housekeeping",
  "kitchen_manager", "chef", "pos", "bar", "stores", "finance", "read_only", "automation"];
const WEB_DESK = ["owner", "admin", "gm", "hotel_manager", "front_desk"];
const WEB_MENU: Array<[string, (role: string) => string | null, string[]]> = [
  ["Guest requests", whyNotRequests, [...WEB_DESK, "housekeeping", "stores", "kitchen_manager", "chef", "pos", "bar"]],
  ["Wake-up calls", whyNotWakeUps, WEB_DESK],
  ["Lost property", whyNotLost, [...WEB_DESK, "housekeeping"]],
  ["Online check-in", whyNotDesk, WEB_DESK],
];
for (const [entry, why, sees] of WEB_MENU) {
  for (const role of ROLES) eq(why(role) === null, sees.includes(role), `${entry} for ${role}, as the web's menu`);
}

console.log("guest services roles: all checks pass");
