/* Run: node --experimental-strip-types src/modules/reports/opsIndex.check.ts
   All reports: who sees which row, the links, the search, the stars, the refusals. */
import { ROLES, flatNavigationFor, mayReach } from "../../core/menu.ts";
import {
  BUILT, GROUPS, PAGES, REPORTS_REFUSED, TOTAL, matches, notYourRole, phoneHref, reachable, refusalFor, shownGroups,
  starredRows, toggled,
} from "./opsIndex.ts";

const eq = (got: unknown, want: unknown) => {
  if (JSON.stringify(got) !== JSON.stringify(want)) throw new Error(`got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
};
const all = GROUPS.flatMap((g) => g.reports);

/* Index.tsx's four groups, in its order, with today's 37 reports (16 Nov). */
eq(GROUPS.map((g) => [g.title, g.reports.length]), [["The day", 8], ["Money owed", 11], ["Statutory", 6], ["Store and equipment", 12]]);
eq([BUILT, TOTAL], [37, 37]);
eq(new Set(all.map((x) => x.path)).size, 37);

/* Each row's rule is its menu entry's: wherever the core's port of the web's menu (4 Nov) holds
   the entry, they agree for every role (the switch unknown keeps every row, as the web's). */
const known = new Set(flatNavigationFor("owner", ":code").map((i) => i.to));
let compared = 0;
for (const x of all) {
  if (!known.has(x.path)) continue;
  compared++;
  for (const role of ROLES) eq([x.path, role, reachable(role, x)], [x.path, role, mayReach(role, x.path)]);
}
eq(compared >= 28, true);
/* The entries added since 4 Nov, by their nav.ts rules. */
const who = (path: string) => ROLES.filter((role) => reachable(role, all.find((x) => x.path === path)!));
eq(who("/reports/item-sales"), ["owner", "admin", "gm", "hotel_manager", "revenue_manager", "front_desk", "finance", "read_only"]);
eq(who("/reports/dues-by-age"), ["owner", "admin", "gm", "hotel_manager", "front_desk", "finance", "read_only"]); // not the revenue manager (D27-147)
eq(who("/reports/commission"), ["owner", "admin", "gm", "revenue_manager", "finance", "read_only"]);
eq(who("/reports/input-tax-credit"), ["owner", "admin", "gm", "finance"]);
eq(who("/reports/c-form"), ["owner", "admin", "gm", "hotel_manager", "front_desk"]);

/* The bar's three sit behind the hotel's switch: off only when it says off. */
const bar = all.find((x) => x.path === "/reports/bar-stock")!;
eq(reachable("owner", bar, { bar_stock: false }), false);
eq(reachable("owner", bar, { bar_stock: true }), true);
eq(reachable("owner", bar, {}), true);
eq(reachable("owner", all[0]!, { bar_stock: false }), true);

/* The revenue manager keeps reports but not money (D27-147): no City ledger, no Guest ledger. */
const rm = shownGroups("revenue_manager", "").flatMap((g) => g.reports.map((x) => x.title));
eq(rm.includes("City ledger") || rm.includes("Guest ledger") || rm.includes("Cashier shift"), false);
eq(rm.includes("Manager report") && rm.includes("No show") && rm.includes("Commission owed"), true);
eq(shownGroups("revenue_manager", "").map((g) => g.title), ["The day", "Money owed", "Statutory"]);

/* The search: title or description; an empty search is everything. */
eq(matches(all[0]!, "  MANAGER "), true);
eq(matches(all[0]!, "year to date"), true);
eq(matches(all[0]!, "pegs"), false);
eq(shownGroups("gm", "excise").flatMap((g) => g.reports.map((x) => x.title)), ["FLR-1A/2A/3A register", "FLR-3 register"]);
eq(shownGroups("gm", "zzz"), []);

/* Stars: the index's order, only rows this role reaches, none while searching. */
eq(toggled(["/reports/no-show"], "/reports/manager"), ["/reports/no-show", "/reports/manager"]);
eq(toggled(["/reports/no-show", "/reports/manager"], "/reports/no-show"), ["/reports/manager"]);
eq(starredRows("gm", ["/reports/no-show", "/reports/manager"], "").map((x) => x.title), ["Manager report", "No show"]);
eq(starredRows("revenue_manager", ["/reports/city-ledger", "/reports/manager"], "").map((x) => x.title), ["Manager report"]);
eq(starredRows("gm", ["/reports/manager"], "no"), []);

/* Each row opens the phone's own report, under the property. */
eq(phoneHref("/reports/manager", "5EL"), "/reports/5EL/manager");
eq(phoneHref("/reports/gst-sales", "AGR"), "/reports/AGR/gst-sales");
eq(all.every((x) => /^\/reports\/5EL\/[a-z0-9-]+$/.test(phoneHref(x.path, "5EL"))), true);

/* The pages' guards and the API's sentence (roleGate.ts refusalFor, REPORTS). */
eq(ROLES.filter((r) => PAGES.index.may(r)), ROLES.filter((r) => mayReach(r, "/reports")));
eq(ROLES.filter((r) => PAGES.itemSales.may(r)), ROLES.filter((r) => mayReach(r, "/reports/manager")));
eq(REPORTS_REFUSED, "Reading reports is for the owner, an administrator, the general manager, the hotel manager, the revenue manager, reception, the accountant or a viewer. Ask one of them.");
eq(refusalFor("Reading x", (r) => r === "owner"), "Reading x is for the owner. Ask one of them.");
eq(notYourRole("chef", "All reports"), "You are signed in as Chef, which does not include All reports. If you need it, the person who set up your account can change your role.");

console.log("reports opsIndex: all checks pass");
