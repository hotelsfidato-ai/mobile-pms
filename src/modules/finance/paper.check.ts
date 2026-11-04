/* Run: node --experimental-strip-types mobile/src/modules/finance/paper.check.ts
   The interim bill on paper: the server's figures only, the words escaped,
   a test hotel's bill marked and without a GSTIN. */
import { billHtml, placeLine, totalRows } from "./paper.ts";
import type { StayBill } from "./bill.ts";

const eq = (got: unknown, want: unknown, what: string) => {
  if (JSON.stringify(got) !== JSON.stringify(want)) throw new Error(`${what}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
};
const has = (html: string, text: string, what: string) => { if (!html.includes(text)) throw new Error(`${what}: no "${text}"`); };

const bill: StayBill = {
  hotel: { name: "5 Elements", address: "Road 1, Akkalkot, Maharashtra", city: "Akkalkot", state: "MH", phone: null, gstin: "27ABCDE1234F1Z5" },
  stay: { reference: "FH-1", guest: "Rege <b>", checkIn: "2026-10-09", checkOut: "2026-10-11", room: "204" },
  lines: [
    { date: "2026-10-09", description: "Room 204", category: "room", amount: 3000, tax: 150, rate: 5, scheme: "gst" },
    { date: "2026-10-09", description: "Whisky", category: "beverage", amount: 500, tax: 50, rate: 10, scheme: "vat" },
  ],
  taxes: [{ rate: 5, taxable: 3000, cgst: 75, sgst: 75 }],
  vat: [{ rate: 10, taxable: 500, vat: 50 }],
  net: 3500, tax: 200, total: 3700, paid: 700, balance: 3000,
};

eq(totalRows(bill), [["Net", "₹3,500.00"], ["CGST 2.5%", "₹75.00"], ["SGST 2.5%", "₹75.00"], ["VAT 10%", "₹50.00"]], "the server's rows");
eq(placeLine("Road 1, Akkalkot, Maharashtra", "Akkalkot", "MH"), "Road 1, Akkalkot, Maharashtra", "the place once");
eq(placeLine("Road 1", "Akkalkot", "MH"), "Road 1, Akkalkot, MH", "the place added");

const paper = billHtml(bill, false);
has(paper, "Interim bill · FH-1", "the title");
has(paper, "GSTIN 27ABCDE1234F1Z5", "the GSTIN");
has(paper, "Rege &lt;b&gt;", "typed words escaped");
has(paper, "₹3,700.00", "the server's total");
has(paper, "₹3,000.00", "the server's balance");
if (paper.includes("Amount due")) throw new Error("the phone adds no Amount due");

const test = billHtml({ ...bill, hotel: { ...bill.hotel, gstin: null } }, true);
has(test, "TEST · NOT VALID", "a test hotel");
if (test.includes("GSTIN")) throw new Error("a test hotel prints no GSTIN");
has(billHtml({ ...bill, hotel: { ...bill.hotel, gstin: null } }, false), "GSTIN -", "a dash, never made up");
has(billHtml({ ...bill, tonight: { description: "Room 204 night", amount: 3000, tax: 150, rate: 5 } }, false), "To be posted tonight · Room 204 night", "tonight");

console.log("finance paper: all checks pass");
