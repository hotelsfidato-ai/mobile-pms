/* Run: node --experimental-strip-types mobile/src/modules/finance/bill.check.ts
   A stay's bill: placed, never summed; the departure on the balance; a line's
   acts refused in the server's words; the server's sentences recognised. */
import {
  asksCredit, asksLateReason, asksPan, billName, closingWord, dateDay, editable, headline, inSections,
  chargesToCome, moveTargets, overLimit, owedLine, rupees, sectionOf, settleIsMain, startAmount, startBill, stillOutstanding,
  typedShown, whyNotEditLine, whyNotLeave, whyNotReverseLine, type BillLine, type StayFolio,
} from "./bill.ts";

const eq = (got: unknown, want: unknown, what: string) => {
  if (JSON.stringify(got) !== JSON.stringify(want)) throw new Error(`${what}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
};

const line = (o: Partial<BillLine>): BillLine => ({
  id: "1", folioId: "f1", billTo: "guest", company: null, businessDate: "2026-10-14", category: "room",
  description: "Room 204", amount: 3000, tax: 360, kind: "charge", reversed: false, user: "Asha", ...o,
});

/* Placed by what it was billed under (sections.ts): VAT is the bar, an early fee the room's. */
eq(sectionOf({ category: "beverage", scheme: "vat" }), "bar", "alcohol");
eq(sectionOf({ category: "misc", source: "late_checkout" }), "room", "late fee");
eq(sectionOf({ category: "misc", source: "front_desk" }), "other", "an old fee");
eq(sectionOf({ category: "food" }), "restaurant", "food");

/* A reversal right under its line; payments apart; nothing added up. */
const bill = inSections([
  line({ id: "a" }),
  line({ id: "p", category: "payment", kind: "payment", amount: -500, tax: 0 }),
  line({ id: "b", category: "food", amount: 200, tax: 10, reversed: true }),
  line({ id: "c", category: "food", kind: "reversal", reversalOf: "b", amount: -200, tax: -10 }),
  line({ id: "d", category: "discount", amount: -100, tax: 0 }),
]);
eq(bill.sections.map((s) => [s.title, s.lines.map((l) => l.id)]),
  [["Room", ["a"]], ["Restaurant", ["b", "c"]], ["Other charges and adjustments", ["d"]]], "sections");
eq(bill.payments.map((l) => l.id), ["p"], "payments");
eq(Object.keys(bill.sections[0]!).sort(), ["key", "lines", "title"], "a section carries no total of the phone's");
eq(inSections([], ["room"]).sections.map((s) => s.key), ["room"], "room kept for charges to come");

/* The headline: no bill is a dash and its own words (D17-16). */
eq(headline(null), { label: "Balance", pill: "No bill yet", tone: "neutral" }, "no bill");
eq(headline(1890).pill, "Outstanding", "owing");
eq(headline(-784).pill, "Overpaid", "overpaid");
eq(headline(0).pill, "Settled", "settled");
eq(closingWord(null), "Balance", "closing, no bill");
eq(headline(-1001, true), { label: "Balance", pill: "Charges to come", tone: "neutral" }, "D27-199: never Overpaid over nights to come");
eq(closingWord(-1001, true), "Balance", "the closing row too");
const running = { status: "in-house", isComplimentary: false, offeredTariff: 3000 };
eq(chargesToCome(running, 2), true, "nights to come");
eq(chargesToCome(running, 0), false, "none");
eq(chargesToCome({ ...running, isComplimentary: true }, 2), false, "complimentary");
eq(chargesToCome({ ...running, status: "checked-out" }, 2), false, "gone");
eq(rupees(null), "-", "a dash, never ₹0");
eq(rupees(1234567.5), "₹12,34,567.50", "Indian grouping, to the paisa");
eq(rupees(0), "₹0.00", "a real zero is a figure");
eq(rupees(7582.5), "₹7,582.50", "the server's paise kept, never rounded (MFIN-4)");
eq(rupees(Number.NaN), "-", "not a number is a dash");
eq(dateDay("2026-08-25"), "25 Aug 2026", "the web's date");

/* Check out on the balance (rules.ts canCheckOut). */
eq(whyNotLeave("in-house", 1890), "₹1,890.00 is still owed on this bill.", "owing");
/* Twenty paise blocks it, as the web - and the phone says twenty paise, where the web's money() says "₹0" (MFIN-4). */
eq(whyNotLeave("in-house", 0.2), "₹0.20 is still owed on this bill.", "paise owed");
eq(whyNotLeave("due-out", -10), "This bill is overpaid. Refund the difference first.", "overpaid");
eq(whyNotLeave("due-out", 0), null, "settled");
eq(whyNotLeave("in-house", null), null, "no bill owes nothing");
eq(whyNotLeave("due-in", 0), "This guest is not in house.", "not arrived");
eq(whyNotLeave("checked-out", 0), "Already checked out.", "gone");
eq(settleIsMain("in-house", 10), true, "settle while owed");
eq(settleIsMain("due-in", 10), false, "not before arrival");
eq(settleIsMain("in-house", 0), false, "then check out");

/* A line's acts, in the server's words. */
eq(whyNotReverseLine(line({ reversed: true })), "That posting has already been reversed.", "twice");
eq(whyNotReverseLine(line({ kind: "reversal", reversalOf: "x" })), "A reversal cannot itself be reversed.", "a reversal");
eq(whyNotReverseLine(line({ dayClosed: true })), "This day is closed - correct it on Closed days.", "closed charge");
eq(whyNotReverseLine(line({ dayClosed: true, category: "payment", kind: "payment" })),
  "This day is closed. Its payments, refunds and discounts are not changed - put the difference right today.", "closed payment");
eq(whyNotReverseLine(line({ invoice: "5EL/2026-27/00001" })), "This bill has tax invoice 5EL/2026-27/00001. Only a credit note corrects it now.", "invoiced");
eq(whyNotReverseLine(line({ invoice: "5EL/2026-27/00001", category: "payment", kind: "payment" })), null, "a payment on an invoiced bill");
eq(whyNotReverseLine(line({})), null, "open charge");
eq(whyNotEditLine(line({ dayClosed: true })), "This day is closed - correct it on Closed days.", "edit closed");
eq(editable(line({ category: "discount" })), false, "no pencil on a discount");
eq(editable(line({ kind: "payment", category: "payment", amount: -5 })), false, "no pencil on a payment");
eq(editable(line({})), true, "a charge");

const folios: StayFolio[] = [
  { id: "f1", billTo: "guest", companyId: null, company: null, status: "open", balance: 10, lines: 2 },
  { id: "f2", billTo: "company", companyId: "c", company: "Tata", status: "open", balance: 5, lines: 1 },
  { id: "f3", billTo: "company", companyId: "d", company: "Infy", status: "closed", balance: 0, lines: 0 },
];
eq(moveTargets(line({}), folios).map((f) => f.id), ["f2"], "move to the other open bill");
eq(moveTargets(line({ kind: "payment", category: "payment" }), folios), [], "a payment stays");
eq(billName(folios[1]), "Tata", "company bill");
eq(billName(folios[0]), "Guest", "guest bill");

/* Rule 159 by the method's kind, above ₹1,00,000 only. */
eq(asksPan("cash", 100000), false, "₹1,00,000 exactly");
eq(asksPan("cash", 100000.01), true, "above");
eq(asksPan("card", 500000), false, "card");

/* The server's sentences, as it says them (postings.ts, creditLimit.ts, operations.ts). */
eq(asksCredit("This is ₹1,000.00 more than the bill; it will be held as the guest's credit."), true, "credit");
eq(asksCredit("A payment must be greater than zero."), false, "not credit");
eq(overLimit("Tata is over its credit limit by ₹12,000.00."), true, "over limit");
eq(asksLateReason("Check-out was 11:00. A late departure needs a reason and somebody to allow it, and carries a ₹1,000 charge."), true, "late");
eq(stillOutstanding("₹1,180 is still outstanding. Settle the folio, or transfer it to the city ledger, before checking out."), true, "outstanding");

/* Settle's figures: the server's balance as sent, never clamped (MFIN-4). */
eq(owedLine(1890.5), "₹1,890.50 outstanding", "owing");
eq(owedLine(-784), "₹784.00 overpaid", "an overpaid bill is overpaid, not ₹0 outstanding");
eq(owedLine(0), "₹0.00 settled", "settled is a real zero");
eq(owedLine(null), "-", "no bill is a dash");
eq(startAmount(1890.5), "1890.5", "the amount starts at the server's balance");
eq(startAmount(-784), "", "nothing owed: blank, never 0");
eq(startAmount(null), "", "no bill: blank");
eq(typedShown(""), null, "nothing typed is a dash");
eq(typedShown("abc"), null, "a word is a dash");
eq(typedShown("1500"), 1500, "typed");
eq(startBill(folios, null), "f1", "the first that owes");
eq(startBill(folios, "f2"), "f2", "the open tab");
eq(startBill([{ ...folios[0]!, balance: 0 }, { ...folios[1]!, balance: -5 }], null), "f1", "none owes: the first");
eq(startBill([], null), null, "no bill at all");

console.log("finance bill: all checks pass");
