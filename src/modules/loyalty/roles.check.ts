/* Run: node --experimental-strip-types src/modules/loyalty/roles.check.ts
   Who may read and act on Loyalty: Join / Leave as the web asks it (the
   gate's LOYALTY_MEMBER, `customer` edit), each gate sentence built the
   gate's way (roleGate.ts refusalFor: what was being done, WHO's names in
   ROLES' order, "or" before the last), and the route's own sentences. */
import { can, ROLES, type Role } from "../../core/menu.ts";
import {
  ADJUST_REFUSED, JOIN_REFUSED, MANAGERS_ONLY, mayJoin, REDEEM_REFUSED, RULES_REFUSED, whyNotRead,
} from "./roles.ts";

const eq = (got: unknown, want: unknown, what: string) => {
  if (JSON.stringify(got) !== JSON.stringify(want)) throw new Error(`${what}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
};

const people = ROLES.filter((r) => r !== "automation");

/* roleGate.ts WHO and refusalFor, ported for the check only. */
const WHO: Record<string, string> = {
  owner: "the owner", admin: "an administrator", gm: "the general manager", hotel_manager: "the hotel manager",
  revenue_manager: "the revenue manager", front_desk: "reception", housekeeping: "housekeeping",
  kitchen_manager: "the kitchen manager", chef: "a chef", pos: "a waiter", bar: "a bar person",
  stores: "the Inventory Manager", finance: "the accountant", read_only: "a viewer",
};
const list = (n: string[]) => (n.length <= 1 ? n.join("") : `${n.slice(0, -1).join(", ")} or ${n[n.length - 1]}`);
const refusal = (doing: string, resource: "customer" | "reservation") =>
  `${doing} is for ${list(people.filter((r) => can(r, "edit", resource)).map((r) => WHO[r]!))}. Ask one of them.`;

eq(JOIN_REFUSED, refusal("Joining a guest to loyalty, or taking them out", "customer"), "Join / Leave: the gate's sentence");
eq(REDEEM_REFUSED, refusal("Using a guest's loyalty points", "reservation"), "Use points: the gate's sentence");

/* Join and Leave: exactly `customer` edit (D27-307 (4)); not the accountant, not a viewer. */
for (const role of people) eq(mayJoin(role), can(role as Role, "edit", "customer"), `join: ${role}`);
eq(mayJoin("front_desk"), true, "reception joins a guest");
eq(mayJoin("finance"), false, "the accountant does not");
eq(mayJoin("read_only"), false, "a viewer does not");
eq(mayJoin(null), false, "nobody rostered does not");

/* The read: `customer` view (GUESTS). */
for (const role of people) eq(whyNotRead(role) === null, can(role as Role, "view", "customer"), `read: ${role}`);
eq(whyNotRead("housekeeping")?.startsWith("Reading guests is for "), true, "housekeeping is refused in the gate's words");

/* The route's and the database's own words. */
eq(RULES_REFUSED, "The loyalty rules are set by the owner, an administrator or a general manager.", "the rules' 403");
eq(MANAGERS_ONLY, "This is for the owner, an administrator or a general manager.", "the card's and the month's 403");
eq(ADJUST_REFUSED, "Points are added or taken by the owner, an administrator or the general manager.", "the adjustment's refusal");

console.log("loyalty roles: all checks pass");
