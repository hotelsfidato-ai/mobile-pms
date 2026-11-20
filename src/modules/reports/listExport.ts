/* ══════════════════════════════════════════════════════════════════
   WHO MAY TAKE A LIST AWAY AS A FILE — ported by hand from the PMS's
   api/src/modules/reports/listExports.ts (LIST_SCREENS, exportRefusal,
   forWhom; the website's button reads the same file, so its disabled
   reason and the server's refusal are one sentence). The phone's export
   (src/core/Export.tsx) is made on the phone from what the screen shows,
   so no server asks this: the phone asks it itself, never wider than
   the web (BRIEF-T3). Trimmed to the list screens the phone has.
   Pure: no React Native, so listExport.check.ts runs it under node.
   ══════════════════════════════════════════════════════════════════ */

import { ROLES, can, type Resource, type Role } from "../../core/menu.ts";

export interface ListScreen {
  /** The screen's own heading: the file's title. */
  readonly title: string;
  /** Money, or guests' details: also the reports' download right. */
  readonly holds?: "money" | "guests";
  /** A screen with an export right of its own asks it instead of the reports'. */
  readonly right?: { readonly action: "export"; readonly resource: Resource };
}

/* listExports.ts LIST_SCREENS (16 Nov), the entries the phone draws. */
export const LIST_SCREENS = {
  "arrivals": { title: "Arrivals", holds: "guests" },
  "in-house": { title: "In house", holds: "money" },
  "walk-ins": { title: "Walk-ins", holds: "guests" },
  "all-bookings": { title: "All bookings", holds: "guests" },
  "guests": { title: "Guests", holds: "guests" },
  "companies": { title: "Companies and agents", holds: "money" },
  "housekeeping": { title: "Housekeeping" },
  "work-orders": { title: "Work orders" },
  "requests": { title: "Guest requests" },
  "wake-up-calls": { title: "Wake-up calls" },
  "lost-property": { title: "Lost property" },
  "guest-messages": { title: "Guest messages", holds: "guests" },
  "reviews": { title: "Reviews", holds: "guests" },
  "loyalty": { title: "Loyalty", holds: "guests" },
  "online-checkin": { title: "Online check-in", holds: "guests" },
  "crs-bookings": { title: "CRS bookings", holds: "money" },
  "store": { title: "Store", right: { action: "export", resource: "stock" } },
  "purchasing": { title: "Purchasing", right: { action: "export", resource: "purchasing" } },
  "laundry-dockets": { title: "Laundry dockets", right: { action: "export", resource: "laundry" } },
  "spa-diary": { title: "Spa diary", right: { action: "export", resource: "spa" } },
  "banquet": { title: "Banquet diary" },
  "night-audit-runs": { title: "Night audit closed days", holds: "money" },
  "rates": { title: "Rates" },
  "revenue-outlook": { title: "Revenue outlook", holds: "money" },
} as const satisfies Record<string, ListScreen>;

export type ListScreenKey = keyof typeof LIST_SCREENS;

/** Who may download reports, in words: the roles holding `export` on `report`. */
const DOWNLOADERS = "the owner, an administrator, the general manager, the hotel manager, "
  + "the revenue manager or the accountant";

/* Each role as a refusal names it (listExports.ts NAMED). */
const NAMED: Readonly<Record<Role, string>> = {
  owner: "the owner", admin: "an administrator", gm: "the general manager",
  hotel_manager: "the hotel manager", revenue_manager: "the revenue manager", front_desk: "reception",
  housekeeping: "housekeeping", kitchen_manager: "the kitchen manager", chef: "a chef", pos: "a waiter",
  bar: "a bar person", stores: "the Inventory Manager", finance: "the accountant", read_only: "a viewer",
  automation: "an automation account",
};

/** "is for X. Ask one of them." - these roles in words, in the matrix's order. */
export function forWhom(roles: readonly string[]): string {
  const names = ROLES.filter((r) => r !== "automation" && roles.includes(r)).map((r) => NAMED[r]);
  const who = names.length <= 1 ? names.join("") : `${names.slice(0, -1).join(", ")} or ${names[names.length - 1]}`;
  return `is for ${who}. Ask ${names.length === 1 ? "them" : "one of them"}.`;
}

/** Why this role may not export this screen, or null when it may (listExports.ts exportRefusal). */
export function exportRefusal(role: Role, screen: ListScreen): string | null {
  if (screen.right) {
    const { action, resource } = screen.right;
    return can(role, action, resource) ? null
      : `Exporting the ${screen.title.toLowerCase()} ${forWhom(ROLES.filter((r) => can(r, action, resource)))}`;
  }
  if (!screen.holds || can(role, "export", "report")) return null;
  return `A file of ${screen.holds === "money" ? "money" : "guests' details"} is for those who `
    + `download reports: ${DOWNLOADERS}. Ask one of them.`;
}

/** A guest's ID number as a file carries it: its last four characters, the rest X (listExports.ts maskId). */
export function maskId(value: string): string {
  const v = value.replace(/\s+/g, "");
  return v.length <= 4 ? "X".repeat(v.length) : `${"X".repeat(v.length - 4)}${v.slice(-4)}`;
}
