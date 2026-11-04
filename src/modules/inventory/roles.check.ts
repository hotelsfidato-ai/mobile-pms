/* Run: node --experimental-strip-types src/modules/inventory/roles.check.ts
   Who may read and change rates: the API role gate's grants and its sentence
   (api/src/roleGate.ts 190-193, 796, 863, refusalFor), every role. */
import { AVAILABILITY, PRICE, PRICES, RESTRICTION, refusalFor, whoMay, whyNot } from "./roles.ts";

const eq = (got: unknown, want: unknown, what: string) => {
  if (JSON.stringify(got) !== JSON.stringify(want)) throw new Error(`${what}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
};

/* RATE_SETTER_ROLES (src/lib/permissions.ts, rateSetters.ts; INV-5): exactly four. */
eq(whoMay(PRICE), ["owner", "admin", "gm", "revenue_manager"], "who sets a price");
eq(whoMay(RESTRICTION), ["owner", "admin", "gm", "revenue_manager"], "who closes a day");
/* rate: READ (permissions.ts): the hotel manager, reception and a viewer read, never change. */
eq(whoMay(PRICES), ["owner", "admin", "gm", "hotel_manager", "revenue_manager", "front_desk", "read_only"], "who reads prices");

/* The gate's sentence, word for word as refusalFor writes it. */
eq(refusalFor(PRICE),
  "Setting a price is for the owner, an administrator, the general manager or the revenue manager. Ask one of them.", "price sentence");
eq(refusalFor(RESTRICTION),
  "Setting a stop sell or a minimum stay is for the owner, an administrator, the general manager or the revenue manager. Ask one of them.",
  "restriction sentence");
eq(refusalFor(PRICES),
  "Reading prices is for the owner, an administrator, the general manager, the hotel manager, the revenue manager, reception or a viewer. Ask one of them.",
  "read sentence");

for (const role of ["owner", "admin", "gm", "revenue_manager"]) {
  eq(whyNot(PRICE, role), null, `${role} sets a price`);
  eq(whyNot(RESTRICTION, role), null, `${role} closes a day`);
}
for (const role of ["hotel_manager", "front_desk", "read_only", "housekeeping", "finance", "pos", null, "someone-new"]) {
  eq(whyNot(PRICE, role), refusalFor(PRICE), `${role} may not set a price`);
}
for (const role of ["kitchen_manager", "chef", "pos", "bar", "stores", "housekeeping", "finance"]) {
  eq(whyNot(PRICES, role), refusalFor(PRICES), `${role} may not read prices`);
}
/* Availability: anyone with inventory or reservation view - wider than prices. */
for (const role of ["hotel_manager", "front_desk", "read_only", "revenue_manager", "housekeeping"]) eq(whyNot(AVAILABILITY, role), null, `${role} reads rooms left`);

console.log("inventory roles: ok");
