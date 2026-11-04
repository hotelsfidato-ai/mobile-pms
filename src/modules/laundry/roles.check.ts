/* Run: node --experimental-strip-types src/modules/laundry/roles.check.ts
   Who may read and act in the laundry: the lists against the core's port of
   the PMS's matrix (src/core/menu.ts, api/src/permissions.ts), and each
   sentence against the gate's own way of building it (roleGate.ts refusalFor,
   WHO, ROLES' order), so a list and its sentence cannot drift apart. */
import { can, ROLES, type Role } from "../../core/menu.ts";
import { whyNotCancel, whyNotChange, whyNotCharge, whyNotRead, whyNotTake } from "./roles.ts";

const eq = (got: unknown, want: unknown, what: string) => {
  if (JSON.stringify(got) !== JSON.stringify(want)) throw new Error(`${what}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
};

/* roleGate.ts WHO and refusalFor, ported for this check only. */
const WHO: Record<Role, string> = {
  owner: "the owner", admin: "an administrator", gm: "the general manager", hotel_manager: "the hotel manager",
  revenue_manager: "the revenue manager", front_desk: "reception", housekeeping: "housekeeping",
  kitchen_manager: "the kitchen manager", chef: "a chef", pos: "a waiter", bar: "a bar person",
  stores: "the Inventory Manager", finance: "the accountant", read_only: "a viewer", automation: "an automation account",
};
const people = ROLES.filter((r) => r !== "automation");
const sentence = (doing: string, action: "view" | "create" | "edit" | "cancel") => {
  const names = people.filter((r) => can(r, action, "laundry")).map((r) => WHO[r]);
  return `${doing} is for ${names.length <= 1 ? names.join("") : `${names.slice(0, -1).join(", ")} or ${names[names.length - 1]}`}. Ask one of them.`;
};

const rules: Array<[string, (role: string | null) => string | null, "view" | "create" | "edit" | "cancel", string]> = [
  ["read", whyNotRead, "view", "Reading laundry"],
  ["take", whyNotTake, "create", "Taking in laundry"],
  ["change", whyNotChange, "edit", "Changing a laundry docket"],
  ["charge", whyNotCharge, "edit", "Charging laundry to a room"],
  ["cancel", whyNotCancel, "cancel", "Cancelling a laundry docket"],
];

for (const [what, why, action, doing] of rules) {
  for (const role of people) {
    eq(why(role) === null, can(role, action, "laundry"), `${what}: ${role} as the matrix says`);
    if (why(role) !== null) eq(why(role), sentence(doing, action), `${what}: the gate's sentence for ${role}`);
  }
  eq(why(null) !== null, true, `${what}: nobody rostered is refused`);
}

/* The words, as a person reads them. */
eq(whyNotRead("kitchen_manager"), "Reading laundry is for the owner, an administrator, the general manager, the hotel manager, "
  + "reception, housekeeping, the accountant or a viewer. Ask one of them.", "the read's sentence");
eq(whyNotCharge("finance"), "Charging laundry to a room is for the owner, an administrator, the general manager, "
  + "the hotel manager, reception or housekeeping. Ask one of them.", "the charge's sentence");
eq(whyNotRead("finance"), null, "the accountant reads the laundry");
eq(whyNotTake("finance") !== null, true, "the accountant takes none in");
eq(whyNotTake("housekeeping"), null, "housekeeping takes a bag in");
eq(whyNotCharge("front_desk"), null, "reception charges it to the room");

console.log("laundry roles: all checks pass");
