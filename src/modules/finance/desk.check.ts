/* Run: node --experimental-strip-types src/modules/finance/desk.check.ts
   The finance desk's rules (desk.ts): the drawer, the deposits, the ledger, Form III, supplier dues.
   The data is chosen so the server's figure differs from any sum the phone could make (MEMORY 11). */
import {
  cardLines, cashTaken, closeState, closedWords, companyPaymentState, countBody, creditBody, depositActs, depositState, depositTitle,
  differenceText, differenceTone, dueGroups, duesTotals, filing, filingBody, formCPill, formCTable, guestLine, handedWords, isDay,
  lastClose, ledgerOwed, ledgerRows, ledgerTable, maskId, money, movementAmount, movementState, noteLine, openLabel, openingOf,
  owedPill, payBody, peopleWords, reverseBody, saveLabel, tally, unrecordedLine, varianceWords, whyNotClose, whyNotExport,
  whyNotPaySupplier, whyNotReadDeposits, whyNotReadDrawer, whyNotReadDues, whyNotReadFormC, whyNotRecordCompanyPayment,
  whyNotReverseCompanyPayment, whyNotRunDrawer, DASH, type CashierDrawer, type FormCRegister, type FormCRow, type ReportDoc,
  type SupplierDue, type SupplierDues,
} from "./desk.ts";

/* No node:assert, so the app's own type check reads this file too. */
const eq = (got: unknown, want: unknown, what: string) => {
  if (JSON.stringify(got) !== JSON.stringify(want)) throw new Error(`${what}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
};

/* ── Who may: the API's lists and sentences ── */
eq(whyNotRunDrawer("front_desk"), null, "reception runs a drawer");
eq(whyNotRunDrawer("read_only"), "Running the cashier's drawer is for the owner, an administrator, the general manager, the hotel manager, reception or the accountant. Ask one of them.", "a viewer reads, never runs (QA RO-4)");
eq(whyNotReadDrawer("read_only"), null, "a viewer reads the drawer");
eq(whyNotReadDrawer("housekeeping") !== null, true, "housekeeping does not");
eq(whyNotRecordCompanyPayment("front_desk"), null, "the desk records a company's payment (D27-239)");
eq(whyNotReverseCompanyPayment("front_desk"), "Reversing a company's payment is for the owner, an administrator, the general manager or the accountant. Ask one of them.", "only the four reverse (D27-125)");
eq(whyNotReadDeposits("front_desk"), "Cash deposits are for the owner, an administrator, the general manager, the accountant or a viewer.", "not reception (D27-191)");
eq(whyNotReadDeposits("hotel_manager") !== null, true, "not the hotel manager");
eq(whyNotReadFormC("finance"), "Reading guests' passport and ID details is for the owner, an administrator, the general manager, the hotel manager or reception. Ask one of them.", "the accountant does not read passports (D25-38)");
eq(whyNotReadDues("hotel_manager"), "What is owed to suppliers is for the owner, an administrator, the general manager or the accountant.", "DUES_ROLES");
eq(whyNotPaySupplier("finance"), null, "the accountant pays");
eq(whyNotRunDrawer(null) !== null, true, "nobody signed in is refused");
eq(whyNotExport("front_desk", "guests"), "A file of guests' details is for those who download reports: the owner, an administrator, the general manager, the hotel manager, the revenue manager or the accountant. Ask one of them.", "a file is for those who download reports");
eq(whyNotExport("finance", "money"), null, "the accountant downloads");

/* ── The drawer: counted, never assumed (D27-190) ── */
eq(openingOf({}), null, "nothing typed: no opening, never ₹0");
eq(openingOf({ 500: "  " }), null, "spaces are nothing typed");
eq(openingOf({ 10: "0" }), { opening: 0 }, "0 only when somebody types it");
eq(openingOf({ 500: "2", 20: "3" }), { opening: 1060 }, "the notes typed");
eq(openingOf({ 500: "-3", 200: "10" }), { problem: "A count is a whole number of notes or coins - zero or more." }, "a mistyped box never opens a drawer");
eq(openingOf({ 500: "2.5" }), { problem: "A count is a whole number of notes or coins - zero or more." }, "half a note");
eq(openLabel({}), "Count a float to open by hand", "the picture's words");
eq(openLabel({ 500: "4" }), "Open the drawer - ₹2,000.00", "the tally, to the paisa");
eq(saveLabel({ 2: "x" }), `Save the count - ${DASH}`, "a mistake has no tally");
eq(tally({ 5: "1", 2: "" }), 5, "a blank box adds nothing");
eq(noteLine(500, undefined), DASH, "a dash, not a zero, for a box not typed");
eq(noteLine(500, "0"), DASH, "nothing of it");
eq(noteLine(200, "3"), "₹600.00", "its value");
eq(countBody({}), null, "a count of nothing is not saved as ₹0");
eq(countBody({ 500: "3", 100: "", 50: "0" }), { denominations: [{ value: 500, count: 3 }, { value: 50, count: 0 }] }, "each typed box as typed, a blank not sent");
eq(JSON.stringify(countBody({ 500: "-3" })), '{"denominations":[{"value":500,"count":-3}]}', "a mistake is sent for the server to refuse (QA FI-10)");
eq(JSON.stringify(countBody({ 20: "abc" })), '{"denominations":[{"value":20,"count":null}]}', "not a number: sent, the server refuses it");
eq(handedWords(2000), "₹2,000.00 was handed to you: your drawer opens on it.", "the picture's sentence");
eq(handedWords(0), "Nothing was handed to you: your drawer opens at ₹0.", "nothing handed");
eq(cashTaken([{ method: "card", count: 2, amount: 900 }]), null, "no cash line: a dash, not ₹0");
eq(cashTaken([{ method: "cash", count: 1, amount: 785.5 }]), 785.5, "the server's cash line");
eq(movementAmount({ kind: "expense", amount: 120.5 }), "−₹120.50", "money out");
eq(movementAmount({ kind: "top_up", amount: 500 }), "+₹500.00", "money in");
eq(lastClose({ closedAt: "11 Oct, 23:10", counted: 3286.5, kept: 1000, handedTo: "Asha" }),
  "Your last shift closed 11 Oct, 23:10 with ₹3,286.50 counted: ₹1,000.00 kept for Asha, the rest to deposit.", "no subtraction on the phone");
eq(lastClose({ closedAt: "x", counted: 10, kept: null, handedTo: null }), "Your last shift closed x with ₹10.00 counted.", "a close from before the float");

/* The difference is the server's `variance`: here -120.50, which is not counted (1000) less expected (1100). */
const shift = (over: Partial<CashierDrawer>): CashierDrawer => ({
  id: "s", openedAt: "08:00", opening: 1000, receipts: [], movements: [], expected: 1100, counted: 1000, variance: -120.5,
  waiting: 0, varianceReason: null, denominations: [], ...over,
});
eq(varianceWords(null).title, "Nothing counted yet.", "nothing counted");
eq(varianceWords(0.004).title, "The drawer balances", "under a paisa balances");
eq(varianceWords(-120.5, 50), { tone: "warn", title: "Short by ₹120.50", lines: ["₹50.00 of it is paid out and waiting for a yes.", "This does not stop the handover. It has to be written down."] }, "the server's variance, never counted less expected");
eq(varianceWords(-30, 50).lines[0], "₹30.00 of it is paid out and waiting for a yes.", "no more than the shortage");
eq(varianceWords(12.25).title, "Over by ₹12.25", "over");
eq(whyNotClose(shift({ counted: null })), "Save the count first.", "no close before a count");
eq(whyNotClose(shift({})), null, "counted: it may close");

eq(closeState(shift({}), "", "", "").ok, false, "a blank float kept is not ₹0");
eq(closeState(shift({}), "0", "", "").needsReason, true, "short by 120.50: a reason");
eq(closeState(shift({}), "0", "", "").ok, false, "and it waits for it");
eq(closeState(shift({}), "0", "", "a note was short").body, { varianceReason: "a note was short", handOverTo: null, keptCash: 0 }, "₹0 kept needs no name");
eq(closeState(shift({ variance: -50, waiting: 50 }), "0", "", "").needsReason, false, "paid-outs waiting explain it (D27-242)");
eq(closeState(shift({ variance: 0 }), "1000.01", "u1", "").ok, false, "no more than the count");
eq(closeState(shift({ variance: 0 }), "-1", "u1", "").ok, false, "not below ₹0");
eq(closeState(shift({ variance: 0 }), "abc", "u1", "").ok, false, "not a figure");
eq(closeState(shift({ variance: 0 }), "400", "", "").needsName, true, "a float kept names the next person (D27-201)");
eq(closeState(shift({ variance: 0 }), "400", "", "").hint, "A float kept needs the next person's name: choose who takes it above.", "said");
eq(closeState(shift({ variance: 0 }), "400", "u1", "").body, { varianceReason: "", handOverTo: "u1", keptCash: 400 }, "sent as typed");
eq(closeState(shift({ variance: 0 }), "400", "u1", "").hint, "From ₹0 to the ₹1,000.00 counted. The rest is deposited.", "no 'to deposit' sum on the phone");
eq(closedWords("Asha", 2286.5), "Handed to Asha. To deposit: ₹2,286.50.", "the server's figure to deposit");
eq(closedWords(null, undefined), "Handed to nobody - the drawer is closed.", "nobody");
eq(movementState("expense", "120", "taxi", "").ok, false, "a paid-out needs its category (D27-370)");
eq(movementState("top_up", "500", "change", "").body, { kind: "top_up", amount: 500, reason: "change" }, "cash in needs none");
eq(movementState("withdrawal", "", "x", "").ok, false, "a blank amount is not sent");

/* ── Cash deposits ── */
const day = { date: "2026-10-10", points: [{ point: "Front desk", amount: 3286 }, { point: "Bar", amount: null }], toDeposit: 3286, deposited: 0, difference: 3286, explanation: null, red: true };
eq(differenceTone(day), "danger", "red until explained");
eq(differenceTone({ ...day, red: false, difference: 0 }), "success", "settled");
eq(differenceTone({ ...day, red: false, difference: null }), "plain", "unknown is not settled");
const dep = { id: "d", businessDate: "2026-10-09", amount: 157, depositedOn: "2026-10-10", bank: "State Bank of India, Akkalkot", slipNo: "DAY-1009-01",
  reversesId: null, reason: null, recordedBy: "Test GM", recordedAt: "13 Oct, 03:04", verifiedBy: null, verifiedAt: null, reversed: false, slipId: null };
eq(depositTitle(dep), "9 Oct 2026's cash · State Bank of India, Akkalkot · slip DAY-1009-01", "the picture's line");
eq(depositActs(dep, { canRecord: true, canVerify: false }), { verify: { why: "That is for the owner or the accountant." }, reverse: { why: null } }, "the GM sees Verify grey, with the server's words");
eq(depositActs({ ...dep, verifiedAt: "x" }, { canRecord: true, canVerify: true }), { verify: null, reverse: null }, "a verified deposit is never reversed");
eq(depositActs({ ...dep, reversesId: "e" }, { canRecord: true, canVerify: true }), null, "a reversal has no acts");
eq(depositState({ day: "2026-10-10", amount: "", depositedOn: "2026-10-11", bank: "SBI", slipNo: "1" }).ok, false, "every box");
eq(depositState({ day: "2026-10-10", amount: "3286.5", depositedOn: "2026-10-11", bank: "SBI", slipNo: "1" }).body?.amount, 3286.5, "the amount as typed");
eq([isDay("2026-02-29"), isDay("2028-02-29"), isDay("11/10/2026")], [false, true, false], "a day is a real YYYY-MM-DD");

/* ── Company accounts: the report's figures, its own Total ── */
const ledger: ReportDoc = { sections: [{ key: "accounts", rows: [
  { kind: "row", cells: { account: "A4 Test Traders", opening: 0, debit: 7768.4, credit: 0, closing: 7768.4 } },
  { kind: "row", cells: { account: "Agoda", opening: null, debit: 100, credit: 20, closing: 80 } },
  { kind: "total", cells: { account: "Total", closing: 7848.45 } },
] }] };
eq(ledgerRows(ledger)[1]!.opening, null, "a figure not sent is a dash, not the web's zero");
eq(ledgerRows(ledger)[0]!.closing, 7768.4, "to the paisa");
eq(ledgerOwed(ledger), 7848.45, "the server's total, not the rows added up (7848.40)");
eq(ledgerOwed({ sections: [] }), null, "no total sent: no figure");
eq(owedPill(7848.45), { tone: "warning", words: "₹7,848.45 owed" }, "the pill");
eq(owedPill(0)?.tone, "success", "nothing owed");
eq(ledgerTable(ledgerRows(ledger), 7848.45, "p").totals, ["Total", "", "", "", "₹7,848.45"], "the export's total is the server's");
const view = { businessDate: "2026-10-11", methods: { bank: "Bank transfer" }, accounts: [{ companyId: null, bookingSourceId: "b1", name: "Agoda" }], payments: [] };
eq(companyPaymentState(view, { account: "s:b1", amount: "0", receivedOn: "2026-10-11", method: "bank", reference: "", note: "" }).ok, false, "more than zero");
eq(companyPaymentState(view, { account: "s:b1", amount: "80", receivedOn: "2026-10-11", method: "bank", reference: "UTR1", note: "" }).body,
  { bookingSourceId: "b1", amount: 80, receivedOn: "2026-10-11", method: "bank", reference: "UTR1", note: "" }, "a booking site's payment");

/* ── Form III ── */
const row = (over: Partial<FormCRow>): FormCRow => ({
  reservationId: "r1", guestId: "g1", companion: false, guest: "A3 Test Smith", nationality: "GB", passport: "A1234567", room: "301",
  adults: 2, recorded: 1, children: 1, arrived: "2026-10-13", checkOut: "2026-10-16", status: "checked_in", arrivedAt: "2026-10-13 20:12",
  departedAt: null, dueBy: "14 Oct 2026, 20:12", departureDueBy: null, overdue: true, departureOverdue: false, arrivalNumbers: [],
  departureNumbers: [], filed: false, reference: null, ...over,
} as FormCRow);
const reg: FormCRegister = { note: "", premises: null, due: 1, overdue: 1, unrecorded: [{ room: "203", adults: 2, recorded: 1 }], rows: [row({})] };
eq(formCPill(reg), { tone: "danger", words: "1 overdue" }, "the picture's pill");
eq(formCPill({ ...reg, overdue: 0 }), { tone: "warning", words: "1 due" }, "due");
eq(unrecordedLine(reg), "Adults not recorded in house, each may be a foreigner: room 203 (2 adults, 1 recorded). Add them on the stay.", "the warning");
eq(peopleWords(1, 1), "1 adult, 1 recorded", "one adult");
eq(guestLine(row({})), "GB · room 301 · 3 in the room", "adults and children");
eq(filing([], true, "14 Oct 2026, 20:12"), { tone: "danger", pill: "overdue", words: "by 14 Oct 2026, 20:12" }, "overdue by the server's time");
eq(filing(["FRRO-1", "FRRO-2"], true, "x").words, "FRRO-1, FRRO-2", "filed: the portal's numbers");
eq(filingBody(row({ companion: true, guestId: "g2" }), "arrival", "  ABC123 "), { reference: "ABC123", kind: "arrival", guestId: "g2" }, "a companion's own row");
eq(filingBody(row({}), "departure", "D1"), { reference: "D1", kind: "departure" }, "the lead's");
eq(maskId("A1234567"), "XXXX4567", "a file never carries a passport whole");
eq(maskId(null), DASH, "none");
eq(formCTable(reg, "s").rows[0]![3], "XXXX4567", "the export masks it");
const card = cardLines(row({ purpose: "tourism" }), null, [["tourism", "Tourism"]]);
eq(card.find((l) => Array.isArray(l) && l[0] === "Purpose of visit"), ["Purpose of visit", "Tourism"], "the purpose's words");
eq(card.find((l) => Array.isArray(l) && l[0] === "Visa type"), ["Visa type", DASH], "a blank is a dash");
eq(card.find((l) => Array.isArray(l) && l[0] === "Length of stay"), ["Length of stay", "3 nights (booked), expected to leave 16 Oct 2026"], "the booking's nights");

/* ── Supplier dues: the server's totals rows ── */
const bill = (over: Partial<SupplierDue>): SupplierDue => ({
  id: "b1", supplierId: "s1", supplier: "A9 Test Kirana Bros", billNo: "KB-401", billDate: "2026-10-04", amount: "2152.50", dueOn: "2026-10-09",
  owed: "2152.50", paid: "0", tds: "0", credited: "0", status: "unpaid", replaces: null, from: { kind: "order", id: "o1", reference: "PO-5EL-2610-0005" },
  differences: [], payments: [], creditNotes: [], ...over,
});
const dues: SupplierDues = { today: "2026-10-11", suppliers: [], bills: [bill({}), bill({ id: "b2", supplierId: null, supplier: " Ravi Dairy " })],
  credits: [{ id: "n1", noteNo: "CN1", noteDate: "2026-10-05", amount: "100", issuedBy: "supplier", reason: "short", supplierId: "s1", supplier: "A9 Test Kirana Bros" }] };
eq(dueGroups(dues).map((g) => [g.name, g.bills.length, g.credits.length]), [["A9 Test Kirana Bros", 1, 1], [" Ravi Dairy ", 1, 0]], "by supplier, with its own credit notes");
const report: ReportDoc = { sections: [{ key: "owed", rows: [
  { kind: "band", cells: { supplier: "A9 Test Kirana Bros" } },
  { kind: "row", cells: { supplier: "Bill KB-401", owed: 2152.5 } },
  { kind: "total", cells: { supplier: "A9 Test Kirana Bros, owed", owed: 2052.55 } },
  { kind: "total", cells: { supplier: "Total owed", owed: 4204.1 } },
] }] };
eq(duesTotals(report).total, 4204.1, "Total owed: the server's");
eq(duesTotals(report).of("A9 Test Kirana Bros"), 2052.55, "a supplier's: the server's, not its bills less its credits");
eq(duesTotals(report).of("Ravi Dairy"), null, "none sent: a dash");
eq(duesTotals(null).total, null, "no report read: a dash");
eq(money("2152.50"), "₹2,152.50", "a figure as text, to the paisa");
eq(money(null), DASH, "none");
eq(differenceText({ lineId: "l", item: "Rice", unit: "kg", kind: "price", billed: "62.5", against: "60" }), "Rice: ₹62.50 a kg on the bill, ₹60.00 agreed", "a price difference");
const pay = { amount: "2152.50", method: "" as const, reference: "", paidOn: "2026-10-11", handedOverBy: "", withTds: false, section: "" as const, rate: "", tdsAmount: "", seen: false };
eq(payBody(bill({ differences: [{ lineId: "l", item: "Rice", unit: "kg", kind: "quantity", billed: "26", against: "25" }] }), pay).problem?.startsWith("Tick that you have seen"), true, "a bill that differs asks first");
eq(payBody(bill({}), pay).problem, "How was it paid? Cash, cheque, bank or UPI.", "how");
eq(payBody(bill({}), { ...pay, method: "upi" }).problem, "Type the cheque, UTR or UPI reference.", "a reference unless cash");
eq(payBody(bill({}), { ...pay, method: "cash", withTds: true, section: "194C", rate: "1" }).problem, "TDS is its section, rate and amount: all three.", "TDS whole");
eq(payBody(bill({}), { ...pay, method: "cash", amount: "1000.25" }).body?.amount, 1000.25, "the amount as typed");
eq(creditBody({ bill: null, supplierId: "s1" }, { issuedBy: "supplier", noteNo: "CN2", noteDate: "2026-10-11", amount: "50", reason: "returned" }).body?.supplierId, "s1", "against the supplier");
eq(reverseBody({ kind: "bill", id: "b1", what: "bill" }, "wrong", { billNo: "KB-402", billDate: "", amount: "10", dueOn: "" }).problem,
  "The right bill needs its number, date, amount and due date - or leave its number empty.", "the right bill whole");
eq(reverseBody({ kind: "payment", id: "p", what: "p" }, " typo ", { billNo: "", billDate: "", amount: "", dueOn: "" }).body, { kind: "payment", id: "p", reason: "typo", correct: null }, "a payment");

console.log("desk: all checks pass");
