/* Run: node --experimental-strip-types src/modules/finance/books.check.ts
   Folios, Invoices, Payments and an invoice's page: every figure the
   server's, counted never summed, the API's sentences, every write refused
   offline in the web's words (books.ts). */
import { instant } from "../../core/format.ts";
import { ruleFor } from "../../core/offline.ts";
import {
  BOOK_READS, BOOK_WRITES, amountInWords, balanceShown, cancellable, creditable, groupBalance, groupBills, halfLabel,
  invoiceFacts, issuedState, methodCounts, openCounts, openFolios, openPill, overpaidBanner, overpaidNote, owingNote,
  placeLine, readyToBill, reversedNote, shownLine, signed, supplyLine, vatState, whyNotCancelVat, whyNotCreditNote,
  whyNotIssueYet, whyNotReadBills, whyNotReadPayments, type BillableRow, type InvoiceDetail, type PaymentRow,
} from "./books.ts";

const eq = (got: unknown, want: unknown, what: string) => {
  if (JSON.stringify(got) !== JSON.stringify(want)) throw new Error(`${what}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
};

/* ── Folios: the server's balance on each row, its order, nothing added ── */
const folios = [
  { stayId: "s-over", balance: -784.5 },
  { stayId: null, balance: 3150.2, groupId: "g-1", group: "Kulkarni wedding" },
  { stayId: "s-owe", balance: 7582.5 },
  { stayId: "s-gone", balance: 10 }, // its stay was not sent: left out, as the web
  { stayId: "s-small", balance: 0.2 },
];
const stays = [{ id: "s-owe", guest: "Omkar" }, { id: "s-small", guest: "Priya" }, { id: "s-over", guest: "Vikram" }];
eq(openFolios(folios, stays).map((r) => [r.id, r.balance]), [["s-over", -784.5], ["s-small", 0.2], ["s-owe", 7582.5]], "each stay's own balance, overpaid first");
eq(groupBills(folios), [{ groupId: "g-1", group: "Kulkarni wedding", balance: 3150.2 }], "a group's master bill once, under its name");
eq(openCounts([-784.5, 3150.2, 7582.5, 0.2]), { open: 4, owing: 3, overpaid: 1 }, "counted, not summed");
eq(openPill(0), { label: "0 open", tone: "success" }, "nothing open");
eq(openPill(12), { label: "12 open", tone: "warning" }, "twelve open");
eq([owingNote(1), owingNote(12)], ["1 folio owing", "12 folios owing"], "owing note");
eq([overpaidNote(0), overpaidNote(1), overpaidNote(2)], ["Nothing to refund", "1 refund due", "2 refunds due"], "overpaid note");
eq(overpaidBanner(2), "2 guests overpaid", "the banner, without the browser's sum");

/* MEMORY 9: to the paisa, never rounded, never clamped; a dash only for "not sent". */
eq(balanceShown(7582.5), { text: "₹7,582.50", over: false, tone: "owes" }, "owed, to the paisa");
eq(balanceShown(0.2), { text: "₹0.20", over: false, tone: "owes" }, "twenty paise owed is owed");
eq(balanceShown(-784), { text: "₹784.00", over: true, tone: "credit" }, "overpaid says over, never ₹0");
eq(balanceShown(0), { text: "₹0.00", over: false, tone: "settled" }, "a real zero is a figure");
eq(balanceShown(undefined), { text: "-", over: false, tone: "none" }, "not sent is a dash");
eq(groupBalance(-1050), "−₹1,050.00", "a group in credit");

/* ── Payments: counted per way of paying, reversals out, nothing added ── */
const pay = (method: string, amount: number, reversed = false): PaymentRow =>
  ({ id: `${method}${amount}`, businessDate: "2026-10-11", at: "2026-10-28 20:37:00.123456+05:30", guest: "G", roomNumber: "203", reference: "R", method, description: "", amount, user: null, reversed });
const receipts = [pay("Cash", 100), pay("UPI", 5000), pay("Cash", 0.5), pay("UPI", 99, true), pay("Cash", 7)];
eq(methodCounts(receipts), [{ method: "Cash", count: 3 }, { method: "UPI", count: 1 }], "receipts counted, the reversed one out");
eq(Object.keys(methodCounts(receipts)[0]!), ["method", "count"], "no amount is made on the phone");
eq(reversedNote(receipts)?.slice(0, 32), "1 receipt is marked Reversed. Th", "one reversed");
eq(reversedNote([pay("Cash", 1, true), pay("UPI", 1, true)])?.slice(0, 21), "2 receipts are marked", "two reversed");
eq(reversedNote([pay("Cash", 1)]), null, "none reversed, no note");
/* MEMORY 7: a receipt's time is Postgres's text; the phone reads it only through instant(), as ISO. */
eq(instant(receipts[0]!.at), "2026-10-28T20:37:00.123+05:30", "a receipt's time, as the phone's engine reads it");

/* ── Invoices ── */
const bill = (status: BillableRow["status"], invoice: string | null): BillableRow =>
  ({ folioId: "f", stayId: "s", reference: "R", guest: "G", roomNumber: "1", billTo: "G", nights: 1, charges: 3699, tax: 184.95, balance: 0, status, invoice });
eq(readyToBill([bill("settled", null), bill("settled", "5EL/2026-27/00001"), bill("outstanding", null), bill("settled", null)]), 2, "ready: settled and not yet invoiced");
eq(whyNotIssueYet("outstanding"), "The folio still carries a balance. Settle it, or transfer it to the city ledger, before invoicing.", "owing");
eq(whyNotIssueYet("overpaid"), "The folio is overpaid. Refund the difference before invoicing.", "overpaid");
eq(whyNotIssueYet("settled"), null, "settled may be issued");
eq(issuedState({ creditedBy: "5EL/2026-27/00009", isCreditNote: false }), { label: "credited", tone: "warning", note: "Cancelled by 5EL/2026-27/00009" }, "credited");
eq(issuedState({ creditedBy: null, isCreditNote: true }), null, "a credit note has no state");
eq(issuedState({ creditedBy: null, isCreditNote: false }), { label: "issued", tone: "success" }, "issued");
eq(vatState({ cancelledBy: "VAT/5EL/2026-27/0002", isCancellation: false })?.label, "cancelled", "a cancelled VAT bill");
eq(shownLine(50, 765), "50 of 765 shown", "paged");
eq(shownLine(12, 12), "12 shown", "all shown");

/* ── An invoice's page ── */
const inv: InvoiceDetail = {
  number: "5EL/2026-27/00001", finYear: "2026-27", issuedAt: "09 Oct 2026, 12:31", issuedBy: null, businessDate: "2026-10-09",
  supplier: { name: "5 Elements", address: "Main Road, Akkalkot", city: "Akkalkot", state: "MH", gstin: "27AAAAA0000A1Z5", fssai: null },
  stay: { reference: "FH-1", guest: "Priya", roomType: "Deluxe", room: null, grCardNo: null, adults: 1, children: 2, plan: null, nights: 0, arrival: "9 Oct 2026, 14:05", departure: "9 Oct 2026", source: null, checkedInBy: null, checkedOutBy: null },
  recipient: { name: null, gstin: null, address: null }, placeOfSupply: "Maharashtra", sacCode: "996311",
  lines: [{ description: "Dinner", category: "food", amount: 500, taxRate: 5, taxAmount: 25, date: "2026-10-09" }],
  taxableValue: 500, cgst: { rate: 2.5, amount: 12.5 }, sgst: { rate: 2.5, amount: 12.5 }, taxTotal: 25, total: 525,
  creditsInvoiceId: null, creditsNumber: null, reason: null, creditedBy: null,
};
const facts = invoiceFacts(inv, false);
eq(facts.left.map(([l]) => l), ["Booking ref", "G.R. card no", "Guest name", "Bill to", "Bill to GSTIN", "Source", "Place of supply", "FSSAI licence"], "the web's order, FSSAI on food");
eq(Object.fromEntries(facts.left)["Bill to GSTIN"], "not registered", "an unregistered recipient is stated");
eq(Object.fromEntries(facts.left)["G.R. card no"], "-", "no card is a dash");
eq(Object.fromEntries(facts.right), { "Business date": "9 Oct 2026", Room: "Deluxe / -", Persons: "1 adult · 2 children", "Rate type": "-", Nights: "Day use", Arrival: "9 Oct 2026, 14:05", Departure: "9 Oct 2026" }, "the stay's side");
eq(invoiceFacts(inv, true).left.some(([l]) => l === "Bill to GSTIN"), false, "no GSTIN on a test hotel's invoice");
eq(creditable(inv), true, "a live invoice may be credited");
eq(creditable({ creditsInvoiceId: "x", creditedBy: null }), false, "a credit note may not");
eq(creditable({ creditsInvoiceId: null, creditedBy: "5EL/2026-27/00002" }), false, "nor one already cancelled");
eq(cancellable({ cancelsNumber: null, cancelledBy: null }), true, "a live VAT bill may be cancelled");
eq([signed(true, 525), signed(false, 525)], [-525, 525], "a credit note's sign");
eq(halfLabel("CGST", null), "CGST", "mixed rates name none");
eq(halfLabel("SGST", 2.5), "SGST @ 2.5%", "one rate named");
eq(supplyLine("996311").includes("s.12(3)(b)"), true, "accommodation");
eq(supplyLine("996334").includes("s.12(3)(c)"), true, "a function");
eq(placeLine("Main Road, Akkalkot", "Akkalkot", "MH"), "Main Road, Akkalkot", "the place once");
eq(placeLine("Main Road", "Akkalkot", "MH"), "Main Road, Akkalkot, MH", "the place after");

/* The words, Indian numbering, paise apart, a credit note in minus. */
eq(amountInWords(12345678), "One Crore Twenty Three Lakh Forty Five Thousand Six Hundred Seventy Eight Rupees Only", "crore and lakh");
eq(amountInWords(7582.5), "Seven Thousand Five Hundred Eighty Two Rupees and Fifty Paise Only", "paise stated");
eq(amountInWords(1.01), "One Rupee and One Paisa Only", "the singulars");
eq(amountInWords(-525), "Minus Five Hundred Twenty Five Rupees Only", "a credit note");
eq(amountInWords(0), "Zero Rupees Only", "zero");
eq(amountInWords(null), "-", "not sent");

/* ── Who may: the API's sentences (roleGate.ts refusalFor over permissions.ts, 19 Nov) ── */
eq(whyNotReadBills("housekeeping"), "Reading bills is for the owner, an administrator, the general manager, the hotel manager, reception, the accountant or a viewer. Ask one of them.", "bills");
eq(whyNotReadBills("read_only"), null, "a viewer reads bills");
eq(whyNotReadPayments("revenue_manager"), "Reading payments and the cash drawer is for the owner, an administrator, the general manager, the hotel manager, reception, the accountant or a viewer. Ask one of them.", "payments");
eq(whyNotCreditNote("front_desk"), "Issuing a credit note is for the owner, an administrator, the general manager or the accountant. Ask one of them.", "reception credits");
eq(whyNotCreditNote("finance"), null, "the accountant credits");
eq(whyNotCancelVat("hotel_manager"), "Cancelling a VAT bill is for the owner, an administrator, the general manager or the accountant. Ask one of them.", "the hotel manager cancels");
eq(whyNotCancelVat(null), whyNotCancelVat("pos"), "nobody signed in is refused");

/* ── The writes: one segment for a number with slashes, refused offline in the web's words ── */
eq(BOOK_WRITES.creditNote("5EL", "5EL/2026-27/00001"), "/api/hotels/5EL/invoices/5EL%2F2026-27%2F00001/credit-note", "the number encoded, as the web");
eq(BOOK_READS.vatBill("5EL", "VAT/5EL/2026-27/0001"), "/api/hotels/5EL/vat-bills/VAT%2F5EL%2F2026-27%2F0001", "a VAT bill read");
const INVOICE = "An invoice cannot be raised offline. Its number comes from a statutory series, and two desks offline would issue the same one to different guests. Check the guest out and raise it when the connection is back.";
const UNLISTED = "This cannot be done offline yet. It has not been checked as safe to hold and send later, and guessing is how a guest gets charged twice.";
const credit = ruleFor(BOOK_WRITES.creditNote("5EL", "5EL/2026-27/00001"), "POST", JSON.stringify({ reason: "x" }));
eq([credit.tier, credit.reason], ["refuse", INVOICE], "a credit note is refused offline");
const vat = ruleFor(BOOK_WRITES.cancelVat("5EL", "VAT/5EL/2026-27/0001"), "POST", JSON.stringify({ reason: "x" }));
eq([vat.tier, vat.reason], ["refuse", UNLISTED], "a VAT bill's cancellation is refused offline");

console.log("finance books: all checks pass");
