/* Run: node --experimental-strip-types mobile/src/modules/front-desk/roles.check.ts
   Who may check in, give a room, book, take the advance and see the bill:
   today's API's answers, read back on 31 Oct as dev-housekeeping. */
import { mayGiveComp, maySettle, seesBills, whyNotBook, whyNotCheckIn, whyNotGuest, whyNotPay, whyNotRoom } from "./roles.ts";

const eq = (got: unknown, want: unknown, what: string) => {
  if (JSON.stringify(got) !== JSON.stringify(want)) throw new Error(`${what}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
};

/* The sentences the API gave a refused person, word for word. */
eq(whyNotCheckIn("housekeeping"), "Checking a guest in is for the owner, an administrator, the general manager, the hotel manager or reception. Ask one of them.", "housekeeping checks in");
eq(whyNotRoom("housekeeping"), "Giving a booking a room, or moving it is for the owner, an administrator, the general manager, the hotel manager or reception. Ask one of them.", "housekeeping gives a room");
eq(whyNotBook("housekeeping"), "Making a booking is for the owner, an administrator, the general manager, the hotel manager or reception. Ask one of them.", "housekeeping books");
eq(whyNotGuest("housekeeping"), "Changing a guest's record is for the owner, an administrator, the general manager, the hotel manager or reception. Ask one of them.", "housekeeping changes a guest");
eq(whyNotPay("housekeeping"), "Taking a payment is for the owner, an administrator, the general manager, the hotel manager, reception or the accountant. Ask one of them.", "housekeeping takes money");

for (const role of ["owner", "admin", "gm", "hotel_manager", "front_desk"]) {
  eq([whyNotCheckIn(role), whyNotRoom(role), whyNotBook(role), whyNotPay(role)], [null, null, null, null], `${role} works the desk`);
}
for (const role of ["revenue_manager", "kitchen_manager", "housekeeping", "pos", "finance", "read_only", "chef", "stores", null]) {
  eq(whyNotCheckIn(role) != null, true, `${role} may not check in`);
}
eq(whyNotPay("finance"), null, "the accountant takes money");
eq([seesBills("front_desk"), seesBills("finance"), seesBills("read_only"), seesBills("housekeeping"), seesBills("revenue_manager")], [true, true, true, false, false], "who reads bills (D27-143)");
eq([maySettle("finance"), maySettle("front_desk"), maySettle("read_only")], [true, true, false], "Settle and check out");
eq([mayGiveComp("gm"), mayGiveComp("hotel_manager"), mayGiveComp("front_desk")], [true, false, false], "complimentary: owner, admin, GM");

console.log("front-desk roles: all checks pass");
