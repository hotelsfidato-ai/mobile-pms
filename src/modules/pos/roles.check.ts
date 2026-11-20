/* Run: node --experimental-strip-types mobile/src/modules/pos/roles.check.ts
   Who may ring up, read the till and strike a sent dish: the API's lists and words. */
import { whyNotRead, whyNotRing, whyNotStrikeSent } from "./roles.ts";

const eq = (got: unknown, want: unknown, what: string) => {
  if (JSON.stringify(got) !== JSON.stringify(want)) throw new Error(`${what}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
};

/* Today's refusalFor(TILL) and refusalFor(TILL_READ), word for word: the
   roles in permissions.ts ROLES' order, named as roleGate.ts WHO names them
   (MPOS-T1, MPOS-S1: the 15 Oct words said "a till operator"). */
eq(whyNotRing("housekeeping"), "Ringing up an order is for the owner, an administrator, the general manager, the hotel manager, reception, a waiter, a bar person or the accountant. Ask one of them.", "housekeeping rings");
eq(whyNotRead("housekeeping"), "Reading the restaurant's orders is for the owner, an administrator, the general manager, the hotel manager, reception, a waiter, a bar person, the accountant or a viewer. Ask one of them.", "housekeeping reads");

/* Every role of permissions.ts ROLES, against roleGate TILL / TILL_READ. */
const ROLES = ["owner", "admin", "gm", "hotel_manager", "revenue_manager", "front_desk", "housekeeping",
  "kitchen_manager", "chef", "pos", "bar", "stores", "finance", "read_only", "automation"];
eq(ROLES.filter((r) => whyNotRing(r) === null), ["owner", "admin", "gm", "hotel_manager", "front_desk", "pos", "bar", "finance"], "who rings up");
eq(ROLES.filter((r) => whyNotRead(r) === null), ["owner", "admin", "gm", "hotel_manager", "front_desk", "pos", "bar", "finance", "read_only"], "who reads the till");
eq(whyNotRing(null) != null, true, "nobody signed in rings nothing");
eq(whyNotRing("read_only") != null, true, "a viewer reads the till, rings nothing");

/* A sent dish: managers and the kitchen manager; never the waiter or reception. */
for (const role of ["owner", "admin", "gm", "hotel_manager", "kitchen_manager"]) eq(whyNotStrikeSent(role), null, `${role} strikes`);
for (const role of ["pos", "front_desk", "finance", null]) eq(whyNotStrikeSent(role) != null, true, `${role} may not strike a sent dish`);

console.log("pos roles: all checks pass");
