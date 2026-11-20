/* ══════════════════════════════════════════════════════════════════
   GROUP REPORTS — several properties in one report (D27-383 item 6; the
   16 Nov release), mobile/m13-rep-ops (19 Nov)

   The web: src/modules/reports/pages/GroupReports.tsx (`/group-reports`),
   data/document.ts GROUP_REPORTS / groupQuery / getGroupReport,
   groupHotels.ts hotelsWhere, nav.ts's entry (canSee: `report` view and more
   than one such property). The API: api/src/modules/reports/group.ts
   (GET /api/group/reports/:key?hotels=…): it asks every property named the
   one-property report's own rule, with the person's role THERE, and builds
   every line and every total itself - nothing is added up on the phone.

   Pure: opsGroup.check.ts runs it under node.
   ══════════════════════════════════════════════════════════════════ */

import type { Hotel, HotelsResponse } from "../../core/api.ts";
import { asRole, can, type Role } from "../../core/menu.ts";
import { dayWords, monthFrom, monthWords, type ReportQuery } from "./opsDoc.ts";

/** document.ts GROUP_REPORTS, in the order the screen offers them, and what each asks. */
export const GROUP_REPORTS = [
  { key: "manager", title: "Manager report", asks: "date", money: false },
  { key: "monthly-statistics", title: "Monthly statistics", asks: "month", money: false },
  { key: "room-revenue", title: "Room revenue and occupancy", asks: "range", money: false },
  { key: "dues-by-age", title: "Money owed by age", asks: "date", money: true },
  { key: "restaurant-sales", title: "Restaurant sales", asks: "date", money: false },
] as const;
export type GroupReport = (typeof GROUP_REPORTS)[number];
export type GroupReportKey = GroupReport["key"];

/** GroupReports.tsx: the one-property reports' own rules - money owed is `invoice` (D27-147). */
export const readsReports = (role: Role) => can(role, "view", "report");
export const readsMoney = (role: Role) => can(role, "view", "invoice");

/** The person's role at one property, as the web's roleFor (a group administrator is the owner). */
const roleThere = (who: HotelsResponse, h: Hotel): Role | null => {
  if (who.scope.isGroupAdmin) return "owner";
  const g = who.scope.hotels.find((x) => x.hotelId === h.id);
  return g ? asRole(g.role) : null;
};

/** groupHotels.ts hotelsWhere: the real hotels where the person works with a role that `may`.
    A group administrator everywhere; anybody else only where rostered; test hotels never. */
export const hotelsWhere = (who: HotelsResponse, may: (role: Role) => boolean): Hotel[] =>
  who.hotels.filter((h) => {
    if (h.testOf) return false;
    const role = roleThere(who, h);
    return role !== null && may(role);
  });

/** nav.ts's Group reports entry: `report` view at the property in view, and more than one property to add up. */
export const mayOpenGroup = (who: HotelsResponse, role: string | null) =>
  readsReports(asRole(role)) && hotelsWhere(who, readsReports).length > 1;

/** No property past its own day: the earliest business date of those chosen ("" for none). */
export const earliestOf = (hotels: readonly Hotel[]) => hotels.map((h) => h.businessDate).sort()[0] ?? "";

/** The question, as GroupReports.tsx builds it from what was chosen ("" = not chosen). */
export function groupAsk(report: GroupReport, day: string, month: string, from: string): ReportQuery {
  return report.asks === "month" ? { month: month || day.slice(0, 7) }
    : report.asks === "range" ? { from: from || monthFrom(day), asOn: day }
    : { asOn: day };
}

/** The heading's period, as GroupReports.tsx words it. */
export function groupPeriod(report: GroupReport, q: ReportQuery, day: string): string {
  return report.asks === "month" ? (q.month ? monthWords(q.month) : "Choose the month")
    : report.asks === "range" ? `${dayWords(q.from!)} to ${dayWords(day)}`
    : `As on ${dayWords(day)}`;
}

/** document.ts groupQuery: the properties by code, and the dates. */
export function groupQuery(codes: readonly string[], q: ReportQuery): string {
  const parts = [`hotels=${codes.map(encodeURIComponent).join(",")}`];
  if (q.asOn) parts.push(`asOn=${q.asOn}`);
  if (q.month) parts.push(`month=${q.month}`);
  if (q.from) parts.push(`from=${q.from}`);
  return parts.join("&");
}
