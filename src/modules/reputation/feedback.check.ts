/* Run: node --experimental-strip-types src/modules/reputation/feedback.check.ts
   Guest feedback (Feedback.tsx, mobile/m13-sales lane F): a part nobody
   scored is a dash, never a zero; the server's averages as it rounded them;
   months and moments from their digits; who may read it. */
import { moment } from "./rules.ts";
import {
  answerRef, FEEDBACK_REFUSED, monthWords, overallTone, overallWords, partsLine, score, whyNotFeedback,
} from "./feedback.ts";

const eq = (got: unknown, want: unknown, what: string) => {
  if (JSON.stringify(got) !== JSON.stringify(want)) throw new Error(`${what}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
};

/* ── A dash, never a zero ── */
eq(score(null), "-", "a part nobody scored that month is a dash");
eq(score(undefined), "-", "a part not sent is a dash");
eq(score(0), "0.0", "a real zero is not a dash (the server never sends one: scores are 1 to 5)");
eq(score(4.3), "4.3", "the server's average as it rounded it");
eq(score(4), "4.0", "one place, as the web");
eq(partsLine({ room: 4, cleanliness: null, food: 5, staff: 3 }), "Room 4 · Cleanliness - · Food 5 · Staff 3", "a part not scored");
eq(partsLine({ room: null, cleanliness: null, food: null, staff: null }), "Room - · Cleanliness - · Food - · Staff -", "nothing but overall");

/* ── The Overall pill: the server's `low` decides red, not the phone's sum of parts ── */
eq(overallTone({ low: true, overall: 5 }), "danger", "a 5 overall with a 1 in a part is low (the server's lowScore)");
eq(overallTone({ low: false, overall: 4 }), "success", "4 and up is green");
eq(overallTone({ low: false, overall: 3 }), "neutral", "a 3 is grey");
eq(overallWords({ overall: 3 }), "3 of 5", "the pill's words");
eq(answerRef({ reference: "FH-1042", roomNumber: "204" }), "FH-1042 · room 204", "the booking and the room");

/* ── Months from their digits, under any zone ── */
const tz = process.env.TZ;
for (const zone of ["UTC", "America/Los_Angeles", "Asia/Kolkata"]) {
  process.env.TZ = zone;
  eq(monthWords("2026-11"), "Nov 2026", `the month under ${zone}`);
  eq(monthWords("2026-01"), "Jan 2026", `January under ${zone} (a Date at local midnight slips to December west of UTC)`);
}
process.env.TZ = tz;
eq(monthWords("2026-13"), "-", "a month that is not one is a dash");
eq(moment("2026-11-18T21:05"), "18 Nov 2026, 9:05 PM", "answeredAt, the hotel's clock");

/* ── Who: the server's three ── */
eq(["owner", "admin", "gm"].map(whyNotFeedback), [null, null, null], "the owner, an administrator, the GM");
eq(["hotel_manager", "front_desk", "finance", "read_only", null].map(whyNotFeedback).every((x) => x === FEEDBACK_REFUSED), true,
  "the hotel manager, reception, the accountant, a viewer: the server's sentence");

console.log("feedback: all checks pass");
