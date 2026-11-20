/* ══════════════════════════════════════════════════════════════════
   WHO MAY OPEN AND DO WHAT IN ADMINISTRATION — the web's and the API's
   own answers, never wider (AGENTS rule 1; BRIEF-T3: admin screens change
   who may do what).

   OPENING A SCREEN: the web's RequireAccess asks `mayReach(role, path)` of
   its navigation (src/components/app/RequireAccess.tsx); the core's
   `mayReach` is that navigation ported whole (src/core/menu.ts), so the
   same question is asked here. A refused screen says the web's sentence
   ("This page is not part of your role…").

   READING behind it: api/src/roleGate.ts READ_RULES, its `see()` sentence
   (refusalFor, ported below over the core's matrix), and the routes' own
   (api/src/modules/admin/grants.ts ADMIN_READ_REFUSED, activity.ts,
   backfill.ts).

   DOING: every write in People, Sign-ins, Properties and Modules is the
   route's own ("own" in roleGate: app.manages_person, app.may_switch_person,
   app.may_set_password, app.require_hotel_admin, app.sign_out_device,
   maySwitchModules); the phone offers a button only where the server's row
   says it may (`mayEdit`, `maySwitch`, `maySetPassword`, `rosterAt`), as
   the web does, and anything refused comes back as the server's sentence.

   Pure: no React Native here, so `roles.check.ts` runs under node.
   ══════════════════════════════════════════════════════════════════ */

import { ROLES, ROLE_LABELS, can, canAccess, mayReach, type Resource, type Role } from "../../core/menu.ts";

/* ── refusalFor (api/src/roleGate.ts 1289-1335), over the core's matrix ── */

/** roleGate.ts WHO: how a refusal names each role. */
export const WHO: Readonly<Record<Role, string>> = {
  owner: "the owner", admin: "an administrator", gm: "the general manager", hotel_manager: "the hotel manager",
  revenue_manager: "the revenue manager", front_desk: "reception", housekeeping: "housekeeping",
  kitchen_manager: "the kitchen manager", chef: "a chef", pos: "a waiter", bar: "a bar person",
  stores: "the Inventory Manager", finance: "the accountant", read_only: "a viewer", automation: "an automation account",
};

const list = (names: string[]) =>
  names.length <= 1 ? names.join("") : `${names.slice(0, -1).join(", ")} or ${names[names.length - 1]}`;

type Action = Parameters<typeof can>[1];

/** The roles a grant lets in, in the matrix's order, never the automation account. */
export const whoMay = (resource: Resource, action: Action): Role[] =>
  ROLES.filter((role) => role !== "automation" && can(role, action, resource));

/** roleGate's refusalFor for a grant rule: "<doing> is for … Ask one of them." */
export const refusalFor = (doing: string, resource: Resource, action: Action) =>
  `${doing} is for ${list(whoMay(resource, action).map((r) => WHO[r]))}. Ask one of them.`;

/* ── The reads (roleGate READ_RULES and the routes' own sentences) ── */

/** GET /:code/staff: see("user", "the staff list"). */
export const STAFF_REFUSED = refusalFor("Reading the staff list", "user", "view");
/** GET /:code/integrations: see("integration", "the integrations"). */
export const INTEGRATIONS_REFUSED = refusalFor("Reading the integrations", "integration", "view");
/** GET /:code/system-health: SYSTEM_HEALTH = grant("role", "view", "Reading the system's health"). */
export const HEALTH_REFUSED = refusalFor("Reading the system's health", "role", "view");
/** GET /:code/backfill: BACKFILL_READ = grant("invoice", "approve", …). */
export const BACKFILL_REFUSED = refusalFor("Reading what happened before the hotel's first day", "invoice", "approve");
/** grants.ts ADMIN_READ_REFUSED (the audit log, Activity, Settings). */
export const AUDIT_REFUSED =
  "The audit log is open to the owner, an administrator and the general manager. Ask one of them.";
export const SETTINGS_REFUSED =
  "Settings are open to the owner, an administrator and the general manager. Ask one of them.";
/** grants.ts GROUP_ACTIVITY_REFUSED: "Across the group" (D27-245 Q-A). */
export const GROUP_ACTIVITY_REFUSED =
  "Changes across the group are for the owner and an administrator. Ask one of them.";
/** grants.ts MODULE_SWITCH_REFUSED (D17-36). */
export const MODULE_SWITCH_REFUSED =
  "Switching a module on or off is for the owner or an administrator. Ask one of them.";

/** admin/moduleSwitchRoles.ts switchesModules: the owner and an Admin (D17-36). */
export const switchesModules = (role: Role) => role === "owner" || role === "admin";
/** Whether two-step sign-in is required: the database's own question (migration 257
    app.set_two_step_required): the person reaches a real hotel (app.has_real_hotel: a group
    administrator, or rostered where `test_of` is null) AND is a group administrator or holds Owner or
    Admin at ANY hotel - not only at the one in view (MADM-4). Read from GET /api/hotels's answer: a hotel
    the person is rostered at that the answer does not list (a closed one) is not counted as real, so the
    phone is never wider than the server. */
export function setsTwoStepRequired(who: {
  scope: { isGroupAdmin: boolean; hotels: ReadonlyArray<{ hotelId: string; role: string }> };
  hotels: ReadonlyArray<{ id: string; testOf?: string | null }>;
}): boolean {
  if (who.scope.isGroupAdmin) return true;
  const real = who.scope.hotels.some((g) => who.hotels.some((h) => h.id === g.hotelId && !h.testOf));
  return real && who.scope.hotels.some((g) => g.role === "owner" || g.role === "admin");
}

/** Activity.tsx mayGroup: "Across the group" is offered to the owner and an Admin. */
export const seesGroupActivity = switchesModules;
/** backfill.ts BACKFILL_READ: `invoice` approve (owner, admin, GM, the accountant). */
export const readsBackfill = (role: Role) => can(role, "approve", "invoice");

/* ── Opening a screen: the web's RequireAccess ───────────────────── */

/** The web address each phone screen stands for, and the menu's name for it
    (the label RequireAccess's sentence uses; menu.ts holds the same). */
export const SCREENS = {
  settings: { path: "/settings", label: "Settings" },
  people: { path: "/people", label: "People" },
  users: { path: "/admin/users", label: "Users" },
  roles: { path: "/settings/people/roles", label: "Roles and permissions" },
  auditLog: { path: "/settings/people/audit-log", label: "Audit log" },
  activity: { path: "/settings/people/activity", label: "Activity" },
  signIns: { path: "/settings/people/devices", label: "Sign-ins and devices" },
  integrations: { path: "/admin/integrations", label: "Integrations" },
  systemHealth: { path: "/admin/system-health", label: "System health" },
  properties: { path: "/properties", label: "Properties" },
  modules: { path: "/settings/connections/modules", label: "Modules" },
} as const;
export type ScreenKey = keyof typeof SCREENS;

/** RequireAccess's own words for a role the navigation does not let in. */
export const notYourRole = (role: Role, label: string) =>
  `You are signed in as ${ROLE_LABELS[role]}, which does not include ${label}. If you need it, the person who set up your account can change your role.`;

/** null when the web would open the screen for this role, else its sentence. */
export function refusedScreen(role: Role, screen: ScreenKey): string | null {
  const { path, label } = SCREENS[screen];
  return mayReach(role, path) ? null : notYourRole(role, label);
}

/** Backfill: whoever has Settings, or reads it (the web's BackfillForHotel, nav.ts "Backfilled records"). */
export const refusedBackfill = (role: Role): string | null =>
  mayReach(role, "/settings") || readsBackfill(role) ? null : notYourRole(role, "Backfilled records");

/* ── The roles, as People and Roles and permissions word them ────── */

/** src/lib/permissions.ts SYSTEM_ROLES left out: every role the database lets a person hold. */
export const ASSIGNABLE: readonly Role[] = ROLES.filter((r) => r !== "automation");

/** People.tsx ROLE_WHAT: the sentence under a role, to somebody choosing it. */
export const ROLE_WHAT: Partial<Record<Role, string>> = {
  owner: "Every property, and the settings that govern them",
  admin: "Runs the system day to day, including accounts",
  gm: "Everything at this property, and the night audit",
  hotel_manager: "The property day to day, without the money decisions",
  front_desk: "Bookings, check-in, bills, the cash drawer",
  housekeeping: "Room status and work orders",
  kitchen_manager: "The pass and the menu",
  chef: "The pass - moves dishes along, touches no money",
  pos: "Orders, KOTs, bills and payment; the restaurant's day end",
  bar: "The waiter's work, on the bar's menu only",
  stores: "Stock, receiving and issues. Raises purchases",
  finance: "Invoices, the city ledger and the reports",
  read_only: "Can look, cannot change anything",
};
export const roleWhat = (role: string) =>
  ROLE_WHAT[role as Role] ?? "No description written for this role yet.";

/** People.tsx roleLabel: the matrix's word, or the stored word when it is not one. */
export const roleLabel = (role: string) =>
  (ROLES as readonly string[]).includes(role) && role !== "automation" ? ROLE_LABELS[role as Role] : role;

/** src/lib/permissions.ts ROLE_DESCRIPTIONS (Users' role line). */
export const ROLE_DESCRIPTIONS: Readonly<Record<Role, string>> = {
  owner: "Unrestricted. Sole authority over roles, approvals and settings.",
  admin: "Runs the platform day to day, including user accounts.",
  gm: "Sees the whole book. Approves overrides, rate changes and purchases. Runs the hotel's people, never an Admin or the Owner.",
  hotel_manager: "One property, run day to day. Below the GM on approvals.",
  revenue_manager: "Prices, restrictions and what the booking sites sell. No bills, guests or staff.",
  front_desk: "Arrivals, check-in, charges, settle, check-out. One property.",
  housekeeping: "Room status, task queue, offline sync. One property.",
  kitchen_manager: "The pass and the menu. Sees what the kitchen owes and when.",
  chef: "The pass. Moves dishes along; changes nothing about money.",
  pos: "Takes orders and sends KOTs, prints bills, takes payment, asks the GM for a discount or NC, closes the restaurant day.",
  bar: "The waiter's rights on the bar's menu sections only. Its KOTs print at the bar.",
  stores: "Stock and equipment. Approves equipment leaving the store; raises purchases.",
  finance: "Folios, invoices, payments, city ledger, reports.",
  read_only: "Read-only across the platform. No write access anywhere.",
  automation: "Service account for background jobs. Not a person.",
};

/* ── Passwords (data/admin.ts, a copy of api/src/identity.ts minPasswordFor) ── */

export const MIN_PASSWORD = 8;
export const MIN_MANAGER_PASSWORD = 10;
/** D27-243 (5.3): 10 for the owner, an Admin or a GM; 8 for anybody else. */
export const minPasswordFor = (roles: readonly string[], isGroupAdmin = false): number =>
  isGroupAdmin || roles.some((r) => r === "owner" || r === "admin" || r === "gm") ? MIN_MANAGER_PASSWORD : MIN_PASSWORD;

/* ── Roles and permissions: the matrix the web draws (pages/Admin.tsx RolesPage) ── */

/** src/lib/permissions.ts RESOURCES, in the matrix's order (the core keeps the list private). */
export const RESOURCES: readonly Resource[] = [
  "dashboard", "reservation", "customer", "company", "hotel", "inventory", "room_config", "rate",
  "menu", "stock", "equipment", "purchasing", "laundry", "spa", "marketing", "invoice", "payment",
  "commission", "report", "notification", "user", "role", "integration", "audit_log", "setting", "ai",
];
export const ACTIONS: readonly Action[] = ["view", "create", "edit", "cancel", "approve", "export", "delete"];

/** src/lib/permissions.ts RESOURCE_LABELS. */
export const RESOURCE_LABELS: Readonly<Record<Resource, string>> = {
  dashboard: "Dashboard", reservation: "Reservations", customer: "Customers", company: "Companies",
  hotel: "Properties", inventory: "Room availability", room_config: "Room configuration", rate: "Rate plans",
  menu: "Restaurant menu", stock: "Store", equipment: "Equipment", purchasing: "Purchasing", laundry: "Laundry",
  spa: "Spa", marketing: "Marketing", invoice: "Invoices", payment: "Payments", commission: "Commissions",
  report: "Reports", notification: "Notifications", user: "Users", role: "Roles", integration: "Integrations",
  audit_log: "Audit log", setting: "Settings", ai: "AI assistant",
};
/** src/lib/permissions.ts ACTION_LABELS. */
export const ACTION_LABELS: Readonly<Record<Action, string>> = {
  view: "View", create: "Create", edit: "Edit", cancel: "Cancel", approve: "Approve", export: "Export", delete: "Delete",
};

/** One cell of the matrix as the web words it: none, "Everything" (a tick), or the actions by name (QA AD-8). */
export type Cell = { kind: "none" } | { kind: "all" } | { kind: "some"; words: string };
export function cellOf(role: Role, resource: Resource): Cell {
  const grants = ACTIONS.filter((a) => can(role, a, resource));
  if (grants.length === 0) return { kind: "none" };
  if (grants.length === ACTIONS.length) return { kind: "all" };
  return { kind: "some", words: grants.map((a) => ACTION_LABELS[a]).join(", ") };
}
/** The matrix's columns: permissionMatrix() maps every role, the automation account included. */
export const MATRIX_ROLES: readonly Role[] = ROLES;

/** restaurantRights.ts RESTAURANT_BY_NAME: what the server lets the Waiter and the Bar do by name (POS-35). */
export const RESTAURANT_BY_NAME = {
  does: ["Ringing up an order", "Printing the kitchen's KOTs", "Answering a table booking", "Closing the restaurant's day"],
  reads: ["the restaurant's orders", "the menu", "the kitchen's KOTs", "the restaurant's outlets", "the restaurant's day",
    "a paid-out's photo", "guests' preferences"],
} as const;
/** Admin.tsx inWords: "a, b and c", lower-cased. */
export const inWords = (xs: readonly string[]) => {
  const low = xs.map((x) => x.charAt(0).toLowerCase() + x.slice(1));
  return `${low.slice(0, -1).join(", ")} and ${low[low.length - 1]}`;
};

export { canAccess };
