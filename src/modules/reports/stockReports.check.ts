/* Run: node --experimental-strip-types src/modules/reports/stockReports.check.ts
   The store, bar and supplier reports: each cell as the web prints it, each row
   a card of the server's figures, each report's question. */
import {
  asked, cardOf, exportOf, type ReportDoc, dateTimeReport, factsLine, formatCell, outcomeOf, printedStamp, queryText, refusedTitle, failedTitle,
  sectionCards, emptyWords, STOCK_REPORTS, webPath, type ReportColumn, type ReportSection,
} from "./stockReports.ts";

/* No node:assert, so the app's own type check reads this file too. */
const eq = (got: unknown, want: unknown) => {
  if (JSON.stringify(got) !== JSON.stringify(want)) throw new Error(`got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
};

/* ── A cell: a dash for nothing held, never 0; paise kept; the web's own rounding ── */
eq(formatCell(null, "money"), "-");
eq(formatCell(undefined, "count"), "-");
eq(formatCell("", "text"), "-");
eq(formatCell(0, "count"), "0"); // a real zero is a zero (the FLR's empty size)
eq(formatCell(0, "money"), "₹0.00");
eq(formatCell(4793.71, "money"), "₹4,793.71");
eq(formatCell(800, "money"), "₹800.00");
eq(formatCell(0.2, "money"), "₹0.20"); // twenty paise stay twenty paise (MEMORY 9)
eq(formatCell(123456.5, "rupees"), "₹1,23,456.50"); // Indian grouping
eq(formatCell(-250.5, "money"), "-₹250.50");
eq(formatCell(25.555, "percent"), "25.55%"); // toFixed(2), as the web
eq(formatCell(25.56, "percent"), "25.56%");
eq(formatCell(2000, "count"), "2,000");
eq(formatCell(4.5, "ratio"), "4.5");
eq(formatCell(0.16, "ratio"), "0.16");
eq(formatCell(1.005, "ratio"), "1"); // Math.round(100.49999…)/100, the web's
eq(formatCell("2026-10-11", "date"), "11/10/2026");
eq(formatCell("Total", "date"), "Total"); // words in a date column stay words
eq(formatCell("9 + 30 ml", "text"), "9 + 30 ml"); // the bar's bottles and ml are the server's text
/* A Postgres time (MEMORY 7): read only after it is made ISO, in the property's zone. */
eq(dateTimeReport("2026-10-31 07:35:58.215147+05:30", "Asia/Kolkata"), "31/10/2026 07:35:58 AM");
eq(formatCell("2026-10-31 14:05:00+05:30", "datetime", "Asia/Kolkata"), "31/10/2026 02:05:00 PM");
eq(dateTimeReport("not a time", "Asia/Kolkata"), "-");
eq(factsLine([{ label: "From", value: "2026-10-01", kind: "date" }, { label: "To", value: "2026-10-11", kind: "date" }]),
  "From 01/10/2026   To 11/10/2026");
eq(factsLine([{ label: "During the month of", value: "2026-10", kind: "text" }, { label: "Up to", value: "2026-10-11", kind: "date" }]),
  "During the month of 2026-10   Up to 11/10/2026");

/* ── Consumption's "Per item": the total is the server's, never the rows added up ── */
const items: ReportColumn[] = [
  { key: "item", label: "Item", kind: "text" }, { key: "unit", label: "Unit", kind: "text" },
  { key: "issued", label: "Issued", kind: "ratio" }, { key: "value", label: "Value (as recorded)", kind: "money" },
];
const perItem: ReportSection = {
  key: "items", title: "Per item", columns: items, note: "2 items have no recorded cost and are left out of the total.",
  rows: [
    { kind: "row", cells: { item: "Imperial Blue 180 ml", unit: "bottle", issued: 4.5, value: 750.19 } },
    { kind: "row", cells: { item: "Butter", unit: "kg", issued: 0.04, value: null } },
    /* 750.19 + nothing is not 4,793.71: only the server's figure may show. */
    { kind: "total", cells: { item: "Total", unit: null, issued: null, value: 4793.71 } },
  ],
};
const cards = sectionCards(perItem);
eq(cards[0], { kind: "row", title: "Imperial Blue 180 ml", indent: 0, parts: [
  { group: null, figure: { label: "Unit", value: "bottle", numeric: false, missing: false, negative: false } },
  { group: null, figure: { label: "Issued", value: "4.5", numeric: true, missing: false, negative: false } },
  { group: null, figure: { label: "Value (as recorded)", value: "₹750.19", numeric: true, missing: false, negative: false } },
] });
eq(cards[1]!.kind === "row" && cards[1]!.parts[2], { group: null, figure: { label: "Value (as recorded)", value: "-", numeric: true, missing: true, negative: false } });
/* The total: its empty Unit is left blank (not "-"), its missing Issued is a dash. */
eq(cards[2], { kind: "total", title: "Total", indent: 0, parts: [
  { group: null, figure: { label: "Issued", value: "-", numeric: true, missing: true, negative: false } },
  { group: null, figure: { label: "Value (as recorded)", value: "₹4,793.71", numeric: true, missing: false, negative: false } },
] });
eq(emptyWords(perItem), "Nothing to report.");
eq(emptyWords({ ...perItem, rows: [], empty: "Nothing is under repair." }), "Nothing is under repair.");

/* A band is its first cell; an indent is kept; a negative money figure is marked red. */
eq(cardOf({ kind: "band", cells: { item: "Kitchen" } }, items), { kind: "band", text: "Kitchen" });
const owed = cardOf({ kind: "row", indent: 1, cells: { item: "Bill 12", unit: null, issued: null, value: -80 } }, items);
eq(owed.kind === "row" && [owed.indent, owed.parts.length, owed.parts.at(-1)], [1, 3, {
  group: null, figure: { label: "Value (as recorded)", value: "-₹80.00", numeric: true, missing: false, negative: true },
}]);
/* A row's own unit (the Manager report's mixed column) wins over the column's kind. */
const mixed = cardOf({ kind: "row", unit: "count", cells: { item: "Rooms", unit: null, issued: 3, value: 1200 } }, items);
eq(mixed.kind === "row" && mixed.parts.at(-1), { group: null, figure: { label: "Value (as recorded)", value: "1,200", numeric: true, missing: false, negative: false } });

/* ── The excise register (FLR-1A/2A/3A): every size the server sends, in its group, as sent ── */
const flrCols: ReportColumn[] = [
  { key: "brand", label: "Name of the Brand", kind: "text" }, { key: "tp", label: "T.P. No.", kind: "text" },
  { key: "opening_750", label: "750", kind: "count", group: "Opening Balance" },
  { key: "opening_180", label: "180", kind: "count", group: "Opening Balance" },
  { key: "receipts_750", label: "750", kind: "count", group: "Receipts" },
  { key: "receipts_180", label: "180", kind: "count", group: "Receipts" },
  { key: "closing_750", label: "750", kind: "count", group: "Closing Balance" },
  { key: "closing_180", label: "180", kind: "count", group: "Closing Balance" },
];
const flr = cardOf({ kind: "row", cells: {
  brand: "Imperial Blue", tp: "TP 88123", opening_750: 0, opening_180: null, receipts_750: 6, receipts_180: 60, closing_750: 5, closing_180: 55,
} }, flrCols);
const f = (label: string, value: string, missing = false) => ({ label, value, numeric: true, missing, negative: false });
eq(flr, { kind: "row", title: "Imperial Blue", indent: 0, parts: [
  { group: null, figure: { label: "T.P. No.", value: "TP 88123", numeric: false, missing: false, negative: false } },
  { group: "Opening Balance", figures: [f("750", "0"), f("180", "-", true)] },
  { group: "Receipts", figures: [f("750", "6"), f("180", "60")] },
  { group: "Closing Balance", figures: [f("750", "5"), f("180", "55")] },
] });
/* FLR-3: a day of the month is said with its column's name; the headless column with nothing in it is not drawn. */
const flr3Cols: ReportColumn[] = [
  { key: "day", label: "Date", kind: "text" }, { key: "permit", label: "", kind: "text" },
  { key: "fermented_650", label: "650", kind: "count", group: "Fermented liquors" },
];
eq(cardOf({ kind: "row", cells: { day: "11", permit: null, fermented_650: 10 } }, flr3Cols),
  { kind: "row", title: "Date 11", indent: 0, parts: [{ group: "Fermented liquors", figures: [f("650", "10")] }] });
eq(cardOf({ kind: "total", cells: { day: "Grand Total", permit: null, fermented_650: 72 } }, flr3Cols),
  { kind: "total", title: "Grand Total", indent: 0, parts: [{ group: "Fermented liquors", figures: [f("650", "72")] }] });

/* ── Each report's question, on the business date 11 Oct 2026 (Store.tsx, Ledgers.tsx) ── */
const bd = "2026-10-11";
eq(asked("stock-on-hand", bd), { title: "Closing stock", period: "11 Oct 2026", query: { asOn: bd } });
eq(asked("equipment", bd), { title: "Equipment report", period: "11 Oct 2026", query: { asOn: bd } });
eq(asked("flr-daily", bd).query, { asOn: bd });
eq(asked("stock-consumption", bd), { title: "Consumption", period: "1 Oct 2026 to 11 Oct 2026", query: { asOn: bd, from: "2026-10-01" } });
eq(asked("supplier-spend", bd).query, { asOn: bd, from: "2026-10-01" });
eq(asked("flr-monthly", bd), { title: "FLR-3 (monthly register)", period: "October 2026", query: { asOn: bd, month: "2026-10" } });
eq(asked("supplier-dues", bd).period, "Owed on 11 Oct 2026 · paid 1 Oct 2026 to 11 Oct 2026");
eq(asked("bar-stock", bd), { title: "Bar stock", period: "11 Oct 2026", query: { asOn: bd, from: bd } }); // the business day alone
eq(asked("bar-stock", bd, { from: "2026-10-09" }), { title: "Bar stock", period: "9 Oct 2026 to 11 Oct 2026", query: { asOn: bd, from: "2026-10-09" } });
eq(asked("bar-stock", bd, { from: "", to: "" }).query, { asOn: bd, from: bd }); // a cleared box falls back
/* The statement asks nothing until a supplier is picked, and nothing for days the wrong way round. */
eq(asked("supplier-statement", bd), { title: "Supplier statement", period: "Pick a supplier and the days", query: null });
const id = "0b6c3a8e-5f0e-4d6a-9a52-1c2d3e4f5a6b";
eq(asked("supplier-statement", bd, { supplier: id, supplierName: "Shah Wines" }), {
  title: "Statement: Shah Wines", period: "1 Oct 2026 to 11 Oct 2026", query: { asOn: bd, from: "2026-10-01", supplier: id },
});
eq(asked("supplier-statement", bd, { supplier: id, from: "2026-10-12", to: bd }).query, null);
eq(queryText({ asOn: bd, from: "2026-10-01", supplier: id }), `asOn=2026-10-11&from=2026-10-01&supplier=${id}`);
eq(Object.keys(STOCK_REPORTS).length, 14);
eq(webPath("flr-monthly"), "/reports/flr-monthly");

/* ── What came back ── */
eq(outcomeOf(404, "No such property."), { none: true });
eq(outcomeOf(403, "Reading the store's reports is for the owner. Ask one of them."), { refused: "Reading the store's reports is for the owner. Ask one of them." });
eq(outcomeOf(400, "Pick a supplier for the statement."), { refused: "Pick a supplier for the statement." });
eq(outcomeOf(0, "Could not reach the server."), null); // unreachable: a failed read, Try again
eq(outcomeOf(500, "Internal"), null);
eq(refusedTitle("the daily excise register"), "The daily excise register is not available");
eq(failedTitle("the supplier dues"), "The supplier dues did not load");

/* ── The foot's stamp, the web's en-IN toLocaleString ── */
eq(printedStamp(new Date(2026, 9, 31, 20, 24, 27)), "31/10/2026, 08:24:27 pm");
eq(printedStamp(new Date(2026, 0, 5, 0, 3, 9)), "05/01/2026, 12:03:09 am");
eq(printedStamp(new Date(2026, 0, 5, 12, 0, 0)), "05/01/2026, 12:00:00 pm");

/* ── The export: the screen's figures, the server's total as a row, nothing summed ── */
const doc = (sections: ReportSection[]): ReportDoc => ({
  report: "stock-consumption", title: "Consumption", orientation: "portrait", footnotes: ["Costs as recorded."],
  property: { code: "5EL", name: "5 Elements Akkalkot", address: null, gstin: null, timezone: "Asia/Kolkata" },
  facts: [{ label: "From", value: "2026-10-01", kind: "date" }], sections,
});
eq(exportOf(doc([perItem]), "1 Oct 2026 to 11 Oct 2026"), {
  title: "Consumption", subtitle: "5 Elements Akkalkot · 1 Oct 2026 to 11 Oct 2026",
  note: "From 01/10/2026\n* Costs as recorded.",
  columns: ["Section", "Item", "Unit", "Issued", "Value (as recorded)"],
  rows: [
    ["Per item", "Imperial Blue 180 ml", "bottle", "4.5", "₹750.19"],
    ["Per item", "Butter", "kg", "0.04", "-"],
    ["Per item", "Total", "", "-", "₹4,793.71"],
  ],
});
eq(exportOf(doc([{ ...perItem, rows: [] }]), "x"), null); // nothing to export: the buttons wait
const whisky: ReportSection = { key: "w", title: "Whisky", columns: flrCols, rows: [{ kind: "row", cells: {
  brand: "Imperial Blue", tp: "TP 88123", opening_750: 0, opening_180: null, receipts_750: 6, receipts_180: 60, closing_750: 5, closing_180: 55,
} }] };
const beer: ReportSection = { key: "b", title: "Beer", columns: flr3Cols, rows: [{ kind: "total", cells: { day: "Total", permit: null, fermented_650: 72 } }] };
eq(exportOf(doc([whisky, beer]), "11 Oct 2026")?.rows, [
  ["Whisky", "Imperial Blue", "T.P. No. TP 88123 · Opening Balance: 750 0, 180 - · Receipts: 750 6, 180 60 · Closing Balance: 750 5, 180 55"],
  ["Beer", "Total", "Fermented liquors: 650 72"],
]);
eq(exportOf(doc([whisky, beer]), "x")?.columns, ["Section", "Line", "Figures"]);

console.log("stockReports: every check passed");
