/* dateField.ts. Run: node --experimental-strip-types src/core/dateField.check.ts
   Date.parse is made to throw here: the phone's engine reads only ISO (MEMORY 7, 17), and a day or a
   time must never go through it. The process is put in a zone behind UTC, so a slip from the UTC
   parts to the phone's local ones (getDate, getHours) shows: there a day's UTC midnight is still
   the day before. */
process.env.TZ = "America/New_York";
Date.parse = () => { throw new Error("Date.parse used: the phone's engine reads only ISO"); };
const {
  bounds, dateToDay, dateToTime, dayShown, dayToDate, hotelDay, inRange, isDay, isTime, opensOn, timeShown, timeToDate,
} = await import("./dateField.ts");

const eq = (got: unknown, want: unknown, what: string) => {
  if (JSON.stringify(got) !== JSON.stringify(want)) throw new Error(`${what}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
};

eq(isDay("2026-11-20"), true, "a day");
eq(isDay("2026-02-29"), false, "no 29 February in 2026");
eq(isDay("2028-02-29"), true, "a leap day");
eq(isDay("2026-11-20T00:00:00Z"), false, "a time is not a day");
eq(isDay("20/11/2026"), false, "the Indian way of writing is not the API's");
eq(isDay(""), false, "blank is not a day");
eq(isTime("07:05"), true, "a time");
eq(isTime("24:00"), false, "no 24:00");
eq(isTime("7:05"), false, "two digits for the hour, as the API's");

/* Round trips, whatever the zone. */
eq(dateToDay(dayToDate("2026-11-20")!), "2026-11-20", "a day there and back");
eq(dateToDay(dayToDate("2026-12-31")!), "2026-12-31", "the year's last day");
eq(dayToDate("2026-13-01"), null, "not a day: no Date");
eq(dateToTime(timeToDate("23:59")!), "23:59", "a time there and back");
eq(dateToTime(timeToDate("00:00")!), "00:00", "midnight");
/* The picker's answer: 20 November chosen while it showed UTC is that day's UTC midnight - even
   though in India (+05:30) that moment is 05:30 on the 20th, and a phone in New York calls it the 19th. */
eq(dateToDay(new Date(Date.UTC(2026, 10, 20))), "2026-11-20", "the day the picker showed, not the phone's");

/* The day a picker opens on: the hotel's, never the phone's. */
const hotel = { today: "2026-11-21", businessDate: "2026-11-20" };
eq(hotelDay(hotel), "2026-11-21", "the property's own date");
eq(hotelDay({ businessDate: "2026-11-20" }), "2026-11-20", "an older server: the business date");
eq(opensOn("", hotelDay(hotel)), "2026-11-21", "blank opens on the hotel's day");
eq(opensOn("2026-12-01", hotelDay(hotel)), "2026-12-01", "a value opens on itself");
eq(opensOn("", "2026-11-21", "2026-11-25"), "2026-11-25", "kept on or after min");
eq(opensOn("", "2026-11-21", undefined, "2026-11-10"), "2026-11-10", "kept on or before max");
eq(opensOn("", "2026-11-21", "2026-12-01", "2026-11-01"), "2026-12-01", "min after max: min wins, never a throw");
eq(inRange("2026-11-21", "2026-11-21", "2026-11-30"), true, "min itself is inside");
eq(inRange("2026-11-20", "2026-11-21"), false, "the day before min is outside");
eq(inRange("2026-12-01", undefined, "2026-11-30"), false, "the day after max is outside");
eq(bounds("2026-12-01", "2026-11-01"), {}, "min after max: no bounds (iOS would throw)");
eq(bounds("2026-11-01", "bad"), { min: "2026-11-01", max: undefined }, "a bound that is not a day is none");

eq(dayShown("2026-11-20"), "Fri, 20 Nov 2026", "a day as shown");
eq(dayShown("2026-02-30"), "2026-02-30", "not a day: shown as sent, never NaN");
eq(timeShown("07:05"), "7:05 AM", "morning");
eq(timeShown("12:30"), "12:30 PM", "noon");
eq(timeShown("00:15"), "12:15 AM", "after midnight");
console.log("core dateField: all checks pass");
