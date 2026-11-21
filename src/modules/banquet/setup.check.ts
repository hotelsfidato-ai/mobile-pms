/* Run: node --experimental-strip-types src/modules/banquet/setup.check.ts
   Halls and packages (lane U): who may, against the core's port of the PMS's
   matrix; a hall's and a package's words (a dash's words, never ₹0; paise
   kept); the bodies sent as typed (blank is null, 0 only with Free, a word is
   not sent); and the offline tier (refused, nothing held). */
import { can, ROLES, type Role } from "../../core/menu.ts";
import { ruleFor } from "../../core/offline.ts";
import {
  freeRate, hallBody, hallDraft, hallLine, hallProblems, HALLS_REFUSED, headCount, NO_PACKAGE, packageBody, packageLine,
  SETUP_READ_REFUSED, switchedWords, whyNotReadSetup, whyNotSetUp,
} from "./setupRules.ts";

const eq = (got: unknown, want: unknown, what = "") => {
  if (JSON.stringify(got) !== JSON.stringify(want)) throw new Error(`${what}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
};
const people = ROLES.filter((r) => r !== "automation");

/* The read: reservation view or room_config view (roleGate line 942); the setting: room_config edit (HALLS). */
for (const role of people) {
  eq(whyNotReadSetup(role) === null, can(role, "view", "reservation") || can(role, "view", "room_config"), `read: ${role}`);
  eq(whyNotSetUp(role) === null, can(role, "edit", "room_config"), `set up: ${role}`);
}
eq(whyNotSetUp("hotel_manager"), HALLS_REFUSED, "the hotel manager reads and may not set up");
eq(whyNotReadSetup("chef"), SETUP_READ_REFUSED, "a chef may not read");
eq(whyNotSetUp(null), HALLS_REFUSED, "not rostered");
/* refusalFor's words: "<doing> is for <who, in ROLES' order>. Ask one of them." */
const WHO: Partial<Record<Role, string>> = { owner: "the owner", admin: "an administrator", gm: "the general manager" };
const setters = people.filter((r) => can(r, "edit", "room_config")).map((r) => WHO[r]);
eq(HALLS_REFUSED, `Setting up the banquet halls and packages is for ${setters.slice(0, -1).join(", ")} or ${setters.at(-1)}. Ask one of them.`, "HALLS sentence");

/* A hall's line: a dash's words, never ₹0; 0 is a price; paise kept (MEMORY 9). */
eq(hallLine({ seated: 200, floating: 300, defaultRate: 50000 }), "Seats 200 · 300 standing · usually ₹50,000");
eq(hallLine({ seated: null, floating: null, defaultRate: null }), "Seating not recorded · no usual rate");
eq(hallLine({ seated: 80, floating: null, defaultRate: 0 }), "Seats 80 · usually ₹0");
eq(hallLine({ seated: 80, floating: null, defaultRate: 12499.5 }), "Seats 80 · usually ₹12,499.50");
eq(packageLine({ ratePerHead: 850, description: "Soup, starters, mains and dessert" }), "₹850 a head · Soup, starters, mains and dessert");
eq(packageLine({ ratePerHead: null, description: null }), "no rate - agreed per function");
eq(switchedWords("Dinner buffet", false), "Dinner buffet is off: not offered for functions now");
eq(switchedWords("Dinner buffet", true), "Dinner buffet is offered again");

/* A hall's body: blank is null (clears it), a figure as typed, 0 only with Free, notes when typed. */
const d = { name: " Emerald Hall ", seated: "200", floating: "", rate: "", free: false, notes: "" };
eq(hallBody(d), { name: "Emerald Hall", seated: 200, floating: null, defaultRate: null, free: false }, "blank is null");
eq(hallBody({ ...d, rate: "49999.75" })?.defaultRate, 49999.75, "a rate as typed");
eq(hallBody({ ...d, ...freeRate(true) }), { name: "Emerald Hall", seated: 200, floating: null, defaultRate: 0, free: true }, "Free sends 0 with free");
eq(hallBody({ ...d, ...freeRate(false) })?.defaultRate, null, "Free off empties it");
eq(hallBody({ ...d, rate: "0" }), { name: "Emerald Hall", seated: 200, floating: null, defaultRate: 0, free: false }, "a typed 0 goes; the server refuses it in its words");
eq(hallBody({ ...d, rate: "fifty" }), null, "a word is not sent");
eq(hallBody({ ...d, seated: "12.5" }), null, "a head count is whole");
eq(hallBody({ ...d, name: "  " }), null, "no name");
eq(hallBody({ ...d, notes: "Lawn behind" })?.notes, "Lawn behind");
eq(hallProblems({ ...d, seated: "x", rate: "y" }), { seated: "Not a whole number.", floating: null, rate: "Not a figure." });
eq([headCount(""), headCount("0"), headCount("-3"), headCount("40")], [null, 0, "bad", 40], "head counts");
/* Opened for editing: blank where nothing is held, Free where 0 is. */
eq(hallDraft({ id: "1", name: "Lawn", seated: null, floating: 500, defaultRate: 0, isActive: true, notes: null }),
  { name: "Lawn", seated: "", floating: "500", rate: "0", free: true, notes: "" }, "the draft");
eq(hallDraft(null).free, false, "a new hall is not Free");

/* A package's body. */
eq(packageBody({ ...NO_PACKAGE, name: "Dinner buffet", rate: "850", mealType: "Veg" }),
  { name: "Dinner buffet", ratePerHead: 850, free: false, mealType: "Veg" }, "a package");
eq(packageBody({ ...NO_PACKAGE, name: "Hi-tea" }), { name: "Hi-tea", ratePerHead: null, free: false }, "no rate is null");
eq(packageBody({ ...NO_PACKAGE, name: "Hi-tea", rate: "abc" }), null, "a word is not sent");

/* Offline: none of these is on the web's list - refused with its sentence, never held. */
for (const [m, p] of [["POST", "/api/hotels/5EL/banquet/venues"], ["PATCH", "/api/hotels/5EL/banquet/venues/v1"],
  ["POST", "/api/hotels/5EL/banquet/packages"], ["PATCH", "/api/hotels/5EL/banquet/packages/p1"]] as const) {
  eq(ruleFor(p, m).tier, "refuse", `${m} ${p} offline`);
}

console.log("banquet setup.check: ok");
