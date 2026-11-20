/* ══════════════════════════════════════════════════════════════════
   ALL REPORTS, AND WHO MAY OPEN EACH (mobile/m13-rep-ops, 19 Nov)

   The index: src/modules/reports/pages/Index.tsx GROUPS, word for word, in
   its order (the 16 Nov release). Who sees a row: the web's `mayReach(role,
   path, modules)` - the row's menu entry in src/modules/reports/nav.ts
   (canSee, else any grant on its resource) and, for the bar's three, the
   hotel's `bar_stock` switch. The core's menu port (src/core/menu.ts) is of
   4 Nov and lacks the entries added since (NC bills, Item sales, Money owed
   by age, Statement of account, Commission owed, GSTR-1, Input tax credit,
   GST on advances, Group reports), so each row carries its nav.ts rule here,
   asked of the core's matrix (`can`, the same as api/src/permissions.ts).

   The refusals are the API's own sentences (api/src/roleGate.ts refusalFor,
   WHO; the read rules REPORTS, MONEY_REPORT, STORE_REPORTS, SUPPLIER_DUES),
   and RequireAccess.tsx's page for an address the role's menu lacks.

   Pure: opsIndex.check.ts runs it under node.
   ══════════════════════════════════════════════════════════════════ */

import { ROLES, ROLE_LABELS, asRole, can, canAccess, type Resource, type Role } from "../../core/menu.ts";

/** A lucide icon's name (Index.tsx's glyphs): the screen imports them. */
export type ReportIcon =
  | "ClipboardList" | "ScrollText" | "Ban" | "ChartColumn" | "CalendarDays" | "ChartNoAxesColumn" | "Building2"
  | "Clock" | "FileText" | "Percent" | "UserX" | "ReceiptText" | "Wallet" | "HandCoins" | "Landmark"
  | "FileSpreadsheet" | "FileJson" | "ShoppingCart" | "PiggyBank" | "Plane" | "Boxes" | "ArrowLeftRight"
  | "PackageOpen" | "Trash2" | "ClipboardCheck" | "Hourglass" | "Gauge" | "Truck" | "Refrigerator" | "Wine";

export interface ReportLink {
  title: string;
  /** The web's address, "/reports/manager". */
  path: string;
  description: string;
  icon: ReportIcon;
  /** Its menu entry's label, for "which does not include …" (nav.ts). */
  menu: string;
  /** Its menu entry's rule (nav.ts canSee, else canAccess of its resource). */
  may: (role: Role) => boolean;
  /** A per-hotel switch it sits behind (nav.ts `module`). */
  module?: string;
}
export interface ReportGroup { title: string; note: string; reports: ReportLink[] }

/* nav.ts's rules, by name. */
const reads = (resource: Resource) => (role: Role) => canAccess(role, resource);
const seesMoney = (role: Role) => can(role, "view", "invoice");
const seesSupplierDues = (role: Role) => can(role, "approve", "invoice");
const mayReadStockReports = (role: Role) => can(role, "export", "stock") || role === "hotel_manager" || role === "read_only";
const REPORT = reads("report");

const r = (title: string, path: string, icon: ReportIcon, description: string, may: (role: Role) => boolean, menu = title, module?: string): ReportLink =>
  ({ title, path, icon, description, may, menu, ...(module ? { module } : {}) });

/** Index.tsx GROUPS, today's (16 Nov). */
export const GROUPS: ReportGroup[] = [
  {
    title: "The day",
    note: "What happened, and what is about to.",
    reports: [
      r("Manager report", "/reports/manager", "ClipboardList", "Today, period to date and year to date in three columns. The one an owner opens first.", REPORT),
      r("Night audit report", "/reports/night-audit", "ScrollText", "What happened on one day, to the paisa: rooms charged, who left, every receipt, the restaurant.", REPORT),
      r("Voids", "/reports/voids", "Ban", "Every voided bill, order closed unpaid and struck dish in the restaurant, by outlet and day: what, how much, who, when and why.", REPORT),
      r("NC bills", "/reports/nc-bills", "Ban", "Every bill given free, by outlet and day: its value, the reason, who asked, who approved and their comment.", REPORT),
      r("Item sales", "/reports/item-sales", "ChartColumn", "Each dish and drink sold over any days, by outlet and category: how many and for how much.", REPORT),
      r("Monthly occupancy", "/reports/monthly-occupancy", "CalendarDays", "Occupancy for every day of the month, as a chart. Full houses and empty ones both stand out.", REPORT),
      r("Monthly statistics", "/reports/monthly-stats", "ChartColumn", "The daily grid - rooms sold, ADR, RevPAR, pax, charges, tax and receipts.", REPORT),
      r("Yearly statistics", "/reports/yearly-stats", "ChartNoAxesColumn", "The same columns at month grain, with a grand total that recomputes rates rather than averaging averages.", REPORT),
    ],
  },
  {
    title: "Money owed",
    note: "Balances that have left the building without being settled.",
    reports: [
      r("City ledger", "/reports/city-ledger", "Building2", "Bills transferred to a company or booking site, account by account.", seesMoney),
      r("Money owed by age", "/reports/dues-by-age", "Clock", "What each company, agent and booking site owes, in 0-30, 31-60, 61-90 and over 90 days.", seesMoney),
      r("Statement of account", "/reports/company-statement", "FileText", "One company's or site's bills, payments and balance for the days chosen, to send to them.", seesMoney),
      r("Commission owed", "/reports/commission", "Percent", "Commission on the stays from booking sites and agents that checked out, booking by booking.", (role) => can(role, "view", "commission")),
      r("No show", "/reports/no-show", "UserX", "Bookings that never arrived on a day. It prints even when nobody did.", REPORT),
      r("Guest ledger", "/reports/guest-ledger", "ReceiptText", "Every folio that moved, with its opening and closing balance.", seesMoney),
      r("Cashier shift", "/reports/cashier-shift", "Wallet", "What each cashier took today, by method. Reversed receipts excluded.", seesMoney),
      r("Supplier dues", "/reports/supplier-dues", "HandCoins", "What we owe each supplier on a date, bill by bill, and the payments made.", seesSupplierDues, "Supplier dues report"),
      r("Supplier statement", "/reports/supplier-statement", "HandCoins", "One supplier's ledger for the days chosen: bills, payments, TDS, credit notes, the running balance.", seesSupplierDues),
      r("TDS on supplier payments", "/reports/tds", "HandCoins", "TDS deducted from suppliers, by section and supplier: the figures for the quarterly return (26Q).", seesSupplierDues, "TDS on suppliers"),
      r("Petty cash", "/reports/petty-cash", "Wallet", "Every expense paid out of the restaurant's tin and the front desk's drawer, by day and category.", seesMoney),
    ],
  },
  {
    title: "Statutory",
    note: "Filed, not read. These have to reconcile to the rupee.",
    reports: [
      r("Lodging tax", "/reports/lodging-tax", "Landmark", "CGST and SGST at each slab's rate, as the return expects it.", REPORT),
      r("GST sales register", "/reports/gst-sales", "FileSpreadsheet", "Invoice-level GSTR-1 extract, credit notes as their own rows.", REPORT),
      r("GSTR-1", "/reports/gstr-1", "FileJson", "The month's return table by table - B2B, B2C, credit notes, HSN, documents - and its file for the GST portal.", REPORT),
      r("Input tax credit", "/reports/input-tax-credit", "ShoppingCart", "The GST on the month's deliveries, as recorded: what was marked claimable and what was not.", seesSupplierDues),
      r("GST on advances", "/reports/gst-advances", "PiggyBank", "GST on money taken before a tax invoice: received, given back and adjusted, for GSTR-1 Table 11.", seesMoney),
      r("Form III register", "/reports/c-form", "Plane", "Foreign guests' arrivals and departures in Form III's order, and the FRRO portal's numbers.", (role) => can(role, "edit", "customer")),
    ],
  },
  {
    title: "Store and equipment",
    note: "What the stores hold and use, and where the equipment is. Costs as recorded.",
    reports: [
      r("Closing stock", "/reports/stock-on-hand", "Boxes", "Each store's stock on a date, at the average cost as recorded.", mayReadStockReports),
      r("Stock movement by day", "/reports/stock-movements", "ArrowLeftRight", "Received, issued, wasted and counted, one row a day.", mayReadStockReports),
      r("Consumption", "/reports/stock-consumption", "PackageOpen", "What was issued, per item and per outlet.", mayReadStockReports),
      r("Wastage and breakage", "/reports/stock-wastage", "Trash2", "Every wastage, and every breakage with who broke it.", mayReadStockReports),
      r("Count differences", "/reports/stock-count-differences", "ClipboardCheck", "What each count corrected, and why.", mayReadStockReports),
      r("Dead stock", "/reports/stock-dead", "Hourglass", "Stock that has not gone out for 30, 60 or 90 days.", mayReadStockReports),
      r("Days of cover", "/reports/stock-cover", "Gauge", "How long each item lasts at the last 7 days' use.", mayReadStockReports),
      r("Supplier spend", "/reports/supplier-spend", "Truck", "Deliveries per supplier, and each item's first and last price.", mayReadStockReports),
      r("Equipment report", "/reports/equipment", "Refrigerator", "What is out of the store, under repair, and when warranties and AMCs end.", mayReadStockReports),
      r("Bar stock", "/reports/bar-stock", "Wine", "The bar's day: each drink's opening, purchases, sales, count and closing.", mayReadStockReports, "Bar stock", "bar_stock"),
      r("FLR-1A/2A/3A register", "/reports/flr-daily", "Wine", "The daily excise register: each brand's opening, receipts, sales and closing, by bottle size.", mayReadStockReports, "FLR-1A/2A/3A register", "bar_stock"),
      r("FLR-3 register", "/reports/flr-monthly", "Wine", "The monthly excise register: received, sold and closing, day by day, by class and size.", mayReadStockReports, "FLR-3 register", "bar_stock"),
    ],
  },
];

const ALL = GROUPS.flatMap((g) => g.reports);
/** Index.tsx BUILT and TOTAL: every row has its page on the web, so "N of N built". */
export const BUILT = ALL.filter((x) => x.path).length;
export const TOTAL = ALL.length;

/** An entry behind a per-hotel switch: off only when the answer says off (navigation.ts switchedOn). */
const switchedOn = (x: { module?: string }, modules?: Record<string, boolean>) =>
  !x.module || modules === undefined || modules[x.module] !== false;

/** The web's mayReach for a row: its menu entry's rule, and its switch. */
export const reachable = (role: Role, x: ReportLink, modules?: Record<string, boolean>) => x.may(role) && switchedOn(x, modules);

/** The phone's address of a report: "/reports/manager" → "/reports/5EL/manager"
    (each report lane builds app/reports/[code]/<name>.tsx; the mobile chat checks them at the merge). */
export const phoneHref = (path: string, code: string) => `/reports/${code}/${path.replace(/^\/reports\//, "")}`;

/** Index.tsx's filter: the title or the description holds what was typed. */
export const matches = (x: ReportLink, q: string) => {
  const s = q.trim().toLowerCase();
  return !s || x.title.toLowerCase().includes(s) || x.description.toLowerCase().includes(s);
};

/** The groups as the page draws them: rows this role reaches and the search finds; empty groups out. */
export const shownGroups = (role: Role, q: string, modules?: Record<string, boolean>) =>
  GROUPS.map((g) => ({ ...g, reports: g.reports.filter((x) => reachable(role, x, modules) && matches(x, q)) }))
    .filter((g) => g.reports.length > 0);

/** Index.tsx's Starred: the starred rows this role reaches, in the index's order; none while searching. */
export const starredRows = (role: Role, starred: readonly string[], q: string, modules?: Record<string, boolean>) =>
  q.trim() ? [] : ALL.filter((x) => starred.includes(x.path) && reachable(role, x, modules));

/** ui.ts toggleFavouriteReport. */
export const toggled = (starred: readonly string[], path: string) =>
  starred.includes(path) ? starred.filter((p) => p !== path) : [...starred, path];

/* ── The pages' guards: RequireAccess.tsx, the menu's own rule ─────── */

/** nav.ts: All reports, and the screens this lane has (Group reports is opsGroup.ts's). */
export const PAGES = {
  index: { menu: "All reports", may: REPORT },
  manager: ALL.find((x) => x.path === "/reports/manager")!,
  nightAudit: ALL.find((x) => x.path === "/reports/night-audit")!,
  monthlyOccupancy: ALL.find((x) => x.path === "/reports/monthly-occupancy")!,
  monthlyStats: ALL.find((x) => x.path === "/reports/monthly-stats")!,
  yearlyStats: ALL.find((x) => x.path === "/reports/yearly-stats")!,
  noShow: ALL.find((x) => x.path === "/reports/no-show")!,
  itemSales: ALL.find((x) => x.path === "/reports/item-sales")!,
} as const;

/** RequireAccess.tsx's sentence for a page the role's menu does not hold. */
export const notYourRole = (role: string | null, menu: string) =>
  `You are signed in as ${ROLE_LABELS[asRole(role)]}, which does not include ${menu}. If you need it, the person who set up your account can change your role.`;

/* ── The API's sentence: roleGate.ts refusalFor ──────────────────── */

const WHO: Readonly<Record<Role, string>> = {
  owner: "the owner", admin: "an administrator", gm: "the general manager", hotel_manager: "the hotel manager",
  revenue_manager: "the revenue manager", front_desk: "reception", housekeeping: "housekeeping",
  kitchen_manager: "the kitchen manager", chef: "a chef", pos: "a waiter", bar: "a bar person",
  stores: "the Inventory Manager", finance: "the accountant", read_only: "a viewer", automation: "an automation account",
};
const list = (names: string[]) =>
  names.length <= 1 ? names.join("") : `${names.slice(0, -1).join(", ")} or ${names[names.length - 1]}`;
/** What a refused person reads: what they tried, and whom to ask. */
export const refusalFor = (doing: string, allows: (role: Role) => boolean) =>
  `${doing} is for ${list(ROLES.filter((x) => x !== "automation" && allows(x)).map((x) => WHO[x]))}. Ask one of them.`;

/** roleGate.ts REPORTS = see("report", "reports"): the read rule of every report this lane draws. */
export const readsReports = (role: Role) => can(role, "view", "report");
export const REPORTS_REFUSED = refusalFor("Reading reports", readsReports);
