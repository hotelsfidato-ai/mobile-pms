/* Run: node --experimental-strip-types mobile/src/core/menu.check.ts
   Every role's menu in every space it has, as the web's own sidebarFor gave
   it on 31 Oct (pms-ref, modules all on), and the phone's own rules. */
import {
  ROLES, asRole, coversTheFrame, flatNavigationFor, hiddenCount, initials, landing, mayReach, navigationFor,
  phoneRoute, relative, sidebarFor, spaceOf, spacesFor, workingHomeFor, type Role, type Space,
} from "./menu.ts";

/* No node:assert, so the app's own type check reads this file too. */
const eq = (got: unknown, want: unknown) => {
  if (JSON.stringify(got) !== JSON.stringify(want)) throw new Error(`got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
};

const ALL_ON = { pos: true, banquet: true, reception_pos: true, laundry: true, spa: true, bar_stock: true };
const OFF = (...names: string[]) => ({ ...ALL_ON, ...Object.fromEntries(names.map((n) => [n, false])) });
const shown = (role: Role, space: Space, modules: Record<string, boolean> = ALL_ON) =>
  sidebarFor(role, "5EL", modules, space).map((s) =>
    `${s.label ?? ""}: ${s.items.flatMap((i) => [i.label, ...(i.children ?? []).filter((c) => c.to !== i.to).map((c) => c.label)]).join(", ")}`).join(" / ");

const WEB: Record<Role, Partial<Record<Space, string>>> = {
  owner: {
    front: ": Dashboard, Approvals, Rooms, Calendar / Front desk: Arrivals, Upcoming, In house, Due out, Walk-ins, Online check-in, Housekeeping, Work orders, Guest requests, Wake-up calls, Lost property / Bookings: All bookings, Groups, CRS bookings, New booking / Guests & CRM: Guests, Companies and agents, Guest messages, Reviews, Guest 360, Possible same person / Sales and marketing: Leads and WhatsApp, Marketing, Loyalty / Across properties: All properties, Properties, People / Property setup: Cancellation terms, Booking sources / Rooms and rates: Rates, Revenue outlook / Distribution: Channel manager, Contracts / Store and equipment: Store, Inventory, Equipment, Places and suppliers, Purchasing / Finance: Folios, Invoices, Payments, Cashiering, Cash deposits, Company accounts, Form III, Supplier dues, Online payments / Banquet: Diary, Halls and packages / Laundry: Dockets, Price list / Spa: Spa diary, Treatments / Reports: Night audit, All reports, Manager report / System: Notifications, System health, Room systems",
    pos: "Point of sale: Tables, Table bookings, Till, Bill history, Terminal, Kitchen, Bar stock, Menu, Close restaurant day, Charges to rooms, Restaurant setup",
    settings: "Property: Profile, Set up this hotel, Logo and photos, Highlights, Cancellation terms, Amenities, Group, Policies, Documents / Rooms: Room types / Rates and tax: Rates, Rate plans, Meal plans, Taxes / Money: Bank details, Payment methods, Extra charges, Discounts, Commission, Pickup and drop / Lists: Booking sources, Market segments, Reservation types, Ready reasons, Holidays, ID types, VIP levels / Front desk: Times and rules, Front desk rules / Messages: Guest messages, Reviews, Online check-in, Guest messages on/off, Daily report emails / People and security: People, Roles and permissions, Audit log, Activity, Sign-ins and devices, Signing in / Modules and connections: Modules, Channel manager, CRS bookings, Rivals' prices, Integrations, Connection health, System health",
  },
  admin: {
    front: ": Dashboard, Approvals, Rooms, Calendar / Front desk: Arrivals, Upcoming, In house, Due out, Walk-ins, Online check-in, Housekeeping, Work orders, Guest requests, Wake-up calls, Lost property / Bookings: All bookings, Groups, CRS bookings, New booking / Guests & CRM: Guests, Companies and agents, Guest messages, Reviews, Guest 360, Possible same person / Sales and marketing: Leads and WhatsApp, Marketing, Loyalty / Across properties: All properties, Properties, People / Property setup: Cancellation terms, Booking sources / Rooms and rates: Rates, Revenue outlook / Distribution: Channel manager, Contracts / Store and equipment: Store, Inventory, Equipment, Places and suppliers, Purchasing / Finance: Folios, Invoices, Payments, Cashiering, Cash deposits, Company accounts, Form III, Supplier dues, Online payments / Banquet: Diary, Halls and packages / Laundry: Dockets, Price list / Spa: Spa diary, Treatments / Reports: Night audit, All reports, Manager report / System: Notifications, System health, Room systems",
    pos: "Point of sale: Tables, Table bookings, Till, Bill history, Terminal, Kitchen, Bar stock, Menu, Close restaurant day, Charges to rooms, Restaurant setup",
    settings: "Property: Profile, Set up this hotel, Logo and photos, Highlights, Cancellation terms, Amenities, Group, Policies, Documents / Rooms: Room types / Rates and tax: Rates, Rate plans, Meal plans, Taxes / Money: Bank details, Payment methods, Extra charges, Discounts, Commission, Pickup and drop / Lists: Booking sources, Market segments, Reservation types, Ready reasons, Holidays, ID types, VIP levels / Front desk: Times and rules, Front desk rules / Messages: Guest messages, Reviews, Online check-in, Guest messages on/off, Daily report emails / People and security: People, Roles and permissions, Audit log, Activity, Sign-ins and devices, Signing in / Modules and connections: Modules, Channel manager, CRS bookings, Rivals' prices, Integrations, Connection health, System health",
  },
  gm: {
    front: ": Dashboard, Approvals, Rooms, Calendar / Front desk: Arrivals, Upcoming, In house, Due out, Walk-ins, Online check-in, Housekeeping, Work orders, Guest requests, Wake-up calls, Lost property / Bookings: All bookings, Groups, CRS bookings, New booking / Guests & CRM: Guests, Companies and agents, Guest messages, Reviews, Guest 360, Possible same person / Sales and marketing: Leads and WhatsApp, Marketing, Loyalty / Across properties: Properties, People / Property setup: Cancellation terms, Booking sources / Rooms and rates: Rates, Revenue outlook / Distribution: Channel manager, Contracts / Store and equipment: Store, Inventory, Equipment, Places and suppliers, Purchasing / Finance: Folios, Invoices, Payments, Cashiering, Cash deposits, Company accounts, Form III, Supplier dues, Online payments / Banquet: Diary, Halls and packages / Laundry: Dockets, Price list / Spa: Spa diary, Treatments / Reports: Night audit, All reports, Manager report / System: Notifications, Room systems",
    pos: "Point of sale: Tables, Table bookings, Till, Bill history, Terminal, Kitchen, Bar stock, Menu, Close restaurant day, Charges to rooms, Restaurant setup",
    settings: "Property: Profile, Set up this hotel, Logo and photos, Highlights, Cancellation terms, Amenities, Group, Policies, Documents / Rooms: Room types / Rates and tax: Rates, Rate plans, Meal plans, Taxes / Money: Bank details, Payment methods, Extra charges, Discounts, Commission, Pickup and drop / Lists: Booking sources, Market segments, Reservation types, Ready reasons, Holidays, ID types, VIP levels / Front desk: Times and rules, Front desk rules / Messages: Guest messages, Reviews, Online check-in, Guest messages on/off, Daily report emails / People and security: People, Audit log, Activity, Signing in / Modules and connections: Channel manager, CRS bookings, Rivals' prices, Connection health",
  },
  hotel_manager: {
    front: ": Dashboard, Approvals, Rooms, Calendar / Front desk: Arrivals, Upcoming, In house, Due out, Walk-ins, Online check-in, Housekeeping, Work orders, Guest requests, Wake-up calls, Lost property / Bookings: All bookings, Groups, CRS bookings, New booking / Guests & CRM: Guests, Companies and agents, Guest messages, Reviews / Sales and marketing: Leads and WhatsApp, Loyalty / Across properties: Properties, People / Property setup: Cancellation terms / Rooms and rates: Rates / Distribution: Contracts / Store and equipment: Store, Inventory, Equipment, Places and suppliers, Purchasing / Finance: Folios, Invoices, Payments, Cashiering, Company accounts, Form III / Banquet: Diary, Halls and packages / Laundry: Dockets, Price list / Spa: Spa diary / Reports: Night audit, All reports, Manager report / System: Notifications",
    pos: "Point of sale: Tables, Table bookings, Till, Bill history, Terminal, Kitchen, Menu, Close restaurant day, Charges to rooms",
  },
  revenue_manager: {
    front: ": Dashboard, Rooms, Calendar / Front desk: Arrivals, Upcoming, In house, Due out, Walk-ins, Housekeeping, Work orders / Bookings: All bookings, Groups, CRS bookings / Across properties: Properties / Property setup: Cancellation terms, Booking sources / Rooms and rates: Rates, Revenue outlook / Banquet: Diary, Halls and packages / Reports: Night audit, All reports, Manager report / System: Notifications",
  },
  front_desk: {
    front: ": Dashboard, Rooms, Calendar / Front desk: Arrivals, Upcoming, In house, Due out, Walk-ins, Online check-in, Guest requests, Wake-up calls, Lost property / Bookings: All bookings, CRS bookings, New booking / Guests & CRM: Guests, Guest messages / Finance: Cashiering / Laundry: Dockets / System: Notifications",
    pos: "Point of sale: Tables, Till, Bill history, Terminal, Close restaurant day",
  },
  housekeeping: {
    front: ": Rooms / Front desk: Housekeeping, Work orders, Guest requests, Lost property / Store and equipment: Store, Equipment, Purchasing / Laundry: Dockets / System: Notifications",
  },
  kitchen_manager: {
    pos: "Front desk: Guest requests / Store and equipment: Store / Point of sale: Kitchen, Kitchen stock, Menu, Close restaurant day / System: Notifications",
  },
  chef: {
    pos: "Front desk: Guest requests / Point of sale: Kitchen, Kitchen stock / System: Notifications",
  },
  pos: {
    pos: "Front desk: Guest requests / Point of sale: Tables, Till, Terminal, Close restaurant day",
  },
  bar: {
    pos: "Front desk: Guest requests / Point of sale: Tables, Till, Terminal, Bar stock, Close restaurant day",
  },
  stores: {
    front: "Store and equipment: Store, Inventory, Equipment, Purchasing / System: Notifications",
  },
  finance: {
    front: ": Dashboard, Rooms, Calendar / Front desk: Arrivals, Upcoming, In house, Due out, Walk-ins, Housekeeping / Bookings: All bookings, Groups, CRS bookings / Guests & CRM: Guests, Companies and agents, Guest messages, Reviews / Sales and marketing: Leads and WhatsApp, Loyalty / Across properties: Properties / Property setup: Booking sources / Distribution: Contracts / Store and equipment: Store, Inventory, Equipment, Places and suppliers, Purchasing / Finance: Folios, Invoices, Payments, Cashiering, Cash deposits, Company accounts, Supplier dues / Banquet: Diary / Laundry: Dockets, Price list / Reports: Night audit, All reports, Manager report / System: Notifications",
    pos: "Point of sale: Tables, Table bookings, Till, Bill history, Terminal, Kitchen, Close restaurant day, Charges to rooms",
  },
  read_only: {
    front: ": Dashboard, Rooms, Calendar / Front desk: Arrivals, Upcoming, In house, Due out, Walk-ins, Housekeeping, Work orders / Bookings: All bookings, Groups, CRS bookings / Guests & CRM: Guests, Companies and agents, Guest messages, Reviews / Sales and marketing: Leads and WhatsApp, Loyalty / Across properties: Properties / Property setup: Cancellation terms, Booking sources / Rooms and rates: Rates / Distribution: Contracts / Store and equipment: Store, Inventory, Equipment, Places and suppliers, Purchasing / Finance: Folios, Invoices, Payments, Cash deposits, Company accounts / Banquet: Diary, Halls and packages / Laundry: Dockets, Price list / Reports: Night audit, All reports, Manager report / System: Notifications",
    pos: "Point of sale: Kitchen, Menu, Charges to rooms",
  },
  automation: {
    front: "System: Notifications",
  },
};

for (const role of ROLES) {
  eq(spacesFor(role, "5EL", ALL_ON), Object.keys(WEB[role]));
  for (const [space, want] of Object.entries(WEB[role])) eq(shown(role, space as Space), want);
}

/* A property's switches (navigationFor): off only when the answer says off. */
eq(spacesFor("front_desk", "5EL", OFF("reception_pos")), ["front"]);
eq(spacesFor("gm", "5EL", OFF("reception_pos")), ["front", "pos", "settings"]); // reception's switch alone
eq(spacesFor("gm", "5EL", OFF("pos")), ["front", "settings"]);
eq(shown("housekeeping", "front", OFF("laundry")).includes("Dockets"), false);
eq(shown("housekeeping", "front").includes("Dockets"), true);
eq(sidebarFor("gm", "5EL", undefined, "front").some((s) => s.label === "Laundry"), true); // unknown keeps it
eq(navigationFor("gm", "5EL", OFF("bar_stock")).flatMap((s) => s.items).some((i) => i.label === "Bar stock"), false);

/* Nothing leaves the role's reach in the menu: every entry shown is theirs to open. */
for (const role of ROLES) {
  const flat = new Set(flatNavigationFor(role, "5EL", ALL_ON).map((i) => i.to));
  for (const space of spacesFor(role, "5EL", ALL_ON)) {
    for (const section of sidebarFor(role, "5EL", ALL_ON, space)) for (const i of section.items) eq(flat.has(i.to), true);
  }
}
eq(hiddenCount("gm", "5EL", ALL_ON, "front") > 0, true);
eq(hiddenCount("housekeeping", "5EL", ALL_ON, "front") > 0, true);

/* The banner's link: who may open Night audit. */
eq(mayReach("gm", "/h/:code/night-audit"), true);
eq(mayReach("front_desk", "/h/:code/night-audit"), true);
eq(mayReach("housekeeping", "/h/:code/night-audit"), false);
eq(mayReach("pos", "/h/:code/night-audit"), false);

/* What the phone has. */
eq(phoneRoute("/", "5EL"), "/hotel/5EL");
eq(phoneRoute("/all-properties", "5EL"), "/all");
eq(phoneRoute("/notifications", "5EL"), "/notifications/5EL");
eq(phoneRoute("/h/5EL/housekeeping", "5EL"), "/housekeeping/5EL");
eq(phoneRoute("/h/5EL/work-orders", "5EL"), "/housekeeping/5EL/work-orders");
eq(phoneRoute("/pos/5EL/tables", "5EL"), "/pos/5EL/tables");
eq(phoneRoute("/h/5EL/arrivals?x=1", "5EL"), "/front-desk/5EL"); // a notification's link
eq(phoneRoute("/h/5EL/approvals", "5EL"), null);
eq(phoneRoute("/settings/rates/taxes", "5EL"), null);

/* A property's landing, by role (app/index.tsx, the web's WORKING_HOME). */
eq(landing("housekeeping", "AGR"), "/housekeeping/AGR");
eq(landing("pos", "AGR"), "/pos/AGR/tables");
eq(landing("bar", "AGR"), "/pos/AGR/tables");
eq(landing("chef", "AGR"), "/pos/AGR/kitchen");
eq(landing("kitchen_manager", "AGR"), "/pos/AGR/kitchen");
eq(landing("gm", "AGR"), "/hotel/AGR");
eq(landing("owner", "AGR"), "/hotel/AGR");
eq(landing("front_desk", "AGR"), "/hotel/AGR");
eq(landing("stores", "AGR"), "/all"); // its Store is not on the phone yet
eq(workingHomeFor("stores", "AGR"), "/h/AGR/stores");

/* The full-screen pages cover the frame. */
eq(coversTheFrame("/pos/5EL/kitchen"), true);
eq(coversTheFrame("/pos/5EL/terminal"), true);
eq(coversTheFrame("/pos/5EL/tables"), false);
eq(coversTheFrame("/hotel/5EL"), false);

eq(spaceOf("/pos/5EL/tables"), "pos");
eq(spaceOf("/housekeeping/5EL"), "front");
eq(asRole("gm"), "gm");
eq(asRole("nonsense"), "read_only");
eq(asRole(null), "read_only");
eq(initials("Test GM"), "TG");
eq(initials("Owner"), "O");
eq(initials("  Mary Ann Rose "), "MA");

/* date-fns's words, at its own edges. */
const now = Date.parse("2026-10-31T12:00:00Z");
const ago = (minutes: number) => relative(new Date(now - minutes * 60_000).toISOString(), now);
eq(ago(0), "less than a minute ago");
eq(ago(1), "1 minute ago");
eq(ago(44), "44 minutes ago");
eq(ago(45), "about 1 hour ago");
eq(ago(120), "about 2 hours ago");
eq(ago(1_500), "1 day ago");
eq(ago(2_520), "2 days ago");
eq(ago(20 * 1_440), "20 days ago");
eq(ago(45 * 1_440), "about 2 months ago");
eq(ago(100 * 1_440), "3 months ago");
eq(ago(400 * 1_440), "about 1 year ago");
eq(ago(600 * 1_440), "over 1 year ago");
eq(ago(690 * 1_440), "almost 2 years ago");
eq(relative(new Date(now + 120 * 60_000).toISOString(), now), "in about 2 hours");
eq(relative("nonsense", now), "-");

console.log("menu: all checks pass");
