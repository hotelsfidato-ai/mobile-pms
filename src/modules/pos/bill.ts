/* ══════════════════════════════════════════════════════════════════
   THE BILL ON PAPER, PRINTED FROM THE PHONE (M-9, expo-print) — the
   web's BillSlip (src/modules/pos/components/BillSlip.tsx, 80mm roll,
   the CRS voucher's look of components/ui/Document.tsx) as one HTML
   page, and the words of flows/printBill.tsx and data/till.ts.

   EVERY FIGURE IS THE SERVER'S ORDER (`GET /till/orders/:id`, from
   app.pos_order_total). The web's slip works CGST/SGST per line on the
   undiscounted amount and prints no Discount or Round-off row, so on a
   discounted bill its tax lines do not add up to its total (R-11). This
   one prints the Till's own rows - Net, Discount, Taxable, the tax,
   Round off, TOTAL = payable - and the tax only as the server has it
   (taxRows below). The heading (INTERIM BILL / BILL / BILL · DUPLICATE)
   is the server's answer to bill-print, never decided here.

   Every word a person typed (a dish, a note, a name) is escaped: the
   page is HTML a print view renders.
   Pure: no React Native here, so `bill.check.ts` runs under node.
   ══════════════════════════════════════════════════════════════════ */

import { dateLong } from "../../core/format.ts";
import type { LineAddons, Order } from "./types.ts";

/** What a printed bill says it is (D27-292): the server's `heading`. */
export type BillHeading = "interim" | "bill" | "duplicate";

/** data/till.ts BILL_TITLE: the words at the top of the paper. */
export const BILL_TITLE: Record<BillHeading, string> = {
  interim: "Interim bill", bill: "Bill", duplicate: "Bill · duplicate",
};

/* ── Where it went (flows/printBill.tsx) ────────────────────────── */

export const sentWords = (heading: BillHeading, printer: string) => `${BILL_TITLE[heading]} sent to ${printer}`;

export const offlineAsk = (heading: BillHeading, printer: string) => ({
  title: `${printer} is offline`,
  body: `The bill printer has not been seen for a while. The ${BILL_TITLE[heading].toLowerCase()} waits there `
    + "and prints when it is back - or print it here now.",
});

/* ── Figures ─────────────────────────────────────────────────────── */

const inrPrecise = new Intl.NumberFormat("en-IN", {
  style: "currency", currency: "INR", minimumFractionDigits: 2, maximumFractionDigits: 2,
});
/** The web's moneyPrecise: paise on paper, never whole rupees. */
export const precise = (n: number) => inrPrecise.format(n);
const toPaise = (n: number) => Math.round(n * 100);

/** CGST and SGST each carry half, as the PMS's own bill halves it
    (db/migrations/125 app.stay_bill: cgst = round(tax/2, 2), sgst = the
    rest), so the two always add to the tax. */
export function halves(tax: number): [number, number] {
  const p = toPaise(tax);
  const cgst = Math.round(p / 2);
  return [cgst / 100, (p - cgst) / 100];
}

type Group = { scheme: "gst" | "vat"; rate: number };

/** The tax lines, from what the server gives - which is the order's
    TOTAL tax only (no endpoint returns app.pos_order_by_tax's groups):
    - one rate on the bill (GST or VAT): that group IS the order, so the
      server's tax is printed under its rate, GST halved;
    - several rates and no discount: each group as app.pos_order_by_tax
      works it (its lines' round(qty × price, 2), taxed once at its rate),
      printed only if the groups add to the server's tax to the paisa;
    - several rates with a discount: the discount's share per rate is the
      server's apportionment, which it does not send - so the server's Tax
      total alone, never a figure worked out here. */
export function taxRows(o: Pick<Order, "lines" | "discount" | "tax">): Array<[string, string]> {
  const live = o.lines.filter((l) => !l.voided);
  const groups = new Map<string, Group & { net: number }>();
  for (const l of live) {
    const scheme = l.taxScheme === "vat" ? "vat" : "gst";
    const key = `${scheme}:${l.taxRate}`;
    const at = groups.get(key) ?? { scheme, rate: l.taxRate, net: 0 };
    at.net += toPaise(l.qty * l.unitPrice);
    groups.set(key, at);
  }
  const total: Array<[string, string]> = [["Tax", precise(o.tax)]];
  const list = [...groups.values()];
  if (list.length === 1) return rowsFor([{ ...list[0]!, tax: o.tax }]);
  if (list.length === 0 || o.discount !== 0) return total;
  const worked = list.map((g) => ({ ...g, tax: Math.round((g.net * g.rate) / 100) / 100 }));
  const sum = worked.reduce((a, g) => a + toPaise(g.tax), 0);
  return sum === toPaise(o.tax) ? rowsFor(worked) : total;
}

/** GST in pairs by rate, then VAT one line per rate (BillSlip's order). */
function rowsFor(groups: Array<Group & { tax: number }>): Array<[string, string]> {
  const by = (s: Group["scheme"]) => groups.filter((g) => g.scheme === s).sort((a, b) => a.rate - b.rate);
  return [
    ...by("gst").flatMap((g): Array<[string, string]> => {
      const [c, s] = halves(g.tax);
      return [[`CGST ${g.rate / 2}%`, precise(c)], [`SGST ${g.rate / 2}%`, precise(s)]];
    }),
    ...by("vat").map((g): [string, string] => [`VAT ${g.rate}%`, precise(g.tax)]),
  ];
}

/** The Till's figures (Till.tsx 1172-1195) at paise, the tax as above. */
export function billRows(o: Order): { rows: Array<[string, string]>; total: [string, string] } {
  return {
    rows: [
      ["Net", precise(o.net)],
      ...(o.discount > 0
        ? [
          [o.discountType === "percent" ? `Discount ${o.discountValue}%` : "Discount", `-${precise(o.discount)}`],
          ["Taxable", precise(o.taxable)],
        ] as Array<[string, string]>
        : []),
      ...taxRows(o),
      ...(o.roundOff !== 0
        ? [["Round off", `${o.roundOff > 0 ? "+" : ""}${precise(o.roundOff)}`]] as Array<[string, string]>
        : []),
    ],
    total: ["TOTAL", precise(o.payable)],
  };
}

/* ── The paper ───────────────────────────────────────────────────── */

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

/** src/modules/pos/lib/pricing.ts addonBreakdown: "Veg Biryani 310 · Kebab +120". */
export function addonBreakdown(kept: LineAddons): string {
  const n = (rupees: number) => rupees.toLocaleString("en-IN", { maximumFractionDigits: 2 });
  return [
    `${kept.dish} ${n(kept.base)}`,
    ...kept.addons.map((a) => `${a.name}${a.qty > 1 ? ` ×${a.qty}` : ""} ${a.price === 0 ? "Free" : `+${n(a.price * a.qty)}`}`),
  ].join(" · ");
}

export interface GroupLogo { type: string; data: string }

/** admin/data/groupSettings.ts logoSrc: only a PNG or an SVG, as base64,
    and only ever an <img> (an SVG can carry script). */
export function logoSrc(logo: GroupLogo | null | undefined): string | null {
  if (!logo || !["image/png", "image/svg+xml"].includes(logo.type) || !/^[A-Za-z0-9+/]+=*$/.test(logo.data)) return null;
  return `data:${logo.type};base64,${logo.data}`;
}

/** TestHotel.tsx TEST_DOCUMENT: a test hotel's paper, head and foot. */
export const TEST_DOCUMENT = "TEST · NOT VALID";

export interface BillPaper {
  order: Order;
  heading: BillHeading;
  /** The group's name and logo (GET /group), as on every bill (D27-53). */
  group: { name: string | null; logo: string | null };
  /** A test hotel (Hotel.testOf): TEST · NOT VALID, and no GSTIN. */
  test: boolean;
}

/** The bill as one HTML page, for Print.printAsync({ html }). */
export function billHtml({ order: o, heading, group, test }: BillPaper): string {
  const live = o.lines.filter((l) => !l.voided);
  const { rows, total } = billRows(o);
  const facts = [
    ...(o.table ? [["Table", o.table]] : []),
    ["Date", dateLong(o.businessDate)],
    ["Served by", o.openedBy ?? "-"],
    ...(o.settledBy ? [["Settled by", o.settledBy]] : []),
  ];
  const mark = test ? `<p class="test">${TEST_DOCUMENT}</p>` : "";
  const paid = o.status !== "settled"
    ? `<p><b>NOT PAID</b></p>`
    : o.paymentMethod === "function"
      ? `<p>Charged to ${esc(o.eventTitle ?? "the function")}'s bill</p>`
      : `<p>Paid by ${esc(o.paymentMethod ?? "-")}${o.paymentMethod === "room" ? " - charged to the guest's bill" : ""}</p>`;

  return `<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(BILL_TITLE[heading])} ${esc(o.orderNo)}</title>
<style>
@page { margin: 4mm; size: 80mm auto; }
* { box-sizing: border-box; }
body { margin: 0; background: #fff; color: #031728; font: 14px/1.4 -apple-system, Roboto, "Segoe UI", Arial, sans-serif;
  -webkit-print-color-adjust: exact; print-color-adjust: exact; }
article { max-width: 80mm; margin: 0 auto; padding: 16px 12px; }
.tab { font-variant-numeric: tabular-nums; }
.test { text-align: center; font-weight: 800; text-transform: uppercase; font-size: 22px; letter-spacing: .04em;
  border-top: 4px double #031728; border-bottom: 4px double #031728; padding: 6px 0; margin: 8px 0; }
.mast { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
.mast img { height: 40px; max-width: 160px; object-fit: contain; display: block; margin-bottom: 6px; }
.name { font-size: 18px; font-weight: 800; margin: 0; }
.by { font-size: 12px; font-weight: 600; color: #67737e; margin: 2px 0 0; }
.title { border-left: 4px solid #df6128; padding-left: 8px; flex-shrink: 0; }
.title p { margin: 0; }
.title .h { font-size: 15px; font-weight: 800; text-transform: uppercase; letter-spacing: .06em; }
.title .n { font-size: 12px; color: #67737e; }
.rule { height: 3px; background: #df6128; margin-top: 10px; }
.hair { height: 1px; background: #e2e5e8; margin-bottom: 10px; }
.outlet { font-size: 12px; color: #67737e; margin: -4px 0 10px; }
.facts { display: grid; grid-template-columns: 1fr 1fr; border: 1px solid #e2e5e8; border-radius: 6px; background: #f7f8f9; }
.facts div { padding: 8px 12px; min-width: 0; }
.label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; color: #67737e; margin: 0; }
.value { font-size: 13px; font-weight: 600; margin: 2px 0 0; }
table { width: 100%; border-collapse: collapse; }
.lines { margin-top: 14px; border-top: 2px solid #031728; }
.lines td { padding: 8px 0; border-bottom: 1px solid #e2e5e8; font-size: 13px; vertical-align: top; }
.lines .q { width: 24px; padding-right: 6px; white-space: nowrap; }
.lines .a { padding-left: 8px; text-align: right; font-weight: 600; white-space: nowrap; }
.sub { display: block; font-size: 11px; color: #67737e; }
.totals { margin-top: 10px; }
.totals td { padding: 3px 0; font-size: 13px; }
.totals td:first-child { color: #67737e; }
.totals td:last-child { text-align: right; font-weight: 600; white-space: nowrap; padding-left: 16px; }
.totals .rule2 td { padding: 4px 0 0; border-top: 2px solid #031728; }
.totals .total td { font-size: 14px; font-weight: 700; color: #031728; }
.totals .total td:last-child { font-size: 16px; font-weight: 800; }
.panel { margin-top: 14px; border: 1px solid #e2e5e8; border-left: 4px solid #df6128; background: #fdf1eb;
  border-radius: 6px; padding: 10px 12px; font-size: 13px; }
.panel p { margin: 0; }
footer { margin-top: 20px; border-top: 2px solid #031728; padding-top: 8px; font-size: 11px; color: #67737e; }
footer .who { font-weight: 800; text-transform: uppercase; letter-spacing: .08em; color: #031728; margin: 0 0 4px; }
footer p { margin: 0; }
.note { margin-top: 12px; text-align: center; }
</style></head>
<body><article data-bill-heading="${heading}">
${mark}
<header>
  <div class="mast">
    <div>
      ${group.logo ? `<img src="${esc(group.logo)}" alt="${esc(group.name ?? "")}">` : ""}
      <p class="name">${esc(o.hotelName)}</p>
      ${group.name ? `<p class="by">by ${esc(group.name)}</p>` : ""}
    </div>
    <div class="title"><p class="h">${esc(BILL_TITLE[heading])}</p><p class="n tab">${esc(o.orderNo)}</p></div>
  </div>
  <div class="rule"></div><div class="hair"></div>
</header>
<p class="outlet">${esc(o.outletName)}${o.hotelCity ? ` · ${esc(o.hotelCity)}` : ""}</p>
<div class="facts">${facts.map(([k, v]) => `<div><p class="label">${esc(k!)}</p><p class="value tab">${esc(v!)}</p></div>`).join("")}</div>
<table class="lines"><tbody>
${live.map((l) => `<tr><td class="q tab">${l.qty}×</td><td>${esc(l.extra ? `+ ${l.name}` : l.name)}${
    l.numberedAddons ? `<span class="sub tab">${esc(addonBreakdown(l.numberedAddons))}</span>` : ""}${
    l.note ? `<span class="sub">${esc(l.note)}</span>` : ""}</td><td class="a tab">${precise(l.qty * l.unitPrice)}</td></tr>`).join("\n")}
</tbody></table>
<table class="totals"><tbody>
${rows.map(([k, v]) => `<tr><td>${esc(k)}</td><td class="tab">${v}</td></tr>`).join("\n")}
<tr class="rule2"><td colspan="2"></td></tr>
<tr class="total"><td>${total[0]}</td><td class="tab">${total[1]}</td></tr>
</tbody></table>
<div class="panel">${paid}${o.vatBill ? `<p>Alcohol billed under VAT: VAT bill <span class="tab">${esc(o.vatBill)}</span></p>` : ""}</div>
<footer>
  <p class="who">${esc(o.hotelName)}</p>
  ${o.hotelGstin && !test ? `<p class="tab">GSTIN ${esc(o.hotelGstin)}</p>` : ""}
  <p class="tab">FSSAI licence ${esc(o.hotelFssai ?? "-")}</p>
  <p class="note">This is a restaurant bill, not a tax invoice. A GST invoice is issued against the room folio at checkout.</p>
</footer>
${mark}
</article></body></html>`;
}
