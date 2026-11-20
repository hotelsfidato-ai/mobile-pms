/* Run: node --experimental-strip-types src/modules/front-desk/rooms.check.ts
   Rooms, the house as tiles (HouseFloor.tsx, StayView.tsx todaysStays). */
import type { Room, Stay } from "../../core/types.ts";
import { buildChart, groupsOf, roomVisible, type ChartRoom } from "../reservations/chart.ts";
import { dirtyMark, inPairs, tileAct, tileState, tileType, tileWhen, todaysStays, TILE_LABEL } from "./rooms.ts";

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
  rackTariff: null, offeredTariff: 0, isVip: false, isSingleLady: false, businessSource: null, marketSegment: null, salesPerson: null, ...more,
});
const state = (over: Partial<ChartRoom["state"]> = {}, outOfService = false): ChartRoom => ({
  number: "201", type: "Superior", floor: 2, housekeeping: "clean", outOfService, bars: [],
  state: { occupied: false, arriving: false, reserved: false, dueOut: false, dirty: false, ...over },
});

/* The order a person cares in: a departure beats in house, in house beats dirty. */
eq(tileState(state({ occupied: true, dueOut: true })), "due-out", "occupied and leaving today is due out");
eq(tileState(state({ occupied: true, dirty: true })), "occupied", "in house and dirty reads In house (the mark says dirty)");
eq(tileState(state({ arriving: true, dirty: true })), "arriving", "an arrival into a dirty room is Arriving");
eq(tileState(state({ dirty: true })), "dirty", "nobody in it, dirty");
eq(tileState(state()), "free", "free");
eq(tileState(state({ occupied: true }, true)), "out-of-service", "out of service first, a guest in it or not");
eq(TILE_LABEL[tileState(state({ dirty: true }))], "Needs cleaning", "the filter tiles' words");

/* The dirty mark only beside another word. */
eq(dirtyMark(state({ occupied: true, dirty: true })), true, "In house, marked dirty");
eq(dirtyMark(state({ dirty: true })), false, "Needs cleaning says it already");
eq(dirtyMark(state({ occupied: true })), false, "clean");

/* Who is in each room TODAY. */
const inHouse = stay("202", "in-house", "2026-10-09", "2026-10-13");
const ahead = stay("202", "due-in", TODAY, "2026-10-14");
const arriving = stay("207", "due-in", TODAY, "2026-10-14");
const later = stay("208", "due-in", "2026-10-12", "2026-10-14");
const gone = stay("209", "checked-out", "2026-10-09", TODAY);
const unplaced = stay("", "due-in", TODAY, "2026-10-12");
const today = todaysStays([inHouse, ahead, arriving, later, gone, unplaced], TODAY);
eq(Object.keys(today).sort(), ["202", "207"], "checked in or arriving today, with a room");
eq(today["202"]?.id, inHouse.id, "the guest in the room, not the arrival given it ahead");
eq(today["207"]?.id, arriving.id, "an arrival today");
eq(todaysStays([ahead, inHouse], TODAY)["202"]?.id, inHouse.id, "the guest in the room wins whichever comes first");

/* What a tap does. */
eq(tileAct(state({ occupied: true }), inHouse), { kind: "stay", id: inHouse.id }, "a guest: the stay");
eq(tileAct(state(), undefined), { kind: "walk-in", room: "201" }, "free: a walk-in into it");
eq(tileAct(state({ dirty: true }), undefined), { kind: "walk-in", room: "201" }, "needs cleaning: a walk-in too (the check-in says it is not cleaned)");
eq(tileAct(state({ occupied: true }, true), inHouse), { kind: "none" }, "out of service: nothing, a guest in it or not");

/* The tile's lines. */
eq(tileWhen("due-out", inHouse), "out today", "due out");
eq(tileWhen("occupied", inHouse), "to 13 Oct 2026", "the web's dateShort");
eq(tileType(state({}, true)), "-", "out of service: a dash");
eq(tileType(state()), "Superior", "the type");

/* Two across; the odd last tile alone on its row. */
eq(inPairs([1, 2, 3]), [[1, 2], [3]], "odd");
eq(inPairs([1, 2]), [[1, 2]], "even");
eq(inPairs([]), [], "none");

/* The house is the Calendar's: the counts and the filter read the same state. */
const rooms = [room("201", "Superior", 2, "dirty"), room("202", "Superior", 2), room("301", "Deluxe", 3), room("302", "Deluxe", 3, "clean", [{ id: "b", from: "2026-10-01", to: null, reason: "out_of_order" } as Room["blocks"][number]])];
const chart = buildChart({
  rooms, stays: [inHouse], businessDate: TODAY, start: TODAY, prices: null,
  house: [{ number: "202", inHouse: true, outOfOrder: false }, { number: "302", inHouse: false, outOfOrder: true }],
})!;
eq(chart.counts.All, 3, "sellable: out of service apart");
eq(chart.counts.Occupied, 1, "in house");
eq(chart.counts.Dirty, 1, "needs cleaning");
const flat = groupsOf(chart, "type").flatMap((g) => g.rooms);
eq(flat.filter((r) => roomVisible(r, "Dirty")).map((r) => r.number), ["201"], "the Dirty tile shows its one room");
eq(flat.map((r) => tileState(r)), ["dirty", "occupied", "free", "out-of-service"], "each tile's state");
eq(groupsOf(chart, "floor").map((g) => g.type), ["Floor 2", "Floor 3"], "by floor");

console.log("rooms.check: ok");
