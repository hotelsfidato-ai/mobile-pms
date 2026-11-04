/* Run: node --experimental-strip-types mobile/src/modules/pos/bill.check.ts
   The bill printed from the phone: the server's figures only, the tax as the server has it (R-11). */
import { billHtml, billRows, halves, logoSrc, offlineAsk, sentWords, taxRows } from "./bill.ts";
import type { Order, OrderLine } from "./types.ts";

const eq = (got: unknown, want: unknown, what: string) => {
  if (JSON.stringify(got) !== JSON.stringify(want)) throw new Error(`${what}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
};
const has = (html: string, bit: string, what: string) => { if (!html.includes(bit)) throw new Error(`${what}: no ${JSON.stringify(bit)}`); };
const lacks = (html: string, bit: string, what: string) => { if (html.includes(bit)) throw new Error(`${what}: has ${JSON.stringify(bit)}`); };

let n = 0;
const l = (qty: number, name: string, unitPrice: number, taxRate: number, over: Partial<OrderLine> = {}): OrderLine => ({
  id: `l${++n}`, name, qty, unitPrice, taxRate, taxScheme: "gst", note: null, voided: false, kotStatus: "sent", addedBy: null,
  parentLineId: null, isAddon: false, variationId: null, ...over,
});
/* DH-003 on the scratch API: five lines, 5% and 18%. Figures as app.pos_order_total gives them. */
const lines = [l(2, "Papad Masala", 90, 5), l(1, "Fresh Lime Soda", 120, 5), l(2, "Veg Manchurian", 280, 5),
  l(1, "Paneer Tikka", 320, 5), l(1, "Packaged Water 1L", 40, 18), l(3, "Struck Dish", 999, 5, { voided: true })];
const base = {
  id: "o1", orderNo: "DH-003", outlet: "REST", outletName: "Fidato Restaurant", hotelName: "5 Elements Akkalkot",
  hotelCity: "Akkalkot", hotelGstin: "27AAAAA0000A1Z5", hotelFssai: null, table: "AC4", status: "open", businessDate: "2026-10-14",
  paymentMethod: null, openedBy: null, settledBy: null, settledAt: null, abandonedReason: null, ticketId: null, eventId: null,
  eventTitle: null, lines, net: 1220, discount: 0, discountType: null, discountValue: null, discountReason: null, promotionId: null,
  promotionName: null, taxable: 1220, tax: 66.2, gross: 1286.2, roundOff: 0, payable: 1286.2, tenders: [], covers: null, waiter: null,
  orderType: "dine_in", customerName: null, customerPhone: null, customerAddress: null, customerLocality: null, heldAt: null,
} as Order;

/* Halves add to the tax, the odd paisa to SGST (app.stay_bill). */
eq(halves(45.45), [22.73, 22.72], "odd paisa");
eq(halves(59), [29.5, 29.5], "even");

/* Two rates, no discount: per group as the server works it, adding to its tax. */
eq(taxRows(base), [["CGST 2.5%", "₹29.50"], ["SGST 2.5%", "₹29.50"], ["CGST 9%", "₹3.60"], ["SGST 9%", "₹3.60"]], "two rates");
/* ...and if they would not add to the server's tax, the server's total alone. */
eq(taxRows({ ...base, tax: 66.21 }), [["Tax", "₹66.21"]], "groups disagree: the server wins");

/* Two rates WITH a discount: the share per rate is the server's and not sent - Tax total only, never per line (R-11). */
const disc = { ...base, discount: 122, discountType: "percent", discountValue: 10, taxable: 1098, tax: 59.58, gross: 1157.58, payable: 1157.58 } as Order;
eq(billRows(disc), {
  rows: [["Net", "₹1,220.00"], ["Discount 10%", "-₹122.00"], ["Taxable", "₹1,098.00"], ["Tax", "₹59.58"]],
  total: ["TOTAL", "₹1,157.58"],
}, "discounted, two rates");

/* One rate, discounted: that group is the whole order, so the server's tax halves under its rate. */
const one = { ...base, lines: [l(1, "Veg Biryani", 310, 5), l(1, "Chicken Curry", 420, 5), l(1, "Veg Manchurian", 280, 5)],
  net: 1010, discount: 101, discountType: "fixed", discountValue: 101, taxable: 909, tax: 45.45, gross: 954.45, roundOff: -0.45, payable: 954 } as Order;
eq(billRows(one), {
  rows: [["Net", "₹1,010.00"], ["Discount", "-₹101.00"], ["Taxable", "₹909.00"], ["CGST 2.5%", "₹22.73"], ["SGST 2.5%", "₹22.72"], ["Round off", "-₹0.45"]],
  total: ["TOTAL", "₹954.00"],
}, "one rate, discounted, rounded");

/* Alcohol: VAT one line per rate, never halved, never merged into GST at the same rate. */
const bar = { ...base, lines: [l(2, "Beer", 250, 10, { taxScheme: "vat" })], net: 500, taxable: 500, tax: 50, gross: 550, payable: 550 } as Order;
eq(taxRows(bar), [["VAT 10%", "₹50.00"]], "VAT alone");
const mix = { ...base, lines: [l(1, "Beer", 200, 5, { taxScheme: "vat" }), l(1, "Paneer Tikka", 320, 5)], tax: 26 } as Order;
eq(taxRows(mix), [["CGST 2.5%", "₹8.00"], ["SGST 2.5%", "₹8.00"], ["VAT 5%", "₹10.00"]], "GST and VAT at one rate stay apart");

/* The paper: the heading the server gave, NOT PAID before payment, the struck dish left off. */
const html = billHtml({ order: base, heading: "interim", group: { name: null, logo: null }, test: false });
has(html, ">Interim bill<", "heading");
has(html, 'data-bill-heading="interim"', "heading mark");
has(html, "NOT PAID", "unpaid");
has(html, "GSTIN 27AAAAA0000A1Z5", "GSTIN");
has(html, "FSSAI licence -", "no FSSAI: a dash");
has(html, "₹1,286.20", "total");
lacks(html, "Struck Dish", "struck line");
lacks(html, "TEST · NOT VALID", "a real hotel");
/* A test hotel: the mark at head and foot, no GSTIN. */
const test = billHtml({ order: base, heading: "bill", group: { name: "Fidato Hotels", logo: null }, test: true });
eq(test.split("TEST · NOT VALID").length - 1, 2, "test mark twice");
lacks(test, "GSTIN", "no GSTIN on a test bill");
has(test, "by Fidato Hotels", "group");
/* Paid: the method; a room says where it went; the duplicate says so. */
const paid = billHtml({ order: { ...base, status: "settled", paymentMethod: "room", settledBy: "Test Waiter" }, heading: "duplicate", group: { name: null, logo: null }, test: false });
has(paid, ">Bill · duplicate<", "duplicate");
has(paid, "Paid by room - charged to the guest's bill", "room");
has(paid, "Settled by", "settled by");
/* Typed words are escaped: a note cannot become markup in the print view. */
const evil = billHtml({ order: { ...base, lines: [l(1, "<img src=x onerror=alert(1)>", 10, 5, { note: "<script>x</script>" })] }, heading: "interim", group: { name: null, logo: null }, test: false });
lacks(evil, "<script>x", "note escaped");
lacks(evil, "<img src=x", "name escaped");
/* The logo: a PNG or SVG as base64 only. */
eq(logoSrc({ type: "image/png", data: "iVBORw0KGgo=" }), "data:image/png;base64,iVBORw0KGgo=", "png");
eq(logoSrc({ type: "text/html", data: "PGgxPg==" }), null, "not a picture");
eq(logoSrc({ type: "image/png", data: "\"><script>" }), null, "not base64");

/* Where it went (printBill.tsx). */
eq(sentWords("interim", "Bar PC"), "Interim bill sent to Bar PC", "sent");
eq(offlineAsk("duplicate", "Bar PC"), {
  title: "Bar PC is offline",
  body: "The bill printer has not been seen for a while. The bill · duplicate waits there and prints when it is back - or print it here now.",
}, "offline");

console.log("bill.check: all rules hold");
