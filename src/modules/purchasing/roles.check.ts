/* Run: node --experimental-strip-types src/modules/purchasing/roles.check.ts
   Who may read, raise and receive in purchasing: the lists against the
   core's port of the PMS's matrix (src/core/menu.ts, api/src/permissions.ts),
   so a list and the matrix cannot drift apart (purchasingGrants.test.ts and
   stockGrants.test.ts hold the same on the server). */
import { can, ROLES } from "../../core/menu.ts";
import {
  RAISE_REFUSED, RECEIVE_REFUSED, RECEIVERS, seesSupplierDues, VIEW_REFUSED, VIEW_ROLES, whyNotAct, whyNotRead, whyNotReceive,
} from "./roles.ts";

const eq = (got: unknown, want: unknown, what: string) => {
  if (JSON.stringify(got) !== JSON.stringify(want)) throw new Error(`${what}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
};

const people = ROLES.filter((r) => r !== "automation");
for (const role of people) {
  eq(VIEW_ROLES.includes(role), can(role, "view", "purchasing"), `VIEW_ROLES: ${role} as the matrix's purchasing view`);
  eq(RECEIVERS.includes(role), can(role, "create", "stock"), `RECEIVERS: ${role} as the matrix's stock create`);
  eq(whyNotRead(role), can(role, "view", "purchasing") ? null : VIEW_REFUSED, `the read for ${role}`);
  eq(whyNotReceive(role), can(role, "create", "stock") ? null : RECEIVE_REFUSED, `the delivery for ${role}`);
}
eq(whyNotRead(null), null, "not rostered: the server answers");
eq(whyNotRead("pos"), VIEW_REFUSED, "a waiter is refused, in the server's words");
eq(whyNotReceive(null), RECEIVE_REFUSED, "nobody rostered receives nothing");
eq(whyNotReceive("housekeeping"), RECEIVE_REFUSED, "housekeeping may ask, never put stock on a shelf");
eq(whyNotReceive("kitchen_manager"), null, "the kitchen manager receives, setting or not (the route asks the Store only)");
eq(whyNotAct(true), null, "on the setting");
eq(whyNotAct(false), RAISE_REFUSED, "off it: the server's sentence");
eq(whyNotAct(undefined), RAISE_REFUSED, "not read yet: not offered");
eq(["owner", "admin", "gm", "finance"].every(seesSupplierDues) && !seesSupplierDues("stores") && !seesSupplierDues(null), true,
  "Supplier dues: the four DUES_ROLES, not the Inventory Manager");

console.log("purchasing roles: all checks pass");
