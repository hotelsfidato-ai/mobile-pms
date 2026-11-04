/* Run: node --experimental-strip-types src/modules/banquet/rules.check.ts
   The banquet diary's rules: a dash never a zero, the server's figures as
   sent, which act shows in which state, and the bodies the web sends. */
import {
  billActs, billRows, choosePackage, clockText, confirmedWords, courseBody, courseWords, figure, fromToday, hallCount,
  mayCancel, mayChangeFood, mayConfirm, momentOf, moneyLines, orderWords, overfull, packageWords, priceAct, priceBody,
  registerBody, rupees, shift, statusOf, timeOf, usualHint, whenLabel, type CourseDraft, type Fn, type RegisterDraft,
} from "./rules.ts";

const eq = (got: unknown, want: unknown, what: string) => {
  if (JSON.stringify(got) !== JSON.stringify(want)) throw new Error(`${what}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
};

/* ── Dates and times: the property's clock, read as text ── */
eq(timeOf("2026-10-24T18:00"), "6:00 PM", "evening");
eq(timeOf("2026-10-24T00:05"), "12:05 AM", "just after midnight");
eq(timeOf("2026-10-24T12:30"), "12:30 PM", "noon");
eq(timeOf(null), "-", "no time is a dash");
eq(whenLabel("2026-10-24T18:00", "2026-10-24T23:00"), "24 Oct 2026, 6:00 PM → 11:00 PM", "one evening");
eq(whenLabel("2026-11-14T18:00", "2026-11-16T23:00"), "14 Nov 2026, 6:00 PM → 16 Nov 2026, 11:00 PM", "a three-day wedding");
eq(statusOf("confirmed").tone, "success", "confirmed is green");
eq(statusOf("enquiry").tone === statusOf("confirmed").tone, false, "an enquiry never shares a booking's colour");
eq(statusOf("odd").label, "Enquiry", "an unknown status reads as an enquiry");

/* ── The diary's head and a hall's line ── */
const ev = (status: string) => ({ status }) as never;
eq(confirmedWords({ from: "2026-10-11", to: "2026-11-10", venues: [{ id: "a", name: "Emerald", events: [ev("confirmed"), ev("enquiry")] }] }),
  "1 function confirmed between 11 Oct 2026 and 10 Nov 2026.", "one confirmed, the enquiry not counted");
eq(confirmedWords({ from: "2026-10-11", to: "2026-11-10", venues: [{ id: "a", name: "Emerald", events: [ev("enquiry")] }] }),
  "Nothing confirmed between 11 Oct 2026 and 10 Nov 2026.", "only enquiries");
eq(hallCount({ id: "a", name: "x", events: [] }), "nothing booked", "an empty hall is drawn");
eq(shift({ from: "2026-10-11", to: "2026-11-10" }, 30), { from: "2026-11-10", to: "2026-12-10" }, "later by thirty days");
eq(fromToday("2026-10-11"), { from: "2026-10-11", to: "2026-11-10" }, "from today");

/* ── Typed figures and times: blank is null, never 0 ── */
eq(figure(""), null, "blank is unpriced");
eq(figure("  "), null, "spaces are blank");
eq(figure("0"), 0, "0 typed is 0 (Free decides on the server)");
eq(figure("50000.50"), 50000.5, "paise kept");
eq(figure("abc"), "bad", "a word is not a figure");
eq(clockText("18:00"), "18:00", "24-hour");
eq(clockText("6:30"), "06:30", "one digit hour");
eq(clockText("6.30"), "06:30", "a dot for a colon");
eq(clockText("24:00"), null, "no 24th hour");
eq(clockText("18:60"), null, "no 60th minute");
eq(clockText("6pm"), null, "not a 24-hour time");
eq(momentOf("2026-11-14", "18:00"), "2026-11-14T18:00", "the web's datetime-local text");

/* ── Register ── */
const draft: RegisterDraft = {
  venueId: "v1", title: "Sharma sangeet", hostName: "Mr Sharma", hostPhone: "", fromDay: "2026-11-14", fromTime: "18:00",
  untilDay: "2026-11-14", untilTime: "23:00", pax: "", amount: "", free: false, notes: "",
};
eq(registerBody(draft), {
  venueId: "v1", title: "Sharma sangeet", hostName: "Mr Sharma", startsAt: "2026-11-14T18:00", endsAt: "2026-11-14T23:00",
  pax: null, agreedAmount: null, free: false,
}, "blank amount is UNPRICED (null), never 0; blank pax is null");
eq(registerBody({ ...draft, amount: "0", free: true })?.agreedAmount, 0, "Free sends 0");
eq(registerBody({ ...draft, untilTime: "" }), null, "no end: not ready (the module's whole question)");
eq(registerBody({ ...draft, venueId: "" }), null, "no hall: not ready");
eq(registerBody({ ...draft, amount: "fifty" }), null, "a word as the amount: not ready, never sent as unpriced");
eq(overfull({ seated: 200, floating: 300 }, "320"), 300, "more than the hall holds");
eq(overfull({ seated: 200, floating: null }, "150"), null, "fits");
eq(overfull({ seated: null, floating: null }, "999"), null, "a hall with no size gives no warning");
eq(usualHint(50000), "This hall's usual is ₹50,000. Leave blank if not yet agreed.", "the usual is offered");
eq(usualHint(null), "Leave blank if it is not agreed yet. It stays unpriced, not free.", "no usual");

/* ── One function: which act shows ── */
eq([mayConfirm({ status: "enquiry" }), mayConfirm({ status: "confirmed" })], [true, false], "confirm an enquiry only");
eq(["enquiry", "confirmed", "completed", "cancelled"].map((s) => mayCancel({ status: s as never })), [true, true, false, false], "a billed function is not cancelled");
eq(mayChangeFood({ status: "completed" }), false, "billed: price and courses fixed");
eq(priceAct({ agreedAmount: null }), "Set the hall price", "unpriced");
eq(priceAct({ agreedAmount: 0 }), "Change the hall price", "a free hall has a price");

const bill = { charges: 127500, tax: 22950, paid: 25000, balance: 125449.5 };
eq(billActs({ status: "confirmed", bill: null, invoice: null }), { advance: true, bill: true, settle: false, invoice: false, reopen: false }, "confirmed");
eq(billActs({ status: "completed", bill, invoice: null }), { advance: false, bill: false, settle: true, invoice: true, reopen: true }, "billed, owed");
eq(billActs({ status: "completed", bill: { ...bill, balance: -500 }, invoice: "5EL/2026-27/00001" }).settle, false, "paid ahead: nothing to settle");
eq(billActs({ status: "completed", bill, invoice: "5EL/2026-27/00001" }).reopen, false, "an invoice stands: only a credit note");
/* The balance is the server's: here it is not charges + tax - paid (MEMORY 11). */
eq(billRows({ status: "completed", bill }).map((r) => `${r.label} ${r.value}`),
  ["Billed ₹1,27,500", "GST ₹22,950", "Paid ₹25,000", "Balance ₹1,25,449.50"], "the server's figures, paise kept");
eq(billRows({ status: "confirmed", bill: { charges: 0, tax: 0, paid: 25000, balance: -25000.25 } }).map((r) => `${r.label} ${r.value}`),
  ["Charged so far ₹0", "GST ₹0", "Paid ₹25,000", "Paid ahead ₹25,000.25"], "an advance: paid ahead, never ₹0");
eq(billRows({ status: "confirmed", bill: null }), [], "nothing on the bill is no rows, not zeros");

const fn = (catering: unknown[], money: Fn["money"]) => ({ catering, money }) as unknown as Fn;
/* The total is the server's; the lines are not added up here. */
eq(moneyLines(fn([], { venue: 50000, food: 0, pos: null, total: 61000, unpriced: null })).map((l) => l.value),
  ["₹50,000", "-", "-"], "no catering is a dash, not ₹0 of food; no orders a dash");
eq(moneyLines(fn([{}], { venue: null, food: 0, pos: 0, total: null, unpriced: "The hall has no price." })).map((l) => l.value),
  ["-", "₹0", "₹0"], "an unpriced hall is a dash; a free course is ₹0");
eq(courseWords({ pax: 120, ratePerHead: 850, notes: null }), "120 plates · ₹850 each", "a course's parts");
eq(courseWords({ pax: 1, ratePerHead: null, notes: "Jain" }), "1 plate · no rate agreed · Jain", "no rate");
eq(orderWords({ outlet: null, table: "4", openedAt: "2026-10-24T19:10" }), "- · Table 4 · 24 Oct 2026, 7:10 PM", "an order with no outlet");

/* ── The hall price ── */
eq(priceBody("", false), { agreedAmount: null, free: false }, "an empty box clears the price");
eq(priceBody("45000", false), { agreedAmount: 45000, free: false }, "a price");
eq(priceBody("x", false), null, "not a figure: not sent");

/* ── Add a course ── */
const c0: CourseDraft = { packageId: "", name: "", heads: "120", rate: "", free: false, notes: "" };
const picked = choosePackage(c0, { id: "p1", name: "Dinner buffet", ratePerHead: 850 });
eq([picked.name, picked.rate, picked.free], ["Dinner buffet", "850", false], "a package offers its rate");
eq(choosePackage(c0, { id: "p0", name: "Tea", ratePerHead: 0 }).free, true, "a free package ticks Free");
eq(choosePackage({ ...c0, rate: "700" }, { id: "p2", name: "Lunch", ratePerHead: null }).rate, "700", "an unpriced package keeps what was typed");
eq(courseBody(picked), { packageId: "p1", name: "Dinner buffet", pax: 120, ratePerHead: 850, free: false }, "the course sent");
eq(courseBody({ ...picked, rate: "" })?.ratePerHead, null, "a rate can wait: null, never 0");
eq(courseBody({ ...picked, heads: "" }), null, "no plates: not ready (a blank is never a count)");
eq(courseBody({ ...picked, heads: "0" }), null, "zero plates: not ready");
eq(packageWords({ name: "Dinner buffet", ratePerHead: 850 }), "Dinner buffet · ₹850 a head", "the picker's words");
eq(packageWords({ name: "Lunch", ratePerHead: null }), "Lunch", "an unpriced package has no figure");
eq(rupees(null), "-", "a dash");

console.log("banquet rules: all checks pass");
