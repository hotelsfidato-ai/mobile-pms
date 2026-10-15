/* Run: node --experimental-strip-types mobile/src/modules/reports/figures.check.ts
   The counting rules the Dashboard and All properties use, on a tiny house. */
import { cash, daysBehind, yearBack } from "../../core/format.ts";
import { addUp, change, pick, todaysWork, type HouseNow, type ReportDoc } from "./figures.ts";

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
});

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
