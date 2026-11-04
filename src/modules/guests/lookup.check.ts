/* Run: node --experimental-strip-types src/modules/guests/lookup.check.ts
   The lookup's rules: the Guests list's words and its figures as the server
   sent them, Companies and agents' rows, groups and the web's own sums (in
   whole paise), Guest 360's lines, and the offers' keys and answer. The
   test data is chosen so a wrong rule gives a different answer (MEMORY 11):
   balances on both sides, paise a float would lose, a source in credit. */
import {
  agreed, backWords, byName, commissionWords, companyRows, contactLine, emailKey, groupLine, groupsOf, guestCount,
  joinedLine, lastStayWords, noOffersWords, offersWords, overlapTitle, owed, phoneKey, revenueWords, searchReady,
  sentWords, splitOf, stayDates, stayWord, whoLine, type CompanyRecord, type GuestRecord,
} from "./lookup.ts";
import { WRITES } from "./lookup.ts";
import { ruleFor } from "../../core/offline.ts";

const eq = (got: unknown, want: unknown, what: string) => {
  if (JSON.stringify(got) !== JSON.stringify(want)) throw new Error(`${what}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
};

/* ── Guests ── */
const guest = (name: string, more: Partial<GuestRecord> = {}): GuestRecord => ({
  id: name.toLowerCase(), name, stays: 1, nights: 1, lastStay: null, nextStay: null, totalSpend: 0, openBalance: 0,
  sources: [], possibleDuplicate: false, ...more,
});
const list = [guest("Imran Pillai"), guest("Tanvi Shah"), guest("Rahul Bose"), guest("Krishna Bose")];
eq(byName(list, "  bOSe ").map((g) => g.name), ["Rahul Bose", "Krishna Bose"], "part of the name, any case, trimmed");
eq(byName(list, "").length, 4, "no search: everyone");
eq(byName(list, "zz").length, 0, "nobody by that name");
eq(guestCount(list), "4 guests", "the pill");
eq(overlapTitle(1), "1 name has stays that overlap", "one name");
eq(overlapTitle(21), "21 names have stays that overlap", "many names");
eq(lastStayWords({ lastStay: "2026-08-28" }), "28 Aug 2026", "last stay, the web's d MMM yyyy");
eq(lastStayWords({ lastStay: null }), "first visit", "no stay yet");
eq(backWords({ nextStay: "2026-10-24" }), "back 24 Oct 2026", "a returning guest");
eq(backWords({ nextStay: null }), null, "nothing ahead");

/* A balance: owed red, in credit blue, nothing a dash - and paise kept. */
eq(owed(7582.5), { text: "₹7,582.50", tone: "owes", said: "₹7,582.50 owed" }, "owed, to the paisa (MEMORY 9)");
eq(owed(-1050), { text: "₹1,050", tone: "credit", said: "₹1,050 in credit" }, "in credit, its size, blue");
eq(owed(0.2).text, "₹0.20", "twenty paise is not nothing");
eq(owed(0), { text: "-", tone: "none", said: "nothing" }, "nothing owed: a dash");
eq(owed(null).text, "-", "not sent: a dash");

/* ── Companies and agents ── */
const row = (name: string, kind: CompanyRecord["kind"], revenue: number, openBalance: number, bookings = 1): CompanyRecord => ({
  id: name.toLowerCase(), name, kind, bookings, roomNights: bookings, revenue, openBalance, commissionPct: null,
});
const booked = [
  row("Agoda", "OTA", 10.1, 14079.07), row("Expedia", "OTA", 20.2, -500),
  row("Walk-in", "Direct", 50.35, 0.29), row("Walk-In", "Corporate", 19.35, 0),
];
const rows = companyRows(booked, [{ id: "c1", name: " agoda " }, { id: "c2", name: "A4 Test Traders" }]);
eq(rows.map((r) => [r.name, r.kind, r.hasRecord]), [
  ["Agoda", "OTA", true], ["Expedia", "OTA", false], ["Walk-in", "Direct", false], ["Walk-In", "Corporate", false],
  ["A4 Test Traders", "Corporate", true],
], "a record by name (any case, trimmed) stands behind a row; one with no booking is added under Corporate");
eq(rows[4]!.bookings === 0 && rows[4]!.revenue === 0 && rows[4]!.commissionPct === null, true, "an added company has nothing yet");
eq(companyRows(booked, undefined).length, 4, "the records not read: the bookings' rows alone");
eq(groupsOf(rows).map((g) => [g.kind, g.rows.length]), [["OTA", 2], ["Direct", 1], ["Corporate", 2]], "OTAs first");
eq(groupsOf(rows.filter((r) => r.kind !== "Direct")).map((g) => g.kind), ["OTA", "Corporate"], "an empty group is left out");

/* Sent to the paisa, as the server rounds. 10.1 + 20.2 is 30.299999999999997 as floats, and 0.29 × 100 is
   28.999999999999996: whole paise make them ₹30.30 and ₹14,079.36. */
eq(groupLine(rows.filter((r) => r.kind === "OTA")), "₹30.30 · 2 bookings", "a group's line, in whole paise");
const split = splitOf(rows)!;
eq(split.agent, 30.3, "through an agent");
eq(split.direct, 50.35, "direct");
eq(split.owedToUs, 14079.36, "owed to the property: only the sources that owe (Expedia's credit is not taken off)");
eq([split.agentPct, split.directPct], [30, 50], "each as a share of all revenue with a source (30.30 and 50.35 of 100)");
eq(splitOf([row("A4 Test Traders", "Corporate", 0, 0, 0)]), null, "no revenue: no tiles, nothing invented");
eq(splitOf([]), null, "nothing booked: no tiles");
eq(revenueWords({ bookings: 0, revenue: 0 }), "-", "no booking yet: a dash, not ₹0");
eq(revenueWords({ bookings: 3, revenue: 0 }), "₹0", "bookings that earned nothing: a real ₹0");
eq(revenueWords({ bookings: 2, revenue: 1043507.5 }), "₹10,43,507.50", "Indian grouping, paise kept");
eq(commissionWords({ commissionPct: null }), "-", "commission not held: a dash");
eq(commissionWords({ commissionPct: 0 }), "0%", "a zero commission is a statement");

/* ── Guest 360 ── */
eq(searchReady(" a "), false, "one letter asks nothing");
eq(searchReady("ab"), true, "two letters ask");
eq(contactLine({ phone: "9876543210", email: null }), "9876543210 · -", "a missing email is a dash");
eq(whoLine({ nationality: null, hasId: false, companies: [] }), "Nationality - · no ID on file", "nothing on file");
eq(whoLine({ nationality: "IN", hasId: true, companies: ["Infosys", "TCS"] }),
  "Nationality IN · an ID is on file · books under Infosys, TCS", "only that an ID is on file, never the ID");
eq(joinedLine({ joined: [] }), null, "nothing joined: no line");
eq(joinedLine({ joined: [{ id: "j", guestId: "g", name: "Imran P.", at: "" }] }), "Joined into this record: Imran P..", "the web's own full stop");
eq(stayWord("checked_in"), "In house", "the desk's words");
eq(stayWord("tentative"), "Waiting for the hotel", "a site's booking waiting");
eq(stayWord("on_hold"), "on hold", "an unknown state, readable");
eq(stayDates({ checkIn: "2026-08-12", checkOut: "2026-08-14" }), "12 Aug 2026 – 14 Aug 2026", "a stay's dates");
eq(sentWords({ at: "2026-10-31T07:35:58.215+05:30", channel: "whatsapp", kind: "pre_arrival_note", status: "sent", hotelName: "5 Elements" }),
  { day: "31 Oct 2026", what: "pre arrival note", how: "by whatsapp · sent · 5 Elements" }, "a message sent");

/* ── Offers ── */
eq(phoneKey("+91 98765 43210"), "9876543210", "+91 is one number");
eq(phoneKey("098765 43210"), "9876543210", "a leading 0 too");
eq(phoneKey("98765"), null, "under ten digits matches nobody");
eq(phoneKey("0000000000"), null, "all one digit matches nobody");
eq(emailKey("  A@B.In "), "a@b.in", "an email, trimmed, lower case");
eq(emailKey("  "), null, "a blank email is none");
const yes = { phones: ["9876543210"], emails: ["a@b.in"] };
eq(agreed(undefined, { phone: "9876543210", email: null, noOffers: [] }), null, "the yes list not read: not known");
eq(agreed(yes, { phone: "+91 98765 43210", email: null, noOffers: [] }), true, "a yes on the phone");
eq(agreed(yes, { phone: null, email: "A@b.in", noOffers: [] }), true, "a yes on the email");
eq(agreed(yes, { phone: "9123456789", email: "c@d.in", noOffers: [] }), false, "no yes: no offers");
eq(agreed(yes, { phone: "9876543210", email: null, noOffers: [{ id: "n", kind: "phone", value: "9876543210", at: "" }] }), false,
  "a no beside the yes: no offers");
eq(offersWords(null), "-", "not known: a dash");
eq(offersWords(false), "No offers are sent: this guest has not said yes.", "the web's words");
eq(noOffersWords({ id: "n", kind: "email", value: "a@b.in", at: "" }), "No offers to email a@b.in", "one no");

/* ── Offline: every write here is refused with the web's sentence, none held ── */
const UNLISTED = "This cannot be done offline yet. It has not been checked as safe to hold and send later, and guessing is how a guest gets charged twice.";
for (const [path, method] of [
  [WRITES.blacklist("5EL", "g1"), "POST"], [WRITES.blacklist("5EL", "g1"), "DELETE"], [WRITES.noOffers("5EL"), "POST"],
  [WRITES.noOffer("5EL", "n1"), "DELETE"], [WRITES.offersYes("5EL"), "POST"],
] as const) {
  const rule = ruleFor(path, method, "{}");
  eq([rule.tier, rule.reason], ["refuse", UNLISTED], `${method} ${path}: refused offline, the web's sentence`);
}
eq(WRITES.blacklist("5EL", "a/b"), "/api/hotels/5EL/crm/guests/a%2Fb/blacklist", "the id travels encoded");
eq(ruleFor("/api/hotels/5EL/guests/g1/vip", "POST").tier, "queue", "the web's one held guest write is VIP, which this module does not make");

console.log("guests lookup: all checks pass");
