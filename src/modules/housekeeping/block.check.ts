/* Run: node --experimental-strip-types mobile/src/modules/housekeeping/block.check.ts
   Out of service: the day stepper's dates, the form's rule, the body, the words. */
import { addDays, blockBody, blockSpan, reasonLabel, takenOut, whyNotTake, type BlockForm } from "./block.ts";

/* No node:assert, so the app's own type check reads this file too. */
const eq = (got: unknown, want: unknown) => {
  if (JSON.stringify(got) !== JSON.stringify(want)) throw new Error(`got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
};

/* The stepper: month ends, year ends, 29 February in a leap year and not. */
eq(addDays("2026-10-14", 1), "2026-10-15");
eq(addDays("2026-10-31", 1), "2026-11-01");
eq(addDays("2026-11-01", -1), "2026-10-31");
eq(addDays("2026-12-31", 1), "2027-01-01");
eq(addDays("2028-02-28", 1), "2028-02-29");
eq(addDays("2028-02-29", 1), "2028-03-01");
eq(addDays("2027-02-28", 1), "2027-03-01");
eq(addDays("2028-03-01", -1), "2028-02-29");
eq(addDays("2026-03-29", 1), "2026-03-30"); // a European clock change: still one day

/* The web's rule: sendable with a reason and a from; never to < from. */
const f: BlockForm = { reason: "out_of_order", from: "2026-10-14", to: null, note: "" };
eq(whyNotTake(f), null); // no end date is allowed
eq(whyNotTake({ ...f, to: "2026-10-14" }), null); // the web lets to = from
eq(whyNotTake({ ...f, to: "2026-10-20" }), null);
eq(whyNotTake({ ...f, to: "2026-10-13" }), "A block cannot end before it starts.");
eq(whyNotTake({ ...f, reason: "" }), "Why is the room coming out?");
eq(whyNotTake({ ...f, reason: "broken" }), "Why is the room coming out?"); // the API's list only
eq(whyNotTake({ ...f, from: "" }), "From which date?");

/* The body, as the web's blockRoom sends it. */
eq(blockBody({ ...f, note: "  Shower mixer leaking " }), { reason: "out_of_order", from: "2026-10-14", to: null, note: "Shower mixer leaking" });
eq(JSON.stringify(blockBody({ ...f, note: "   ", to: "2026-10-20" })), '{"reason":"out_of_order","from":"2026-10-14","to":"2026-10-20"}');

/* The words. */
eq(reasonLabel("house_use"), "NC");
eq(reasonLabel("out_of_service"), "Out of service");
eq(reasonLabel(null), "Out");
eq(blockSpan({ from: "2026-10-03", to: null }), "Saturday, 3 October 2026 – no end date");
eq(blockSpan({ from: "2026-01-01", to: "2026-09-26" }), "Thursday, 1 January 2026 – Saturday, 26 September 2026");
eq(takenOut("208", f, "2026-10-14"), { title: "Room 208 is out", body: "No return date set." });
eq(takenOut("208", { ...f, from: "2026-10-16", to: "2026-10-20" }, "2026-10-14"),
  { title: "Room 208 goes out on Friday, 16 October 2026", body: "Back on sale Tuesday, 20 October 2026." });
console.log("block: all checks pass");
