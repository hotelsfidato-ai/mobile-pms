/* Run: node --experimental-strip-types src/modules/reports/opsGroup.check.ts
   Group reports: which properties are offered, the question, its words. */
import type { HotelsResponse } from "../../core/api.ts";
import {
  GROUP_REPORTS, earliestOf, groupAsk, groupPeriod, groupQuery, hotelsWhere, mayOpenGroup, readsMoney, readsReports,
} from "./opsGroup.ts";

const eq = (got: unknown, want: unknown) => {
  if (JSON.stringify(got) !== JSON.stringify(want)) throw new Error(`got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
};
const hotel = (id: string, code: string, businessDate: string, testOf: string | null = null) =>
  ({ id, code, name: code, businessDate, testOf });
const hotels = [hotel("1", "5EL", "2026-11-18"), hotel("2", "AGR", "2026-11-16"), hotel("3", "SHI", "2026-11-19"), hotel("4", "5ELT", "2026-11-10", "5EL")];
const scope = (isGroupAdmin: boolean, roster: Array<[string, string]>) =>
  ({ staffId: "s", email: "e", fullName: "Test", isGroupAdmin, hotels: roster.map(([hotelId, role]) => ({ hotelId, role })) });
const owner: HotelsResponse = { scope: scope(true, []), hotels };
/* A manager rostered at two: GM at one, revenue manager at another, reception at the test hotel. */
const manager: HotelsResponse = { scope: scope(false, [["1", "gm"], ["2", "revenue_manager"], ["4", "front_desk"]]), hotels };

/* A group administrator everywhere, test hotels never (D27-296 (11)). */
eq(hotelsWhere(owner, readsReports).map((h) => h.code), ["5EL", "AGR", "SHI"]);
/* Anybody else only where rostered, with that hotel's role: money owed is `invoice` - not the revenue manager. */
eq(hotelsWhere(manager, readsReports).map((h) => h.code), ["5EL", "AGR"]);
eq(hotelsWhere(manager, readsMoney).map((h) => h.code), ["5EL"]);
/* The menu offers the page only with more than one property to add up. */
eq(mayOpenGroup(manager, "gm"), true);
eq(mayOpenGroup({ ...manager, scope: scope(false, [["1", "gm"], ["2", "housekeeping"]]) }, "gm"), false);
eq(mayOpenGroup(owner, "owner"), true);
eq(mayOpenGroup(manager, "housekeeping"), false);

/* No property past its own day: the earliest business date of those chosen. */
eq(earliestOf(hotelsWhere(owner, readsReports)), "2026-11-16");
eq(earliestOf([]), "");

/* The question each report asks, and its words (GroupReports.tsx). */
const [manager_, monthly, range] = GROUP_REPORTS;
eq(GROUP_REPORTS.map((r) => r.title), ["Manager report", "Monthly statistics", "Room revenue and occupancy", "Money owed by age", "Restaurant sales"]);
eq(groupAsk(manager_, "2026-11-16", "", ""), { asOn: "2026-11-16" });
eq(groupAsk(monthly, "2026-11-16", "", ""), { month: "2026-11" });
eq(groupAsk(monthly, "2026-11-16", "2026-09", ""), { month: "2026-09" });
eq(groupAsk(range, "2026-11-16", "", ""), { from: "2026-11-01", asOn: "2026-11-16" });
eq(groupAsk(range, "2026-11-16", "", "2026-11-05"), { from: "2026-11-05", asOn: "2026-11-16" });
eq(groupPeriod(manager_, { asOn: "2026-11-16" }, "2026-11-16"), "As on 16 Nov 2026");
eq(groupPeriod(monthly, { month: "2026-09" }, "2026-11-16"), "September 2026");
eq(groupPeriod(range, { from: "2026-11-01", asOn: "2026-11-16" }, "2026-11-16"), "1 Nov 2026 to 16 Nov 2026");
eq(groupQuery(["5EL", "AGR"], { from: "2026-11-01", asOn: "2026-11-16" }), "hotels=5EL,AGR&asOn=2026-11-16&from=2026-11-01");
eq(groupQuery(["5EL"], { month: "2026-11" }), "hotels=5EL&month=2026-11");

console.log("reports opsGroup: all checks pass");
