import { can, type Role } from "../../core/menu.ts";

/* ══════════════════════════════════════════════════════════════════
   WHO MAY TAKE ONE OF THE SALES LANE'S LISTS OFF THE PHONE (mobile/m13-
   sales, 19 Nov) — ported from api/src/modules/reports/listExports.ts
   (exportRefusal, LIST_SCREENS, DOWNLOADERS), the rule behind the web's
   ExportButtons on Leads, Marketing, Contracts, Guest feedback and
   Possible same person.

   Each of these five holds money or guests' details (LIST_SCREENS:
   "same-person", "feedback", "leads" hold guests; "marketing-campaigns",
   "marketing-sources", "contracts" hold money), so a file of it needs the
   reports' download right, `export` on `report`, besides opening the
   screen. On the phone the file is the print sheet or the share sheet
   (src/core/Export.tsx): it leaves the phone, so the same rule.
   ══════════════════════════════════════════════════════════════════ */

const DOWNLOADERS = "the owner, an administrator, the general manager, the hotel manager, "
  + "the revenue manager or the accountant";

/** listExports.ts exportRefusal for a screen that `holds` money or guests' details: null when this role may. */
export function exportRefusal(role: string | null, holds: "money" | "guests"): string | null {
  if (role != null && can(role as Role, "export", "report")) return null;
  return `A file of ${holds === "money" ? "money" : "guests' details"} is for those who `
    + `download reports: ${DOWNLOADERS}. Ask one of them.`;
}
