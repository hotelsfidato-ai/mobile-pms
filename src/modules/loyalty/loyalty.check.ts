/* Run: node --experimental-strip-types src/modules/loyalty/loyalty.check.ts
   Loyalty's rules on a phone: every figure the server's, a dash for one
   not sent, a blank never 0, the buttons a row offers, the statement's
   words, the month stepper, one key per stay for Use points, and every
   loyalty write refused offline (no loyalty path is on the web's list). */
import { keyKeeper } from "../../core/keys.ts";
import { ruleFor } from "../../core/offline.ts";
import {
  adjustOf, dayOf, decimalOnly, digitsOnly, inHouseNote, lineWords, memberLine, monthOfDate, monthWords, NO_JOIN, NO_REDEEM,
  pointsText, rateBody, rateText, redeemKeys, rowActs, rulesLine, rupees, shiftMonth, signed, signedDigits, spendLabel,
  spendOf, wholeOf, type LoyaltyStay,
} from "./loyalty.ts";

const eq = (got: unknown, want: unknown, what: string) => {
  if (JSON.stringify(got) !== JSON.stringify(want)) throw new Error(`${what}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
};

/* A figure: the server's, in Indian grouping; a dash, never 0, when not sent. */
eq(pointsText(123456), "1,23,456", "points in lakh grouping");
eq(pointsText(0), "0", "a real zero balance is 0");
eq(pointsText(null), "-", "points not sent are a dash");
eq(pointsText(undefined), "-", "points missing are a dash");
eq(rupees(150000), "₹1,50,000", "a month's points in rupees");
eq(rupees(null), "-", "rupees not sent are a dash");
eq(signed(1200), "+1,200", "an earned line has its plus");
eq(signed(-500), "-500", "a used line its minus");
eq(signed(null), "-", "a line with no points is a dash");

/* The head's line: no name, no rate, as the picture says. */
eq(rulesLine({ name: null, pointsPer100: null }), "No programme name yet · no earn rate set: stays earn nothing", "nothing set");
eq(rulesLine({ name: "Fidato Rewards", pointsPer100: 2.5 }),
  "Fidato Rewards · 2.5 points per ₹100 before GST; 1 point is ₹1 off room charges", "a rate is shown as the server sent it, never rounded");

/* A blank is never 0. */
eq(wholeOf(""), null, "a blank is nothing, not 0");
eq(wholeOf("-"), null, "a lone minus is nothing");
eq(wholeOf("5-3"), null, "a minus inside is not a number");
eq(wholeOf("-200"), -200, "a minus in front is taken");
eq(spendOf(""), null, "Use points stays grey on a blank");
eq(spendOf("499"), null, "Use points is from 500 (L13)");
eq(spendOf("500"), 500, "500 is enough");
eq(spendLabel(""), "Use points", "no figure: Use points");
eq(spendLabel("0"), "Use points", "0: Use points");
eq(spendLabel("600"), "Use ₹600", "a figure: Use ₹600");
eq(adjustOf("0", "goodwill"), null, "an adjustment of 0 is refused");
eq(adjustOf("", "goodwill"), null, "a blank adjustment is not 0, it is nothing");
eq(adjustOf("-200", "  "), null, "an adjustment needs a reason");
eq(adjustOf("-200", "double earn"), -200, "minus to take, with a reason");
eq(digitsOnly("1,2a3"), "123", "Use points keeps digits");
eq(signedDigits("-1,0a0"), "-100", "the adjustment keeps digits and a minus");
eq(decimalOnly("2.5%"), "2.5", "the rate keeps digits and a point");
eq(rateBody(""), null, "an empty rate is none: nothing earns");
eq(rateBody("5..5"), "5..5", "a rate is sent as typed, the server refuses it in its words (never NaN, which JSON sends as null)");
eq(rateText(null), "", "no rate: an empty box");
eq(rateText(2.5), "2.5", "a rate: as sent");

/* A row's buttons: a role without the right sees them grey; a state leaves one out. */
const stay = (over: Partial<LoyaltyStay>) => ({ member: false, direct: true, ...over });
eq(rowActs(stay({}), true, true), [{ act: "join", label: "Join", refused: false }], "not a member: Join");
eq(rowActs(stay({}), true, false), [{ act: "join", label: "Join", refused: true }], "no customer edit: Join grey");
eq(rowActs(stay({ member: true }), true, true).map((a) => a.act), ["spend", "leave"], "a member on a direct stay: Use points, Leave");
eq(rowActs(stay({ member: true, direct: false }), true, true).map((a) => a.act), ["leave"], "a booking site's stay: no Use points (L14)");
eq(rowActs(stay({ member: true }), false, false), [
  { act: "spend", label: "Use points", refused: true }, { act: "leave", label: "Leave", refused: true },
], "the accountant: both grey");
eq(inHouseNote(true, true), null, "every right: no note");
eq(inHouseNote(false, false), `${NO_REDEEM} ${NO_JOIN}`, "neither: both sentences, the web's order");

/* The statement, as the card prints it. */
eq(lineWords({ kind: "redeem", reference: "5EL-0042", hotelName: "5 Elements", reason: null, undone: true }),
  "Used on 5EL-0042 at 5 Elements (taken off the bill again; points back)", "an undone use");
eq(lineWords({ kind: "adjust", reference: null, hotelName: "5 Elements", reason: "double earn", undone: false }),
  "Adjusted at 5 Elements - double earn", "an adjustment with its reason");
/* Postgres's own text and ISO alike, read as text (MEMORY 7). */
eq(dayOf("2026-10-11 07:35:58.215147+05:30"), "11 Oct 2026", "Postgres text");
eq(dayOf("2026-10-01T23:10:00.123+05:30"), "1 Oct 2026", "ISO");
eq(dayOf(""), "-", "no time: a dash");
eq(memberLine({ member: { since: "2026-09-30T10:00:00+05:30", hotelName: "5 Elements" } }),
  "Member since 30 Sep 2026, joined at 5 Elements", "a member's line");
eq(memberLine({ member: null }), "Not a member. The desk joins a guest on the Loyalty screen, with their yes.", "not a member");

/* The month. */
eq(monthOfDate(new Date(2026, 0, 31)), "2026-01", "the phone's own month");
eq(monthWords("2026-10"), "October 2026", "the month in words");
eq(shiftMonth("2026-12", 1), "2027-01", "December to January");
eq(shiftMonth("2026-01", -1), "2025-12", "January back to December");

/* Offline: no loyalty path is on the web's list, so each is refused (UNLISTED). */
for (const [path, method] of [
  ["/api/hotels/5EL/loyalty/rules", "PUT"],
  ["/api/hotels/5EL/loyalty/guests/g1/join", "POST"],
  ["/api/hotels/5EL/loyalty/guests/g1/leave", "POST"],
  ["/api/hotels/5EL/loyalty/stays/s1/redeem", "POST"],
  ["/api/hotels/5EL/loyalty/guests/g1/adjust", "POST"],
] as const) eq(ruleFor(path, method, "{}").tier, "refuse", `${method} ${path} is refused offline`);

/* One key per stay for Use points. */
let clock = 1000, n = 0;
const keys = redeemKeys(() => "dev-desk", () => keyKeeper({ now: () => clock, make: () => `k${++n}`, who: () => "dev-desk" }));
const path = "/api/hotels/5EL/loyalty/stays/s1/redeem";
const body = JSON.stringify({ points: 600 });
const first = keys.of("5EL", "s1").begin("POST", path, body);
keys.of("5EL", "s1").failed(first, 0);
clock += 10;
eq(keys.of("5EL", "s1").begin("POST", path, body).key, first.key, "tapped again before anything is known: the same key");
keys.of("5EL", "s1").failed(first, 0);
clock += 10;
keys.seen("5EL", keys.marks("5EL"), { stays: [{ id: "s2" } as LoyaltyStay] });
eq(keys.of("5EL", "s1").begin("POST", path, body).key, first.key, "a read that does not show the stay keeps the key");
keys.of("5EL", "s1").failed(first, 0);
clock += 10;
keys.seen("6TG", keys.marks("6TG"), { stays: [{ id: "s1" } as LoyaltyStay] });
eq(keys.of("5EL", "s1").begin("POST", path, body).key, first.key, "another hotel's read never lets it go");
keys.of("5EL", "s1").failed(first, 0);
clock += 10;
keys.seen("5EL", keys.marks("5EL"), { stays: [{ id: "s1" } as LoyaltyStay] });
eq(keys.of("5EL", "s1").begin("POST", path, body).key === first.key, false, "read again and shown: a new tap is a new key");
eq(keys.of("5EL", "s9") === keys.of("5EL", "s1"), false, "each stay its own keeper");

console.log("loyalty rules: all checks pass");
