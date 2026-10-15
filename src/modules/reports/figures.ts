import type { PeriodStatistics, Room, Stay } from "../../core/types";

/* ══════════════════════════════════════════════════════════════════
   THE OWNER'S FIGURES — the web's own rules, ported, so the phone and
   the web (and the Manager Report an owner prints) cannot disagree:
   Dashboard: src/modules/reports/pages/Dashboard.tsx; All properties:
   .../AllProperties.tsx; the room states: src/modules/front-desk/data/
   stayview.ts. A figure not held is a dash, never a zero.
   ══════════════════════════════════════════════════════════════════ */

export type { PeriodStatistics };

/* The web's shapes, the fields read here. The full ones live in files that
   import the web's own client, so they are copied, named the same. */

/** src/modules/reports/data/document.ts ReportDoc. */
export interface ReportDoc {
  sections: Array<{ key: string; rows: Array<{ kind: "row" | "total" | "band"; cells: Record<string, unknown> }> }>;
}
/** src/data/repositories/notifications.ts Notification. */
export interface Notification { id: string; title: string; body: string; actionRequired: boolean }
/** src/modules/front-desk/data/stays.ts HouseNow. */
export interface HouseNow {
  rooms: Array<{ number: string; inHouse: boolean; outOfOrder: boolean; empty: boolean }>;
}
/** src/modules/reports/data/dueOut.ts DueOut. */
export interface DueOut { leaving: number; owing: number; owed: number }

export type Figure = { today: number | null; ptd: number | null; ytd: number | null };

/** A row of the Manager report, by section and printed label. */
export function pick(doc: ReportDoc | null | undefined, section: string, label: string): Figure | undefined {
  const r = doc?.sections.find((s) => s.key === section)?.rows.find((x) => x.cells["label"] === label);
  if (!r) return undefined;
  const num = (v: unknown) => (typeof v === "number" ? v : null);
  return { today: num(r.cells["today"]), ptd: num(r.cells["ptd"]), ytd: num(r.cells["ytd"]) };
}

/** Today's takings by way of paying, the ones not zero. */
export function methodsToday(doc: ReportDoc | null | undefined) {
  return (doc?.sections.find((x) => x.key === "payment")?.rows ?? [])
    .filter((p) => p.kind === "row" && typeof p.cells["today"] === "number" && p.cells["today"] !== 0)
    .map((p) => ({ label: String(p.cells["label"]), today: p.cells["today"] as number }));
}

/** TODAY'S WORK, as the Dashboard's four tiles count it (D27-243): the
    board's stays for the day, the rooms' housekeeping state, and the
    server's house-now (who is in, what is blocked). */
export function todaysWork(date: string, stays: Stay[], rooms: Room[], house: HouseNow | null) {
  const now = new Map((house?.rooms ?? []).map((r) => [r.number, r]));
  const occupied = (n: string) => now.get(n)?.inHouse ?? false;
  const sellable = rooms.filter((r) => !(now.get(r.number)?.outOfOrder ?? false));
  const arriving = stays.filter((s) => s.arrival === date && s.status !== "cancelled" && s.status !== "no-show");
  const leaving = stays.filter((s) => s.departure === date
    && (s.status === "in-house" || s.status === "due-out" || s.status === "checked-out"));
  const empty = sellable.filter((r) => !occupied(r.number));
  return {
    arriving: arriving.length,
    toArrive: arriving.filter((s) => s.status === "due-in").length,
    leaving: leaving.length,
    toLeave: leaving.filter((s) => s.status !== "checked-out").length,
    /* Every room with a guest in it, blocked or not (D21-36). */
    inHouse: rooms.filter((r) => occupied(r.number)).length,
    dueOut: sellable.filter((r) => stays.some((s) => s.roomNumber === r.number && s.status !== "cancelled"
      && (s.status === "due-out" || (s.status === "in-house" && s.departure === date)))).length,
    dirty: sellable.filter((r) => r.status === "dirty").length,
    empty: empty.length,
    ready: empty.filter((r) => r.status !== "dirty").length,
  };
}

/** Several properties added up: rates from the totals, never averaged from
    each property's rates. Null when any of them did not come back. */
export function addUp(list: Array<PeriodStatistics | null>) {
  if (list.length === 0 || list.some((s) => s == null)) return null;
  const all = list as PeriodStatistics[];
  const available = all.reduce((n, s) => n + s.availableRoomNights, 0);
  const sold = all.reduce((n, s) => n + s.roomsSold, 0);
  const revenue = all.reduce((n, s) => n + s.roomRevenue, 0);
  return {
    occupancy: available ? Math.round((sold / available) * 10000) / 100 : null,
    arr: sold ? revenue / sold : null,
    revpar: available ? revenue / available : null,
    revenue,
  };
}

/** Room revenue against the same month last year, in whole percent. */
export const change = (now: number | null | undefined, then: number | null | undefined) =>
  now == null || !then ? null : Math.round(((now - then) / then) * 100);
