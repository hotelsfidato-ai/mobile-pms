/* Run: node --experimental-strip-types src/modules/purchasing/requesters.check.ts
   Who may ask to buy (lane U): every role a person can be given has its web
   label, the list in the order a person reads (the server's is by key), a
   row's words, and the offline tier (refused, never held). */
import { ROLES } from "../../core/menu.ts";
import { ruleFor } from "../../core/offline.ts";
import { labelOf, sortedRoles, standing, switchAct, switchedWords, switchOffAsk, yesOrDash } from "./requesters.ts";

const eq = (got: unknown, want: unknown, what = "") => {
  if (JSON.stringify(got) !== JSON.stringify(want)) throw new Error(`${what}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
};

/* Every role has the web's label, never its key. */
for (const role of ROLES) if (labelOf(role) === role) throw new Error(`no label for ${role}`);

/* The server answers by key (finance, front_desk, gm…): Reception must not sit between Accountant and General Manager. */
const byKey = ROLES.filter((r) => r !== "automation").sort().map((role) => ({ role, mayRaise: ["owner", "admin", "gm", "stores"].includes(role) }));
eq(sortedRoles(byKey).map((r) => labelOf(r.role)), [
  "Accountant", "Admin", "Bar", "Chef", "General Manager", "Hotel Manager", "Housekeeping", "Inventory Manager",
  "Kitchen Manager", "Owner", "Reception", "Revenue Manager", "Viewer", "Waiter",
], "the picture's order");

eq([standing(true), standing(false)], ["Can raise a request", "Cannot raise a request"]);
eq([yesOrDash(true), yesOrDash(false)], ["Yes", "-"]);
eq([switchAct(true), switchAct(false)], ["Switch off", "Switch on"]);
eq(switchedWords("housekeeping", true), "Housekeeping can now raise a purchase request.");
eq(switchedWords("stores", false), "Inventory Manager can no longer raise one.");
eq(switchOffAsk("kitchen_manager").title, "Switch off Kitchen Manager?");

/* Offline: refused with the UNLISTED sentence - except Housekeeping's own row, whose path ends in
   "/housekeeping" and so matches the web's housekeeping rule (src/lib/offline.ts line 148): the web
   holds it as "Housekeeping" and sends it later; the phone does the same (offline is the web's, the
   tiers are not added to). A PMS fault (MPUR-U1); the PUT sets a value, so a late send is the same act. */
for (const role of ["kitchen_manager", "pos", "bar", "stores", "front_desk"]) {
  eq(ruleFor(`/api/hotels/5EL/purchasing/requesters/${role}`, "PUT").tier, "refuse", `${role} refused offline`);
}
eq(ruleFor("/api/hotels/5EL/purchasing/requesters/housekeeping", "PUT").label, "Housekeeping", "MPUR-U1: the web's tier holds it");

console.log("purchasing requesters.check: ok");
