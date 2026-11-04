/* Run: node --experimental-strip-types mobile/src/modules/reservations/roles.check.ts
   Who may read the book and the Calendar, and the API's sentence. */
import { mayGiveComp, whyNotBook, whyNotRoom, whyNotSee } from "./roles.ts";

const eq = (got: unknown, want: unknown, what: string) => {
  if (JSON.stringify(got) !== JSON.stringify(want)) throw new Error(`${what}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
};

/* refusalFor(STAYS), with WHO's words in ROLES' order. */
eq(whyNotSee("chef"), "Reading bookings is for the owner, an administrator, the general manager, the hotel manager, the revenue manager, reception, housekeeping, the kitchen manager, a waiter, a bar person, the accountant or a viewer. Ask one of them.", "a chef reads no bookings (D27-141)");
eq(whyNotSee("stores") !== null && whyNotSee(null) !== null, true, "nor the Inventory Manager (D27-142), nor nobody");
for (const role of ["owner", "admin", "gm", "hotel_manager", "revenue_manager", "front_desk", "housekeeping", "kitchen_manager", "pos", "bar", "finance", "read_only"]) {
  eq(whyNotSee(role), null, `${role} reads the book`);
}
/* The Calendar's empty cell and Assign room: front desk's sentences, the same lists. */
eq([whyNotBook("front_desk"), whyNotRoom("gm")], [null, null], "the desk books and rooms");
eq(whyNotBook("housekeeping")?.startsWith("Making a booking is for"), true, "housekeeping reads the Calendar but books nothing");
eq(whyNotRoom("finance")?.startsWith("Giving a booking a room"), true, "the accountant places no room");
eq([mayGiveComp("owner"), mayGiveComp("front_desk")], [true, false], "the over-limit allow is the list keepers'");

console.log("reservations roles: all checks pass");
