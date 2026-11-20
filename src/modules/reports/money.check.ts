/* Run: node --experimental-strip-types src/modules/reports/money.check.ts
   The money and tax reports' rules: every figure the server's, paise kept,
   the server's own totals and nothing added; who may read; the periods. */
import {
  NO_TOTAL, accountNames, cFormTable, cashierTable, dayBookTable, docTable, guestLedgerTable, maskId, addMonths, bookFigure, cancelledLines, dateReport, dateTimeReport, docCards, factsLine,
  formatCell, methodLabel, monthWords, openDaysWords, queryString, quiet, rangeWords, unfiled, when, whyNot,
  type CFormRow, type DayBook, type ReportDoc,
} from "./money.ts";
import { GSTR1_FILE_REFUSED, NOT_YOURS, mayDownloadGstr1, whyNoFile, whyNotAccounting, whyNotRead } from "./moneyRoles.ts";

const eq = (got: unknown, want: unknown) => {
  if (JSON.stringify(got) !== JSON.stringify(want)) throw new Error(`got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
};
/* Hermes reads only ISO times (MEMORY 7, 17): so does this check. */
const isoOnly = <T>(fn: () => T): T => {
  const real = Date.parse;
  Date.parse = (text: string) => (/^\d{4}-\d{2}-\d{2}T/.test(text) ? real(text) : NaN);
  try { return fn(); } finally { Date.parse = real; }
};

/* ── A cell as the web writes it; paise kept (MEMORY 9) ── */
eq(formatCell(7767.9, "money"), "₹7,767.90");
eq(formatCell(0.2, "money"), "₹0.20"); // twenty paise, never "₹0"
eq(formatCell(-1234567.5, "rupees"), "-₹12,34,567.50"); // a credit note: negative, never clamped
eq(formatCell(null, "money"), "-");
eq(formatCell(0, "money"), "₹0.00"); // a real zero is a zero
eq(formatCell("", "text"), "-");
eq(formatCell(35.294, "percent"), "35.29%");
eq(formatCell(12345, "count"), "12,345");
eq(formatCell("2026-10-11", "date"), "11/10/2026");
eq(formatCell("Total", "date"), "Total");
eq(isoOnly(() => formatCell("2026-10-11T10:42:05Z", "datetime", "Asia/Kolkata")), "11/10/2026 04:12:05 PM");
/* Postgres's own text reaches the phone through the core's ISO reader. */
eq(isoOnly(() => dateTimeReport("2026-10-11 16:12:05.123456+05:30", "Asia/Kolkata")), "11/10/2026 04:12:05 PM");
eq(dateReport("11 Oct"), "-");
eq(factsLine([{ label: "Date From", value: "2026-10-11", kind: "date" }, { label: "Ignore zero balance account", value: "Yes", kind: "text" }]),
  "Date From 11/10/2026   Ignore zero balance account Yes");

/* ── The document as cards: the server's rows, its totals, nothing added ──
   The server's total (₹100.05) is NOT the sum of its rows (₹7,767.90 + ₹0.20),
   so a total worked out on the phone could not pass (MEMORY 11). */
const lodging: ReportDoc = {
  report: "lodging-tax", title: "Lodging tax", orientation: "landscape", footnotes: [],
  property: { code: "5EL", name: "5 Elements", address: null, gstin: null, timezone: "Asia/Kolkata" },
  facts: [],
  sections: [{
    key: "bills", title: "Check Out Bills",
    columns: [
      { key: "date", label: "Date", kind: "date" }, { key: "fromBill", label: "From Bill No.", kind: "text" },
      { key: "cgstNet", label: "Net Amt.", kind: "money", group: "CGST" }, { key: "cgstTax", label: "Tax Amt.", kind: "money", group: "CGST" },
      { key: "service", label: "Service Charges", kind: "money" }, { key: "nights", label: "Nights", kind: "money" },
    ],
    rows: [
      { kind: "band", cells: { date: "Fidato Restaurant, 11/10/2026" } },
      { kind: "row", cells: { date: "2026-10-10", fromBill: "5EL/2026-27/00001", cgstNet: 7767.9, cgstTax: -170.72, service: null, nights: 3 }, unit: "count" },
      { kind: "row", indent: 1, cells: { date: "2026-10-11", fromBill: null, cgstNet: 0.2, cgstTax: 0, service: null, nights: 1 } },
      { kind: "total", cells: { date: "TOTAL", fromBill: null, cgstNet: 100.05, cgstTax: 9.99, service: null, nights: null } },
    ],
  }, { key: "none", title: "Nothing", columns: [{ key: "a", label: "A", kind: "text" }], rows: [], empty: "No bill in this month." }],
};
const cards = docCards(lodging);
eq(cards.length, 2);
eq(cards[0]!.items.map((i) => i.kind), ["band", "row", "row", "total"]); // exactly the server's rows, no row added
eq(cards[0]!.items[0], { kind: "band", text: "Fidato Restaurant, 11/10/2026" });
const first = cards[0]!.items[1]!;
if (first.kind === "band") throw new Error("a row");
eq(first.title, "10/10/2026");
eq(first.figures.map((f) => f.label), ["From Bill No.", "CGST Net Amt.", "CGST Tax Amt.", "Service Charges", "Nights"]); // the web's column order
/* A row's unit: "count" for the numeric columns of that row only. */
eq(first.figures.map((f) => f.text), ["5EL/2026-27/00001", "7,767.9", "-170.72", "-", "3"]);
const second = cards[0]!.items[2]!;
if (second.kind === "band") throw new Error("a row");
eq([second.indent, second.figures.map((f) => f.text)], [1, ["-", "₹0.20", "₹0.00", "-", "₹1.00"]]);
eq(second.figures.map((f) => f.missing), [true, false, false, true, false]);
const tot = cards[0]!.items[3]!;
if (tot.kind === "band") throw new Error("a total");
/* The server's own total, figure for figure; its blank words left out. */
eq([tot.title, tot.figures.map((f) => [f.label, f.text])],
  ["TOTAL", [["CGST Net Amt.", "₹100.05"], ["CGST Tax Amt.", "₹9.99"], ["Service Charges", "-"], ["Nights", "-"]]]);
eq(docCards({ ...lodging, sections: [{ ...lodging.sections[0]!, rows: [{ kind: "row", cells: { date: "2026-10-10", cgstTax: -5 } }] }] })[0]!.items[0],
  { kind: "row", indent: 0, figures: [
    { label: "From Bill No.", text: "-", missing: true, negative: false },
    { label: "CGST Net Amt.", text: "-", missing: true, negative: false },
    { label: "CGST Tax Amt.", text: "-₹5.00", missing: false, negative: true },
    { label: "Service Charges", text: "-", missing: true, negative: false },
    { label: "Nights", text: "-", missing: true, negative: false },
  ], title: "10/10/2026" });
eq([cards[1]!.items.length, cards[1]!.empty], [0, "No bill in this month."]);
eq(docCards({ ...lodging, sections: [{ key: "x", title: "X", columns: [], rows: [] }] })[0]!.empty, "Nothing to report.");

/* The statement's accounts: every one the City ledger names, and the one asked. */
const ledger = { ...lodging, sections: [{ key: "s", title: "S", columns: [], rows: [
  { kind: "row" as const, cells: { account: "A4 Test Traders" } }, { kind: "total" as const, cells: { account: "Total" } },
  { kind: "row" as const, cells: { account: "A4 Test Traders" } }, { kind: "row" as const, cells: { account: null } },
] }] };
eq(accountNames(ledger, "Expedia"), ["A4 Test Traders", "Expedia"]);
eq(accountNames(null), []);

/* The question, as getReport asks it. */
eq(queryString({ asOn: "2026-10-11", from: "2026-10-11", ignoreZero: true }), "?asOn=2026-10-11&from=2026-10-11&ignoreZero=1");
eq(queryString({ from: "2026-10-01", asOn: "2026-10-11", account: "A & B" }), "?asOn=2026-10-11&from=2026-10-01&account=A%20%26%20B");
eq(queryString({}), "");

/* Periods. */
eq([monthWords("2026-10"), addMonths("2026-01", -1), addMonths("2026-12", 1), addMonths("2026-10", 0)],
  ["October 2026", "2025-12", "2027-01", "2026-10"]);
eq([rangeWords("2026-10-01", "2026-10-11"), rangeWords("2026-10-11", "2026-10-11")], ["1 Oct 2026 to 11 Oct 2026", "11 Oct 2026"]);

/* The lists. */
eq([methodLabel("card"), methodLabel("wallet")], ["Credit card", "wallet"]);
eq(unfiled([{ reference: "A1" }, { reference: null }, { reference: null }] as CFormRow[]), 2);
eq(when("2026-10-11 14:05"), "11 Oct 2026, 14:05");
eq(NO_TOTAL.includes("website"), true);

/* The accounting export. */
const ledgers = { ledgers: [], missing: ["Room rent", "CGST"] };
eq([whyNot("day-book-csv", undefined), whyNot("tally-prime-xml", undefined), whyNot("tally-erp9-xml", ledgers), whyNot("tally-prime-xml", { ledgers: [], missing: [] })],
  [null, "Reading the ledger names.", "Type these ledger names first: Room rent, CGST.", null]);
eq([bookFigure(12093.61), bookFigure(undefined), bookFigure(null), bookFigure(0)], ["₹12,093.61", "-", "-", "₹0.00"]);
const book = (over: Partial<DayBook["total"]>, openDays: string[] = []) => ({
  property: { code: "5EL", name: "5 Elements" }, businessDate: "2026-10-11", from: "2026-10-01", to: "2026-10-11", days: [], openDays,
  total: { room: 0, roomTax: 0, extra: 0, food: 0, otherExtra: 0, extraTax: 0, pos: 0, posTax: 0, discount: 0, alcohol: 0, vat: 0, sales: 0, tax: 0, receipt: 0, ...over },
}) as DayBook;
eq([quiet(book({})), quiet(book({ receipt: 0.01 })), quiet(book({ companyReceipt: 5 }))], [true, false, false]);
eq(openDaysWords(book({})), null);
eq(openDaysWords(book({}, ["2026-10-11"])), "The night audit has not run for 11 Oct 2026. Its figures are here and may still change. Today is 11 Oct 2026 at this property.");
eq(openDaysWords(book({}, ["2026-10-01", "2026-10-02"])), "The night audit has not run for 2 of these days, from 1 Oct 2026. Their figures are here and may still change. Today is 11 Oct 2026 at this property.");
const now = Date.parse("2026-11-19T06:00:00Z");
const undo = (undoneAt: string, backTo: string, lastDay: string) => ({ id: "u", backTo, lastDay, reason: "r", undoneBy: null, undoneAt, audits: 1 });
eq(isoOnly(() => cancelledLines([
  undo("2026-11-10 09:30:00.123456+05:30", "2026-11-08", "2026-11-09"),
  undo("2026-09-01T10:00:00Z", "2026-08-30", "2026-08-30"), // more than 60 days back
  undo("2026-11-18T10:00:00Z", "2026-11-17", "2026-11-17"),
], now)), [
  "Cancelled on 10 Nov 2026: Tally: if 8 Nov 2026 to 9 Nov 2026 were already imported into Tally, delete those days there and export them again once each is closed again.",
  "Cancelled on 18 Nov 2026: Tally: if 17 Nov 2026 was already imported into Tally, delete that day there and export it again once it is closed again.",
]);

/* ── Who may read: the API's own sentences (roleGate.ts refusalFor) ── */
eq(whyNotRead("city-ledger", "gm"), null);
eq(whyNotRead("city-ledger", "revenue_manager"), // D27-147: money owed and taken is not the revenue manager's
  "Reading money owed and taken is for the owner, an administrator, the general manager, the hotel manager, reception, the accountant or a viewer. Ask one of them.");
eq(whyNotRead("lodging-tax", "revenue_manager"), null);
eq(whyNotRead("tds", "stores"), "Reading what is owed to suppliers is for the owner, an administrator, the general manager or the accountant. Ask one of them.");
eq(whyNotRead("c-form", "finance") !== null, true);
eq(whyNotRead("commission", "revenue_manager"), null);
eq(whyNotRead("commission", "front_desk") !== null, true);
eq([mayDownloadGstr1("gm"), GSTR1_FILE_REFUSED.length > 0], [true, true]);
eq([whyNotAccounting("finance"), whyNotAccounting("hotel_manager"), whyNotAccounting(null)], [null, NOT_YOURS, NOT_YOURS]);

/* Taking it away: no way round the web's file rules (reportFiles.ts, listExports.ts). */
eq(whyNoFile("lodging-tax", "revenue_manager"), null);
eq(whyNoFile("lodging-tax", "front_desk"), "Downloading reports is for the owner, an administrator, the general manager, the hotel manager, the revenue manager or the accountant. Ask one of them.");
eq(whyNoFile("city-ledger", "hotel_manager"), null);
eq(whyNoFile("city-ledger", "read_only"), "Downloading this report is for the owner, an administrator, the general manager, the hotel manager or the accountant. Ask one of them."); // reads it, may not take it
eq([whyNoFile("tds", "finance"), whyNoFile("tds", "hotel_manager") !== null], [null, true]);
eq([whyNoFile("commission", "revenue_manager"), whyNoFile("commission", "hotel_manager") !== null], [null, true]);
eq(whyNoFile("cashier-shift", "front_desk"), "A file of money is for those who download reports: the owner, an administrator, the general manager, the hotel manager, the revenue manager or the accountant. Ask one of them.");
eq(whyNoFile("c-form", "front_desk")!.startsWith("A file of guests' details"), true);

/* The exports: the screen's cells, the server's totals rows only. */
const lt = docTable(lodging, "October 2026");
eq([lt.title, lt.subtitle, lt.columns.length, lt.totals], ["Lodging tax", "5 Elements · October 2026", 6, undefined]);
eq(lt.rows[0], ["Check Out Bills", "", "", "", "", ""]);
eq(lt.rows[1], ["Date", "From Bill No.", "CGST Net Amt.", "CGST Tax Amt.", "Service Charges", "Nights"]);
eq(lt.rows[2], ["Fidato Restaurant, 11/10/2026", "", "", "", "", ""]);
eq(lt.rows[5], ["TOTAL", "", "₹100.05", "₹9.99", "-", "-"]); // the server's total, as it sent it
eq(lt.rows.length, 11); // 2 sections: title, columns, rows (and the empty words), a blank line
eq(lt.rows[9], ["No bill in this month.", "", "", "", "", ""]);
eq([maskId("Z 1234567"), maskId("AB1"), maskId("12345")], ["XXXX4567", "XXX", "X2345"]);
const cf = cFormTable({ from: "", to: "", rows: [{ guest: "Ann", nationality: "UK", passport: "123456789", visaNumber: null, visaType: null, arrivedFrom: null,
  arrivedAt: "2026-10-11 14:05", purpose: null, departedAt: null, nextDestination: null, address: null, room: "101", arrived: "2026-10-11", departed: "2026-10-13",
  reference: null, departureReference: null }] }, "x");
eq([cf.rows[0]![2], cf.rows[0]![3], cf.rows[0]![6]], ["XXXXX6789", "-", "2026-10-11 14:05"]); // a passport never leaves whole
eq(cashierTable({ from: "", to: "", rows: [{ staffId: null, cashier: null, method: "upi", count: 9, amount: 38283.28 }] }, "x").rows, [["-", "UPI", "9", "₹38,283.28"]]);
const gl = guestLedgerTable({ from: "", to: "", rows: [{ folioId: "f", reference: "R1", guest: "G", room: "101", status: "in_house", opening: -0.5, charges: 10, payments: 0, closing: 9.5 }] }, "x");
eq([gl.rows[0]![4], gl.totals, gl.note], ["-₹0.50", undefined, NO_TOTAL]); // the web adds this list up in the browser: no total drawn
const db = dayBookTable({ ...book({ sales: 69130.85, receipt: 1 }), days: [{ date: "2026-10-11", room: 58003.61, roomTax: 2900.18, extra: 0, food: 680, otherExtra: 400, extraTax: 54,
  pos: 10047.24, posTax: 512.76, discount: 0, alcohol: 0, vat: 0, sales: 1, tax: 3466.94, receipt: 38782.28, closed: false }] }, "x");
eq([db.rows[0]![0], db.rows[0]![1], db.rows[0]![14], db.rows[0]![15]], ["11/10/2026", "₹58,003.61", "-", "Not run"]);
eq([db.totals![0], db.totals![11], db.totals![13], db.totals![14]], ["Total", "₹69,130.85", "₹1.00", "-"]); // the server's total, not the day's ₹1.00 summed
console.log("money: all checks pass");
