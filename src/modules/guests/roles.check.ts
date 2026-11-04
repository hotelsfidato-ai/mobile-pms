/* Run: node --experimental-strip-types src/modules/guests/roles.check.ts
   Who may look up and change guests and companies: each list against the
   core's port of the PMS's matrix (src/core/menu.ts, api/src/permissions.ts),
   each sentence against the gate's own way of building it (roleGate.ts
   refusalFor, WHO, ROLES' order), and Guest 360's three against the web's
   own menu (crm/access.ts seesGuest360, as the core ported it). */
import { can, mayReach, ROLES, type Role } from "../../core/menu.ts";
import {
  MANAGERS_ONLY, whyNotAddCompany, whyNotChangeCompany, whyNotCompanies, whyNotEditGuest, whyNotGuest360, whyNotGuests,
} from "./roles.ts";

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
type Action = "view" | "create" | "edit";
type Res = "customer" | "company";
const sentence = (doing: string, action: Action, resource: Res) => {
  const names = people.filter((r) => can(r, action, resource)).map((r) => WHO[r]);
  return `${doing} is for ${names.length <= 1 ? names.join("") : `${names.slice(0, -1).join(", ")} or ${names[names.length - 1]}`}. Ask one of them.`;
};

const rules: Array<[string, (role: string | null) => string | null, Action, Res, string]> = [
  ["guests", whyNotGuests, "view", "customer", "Reading guests"],
  ["companies", whyNotCompanies, "view", "company", "Reading companies"],
  ["add a company", whyNotAddCompany, "create", "company", "Adding a company"],
  ["change a company", whyNotChangeCompany, "edit", "company", "Changing a company"],
  ["edit a guest", whyNotEditGuest, "edit", "customer", "Changing a guest's record"],
];
for (const [what, why, action, resource, doing] of rules) {
  for (const role of people) {
    eq(why(role) === null, can(role, action, resource), `${what}: ${role} as the matrix says`);
    if (why(role) !== null) eq(why(role), sentence(doing, action, resource), `${what}: the gate's sentence for ${role}`);
  }
  eq(why(null) !== null, true, `${what}: nobody rostered is refused`);
  eq(why("someone_new") !== null, true, `${what}: a role the matrix does not know is refused`);
}

/* Guest 360: the gate's sentence to whoever may not read guests at all, the
   managers' sentence to a reader who is not one of the three, and exactly the
   people the web's menu offers it to. */
for (const role of people) {
  eq(whyNotGuest360(role) === null, mayReach(role, "/crm/guests"), `Guest 360: ${role} as the web's menu`);
}
eq(whyNotGuest360("front_desk"), MANAGERS_ONLY, "reception reads guests, but Guest 360 is the managers'");
eq(whyNotGuest360("hotel_manager"), MANAGERS_ONLY, "the hotel manager too (D21-4)");
eq(whyNotGuest360("chef"), whyNotGuests("chef"), "a chef is refused by the gate first, in its words");
eq(whyNotGuest360("gm"), null, "the GM opens Guest 360");

/* The words, as a person reads them. */
eq(whyNotGuests("housekeeping"), "Reading guests is for the owner, an administrator, the general manager, the hotel manager, "
  + "reception, the accountant or a viewer. Ask one of them.", "the guests read's sentence");
eq(whyNotAddCompany("finance"), "Adding a company is for the owner, an administrator, the general manager or reception. Ask one of them.",
  "adding a company");
eq(whyNotAddCompany("front_desk"), null, "reception adds a company (C-7)");
eq(whyNotChangeCompany("front_desk") !== null, true, "but does not change one");

console.log("guests roles: all checks pass");
