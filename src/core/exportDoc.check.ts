/* exportDoc.ts. Run: node --experimental-strip-types src/core/exportDoc.check.ts */
import { fileName, tableCsv, tableHtml, tableText } from "./exportDoc.ts";

const eq = (got: unknown, want: unknown, what: string) => {
  if (JSON.stringify(got) !== JSON.stringify(want)) throw new Error(`${what}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
};
const t = {
  title: "GST sales register", subtitle: "Fidato Agra · Nov 2026",
  columns: ["Invoice", "Taxable", "GST"],
  rows: [["INV-1", "₹1,000.50", "₹50.03"], ["INV-<2>", "-", "-"], ["A & B", "₹0.00", "-"]],
  totals: ["", "₹9,999.99", "₹500.00"],
};
const html = tableHtml(t, "19 Nov 2026, 9:05 PM");
eq(html.includes("<td>₹1,000.50</td>"), true, "a figure exactly as the screen wrote it");
eq(html.includes("INV-&lt;2&gt;"), true, "text is escaped");
eq(html.includes("<td>A &amp; B</td>"), true, "an ampersand is escaped");
eq(html.includes("<td>₹9,999.99</td>"), true, "the server's totals row, as sent (not a sum of the rows)");
eq(html.includes("<tfoot>"), true, "a totals row only when the server sent one");
eq(tableHtml({ ...t, totals: undefined }, "x").includes("<tfoot>"), false, "no totals row without the server's");
eq(tableText(t).split("\n"), [
  "GST sales register", "Fidato Agra · Nov 2026", "",
  "Invoice: INV-1 · Taxable: ₹1,000.50 · GST: ₹50.03",
  "Invoice: INV-<2> · Taxable: - · GST: -",
  "Invoice: A & B · Taxable: ₹0.00 · GST: -",
  "", "Total · Invoice:  · Taxable: ₹9,999.99 · GST: ₹500.00",
], "the rows as text, a dash kept");
const csv = tableCsv({ title: "x", columns: ["Guest", "Paid"], rows: [['Rao "R" & Co', "₹1,000.50"]] });
eq(csv, '\uFEFF"Guest","Paid"\r\n"Rao ""R"" & Co","₹1,000.50"\r\n', "CSV: a BOM, every cell quoted, quotes doubled, the figure as shown");
eq(tableCsv({ ...t }).trim().split("\r\n").length, 1 + 3 + 1, "CSV: header, rows, and the server's totals row");
eq(fileName("GST sales register (Nov)"), "gst-sales-register-nov", "a file name");
eq(fileName("₹"), "export", "a file name never empty");
console.log("core exportDoc: all checks pass");
