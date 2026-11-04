/* Run: node --experimental-strip-types mobile/src/modules/reservations/roles.check.ts
   Who may book from the Calendar, place a room, take the advance, and allow a booking over a credit limit. */
import { mayGiveComp, OVER_LIMIT_WHO, whyNotBook, whyNotPay, whyNotRoom } from "./roles.ts";

const eq = (got: unknown, want: unknown, what: string) => {
  if (JSON.stringify(got) !== JSON.stringify(want)) throw new Error(`${what}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
};

/* The Calendar's empty cell and Assign room: front desk's sentences, the same lists. */
eq([whyNotBook("front_desk"), whyNotRoom("gm")], [null, null], "the desk books and rooms");
eq(whyNotBook("housekeeping")?.startsWith("Making a booking is for"), true, "housekeeping reads the Calendar but books nothing");
eq(whyNotRoom("finance")?.startsWith("Giving a booking a room"), true, "the accountant places no room");
eq([mayGiveComp("owner"), mayGiveComp("gm"), mayGiveComp("front_desk"), mayGiveComp("hotel_manager")], [true, true, false, false], "the over-limit allow is the list keepers'");
eq(OVER_LIMIT_WHO, "The owner, an administrator or the general manager can allow it.", "who else is told who can");
eq([whyNotPay("finance"), whyNotPay("housekeeping") !== null], [null, true], "the advance: the accountant too");

console.log("reservations roles: all checks pass");
