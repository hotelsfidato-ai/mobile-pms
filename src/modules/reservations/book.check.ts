/* Run: node --experimental-strip-types mobile/src/modules/reservations/book.check.ts
   New booking's own rules (BookingPage.tsx) and All bookings' (Reservations.tsx). */
import type { Stay } from "../../core/types.ts";
import {
  assignReasonFor, bookReason, checkInReasonFor, counted, departureHint, firstNight, isWalkIn, leftFor, linesBody, moveArrival, newLine, toAssign, totalRooms, withRooms,
} from "./book.ts";
import { askedOf, countFor, descriptionOf, FILTERS, queryOf, shown } from "./bookings.ts";

const eq = (got: unknown, want: unknown, what: string) => {
  if (JSON.stringify(got) !== JSON.stringify(want)) throw new Error(`${what}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
};
const addDays = (d: string, n: number) => new Date(Date.parse(`${d}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);

/* ── The lines ─────────────────────────────────────────────────────── */
const a = { ...newLine("sup", 0), room: "201" };
eq([a.adults, a.children, a.rooms, a.mealPlan, a.rate], [2, 0, 1, "EP", ""], "the first room is already there, two adults, the calendar's rate");
eq(withRooms(a, 3).room, "", "a room picked goes when the line is three rooms");
eq(withRooms(a, 1).room, "201", "and stays on one");
eq([counted("", 1), counted("0", 1), counted("4", 1), counted("x", 0)], [1, 1, 4, 0], "a count never below its least");
const lines = [a, { ...newLine("dlx", 1), rooms: 3 }, { ...newLine("sup", 2), room: "202" }];
eq(totalRooms(lines), 5, "five rooms");
/* The server answers one booking per room in the lines' order: 201 is the 1st, 202 the 5th. */
eq(toAssign(lines, false), [{ at: 0, room: "201" }, { at: 4, room: "202" }], "which booking gets which room");
eq(toAssign(lines, true), [], "a waiting booking gets no room");
eq(linesBody([{ ...a, rate: "3500" }, { ...newLine("dlx", 1), comp: true, rate: "9" }, { ...newLine("sup", 2), rate: "4000", inclusive: true }], (l) => l.inclusive),
  [
    { roomTypeId: "sup", mealPlan: "EP", adults: 2, children: 0, rooms: 1, agreedRate: 3500 },
    { roomTypeId: "dlx", mealPlan: "EP", adults: 2, children: 0, rooms: 1, complimentary: true },
    { roomTypeId: "sup", mealPlan: "EP", adults: 2, children: 0, rooms: 1, agreedRate: 4000, rateIncludesGst: true },
  ], "the body: a comp sends no rate; an inclusive rate says so");

const cells = [
  { roomTypeId: "sup", date: "2026-10-11", available: 4 }, { roomTypeId: "sup", date: "2026-10-12", available: 1 },
  { roomTypeId: "sup", date: "2026-10-13", available: 0 }, { roomTypeId: "dlx", date: "2026-10-11", available: 7 },
];
eq([leftFor(cells, "sup", "2026-10-11", "2026-10-13"), leftFor(cells, "dlx", "2026-10-11", "2026-10-12"), leftFor(cells, "x", "2026-10-11", "2026-10-12")], [1, 7, null], "the least free over the nights; not read is null");
eq([isWalkIn("306", "2026-10-11", "2026-10-11"), isWalkIn("306", "2026-10-15", "2026-10-11"), isWalkIn(undefined, "2026-10-11", "2026-10-11")], [true, false, false], "a walk-in is tonight's empty room");
eq([firstNight("2026-10-15", "2026-10-11"), firstNight(undefined, "2026-10-11"), firstNight("15 Oct", "2026-10-11")], ["2026-10-15", "2026-10-11", "2026-10-11"], "the cell's night, else the business date");
eq(moveArrival("2026-10-11", "2026-10-12", "2026-10-14", addDays), { from: "2026-10-14", to: "2026-10-15" }, "a stay keeps a night");
eq(moveArrival("2026-10-11", "2026-10-20", "2026-10-14", addDays), { from: "2026-10-14", to: "2026-10-20" }, "a later departure stays");
eq(moveArrival("2026-10-11", "2026-10-11", "2026-10-14", addDays), { from: "2026-10-14", to: "2026-10-14" }, "a day use moves with its day");
eq(departureHint("2026-10-11", "2026-10-13", 2, (d) => d), "2 nights", "nights");
eq(departureHint("2026-10-11", "2026-10-11", 0, (d) => d).startsWith("Day use - in and out on 2026-10-11."), true, "day use");

/* ── Why a button is grey ──────────────────────────────────────────── */
const base = {
  name: "Anil Sharma", phone: "", email: "", gstin: "", showCompany: true, sourceId: "agoda", discountProblem: null,
  billTo: "guest" as const, companyId: "", salesPick: "", salesOther: "", advanceProblem: null, required: [], fields: {},
  dayUse: false, lines, refusedSplits: [null, null, null],
};
eq(bookReason(base), null, "ready to save");
eq(bookReason({ ...base, name: " " }), "Type the guest's name.", "the name first");
eq(bookReason({ ...base, sourceId: "" }), "Choose the booking source.", "the channel");
eq(bookReason({ ...base, dayUse: true }), "Type the day-use price.", "a day use with an unpriced line");
eq(bookReason({ ...base, dayUse: true, lines: [{ ...a, rate: "1500" }, { ...a, comp: true }] }), null, "a day use: every paid line priced, a comp needs none");
eq(bookReason({ ...base, refusedSplits: [null, "No GST rule for ₹4,000.", null] }), "No GST rule for ₹4,000.", "the first line the server could not split");
eq(bookReason({ ...base, lines: [] }), "Add a room.", "no line");
eq(bookReason({ ...base, lines: [], sourceId: "" }), "Choose the booking source.", "the channel before the room");

eq(assignReasonFor(false, lines), null, "a room picked");
eq(assignReasonFor(false, [{ ...a, room: "" }]), "Pick a room.", "none picked");
eq(assignReasonFor(false, [{ ...a, rooms: 2, room: "201" }]), "Pick a room.", "a many-room line has no room");
eq(assignReasonFor(true, lines), "A booking waiting for the hotel gets its room once it is confirmed.", "waiting");

const ci = { waiting: false, arrivesToday: true, room: "201", roomsFailed: false, picked: { number: "201", allowed: true }, idBlocked: null, early: false, earlyReason: "", rooms: 1 };
eq(checkInReasonFor(ci), null, "one room today, picked and free");
eq(checkInReasonFor({ ...ci, rooms: 3 }), "One room at a time: save the booking, then check each room in from Arrivals.", "three rooms");
eq(checkInReasonFor({ ...ci, rooms: 3, arrivesToday: false }), "Check in now is for an arrival today.", "a later arrival says that first");
eq(checkInReasonFor({ ...ci, rooms: 3, waiting: true }), "A booking waiting for the hotel is checked in once it is confirmed.", "waiting first of all");
eq(checkInReasonFor({ ...ci, picked: { number: "201", allowed: false, reason: "Not cleaned yet." } }), "Room 201: Not cleaned yet.", "the room's own refusal");

/* ── All bookings ─────────────────────────────────────────────────── */
let n = 0;
const st = (status: string, arrival: string, more: Partial<Stay> = {}) => ({
  id: `s${++n}`, guest: `Guest ${n}`, reference: `FH-5EL-2610-50${n}`, roomNumber: "", status, arrival, phone: null, ...more,
}) as unknown as Stay;
const rows = [
  st("due-in", "2026-10-20", { guest: "Meera Iyer", phone: "+91 98220 11223" }), st("in-house", "2026-10-09", { roomNumber: "305" }),
  st("due-out", "2026-10-08"), st("checked-out", "2026-09-01"), st("void", "2026-10-02"), st("no-show", "2026-10-10"),
  st("cancelled", "2026-10-03"), st("tentative", "2026-11-01"),
];
eq(FILTERS.map((f) => countFor(rows, f)), [8, 1, 2, 1, 3], "every tile; void is in the last (QA BK-10); waiting only in All");
eq(shown(rows, "all", "").map((s) => s.arrival).slice(0, 3), ["2026-11-01", "2026-10-20", "2026-10-10"], "newest arrival first");
eq(shown(rows, "in-house", "").length, 2, "in house is due out too");
eq(shown(rows, "all", "98220 112").map((s) => s.guest), ["Meera Iyer"], "a phone by its digits");
eq(shown(rows, "all", "98").length, 0, "two digits match no phone");
eq(shown(rows, "all", "305").length, 1, "a room");
eq(shown(rows, "all", "meera").length, 1, "a guest, any case");
eq([askedOf(" Me "), askedOf("Mee")], ["", "mee"], "the server is asked from three letters");
eq([queryOf("mee ra", "2026-07-13"), queryOf("", "2026-07-13")], ["q=mee%20ra", "since=2026-07-13"], "a search, else the window");
eq(descriptionOf("", "2026-07-13", "2026-10-11", (d) => d), "Bookings leaving from 2026-07-13 on, and everything ahead, in any state. A search looks through every booking. Business date 2026-10-11.", "the line under the title");

console.log("reservations book and bookings: all checks pass");
