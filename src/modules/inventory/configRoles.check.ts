/* Run: node --experimental-strip-types src/modules/inventory/configRoles.check.ts
   Who may read and change the set-up screens: the API role gate's grants and
   its sentence (api/src/roleGate.ts), the database's app.is_manager(), the
   channel manager's own lists, and Group rate change's properties. */
import {
  COMMISSION, PRICE, SETUP_ADD, SETUP_CHANGE, SETUP_READ, SOURCES_READ, TERMS, TERMS_READ,
  isManager, priceHotels, readsChannelBookings, refusalFor, seesGroupRates, setsUpSu, whoMay, whyNot,
} from "./configRoles.ts";

const eq = (got: unknown, want: unknown, what: string) => {
  if (JSON.stringify(got) !== JSON.stringify(want)) throw new Error(`${what}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
};

/* room_config create and edit: the people who set the hotel up (owner, admin, GM). */
eq(whoMay(SETUP_ADD), ["owner", "admin", "gm"], "who adds a room type");
eq(whoMay(SETUP_CHANGE), ["owner", "admin", "gm"], "who changes the setup");
eq(refusalFor(SETUP_CHANGE), "Changing the hotel's setup is for the owner, an administrator or the general manager. Ask one of them.", "setup sentence");
eq(refusalFor(SETUP_ADD), "Setting the hotel up is for the owner, an administrator or the general manager. Ask one of them.", "add sentence");
for (const role of ["hotel_manager", "front_desk", "read_only", "revenue_manager", "finance", null, "someone-new"]) {
  eq(whyNot(SETUP_CHANGE, role), refusalFor(SETUP_CHANGE), `${role} may not change the setup`);
}
/* Reading room setup: wider than changing it. */
eq(whyNot(SETUP_READ, "gm"), null, "the GM reads the setup");
eq(whyNot(SETUP_READ, "pos") !== null, true, "a waiter does not read the setup");

/* The cancellation terms: written by the rate setters (INV-5), read as prices. */
eq(whoMay(TERMS), ["owner", "admin", "gm", "revenue_manager"], "who writes the terms");
eq(refusalFor(TERMS), "Setting the cancellation terms is for the owner, an administrator, the general manager or the revenue manager. Ask one of them.", "terms sentence");
eq(whyNot(TERMS_READ, "front_desk"), null, "reception reads the terms");
eq(whyNot(TERMS, "front_desk"), refusalFor(TERMS), "reception does not write them");

/* A source's commission: the owner, an administrator and the GM (D22-30). */
eq(whoMay(COMMISSION), ["owner", "admin", "gm"], "who sets a commission");
eq(refusalFor(COMMISSION), "Setting a booking source's commission is for the owner, an administrator or the general manager. Ask one of them.", "commission sentence");
eq(whyNot(SOURCES_READ, "front_desk"), null, "reception reads the sources (reservation view)");
eq(whyNot(SOURCES_READ, "chef") !== null, true, "a chef does not");

/* app.is_manager(): any hotel's owner, Administrator or GM, or a group administrator. */
eq(isManager({ isGroupAdmin: false, hotels: [{ role: "front_desk" }, { role: "gm" }] }), true, "a GM elsewhere is a manager here");
eq(isManager({ isGroupAdmin: false, hotels: [{ role: "admin" }] }), true, "an Administrator is a manager (198)");
eq(isManager({ isGroupAdmin: false, hotels: [{ role: "hotel_manager" }, { role: "revenue_manager" }] }), false, "a hotel manager is not");
eq(isManager({ isGroupAdmin: true, hotels: [] }), true, "a group administrator is");

/* The SU setup is the owner's and an Administrator's; its bookings the GM's too. */
eq(["owner", "admin", "gm", "hotel_manager"].map(setsUpSu), [true, true, false, false], "who sets SU up");
eq(["owner", "admin", "gm", "front_desk", null].map(readsChannelBookings), [true, true, true, false, false], "who reads the sites' bookings");

/* Group rate change: only real properties where this person sets a price. */
const hotels = [
  { id: "h1", code: "5EL", name: "5 Elements", businessDate: "2026-11-15" },
  { id: "h2", code: "AGR", name: "Agra", businessDate: "2026-11-16" },
  { id: "h3", code: "T5E", name: "Test", businessDate: "2026-11-16", testOf: "5EL" },
  { id: "h4", code: "GOA", name: "Goa", businessDate: "2026-11-16" },
];
const scope = { isGroupAdmin: false, hotels: [{ hotelId: "h1", role: "revenue_manager" }, { hotelId: "h2", role: "front_desk" }, { hotelId: "h3", role: "gm" }] };
eq(priceHotels(scope, hotels).map((h) => h.code), ["5EL"], "a revenue manager at one, reception at another, a test hotel");
eq(priceHotels({ isGroupAdmin: true, hotels: [] }, hotels).map((h) => h.code), ["5EL", "AGR", "GOA"], "a group administrator: every real property");
eq(seesGroupRates("owner", priceHotels({ isGroupAdmin: true, hotels: [] }, hotels)), true, "the menu shows it over several");
eq(seesGroupRates("revenue_manager", priceHotels(scope, hotels)), false, "not over one");
eq(refusalFor(PRICE), "Setting a price is for the owner, an administrator, the general manager or the revenue manager. Ask one of them.", "price sentence");

console.log("inventory set-up roles: ok");
