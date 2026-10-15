/* Run: node --experimental-strip-types mobile/src/modules/pos/roles.check.ts
   Who may ring up, read the till and strike a sent dish: the API's lists and words. */
import { whyNotRead, whyNotRing, whyNotStrikeSent } from "./roles.ts";

const eq = (got: unknown, want: unknown, what: string) => {
  if (JSON.stringify(got) !== JSON.stringify(want)) throw new Error(`${what}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
};

/* The sentences the API gave dev-housekeeping on 15 Oct, word for word. */
eq(whyNotRing("housekeeping"), "Ringing up an order is for the owner, an administrator, the general manager, the hotel manager, reception, a till operator or the accountant. Ask one of them.", "housekeeping rings");
eq(whyNotRead("housekeeping"), "Reading the restaurant's orders is for the owner, an administrator, the general manager, the hotel manager, reception, a till operator, the accountant or a viewer. Ask one of them.", "housekeeping reads");

for (const role of ["owner", "gm", "hotel_manager", "front_desk", "pos", "finance"]) eq(whyNotRing(role), null, `${role} rings`);
for (const role of ["chef", "kitchen_manager", "read_only", "stores", null]) eq(whyNotRing(role) != null, true, `${role} may not ring`);
eq(whyNotRead("read_only"), null, "a viewer reads");
eq(whyNotRead("chef") != null, true, "a chef may not read the till");

/* A sent dish: managers and the kitchen manager; never the waiter or reception. */
for (const role of ["owner", "admin", "gm", "hotel_manager", "kitchen_manager"]) eq(whyNotStrikeSent(role), null, `${role} strikes`);
for (const role of ["pos", "front_desk", "finance", null]) eq(whyNotStrikeSent(role) != null, true, `${role} may not strike a sent dish`);

console.log("pos roles: all checks pass");
