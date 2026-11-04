import type { Room, Stay } from "../../core/types.ts";
import { blockedFor } from "../front-desk/desk.ts";

/* ══════════════════════════════════════════════════════════════════
   THE CALENDAR'S CHART — the web's tape chart data, ported by hand:
     src/modules/front-desk/data/stayview.ts   getStayView (toneFor,
                                               occupiedDates, the bars,
                                               perDate, footer, counts)
     src/modules/front-desk/pages/StayView.tsx PILLS, PILL_LABEL, BAR_LABEL,
                                               the floor grouping,
                                               roomVisible, the rate's "4.1k"
   Fourteen nights from `start`, read once; everything below is the web's
   own arithmetic on what the server sent (counts, availability and the
   occupancy percent are the web's, worked out in the browser too). No
   money is added here: the one price is the server's night price, printed
   as the web prints it. The balances the web's tooltip shows are not read
   (a phone has no hover; the stay's own screen shows its bill).
   Pure: no React Native here, so `chart.check.ts` runs under node.
   ══════════════════════════════════════════════════════════════════ */

export type BarTone = "in-house" | "confirmed" | "departed" | "due-out" | "no-show" | "void" | "waiting";

/** The key's order and words (StayView.tsx BAR_LABEL and its legend). */
export const LEGEND: BarTone[] = ["in-house", "due-out", "confirmed", "waiting", "departed", "no-show", "void"];
export const BAR_LABEL: Record<BarTone, string> = {
  "in-house": "In house",
  confirmed: "Confirmed",
  departed: "Checked out",
  "due-out": "Due out",
  "no-show": "No show",
  void: "Cancelled or void",
  waiting: "Waiting for the hotel",
};

export interface ChartBar {
  stay: Stay;
  startIndex: number;
  span: number;
  tone: BarTone;
  clippedStart: boolean;
  clippedEnd: boolean;
}

export interface ChartRoom {
  number: string;
  type: string;
  floor: number;
  housekeeping: string;
  outOfService: boolean;
  bars: ChartBar[];
  state: { occupied: boolean; arriving: boolean; reserved: boolean; dueOut: boolean; dirty: boolean };
}

export interface ChartGroup {
  type: string;
  rooms: ChartRoom[];
  perDate: Array<{ date: string; available: number; rate: number | null }>;
}

export interface Chart {
  dates: string[];
  roomTypes: ChartGroup[];
  footer: Array<{ date: string; availableInventory: number; occupancyPct: number }>;
  counts: Record<Pill, number>;
}

export interface HouseRoom { number: string; inHouse: boolean; outOfOrder: boolean }
export interface NightPrice { type: string; date: string; price: number | null }

export const addDays = (iso: string, n: number) => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
export const windowFrom = (start: string, length = 14) => Array.from({ length }, (_, i) => addDays(start, i));
/** The hotel's own weekend (D27-243 3.4), Saturday and Sunday until it says. Shading only. */
export const isWeekend = (iso: string, days: readonly number[] = [0, 6]) => days.includes(new Date(`${iso}T00:00:00Z`).getUTCDay());

/** A cancelled or voided booking (stays.ts isCancelledOrVoid): the API says "void", which StayStatus does not name. */
const gone = (s: { status: string }) => s.status === "cancelled" || s.status === "void";

/** Tone follows STATUS, not dates (stayview.ts toneFor). */
export function toneFor(stay: Stay, businessDate: string): BarTone {
  const status: string = stay.status;
  if (gone(stay)) return "void";
  if (status === "no-show") return "no-show";
  if (status === "in-house") return stay.departure === businessDate ? "due-out" : "in-house";
  if (status === "due-out") return "due-out";
  if (status === "checked-out") return "departed";
  if (status === "tentative") return "waiting";
  return "confirmed";
}

/** A day use occupies its one date; a stay its nights. */
const occupiedDates = (s: Stay) => (s.isDayUse ? { from: s.arrival, to: s.arrival } : { from: s.arrival, to: addDays(s.departure, -1) });

/** The nights the Manager report counts sold (D27-151). */
const SOLD = new Set(["due-in", "in-house", "due-out", "checked-out"]);

const covers = (bars: ChartBar[], i: number) => bars.some((b) => b.tone !== "void" && b.startIndex <= i && b.startIndex + b.span - 1 >= i);

/** getStayView, after its one read. Null is an answer: a hotel with no rooms. */
export function buildChart(input: {
  rooms: Room[]; stays: Stay[]; house: HouseRoom[]; prices: NightPrice[] | null; start: string; businessDate: string; length?: number;
}): Chart | null {
  const { rooms: allRooms, stays: allStays, businessDate } = input;
  if (allRooms.length === 0) return null;
  const dates = windowFrom(input.start, input.length ?? 14);
  const first = dates[0]!;
  const last = dates[dates.length - 1]!;
  const now = new Map(input.house.map((r) => [r.number, r]));
  /* INCLUSIVE on both ends, as app.sellable_rooms. */
  const sellableOn = (room: Room, date: string) => !room.blocks.some((b) => date >= b.from && (b.to === null || date <= b.to));

  const rooms: ChartRoom[] = allRooms.map((room) => {
    const bars = allStays
      .filter((s) => s.roomNumber === room.number)
      .map((s): ChartBar | null => {
        const { from, to } = occupiedDates(s);
        if (to < first || from > last) return null;
        const rawStart = dates.indexOf(from);
        const rawEnd = dates.indexOf(to);
        const startIndex = rawStart === -1 ? 0 : rawStart;
        const endIndex = rawEnd === -1 ? dates.length - 1 : rawEnd;
        return { stay: s, startIndex, span: Math.max(1, endIndex - startIndex + 1), tone: toneFor(s, businessDate), clippedStart: from < first, clippedEnd: to > last };
      })
      .filter((b): b is ChartBar => b !== null)
      .sort((a, b) => a.startIndex - b.startIndex);
    const live = allStays.filter((s) => s.roomNumber === room.number && s.status !== "cancelled");
    return {
      number: room.number, type: room.type, floor: room.floor, housekeeping: room.status,
      /* The dated block decides (INV-6): the server's house-now. */
      outOfService: now.get(room.number)?.outOfOrder ?? false,
      bars,
      state: {
        occupied: now.get(room.number)?.inHouse ?? false,
        arriving: live.some((s) => s.status === "due-in" && s.arrival === businessDate),
        reserved: live.some((s) => s.status === "due-in" && s.arrival > businessDate),
        dueOut: live.some((s) => s.status === "due-out" || (s.status === "in-house" && s.departure === businessDate)),
        dirty: room.status === "dirty",
      },
    };
  });

  const types = [...new Set(allRooms.map((r) => r.type))];
  const priceOn = new Map((input.prices ?? []).map((p) => [`${p.type}/${p.date}`, p.price]));
  const sellableRooms = (list: ChartRoom[], date: string) =>
    list.filter((r) => sellableOn(allRooms.find((x) => x.number === r.number)!, date));
  const roomTypes: ChartGroup[] = types.map((type) => {
    const ofType = rooms.filter((r) => r.type === type);
    return {
      type, rooms: ofType,
      perDate: dates.map((date, i) => {
        const sellable = sellableRooms(ofType, date);
        return { date, available: sellable.length - sellable.filter((r) => covers(r.bars, i)).length, rate: priceOn.get(`${type}/${date}`) ?? null };
      }),
    };
  });

  const footer = dates.map((date, i) => {
    const sellable = sellableRooms(rooms, date);
    const sold = allStays.filter((s) => SOLD.has(s.status) && !s.isDayUse && s.arrival <= date && date < s.departure).length;
    return {
      date,
      availableInventory: sellable.length - sellable.filter((r) => covers(r.bars, i)).length,
      occupancyPct: sellable.length ? Math.round((sold / sellable.length) * 1000) / 10 : 0,
    };
  });

  const sellable = rooms.filter((r) => !r.outOfService);
  const counts: Record<Pill, number> = {
    All: sellable.length,
    Vacant: sellable.filter((r) => !r.state.occupied).length,
    Occupied: rooms.filter((r) => r.state.occupied).length,
    Arrivals: sellable.filter((r) => r.state.arriving).length,
    Reserved: sellable.filter((r) => r.state.reserved).length,
    Blocked: rooms.filter((r) => r.outOfService).length,
    "Due Out": sellable.filter((r) => r.state.dueOut).length,
    Dirty: sellable.filter((r) => r.state.dirty).length,
  };
  return { dates, roomTypes, footer, counts };
}

/* ── The page's own rules (StayView.tsx) ───────────────────────────── */

export const PILLS = ["All", "Vacant", "Occupied", "Arrivals", "Reserved", "Blocked", "Due Out", "Dirty"] as const;
export type Pill = (typeof PILLS)[number];
/** One vocabulary: "Empty" is not "Free" (StayView.tsx PILL_LABEL). */
export const PILL_LABEL: Record<Pill, string> = {
  All: "Sellable", Vacant: "Empty", Occupied: "In house", Arrivals: "Arriving",
  Reserved: "Reserved", Blocked: "Out of service", "Due Out": "Due out", Dirty: "Needs cleaning",
};

/** Which rooms a tile leaves on screen: the same state its count reads. */
export function roomVisible(room: ChartRoom, pill: Pill): boolean {
  if (pill === "Blocked") return room.outOfService;
  if (pill === "Occupied") return room.state.occupied;
  if (room.outOfService) return false;
  switch (pill) {
    case "Vacant": return !room.state.occupied;
    case "Arrivals": return room.state.arriving;
    case "Reserved": return room.state.reserved;
    case "Due Out": return room.state.dueOut;
    case "Dirty": return room.state.dirty;
    default: return true;
  }
}

export type GroupBy = "type" | "floor";

/** By floor: the availability summed from the floor's own rooms, and no
    rate (a floor has no one price; printing one type's would be a guess). */
export function groupsOf(chart: Chart, by: GroupBy): ChartGroup[] {
  if (by === "type") return chart.roomTypes;
  const all = chart.roomTypes.flatMap((g) => g.rooms);
  return [...new Set(all.map((r) => r.floor))].sort((a, b) => a - b).map((floor) => {
    const rooms = all.filter((r) => r.floor === floor).sort((a, b) => a.number.localeCompare(b.number, undefined, { numeric: true }));
    return {
      type: floor === 0 ? "Ground floor" : `Floor ${floor}`,
      rooms,
      perDate: chart.dates.map((date, i) => ({ date, available: rooms.filter((r) => !r.outOfService && !covers(r.bars, i)).length, rate: null })),
    };
  });
}

/** The night's price as the web prints it under the count: "4.1k", a dash when unpriced (never "0.0k"). */
export const rateK = (rate: number | null) => (rate === null ? "-" : `${(rate / 1000).toFixed(1)}k`);

const WEEKDAY = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
/** The date header's two lines: "SUN" and "11". */
export const headOf = (iso: string) => ({ weekday: WEEKDAY[new Date(`${iso}T00:00:00Z`).getUTCDay()]!, day: iso.slice(-2) });

/** White or ink, whichever reads on a hotel's own colour (StayView.tsx readableOn). */
export function readableOn(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const lum = 0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255);
  return lum > 150 ? "#031728" : "#ffffff";
}

/** Assign room's list (AssignRoomFlow.tsx): a booking still to arrive with no room. */
export const unplaced = (stays: Stay[]) => stays.filter((s) => !s.roomNumber && s.status === "due-in");

/** The rooms Assign room offers the chosen booking (AssignRoomFlow.tsx): not
    out of service, no guest in it now, not blocked on one of its nights
    (D27-339). The server refuses a real clash; this list is the courtesy. */
export function assignChoices(rooms: Room[], stays: Stay[], chosen: Stay | null) {
  const taken = new Set(stays.filter((s) => s.status === "in-house" || s.status === "due-out").map((s) => s.roomNumber));
  return rooms.filter((r) => r.status !== "out-of-service" && !taken.has(r.number) && !(chosen && blockedFor(r, chosen.arrival, chosen.departure)));
}
