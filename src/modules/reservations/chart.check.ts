/* Run: node --experimental-strip-types mobile/src/modules/reservations/chart.check.ts
   The Calendar's chart, as stayview.ts and StayView.tsx draw it. */
import type { Room, Stay } from "../../core/types.ts";
import { assignChoices, buildChart, groupsOf, headOf, rateK, readableOn, roomVisible, toneFor, unplaced, windowFrom } from "./chart.ts";

const eq = (got: unknown, want: unknown, what: string) => {
  if (JSON.stringify(got) !== JSON.stringify(want)) throw new Error(`${what}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
};

const TODAY = "2026-10-11";
const room = (number: string, type: string, floor: number, status = "clean", blocks: Room["blocks"] = []): Room =>
  ({ number, type, floor, status, maxOccupancy: 2, rackRate: null, blocks });
let n = 0;
const stay = (roomNumber: string, status: string, arrival: string, departure: string, more: Partial<Stay> = {}): Stay => ({
  id: `s${++n}`, hotelId: "5EL", reference: `R${n}`, guest: `Guest ${n}`, roomNumber, roomType: "Superior", source: "Agoda", ratePlan: "EP",
  arrival, departure, nights: 1, adults: 2, children: 0, status: status as Stay["status"], isDayUse: arrival === departure, isComplimentary: false,
  rackTariff: 4099, offeredTariff: 4000, isVip: false, isSingleLady: false, businessSource: null, marketSegment: null, salesPerson: null, ...more,
});

/* Tone follows status. */
eq(toneFor(stay("201", "in-house", "2026-10-09", TODAY), TODAY), "due-out", "in house and leaving today is due out");
eq(toneFor(stay("201", "in-house", "2026-10-09", "2026-10-13"), TODAY), "in-house", "in house");
eq(toneFor(stay("201", "void", TODAY, "2026-10-12"), TODAY), "void", "a voided booking is struck through (FD-32)");
eq(toneFor(stay("201", "cancelled", TODAY, "2026-10-12"), TODAY), "void", "cancelled too");
eq(toneFor(stay("201", "tentative", TODAY, "2026-10-12"), TODAY), "waiting", "waiting for the hotel");
eq(toneFor(stay("201", "due-in", TODAY, "2026-10-12"), TODAY), "confirmed", "still to arrive");
eq(toneFor(stay("201", "checked-out", "2026-10-01", "2026-10-03"), TODAY), "departed", "checked out");

eq(windowFrom(TODAY).length, 14, "a fortnight");
eq(windowFrom("2026-10-28", 5).at(-1), "2026-11-01", "across a month");
eq(buildChart({ rooms: [], stays: [], house: [], prices: null, start: TODAY, businessDate: TODAY }), null, "no rooms is an answer, not a loading screen");

/* A small house: 201, 202 Superior on floor 2; 301 Deluxe on floor 3, blocked on the 13th and 14th; 001 on the ground floor. */
const rooms = [
  room("201", "Superior", 2, "dirty"), room("202", "Superior", 2), room("301", "Deluxe", 3, "clean", [{ id: "b", from: "2026-10-13", to: "2026-10-14", reason: "out_of_order" }]),
  room("001", "Deluxe", 0),
];
const stays = [
  stay("201", "in-house", "2026-10-05", "2026-10-13"),          // clipped at the start, two nights shown
  stay("202", "due-in", "2026-10-20", "2026-11-02"),            // clipped at the end
  stay("202", "no-show", TODAY, "2026-10-12"),                  // a bar, but no night sold
  stay("301", "void", TODAY, "2026-10-13"),                     // drawn struck, never takes the room
  stay("001", "due-in", "2026-10-12", "2026-10-12"),            // a day use on the 12th
  stay("001", "tentative", "2026-10-15", "2026-10-16"),         // waiting: holds the room, sells no night
];
const house = [{ number: "201", inHouse: true, outOfOrder: false }, { number: "301", inHouse: false, outOfOrder: true }];
const prices = [{ type: "Superior", date: TODAY, price: 4099 }, { type: "Superior", date: "2026-10-12", price: null }];
const chart = buildChart({ rooms, stays, house, prices, start: TODAY, businessDate: TODAY })!;
const r = (num: string) => chart.roomTypes.flatMap((g) => g.rooms).find((x) => x.number === num)!;

eq(chart.roomTypes.map((g) => g.type), ["Superior", "Deluxe"], "the property's own order of types");
eq(r("201").bars.map((b) => [b.startIndex, b.span, b.clippedStart, b.clippedEnd]), [[0, 2, true, false]], "a stay begun before the window");
eq(r("202").bars.map((b) => [b.startIndex, b.span, b.clippedStart, b.clippedEnd, b.tone]), [[0, 1, false, false, "no-show"], [9, 5, false, true, "confirmed"]], "sorted by start; one runs past the window");
eq(r("001").bars.map((b) => [b.startIndex, b.span]), [[1, 1], [4, 1]], "a day use takes its one day");

/* Availability per type and night: a void bar frees the room; a block takes it (inclusive both ends). */
eq(chart.roomTypes[1]!.perDate.slice(0, 5).map((d) => d.available), [2, 1, 1, 1, 1], "Deluxe: the void frees 301 on the 11th; the 12th day use, the block on the 13th-14th, the 15th waiting each take one");
eq(chart.roomTypes[0]!.perDate.slice(0, 3).map((d) => d.available), [0, 1, 2], "Superior: the no-show's bar holds 202 on the 11th");
eq(chart.roomTypes[0]!.perDate.slice(0, 3).map((d) => d.rate), [4099, null, null], "the server's night price, or none");
eq([rateK(4099), rateK(3699), rateK(null)], ["4.1k", "3.7k", "-"], "the price under the count; a dash, never 0.0k");

/* Occupancy is the Manager report's: no-show, waiting and day use are not nights sold. */
eq(chart.footer[0], { date: TODAY, availableInventory: 2, occupancyPct: 25 }, "the 11th: 201 sold of four sellable");
eq(chart.footer[2]!.occupancyPct, 0, "the 13th: 201 has left; 301 blocked is out of the four");
eq(chart.footer[2]!.availableInventory, 3, "the 13th: three sellable, none taken");

/* The tiles: the server's in house and out of service, the room's own cleaning. */
eq(chart.counts, { All: 3, Vacant: 2, Occupied: 1, Arrivals: 0, Reserved: 2, Blocked: 1, "Due Out": 0, Dirty: 1 }, "the counts: 202 and 001 have bookings ahead");
eq([roomVisible(r("301"), "Blocked"), roomVisible(r("301"), "All"), roomVisible(r("201"), "Occupied"), roomVisible(r("202"), "Reserved")], [true, false, true, true], "a tile shows what it counts");

/* By floor: summed from the floor's rooms, and no rate. */
const floors = groupsOf(chart, "floor");
eq(floors.map((g) => [g.type, g.rooms.map((x) => x.number)]), [["Ground floor", ["001"]], ["Floor 2", ["201", "202"]], ["Floor 3", ["301"]]], "floors in order");
eq(floors[1]!.perDate.slice(0, 2).map((d) => [d.available, d.rate]), [[0, null], [1, null]], "a floor has no one price");
eq(groupsOf(chart, "type"), chart.roomTypes, "by type is the chart's own");

eq(headOf(TODAY), { weekday: "SUN", day: "11" }, "the date header");
eq([readableOn("#ffb600"), readableOn("#2b6cb0")], ["#031728", "#ffffff"], "ink on yellow, white on blue");

/* Assign room: a booking to arrive with no room; rooms free of a guest and of a block on its nights. */
const placeMe = stay("", "due-in", "2026-10-13", "2026-10-15");
eq(unplaced([...stays, placeMe]).map((s) => s.id), [placeMe.id], "only a booking still to arrive with no room");
eq(assignChoices(rooms, stays, placeMe).map((x) => x.number), ["202", "001"], "not 201 (a guest in it), not 301 (blocked on the 13th)");

console.log("reservations chart: all checks pass");
