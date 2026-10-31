/* Run: node --experimental-strip-types mobile/src/modules/front-desk/desk.check.ts
   The desk's lists and the check-in's rules, on a tiny house. */
import {
  arrivals, assignable, blockedFor, checkInBlocked, day, dueOut, emptyRooms, inHouse, isBigMove, matches, mealPlanChoices, moveWords, owing, stayDue,
  partyProblem, upcoming, walkIns, whyNotYet,
} from "./desk.ts";

const eq = (got: unknown, want: unknown, what: string) => {
  if (JSON.stringify(got) !== JSON.stringify(want)) throw new Error(`${what}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
};
const d = "2026-08-25";
const stay = (reference: string, roomNumber: string, status: string, arrival: string, departure: string, source = "Agoda", guest = reference) =>
  ({ reference, roomNumber, status, arrival, departure, source, guest }) as never;
const stays = [
  stay("A", "204", "due-in", d, "2026-08-27"),
  stay("B", "201", "in-house", d, "2026-08-27"),
  stay("C", "202", "cancelled", d, "2026-08-26"),
  stay("D", "203", "due-out", "2026-08-23", d, "Walk-in"),
  stay("E", "205", "due-in", "2026-08-26", "2026-08-28"),
  stay("F", "206", "due-in", "2026-09-08", "2026-09-09"),
  stay("G", "207", "due-in", "2026-09-09", "2026-09-10", "Walk-in"),
  stay("V", "208", "void", d, "2026-08-26"),
  stay("W", "209", "void", "2026-08-26", "2026-08-27"),
  stay("N", "1002", "due-in", d, "2026-08-26"),
];
const refs = (list: { reference: string }[]) => list.map((s) => s.reference);

eq(refs(arrivals(stays, d)), ["B", "A", "N"], "today's arrivals, not cancelled or void, by room number");
eq(refs(upcoming(stays, d)), ["E", "F"], "the fortnight after today, the 15th day out");
eq(refs(inHouse(stays)), ["B", "D"], "checked in, by room");
eq(refs(dueOut(stays)), ["D"], "leaving today");
eq(refs(walkIns(stays)), ["G", "D"], "walk-ins, newest first");
eq(matches(stays[0]!, "20"), true, "a room matches");
eq(matches(stays[0]!, "zz"), false, "nothing matches");

/* A walk-in's empty rooms: nobody in, no arrival today, not out of service. */
const house = [{ number: "201", status: "clean" }, { number: "202", status: "dirty" }, { number: "203", status: "clean" }, { number: "204", status: "clean" },
  { number: "205", status: "out-of-service" }, { number: "206", status: "clean" }, { number: "207", status: "clean" }] as never[];
const tonight = [stay("P", "201", "in-house", d, "2026-08-27"), stay("Q", "203", "due-in", d, "2026-08-27"), stay("R", "204", "due-in", "2026-08-26", "2026-08-27"), stay("S", "207", "checked-out", "2026-08-23", d)];
eq(emptyRooms(house, tonight, new Set(["206"]), d).map((r) => (r as { number: string }).number), ["202", "204", "207"], "dirty and tomorrow's rooms stay offered");

/* canCheckIn (rules.ts), in its order. */
eq(whyNotYet({ status: "in-house", arrival: d }, d), "This guest is already checked in.", "already in");
eq(whyNotYet({ status: "due-in", arrival: "2026-08-30" }, d), "Arrives 30 Aug 2026. Check-in opens that morning.", "a later arrival");
eq(whyNotYet({ status: "due-in", arrival: d }, d), null, "today's");
eq(day("2026-08-05"), "5 Aug 2026", "the web's dateShort");

/* Rooms a Superior guest can be put in (assignableRooms). */
const room = (number: string, type: string, status: string, blocks: unknown[] = []) => ({ number, type, status, blocks }) as never;
const rooms = [room("201", "Superior", "clean"), room("202", "Superior", "dirty"), room("203", "Superior", "inspected"),
  room("204", "Superior", "out-of-service"), room("301", "Deluxe", "clean"), room("205", "Superior", "clean"),
  room("302", "Deluxe", "clean", [{ id: "b", from: "2026-08-26", to: null, reason: "house_use" }])];
const inNow = [stay("X", "203", "in-house", "2026-08-24", d, "Agoda", "Rekha"), stay("Y", "205", "due-out", "2026-08-24", d, "Agoda", "Ganesh")];
eq(assignable(rooms, inNow, "Superior", d, "205", "2026-08-27"), [
  { number: "201", type: "Superior", housekeeping: "clean", allowed: true },
  { number: "202", type: "Superior", housekeeping: "dirty", allowed: false, reason: "Not cleaned yet." },
  { number: "203", type: "Superior", housekeeping: "inspected", allowed: false, reason: "Rekha is in this room.", label: "Occupied" },
  { number: "204", type: "Superior", housekeeping: "out-of-service", allowed: false, reason: "Held out of service." },
  { number: "205", type: "Superior", housekeeping: "clean", allowed: true, reason: "Ganesh has not left this room yet.", label: "Guest still in" },
  { number: "301", type: "Deluxe", housekeeping: "clean", allowed: true },
  { number: "302", type: "Deluxe", housekeeping: "clean", allowed: false, reason: "NC from 2026-08-26 until further notice." },
], "every room, the booked type first, a block on a night of the stay refused");
eq(assignable(rooms, [], "Superior", d, null, d).find((r) => r.number === "302")?.allowed, true, "a day use today does not touch a block from tomorrow");
eq(blockedFor(rooms[6]!, "2026-08-27", "2026-08-27"), "NC from 2026-08-26 until further notice.", "a day use inside the block");

/* The one button's reason, in the web's order. */
const ok = { party: null, room: "201", chosen: { number: "201", type: "Superior", housekeeping: "clean", allowed: true }, idBlocked: null, byExpress: false, early: false, earlyReason: "", advanceWords: null };
eq(checkInBlocked(ok), null, "ready");
eq(checkInBlocked({ ...ok, room: "" }), "Pick a room.", "no room");
eq(checkInBlocked({ ...ok, chosen: { number: "201", type: "Superior", housekeeping: "dirty", allowed: false, reason: "Not cleaned yet." } }), "Room 201: Not cleaned yet.", "a dirty room");
eq(checkInBlocked({ ...ok, idBlocked: "Record the ID" }), "Record the ID", "the ID");
eq(checkInBlocked({ ...ok, idBlocked: "Record the ID", byExpress: true }), null, "express: the ID was confirmed online");
eq(checkInBlocked({ ...ok, early: true }), "Say why the room is being given early.", "early with no reason");
eq(checkInBlocked({ ...ok, advanceWords: "An advance of ₹3,000 is owed before check-in" }), "An advance of ₹3,000 is owed before check-in", "the advance");
eq(checkInBlocked({ ...ok, party: "Adults is a whole number from 1 to 99.", room: "" }), "Adults is a whole number from 1 to 99.", "the party first");
eq(partyProblem("abc", "0"), "Adults is a whole number from 1 to 99.", "abc adults");
eq(partyProblem("2", ""), null, "an empty children box is none, as the web reads it");

/* The panel's foot, the picture's own figure: three nights at ₹3,169.54 with 5%. */
const arriving = { status: "due-in", isComplimentary: false, offeredTariff: 3169.54 };
eq(stayDue(arriving, 3, 5, null), 9984.06, "Due, on the picture");
eq(stayDue(arriving, 3, 5, -1000), 8984.06, "an advance taken off");
eq(stayDue(arriving, 0, 5, null), undefined, "no charges to come");
eq(stayDue({ ...arriving, isComplimentary: true }, 3, 5, null), undefined, "complimentary");
eq(stayDue(arriving, 3, null, null), null, "no tax rule: no figure");

/* More than a day early moves the booking, confirmed first (D27-193). */
eq(isBigMove("2026-08-26", d), false, "a day early");
eq(isBigMove("2026-08-27", d), true, "two days early");
const stayed = { arrival: "2026-08-28", departure: "2026-08-30", isComplimentary: false, offeredTariff: 3699 };
eq(moveWords(stayed, d, 5), "This moves the arrival from 28 Aug 2026 to 25 Aug 2026: 5 nights, ₹19,419.75 with GST.", "the move, with the server's GST rate");
eq(moveWords(stayed, d, null), "This moves the arrival from 28 Aug 2026 to 25 Aug 2026: 5 nights, ₹18,495.00 before GST (no GST rule for this rate).", "no GST rule");
eq(moveWords({ ...stayed, isComplimentary: true }, d, 5), "This moves the arrival from 28 Aug 2026 to 25 Aug 2026: 5 nights, complimentary.", "complimentary");
eq(owing([{ balance: 7582.1 }, { balance: 0.2 }, { balance: -100 }, {}]), { count: 2, owed: 7582.3 }, "who still owes, and how much, without float dust");
eq(mealPlanChoices("Room Only").length, 4, "RO kept for a booking already on it");
eq(mealPlanChoices("CP").length, 3, "RO not offered");

console.log("front-desk desk: all checks pass");
