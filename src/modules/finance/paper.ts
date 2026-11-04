/* ══════════════════════════════════════════════════════════════════
   THE INTERIM BILL ON PAPER (M-9, expo-print) — the web's BillPrint
   (flows/BillPrint.tsx) as one HTML page. It draws `app.stay_bill` and
   computes nothing: every figure, every tax row arrives from the server.
   It says "Interim bill", before check-out and after (D22-7, D24-25): it
   carries no invoice number. Every word a person typed is escaped.
   Differences: no section subtotals and no "Amount due" with tonight (the
   web adds those itself); the hotel's name, not the group's logo.
   Pure: no React Native here, so `paper.check.ts` runs under node.
   ══════════════════════════════════════════════════════════════════ */

import { dateDay, half, rupees, sectionOf, type SectionKey, type StayBill } from "./bill.ts";

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

/** place.ts placeLine: the place once (QA FI-16). */
export function placeLine(address: string | null, city: string | null, state: string | null): string {
  const named = city && (address ?? "").toLowerCase().includes(city.toLowerCase());
  const after = named ? null : [city, state].filter(Boolean).join(", ") || null;
  return [address, after].filter(Boolean).join(", ");
}

/** The totals block, the server's figures in the printed bill's order. */
export function totalRows(bill: StayBill): Array<[string, string]> {
  return [
    ["Net", rupees(bill.net)],
    ...bill.taxes.flatMap((x): Array<[string, string]> => [[`CGST ${half(x.rate)}%`, rupees(x.cgst)], [`SGST ${half(x.rate)}%`, rupees(x.sgst)]]),
    ...(bill.vat ?? []).map((v): [string, string] => [`VAT ${v.rate}%`, rupees(v.vat)]),
  ];
}

const TITLES: Record<SectionKey, string> = { room: "Room", restaurant: "Restaurant", bar: "Bar", other: "Other charges" };

/** A test hotel's paper (TestHotel.tsx TEST_DOCUMENT, the owner's D27-296 (8)). */
export const TEST_DOCUMENT = "TEST · NOT VALID";

export function billHtml(bill: StayBill, test: boolean): string {
  const { hotel, stay, tonight } = bill;
  const place = placeLine(hotel.address, hotel.city, hotel.state);
  const row = (a: string, b: string, css = "") => `<tr class="${css}"><td>${esc(a)}</td><td class="n">${esc(b)}</td></tr>`;
  const sections = (["room", "restaurant", "bar", "other"] as SectionKey[]).flatMap((key) => {
    const own = bill.lines.filter((l) => sectionOf(l) === key);
    return own.length === 0 ? [] : [`<tr><th colspan="2">${TITLES[key]}</th></tr>${own.map((l) => row(l.description, rupees(l.amount))).join("")}`];
  });
  return `<!doctype html><html><head><meta charset="utf-8"><title>Interim bill</title><style>
body{font-family:Helvetica,Arial,sans-serif;color:#031728;font-size:13px;margin:24px}
h1{font-size:20px;margin:0}h2{font-size:14px;margin:0;color:#4c5b67;font-weight:600}
.mast{display:flex;justify-content:space-between;align-items:baseline;border-bottom:2px solid #031728;padding-bottom:8px}
.place{color:#67737e;font-size:11px;margin:6px 0 12px}.test{color:#c52a1a;font-weight:700;text-align:center;margin-bottom:8px}
.facts{display:flex;gap:24px;margin-bottom:12px}.facts b{display:block;font-size:11px;color:#67737e;font-weight:500}
table{width:100%;border-collapse:collapse}th{text-align:left;font-size:11px;color:#67737e;padding:12px 0 4px;text-transform:uppercase}
td{padding:5px 0;border-bottom:1px solid #eef0f2}.n{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}
.total td{border-top:2px solid #031728;font-weight:700;border-bottom:0}
</style></head><body>
${test ? `<p class="test">${TEST_DOCUMENT}</p>` : ""}
<div class="mast"><h1>${esc(hotel.name)}</h1><h2>Interim bill · ${esc(stay.reference)}</h2></div>
<p class="place">${test ? esc(place) : `${place ? `${esc(place)} · ` : ""}GSTIN ${esc(hotel.gstin ?? "-")}`}</p>
<div class="facts"><div><b>Guest</b>${esc(stay.guest)}</div><div><b>Room</b>${esc(stay.room ?? "-")}</div><div><b>Stay</b>${dateDay(stay.checkIn)} – ${dateDay(stay.checkOut)}</div></div>
<table>${sections.join("")}</table>
<table style="margin-top:12px">
${totalRows(bill).map(([a, b]) => row(a, b)).join("")}
${row("Total", rupees(bill.total), "total")}
${row("Paid", rupees(bill.paid))}
${row("Outstanding", rupees(bill.balance))}
${tonight ? `${row(`To be posted tonight · ${tonight.description}`, rupees(tonight.amount))}${row(`GST ${tonight.rate}%`, rupees(tonight.tax))}` : ""}
</table>
${test ? `<p class="test">${TEST_DOCUMENT}</p>` : ""}
</body></html>`;
}
