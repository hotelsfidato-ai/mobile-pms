/* Run: node --experimental-strip-types mobile/src/modules/reports/figures.check.ts
   The counting rules the Dashboard and All properties use, on a tiny house. */
import { cash, daysBehind, yearBack } from "../../core/format.ts";
import {
  addDays, addUp, change, dateYear, dayWritten, houseRooms, lastDays, monthDays, monthName, nightsAhead, nightsOf, pick, revenueSplit,
  sparkLine, stripState, todaysWork, weekdayOf, type HouseNow, type ReportDoc,
} from "./figures.ts";

/* No node:assert, so the app's own type check reads this file too. */
const eq = (got: unknown, want: unknown) => {
  if (JSON.stringify(got) !== JSON.stringify(want)) throw new Error(`got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
};
const d = "2026-10-14";
const stay = (roomNumber: string, status: string, arrival: string, departure: string) =>
  ({ roomNumber, status, arrival, departure }) as never;
const room = (number: string, status: string) => ({ number, status }) as never;
const house: HouseNow = { rooms: [
  { number: "101", inHouse: true, outOfOrder: false, empty: false },
  { number: "102", inHouse: true, outOfOrder: false, empty: false },
  { number: "103", inHouse: false, outOfOrder: false, empty: true },
  { number: "104", inHouse: false, outOfOrder: true, empty: false },
  { number: "105", inHouse: false, outOfOrder: false, empty: true },
] };
const w = todaysWork(d, [
  stay("101", "in-house", "2026-10-12", d), // leaves today, still here
  stay("102", "in-house", "2026-10-13", "2026-10-16"),
  stay("103", "due-in", d, "2026-10-15"), // still to arrive
  stay("105", "checked-out", "2026-10-11", d), // left today
  stay("103", "cancelled", d, "2026-10-15"), // not work
  stay("103", "no-show", d, "2026-10-15"), // not work
], [room("101", "clean"), room("102", "dirty"), room("103", "clean"), room("104", "dirty"), room("105", "dirty")], house);

eq(w, {
  arriving: 1, toArrive: 1,
  leaving: 2, toLeave: 1,
  inHouse: 2, dueOut: 1,
  dirty: 2, // 102 and 105; 104 is blocked, so not counted
  empty: 2, ready: 1, // 103 and 105 free, only 103 clean
  blocked: 1,
});

/* A voided booking is no arrival (D27-326 (1)): the API says "void". */
eq(todaysWork(d, [stay("103", "void", d, "2026-10-15")], [room("103", "clean")], house).arriving, 0);

/* The strip: one state per room, the web's order of asking; in number order. */
const strip = houseRooms(d, [
  stay("103", "due-in", d, "2026-10-15"),
  stay("101", "in-house", "2026-10-12", d),
  stay("102", "due-out", "2026-10-13", "2026-10-16"),
  stay("104", "due-in", d, "2026-10-15"), // arriving, but blocked: out of service wins
  stay("105", "cancelled", d, "2026-10-15"), // not arriving
], [room("105", "dirty"), room("1010", "dirty"), room("104", "clean"), room("103", "clean"), room("102", "clean"), room("101", "clean")], house);
eq(strip.map((r) => r.number), ["101", "102", "103", "104", "105", "1010"]);
eq(strip.map(stripState), ["due", "due", "arr", "oos", "free", "free"]);

/* The Monthly statistics report's days: a rate over no rooms is a gap. */
const month: ReportDoc = { sections: [{ key: "days", rows: [
  { kind: "row", cells: { label: "9 Fri", available: 17, occupancy: 0, adr: 0, revpar: 0, room: 0 } },
  { kind: "row", cells: { label: "10 Sat", available: 0, occupancy: 0, adr: 0, revpar: 0, room: 0 } },
  { kind: "row", cells: { label: "11 Sun", available: 17, occupancy: 50, adr: 3000, revpar: 1500, room: 25500 } },
  { kind: "total", cells: { label: "Total", available: 34, occupancy: 25, adr: 3000, revpar: 750, room: 25500 } },
] }] };
const days = monthDays(month, "2026-10");
eq(days.length, 3); // the total is no day
eq(days[0], { date: "2026-10-09", available: 17, occupancy: 0, adr: null, revpar: 0, room: 0 });
eq(days[1]!.revpar, null);
eq(days[2]!.adr, 3000);
eq(monthDays(null, "2026-10"), []);

/* The last days cross into the month before; a day not read is a gap. */
const last = lastDays(days, "2026-10-11", 4);
eq(last.map((x) => x.date), ["2026-10-08", "2026-10-09", "2026-10-10", "2026-10-11"]);
eq(last[0]!.room, null);
eq(addDays("2026-10-31", 1), "2026-11-01");
eq(addDays("2026-10-01", -1), "2026-09-30");
eq([weekdayOf("2026-10-11"), dateYear("2026-10-01"), monthName("2026-10-11")], ["Sun", "1 Oct 2026", "October 2026"]);

/* The small line: a gap breaks it, a lone day is a dot, nothing is nothing. */
eq(sparkLine([null, null], 100, 100).path, "");
eq(sparkLine([100, 50, null, 100], 90, 100).path, "M0.0,12.0L0.0,12.0L30.0,50.0M90.0,12.0L90.0,12.0");
eq(sparkLine([0, 0], 100, 100).path, "M0.0,88.0L0.0,88.0L100.0,88.0"); // a real zero sits on the floor

/* Revenue: the rows without their sums, the web's words; the total apart. */
const revenue = revenueSplit({ sections: [{ key: "revenue-summary", rows: [
  { kind: "row", cells: { label: "Room Revenue", today: 10, ptd: 100, ytd: 1000 } },
  { kind: "row", cells: { label: "Extra Revenue", today: null, ptd: null, ytd: null } },
  { kind: "total", cells: { label: "PMS Revenue", today: 10, ptd: 100, ytd: 1000 } },
  { kind: "row", cells: { label: "Fidato Restaurant", today: 0, ptd: 0, ytd: 5 } },
  { kind: "total", cells: { label: "Total Revenue", today: 10, ptd: 100, ytd: 1005 } },
] }] });
eq(revenue.parts, [{ name: "Room revenue", value: 100 }, { name: "Extra revenue", value: null }, { name: "Fidato Restaurant", value: 0 }]);
eq(revenue.total, { today: 10, ptd: 100, ytd: 1005 });

/* The nights: tonight first, a night not held a dash, not 0%. */
const ahead = nightsAhead("2026-10-11", [
  { date: "2026-10-11", availableRooms: 17, roomsSold: 18, occupancyPct: 105.88 },
  { date: "2026-10-12", availableRooms: 0, roomsSold: 0, occupancyPct: 0 },
]);
eq(ahead.length, 14);
eq([ahead[0]!.tonight, ahead[0]!.share, ahead[0]!.rooms, ahead[0]!.weekend], [true, 106, "18/17", true]);
eq([ahead[1]!.share, ahead[1]!.rooms], [null, "0/0"]);
eq([ahead[2]!.share, ahead[2]!.rooms, ahead[2]!.wd], [null, null, "Tue"]);
eq(ahead[13]!.date, "2026-10-24");

/* The chart: nights ahead, a half room from the share, which day numbers show. */
const nights = nightsOf(days, "2026-10-09");
eq([nights[0]!.today, nights[1]!.ahead, nights[1]!.weekend, nights[2]!.rooms], [true, true, true, 8.5]);
const on = (day: number, today = false) => ({ day: String(day), today }) as never;
eq(dayWritten(on(10), 9, 10, false), false); // beside today's
eq(dayWritten(on(15), 14, 10, false), true);
eq(dayWritten(on(7), 6, 10, false), false);
eq(dayWritten(on(7), 6, 10, true), true);
eq(dayWritten(on(11, true), 10, 10, false), true);

const doc: ReportDoc = { sections: [{ key: "statistics", rows: [
  { kind: "row", cells: { label: "Occupancy Rate (%)", today: 35.29, ptd: null, ytd: 59.68 } },
] }] };
eq(pick(doc, "statistics", "Occupancy Rate (%)"), { today: 35.29, ptd: null, ytd: 59.68 });
eq(pick(doc, "statistics", "Nothing"), undefined);

const s = (availableRoomNights: number, roomsSold: number, roomRevenue: number) =>
  ({ availableRoomNights, roomsSold, roomRevenue }) as never;
eq(addUp([s(18, 9, 27000), s(2, 1, 3000)]), { occupancy: 50, arr: 3000, revpar: 1500, revenue: 30000 });
eq(addUp([s(18, 9, 27000), null]), null); // one failed: no group figure
eq(addUp([s(18, 0, 0)])!.arr, null); // nothing sold: no rate, a dash

eq(cash(120000), "₹1,20,000");
eq(cash(null), "-");
eq(change(110, 100), 10);
eq(change(110, 0), null);
eq(yearBack("2028-02-29"), "2027-02-28");
eq(daysBehind({ businessDate: "2026-10-12", today: d }), 2);
eq(daysBehind({ businessDate: d }), 0);
console.log("figures: all checks pass");
