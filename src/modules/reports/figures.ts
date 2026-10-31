import type { PeriodStatistics, Room, Stay } from "../../core/types";
import { dateShort } from "../../core/format.ts";

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

/** One room on the business date, as the Rooms board's own view states it
    (src/modules/front-desk/data/stayview.ts): its numbers feed the work tiles,
    its rooms the strip, so the two can never disagree. In order of number. */
export function houseRooms(date: string, stays: Stay[], rooms: Room[], house: HouseNow | null) {
  const now = new Map((house?.rooms ?? []).map((r) => [r.number, r]));
  return rooms.map((room) => {
    const live = stays.filter((s) => s.roomNumber === room.number && s.status !== "cancelled");
    return {
      number: room.number,
      outOfService: now.get(room.number)?.outOfOrder ?? false,
      occupied: now.get(room.number)?.inHouse ?? false,
      arriving: live.some((s) => s.status === "due-in" && s.arrival === date),
      dueOut: live.some((s) => s.status === "due-out" || (s.status === "in-house" && s.departure === date)),
      dirty: room.status === "dirty",
    };
  }).sort((a, b) => Number(a.number) - Number(b.number) || a.number.localeCompare(b.number));
}
export type HouseRoom = ReturnType<typeof houseRooms>[number];

/** The strip's five states, in the Dashboard's order of asking (stateOf). */
export type StripState = "in" | "due" | "arr" | "free" | "oos";
export function stripState(r: HouseRoom): StripState {
  if (r.outOfService) return "oos";
  if (r.occupied) return r.dueOut ? "due" : "in";
  return r.arriving ? "arr" : "free";
}

/** TODAY'S WORK, as the Dashboard's four tiles count it (D27-243): the
    board's stays for the day, the rooms' housekeeping state, and the
    server's house-now (who is in, what is blocked). */
export function todaysWork(date: string, stays: Stay[], rooms: Room[], house: HouseNow | null) {
  const all = houseRooms(date, stays, rooms, house);
  const sellable = all.filter((r) => !r.outOfService);
  /* Void with cancelled (the owner's D27-326 (1)): the API says "void", which StayStatus does not name. */
  const arriving = stays.filter((s) => s.arrival === date && s.status !== "cancelled" && (s.status as string) !== "void" && s.status !== "no-show");
  const leaving = stays.filter((s) => s.departure === date
    && (s.status === "in-house" || s.status === "due-out" || s.status === "checked-out"));
  const empty = sellable.filter((r) => !r.occupied);
  return {
    arriving: arriving.length,
    toArrive: arriving.filter((s) => s.status === "due-in").length,
    leaving: leaving.length,
    toLeave: leaving.filter((s) => s.status !== "checked-out").length,
    /* Every room with a guest in it, blocked or not (D21-36). */
    inHouse: all.filter((r) => r.occupied).length,
    dueOut: sellable.filter((r) => r.dueOut).length,
    dirty: sellable.filter((r) => r.dirty).length,
    empty: empty.length,
    ready: empty.filter((r) => !r.dirty).length,
    blocked: all.length - sellable.length,
  };
}

/* ── The charts (D27-365): Dashboard.tsx's rules, no figure invented ── */

/** src/data/repositories/types.ts DayStatistics. */
export interface DayStatistics { date: string; availableRooms: number; roomsSold: number; occupancyPct: number }

/** The days "Last 14 days" covers, today included. */
export const LAST_DAYS = 14;
export const addDays = (date: string, n: number) =>
  new Date(Date.parse(`${date}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
const WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const weekdayOf = (date: string) => WEEK[new Date(`${date}T00:00:00Z`).getUTCDay()]!;
/** "1 Oct 2026": the web's dateShort (core/format's is its dateCompact). */
export const dateYear = (date: string) => `${dateShort(date)} ${date.slice(0, 4)}`;
/** "October 2026" (the web's monthOf). */
export const monthName = (date: string) => `${MONTHS[Number(date.slice(5, 7)) - 1]} ${date.slice(0, 4)}`;
const MONTHS = ["January", "February", "March", "April", "May", "June", "July",
  "August", "September", "October", "November", "December"];

/** One day of the Monthly statistics report. A figure the report cannot work
    out for that day is null: a gap, never a zero. */
export interface MonthDay {
  date: string;
  available: number | null;
  /** Percent, 0 to 100. */
  occupancy: number | null;
  adr: number | null;
  revpar: number | null;
  room: number | null;
}
export type LineKey = "adr" | "revpar" | "room";

/** The days of a Monthly statistics report. The report prints 0 for a rate
    over no rooms; these are gaps: no room sold has no average rate, and no
    room to sell has no RevPAR. */
export function monthDays(doc: ReportDoc | null | undefined, month: string): MonthDay[] {
  const num = (v: unknown) => (typeof v === "number" ? v : null);
  return (doc?.sections.find((s) => s.key === "days")?.rows ?? [])
    .filter((r) => r.kind === "row")
    .map((r) => {
      const x = r.cells;
      const available = num(x["available"]);
      const occupancy = num(x["occupancy"]);
      return {
        /* The row's label is "7 Mon": the day, then its weekday. */
        date: `${month}-${String(parseInt(String(x["label"]), 10)).padStart(2, "0")}`,
        available,
        occupancy,
        adr: occupancy ? num(x["adr"]) : null,
        revpar: available ? num(x["revpar"]) : null,
        room: num(x["room"]),
      };
    });
}

/** The n days ending on `date`, in order. A day the reads do not hold is a gap. */
export function lastDays(days: MonthDay[], date: string, n = LAST_DAYS): MonthDay[] {
  const byDate = new Map(days.map((d) => [d.date, d]));
  return Array.from({ length: n }, (_, i) => {
    const d = addDays(date, i - (n - 1));
    return byDate.get(d) ?? { date: d, available: null, occupancy: null, adr: null, revpar: null, room: null };
  });
}

/** The Manager report's Revenue Summary (without tax): each part of the
    month's revenue and the total. */
export function revenueSplit(doc: ReportDoc | null | undefined) {
  const num = (v: unknown) => (typeof v === "number" ? v : null);
  const words: Record<string, string> = { "Room Revenue": "Room revenue", "Extra Revenue": "Extra revenue" };
  const parts = (doc?.sections.find((s) => s.key === "revenue-summary")?.rows ?? [])
    .filter((r) => r.kind === "row")
    .map((r) => {
      const label = String(r.cells["label"]);
      return { name: words[label] ?? label, value: num(r.cells["ptd"]) };
    });
  return { parts, total: pick(doc, "revenue-summary", "Total Revenue") };
}

/** The small line in a w × h box, the web's proportions: a day with no figure
    breaks it, and a day on its own is a dot. Empty path: nothing to draw. */
export function sparkLine(values: Array<number | null>, w: number, h: number) {
  const max = Math.max(...values.map((v) => v ?? 0)) || 1;
  const x = (i: number) => (i * w) / (values.length - 1);
  const y = (v: number) => ((88 - 76 * (v / max)) * h) / 100;
  let path = "";
  let pen = false;
  values.forEach((v, i) => {
    if (v == null) { pen = false; return; }
    const at = `${x(i).toFixed(1)},${y(v).toFixed(1)}`;
    path += pen ? `L${at}` : `M${at}L${at}`;
    pen = true;
  });
  return { path, x, y };
}

/** Each night of the chart, as OccupancyByDay reads it. */
export function nightsOf(days: MonthDay[], date: string) {
  return days.map((d, i) => {
    const wd = weekdayOf(d.date);
    return {
      day: String(Number(d.date.slice(8, 10))), date: d.date, wd,
      occ: d.occupancy, avail: d.available,
      /* Rooms sold as the hotel's switches count them, worked back from the
         share (a day use may be half a room), so the two always agree. */
      rooms: d.occupancy == null || d.available == null ? null : Math.round((d.occupancy / 100) * d.available * 2) / 2,
      ahead: d.date > date, today: d.date === date, weekend: wd === "Sat" || wd === "Sun",
      last: i === days.length - 1,
    };
  });
}
export type Night = ReturnType<typeof nightsOf>[number];

/** Which day numbers the axis writes: all when there is room, else 1, 5, 10 …
    away from today's, which is always written. */
export function dayWritten(n: Night, index: number, todayAt: number, every: boolean) {
  const num = Number(n.day);
  return n.today || every || ((num === 1 || num % 5 === 0) && (todayAt < 0 || Math.abs(index - todayAt) > 2));
}

/** Tonight and the 13 nights after it. A night the statistics do not hold is
    a dash, never 0%; the share as the Calendar's footer rounds it. */
export function nightsAhead(from: string, days: DayStatistics[] | null | undefined) {
  const byDate = new Map((days ?? []).map((d) => [d.date, d]));
  return Array.from({ length: 14 }, (_, i) => {
    const date = addDays(from, i);
    const d = byDate.get(date);
    const wd = weekdayOf(date);
    return {
      date, wd, day: Number(date.slice(8, 10)), tonight: i === 0, weekend: wd === "Sat" || wd === "Sun",
      share: d && d.availableRooms > 0 ? Math.round(d.occupancyPct) : null,
      rooms: d ? `${d.roomsSold}/${d.availableRooms}` : null,
      sold: d ? `${d.roomsSold} of ${d.availableRooms} rooms sold` : "no figures",
    };
  });
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
