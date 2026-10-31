import type { Room, Stay } from "../../core/types.ts";
import { countProblem } from "./guestId.ts";

/* ══════════════════════════════════════════════════════════════════
   THE FRONT DESK'S RULES — the web's, ported, so the phone and the desk
   list, sort and refuse a stay the same way:
     src/modules/front-desk/data/stays.ts        listArrivals, listInHouse,
                                                 listDepartures
     src/modules/front-desk/pages/Arrivals.tsx   the fortnight ahead
     src/modules/front-desk/components/StayTable.tsx   LABEL and TONE
     src/modules/front-desk/data/operations.ts   assignableRooms,
                                                 mealPlanChoices
     src/modules/front-desk/flows/CheckInFlow.tsx   early, the move, blocked
     src/lib/rules.ts                            canCheckIn
     src/lib/format.ts                           dateShort ("25 Aug 2026")
   Pure: no React Native here, so `desk.check.ts` runs under node.
   ══════════════════════════════════════════════════════════════════ */

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** The web's dateShort, "25 Aug 2026" (the core's dateShort is its dateCompact). */
export const day = (date: string | null | undefined) =>
  date ? `${Number(date.slice(8, 10))} ${MONTHS[Number(date.slice(5, 7)) - 1]} ${date.slice(0, 4)}` : "-";

export const addDays = (date: string, n: number) => {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
const dayNumber = (d: string) => Date.parse(`${d}T00:00:00Z`) / 86_400_000;
export const nightsBetween = (a: string, b: string) => Math.round(dayNumber(b) - dayNumber(a));

/* ── The words and colours of a stay's state (StayTable.tsx) ─────── */
export type Tone = "accent" | "info" | "warning" | "neutral" | "danger" | "success";
export const STATUS: Record<string, { label: string; tone: Tone }> = {
  "due-in": { label: "Due in", tone: "accent" },
  "in-house": { label: "In house", tone: "info" },
  "due-out": { label: "Due out", tone: "warning" },
  "checked-out": { label: "Checked out", tone: "neutral" },
  "no-show": { label: "No show", tone: "danger" },
  cancelled: { label: "Cancelled", tone: "danger" },
  void: { label: "Void", tone: "neutral" },
  tentative: { label: "Waiting for the hotel", tone: "neutral" },
};
export const statusOf = (s: { status: string }) => STATUS[s.status] ?? { label: s.status, tone: "neutral" as Tone };

/* ── The desk's lists (stays.ts, Arrivals.tsx) ────────────────────── */
const byRoom = (a: Stay, b: Stay) => a.roomNumber.localeCompare(b.roomNumber, undefined, { numeric: true });
/** Not happening: cancelled, or voided (FD-32); the API says `void`, which StayStatus does not name. */
const gone = (s: { status: string }) => s.status === "cancelled" || s.status === "void";

/** Today's arrivals: arriving on the date and not cancelled or void, by room. */
export const arrivals = (stays: Stay[], date: string) =>
  stays.filter((s) => s.arrival === date && !gone(s)).sort(byRoom);
/** The next fortnight, excluding today: planning, not working (server order). */
export const upcoming = (stays: Stay[], date: string) =>
  stays.filter((s) => s.arrival > date && s.arrival <= addDays(date, 14) && !gone(s));
/** Who has checked in and not left (D17-10), by room. */
export const inHouse = (stays: Stay[]) => stays.filter((s) => s.status === "in-house" || s.status === "due-out").sort(byRoom);
/** Of them, leaving today. */
export const dueOut = (stays: Stay[]) => stays.filter((s) => s.status === "due-out").sort(byRoom);
/** Walk-ins on record, newest arrival first (WalkIns.tsx). */
export const walkIns = (stays: Stay[]) => stays.filter((s) => s.source === "Walk-in").sort((a, b) => b.arrival.localeCompare(a.arrival));

/** A room that can take a walk-in tonight (HouseFloor.tsx): nobody in it, no
    arrival given it today, not out of service. "dirty" ones open too: the
    booking stands, and the check-in says the room is not cleaned yet. */
export function emptyRooms(rooms: Room[], stays: Stay[], outOfOrder: ReadonlySet<string>, date: string) {
  const live = new Set(stays
    .filter((s) => s.status === "in-house" || s.status === "due-out" || (s.status === "due-in" && s.arrival === date))
    .map((s) => s.roomNumber));
  return rooms.filter((r) => r.status !== "out-of-service" && !outOfOrder.has(r.number) && !live.has(r.number));
}

/** The list's filter box: guest, reference or room. */
export const matches = (s: Stay, query: string) => {
  const q = query.trim().toLowerCase();
  return !q || s.guest.toLowerCase().includes(q) || s.reference.toLowerCase().includes(q) || s.roomNumber.toLowerCase().includes(q);
};

/** Who still owes on the departure list, and how much in all (InHouse.tsx
    `outstanding`, `owed`): the server's balances added, in whole paise. */
export function owing(stays: Array<{ balance?: number }>) {
  const owe = stays.filter((s) => (s.balance ?? 0) > 0);
  return { count: owe.length, owed: owe.reduce((t, s) => t + Math.round((s.balance ?? 0) * 100), 0) / 100 };
}

/* ── Check-in (rules.ts canCheckIn) ───────────────────────────────── */
export function whyNotYet(stay: { status: string; arrival: string }, businessDate: string): string | null {
  if (stay.status === "cancelled") return "This reservation was cancelled.";
  if (stay.status === "no-show") return "This reservation was marked a no-show.";
  if (stay.status === "in-house") return "This guest is already checked in.";
  if (stay.status === "checked-out") return "This stay has already ended.";
  if (stay.arrival > businessDate) return `Arrives ${day(stay.arrival)}. Check-in opens that morning.`;
  return null;
}

/** A room for the check-in's list (operations.ts assignableRooms). */
export interface Assignable {
  number: string;
  type: string;
  housekeeping: string;
  /** "Occupied" or "Guest still in": its state in words (QA FD-10). */
  label?: string;
  allowed: boolean;
  reason?: string;
}

/* rooms.ts BLOCK_REASONS, each up to its " - ". */
const BLOCK_WORDS: Record<string, string> = {
  out_of_order: "Out of order", out_of_service: "Maintenance / out of service", refurbishment: "Refurbishment", house_use: "NC",
};
/** Why a room cannot take a stay of nights [from, to) because of a block
    (rooms.ts blockedFor, D27-339); a day use counts its one day. */
export function blockedFor(room: Room, from: string, to: string): string | null {
  const b = (room.blocks ?? []).find((x) => (to > from ? x.from < to : x.from <= from) && (x.to === null || x.to >= from));
  if (!b) return null;
  return `${BLOCK_WORDS[b.reason ?? ""] ?? "Blocked"} from ${b.from}${b.to ? ` to ${b.to}` : " until further notice"}.`;
}

/** Every room, the booked type's first (D27-330: another type is an upgrade,
    the booked rate kept), with why not for the ones that cannot take the
    guest. Occupied is CHECKED IN and not left (status, not dates: MEMORY 3). */
export function assignable(rooms: Room[], checkedIn: Stay[], roomType: string, businessDate: string, currentRoom?: string | null, departure?: string): Assignable[] {
  const takenBy = new Map(checkedIn.map((s) => [s.roomNumber, s.guest]));
  return [...rooms]
    .sort((a, b) => Number(b.type === roomType) - Number(a.type === roomType))
    .map((r): Assignable => {
      const base = { number: r.number, type: r.type, housekeeping: r.status };
      if (r.status === "out-of-service") return { ...base, allowed: false, reason: "Held out of service." };
      if (r.status === "dirty") return { ...base, allowed: false, reason: "Not cleaned yet." };
      const blocked = departure ? blockedFor(r, businessDate, departure) : null;
      if (blocked) return { ...base, allowed: false, reason: blocked };
      const occupant = takenBy.get(r.number);
      if (occupant && r.number !== currentRoom) return { ...base, allowed: false, reason: `${occupant} is in this room.`, label: "Occupied" };
      if (occupant) return { ...base, allowed: true, reason: `${occupant} has not left this room yet.`, label: "Guest still in" };
      return { ...base, allowed: true };
    });
}

/** The meal plans the desk offers (D27-164); a booking on RO keeps it. */
export const MEAL_PLAN_CHOICES = [
  { value: "EP", label: "EP · Room only" },
  { value: "CP", label: "CP · Room + breakfast" },
  { value: "MAP", label: "MAP · Room + breakfast + one meal" },
];
export const mealPlanChoices = (current: string) =>
  current === "Room Only" ? [...MEAL_PLAN_CHOICES, { value: "Room Only", label: "RO · Room only" }] : MEAL_PLAN_CHOICES;

/** More than a day early moves the whole booking (D27-193): confirmed first. */
export const isBigMove = (arrival: string, businessDate: string) => dayNumber(arrival) - dayNumber(businessDate) > 1;
const inrPrecise = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2, maximumFractionDigits: 2 });
/** The web's moneyPrecise, "₹1,20,000.00". */
export const moneyPrecise = (n: number) => inrPrecise.format(n);
const paise = (rupees: number) => Math.round(rupees * 100);

/** What the confirm says, CheckInFlow's `moved`: the web's own preview of the
    move, from the agreed rate and the server's GST rate; the server charges it. */
export function moveWords(stay: { arrival: string; departure: string; isComplimentary: boolean; offeredTariff: number }, businessDate: string, gstRate: number | null | undefined) {
  const nights = nightsBetween(businessDate, stay.departure);
  const taxNight = gstRate == null ? null : Math.round(paise(stay.offeredTariff) * gstRate / 100) / 100;
  return `This moves the arrival from ${day(stay.arrival)} to ${day(businessDate)}: ${nights} nights, `
    + (stay.isComplimentary ? "complimentary."
      : taxNight === null ? `${moneyPrecise(stay.offeredTariff * nights)} before GST (no GST rule for this rate).`
        : `${moneyPrecise((paise(stay.offeredTariff) + paise(taxNight)) * nights / 100)} with GST.`);
}

/** The party as typed (FD-8): "abc" is not 0 adults. */
export const partyProblem = (adults: string, children: string) =>
  countProblem(Number(adults), "Adults", 1) ?? countProblem(Number(children), "Children", 0);

/** The one reason Check in is greyed, in the web's order (CheckInFlow.tsx `blocked`). */
export function checkInBlocked(a: {
  party: string | null; room: string; chosen: Assignable | undefined; idBlocked: string | null;
  byExpress: boolean; early: boolean; earlyReason: string; advanceWords: string | null;
}): string | null {
  return a.party
    ?? (!a.room || !a.chosen ? "Pick a room." : !a.chosen.allowed ? `Room ${a.room}: ${a.chosen.reason ?? "not available."}` : null)
    ?? (a.byExpress ? null : a.idBlocked)
    ?? (a.early && !a.earlyReason.trim() ? "Say why the room is being given early." : null)
    ?? a.advanceWords;
}

/** "2 adults · 1 child" (CheckInFlow.tsx). */
export const partyWords = (adults: string, children: string) =>
  `${adults} adult${Number(adults) === 1 ? "" : "s"} · ${children} ${Number(children) === 1 ? "child" : "children"}`;

/** "2 adults, 1 child" (StayDrawer.tsx StayFacts). */
export const guestsWords = (s: { adults: number; children: number }) =>
  `${s.adults} adult${s.adults === 1 ? "" : "s"}${s.children ? `, ${s.children} child${s.children === 1 ? "" : "ren"}` : ""}`;

/** "Stayed with the group 3 times" (ReturningGuest.tsx): checked-in visits, a group of rooms once. */
export function stayedWords(visits: number): string {
  if (visits <= 0) return "Has not stayed with the group yet";
  if (visits === 1) return "Stayed with the group once";
  return `Stayed with the group ${visits} times`;
}

/** Only a foreign nationality is shown: "IN" is the database's default, not a fact. */
export const foreignNationality = (n: string | null | undefined) => (n && n.toUpperCase() !== "IN" ? n : null);

const ID_WORDS: Record<string, string> = {
  aadhaar: "Aadhaar", passport: "Passport", driving_licence: "Driving licence", voter: "Voter ID", other: "ID",
};
export const idWord = (t: string) => ID_WORDS[t] ?? t;
