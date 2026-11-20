/* Run: node --experimental-strip-types src/modules/reports/opsDoc.check.ts
   How the phone writes a report the server built (ReportView.tsx's rules), and its export. */
import {
  barLabel, cardOf, chartAxis, dateReport, dateTimeReport, dayWords, exportOf, factsLine, formatCell, layoutOf,
  monthWords, plusDays, plusMonths, printedAt, queryString, rangeWords, writeCell, type ReportDoc,
} from "./opsDoc.ts";

const eq = (got: unknown, want: unknown) => {
  if (JSON.stringify(got) !== JSON.stringify(want)) throw new Error(`got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
};
/* A phone's engine reads ISO only (MEMORY 7, 17): the check reads as Hermes does. */
const isoOnly = <T,>(fn: () => T): T => {
  const real = Date.parse;
  Date.parse = (text: string) => (/^\d{4}-\d{2}-\d{2}T/.test(text) ? real(text) : NaN);
  try { return fn(); } finally { Date.parse = real; }
};

/* A figure not held is a dash, never a zero; a real zero is a zero. */
eq(formatCell(null, "money"), "-");
eq(formatCell(undefined, "count"), "-");
eq(formatCell("", "text"), "-");
eq(formatCell(0, "money"), "₹0.00");
eq(formatCell(0, "count"), "0");
/* Paise kept, Indian grouping (MEMORY 9): never rounded to the rupee. */
eq(formatCell(7582.5, "money"), "₹7,582.50");
eq(formatCell(0.2, "money"), "₹0.20");
eq(formatCell(12345678.9, "rupees"), "₹1,23,45,678.90");
eq(formatCell(-1500, "money"), "-₹1,500.00");
eq(formatCell(29.4117, "percent"), "29.41%");
eq(formatCell(105.88, "percent"), "105.88%");
eq(formatCell(123456, "count"), "1,23,456");
eq(formatCell(1.666, "ratio"), "1.67");
/* A date as the eZee reports print it; words in a date column stay words. */
eq(formatCell("2026-08-25", "date"), "25/08/2026");
eq(formatCell("Total", "date"), "Total");
eq(dateReport("nonsense"), "-");
/* A moment in the property's time, from Postgres's own text, read as a phone reads it. */
eq(isoOnly(() => formatCell("2026-10-31 07:35:58.215147+05:30", "datetime")), "31/10/2026 07:35:58 AM");
eq(isoOnly(() => dateTimeReport("2026-10-31T13:05:00Z")), "31/10/2026 06:35:00 PM");
eq(isoOnly(() => dateTimeReport("2026-10-31T18:40:00Z")), "01/11/2026 12:10:00 AM");
eq(isoOnly(() => dateTimeReport("2026-10-31T06:30:00Z")), "31/10/2026 12:00:00 PM");
eq(isoOnly(() => formatCell("Walk-in", "datetime")), "Walk-in");

eq(factsLine([{ label: "As on Date", value: "2026-10-11", kind: "date" }, { label: "Currency", value: "INR", kind: "text" }]),
  "As on Date 11/10/2026   Currency INR");

/* A row whose unit is not its column's (the Manager report's Today holds money, counts and rates). */
const cols = [
  { key: "label", label: "Particulars", kind: "text" as const },
  { key: "today", label: "Today", kind: "money" as const },
  { key: "ptd", label: "PTD", kind: "money" as const },
  { key: "ytd", label: "YTD", kind: "money" as const },
];
eq(layoutOf(cols), "cards");
eq(layoutOf(cols.slice(0, 2)), "lines");
eq(cardOf({ kind: "row", unit: "count", cells: { label: "Rooms sold", today: 4, ptd: 31, ytd: null } }, cols), {
  title: "Rooms sold",
  figures: [
    { label: "Today", text: "4", missing: false, negative: false, numeric: true },
    { label: "PTD", text: "31", missing: false, negative: false, numeric: true },
    { label: "YTD", text: "-", missing: true, negative: false, numeric: true },
  ],
});
/* Negative money is red; a negative count is not money. */
eq(writeCell({ kind: "row", cells: { today: -20 } }, cols[1]!)!.negative, true);
eq(writeCell({ kind: "row", unit: "count", cells: { today: -2 } }, cols[1]!)!.negative, false);
/* A total leaves its empty words blank (no guest on a total); a row writes them as a dash. */
const words = { key: "guest", label: "Guest", kind: "text" as const };
eq(writeCell({ kind: "total", cells: { guest: null } }, words), null);
eq(writeCell({ kind: "row", cells: { guest: null } }, words)!.text, "-");
/* A grouped column carries its group's name, as the export writes it. */
eq(writeCell({ kind: "row", cells: { net: 100 } }, { key: "net", label: "Net Amt.", kind: "money", group: "CGST @2.5%" })!.label, "CGST @2.5% Net Amt.");
/* A band is its first cell only. */
eq(cardOf({ kind: "band", cells: { label: "Restaurant", today: 9 } }, cols), { title: "Restaurant", figures: [] });

/* The chart's axis and labels (ReportView's recharts). */
eq(chartAxis("percent", [23.53, 105.88]), [0, 20, 40, 60, 80, 100, 120]);
eq(chartAxis("money", [0, 3400, null]), [0, 1000, 2000, 3000, 4000]);
eq(chartAxis("count", [7]), [0, 2, 4, 6, 8]);
eq(chartAxis("count", [null, 0]), [0, 1, 2, 3, 4]);
eq(barLabel(17.65), "17.65");
eq(barLabel(null), "");

/* The words of the days. */
eq(dayWords("2026-10-11"), "11 Oct 2026");
eq(monthWords("2026-10"), "October 2026");
eq(rangeWords("2026-11-01", "2026-11-19"), "1 Nov 2026 to 19 Nov 2026");
eq(rangeWords("2026-11-19", "2026-11-19"), "19 Nov 2026");
eq(plusDays("2026-03-01", -1), "2026-02-28");
eq(plusMonths("2026-01", -1), "2025-12");
eq(plusMonths("2026-12", 1), "2027-01");
eq(queryString({ asOn: "2026-11-19", from: "2026-11-01" }), "?asOn=2026-11-19&from=2026-11-01");
eq(queryString({ year: 2026 }), "?year=2026");
eq(queryString({}), "");
eq(printedAt(new Date(2026, 9, 31, 19, 28, 14)), "31/10/2026, 07:28:14 pm");
eq(printedAt(new Date(2026, 9, 31, 0, 5, 9)), "31/10/2026, 12:05:09 am");

/* The export: the server's rows, written as the screen writes them; its total row where it put it,
   never a phone sum (the made-up total differs from the rows' sum on purpose - MEMORY 11). */
const doc: ReportDoc = {
  report: "item-sales", title: "Item sales", orientation: "portrait",
  property: { code: "5EL", name: "5 Elements", address: null, gstin: null },
  facts: [{ label: "From", value: "2026-11-01", kind: "date" }],
  sections: [{ key: "items", title: "Every item", columns: [{ key: "item", label: "Item", kind: "text" }, { key: "amount", label: "Amount", kind: "money" }],
    rows: [{ kind: "band", cells: { item: "Bar, Spirits" } }, { kind: "row", cells: { item: "Rum", amount: 150.5 } },
      { kind: "total", cells: { item: "Spirits, all items", amount: 999 } }] }],
  footnotes: ["Paid bills only."],
};
eq(exportOf(doc, "1 Nov 2026 to 19 Nov 2026"), {
  title: "Item sales", subtitle: "5 Elements · 1 Nov 2026 to 19 Nov 2026 · From 01/11/2026", note: "* Paid bills only.",
  columns: ["Item", "Amount"],
  rows: [["Bar, Spirits", ""], ["Rum", "₹150.50"], ["Spirits, all items", "₹999.00"]],
});
/* Sections of different columns: each line and its labelled figures. */
const mixed: ReportDoc = { ...doc, footnotes: [], sections: [
  { key: "a", title: "Room Charges", columns: cols, rows: [{ kind: "row", cells: { label: "Room Charges", today: 5800.61, ptd: null, ytd: 1 } }] },
  doc.sections[0]!,
] };
eq(exportOf(mixed, "x").rows[0], ["Room Charges", "Room Charges", "Today ₹5,800.61 · PTD - · YTD ₹1.00"]);
eq(exportOf(mixed, "x").note, undefined);
/* A chart alone (Monthly occupancy): its days and their figures; a day not held is a dash. */
const chartOnly: ReportDoc = { ...doc, sections: [], chart: { kind: "bar", title: "Monthly Occupancy", x: ["1", "2"], unit: "percent", series: [{ label: "Occupancy %", values: [23.53, null] }] } };
eq(exportOf(chartOnly, "October 2026").rows, [["1", "23.53%"], ["2", "-"]]);

console.log("reports opsDoc: all checks pass");
