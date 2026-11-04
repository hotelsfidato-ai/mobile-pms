/* Run: node --experimental-strip-types mobile/src/modules/crs/roles.check.ts
   Who may read CRS bookings, mark a note done and connect the CRS:
   api/src/roleGate.ts (STAYS, CHANGE_BOOKING, own setup.ts) over
   api/src/permissions.ts (the core's port in menu.ts), 4 Nov. */
import { ROLES, can } from "../../core/menu.ts";
import { READ_REFUSED, SETUP_REFUSED, maySetUp, whyNotDone, whyNotRead } from "./roles.ts";

const eq = (got: unknown, want: unknown, what: string) => {
  if (JSON.stringify(got) !== JSON.stringify(want)) throw new Error(`${what}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
};

/* The sentences refusalFor() and setup.ts make, word for word. */
eq(READ_REFUSED, "Reading bookings is for the owner, an administrator, the general manager, the hotel manager, the revenue manager, reception, housekeeping, the kitchen manager, a waiter, a bar person, the accountant or a viewer. Ask one of them.", "the read's sentence");
eq(SETUP_REFUSED, "Connecting the CRS is for the owner and an administrator. Ask one of them.", "setup's sentence");
eq(whyNotDone("housekeeping"), "Changing a booking is for the owner, an administrator, the general manager, the hotel manager or reception. Ask one of them.", "Done's sentence");

/* The lists are the matrix's (never the automation account: whoMay leaves it out). */
const people = ROLES.filter((r) => r !== "automation");
eq(people.filter((r) => whyNotRead(r) === null), people.filter((r) => can(r, "view", "reservation")), "who reads");
eq(people.filter((r) => whyNotDone(r) === null), people.filter((r) => can(r, "edit", "reservation")), "who marks done");
for (const r of ["chef", "stores"]) eq(whyNotRead(r), READ_REFUSED, `${r} is refused the read`);
eq(whyNotRead(null), null, "not rostered: the server's own answer");
eq(whyNotDone(null) !== null, true, "not rostered: Done refused");

eq(people.filter(maySetUp), ["owner", "admin"], "who connects the CRS");
eq(maySetUp(null), false, "nobody else");

console.log("crs roles: ok");
