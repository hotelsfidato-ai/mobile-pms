/* Run: node --experimental-strip-types src/modules/stores/roles.check.ts
   Who may see, change and correct the store: the server's lists against the
   core's port of the PMS's matrix (src/core/menu.ts, grantsFor(role, "stock")),
   the way api/test/modules/stores/stockGrants.test.ts holds the server's copy
   to the website's - so a list here cannot drift from the matrix. */
import { can, ROLES } from "../../core/menu.ts";
import {
  BAR_KEEPERS, KITCHEN_KEEPERS, STOCK_CREATE, STOCK_EDIT, STOCK_REFUSED, STOCK_VIEW, whyNotChange, whyNotCorrect,
  whyNotCountBar, whyNotCountKitchen, whyNotDecide, whyNotSee, whyNotSeeBar, whyNotCloseBar, whyNotAsk,
} from "./roles.ts";

const eq = (got: unknown, want: unknown, what: string) => {
  if (JSON.stringify(got) !== JSON.stringify(want)) throw new Error(`${what}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
};

const people = ROLES.filter((r) => r !== "automation");
for (const role of people) {
  eq(STOCK_VIEW.includes(role), can(role, "view", "stock"), `view: ${role} as the matrix says`);
  eq(STOCK_CREATE.includes(role), can(role, "create", "stock"), `create: ${role} as the matrix says`);
  eq(STOCK_EDIT.includes(role), can(role, "edit", "stock"), `edit: ${role} as the matrix says`);
  eq(whyNotSee(role) === null, can(role, "view", "stock"), `whyNotSee: ${role}`);
  eq(whyNotChange(role) === null, can(role, "create", "stock"), `whyNotChange: ${role}`);
  eq(whyNotCorrect(role) === null, can(role, "edit", "stock"), `whyNotCorrect: ${role}`);
}

/* Nobody rostered is refused everything. */
for (const why of [whyNotSee, whyNotChange, whyNotCorrect, whyNotSeeBar, whyNotCountBar, whyNotCountKitchen, whyNotDecide, whyNotCloseBar, whyNotAsk]) {
  eq(why(null) !== null, true, "nobody rostered is refused");
}

/* The Inventory Manager (key `stores`) does all of the floor's work. */
for (const why of [whyNotSee, whyNotChange, whyNotCorrect, whyNotSeeBar, whyNotCountBar, whyNotCountKitchen, whyNotDecide, whyNotAsk]) {
  eq(why("stores"), null, "the Inventory Manager may");
}
eq(whyNotCloseBar("stores") !== null, true, "the Inventory Manager does not mark the bar closed (FORMAT_SETTERS)");

/* The kitchen manager receives and issues but corrects no count (STO-1), and
   does not count the kitchen (KITCHEN_KEEPERS, D27-374); the chef only looks. */
eq(whyNotChange("kitchen_manager"), null, "the kitchen manager issues");
eq(whyNotCorrect("kitchen_manager"), STOCK_REFUSED.edit, "the kitchen manager corrects no count");
eq(whyNotCountKitchen("kitchen_manager") !== null, true, "the kitchen manager does not count the kitchen");
eq(whyNotChange("chef"), STOCK_REFUSED.create, "the chef only looks");
eq(whyNotSee("front_desk"), STOCK_REFUSED.view, "reception does not see the store");

/* The bar: its keepers count it, everyone who sees the Store reads it. */
eq(BAR_KEEPERS.includes("bar") && !STOCK_VIEW.includes("bar"), true, "the bar person counts the bar, not the store");
eq(whyNotSeeBar("bar"), null, "the bar reads its sheet");
eq(whyNotSeeBar("housekeeping"), null, "whoever sees the Store reads the bar's sheet");
eq(whyNotCountBar("hotel_manager") !== null, true, "the hotel manager does not count the bar");
eq(KITCHEN_KEEPERS.every((r) => STOCK_EDIT.includes(r)), true, "a kitchen keeper corrects counts");

console.log("stores roles: all checks pass");
