/* Run: node --experimental-strip-types mobile/src/modules/revenue-management/outlook.check.ts
   The words the Revenue outlook puts on the server's figures: the web's
   logic/outlook.ts, logic/pickup.ts and market-rates' nearbySummary, ported.
   The data is chosen so a figure the phone could work out differs from the
   one the server sent (MEMORY 11): an occupancy that is not sold / available,
   a month's rooms sold that is not the sum of its nights. */
import {
  aheadBy, comparable, counted, datesAhead, datesWorthALook, dateLines, dayOfInstant, dayYear, monthOfDate,
  nearbyLine, nearbySummary, onTheBooksAWeekAgo, paceTiles, percent, pickupNote, pickupOn, plusDays, rivalPrice,
  sameMonthLastYear, softestFirst, suggest, suggestions, temperOf, whyNoPickup, windowOpens,
  type CheckedNight, type DayStatistics, type PeriodStatistics, type Pickup,
} from "./outlook.ts";

/* No node:assert, so the app's own type check reads this file too. */
const eq = (got: unknown, want: unknown) => {
  if (JSON.stringify(got) !== JSON.stringify(want)) throw new Error(`got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
};

const today = "2026-10-11";
const day = (date: string, availableRooms: number, roomsSold: number, occupancyPct: number): DayStatistics =>
  ({ date, availableRooms, roomsSold, occupancyPct });

/* Dates. */
eq(plusDays(today, 90), "2027-01-09");
eq(plusDays("2026-03-01", -1), "2026-02-28");
eq(monthOfDate("2028-02-14"), { from: "2028-02-01", to: "2028-02-29" });
eq(sameMonthLastYear("2026-10-01"), { from: "2025-10-01", to: "2025-10-31" });
eq(sameMonthLastYear("2029-02-01"), { from: "2028-02-01", to: "2028-02-29" });
eq(dayYear("2026-10-17"), "17 Oct 2026");
eq(dayOfInstant("2026-10-12T12:00:00.000Z"), "12 Oct 2026");
eq(dayOfInstant(null), "-");
eq(dayOfInstant("not a time"), "-");

/* The nights ahead: a night before the business date is dropped; an
   overbooked night has nothing left, never a negative (the web's rule). */
const rows = [
  day("2026-10-10", 17, 17, 100), // yesterday: not ahead
  day("2026-10-11", 17, 18, 105.88), // tonight, overbooked
  day("2026-10-13", 17, 4, 23.53),
  day("2026-10-14", 17, 3, 17.65),
  day("2026-10-16", 17, 1, 60), // the server's 60% is not 1/17: steady on the server's figure, soft on a sum the phone made
  day("2026-10-17", 17, 0, 0),
  day("2026-10-26", 17, 0, 0), // 15 days out: not close in, so not soft
  day("2026-10-27", 0, 0, 0), // nothing to sell: steady, whatever its occupancy
  day("2026-10-28", 17, 15, 88.24), // filling well, far out
];
const days = datesAhead(rows, today);
eq(days.map((d) => d.date)[0], "2026-10-11");
eq(days.length, 8);
eq(days[0], { date: "2026-10-11", available: 17, sold: 18, occupancyPct: 105.88, left: 0, daysOut: 0 });
eq(days.map(temperOf), ["strong", "soft", "soft", "steady", "soft", "steady", "steady", "strong"]);

/* The sentences: never a price, the occupancy as the server sent it. */
eq(suggest(days[0]!), {
  date: "2026-10-11", temper: "strong", reason: "tonight, 105.88% sold, 0 of 17 rooms left.",
  text: "Consider holding or raising the rate for Sunday, 11 October 2026.",
});
eq(suggest(days[1]!)?.text, "Consider a lower rate for Tuesday, 13 October 2026.");
eq(suggest(days[1]!)?.reason, "2 days out, 23.53% sold, 13 of 17 rooms left.");
eq(suggest(datesAhead([day("2026-10-12", 17, 1, 5.88)], today)[0]!)?.reason, "tomorrow, 5.88% sold, 16 of 17 rooms left.");
eq(suggest(days[5]!), null);
for (const s of suggestions(days)) eq(/\d/.test(s.text.replace(/\w+day, \d+ \w+ \d{4}/, "")), false); // no figure in a suggestion
eq(suggestions(days).map((s) => s.date), ["2026-10-11", "2026-10-13", "2026-10-14", "2026-10-17", "2026-10-28"]);
eq(suggestions(datesAhead(["2026-10-18", "2026-10-19", "2026-10-20", "2026-10-21", "2026-10-22", "2026-10-23"].map((d) => day(d, 17, 0, 0)), today)).length, 5); // the first five only

/* Dates worth a look: the softest first, then the nearest; every night when none is soft. */
eq(softestFirst(days).map((d) => d.date), ["2026-10-17", "2026-10-14", "2026-10-13"]);
eq(datesWorthALook([days[0]!, days[7]!]).map((d) => d.date), ["2026-10-11", "2026-10-28"]);

/* Pace: no last year is a dash and a sentence, never "-17.3%". */
const now: PeriodStatistics = { from: "2026-10-01", to: "2026-10-31", availableRoomNights: 527, roomsSold: 91, occupancyPct: 17.27, adr: 3326.4, revpar: 574.2, roomRevenue: 302702.5 } as PeriodStatistics;
const closed: PeriodStatistics = { ...now, from: "2025-10-01", to: "2025-10-31", availableRoomNights: 0, roomsSold: 0, occupancyPct: 0 };
const traded: PeriodStatistics = { ...now, from: "2025-10-01", to: "2025-10-31", occupancyPct: 20.5 };
eq(comparable(closed), null);
eq(aheadBy({ now, lastYear: closed }), null);
eq(aheadBy({ now, lastYear: null }), null);
eq(aheadBy({ now, lastYear: traded }), -3.23);
eq(paceTiles(now, null, null), [
  { label: "Occupancy", value: "17.3%" },
  { label: "Rooms sold", value: "91" },
  { label: "Room nights", value: "527" },
  { label: "Against last year", value: "-", note: "The property was not selling then." },
  { label: "A week ago", value: "-", note: "The records do not reach back a week.", wide: true },
]);
eq(paceTiles(now, 2.5, 80).slice(3), [
  { label: "Against last year", value: "+2.5%" },
  { label: "A week ago", value: "80", note: "11 rooms booked since, still on the books.", wide: true },
]);
eq(paceTiles(now, -3.23, null)[3]!.value, "-3.2%");
eq(percent(null), "-");
eq(percent(0), "0.0%");

/* Pickup: a window that opens before the records begin is a dash, with both dates in one sentence. */
const pickup = (recordsFrom: string | null, businessDate = today): Pickup => ({
  from: "2026-10-01", to: "2027-01-09", businessDate, recordsFrom,
  nights: [
    { date: "2026-10-13", sold: 4, last1: 0, last7: 3, last30: 4 },
    { date: "2026-10-23", sold: 1, last1: 1, last7: 1, last30: 1 },
    { date: "2026-11-02", sold: 6, last1: 2, last7: 5, last30: 6 }, // next month: not in October's week ago
  ],
});
eq(windowOpens(today, 1), "2026-10-11");
eq(windowOpens(today, 7), "2026-10-05");
eq(windowOpens(today, 30), "2026-09-12");
const young = pickup("2026-10-09");
eq([counted(young, 1), counted(young, 7), counted(young, 30)], [true, false, false]);
eq(pickupOn(young, "2026-10-23"), { last1: 1, last7: null, last30: null });
eq(pickupOn(young, "2026-12-01"), { last1: null, last7: null, last30: null }); // a night the server did not send
eq(pickupOn(null, "2026-10-23"), { last1: null, last7: null, last30: null });
eq(whyNoPickup(young), "Booking records here start on Friday, 9 October 2026, and this property's own day is Sunday, 11 October 2026. A window that opens before the records do is shown as a dash: it cannot tell what was picked up from everything on the books.");
eq(whyNoPickup(null), "Pickup could not be read, so it is left blank rather than guessed.");
eq(whyNoPickup(pickup(null)), "No booking has been recorded at this property yet, so there is nothing to have picked up.");
const old = pickup("2026-08-01");
eq(whyNoPickup(old), null);
eq(onTheBooksAWeekAgo(now, young), null);
eq(onTheBooksAWeekAgo(now, old), 91 - 3 - 1); // the server's 91, less the server's own last7 for October's nights only
eq(pickupNote(today, whyNoPickup(old)), "New 1 day, 7 days and 30 days: how many of the rooms sold for that night were booked in that long, counted back from 11 Oct 2026, the property's own day.");
eq(pickupNote("", null), "New 1 day, 7 days and 30 days: how many of the rooms sold for that night were booked in that long.");

/* A date's card, as the picture's 17 Oct. */
eq(dateLines(days[4]!, young), [
  ["Days out", "6"], ["Rooms left", "17"], ["Of", "17"], ["Sold", "0.0%"],
  ["New 1 day", "-"], ["New 7 days", "-"], ["New 30 days", "-"],
]);
eq(dateLines(days[0]!, null)[0], ["Days out", "Tonight"]);
eq(dateLines(days[1]!, old).slice(4), [["New 1 day", "0"], ["New 7 days", "3"], ["New 30 days", "4"]]);

/* Rivals' prices: a night nobody checked is a dash; the middle keeps its paise. */
const night: CheckedNight = { date: "2026-10-13", checkedAt: "2026-10-12T12:00:00.000Z", hotels: [
  { name: "Hotel Sai", price: 3500, source: "Booking.com" },
  { name: "Swami Lodge", price: 2199.5, source: null },
  { name: "Akkalkot Inn", price: 3499, source: "Agoda" },
  { name: "Datta Residency", price: 4200, source: null },
] };
eq(nearbySummary(night), { lowest: 2199.5, middle: 3499.5, count: 4, checkedAt: "2026-10-12T12:00:00.000Z" });
eq(nearbySummary({ ...night, hotels: night.hotels.slice(0, 3) })?.middle, 3499);
eq(nearbySummary(undefined), null);
eq(nearbySummary({ ...night, hotels: [] }), null);
eq(nearbyLine(night, false), "Nearby: lowest ₹2,199.50, middle ₹3,499.50 (4 hotels, checked 12 Oct 2026)");
eq(nearbyLine({ ...night, hotels: night.hotels.slice(0, 1) }, false), "Nearby: lowest ₹3,500, middle ₹3,500 (1 hotel, checked 12 Oct 2026)");
eq(nearbyLine(undefined, false), "Nearby: -");
eq(nearbyLine(night, true), "Nearby: could not be read.");
eq(rivalPrice(night.hotels[0]!), "₹3,500 on Booking.com");
eq(rivalPrice(night.hotels[1]!), "₹2,199.50");

console.log("revenue outlook: ok");
