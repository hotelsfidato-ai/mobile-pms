/* ══════════════════════════════════════════════════════════════════
   WHO MAY READ THE MONEY AND TAX REPORTS. The API decides (AGENTS rule 1);
   the phone asks the same matrix first, as the web's RequireAccess does, and
   says the API's own sentence instead of a page that would only be refused.
     api/src/roleGate.ts 861   REPORTS       = see("report", "reports")
     api/src/roleGate.ts 858   MONEY_REPORT  = see("invoice", "money owed and taken")
     api/src/roleGate.ts 873   SUPPLIER_DUES = grant("invoice", "approve", "Reading what is owed to suppliers")
     api/src/roleGate.ts 105   GUEST_ID      = grant("customer", "edit", "Reading guests' passport and ID details")
     api/src/roleGate.ts 1074  commission    = see("commission", "commission owed")
     api/src/roleGate.ts 1077  gstr-1.json   = grant("report", "export", "Downloading the GSTR-1 file")
     api/src/modules/accounting/routes.ts 31, 76  MAY_EXPORT, NOT_YOURS (the accounting export's own rule)
     api/src/roleGate.ts 1289-1329  WHO, list, refusalFor: the sentence, ported below
   The matrix is the core's port of api/src/permissions.ts (src/core/menu.ts
   `can`). Pure: money.check.ts.
   ══════════════════════════════════════════════════════════════════ */

import { ROLES, asRole, can, type Role } from "../../core/menu.ts";

/* roleGate.ts WHO. */
const WHO: Readonly<Record<Role, string>> = {
  owner: "the owner", admin: "an administrator", gm: "the general manager", hotel_manager: "the hotel manager",
  revenue_manager: "the revenue manager", front_desk: "reception", housekeeping: "housekeeping",
  kitchen_manager: "the kitchen manager", chef: "a chef", pos: "a waiter", bar: "a bar person",
  stores: "the Inventory Manager", finance: "the accountant", read_only: "a viewer", automation: "an automation account",
};
const list = (names: string[]) =>
  names.length <= 1 ? names.join("") : `${names.slice(0, -1).join(", ")} or ${names[names.length - 1]}`;

type Grant = { allows: (role: Role) => boolean; doing: string };
const refusalFor = (g: Grant) =>
  `${g.doing} is for ${list(ROLES.filter((r) => r !== "automation" && g.allows(r)).map((r) => WHO[r]))}. Ask one of them.`;

const REPORTS: Grant = { allows: (r) => can(r, "view", "report"), doing: "Reading reports" };
const MONEY_REPORT: Grant = { allows: (r) => can(r, "view", "invoice"), doing: "Reading money owed and taken" };
const SUPPLIER_DUES: Grant = { allows: (r) => can(r, "approve", "invoice"), doing: "Reading what is owed to suppliers" };
const GUEST_ID: Grant = { allows: (r) => can(r, "edit", "customer"), doing: "Reading guests' passport and ID details" };
const COMMISSION: Grant = { allows: (r) => can(r, "view", "commission"), doing: "Reading commission owed" };
const GSTR1_FILE: Grant = { allows: (r) => can(r, "export", "report"), doing: "Downloading the GSTR-1 file" };

/** Each report of the lane and the read rule its route asks (roleGate.ts 962, 1039-1077). */
export const READ_RULE = {
  "gst-sales": REPORTS, "gstr-1": REPORTS, "lodging-tax": REPORTS, voids: REPORTS, "nc-bills": REPORTS,
  "input-tax-credit": SUPPLIER_DUES, tds: SUPPLIER_DUES,
  "gst-advances": MONEY_REPORT, "guest-ledger": MONEY_REPORT, "city-ledger": MONEY_REPORT, "company-statement": MONEY_REPORT,
  "dues-by-age": MONEY_REPORT, "cashier-shift": MONEY_REPORT, "petty-cash": MONEY_REPORT,
  commission: COMMISSION, "c-form": GUEST_ID,
} as const satisfies Record<string, Grant>;
export type ReadKey = keyof typeof READ_RULE;

/** null when the API lets this person read the report, else its sentence. */
export const whyNotRead = (key: ReadKey, role: string | null) => {
  const g = READ_RULE[key];
  return g.allows(asRole(role)) ? null : refusalFor(g);
};

/** The GSTR-1 file's right; the web says its own line beside the button (Gst.tsx 66). */
export const mayDownloadGstr1 = (role: string | null) => GSTR1_FILE.allows(asRole(role));
export const GSTR1_FILE_REFUSED = "The file is for those who may download reports.";

/** accounting/routes.ts MAY_EXPORT and its refusal, word for word. */
const MAY_EXPORT: readonly string[] = ["owner", "admin", "gm", "finance"];
export const NOT_YOURS = "The accounting export is the owner's, an administrator's, the general manager's and the accountant's.";
export const whyNotAccounting = (role: string | null) => (role && MAY_EXPORT.includes(role) ? null : NOT_YOURS);

/* ── Taking a report away: print, save as PDF, share (src/core/Export.tsx) ──
   The phone's print and share are no way round the web's file rules: a role
   that may read a report but not download it is told why, in the server's
   words, and gets no export.
     api/src/routes/reportFiles.ts 31-46, 100-134  REPORT_EXPORTERS, the four lists, the sentences
     api/src/modules/reports/listExports.ts 139-180  exportRefusal for the four list screens */
const REPORT_EXPORTERS: readonly string[] = ["owner", "admin", "gm", "hotel_manager", "revenue_manager", "finance"];
const MONEY_FILES: readonly string[] = ["city-ledger", "petty-cash", "dues-by-age", "company-statement", "gst-advances"];
const DUES_FILES: readonly string[] = ["tds", "input-tax-credit"];
const FILE_REFUSED = {
  dues: "What is owed to suppliers is for the owner, an administrator, the general manager or the accountant. Ask one of them.",
  commission: "Downloading the commission owed is for the owner, an administrator, the general manager, the revenue manager or the accountant. Ask one of them.",
  money: "Downloading this report is for the owner, an administrator, the general manager, the hotel manager or the accountant. Ask one of them.",
  any: "Downloading reports is for the owner, an administrator, the general manager, the hotel manager, the revenue manager or the accountant. Ask one of them.",
};
const DOWNLOADERS = "the owner, an administrator, the general manager, the hotel manager, the revenue manager or the accountant";
/** listExports.ts LIST_SCREENS: what each of the four lists holds. */
const HOLDS = { "gst-sales": "money", "guest-ledger": "money", "cashier-shift": "money", "c-form": "guests" } as const;

/** null when this person may take the report away, else the server's sentence. */
export function whyNoFile(key: ReadKey, role: string | null): string | null {
  const r = asRole(role);
  const exporter = REPORT_EXPORTERS.includes(r);
  if (key in HOLDS) {
    const holds = HOLDS[key as keyof typeof HOLDS];
    return can(r, "export", "report") ? null
      : `A file of ${holds === "money" ? "money" : "guests' details"} is for those who download reports: ${DOWNLOADERS}. Ask one of them.`;
  }
  if (DUES_FILES.includes(key)) return exporter && can(r, "approve", "invoice") ? null : FILE_REFUSED.dues;
  if (key === "commission") return exporter && can(r, "view", "commission") ? null : FILE_REFUSED.commission;
  if (MONEY_FILES.includes(key)) return exporter && can(r, "view", "invoice") ? null : FILE_REFUSED.money;
  return exporter ? null : FILE_REFUSED.any;
}
