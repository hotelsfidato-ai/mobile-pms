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
const byRoom = (a: Stay, b: Stay) => a.roomNumber.localeCompare(b.roomNumber);

/** Today's arrivals: arriving on the date and not cancelled, by room. */
export const arrivals = (stays: Stay[], date: string) =>
  stays.filter((s) => s.arrival === date && s.status !== "cancelled").sort(byRoom);
/** The next fortnight, excluding today: planning, not working (server order). */
export const upcoming = (stays: Stay[], date: string) =>
  stays.filter((s) => s.arrival > date && s.arrival <= addDays(date, 14) && s.status !== "cancelled");
/** Who has checked in and not left (D17-10), by room. */
export const inHouse = (stays: Stay[]) => stays.filter((s) => s.status === "in-house" || s.status === "due-out").sort(byRoom);
/** Of them, leaving today. */
export const dueOut = (stays: Stay[]) => stays.filter((s) => s.status === "due-out").sort(byRoom);
/** Walk-ins on record, newest arrival first (WalkIns.tsx). */
export const walkIns = (stays: Stay[]) => stays.filter((s) => s.source === "Walk-in").sort((a, b) => b.arrival.localeCompare(a.arrival));

/** The list's filter box: guest, reference or room. */
export const matches = (s: Stay, query: string) => {
  const q = query.trim().toLowerCase();
  return !q || s.guest.toLowerCase().includes(q) || s.reference.toLowerCase().includes(q) || s.roomNumber.includes(q);
};

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
  housekeeping: string;
  /** "Occupied" or "Guest still in": its state in words (QA FD-10). */
  label?: string;
  allowed: boolean;
  reason?: string;
}

/** Rooms of the booked type - and the room already on the booking, whatever
    its type - with why not for the ones that cannot take the guest.
    Occupied is CHECKED IN and not left (status, not dates: MEMORY 3). */
export function assignable(rooms: Room[], checkedIn: Stay[], roomType: string, currentRoom?: string | null): Assignable[] {
  const takenBy = new Map(checkedIn.map((s) => [s.roomNumber, s.guest]));
  return rooms
    .filter((r) => r.type === roomType || (currentRoom != null && currentRoom !== "" && r.number === currentRoom))
    .map((r): Assignable => {
      const base = { number: r.number, housekeeping: r.status };
      if (r.status === "out-of-service") return { ...base, allowed: false, reason: "Held out of service." };
      if (r.status === "dirty") return { ...base, allowed: false, reason: "Not cleaned yet." };
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
/** What the confirm says. The web adds what the stay now costs, worked out
    in the browser; the phone never totals money (MODULE.md, difference 3). */
export const moveWords = (stay: { arrival: string; departure: string }, businessDate: string) =>
  `This moves the arrival from ${day(stay.arrival)} to ${day(businessDate)}: ${nightsBetween(businessDate, stay.departure)} nights.`;

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

/** Only a foreign nationality is shown: "IN" is the database's default, not a fact. */
export const foreignNationality = (n: string | null | undefined) => (n && n.toUpperCase() !== "IN" ? n : null);

const ID_WORDS: Record<string, string> = {
  aadhaar: "Aadhaar", passport: "Passport", driving_licence: "Driving licence", voter: "Voter ID", other: "ID",
};
export const idWord = (t: string) => ID_WORDS[t] ?? t;
