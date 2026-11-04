/* Run: node --experimental-strip-types src/modules/banquet/roles.check.ts
   Who may read and act on the diary: the lists against the core's port of
   the PMS's matrix (src/core/menu.ts, api/src/permissions.ts), and each
   sentence against the gate's own way of building it (roleGate.ts
   refusalFor, WHO, ROLES' order), so a list and its sentence cannot drift. */
import { can, ROLES, type Role } from "../../core/menu.ts";
import { whyNotBook, whyNotCancel, whyNotChange, whyNotInvoice, whyNotMoney, whyNotRead } from "./roles.ts";

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
type Act = "view" | "create" | "edit" | "cancel" | "approve";
const sentence = (doing: string, action: Act, resource: "reservation" | "invoice") => {
  const names = people.filter((r) => can(r, action, resource)).map((r) => WHO[r]);
  return `${doing} is for ${names.length <= 1 ? names.join("") : `${names.slice(0, -1).join(", ")} or ${names[names.length - 1]}`}. Ask one of them.`;
};

const rules: Array<[string, (role: string | null) => string | null, Act, "reservation" | "invoice", string]> = [
  ["read", whyNotRead, "view", "reservation", "Reading bookings"],
  ["book", whyNotBook, "create", "reservation", "Booking a function"],
  ["change", whyNotChange, "edit", "reservation", "Changing a function"],
  ["cancel", whyNotCancel, "cancel", "reservation", "Cancelling a function"],
  ["money", whyNotMoney, "approve", "reservation", "Taking money for a function, or billing it"],
  ["invoice", whyNotInvoice, "approve", "invoice", "Issuing a function's tax invoice"],
];

for (const [what, why, action, resource, doing] of rules) {
  for (const role of people) {
    eq(why(role) === null, can(role, action, resource), `${what}: ${role} as the matrix says`);
    if (why(role) !== null) eq(why(role), sentence(doing, action, resource), `${what}: the gate's sentence for ${role}`);
  }
  eq(why(null) !== null, true, `${what}: nobody rostered is refused`);
}

/* The words, as a person reads them. */
eq(whyNotMoney("hotel_manager"), "Taking money for a function, or billing it is for the owner, an administrator or the general manager. "
  + "Ask one of them.", "the money sentence");
eq(whyNotInvoice("finance"), null, "the accountant issues the tax invoice");
eq(whyNotMoney("finance") !== null, true, "the accountant takes no advance");
eq(whyNotChange("front_desk"), null, "reception changes a function");
eq(whyNotRead("chef") !== null, true, "a chef reads no bookings");

console.log("banquet roles: all checks pass");
