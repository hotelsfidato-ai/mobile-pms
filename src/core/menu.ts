/* ══════════════════════════════════════════════════════════════════
   THE WEB'S MENU, ROLE BY ROLE — src/components/app/navigation.ts, each
   module's nav.ts, settingsConsole.ts and api/src/permissions.ts, ported
   whole and in the web's order (M-11). Change it in the PMS first, then
   here; menu.check.ts pins every role's list as the web gives it.

   Re-ported entry by entry from the 16 Nov release on 20 Nov (mobile/
   m13-menu), after the 4 Nov port (SHELL.md): every role's menu, space,
   full reach and landing the same as the web's own functions give them,
   and the matrix compared action by action with api/src/permissions.ts.
   New since 4 Nov: Group reports and Group rate change (Across
   properties), Minibar and Checklists, Waitlist, Guest feedback,
   Backfilled records, eight reports (NC bills, Item sales, Money owed by
   age, Statement of account, Commission owed, GSTR-1, Input tax credit,
   GST on advances), and the console's Backfill data, Bring in old data,
   Scheduled reports and "Room discounts" (D27-395).

   Left out on purpose: `devOnly` entries (a production build has none: the
   web's "Design system" in System and its admin "Console") and `keywords`
   (Find a screen is on the website for now). The role pictures were taken
   on a development build, so their folded System counts Design system too.

   Two entries ask the session, not the role alone (groupHotels.ts
   hotelsWhere): Group reports and Group rate change show only for somebody
   with more than one real property where their role may. The frame passes
   that question in (`Several`, `severalOf`); without it they stay hidden,
   as the web's do before its session is read.

   Below the port: which of those screens the phone has (PHONE_ROUTES, the
   one table to add to), a property's landing, and two small words of the
   web's (relative, initials).

   Pure: no React Native here, so `menu.check.ts` runs under node.
   ══════════════════════════════════════════════════════════════════ */

import { instant } from "./format.ts";
import type { HotelsResponse } from "./api.ts";

/* ── api/src/permissions.ts ──────────────────────────────────────── */

export const ROLES = [
  "owner", "admin", "gm", "hotel_manager", "revenue_manager", "front_desk", "housekeeping",
  "kitchen_manager", "chef", "pos", "bar", "stores", "finance", "read_only", "automation",
] as const;
export type Role = (typeof ROLES)[number];

const RESOURCES = [
  "dashboard", "reservation", "customer", "company", "hotel", "inventory", "room_config", "rate",
  "menu", "stock", "equipment", "purchasing", "laundry", "spa", "marketing", "invoice", "payment",
  "commission", "report", "notification", "user", "role", "integration", "audit_log", "setting", "ai",
] as const;
export type Resource = (typeof RESOURCES)[number];

const ACTIONS = ["view", "create", "edit", "cancel", "approve", "export", "delete"] as const;
type Action = (typeof ACTIONS)[number];
type ResourceGrants = Partial<Record<Resource, readonly Action[]>>;

const ALL: readonly Action[] = ACTIONS;
const READ: readonly Action[] = ["view"];
const READ_EXPORT: readonly Action[] = ["view", "export"];
const TILL_PERSON: ResourceGrants = {
  reservation: READ,
  inventory: READ,
};
const MATRIX: Record<Role, ResourceGrants> = {
  owner: Object.fromEntries(RESOURCES.map((r) => [r, ALL])) as ResourceGrants,
  admin: {
    dashboard: READ,
    reservation: ["view", "create", "edit", "cancel", "approve", "export"],
    customer: ["view", "create", "edit", "export"],
    company: ["view", "create", "edit", "export"],
    hotel: ["view", "create", "edit", "export"],
    inventory: ["view", "edit"],
    room_config: ["view", "create", "edit"],
    rate: ["view", "create", "edit"],
    menu: ["view", "create", "edit"],
    invoice: ["view", "create", "edit", "approve", "export"],
    payment: ["view", "create", "edit", "export"],
    commission: ["view", "edit", "export"],
    report: READ_EXPORT,
    notification: ["view", "create", "edit"],
    user: ["view", "create", "edit"],
    role: ["view"],
    integration: ["view", "create", "edit"],
    audit_log: READ_EXPORT,
    setting: READ,
    ai: READ,
    stock: ["view", "create", "edit", "approve", "export"],
    equipment: ["view", "create", "edit", "approve", "export"],
    purchasing: ["view", "create", "edit", "cancel", "approve", "export"],
    laundry: ["view", "create", "edit", "cancel", "export"],
    spa: ["view", "create", "edit", "cancel", "export"],
    marketing: READ_EXPORT,
  },
  gm: {
    dashboard: READ,
    reservation: ["view", "create", "edit", "cancel", "approve", "export"],
    customer: ["view", "create", "edit", "export"],
    company: ["view", "create", "edit", "export"],
    hotel: READ_EXPORT,
    inventory: ["view", "edit"],
    room_config: ["view", "create", "edit"],
    rate: ["view", "create", "edit"],
    menu: ["view", "create", "edit"],
    invoice: ["view", "create", "edit", "approve", "export"],
    payment: ["view", "create", "edit", "export"],
    commission: ["view", "edit", "export"],
    report: READ_EXPORT,
    notification: READ,
    user: ["view", "create", "edit"],
    audit_log: READ,
    setting: READ,
    ai: READ,
    stock: ["view", "create", "edit", "approve", "export"],
    equipment: ["view", "create", "edit", "approve", "export"],
    purchasing: ["view", "create", "approve", "export"],
    laundry: ["view", "create", "edit", "cancel", "export"],
    spa: ["view", "create", "edit", "cancel", "export"],
    marketing: READ_EXPORT,
  },
  hotel_manager: {
    dashboard: READ,
    reservation: ["view", "create", "edit", "cancel", "export"],
    customer: ["view", "create", "edit", "export"],
    company: READ,
    hotel: READ,
    inventory: ["view", "edit"],
    room_config: READ,
    rate: READ,
    menu: READ,
    invoice: ["view", "create", "edit", "export"],
    payment: ["view", "create", "export"],
    report: READ_EXPORT,
    notification: READ,
    user: READ,
    stock: ["view", "create", "edit"],
    equipment: ["view", "create", "edit"],
    purchasing: ["view", "create"],
    laundry: ["view", "create", "edit", "cancel", "export"],
    spa: ["view", "create", "edit", "cancel", "export"],
  },
  revenue_manager: {
    dashboard: READ,
    reservation: READ,
    hotel: READ,
    inventory: ["view", "edit"],
    room_config: READ,
    rate: ["view", "create", "edit"],
    commission: READ,
    report: READ_EXPORT,
    notification: READ,
  },
  kitchen_manager: {
    reservation: READ,
    inventory: ["view", "edit"],
    menu: ["view", "create", "edit"],
    notification: READ,
    stock: ["view", "create"],
    equipment: READ,
    purchasing: ["view", "create"],
  },
  chef: {
    inventory: READ,
    notification: READ,
    stock: READ,
    equipment: READ,
  },
  front_desk: {
    laundry: ["view", "create", "edit", "cancel"],
    spa: ["view", "create", "edit", "cancel"],
    dashboard: READ,
    reservation: ["view", "create", "edit", "cancel"],
    customer: ["view", "create", "edit"],
    company: ["view", "create"],
    hotel: READ,
    inventory: ["view", "edit"],
    room_config: READ,
    rate: READ,
    menu: READ,
    invoice: ["view", "create", "edit"],
    payment: ["view", "create"],
    report: READ,
    notification: READ,
    equipment: READ,
  },
  stores: {
    inventory: ["view", "create", "edit", "export"],
    notification: READ,
    stock: ["view", "create", "edit", "export"],
    equipment: ["view", "create", "edit", "approve"],
    purchasing: ["view", "create"],
  },
  pos: TILL_PERSON,
  bar: TILL_PERSON,
  housekeeping: {
    laundry: ["view", "create", "edit", "cancel"],
    spa: ["view"],
    reservation: READ,
    inventory: ["view", "edit"],
    notification: READ,
    stock: READ,
    equipment: READ,
    purchasing: ["view", "create"],
  },
  finance: {
    laundry: ["view", "export"],
    dashboard: READ,
    reservation: READ_EXPORT,
    customer: READ,
    company: READ,
    hotel: READ,
    invoice: ["view", "create", "edit", "approve", "export"],
    payment: ["view", "create", "edit", "export"],
    commission: READ_EXPORT,
    report: READ_EXPORT,
    notification: READ,
    stock: READ_EXPORT,
    equipment: READ_EXPORT,
    purchasing: READ_EXPORT,
  },
  read_only: {
    laundry: ["view"],
    dashboard: READ,
    reservation: READ,
    customer: READ,
    company: READ,
    hotel: READ,
    inventory: READ,
    room_config: READ,
    rate: READ,
    menu: READ,
    invoice: READ,
    payment: READ,
    commission: READ,
    report: READ,
    notification: READ,
    stock: READ,
    equipment: READ,
    purchasing: READ,
  },
  automation: {
    notification: ["view", "create"],
  },
};

export const can = (role: Role, action: Action, resource: Resource): boolean =>
  MATRIX[role]?.[resource]?.includes(action) ?? false;
export const canAccess = (role: Role, resource: Resource): boolean =>
  (MATRIX[role]?.[resource]?.length ?? 0) > 0;
const setsRates = (role: Role) => can(role, "edit", "rate");

/** src/lib/permissions.ts ROLE_LABELS. */
export const ROLE_LABELS: Record<Role, string> = {
  owner: "Owner", admin: "Admin", gm: "General Manager", hotel_manager: "Hotel Manager",
  revenue_manager: "Revenue Manager", front_desk: "Reception", housekeeping: "Housekeeping",
  kitchen_manager: "Kitchen Manager", chef: "Chef", pos: "Waiter", bar: "Bar",
  stores: "Inventory Manager", finance: "Accountant", read_only: "Viewer", automation: "Automation",
};

/** The web's roleFor: an unknown or missing role is a viewer. */
export const asRole = (role: string | null): Role =>
  ROLES.includes(role as Role) ? (role as Role) : "read_only";

/* ── The rules the entries ask (each module's own) ───────────────── */

const seesComingSoon = (role: Role) => (["owner", "admin", "gm"] as Role[]).includes(role);
const seesGuest360 = seesComingSoon; // crm/access.ts
const decidesSomething = (role: Role) => (["owner", "admin", "gm", "hotel_manager", "stores"] as Role[]).includes(role); // approvals.ts
const EXPORTS_THE_BOOKS = (role: Role) => (["owner", "admin", "gm", "finance"] as Role[]).includes(role); // accounting/nav.ts
const REQUEST_ROLES: readonly Role[] = ["owner", "admin", "gm", "hotel_manager", "front_desk", "housekeeping", "stores", "kitchen_manager", "chef", "pos", "bar"]; // guest-services/requestRoles.ts
const WAKE_UP_ROLES: readonly Role[] = ["owner", "admin", "gm", "hotel_manager", "front_desk"];
const LOST_ROLES: readonly Role[] = [...WAKE_UP_ROLES, "housekeeping"];
const DESK_ROLES: readonly Role[] = WAKE_UP_ROLES; // online-checkin/nav.ts
const mayRingUp = (role: Role) => can(role, "create", "payment") || role === "pos" || role === "bar"; // pos/nav.ts
const BILL_HISTORY_ROLES: readonly Role[] = ["owner", "admin", "gm", "hotel_manager", "finance", "front_desk"];
const seesMoney = (role: Role) => can(role, "view", "invoice"); // reports/nav.ts
const seesSupplierDues = (role: Role) => can(role, "approve", "invoice");
const mayReadStockReports = (role: Role) => can(role, "export", "stock") || role === "hotel_manager" || role === "read_only";
const SETS_THE_LIST: readonly Role[] = ["owner", "admin", "gm"]; // spa/data/spa.ts
const BAR_STOCK: readonly Role[] = ["owner", "admin", "gm", "bar"]; // stores/nav.ts
const KITCHEN_STOCK: readonly Role[] = ["kitchen_manager", "chef"];
const switchesModules = (role: Role) => role === "owner" || role === "admin"; // admin/moduleSwitchRoles.ts
const FEEDBACK_ROLES: readonly Role[] = ["owner", "admin", "gm"]; // api/src/modules/reputation/feedbackRoles.ts
const seesCommission = (role: Role) => can(role, "view", "commission"); // reports/nav.ts Commission owed
/* admin/nav.ts Backfilled records: whoever reads it (`invoice` approve) and cannot open Settings. */
const readsBackfillOnly = (role: Role) => can(role, "approve", "invoice") && !canAccess(role, "setting");

/** groupHotels.ts hotelsWhere(may).length > 1, asked of the person's session:
    more than one real property (a test hotel never) where they work with a
    role that `may`. The frame passes it (`severalOf`); without it, no. */
export type Several = (may: (role: Role) => boolean) => boolean;

/** hotelsWhere over GET /api/hotels's answer: a group administrator is the
    owner everywhere; anybody else only where rostered, with that role. */
export const severalOf = (who: HotelsResponse | null): Several => (may) =>
  who !== null && who.hotels.filter((h) => {
    if (h.testOf) return false;
    const role = who.scope.isGroupAdmin ? "owner" : who.scope.hotels.find((g) => g.hotelId === h.id)?.role;
    return role != null && may(asRole(role));
  }).length > 1;

/* ── The entries ─────────────────────────────────────────────────── */

/** A lucide icon's name: its components cannot be imported under node. */
export type MenuIcon = keyof typeof import("lucide-react-native");

export interface NavItem {
  label: string;
  to: string;
  icon: MenuIcon;
  resource: Resource;
  matchPrefix?: boolean;
  children?: NavItem[];
  canSee?: (role: Role, several?: Several) => boolean;
  module?: string;
  listed?: false;
  workingMenus?: readonly Role[];
  notBuilt?: true;
  leaves?: true;
}

type SectionKey =
  | "home" | "front-desk" | "bookings" | "guests-crm" | "sales-marketing"
  | "across-properties" | "configuration" | "inventory" | "distribution"
  | "store-and-equipment" | "finance" | "point-of-sale" | "banquet"
  | "laundry" | "spa" | "reports" | "system";

interface Entry extends NavItem { section: SectionKey; order: number }

/** The three spaces, each with its own menu (D27-249). */
export type Space = "front" | "pos" | "settings";

export interface NavSection {
  key?: string;
  module?: string;
  receptionNeeds?: string;
  label?: string;
  space?: Space;
  items: NavItem[];
}

const SECTION_LAYOUT: Array<Omit<NavSection, "items"> & { key: SectionKey }> = [
  { key: "home" },
  { key: "front-desk", label: "Front desk" },
  { key: "bookings", label: "Bookings" },
  { key: "guests-crm", label: "Guests & CRM" },
  { key: "sales-marketing", label: "Sales and marketing" },
  { key: "across-properties", label: "Across properties" },
  { key: "configuration", label: "Property setup" },
  { key: "inventory", label: "Rooms and rates" },
  { key: "distribution", label: "Distribution" },
  { key: "store-and-equipment", label: "Store and equipment" },
  { key: "finance", label: "Finance" },
  { key: "point-of-sale", label: "Point of sale", module: "pos", receptionNeeds: "reception_pos", space: "pos" },
  { key: "banquet", label: "Banquet", module: "banquet" },
  { key: "laundry", label: "Laundry", module: "laundry" },
  { key: "spa", label: "Spa", module: "spa" },
  { key: "reports", label: "Reports" },
  { key: "system", label: "System" },
];

const ENTRIES: readonly Entry[] = [
  /* navigation.ts CORE_ENTRIES */
  { section: "store-and-equipment", order: 30,
    label: "Places and suppliers", to: "/h/:code/places", icon: "MapPin", resource: "stock",
    canSee: (role) => canAccess(role, "stock") || canAccess(role, "equipment") },
  { section: "system", order: 10,
    workingMenus: ["front_desk", "pos", "bar", "chef", "kitchen_manager", "housekeeping", "stores"],
    label: "Notifications", to: "/notifications", icon: "Bell", resource: "notification", matchPrefix: true },
  /* In the home group after the Dashboard since 25 Oct (D27-363), in
     nobody's working menu (the web's note). */
  { section: "home", order: 15,
    label: "Approvals", to: "/h/:code/approvals", icon: "CheckCircle2",
    resource: "notification", canSee: decidesSomething },
  /* front-desk/nav.ts */
  { section: "home", order: 20, workingMenus: ["front_desk", "housekeeping"],
    label: "Rooms", to: "/h/:code/stay", icon: "Home", resource: "reservation" },
  { section: "home", order: 30, workingMenus: ["front_desk"],
    label: "Calendar", to: "/h/:code/calendar", icon: "CalendarRange", resource: "reservation" },
  {
    section: "front-desk", order: 10, workingMenus: ["front_desk"],
    label: "Arrivals", to: "/h/:code/arrivals", icon: "CalendarCheck",
    resource: "reservation", matchPrefix: true,
    children: [
      { label: "Today", to: "/h/:code/arrivals", icon: "CalendarCheck", resource: "reservation" },
      { workingMenus: ["front_desk"],
        label: "Upcoming", to: "/h/:code/arrivals/upcoming", icon: "CalendarRange", resource: "reservation" },
    ] },
  {
    section: "front-desk", order: 20, workingMenus: ["front_desk"],
    label: "In house", to: "/h/:code/in-house", icon: "Users",
    resource: "reservation", matchPrefix: true,
    children: [
      { label: "In house now", to: "/h/:code/in-house", icon: "Users", resource: "reservation" },
      { workingMenus: ["front_desk"],
        label: "Due out", to: "/h/:code/in-house/due-out", icon: "CalendarRange", resource: "reservation" },
    ] },
  { section: "front-desk", order: 30, workingMenus: ["front_desk"],
    label: "Walk-ins", to: "/h/:code/walk-ins", icon: "BookOpen", resource: "reservation" },
  /* reservations/nav.ts */
  {
    section: "bookings", order: 10, workingMenus: ["front_desk"],
    label: "All bookings", to: "/h/:code/reservations", icon: "CalendarCheck",
    resource: "reservation", matchPrefix: true },
  { section: "bookings", order: 30,
    label: "Groups", to: "/h/:code/groups", icon: "Users", resource: "reservation", matchPrefix: true },
  { section: "bookings", order: 50, workingMenus: ["front_desk"],
    label: "New booking", to: "/h/:code/book", icon: "BookPlus", resource: "reservation",
    canSee: (role) => can(role, "create", "reservation") },
  { section: "bookings", order: 60,
    label: "Waitlist", to: "/h/:code/waitlist", icon: "ListOrdered", resource: "reservation" },
  /* housekeeping/nav.ts */
  { section: "front-desk", order: 40, workingMenus: ["housekeeping"],
    label: "Housekeeping", to: "/h/:code/housekeeping", icon: "ClipboardList", resource: "inventory",
    canSee: (role) => canAccess(role, "reservation") },
  /* D27-396: in no working menu; the board's room card opens them too. */
  { section: "front-desk", order: 42,
    label: "Minibar", to: "/h/:code/minibar", icon: "GlassWater", resource: "inventory",
    canSee: (role) => canAccess(role, "reservation") || canAccess(role, "invoice") },
  { section: "front-desk", order: 44,
    label: "Checklists", to: "/h/:code/checklists", icon: "ListChecks", resource: "inventory" },
  { section: "front-desk", order: 50, workingMenus: ["housekeeping"],
    label: "Work orders", to: "/h/:code/work-orders", icon: "Wrench", resource: "room_config",
    canSee: (role) => canAccess(role, "room_config") || role === "housekeeping" },
  /* inventory/nav.ts */
  { section: "configuration", order: 30,
    label: "Cancellation terms", to: "/h/:code/cancellation-terms", icon: "ShieldAlert", resource: "rate" },
  { section: "inventory", order: 5,
    label: "Rates", to: "/h/:code/rates", icon: "IndianRupee", resource: "rate" },
  /* D27-383 item 6: for whoever sets prices at more than one real property. */
  { section: "across-properties", order: 8,
    label: "Group rate change", to: "/group-rates", icon: "Tags", resource: "rate",
    canSee: (role, several) => setsRates(role) && (several?.(setsRates) ?? false) },
  /* guests/nav.ts */
  { section: "guests-crm", order: 10, workingMenus: ["front_desk"],
    label: "Guests", to: "/guests", icon: "Users", resource: "customer", matchPrefix: true },
  { section: "guests-crm", order: 20,
    label: "Companies and agents", to: "/companies", icon: "Building2", resource: "company", matchPrefix: true },
  { section: "configuration", order: 40,
    label: "Booking sources", to: "/h/:code/booking-sources", icon: "Plug", resource: "commission" },
  { section: "finance", order: 60,
    label: "Form III", to: "/h/:code/form-c", icon: "ShieldAlert", resource: "customer",
    canSee: (role) => can(role, "edit", "customer") },
  /* finance/nav.ts */
  { section: "finance", order: 10,
    label: "Folios", to: "/h/:code/folios", icon: "Receipt", resource: "invoice", matchPrefix: true },
  { section: "finance", order: 20,
    label: "Invoices", to: "/h/:code/invoices", icon: "FileText", resource: "invoice", matchPrefix: true },
  { section: "finance", order: 30,
    label: "Payments", to: "/h/:code/payments", icon: "Wallet", resource: "payment" },
  { section: "finance", order: 40, workingMenus: ["front_desk"],
    label: "Cashiering", to: "/h/:code/cashiering", icon: "Wallet", resource: "payment",
    canSee: (role) => can(role, "create", "payment") },
  { section: "finance", order: 45,
    label: "Cash deposits", to: "/h/:code/cash-deposits", icon: "PiggyBank", resource: "payment",
    canSee: (role) => ["owner", "admin", "gm", "finance", "read_only"].includes(role) },
  { section: "finance", order: 50,
    label: "Company accounts", to: "/h/:code/city-ledger", icon: "Building2", resource: "invoice",
    canSee: (role) => can(role, "view", "invoice") },
  /* night-audit/nav.ts */
  { section: "reports", order: 10,
    label: "Night audit", to: "/h/:code/night-audit", icon: "BarChart3", resource: "report" },
  /* pos/nav.ts */
  { section: "point-of-sale", order: 10, workingMenus: ["front_desk", "pos", "bar"],
    label: "Tables", to: "/pos/:code/tables", icon: "LayoutGrid", resource: "payment",
    canSee: (role) => mayRingUp(role) },
  { section: "point-of-sale", order: 15,
    label: "Table bookings", to: "/pos/:code/table-bookings", icon: "CalendarClock", resource: "payment",
    canSee: (role) => mayRingUp(role) },
  { section: "point-of-sale", order: 20, workingMenus: ["front_desk", "pos", "bar"],
    label: "Till", to: "/pos/:code/till", icon: "Receipt", resource: "payment",
    canSee: (role) => mayRingUp(role) },
  { section: "point-of-sale", order: 25, workingMenus: ["front_desk"],
    label: "Bill history", to: "/pos/:code/bill-history", icon: "History", resource: "payment",
    canSee: (role) => BILL_HISTORY_ROLES.includes(role) },
  {
    section: "point-of-sale", order: 30, workingMenus: ["front_desk", "pos", "bar"],
    label: "Terminal", to: "/pos/:code/terminal",
    icon: "MonitorSmartphone", resource: "payment",
    canSee: (role) => mayRingUp(role) },
  { section: "point-of-sale", order: 40, workingMenus: ["chef", "kitchen_manager"],
    label: "Kitchen", to: "/pos/:code/kitchen", icon: "Flame", resource: "payment",
    canSee: (role) =>
      canAccess(role, "payment") || role === "chef" || role === "kitchen_manager" },
  { section: "point-of-sale", order: 50, workingMenus: ["kitchen_manager"],
    label: "Menu", to: "/pos/:code/menu", icon: "UtensilsCrossed", resource: "menu" },
  {
    section: "point-of-sale", order: 60, workingMenus: ["front_desk", "pos", "bar", "kitchen_manager"],
    label: "Close restaurant day", to: "/pos/:code/day-end",
    icon: "Banknote", resource: "payment",
    canSee: (role) => mayRingUp(role) || role === "kitchen_manager" },
  { section: "point-of-sale", order: 70,
    label: "Charges to rooms", to: "/pos/:code/room-charges", icon: "Plug", resource: "invoice" },
  { section: "point-of-sale", order: 80,
    label: "Restaurant setup", to: "/pos/:code/setup", icon: "SlidersHorizontal",
    resource: "room_config",
    canSee: (role) => can(role, "edit", "room_config") || can(role, "edit", "menu") },
  /* banquet/nav.ts */
  { section: "banquet", order: 10,
    label: "Diary", to: "/h/:code/banquet", icon: "PartyPopper", resource: "reservation" },
  { section: "banquet", order: 20,
    label: "Halls and packages", to: "/h/:code/banquet/setup", icon: "Building2", resource: "room_config" },
  /* stores/nav.ts */
  { section: "store-and-equipment", order: 10,
    workingMenus: ["housekeeping", "stores", "kitchen_manager"],
    label: "Store", to: "/h/:code/stores", icon: "Package", resource: "stock", matchPrefix: true },
  { section: "store-and-equipment", order: 12,
    workingMenus: ["stores"],
    label: "Inventory", to: "/h/:code/inventory", icon: "Wine", resource: "stock", matchPrefix: true },
  { section: "point-of-sale", order: 45, workingMenus: ["bar"],
    label: "Bar stock", to: "/pos/:code/bar-stock", icon: "Wine", resource: "stock",
    canSee: (role) => BAR_STOCK.includes(role), module: "bar_stock" },
  { section: "point-of-sale", order: 46, workingMenus: ["kitchen_manager", "chef"],
    label: "Kitchen stock", to: "/pos/:code/kitchen-stock", icon: "ChefHat", resource: "stock",
    canSee: (role) => KITCHEN_STOCK.includes(role) },
  /* reports/nav.ts */
  { section: "home", order: 10, workingMenus: ["front_desk"],
    label: "Dashboard", to: "/", icon: "LayoutDashboard", resource: "dashboard" },
  { section: "across-properties", order: 5, label: "All properties", to: "/all-properties", icon: "Hotel", resource: "report", canSee: (role) => can(role, "create", "hotel") },
  /* D27-383 item 6: for whoever reads reports at more than one real property. */
  { section: "across-properties", order: 7,
    label: "Group reports", to: "/group-reports", icon: "Files", resource: "report",
    canSee: (role, several) => can(role, "view", "report") && (several?.((r) => can(r, "view", "report")) ?? false) },
  { section: "reports", order: 20,
    label: "All reports", to: "/reports", icon: "FileText", resource: "report" },
  { section: "reports", order: 30,
    label: "Manager report", to: "/reports/manager", icon: "BarChart3", resource: "report" },
  { section: "reports", order: 35,
    label: "Night audit report", to: "/reports/night-audit", icon: "ScrollText", resource: "report", listed: false },
  { section: "reports", order: 40,
    label: "City ledger", to: "/reports/city-ledger", icon: "Building2", resource: "report",
    canSee: seesMoney, listed: false },
  { section: "reports", order: 55,
    label: "Voids", to: "/reports/voids", icon: "Ban", resource: "report", listed: false },
  /* 16 Nov: the restaurant's NC bills and each item sold. */
  { section: "reports", order: 56,
    label: "NC bills", to: "/reports/nc-bills", icon: "Ban", resource: "report", listed: false },
  { section: "reports", order: 57,
    label: "Item sales", to: "/reports/item-sales", icon: "BarChart3", resource: "report", listed: false },
  { section: "reports", order: 50,
    label: "No show", to: "/reports/no-show", icon: "CalendarCheck", resource: "report", listed: false },
  { section: "reports", order: 60,
    label: "Monthly occupancy", to: "/reports/monthly-occupancy", icon: "BarChart3", resource: "report", listed: false },
  { section: "reports", order: 70,
    label: "Monthly statistics", to: "/reports/monthly-stats", icon: "BarChart3", resource: "report", listed: false },
  { section: "reports", order: 80,
    label: "Yearly statistics", to: "/reports/yearly-stats", icon: "BarChart3", resource: "report", listed: false },
  { section: "reports", order: 90,
    label: "Lodging tax", to: "/reports/lodging-tax", icon: "FileText", resource: "report", listed: false },
  { section: "reports", order: 100,
    label: "GST sales register", to: "/reports/gst-sales", icon: "ScrollText", resource: "report", listed: false },
  { section: "reports", order: 110,
    label: "Form III register", to: "/reports/c-form", icon: "ShieldCheck", resource: "report",
    canSee: (role) => can(role, "edit", "customer"), listed: false },
  { section: "reports", order: 120,
    label: "Guest ledger", to: "/reports/guest-ledger", icon: "BookOpen", resource: "report",
    canSee: seesMoney, listed: false },
  { section: "reports", order: 130,
    label: "Cashier shift", to: "/reports/cashier-shift", icon: "Banknote", resource: "report",
    canSee: seesMoney, listed: false },
  { section: "reports", order: 135,
    label: "Petty cash", to: "/reports/petty-cash", icon: "Wallet", resource: "report",
    canSee: seesMoney, listed: false },
  { section: "reports", order: 145,
    label: "Store reports", to: "/reports/store", icon: "Warehouse", resource: "stock",
    canSee: mayReadStockReports, listed: false },
  { section: "reports", order: 150,
    label: "Closing stock", to: "/reports/stock-on-hand", icon: "Boxes", resource: "stock",
    canSee: mayReadStockReports, listed: false },
  { section: "reports", order: 160,
    label: "Stock movement by day", to: "/reports/stock-movements", icon: "ArrowLeftRight", resource: "stock",
    canSee: mayReadStockReports, listed: false },
  { section: "reports", order: 170,
    label: "Consumption", to: "/reports/stock-consumption", icon: "PackageOpen", resource: "stock",
    canSee: mayReadStockReports, listed: false },
  { section: "reports", order: 180,
    label: "Wastage and breakage", to: "/reports/stock-wastage", icon: "Trash2", resource: "stock",
    canSee: mayReadStockReports, listed: false },
  { section: "reports", order: 190,
    label: "Count differences", to: "/reports/stock-count-differences", icon: "ClipboardCheck", resource: "stock",
    canSee: mayReadStockReports, listed: false },
  { section: "reports", order: 200,
    label: "Dead stock", to: "/reports/stock-dead", icon: "Hourglass", resource: "stock",
    canSee: mayReadStockReports, listed: false },
  { section: "reports", order: 210,
    label: "Days of cover", to: "/reports/stock-cover", icon: "Gauge", resource: "stock",
    canSee: mayReadStockReports, listed: false },
  { section: "reports", order: 220,
    label: "Supplier spend", to: "/reports/supplier-spend", icon: "Truck", resource: "stock",
    canSee: mayReadStockReports, listed: false },
  { section: "reports", order: 230,
    label: "Equipment report", to: "/reports/equipment", icon: "Refrigerator", resource: "stock",
    canSee: mayReadStockReports, listed: false },
  { section: "reports", order: 235,
    label: "Supplier dues report", to: "/reports/supplier-dues", icon: "HandCoins", resource: "invoice",
    canSee: seesSupplierDues,
    listed: false },
  { section: "reports", order: 236,
    label: "TDS on suppliers", to: "/reports/tds", icon: "HandCoins", resource: "invoice",
    canSee: seesSupplierDues, listed: false },
  { section: "reports", order: 237,
    label: "Supplier statement", to: "/reports/supplier-statement", icon: "HandCoins", resource: "invoice",
    canSee: seesSupplierDues, listed: false },
  /* D27-383: money owed by age and one account's statement (`invoice` view, D27-145). */
  { section: "reports", order: 41,
    label: "Money owed by age", to: "/reports/dues-by-age", icon: "Building2", resource: "invoice",
    canSee: seesMoney, listed: false },
  { section: "reports", order: 42,
    label: "Statement of account", to: "/reports/company-statement", icon: "Building2", resource: "invoice",
    canSee: seesMoney, listed: false },
  { section: "reports", order: 43,
    label: "Commission owed", to: "/reports/commission", icon: "Percent", resource: "commission",
    canSee: seesCommission, listed: false },
  /* D27-383 item 4: GST a month at a time. */
  { section: "reports", order: 101,
    label: "GSTR-1", to: "/reports/gstr-1", icon: "ScrollText", resource: "report", listed: false },
  { section: "reports", order: 102,
    label: "Input tax credit", to: "/reports/input-tax-credit", icon: "ScrollText", resource: "invoice",
    canSee: seesSupplierDues, listed: false },
  { section: "reports", order: 103,
    label: "GST on advances", to: "/reports/gst-advances", icon: "ScrollText", resource: "invoice",
    canSee: seesMoney, listed: false },
  { section: "reports", order: 240,
    label: "Bar stock", to: "/reports/bar-stock", icon: "Wine", resource: "stock",
    canSee: mayReadStockReports, listed: false,
    module: "bar_stock" },
  { section: "reports", order: 241,
    label: "FLR-1A/2A/3A register", to: "/reports/flr-daily", icon: "Wine", resource: "stock",
    canSee: mayReadStockReports, listed: false,
    module: "bar_stock" },
  { section: "reports", order: 242,
    label: "FLR-3 register", to: "/reports/flr-monthly", icon: "Wine", resource: "stock",
    canSee: mayReadStockReports, listed: false,
    module: "bar_stock" },
  /* admin/nav.ts */
  { section: "across-properties", order: 10,
    label: "Properties", to: "/properties", icon: "Hotel", resource: "hotel", matchPrefix: true },
  { section: "across-properties", order: 20,
    label: "People", to: "/people", icon: "UserCog", resource: "user", matchPrefix: true },
  { section: "system", order: 20, listed: false,
    label: "Settings", to: "/settings", icon: "Settings", resource: "setting", matchPrefix: true },
  { section: "system", order: 22, listed: false,
    label: "Users", to: "/admin/users", icon: "UserCog", resource: "user" },
  { section: "system", order: 24, listed: false,
    label: "Integrations", to: "/admin/integrations", icon: "Plug", resource: "integration" },
  /* D27-398: the Accountant reads Backfill data here, having no Settings. */
  { section: "finance", order: 97, listed: false,
    label: "Backfilled records", to: "/h/:code/backfill", icon: "CalendarClock", resource: "invoice",
    canSee: readsBackfillOnly },
  { section: "system", order: 25,
    label: "System health", to: "/admin/system-health", icon: "Activity", resource: "role" },
  /* channel-manager/nav.ts */
  { section: "distribution", order: 10,
    label: "Channel manager", to: "/h/:code/channels", icon: "Globe", resource: "integration",
    canSee: seesComingSoon },
  /* accounting/nav.ts */
  { section: "reports", order: 140,
    label: "Accounting export", to: "/reports/accounting", icon: "Calculator",
    resource: "report", canSee: EXPORTS_THE_BOOKS, listed: false },
  /* crm/nav.ts */
  { section: "guests-crm", order: 50,
    label: "Guest 360", to: "/crm/guests", icon: "UserRoundSearch", resource: "customer",
    canSee: seesGuest360, matchPrefix: true },
  { section: "guests-crm", order: 60,
    label: "Possible same person", to: "/crm/same-person", icon: "Combine", resource: "customer",
    canSee: seesGuest360 },
  /* contracts/nav.ts */
  { section: "distribution", order: 40,
    label: "Contracts", to: "/contracts", icon: "FilePen", resource: "company", matchPrefix: true },
  /* crs/nav.ts */
  { section: "bookings", order: 40, workingMenus: ["front_desk"],
    label: "CRS bookings", to: "/h/:code/crs-bookings", icon: "Network", resource: "reservation" },
  /* guest-messaging/nav.ts */
  { section: "guests-crm", order: 30, workingMenus: ["front_desk"],
    label: "Guest messages", to: "/h/:code/guest-messages", icon: "MessageSquare",
    resource: "customer" },
  /* guest-services/nav.ts */
  { section: "front-desk", order: 90,
    workingMenus: ["front_desk", "housekeeping", "kitchen_manager", "chef", "pos", "bar"],
    label: "Guest requests", to: "/h/:code/requests", icon: "ConciergeBell", resource: "reservation",
    canSee: (role) => REQUEST_ROLES.includes(role) },
  { section: "front-desk", order: 91, workingMenus: ["front_desk"],
    label: "Wake-up calls", to: "/h/:code/wake-up-calls", icon: "AlarmClock", resource: "reservation",
    canSee: (role) => WAKE_UP_ROLES.includes(role) },
  { section: "front-desk", order: 92, workingMenus: ["front_desk", "housekeeping"],
    label: "Lost property", to: "/h/:code/lost-property", icon: "PackageSearch", resource: "reservation",
    canSee: (role) => LOST_ROLES.includes(role) },
  /* equipment/nav.ts */
  { section: "store-and-equipment", order: 20, workingMenus: ["stores", "housekeeping"],
    label: "Equipment", to: "/h/:code/equipment", icon: "Armchair", resource: "equipment",
    matchPrefix: true },
  /* purchasing/nav.ts */
  { section: "store-and-equipment", order: 40,
    label: "Purchasing", to: "/h/:code/purchasing", icon: "ShoppingCart",
    resource: "purchasing", matchPrefix: true, workingMenus: ["stores", "housekeeping"] },
  { section: "store-and-equipment", order: 41,
    label: "Who may ask to buy", to: "/h/:code/purchasing/who-may-ask",
    icon: "ShoppingCart", resource: "purchasing", listed: false },
  { section: "finance", order: 70,
    label: "Supplier dues", to: "/h/:code/supplier-dues", icon: "HandCoins",
    resource: "invoice", canSee: seesSupplierDues },
  /* room-systems/nav.ts */
  { section: "system", order: 90, notBuilt: true,
    label: "Room systems", to: "/coming-soon/room-systems", icon: "KeyRound", resource: "integration",
    canSee: seesComingSoon },
  /* laundry/nav.ts */
  { section: "laundry", order: 10, workingMenus: ["front_desk", "housekeeping"],
    label: "Dockets", to: "/h/:code/laundry", icon: "Shirt", resource: "laundry",
    matchPrefix: true },
  { section: "laundry", order: 20,
    label: "Price list", to: "/h/:code/laundry/price-list", icon: "IndianRupee",
    resource: "laundry" },
  /* leads/nav.ts */
  { section: "sales-marketing", order: 10,
    label: "Leads and WhatsApp", to: "/h/:code/leads", icon: "MessageCircle", resource: "customer" },
  /* loyalty/nav.ts */
  { section: "sales-marketing", order: 30,
    label: "Loyalty", to: "/h/:code/loyalty", icon: "Award", resource: "customer" },
  /* marketing/nav.ts */
  { section: "sales-marketing", order: 20,
    label: "Marketing", to: "/h/:code/marketing", icon: "Megaphone", resource: "marketing" },
  /* online-checkin/nav.ts */
  { section: "front-desk", order: 35, workingMenus: ["front_desk"],
    label: "Online check-in", to: "/h/:code/online-checkin", icon: "Smartphone", resource: "customer",
    canSee: (role) => DESK_ROLES.includes(role) },
  /* payments/nav.ts */
  { section: "finance", order: 90, notBuilt: true,
    label: "Online payments", to: "/coming-soon/payments", icon: "CreditCard", resource: "integration",
    canSee: seesComingSoon },
  /* revenue-management/nav.ts */
  { section: "inventory", order: 30,
    label: "Revenue outlook", to: "/h/:code/revenue-outlook", icon: "TrendingUp",
    resource: "rate", canSee: setsRates },
  /* reputation/nav.ts */
  { section: "guests-crm", order: 40,
    label: "Reviews", to: "/h/:code/reviews", icon: "Star", resource: "customer" },
  /* D27-383 item 10: what guests answered after check-out (feedbackRoles.ts). */
  { section: "guests-crm", order: 45,
    label: "Guest feedback", to: "/h/:code/feedback", icon: "MessageSquareHeart", resource: "customer",
    canSee: (role) => FEEDBACK_ROLES.includes(role) },
  /* spa/nav.ts */
  { section: "spa", order: 10,
    label: "Spa diary", to: "/h/:code/spa", icon: "Flower2", resource: "spa" },
  { section: "spa", order: 20,
    label: "Treatments", to: "/h/:code/spa/setup", icon: "Sparkles",
    resource: "spa", canSee: (role) => SETS_THE_LIST.includes(role) },
];

/* ── The Settings console (settingsConsole.ts): SETTINGS_PAGES as the web
   assembles them, stand-ins gone. A page with `to` is a link to a Front
   office screen; the others live at /settings/<group>/<slug>. ─────── */

const GROUPS = [
  ["property", "Property"], ["rooms", "Rooms"], ["rates", "Rates and tax"], ["money", "Money"],
  ["lists", "Lists"], ["front-desk", "Front desk"], ["messages", "Messages"],
  ["people", "People and security"], ["connections", "Modules and connections"],
] as const;

interface Page {
  group: (typeof GROUPS)[number][0];
  slug: string;
  label?: string;
  icon?: MenuIcon;
  resource?: Resource;
  canSee?: (role: Role) => boolean;
  to?: string;
}

const PAGES: readonly Page[] = [
  { group: "property", slug: "profile", label: "Profile", icon: "Building2" },
  { group: "property", slug: "set-up-this-hotel", label: "Set up this hotel", icon: "ListChecks" },
  { group: "property", slug: "backfill-data", label: "Backfill data", icon: "CalendarClock" },
  { group: "property", slug: "old-data", label: "Bring in old data", icon: "FileUp", canSee: switchesModules },
  { group: "property", slug: "photos", label: "Logo and photos", icon: "Images" },
  { group: "property", slug: "highlights", label: "Highlights", icon: "Sparkles" },
  { group: "property", slug: "cancellation-terms", to: "/h/:code/cancellation-terms" },
  { group: "property", slug: "amenities", label: "Amenities", icon: "Wifi" },
  { group: "property", slug: "group", label: "Group", icon: "Network" },
  { group: "property", slug: "policies", label: "Policies", icon: "ScrollText" },
  { group: "property", slug: "documents", label: "Documents", icon: "FileText" },
  { group: "rooms", slug: "room-types", label: "Room types", icon: "LayoutDashboard", resource: "room_config" },
  { group: "rates", slug: "rates", to: "/h/:code/rates" },
  { group: "rates", slug: "plans", label: "Rate plans", icon: "Network", resource: "rate" },
  { group: "rates", slug: "meal-plans", label: "Meal plans", icon: "UtensilsCrossed", resource: "rate" },
  { group: "rates", slug: "taxes", label: "Taxes", icon: "Percent" },
  { group: "money", slug: "bank", label: "Bank details", icon: "Landmark" },
  { group: "money", slug: "payment-methods", label: "Payment methods", icon: "CreditCard" },
  { group: "money", slug: "extra-charges", label: "Extra charges", icon: "ReceiptText" },
  { group: "money", slug: "discounts", label: "Room discounts", icon: "BadgePercent" },
  { group: "money", slug: "commission", label: "Commission", icon: "HandCoins" },
  { group: "money", slug: "pickup", label: "Pickup and drop", icon: "Car" },
  { group: "lists", slug: "booking-sources", to: "/h/:code/booking-sources" },
  { group: "lists", slug: "market-segments", label: "Market segments", icon: "ListChecks" },
  { group: "lists", slug: "reservation-types", label: "Reservation types", icon: "Palette" },
  { group: "lists", slug: "reasons", label: "Ready reasons", icon: "ClipboardList" },
  { group: "lists", slug: "holidays", label: "Holidays", icon: "CalendarHeart" },
  { group: "lists", slug: "id-types", label: "ID types", icon: "IdCard" },
  { group: "lists", slug: "vip", label: "VIP levels", icon: "BadgeCheck" },
  { group: "front-desk", slug: "times-and-rules", label: "Times and rules", icon: "ConciergeBell" },
  { group: "front-desk", slug: "front-desk", label: "Front desk rules", icon: "ConciergeBell" },
  { group: "messages", slug: "guest-messages", to: "/h/:code/guest-messages" },
  { group: "messages", slug: "reviews", to: "/h/:code/reviews" },
  { group: "messages", slug: "online-checkin", to: "/h/:code/online-checkin" },
  { group: "messages", slug: "switches", label: "Guest messages on/off", icon: "BellRing" },
  { group: "messages", slug: "daily-report-emails", label: "Daily report emails", icon: "FileText" },
  { group: "messages", slug: "scheduled-reports", label: "Scheduled reports", icon: "CalendarClock" },
  { group: "people", slug: "people", to: "/people" },
  { group: "people", slug: "roles", label: "Roles and permissions", icon: "ShieldCheck", resource: "role" },
  { group: "people", slug: "audit-log", label: "Audit log", icon: "ScrollText", resource: "audit_log" },
  { group: "people", slug: "activity", label: "Activity", icon: "History", resource: "audit_log" },
  { group: "people", slug: "sign-ins", to: "/admin/sign-ins" },
  { group: "people", slug: "devices", label: "Sign-ins and devices", icon: "LogIn", resource: "user", canSee: switchesModules },
  { group: "people", slug: "signing-in", label: "Signing in", icon: "KeyRound" },
  { group: "connections", slug: "modules", label: "Modules", icon: "ToggleRight", canSee: switchesModules },
  { group: "connections", slug: "channels", to: "/h/:code/channels" },
  { group: "connections", slug: "crs", to: "/h/:code/crs-bookings" },
  { group: "connections", slug: "rivals-prices", label: "Rivals' prices", icon: "Store" },
  { group: "connections", slug: "integrations", to: "/admin/integrations" },
  { group: "connections", slug: "connection-health", label: "Connection health", icon: "HeartPulse" },
  { group: "connections", slug: "system-health", to: "/admin/system-health" },
];

const addressOf = (page: Page) => `/settings/${page.group}/${page.slug}`;

const CONSOLE_SECTIONS: NavSection[] = GROUPS.map(([key, label]) => ({
  key: `settings-${key}`, label, space: "settings",
  items: PAGES.flatMap((page) => page.group !== key || page.to ? [] : [{
    label: page.label!, to: addressOf(page), icon: page.icon!, matchPrefix: true,
    resource: page.resource ?? "setting",
    canSee: (role: Role) => canAccess(role, "setting")
      && (page.canSee ? page.canSee(role) : canAccess(role, page.resource ?? "setting")),
  }]),
}));

/* ── navigation.ts, the functions ────────────────────────────────── */

const entriesIn = (key: SectionKey): Entry[] =>
  ENTRIES.filter((entry) => entry.section === key).sort((a, b) => a.order - b.order);

const SECTIONS: NavSection[] = [
  ...SECTION_LAYOUT.map((section) => ({ ...section, items: entriesIn(section.key) })),
  ...CONSOLE_SECTIONS,
];

const visible = (role: Role, item: NavItem, several?: Several): boolean =>
  item.canSee ? item.canSee(role, several) : canAccess(role, item.resource);

/** An entry behind a per-hotel switch: off only when the answer says off. */
const switchedOn = (item: { module?: string }, modules?: Record<string, boolean>) =>
  !item.module || modules === undefined || modules[item.module] !== false;

const resolve = (path: string, code: string) => path.replace(":code", code);

/** Sections and items the role can reach; a section is kept while the
    property's modules are unknown (undefined). `several`: the session's
    question for the two group entries (none given, they are hidden). */
export function navigationFor(role: Role, code = "", modules?: Record<string, boolean>, several?: Several): NavSection[] {
  return SECTIONS
    .filter((section) => !section.module || modules === undefined || modules[section.module] !== false)
    .filter((section) => !section.receptionNeeds || role !== "front_desk" || modules?.[section.receptionNeeds] !== false)
    .map((section) => ({
      ...section,
      items: section.items
        .filter((item) => switchedOn(item, modules))
        .map((item) => ({
          ...item,
          to: resolve(item.to, code),
          children: item.children?.filter((child) => visible(role, child, several)).map((child) => ({ ...child, to: resolve(child.to, code) })),
        }))
        .filter((item) => visible(role, item, several) || (item.children?.length ?? 0) > 0),
    }))
    .filter((section) => section.items.length > 0);
}

/** Every screen the role may open, listed in its menu or not. */
export function flatNavigationFor(role: Role, code = "", modules?: Record<string, boolean>, several?: Several): NavItem[] {
  const out: NavItem[] = [];
  for (const section of navigationFor(role, code, modules, several)) {
    for (const item of section.items) {
      if (visible(role, item, several)) out.push(item);
      for (const child of item.children ?? []) {
        if (!out.some((existing) => existing.to === child.to)) out.push(child);
      }
    }
  }
  return out;
}

/** Whether the role may reach one menu address (with ":code" in it). */
export const mayReach = (role: Role, to: string, several?: Several) =>
  flatNavigationFor(role, ":code", undefined, several).some((item) => item.to === to);

const WORKING_MENUS: Partial<Record<Role, readonly string[]>> = (() => {
  const out: Partial<Record<Role, string[]>> = {};
  const add = (item: NavItem) => {
    for (const role of item.workingMenus ?? []) (out[role] ??= []).push(item.to);
  };
  for (const { key } of SECTION_LAYOUT) {
    for (const entry of entriesIn(key)) {
      add(entry);
      for (const child of entry.children ?? []) add(child);
    }
  }
  return out;
})();

const RESTAURANT_ONLY: readonly Role[] = ["pos", "bar", "chef", "kitchen_manager"];

export const spaceOf = (path: string): Space =>
  path === "/settings" || path.startsWith("/settings/") ? "settings"
    : path.startsWith("/pos/") ? "pos" : "front";

/** Where each space opens (SpaceSwitcher.tsx home): the Front office's
    Dashboard, the Settings console's /settings, the Restaurant's first entry. */
export const spaceHome = (role: Role, code: string, modules: Record<string, boolean> | undefined, space: Space): string =>
  space === "front" ? "/" : space === "settings" ? "/settings"
    : sidebarFor(role, code, modules, "pos")[0]?.items[0]?.to ?? "/";

/** The spaces this person may switch between, in the switcher's order. */
export function spacesFor(role: Role, code = "", modules?: Record<string, boolean>): Space[] {
  if (RESTAURANT_ONLY.includes(role)) return ["pos"];
  const has = new Set(navigationFor(role, code, modules).map((s) => s.space ?? "front"));
  return (["front", "pos", "settings"] as const).filter((s) => s === "front" || has.has(s));
}

function consoleMenu(role: Role, code: string, modules?: Record<string, boolean>, several?: Several): NavSection[] {
  const reach = new Map(flatNavigationFor(role, code, modules, several).map((item) => [item.to, item]));
  return CONSOLE_SECTIONS.map((section, i) => ({
    ...section,
    items: PAGES.flatMap((page) => {
      if (page.group !== GROUPS[i]![0]) return [];
      const item = reach.get(page.to ? resolve(page.to, code) : addressOf(page));
      return item ? [{ ...item, ...(page.to ? { leaves: true as const } : {}) }] : [];
    }),
  })).filter((section) => section.items.length > 0);
}

/** The menu: what this person WORKS from, in the navigation's order, in one space. */
export function sidebarFor(role: Role, code = "", modules?: Record<string, boolean>, space: Space = "front", several?: Several): NavSection[] {
  if (space === "settings") return consoleMenu(role, code, modules, several);
  const only = RESTAURANT_ONLY.includes(role);
  const working = WORKING_MENUS[role];
  const keep = (item: NavItem) =>
    item.listed !== false && (!working || working.some((path) => resolve(path, code) === item.to));
  return navigationFor(role, code, modules, several)
    .filter((section) => only || (section.space ?? "front") === space)
    .map((section) => ({
      ...section,
      items: section.items
        .map((item) => ({ ...item, children: item.children?.filter(keep) }))
        .filter((item) => keep(item) || (item.children?.length ?? 0) > 0),
    }))
    .filter((section) => section.items.length > 0);
}

/** How many of the person's screens their menu leaves out (Sidebar.tsx). */
export function hiddenCount(role: Role, code: string, modules: Record<string, boolean> | undefined, space: Space, several?: Several): number {
  const n = (sections: NavSection[]) => sections.reduce((a, s) => a + s.items.reduce((m, i) => m + 1 + (i.children?.length ?? 0), 0), 0);
  return n(navigationFor(role, code, modules, several)) - n(sidebarFor(role, code, modules, space, several));
}

const WORKING_HOME: Partial<Record<Role, string>> = {
  housekeeping: "/h/:code/housekeeping",
  kitchen_manager: "/pos/:code/kitchen",
  chef: "/pos/:code/kitchen",
  pos: "/pos/:code/tables",
  bar: "/pos/:code/tables",
};

export function workingHomeFor(role: Role, code: string): string | null {
  const working = WORKING_MENUS[role];
  if (!working || working.includes("/")) return null;
  return resolve(WORKING_HOME[role] ?? working[0]!, code);
}

/* ══════════════════════════════════════════════════════════════════
   WHAT THE PHONE HAS — THE ONE TABLE TO ADD TO
   The web's address → the phone's route, one line each, grouped by the
   phone's module (the frame first, then A to Z), each group naming the
   lane that built it. A menu entry not in this table stays in the menu,
   greyed: "On the website for now". A few keys are the web's OLD
   addresses, which the web redirects to the line beside them (admin/
   routes.tsx, inventory/routes.tsx): a link a notification or a screen
   still carries opens the same phone screen. menu.check.ts pins every
   line and that each target is a route file of app/.
   ══════════════════════════════════════════════════════════════════ */

export const ON_THE_WEBSITE = "On the website for now";

export const PHONE_ROUTES: Readonly<Record<string, string>> = {
  /* The frame (main, mobile/shell): the Dashboard, All properties, Notifications. */
  "/": "/hotel/:code",
  "/all-properties": "/all",
  "/notifications": "/notifications/:code",
  /* admin (mobile/m13-admin): the Settings console's first screen and its own pages, Administration.
     The Accountant's Backfilled records is the same Backfill screen. */
  "/settings": "/admin/:code",
  "/settings/property/backfill-data": "/admin/:code/backfill",
  "/h/:code/backfill": "/admin/:code/backfill",
  "/settings/money/bank": "/admin/:code/bank",
  "/settings/people/roles": "/admin/:code/roles",
  "/admin/roles": "/admin/:code/roles",
  "/settings/people/audit-log": "/admin/:code/audit-log",
  "/admin/audit-log": "/admin/:code/audit-log",
  "/settings/people/activity": "/admin/:code/activity",
  "/admin/activity": "/admin/:code/activity",
  "/settings/people/devices": "/admin/:code/sign-ins",
  "/admin/sign-ins": "/admin/:code/sign-ins",
  "/settings/people/signing-in": "/admin/:code/signing-in",
  "/settings/connections/modules": "/admin/:code/modules",
  /* settings (mobile/m13-set-property, 20 Nov): Settings → Property's own pages; the bell's and "Back to
     setup"'s /h/:code/setup lands on Set up this hotel, as the web's does. */
  "/settings/property/profile": "/settings/:code/profile",
  "/settings/property/set-up-this-hotel": "/settings/:code/set-up-this-hotel",
  "/h/:code/setup": "/settings/:code/set-up-this-hotel",
  "/settings/property/old-data": "/settings/:code/old-data",
  "/settings/property/photos": "/settings/:code/photos",
  "/settings/property/highlights": "/settings/:code/highlights",
  "/settings/property/amenities": "/settings/:code/amenities",
  "/settings/property/group": "/settings/:code/group",
  "/settings/property/policies": "/settings/:code/policies",
  "/settings/property/documents": "/settings/:code/documents",
  "/properties": "/admin/:code/properties",
  "/people": "/admin/:code/people",
  "/admin/users": "/admin/:code/users",
  "/admin/integrations": "/admin/:code/integrations",
  "/admin/system-health": "/admin/:code/system-health",
  /* approvals (mobile/t2-approvals) */
  "/h/:code/approvals": "/approvals/:code",
  /* banquet (mobile/t2-banquet; Halls and packages, mobile/m13-setups) */
  "/h/:code/banquet": "/banquet/:code",
  "/h/:code/banquet/setup": "/banquet/:code/setup",
  /* connections (mobile/t2-messages): Settings → Modules and connections → Connection health, read only. */
  "/settings/connections/connection-health": "/connections/:code",
  /* contracts (mobile/m13-sales): a company's page is reached from its list. */
  "/contracts": "/contracts/:code",
  /* crs (mobile/t2-crs) */
  "/h/:code/crs-bookings": "/crs/:code",
  /* equipment (mobile/m13-hk): its item is reached from it. */
  "/h/:code/equipment": "/equipment/:code",
  /* finance (mobile/m13-fin-bills, mobile/m13-fin-desk): an invoice's page is reached from Invoices. */
  "/h/:code/folios": "/finance/:code/folios",
  "/h/:code/invoices": "/finance/:code/invoices",
  "/h/:code/payments": "/finance/:code/payments",
  "/h/:code/cashiering": "/finance/:code/cashiering",
  "/h/:code/cash-deposits": "/finance/:code/cash-deposits",
  "/h/:code/city-ledger": "/finance/:code/city-ledger",
  "/h/:code/form-c": "/finance/:code/form-c",
  "/h/:code/supplier-dues": "/finance/:code/supplier-dues",
  /* front-desk (mobile/front-desk, mobile/m13-rooms): its tabs are a query on the same screen (its MODULE.md). */
  "/h/:code/stay": "/front-desk/:code/rooms",
  "/h/:code/arrivals": "/front-desk/:code",
  "/h/:code/arrivals/upcoming": "/front-desk/:code?view=upcoming",
  "/h/:code/in-house": "/front-desk/:code/in-house",
  "/h/:code/in-house/due-out": "/front-desk/:code/in-house?view=due-out",
  "/h/:code/walk-ins": "/front-desk/:code/walk-ins",
  /* guest-messages (mobile/t2-messages): Guests & CRM, and Settings → Messages, the same page. */
  "/h/:code/guest-messages": "/guest-messages/:code",
  /* guest-services (mobile/guest-services): each web screen to its own twin, not to the phone's hub
     (the hub has no web twin; its MODULE.md). */
  "/h/:code/requests": "/guest-services/:code/requests",
  "/h/:code/wake-up-calls": "/guest-services/:code/wake-up-calls",
  "/h/:code/lost-property": "/guest-services/:code/lost-property",
  "/h/:code/online-checkin": "/guest-services/:code/online-checkin",
  /* guests (mobile/t2-guests, mobile/m13-sales): the web's four carry no property; Guest 360's page
     sits under its search. */
  "/guests": "/guests/:code",
  "/companies": "/guests/:code/companies",
  "/crm/guests": "/guests/:code/find",
  "/crm/same-person": "/guests/:code/same-person",
  /* housekeeping (main, mobile/maintenance, mobile/m13-hk) */
  "/h/:code/housekeeping": "/housekeeping/:code",
  "/h/:code/minibar": "/housekeeping/:code/minibar",
  "/h/:code/checklists": "/housekeeping/:code/checklists",
  "/h/:code/work-orders": "/housekeeping/:code/work-orders",
  /* inventory (mobile/t2-rates, mobile/m13-config): Rates; the property's set-up; Group rate change
     (above any one hotel: the code places the frame). */
  "/h/:code/rates": "/inventory/:code",
  "/group-rates": "/inventory/:code/group-rates",
  "/h/:code/cancellation-terms": "/inventory/:code/cancellation-terms",
  "/h/:code/booking-sources": "/inventory/:code/booking-sources",
  "/h/:code/channels": "/inventory/:code/channels",
  "/h/:code/places": "/inventory/:code/places",
  "/settings/rooms/room-types": "/inventory/:code/room-types",
  "/h/:code/room-types": "/inventory/:code/room-types",
  /* laundry (mobile/t2-laundry; the Price list, mobile/m13-setups) */
  "/h/:code/laundry": "/laundry/:code",
  "/h/:code/laundry/price-list": "/laundry/:code/price-list",
  /* leads, loyalty, marketing (mobile/m13-sales, mobile/t2-loyalty) */
  "/h/:code/leads": "/leads/:code",
  "/h/:code/loyalty": "/loyalty/:code",
  "/h/:code/marketing": "/marketing/:code",
  /* night-audit (mobile/t2-night-audit); the banner's link too (Shell.tsx) */
  "/h/:code/night-audit": "/night-audit/:code",
  /* pos (mobile/pos-tables, mobile/kitchen, mobile/m13-till, mobile/m13-pos-service, mobile/m13-pos-setup) */
  "/pos/:code/tables": "/pos/:code/tables",
  "/pos/:code/table-bookings": "/pos/:code/table-bookings",
  "/pos/:code/till": "/pos/:code/till",
  "/pos/:code/bill-history": "/pos/:code/bill-history",
  "/pos/:code/terminal": "/pos/:code/terminal",
  "/pos/:code/kitchen": "/pos/:code/kitchen",
  "/pos/:code/menu": "/pos/:code/menu",
  "/pos/:code/day-end": "/pos/:code/day-end",
  "/pos/:code/room-charges": "/pos/:code/room-charges",
  "/pos/:code/setup": "/pos/:code/setup",
  /* purchasing (mobile/t2-purchasing, mobile/m13-setups): an order is reached from the list. */
  "/h/:code/purchasing": "/purchasing/:code",
  "/h/:code/purchasing/who-may-ask": "/purchasing/:code/who-may-ask",
  /* reports (mobile/m13-rep-ops, mobile/m13-rep-money, mobile/m13-rep-stock), in the menu's order. */
  "/group-reports": "/reports/:code/group-reports",
  "/reports": "/reports/:code",
  "/reports/manager": "/reports/:code/manager",
  "/reports/night-audit": "/reports/:code/night-audit",
  "/reports/city-ledger": "/reports/:code/city-ledger",
  "/reports/dues-by-age": "/reports/:code/dues-by-age",
  "/reports/company-statement": "/reports/:code/company-statement",
  "/reports/commission": "/reports/:code/commission",
  "/reports/no-show": "/reports/:code/no-show",
  "/reports/voids": "/reports/:code/voids",
  "/reports/nc-bills": "/reports/:code/nc-bills",
  "/reports/item-sales": "/reports/:code/item-sales",
  "/reports/monthly-occupancy": "/reports/:code/monthly-occupancy",
  "/reports/monthly-stats": "/reports/:code/monthly-stats",
  "/reports/yearly-stats": "/reports/:code/yearly-stats",
  "/reports/lodging-tax": "/reports/:code/lodging-tax",
  "/reports/gst-sales": "/reports/:code/gst-sales",
  "/reports/gstr-1": "/reports/:code/gstr-1",
  "/reports/input-tax-credit": "/reports/:code/input-tax-credit",
  "/reports/gst-advances": "/reports/:code/gst-advances",
  "/reports/c-form": "/reports/:code/c-form",
  "/reports/guest-ledger": "/reports/:code/guest-ledger",
  "/reports/cashier-shift": "/reports/:code/cashier-shift",
  "/reports/petty-cash": "/reports/:code/petty-cash",
  "/reports/accounting": "/reports/:code/accounting",
  "/reports/stock-on-hand": "/reports/:code/stock-on-hand",
  "/reports/stock-movements": "/reports/:code/stock-movements",
  "/reports/stock-consumption": "/reports/:code/stock-consumption",
  "/reports/stock-wastage": "/reports/:code/stock-wastage",
  "/reports/stock-count-differences": "/reports/:code/stock-count-differences",
  "/reports/stock-dead": "/reports/:code/stock-dead",
  "/reports/stock-cover": "/reports/:code/stock-cover",
  "/reports/supplier-spend": "/reports/:code/supplier-spend",
  "/reports/equipment": "/reports/:code/equipment",
  "/reports/supplier-dues": "/reports/:code/supplier-dues",
  "/reports/tds": "/reports/:code/tds",
  "/reports/supplier-statement": "/reports/:code/supplier-statement",
  "/reports/bar-stock": "/reports/:code/bar-stock",
  "/reports/flr-daily": "/reports/:code/flr-daily",
  "/reports/flr-monthly": "/reports/:code/flr-monthly",
  /* reputation (mobile/t2-reviews, mobile/m13-sales) */
  "/h/:code/reviews": "/reputation/:code",
  "/h/:code/feedback": "/reputation/:code/feedback",
  /* reservations (mobile/t2-reservations, mobile/m13-groups): one group is reached from Groups. */
  "/h/:code/calendar": "/reservations/:code/calendar",
  "/h/:code/reservations": "/reservations/:code",
  "/h/:code/groups": "/reservations/:code/groups",
  "/h/:code/book": "/reservations/:code/book",
  "/h/:code/waitlist": "/reservations/:code/waitlist",
  /* revenue (mobile/t2-revenue) */
  "/h/:code/revenue-outlook": "/revenue/:code",
  /* spa (mobile/t2-spa; Treatments, mobile/m13-setups) */
  "/h/:code/spa": "/spa/:code",
  "/h/:code/spa/setup": "/spa/:code/setup",
  /* stores (mobile/t2-stores): the Store (the Inventory Manager's landing), Inventory, and the
     Restaurant menu's Bar stock and Kitchen stock - one sheet screen, three doors, as the web. */
  "/h/:code/stores": "/stores/:code",
  "/h/:code/inventory": "/stores/:code/inventory",
  "/pos/:code/bar-stock": "/stores/:code/bar-stock",
  "/pos/:code/kitchen-stock": "/stores/:code/kitchen-stock",
};

/** The phone's route for a web address, null where the phone has none. A web address's query is
    dropped, but for the setup reminder's ?step= (the bell links /h/:code/setup?step=<id>, api
    notifications.ts), which Set up this hotel opens on; only a step's own letters are carried. */
export function phoneRoute(to: string, code: string): string | null {
  const [bare, query] = to.split("?");
  const key = bare!.replace(/^\/(h|pos)\/[^/]+/, "/$1/:code");
  const route = PHONE_ROUTES[key];
  if (!route) return null;
  const step = key === "/h/:code/setup" ? /(?:^|&)step=([a-z-]+)(?:&|$)/.exec(query ?? "")?.[1] : undefined;
  return resolve(route, code) + (step ? `?step=${step}` : "");
}

/** The space of the phone screen in view (MADM-1): the web's spaceOf of the
    web address it stands for - the longest PHONE_ROUTES target the path is or
    sits under; on a tie the Settings console's address, as the web's old
    addresses redirect into it - else the web's rule on the path itself. So
    Settings → Roles (/admin/5EL/roles) is in Settings, People in the Front office. */
export function spaceHere(path: string): Space {
  const bare = path.split("?")[0]!.replace(/^\/([a-z-]+)\/[^/]+/, "/$1/:code");
  let best: { length: number; space: Space } | null = null;
  for (const [web, route] of Object.entries(PHONE_ROUTES)) {
    const target = route.split("?")[0]!;
    if (bare !== target && !bare.startsWith(`${target}/`)) continue;
    const space = spaceOf(web);
    if (!best || target.length > best.length || (target.length === best.length && space === "settings")) best = { length: target.length, space };
  }
  return best?.space ?? spaceOf(path);
}

/** The one route of a menu that the screen in view belongs to: the exact
    match (with its ?view=), else the same screen without its query, else
    the longest route of a matchPrefix entry the path sits under. The
    phone's routes nest where the web's do not (/front-desk/:code holds In
    house and Walk-ins), so the first prefix found is not enough (MCORE-3). */
export function activeRoute(routes: readonly { route: string; prefix: boolean }[], here: string): string | null {
  const bare = here.split("?")[0]!;
  const exact = routes.find((r) => r.route === here) ?? routes.find((r) => r.route === bare);
  if (exact) return exact.route;
  let best: string | null = null;
  for (const r of routes) {
    if (r.prefix && !r.route.includes("?") && bare.startsWith(`${r.route}/`) && r.route.length > (best?.length ?? 0)) best = r.route;
  }
  return best;
}

/** The web's full-screen pages cover the frame (Kitchen.tsx, Terminal.tsx:
    fixed inset-0 z-50; AppShell's note): no bar there, as the picture shows. */
export const coversTheFrame = (path: string) => /^\/pos\/[^/]+\/(kitchen|terminal)(\/|$)/.test(path);

/** Where a person starts at a property: their own work (the web's
    workingHomeFor, as app/index.tsx does), else its Dashboard. A role whose
    first screen the phone does not have goes to All properties. */
export const landing = (role: Role, code: string) =>
  phoneRoute(workingHomeFor(role, code) ?? "/", code) ?? "/all";

/* ── Two words of the web's ──────────────────────────────────────── */

/** src/lib/format.ts initials. */
export const initials = (name: string) =>
  name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("");

/** src/lib/format.ts relative: date-fns's formatDistanceToNow with its suffix. */
export function relative(at: string, now = Date.now()): string {
  /* Through the core's reader: Postgres's text reads NaN on a phone (MAPR-2, MEMORY 7). */
  const then = Date.parse(instant(at));
  if (Number.isNaN(then)) return "-";
  const minutes = Math.round(Math.abs(now - then) / 60_000);
  const n = (count: number, one: string) => `${count} ${one}${count === 1 ? "" : "s"}`;
  const months = Math.floor(minutes / 43_200);
  const words = minutes === 0 ? "less than a minute"
    : minutes < 45 ? n(minutes, "minute")
    : minutes < 90 ? "about 1 hour"
    : minutes < 1_440 ? `about ${n(Math.round(minutes / 60), "hour")}`
    : minutes < 2_520 ? "1 day"
    : minutes < 43_200 ? n(Math.round(minutes / 1_440), "day")
    : minutes < 86_400 ? `about ${n(Math.round(minutes / 43_200), "month")}`
    : months < 12 ? n(Math.round(minutes / 43_200), "month")
    : months % 12 < 3 ? `about ${n(Math.floor(months / 12), "year")}`
    : months % 12 < 9 ? `over ${n(Math.floor(months / 12), "year")}`
    : `almost ${n(Math.floor(months / 12) + 1, "year")}`;
  return then > now ? `in ${words}` : `${words} ago`;
}
