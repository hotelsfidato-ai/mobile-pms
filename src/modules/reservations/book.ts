import { checkInReason, saveReason, type Reasons } from "../front-desk/booking.ts";

/* ══════════════════════════════════════════════════════════════════
   NEW BOOKING'S OWN RULES — what the web's one page
   (src/modules/reservations/pages/BookingPage.tsx, D27-158, D27-163) adds
   to the walk-in's: more than one room line, a room count per line, any
   arrival day. Everything a walk-in shares is front desk's booking.ts,
   imported, never copied: the price of a line, the discount, the GSTIN,
   the save, assign and check-in reasons for one room. No room charge, tax
   or Due is added up here (MFD-3; PMS request R-22 asks for the server's).
   Pure: no React Native here, so `book.check.ts` runs under node.
   ══════════════════════════════════════════════════════════════════ */

export interface Line {
  key: number;
  roomTypeId: string;
  mealPlan: string;
  adults: number;
  children: number;
  rooms: number;
  /** Empty uses the calendar; a number is a rate somebody agreed. */
  rate: string;
  /** D27-195: the typed rate includes GST. Off by default. */
  inclusive: boolean;
  /** ₹0 and nothing posted: the owner, an administrator or the GM. */
  comp: boolean;
  /** A room number for a one-room line; empty is "later". */
  room: string;
}

/** BookingPage.tsx newLine: two adults, one room, EP, the calendar's rate. */
export const newLine = (roomTypeId: string, key: number, room = ""): Line => ({
  key, roomTypeId, mealPlan: "EP", adults: 2, children: 0, rooms: 1, rate: "", inclusive: false, comp: false, room,
});

/** Counter: a number typed, never below its least (BookingPage.tsx Counter). */
export const counted = (text: string, min: number) => Math.max(min, Number(text) || min);
/** A room count changed: a picked room only stays on a one-room line. */
export const withRooms = (l: Line, n: number): Line => ({ ...l, rooms: n, room: n === 1 ? l.room : "" });

export const totalRooms = (lines: readonly Line[]) => lines.reduce((n, l) => n + l.rooms, 0);

/** The least free over the stay's nights, for a type (leftFor); null when not read. */
export function leftFor(cells: ReadonlyArray<{ roomTypeId: string; date: string; available: number }>, roomTypeId: string, from: string, to: string): number | null {
  const mine = cells.filter((c) => c.roomTypeId === roomTypeId && c.date >= from && c.date < to);
  return mine.length === 0 ? null : Math.min(...mine.map((c) => c.available));
}

/** A walk-in is this page opened from an empty room, tonight (D27-163). */
export const isWalkIn = (room: string | undefined, date: string | undefined, today: string) => !!room && date === today;

/** The arrival's first day: the cell's night, else the hotel's business date. */
export const firstNight = (date: string | undefined, today: string) => (date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : today);

/** The Save reason over every line (the web's `saveReason`, in its order):
    a day use needs every paid line's price; the first line whose
    GST-inclusive rate the server refused says why. */
export function bookReason(r: Omit<Reasons, "dayUse" | "comp" | "rate" | "inclusiveRefused"> & {
  dayUse: boolean; lines: readonly Line[]; refusedSplits: ReadonlyArray<string | null>;
}): string | null {
  const unpricedDay = r.dayUse && r.lines.some((l) => !l.comp && !(Number(l.rate) > 0));
  const reason = saveReason({
    ...r, dayUse: unpricedDay, comp: false, rate: "", inclusiveRefused: r.refusedSplits.find((x) => x !== null) ?? null,
  });
  /* "Add a room." sits after the booking source: a phone page always has its first line. */
  if (reason === null && r.lines.length === 0) return "Add a room.";
  return reason;
}

export const assignReasonFor = (waiting: boolean, lines: readonly Line[]) =>
  (waiting ? "A booking waiting for the hotel gets its room once it is confirmed."
    : !lines.some((l) => l.rooms === 1 && l.room) ? "Pick a room." : null);

/** Check in now: one room, arriving today (the web's `checkInReason`). */
export function checkInReasonFor(a: Parameters<typeof checkInReason>[0] & { rooms: number }): string | null {
  if (a.waiting || !a.arrivesToday) return checkInReason(a);
  if (a.rooms !== 1) return "One room at a time: save the booking, then check each room in from Arrivals.";
  return checkInReason(a);
}

/** A picked room is kept (D27-163): which of the bookings made gets which
    room. The server answers one booking per room, in the lines' order. */
export function toAssign(lines: readonly Line[], waiting: boolean): Array<{ at: number; room: string }> {
  if (waiting) return [];
  const out: Array<{ at: number; room: string }> = [];
  let at = 0;
  for (const l of lines) {
    if (l.rooms === 1 && l.room) out.push({ at, room: l.room });
    at += l.rooms;
  }
  return out;
}

/** The lines as POST /bookings takes them (book.ts `lines`). */
export const linesBody = (lines: readonly Line[], inclusive: (l: Line, i: number) => boolean) =>
  lines.map((l, i) => ({
    roomTypeId: l.roomTypeId, mealPlan: l.mealPlan, adults: l.adults, children: l.children, rooms: l.rooms,
    ...(l.comp ? { complimentary: true } : {}),
    ...(l.comp || l.rate.trim() === "" ? {} : { agreedRate: Number(l.rate) }),
    ...(!l.comp && inclusive(l, i) ? { rateIncludesGst: true } : {}),
  }));

/** The departure hint under the dates (BookingPage.tsx). */
export function departureHint(from: string, to: string, nights: number, day: (d: string) => string): string {
  if (from === to) return `Day use - in and out on ${day(from)}. Type the day's price; it is charged at check-in.`;
  return nights > 0 ? `${nights} ${nights === 1 ? "night" : "nights"}` : "The night of departure is not charged.";
}

/** A new arrival: a day use moves with its day, a stay keeps a night. */
export function moveArrival(from: string, to: string, next: string, addDays: (d: string, n: number) => string) {
  if (from === to) return { from: next, to: next };
  return { from: next, to: to <= next ? addDays(next, 1) : to };
}
