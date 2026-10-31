/* Run: node --experimental-strip-types mobile/src/modules/front-desk/booking.check.ts
   The walk-in's price line, summary and button reasons, as BookingPage.tsx. */
import {
  assignReason, byContract, checkInReason, discountIn, gstinProblem, inclusive, phoneKey, priceLine, saveReason, summary, taxOn, worthAsking,
  type Reasons, type Tariff,
} from "./booking.ts";

const eq = (got: unknown, want: unknown, what: string) => {
  if (JSON.stringify(got) !== JSON.stringify(want)) throw new Error(`${what}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
};
const none = discountIn({ mode: "none", text: "", reason: "", promotion: null });
const tariff = (...totals: Array<number | null>): Tariff => ({ nights: totals.map((total, i) => ({ night: `n${i}`, total, unpriced: total === null ? "2 adults" : null })), total: null, unpriced: null });
const line = { rate: "", inclusive: false, comp: false };

/* The picture's own figures: ₹3,699.00 a night + ₹184.95 tax (5%). */
eq(priceLine(line, tariff(3699), null, none.off).nightly, 3699, "the calendar's price");
eq(taxOn(3699, 5), 184.95, "the tax a night");
eq(summary({ nightly: 3699, unpriced: null, differs: false }, 5, 1, false, null), { rate: 5, taxPerNight: 184.95, charges: 3699, tax: 184.95, due: 3883.95, noRule: false }, "the booking card");
eq(summary({ nightly: 3699, unpriced: null, differs: false }, 5, 2, false, 1000).due, 6767.9, "two nights less an advance");
eq(summary({ nightly: 2000, unpriced: null, differs: false }, 12, 3, true, null).charges, 2000, "a day use is one day");
eq(summary({ nightly: null, unpriced: "2 adults", differs: false }, 5, 1, false, null).due, null, "no price: a dash, never a total");
eq(summary({ nightly: 3699, unpriced: null, differs: false }, null, 1, false, null), { rate: null, taxPerNight: null, charges: 3699, tax: null, due: null, noRule: true }, "no tax rule");
eq(summary({ nightly: 0, unpriced: null, differs: false }, undefined, 1, false, null).due, 0, "complimentary: nothing to charge");

/* What a line costs. */
eq(priceLine({ ...line, comp: true }, tariff(3699), null, none.off).nightly, 0, "complimentary");
eq(priceLine(line, tariff(null), null, none.off), { nightly: null, unpriced: "2 adults", differs: false }, "the room type has no price for the party");
eq(priceLine(line, tariff(3000, 3500), null, none.off).differs, true, "the calendar differs later");
eq(priceLine({ ...line, rate: "4000" }, tariff(3000), null, none.off).nightly, 4000, "a typed rate wins");
const split = { ok: true as const, pre: 3809.52, rate: 5, total: 4000 };
eq(priceLine({ rate: "4000", inclusive: true, comp: false }, null, split, none.off).nightly, 3809.52, "a rate with GST in it: the server's split");
eq(priceLine({ rate: "4000", inclusive: true, comp: false }, null, undefined, none.off).nightly, null, "the split not read yet");
const contract: Tariff = { ...tariff(2500), contract: { id: "c", name: "Acme" }, note: null };
eq(byContract(line, contract), true, "priced by the contract");
eq(inclusive({ ...line, inclusive: true }, contract), false, "contract rates are before GST");
eq(priceLine(line, contract, null, none.off).contract, "Acme", "the contract is named");

/* The discount (D27-36). */
const hand = discountIn({ mode: "hand", text: "10", reason: "Regular", promotion: null });
eq([hand.off(3699), hand.problem], [3329.1, null], "10% by hand");
eq(discountIn({ mode: "hand", text: "11", reason: "x", promotion: null }).problem, "Over 10% only through a named promotion.", "over the cap");
eq(discountIn({ mode: "hand", text: "5", reason: " ", promotion: null }).problem, "Say why the discount is given.", "no reason");
eq(discountIn({ mode: "rupees", text: "500", reason: "x", promotion: null }).off(3699), 3199, "₹ off a night");
eq(discountIn({ mode: "promotion", text: "", reason: "", promotion: null }).problem, "Choose the promotion.", "no promotion");
eq(discountIn({ mode: "promotion", text: "", reason: "", promotion: { id: "p", name: "Monsoon", percent: 20, amount: null } }).off(1000), 800, "a promotion's percent");

/* GSTIN, and the keys asked about. */
eq(gstinProblem("27AAPFU0939F1ZV"), null, "the web's own sample");
eq(gstinProblem("27AAPFU0939F1ZX"), "That GSTIN is not right - a character is mistyped. Check it against the company's GST certificate.", "a mistyped check");
eq(gstinProblem("abc") != null, true, "not a GSTIN");
eq(phoneKey("+91 98765 43210"), "9876543210", "+91 is the same number");
eq(phoneKey("098765 43210"), "9876543210", "0 is the same number");
eq(phoneKey("99999"), null, "too short");
eq(worthAsking("", "a@b.co"), true, "an email");
eq(worthAsking("123", "a@b"), false, "nothing worth asking");

/* Why a button is grey, in the web's order. */
const ok: Reasons = {
  name: "Anil", phone: "", email: "", gstin: "", showCompany: true, sourceId: "s", dayUse: false, comp: false, rate: "", discountProblem: null,
  billTo: "guest", companyId: "", salesPick: "", salesOther: "", inclusiveRefused: null, advanceProblem: null, required: [], fields: {},
};
eq(saveReason(ok), null, "ready");
eq(saveReason({ ...ok, name: " " }), "Type the guest's name.", "no name");
eq(saveReason({ ...ok, required: ["phone"], fields: { phone: ["The phone number", ""] } }), "The phone number is needed for a booking at this hotel.", "a required field");
eq(saveReason({ ...ok, phone: "abc", sourceId: "" }), "\"abc\" is not a phone number. Type 10 to 15 digits, e.g. +91 98765 43210.", "the phone before the source");
eq(saveReason({ ...ok, sourceId: "" }), "Choose the booking source.", "no source");
eq(saveReason({ ...ok, dayUse: true }), "Type the day-use price.", "a day use with no price");
eq(saveReason({ ...ok, dayUse: true, comp: true }), null, "a complimentary day use");
eq(saveReason({ ...ok, billTo: "company" }), "Choose the company.", "no company");
eq(saveReason({ ...ok, salesPick: "__other" }), "Type the sales person's name.", "no sales person");
eq(assignReason(false, ""), "Pick a room.", "no room");
eq(assignReason(true, "201"), "A booking waiting for the hotel gets its room once it is confirmed.", "waiting");
const go = { waiting: false, arrivesToday: true, room: "201", roomsFailed: false, picked: { number: "201", allowed: true }, idBlocked: null, early: false, earlyReason: "" };
eq(checkInReason(go), null, "ready to check in");
eq(checkInReason({ ...go, picked: { number: "201", allowed: false, reason: "Not cleaned yet." } }), "Room 201: Not cleaned yet.", "a dirty room");
eq(checkInReason({ ...go, idBlocked: "Record the ID" }), "Record the ID", "the ID");
eq(checkInReason({ ...go, early: true }), "Say why the room is given early.", "early");
eq(checkInReason({ ...go, picked: undefined }), "Checking the room…", "not read yet");
eq(checkInReason({ ...go, arrivesToday: false }), "Check in now is for an arrival today.", "not today");

console.log("front-desk booking: all checks pass");
