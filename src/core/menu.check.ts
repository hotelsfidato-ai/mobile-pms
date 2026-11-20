/* Run: node --experimental-strip-types mobile/src/core/menu.check.ts
   Every role's menu in every space it has, as the web's own sidebarFor gives
   it (re-ported from the 16 Nov release on 20 Nov, a production build,
   modules all on), every role's whole reach, and the phone's own rules. */
import {
  PHONE_ROUTES, ROLES, activeRoute, asRole, coversTheFrame, flatNavigationFor, hiddenCount, initials, landing, mayReach, navigationFor,
  phoneRoute, relative, severalOf, sidebarFor, spaceHere, spaceHome, spaceOf, spacesFor, workingHomeFor, type Role, type Space,
} from "./menu.ts";
import type { HotelsResponse } from "./api.ts";
import { existsSync, readdirSync, statSync } from "node:fs";

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
    front: ": Dashboard, Approvals, Rooms, Calendar / Front desk: Arrivals, Upcoming, In house, Due out, Walk-ins, Online check-in, Housekeeping, Minibar, Checklists, Work orders, Guest requests, Wake-up calls, Lost property / Bookings: All bookings, Groups, CRS bookings, New booking, Waitlist / Guests & CRM: Guests, Companies and agents, Guest messages, Reviews, Guest feedback, Guest 360, Possible same person / Sales and marketing: Leads and WhatsApp, Marketing, Loyalty / Across properties: All properties, Properties, People / Property setup: Cancellation terms, Booking sources / Rooms and rates: Rates, Revenue outlook / Distribution: Channel manager, Contracts / Store and equipment: Store, Inventory, Equipment, Places and suppliers, Purchasing / Finance: Folios, Invoices, Payments, Cashiering, Cash deposits, Company accounts, Form III, Supplier dues, Online payments / Banquet: Diary, Halls and packages / Laundry: Dockets, Price list / Spa: Spa diary, Treatments / Reports: Night audit, All reports, Manager report / System: Notifications, System health, Room systems",
    pos: "Point of sale: Tables, Table bookings, Till, Bill history, Terminal, Kitchen, Bar stock, Menu, Close restaurant day, Charges to rooms, Restaurant setup",
    settings: "Property: Profile, Set up this hotel, Backfill data, Bring in old data, Logo and photos, Highlights, Cancellation terms, Amenities, Group, Policies, Documents / Rooms: Room types / Rates and tax: Rates, Rate plans, Meal plans, Taxes / Money: Bank details, Payment methods, Extra charges, Room discounts, Commission, Pickup and drop / Lists: Booking sources, Market segments, Reservation types, Ready reasons, Holidays, ID types, VIP levels / Front desk: Times and rules, Front desk rules / Messages: Guest messages, Reviews, Online check-in, Guest messages on/off, Daily report emails, Scheduled reports / People and security: People, Roles and permissions, Audit log, Activity, Sign-ins and devices, Signing in / Modules and connections: Modules, Channel manager, CRS bookings, Rivals' prices, Integrations, Connection health, System health",
  },
  admin: {
    front: ": Dashboard, Approvals, Rooms, Calendar / Front desk: Arrivals, Upcoming, In house, Due out, Walk-ins, Online check-in, Housekeeping, Minibar, Checklists, Work orders, Guest requests, Wake-up calls, Lost property / Bookings: All bookings, Groups, CRS bookings, New booking, Waitlist / Guests & CRM: Guests, Companies and agents, Guest messages, Reviews, Guest feedback, Guest 360, Possible same person / Sales and marketing: Leads and WhatsApp, Marketing, Loyalty / Across properties: All properties, Properties, People / Property setup: Cancellation terms, Booking sources / Rooms and rates: Rates, Revenue outlook / Distribution: Channel manager, Contracts / Store and equipment: Store, Inventory, Equipment, Places and suppliers, Purchasing / Finance: Folios, Invoices, Payments, Cashiering, Cash deposits, Company accounts, Form III, Supplier dues, Online payments / Banquet: Diary, Halls and packages / Laundry: Dockets, Price list / Spa: Spa diary, Treatments / Reports: Night audit, All reports, Manager report / System: Notifications, System health, Room systems",
    pos: "Point of sale: Tables, Table bookings, Till, Bill history, Terminal, Kitchen, Bar stock, Menu, Close restaurant day, Charges to rooms, Restaurant setup",
    settings: "Property: Profile, Set up this hotel, Backfill data, Bring in old data, Logo and photos, Highlights, Cancellation terms, Amenities, Group, Policies, Documents / Rooms: Room types / Rates and tax: Rates, Rate plans, Meal plans, Taxes / Money: Bank details, Payment methods, Extra charges, Room discounts, Commission, Pickup and drop / Lists: Booking sources, Market segments, Reservation types, Ready reasons, Holidays, ID types, VIP levels / Front desk: Times and rules, Front desk rules / Messages: Guest messages, Reviews, Online check-in, Guest messages on/off, Daily report emails, Scheduled reports / People and security: People, Roles and permissions, Audit log, Activity, Sign-ins and devices, Signing in / Modules and connections: Modules, Channel manager, CRS bookings, Rivals' prices, Integrations, Connection health, System health",
  },
  gm: {
    front: ": Dashboard, Approvals, Rooms, Calendar / Front desk: Arrivals, Upcoming, In house, Due out, Walk-ins, Online check-in, Housekeeping, Minibar, Checklists, Work orders, Guest requests, Wake-up calls, Lost property / Bookings: All bookings, Groups, CRS bookings, New booking, Waitlist / Guests & CRM: Guests, Companies and agents, Guest messages, Reviews, Guest feedback, Guest 360, Possible same person / Sales and marketing: Leads and WhatsApp, Marketing, Loyalty / Across properties: Properties, People / Property setup: Cancellation terms, Booking sources / Rooms and rates: Rates, Revenue outlook / Distribution: Channel manager, Contracts / Store and equipment: Store, Inventory, Equipment, Places and suppliers, Purchasing / Finance: Folios, Invoices, Payments, Cashiering, Cash deposits, Company accounts, Form III, Supplier dues, Online payments / Banquet: Diary, Halls and packages / Laundry: Dockets, Price list / Spa: Spa diary, Treatments / Reports: Night audit, All reports, Manager report / System: Notifications, Room systems",
    pos: "Point of sale: Tables, Table bookings, Till, Bill history, Terminal, Kitchen, Bar stock, Menu, Close restaurant day, Charges to rooms, Restaurant setup",
    settings: "Property: Profile, Set up this hotel, Backfill data, Logo and photos, Highlights, Cancellation terms, Amenities, Group, Policies, Documents / Rooms: Room types / Rates and tax: Rates, Rate plans, Meal plans, Taxes / Money: Bank details, Payment methods, Extra charges, Room discounts, Commission, Pickup and drop / Lists: Booking sources, Market segments, Reservation types, Ready reasons, Holidays, ID types, VIP levels / Front desk: Times and rules, Front desk rules / Messages: Guest messages, Reviews, Online check-in, Guest messages on/off, Daily report emails, Scheduled reports / People and security: People, Audit log, Activity, Signing in / Modules and connections: Channel manager, CRS bookings, Rivals' prices, Connection health",
  },
  hotel_manager: {
    front: ": Dashboard, Approvals, Rooms, Calendar / Front desk: Arrivals, Upcoming, In house, Due out, Walk-ins, Online check-in, Housekeeping, Minibar, Checklists, Work orders, Guest requests, Wake-up calls, Lost property / Bookings: All bookings, Groups, CRS bookings, New booking, Waitlist / Guests & CRM: Guests, Companies and agents, Guest messages, Reviews / Sales and marketing: Leads and WhatsApp, Loyalty / Across properties: Properties, People / Property setup: Cancellation terms / Rooms and rates: Rates / Distribution: Contracts / Store and equipment: Store, Inventory, Equipment, Places and suppliers, Purchasing / Finance: Folios, Invoices, Payments, Cashiering, Company accounts, Form III / Banquet: Diary, Halls and packages / Laundry: Dockets, Price list / Spa: Spa diary / Reports: Night audit, All reports, Manager report / System: Notifications",
    pos: "Point of sale: Tables, Table bookings, Till, Bill history, Terminal, Kitchen, Menu, Close restaurant day, Charges to rooms",
  },
  revenue_manager: {
    front: ": Dashboard, Rooms, Calendar / Front desk: Arrivals, Upcoming, In house, Due out, Walk-ins, Housekeeping, Minibar, Checklists, Work orders / Bookings: All bookings, Groups, CRS bookings, Waitlist / Across properties: Properties / Property setup: Cancellation terms, Booking sources / Rooms and rates: Rates, Revenue outlook / Banquet: Diary, Halls and packages / Reports: Night audit, All reports, Manager report / System: Notifications",
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
    front: ": Dashboard, Rooms, Calendar / Front desk: Arrivals, Upcoming, In house, Due out, Walk-ins, Housekeeping, Minibar / Bookings: All bookings, Groups, CRS bookings, Waitlist / Guests & CRM: Guests, Companies and agents, Guest messages, Reviews / Sales and marketing: Leads and WhatsApp, Loyalty / Across properties: Properties / Property setup: Booking sources / Distribution: Contracts / Store and equipment: Store, Inventory, Equipment, Places and suppliers, Purchasing / Finance: Folios, Invoices, Payments, Cashiering, Cash deposits, Company accounts, Supplier dues / Banquet: Diary / Laundry: Dockets, Price list / Reports: Night audit, All reports, Manager report / System: Notifications",
    pos: "Point of sale: Tables, Table bookings, Till, Bill history, Terminal, Kitchen, Close restaurant day, Charges to rooms",
  },
  read_only: {
    front: ": Dashboard, Rooms, Calendar / Front desk: Arrivals, Upcoming, In house, Due out, Walk-ins, Housekeeping, Minibar, Checklists, Work orders / Bookings: All bookings, Groups, CRS bookings, Waitlist / Guests & CRM: Guests, Companies and agents, Guest messages, Reviews / Sales and marketing: Leads and WhatsApp, Loyalty / Across properties: Properties / Property setup: Cancellation terms, Booking sources / Rooms and rates: Rates / Distribution: Contracts / Store and equipment: Store, Inventory, Equipment, Places and suppliers, Purchasing / Finance: Folios, Invoices, Payments, Cash deposits, Company accounts / Banquet: Diary, Halls and packages / Laundry: Dockets, Price list / Reports: Night audit, All reports, Manager report / System: Notifications",
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

/* Every screen each role may reach, listed or not (the web's flatNavigationFor,
   16 Nov release): Find a screen's list and what mayReach asks. Without the
   session's answer the two group entries are not counted (below). */
eq(Object.fromEntries(ROLES.map((role) => [role, flatNavigationFor(role, "5EL", ALL_ON).length])), {
  owner: 159, admin: 159, gm: 152, hotel_manager: 96, revenue_manager: 39, front_desk: 76, housekeeping: 28,
  kitchen_manager: 28, chef: 9, pos: 21, bar: 22, stores: 23, finance: 89, read_only: 81, automation: 1,
});
/* New in the 16 Nov release, each with the web's own rule. */
eq(ROLES.filter((r) => mayReach(r, "/h/:code/minibar")), ["owner", "admin", "gm", "hotel_manager", "revenue_manager", "front_desk", "housekeeping", "kitchen_manager", "pos", "bar", "finance", "read_only"]);
eq(ROLES.filter((r) => mayReach(r, "/h/:code/checklists")), ["owner", "admin", "gm", "hotel_manager", "revenue_manager", "front_desk", "housekeeping", "kitchen_manager", "chef", "pos", "bar", "stores", "read_only"]);
eq(ROLES.filter((r) => mayReach(r, "/h/:code/feedback")), ["owner", "admin", "gm"]);
eq(ROLES.filter((r) => mayReach(r, "/h/:code/backfill")), ["finance"]); // Settings' own page for the rest
eq(ROLES.filter((r) => mayReach(r, "/reports/commission")), ["owner", "admin", "gm", "revenue_manager", "finance", "read_only"]);
eq(ROLES.filter((r) => mayReach(r, "/reports/input-tax-credit")), ["owner", "admin", "gm", "finance"]);
eq(ROLES.filter((r) => mayReach(r, "/settings/property/old-data")), ["owner", "admin"]);
eq(sidebarFor("gm", "5EL", ALL_ON, "front").find((s) => s.label === "Bookings")!.items.map((i) => i.label).at(-1), "Waitlist");
/* Group reports and Group rate change ask the session (groupHotels.ts hotelsWhere):
   more than one real property where the person's role may. */
const hotel = (id: string, testOf: string | null = null) => ({ id, code: id.toUpperCase(), name: id, businessDate: "2026-11-20", testOf });
const who = (isGroupAdmin: boolean, roles: Array<[string, string]>, ids = ["a", "b", "t"]): HotelsResponse => ({
  scope: { staffId: "s", email: "e", fullName: "f", isGroupAdmin, hotels: roles.map(([hotelId, role]) => ({ hotelId, role })) },
  hotels: ids.map((id) => hotel(id, id === "t" ? "A" : null)),
});
const across = (role: Role, several: ReturnType<typeof severalOf>) =>
  sidebarFor(role, "5EL", ALL_ON, "front", several).find((s) => s.label === "Across properties")?.items.map((i) => i.label) ?? [];
const groupAdmin = severalOf(who(true, []));
eq(across("owner", groupAdmin), ["All properties", "Group reports", "Group rate change", "Properties", "People"]);
eq(across("owner", severalOf(null)), ["All properties", "Properties", "People"]); // no session, no group entries
eq(across("owner", severalOf(who(true, [], ["a", "t"]))), ["All properties", "Properties", "People"]); // a test hotel never counts
const twoPlaces = severalOf(who(false, [["a", "gm"], ["b", "front_desk"]]));
eq(across("gm", twoPlaces), ["Group reports", "Properties", "People"]); // reports at both; prices at one only
eq(mayReach("gm", "/group-rates", twoPlaces), false);
eq(mayReach("revenue_manager", "/group-rates", severalOf(who(false, [["a", "revenue_manager"], ["b", "revenue_manager"]]))), true);
eq(mayReach("front_desk", "/group-reports", twoPlaces), true);
eq(flatNavigationFor("owner", "5EL", ALL_ON, groupAdmin).length, 161);
/* devOnly is left out: the pictures' extra System entry (a dev build's) reaches nobody here. */
for (const role of ROLES) {
  eq(flatNavigationFor(role, "5EL", ALL_ON).some((i) => i.to === "/design-system" || i.to === "/admin/console"), false);
}
/* Approvals: in the home group after the Dashboard (D27-363), for whoever decides
   something; the Inventory Manager reaches it but it is not in their working menu. */
eq(sidebarFor("gm", "5EL", ALL_ON, "front")[0]!.items.map((i) => i.label).slice(0, 2), ["Dashboard", "Approvals"]);
eq(ROLES.filter((role) => mayReach(role, "/h/:code/approvals")), ["owner", "admin", "gm", "hotel_manager", "stores"]);

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
/* As the pictures underline it (roles/r-*-home): */
for (const role of ["owner", "hotel_manager", "revenue_manager", "finance"] as Role[]) eq(mayReach(role, "/h/:code/night-audit"), true);
eq(mayReach("stores", "/h/:code/night-audit"), false);

/* What the phone has. */
eq(phoneRoute("/", "5EL"), "/hotel/5EL");
eq(phoneRoute("/all-properties", "5EL"), "/all");
eq(phoneRoute("/notifications", "5EL"), "/notifications/5EL");
eq(phoneRoute("/h/5EL/housekeeping", "5EL"), "/housekeeping/5EL");
eq(phoneRoute("/h/5EL/work-orders", "5EL"), "/housekeeping/5EL/work-orders");
eq(phoneRoute("/pos/5EL/tables", "5EL"), "/pos/5EL/tables");
eq(phoneRoute("/h/5EL/arrivals?x=1", "5EL"), "/front-desk/5EL"); // a notification's link
eq(phoneRoute("/h/5EL/arrivals/upcoming", "5EL"), "/front-desk/5EL?view=upcoming");
eq(phoneRoute("/h/5EL/in-house/due-out", "5EL"), "/front-desk/5EL/in-house?view=due-out");
eq(phoneRoute("/h/5EL/walk-ins", "5EL"), "/front-desk/5EL/walk-ins");
eq(phoneRoute("/h/5EL/requests", "5EL"), "/guest-services/5EL/requests"); // the web's screen, not the hub
eq(phoneRoute("/h/5EL/wake-up-calls", "5EL"), "/guest-services/5EL/wake-up-calls");
eq(phoneRoute("/h/5EL/lost-property", "5EL"), "/guest-services/5EL/lost-property");
eq(phoneRoute("/h/5EL/online-checkin", "5EL"), "/guest-services/5EL/online-checkin");
eq(phoneRoute("/h/5EL/approvals", "5EL"), "/approvals/5EL");
eq(phoneRoute("/pos/5EL/menu", "5EL"), "/pos/5EL/menu");
eq(phoneRoute("/pos/5EL/setup", "5EL"), "/pos/5EL/setup");
eq(phoneRoute("/h/5EL/groups", "5EL"), "/reservations/5EL/groups");
eq(phoneRoute("/h/5EL/waitlist", "5EL"), "/reservations/5EL/waitlist");
eq(phoneRoute("/h/5EL/feedback", "5EL"), "/reputation/5EL/feedback"); // mobile/m13-sales
eq(phoneRoute("/crm/same-person", "5EL"), "/guests/5EL/same-person");
eq(phoneRoute("/h/5EL/leads", "5EL"), "/leads/5EL");
eq(phoneRoute("/h/5EL/marketing", "5EL"), "/marketing/5EL");
eq(phoneRoute("/contracts", "5EL"), "/contracts/5EL");
eq([phoneRoute("/reports", "5EL"), phoneRoute("/reports/manager", "5EL"), phoneRoute("/group-reports", "5EL")], ["/reports/5EL", "/reports/5EL/manager", "/reports/5EL/group-reports"]); // mobile/m13-rep-ops
eq(phoneRoute("/h/5EL/banquet/setup", "5EL"), "/banquet/5EL/setup");
eq(phoneRoute("/h/5EL/spa/setup", "5EL"), "/spa/5EL/setup");
eq(phoneRoute("/h/5EL/laundry/price-list", "5EL"), "/laundry/5EL/price-list");
eq(phoneRoute("/h/5EL/purchasing/who-may-ask", "5EL"), "/purchasing/5EL/who-may-ask");
eq(phoneRoute("/people", "5EL"), "/admin/5EL/people");
eq(phoneRoute("/admin/users", "5EL"), "/admin/5EL/users");
eq(phoneRoute("/settings/money/bank", "5EL"), "/admin/5EL/bank");
eq([phoneRoute("/reports/item-sales", "5EL"), phoneRoute("/settings/messages/scheduled-reports", "5EL")],
  ["/reports/5EL/item-sales", null]);
/* mobile/m13-set-property (20 Nov): Settings → Property's pages, and the setup's old address. */
eq(["profile", "set-up-this-hotel", "old-data", "photos", "highlights", "amenities", "group", "policies", "documents"]
  .map((x) => phoneRoute(`/settings/property/${x}`, "5EL")),
  ["profile", "set-up-this-hotel", "old-data", "photos", "highlights", "amenities", "group", "policies", "documents"].map((x) => `/settings/5EL/${x}`));
eq(phoneRoute("/h/5EL/setup?step=taxes", "5EL"), "/settings/5EL/set-up-this-hotel");
eq(["/settings/5EL/profile", "/settings/5EL/old-data", "/settings/5EL/set-up-this-hotel"].map(spaceHere), ["settings", "settings", "settings"]);
eq(phoneRoute("/settings/people/signing-in", "5EL"), "/admin/5EL/signing-in");
eq(phoneRoute("/settings", "5EL"), "/admin/5EL");
eq(phoneRoute("/settings/property/backfill-data", "5EL"), "/admin/5EL/backfill");
eq(phoneRoute("/h/5EL/backfill", "5EL"), "/admin/5EL/backfill");
eq(phoneRoute("/settings/connections/modules", "5EL"), "/admin/5EL/modules");
eq(phoneRoute("/properties", "5EL"), "/admin/5EL/properties");
eq(phoneRoute("/admin/system-health", "5EL"), "/admin/5EL/system-health");
eq(phoneRoute("/admin/integrations", "5EL"), "/admin/5EL/integrations");
eq(phoneRoute("/settings/people/activity", "5EL"), "/admin/5EL/activity");
eq(phoneRoute("/admin/activity", "5EL"), "/admin/5EL/activity");
eq(phoneRoute("/settings/people/audit-log", "5EL"), "/admin/5EL/audit-log");
eq(phoneRoute("/admin/audit-log", "5EL"), "/admin/5EL/audit-log");
eq(phoneRoute("/settings/people/devices", "5EL"), "/admin/5EL/sign-ins");
eq(phoneRoute("/admin/sign-ins", "5EL"), "/admin/5EL/sign-ins");
eq(phoneRoute("/settings/people/roles", "5EL"), "/admin/5EL/roles");
eq(phoneRoute("/admin/roles", "5EL"), "/admin/5EL/roles");
eq(phoneRoute("/h/5EL/equipment", "5EL"), "/equipment/5EL");
eq(phoneRoute("/h/5EL/minibar", "5EL"), "/housekeeping/5EL/minibar");
eq(phoneRoute("/h/5EL/checklists", "5EL"), "/housekeeping/5EL/checklists");
eq(["cashiering", "city-ledger", "cash-deposits", "form-c", "supplier-dues"].map((x) => phoneRoute(`/h/5EL/${x}`, "5EL")),
  ["/finance/5EL/cashiering", "/finance/5EL/city-ledger", "/finance/5EL/cash-deposits", "/finance/5EL/form-c", "/finance/5EL/supplier-dues"]);
eq(phoneRoute("/h/5EL/stay", "5EL"), "/front-desk/5EL/rooms");
eq([phoneRoute("/pos/5EL/till", "5EL"), phoneRoute("/pos/5EL/terminal", "5EL")], ["/pos/5EL/till", "/pos/5EL/terminal"]); // mobile/m13-till
eq(["/reports/stock-consumption", "/reports/flr-daily", "/reports/flr-monthly", "/reports/supplier-statement?supplier=x"].map((to) => phoneRoute(to, "5EL")), ["/reports/5EL/stock-consumption", "/reports/5EL/flr-daily", "/reports/5EL/flr-monthly", "/reports/5EL/supplier-statement"]); // mobile/m13-rep-stock
/* mobile/m13-config (19 Nov) */
eq(["/settings/rooms/room-types", "/h/5EL/room-types", "/h/5EL/booking-sources", "/h/5EL/cancellation-terms", "/h/5EL/channels", "/h/5EL/places", "/group-rates"]
  .map((to) => phoneRoute(to, "5EL")), ["/inventory/5EL/room-types", "/inventory/5EL/room-types", "/inventory/5EL/booking-sources",
  "/inventory/5EL/cancellation-terms", "/inventory/5EL/channels", "/inventory/5EL/places", "/inventory/5EL/group-rates"]);
eq(["/h/5EL/folios", "/h/5EL/invoices", "/h/5EL/payments"].map((to) => phoneRoute(to, "5EL")), ["/finance/5EL/folios", "/finance/5EL/invoices", "/finance/5EL/payments"]);
eq(phoneRoute("/pos/5EL/bill-history", "5EL"), "/pos/5EL/bill-history");
eq(phoneRoute("/pos/5EL/day-end", "5EL"), "/pos/5EL/day-end");
eq(phoneRoute("/pos/5EL/room-charges", "5EL"), "/pos/5EL/room-charges");
eq(phoneRoute("/pos/5EL/table-bookings", "5EL"), "/pos/5EL/table-bookings");
/* mobile/m13-rep-money (19 Nov) */
eq(phoneRoute("/reports/gst-sales", "5EL"), "/reports/5EL/gst-sales");
eq(phoneRoute("/reports/gstr-1", "5EL"), "/reports/5EL/gstr-1");
eq(phoneRoute("/reports/input-tax-credit", "5EL"), "/reports/5EL/input-tax-credit");
eq(phoneRoute("/reports/gst-advances", "5EL"), "/reports/5EL/gst-advances");
eq(phoneRoute("/reports/lodging-tax", "5EL"), "/reports/5EL/lodging-tax");
eq(phoneRoute("/reports/tds", "5EL"), "/reports/5EL/tds");
eq(phoneRoute("/reports/c-form", "5EL"), "/reports/5EL/c-form");
eq(phoneRoute("/reports/accounting", "5EL"), "/reports/5EL/accounting");
eq(phoneRoute("/reports/guest-ledger", "5EL"), "/reports/5EL/guest-ledger");
eq(phoneRoute("/reports/city-ledger", "5EL"), "/reports/5EL/city-ledger");
eq(phoneRoute("/reports/company-statement", "5EL"), "/reports/5EL/company-statement");
eq(phoneRoute("/reports/dues-by-age", "5EL"), "/reports/5EL/dues-by-age");
eq(phoneRoute("/reports/commission", "5EL"), "/reports/5EL/commission");
eq(phoneRoute("/reports/cashier-shift", "5EL"), "/reports/5EL/cashier-shift");
eq(phoneRoute("/reports/petty-cash", "5EL"), "/reports/5EL/petty-cash");
eq(phoneRoute("/reports/voids", "5EL"), "/reports/5EL/voids");
eq(phoneRoute("/reports/nc-bills", "5EL"), "/reports/5EL/nc-bills");
eq(phoneRoute("/h/5EL/revenue-outlook", "5EL"), "/revenue/5EL");
eq(phoneRoute("/h/5EL/crs-bookings", "5EL"), "/crs/5EL");
eq(phoneRoute("/h/5EL/loyalty", "5EL"), "/loyalty/5EL");
eq(phoneRoute("/h/5EL/reviews", "5EL"), "/reputation/5EL");
eq(phoneRoute("/h/5EL/guest-messages", "5EL"), "/guest-messages/5EL");
eq(phoneRoute("/settings/connections/connection-health", "5EL"), "/connections/5EL");
eq(phoneRoute("/h/5EL/stores", "5EL"), "/stores/5EL");
eq(phoneRoute("/h/5EL/spa", "5EL"), "/spa/5EL");
eq(phoneRoute("/h/5EL/banquet", "5EL"), "/banquet/5EL");
eq(["/guests", "/companies", "/crm/guests"].map((to) => phoneRoute(to, "5EL")), ["/guests/5EL", "/guests/5EL/companies", "/guests/5EL/find"]);
eq(phoneRoute("/h/5EL/purchasing", "5EL"), "/purchasing/5EL");
eq(phoneRoute("/h/5EL/laundry", "5EL"), "/laundry/5EL");
eq(phoneRoute("/h/5EL/night-audit", "5EL"), "/night-audit/5EL");
eq(phoneRoute("/h/5EL/calendar", "5EL"), "/reservations/5EL/calendar");
eq(phoneRoute("/h/5EL/reservations", "5EL"), "/reservations/5EL");
eq(phoneRoute("/h/5EL/book", "5EL"), "/reservations/5EL/book");
eq(phoneRoute("/h/5EL/rates", "5EL"), "/inventory/5EL");
/* Every PHONE_ROUTES target is a route file of app/ (MEMORY 15): the table never
   sends anybody to a screen the bundle does not have. */
const routeFiles = (dir: string): string[] => readdirSync(dir).flatMap((f) => {
  const at = `${dir}/${f}`;
  return statSync(at).isDirectory() ? routeFiles(at) : f.endsWith(".tsx") && f !== "_layout.tsx" ? [at] : [];
});
const ROUTES = new Set(routeFiles("app").map((f) => f.slice(3, -4).replace(/\/index$/, "").replace(/\[code\]/g, ":code") || "/"));
for (const [web, route] of Object.entries(PHONE_ROUTES)) {
  if (!ROUTES.has(route.split("?")[0]!)) throw new Error(`${web} goes to ${route}, not a route of the app`);
}
/* Every web menu address has its phone screen, but for these (pinned, so a lost
   line fails): coming soon, the Store reports' index, and the console's pages
   the phone has not built. */
const NOT_ON_PHONE = [
  "/coming-soon/payments", "/coming-soon/room-systems", "/reports/store",
  ...["plans", "meal-plans", "taxes"].map((x) => `/settings/rates/${x}`),
  ...["payment-methods", "extra-charges", "discounts", "commission", "pickup"].map((x) => `/settings/money/${x}`),
  ...["market-segments", "reservation-types", "reasons", "holidays", "id-types", "vip"].map((x) => `/settings/lists/${x}`),
  "/settings/front-desk/times-and-rules", "/settings/front-desk/front-desk",
  "/settings/messages/switches", "/settings/messages/daily-report-emails", "/settings/messages/scheduled-reports",
  "/settings/connections/rivals-prices",
];
const everywhere = new Set(ROLES.flatMap((role) => flatNavigationFor(role, ":code", ALL_ON, groupAdmin).map((i) => i.to)));
eq([...everywhere].filter((to) => phoneRoute(to, "5EL") === null).sort(), [...NOT_ON_PHONE].sort());

/* Which entry is lit: the screen's own, never the one its route sits under (MCORE-3). */
const FD = [
  { route: "/front-desk/5EL", prefix: true }, { route: "/front-desk/5EL?view=upcoming", prefix: false },
  { route: "/front-desk/5EL/in-house", prefix: true }, { route: "/front-desk/5EL/in-house?view=due-out", prefix: false },
  { route: "/front-desk/5EL/walk-ins", prefix: false }, { route: "/hotel/5EL", prefix: false },
];
eq(activeRoute(FD, "/front-desk/5EL"), "/front-desk/5EL");
eq(activeRoute(FD, "/front-desk/5EL/in-house"), "/front-desk/5EL/in-house");
eq(activeRoute(FD, "/front-desk/5EL/walk-ins"), "/front-desk/5EL/walk-ins");
eq(activeRoute(FD, "/front-desk/5EL?view=upcoming"), "/front-desk/5EL?view=upcoming");
eq(activeRoute(FD, "/front-desk/5EL/in-house?view=due-out"), "/front-desk/5EL/in-house?view=due-out");
eq(activeRoute(FD, "/front-desk/5EL/in-house?view=other"), "/front-desk/5EL/in-house");
eq(activeRoute(FD, "/front-desk/5EL/stay/12"), "/front-desk/5EL"); // the stay opens from Arrivals
eq(activeRoute(FD, "/front-desk/5EL/in-house/x"), "/front-desk/5EL/in-house");
eq(activeRoute(FD, "/hotel/5EL/x"), null); // not a prefix entry
eq(activeRoute(FD, "/all"), null);
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
eq(landing("stores", "AGR"), "/stores/AGR"); // mobile/t2-stores: the Store is on the phone (4 Nov)
eq(workingHomeFor("stores", "AGR"), "/h/AGR/stores");

/* The full-screen pages cover the frame. */
eq(coversTheFrame("/pos/5EL/kitchen"), true);
eq(coversTheFrame("/pos/5EL/terminal"), true);
eq(coversTheFrame("/pos/5EL/tables"), false);
eq(coversTheFrame("/hotel/5EL"), false);

eq(spaceOf("/pos/5EL/tables"), "pos");
eq(spaceOf("/housekeeping/5EL"), "front");
/* MADM-1: the Settings pill opens the phone's console, and a console screen lights Settings. */
eq(phoneRoute(spaceHome("gm", "5EL", ALL_ON, "settings"), "5EL"), "/admin/5EL");
eq(phoneRoute(spaceHome("gm", "5EL", ALL_ON, "pos"), "5EL"), "/pos/5EL/tables");
eq(phoneRoute(spaceHome("front_desk", "5EL", ALL_ON, "pos"), "5EL"), "/pos/5EL/tables");
eq(phoneRoute(spaceHome("gm", "5EL", ALL_ON, "front"), "5EL"), "/hotel/5EL");
eq(["/admin/5EL", "/admin/5EL/roles", "/admin/5EL/backfill", "/inventory/5EL/room-types", "/connections/5EL", "/admin/5EL/bank"].map(spaceHere),
  ["settings", "settings", "settings", "settings", "settings", "settings"]);
eq(["/admin/5EL/people", "/admin/5EL/integrations", "/hotel/5EL", "/all", "/front-desk/5EL/stay/12", "/inventory/5EL", "/reports/5EL/manager"].map(spaceHere),
  ["front", "front", "front", "front", "front", "front", "front"]);
eq(["/pos/5EL/tables", "/pos/5EL/order/9", "/stores/5EL/bar-stock", "/stores/5EL/kitchen-stock"].map(spaceHere), ["pos", "pos", "pos", "pos"]);
eq(spaceHere("/front-desk/5EL/in-house?view=due-out"), "front");
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
/* Postgres's own text, read as a phone's engine reads it: Date.parse takes ISO only (MAPR-2, MEMORY 7). */
const isoOnly = <T,>(fn: () => T): T => {
  const real = Date.parse;
  Date.parse = (text: string) => (/^\d{4}-\d{2}-\d{2}T/.test(text) ? real(text) : NaN);
  try { return fn(); } finally { Date.parse = real; }
};
eq(isoOnly(() => relative("2026-10-31 17:25:00.123456+05:30", now)), "5 minutes ago");

/* Every module's first screen is reached from the menu (4 Nov: Laundry's link was lost at a merge
   and the gates stayed green). A module with app/<name>/[code]/index.tsx or app/<name>/[code].tsx
   needs a PHONE_ROUTES target; the guest-services hub has no web twin (its MODULE.md). */
const landings = readdirSync("app", { withFileTypes: true })
  .filter((d) => d.isDirectory() && (existsSync(`app/${d.name}/[code]/index.tsx`) || existsSync(`app/${d.name}/[code].tsx`)))
  .map((d) => `/${d.name}/:code`);
const reached = new Set(Object.values(PHONE_ROUTES).map((r) => r.split("?")[0]));
const NOT_IN_MENU = new Set(["/guest-services/:code"]);
for (const l of landings) if (!NOT_IN_MENU.has(l) && !reached.has(l)) throw new Error(`${l}: a module's first screen with no menu link`);
eq(landings.length > 8, true);
console.log("menu: all checks pass");
