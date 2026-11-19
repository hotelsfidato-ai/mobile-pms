/* ══════════════════════════════════════════════════════════════════
   THE FINANCE DESK'S THREE LISTS — Folios, Invoices, Payments — and an
   invoice's own page: the pure rules, ported from the web's
     src/modules/finance/pages/Folios.tsx      the open bills, the counts
     src/modules/finance/data/folios.ts        listOpenFolios, listGroupBills
     src/modules/finance/pages/Billing.tsx     PaymentsPage
     src/modules/finance/data/billing.ts       the shapes; paymentsByMethod
     src/modules/finance/pages/Invoices.tsx    ready to bill, Issued, VAT bills
     src/modules/finance/pages/Invoice.tsx     the tax invoice's facts
     src/modules/finance/pages/VatBill.tsx     the VAT bill's
     src/modules/finance/flows/CreditNoteFlow.tsx
     src/lib/format.ts                         amountInWords
     src/lib/testHotel.ts                      isTestHotel
     api/src/roleGate.ts                       who may (READ_RULES, WRITE_RULES)

   THE PHONE ADDS NO MONEY UP. Where the web sums in the browser (Folios'
   Outstanding, Overpaid and Net position; Payments' tile per method and
   Total received; the invoice's rate-wise tax table, its per-line CGST and
   SGST, its Total payment and Balance) the phone shows no figure of its
   own: a dash, said as "not sent", and the server's rows (MODULE.md, asked
   of the PMS). It COUNTS rows (how many folios owe, how many receipts),
   which moves no rupee. Every figure printed is one the server sent, to the
   paisa (bill.ts `rupees`, MFIN-4, MEMORY 9), never rounded or clamped.
   Pure: no React Native, so books.check.ts runs under node.
   ══════════════════════════════════════════════════════════════════ */

import { DASH } from "../../core/format.ts";
import { rupees } from "./bill.ts";

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/* ── The shapes the API answers (the web's data files, cut to what is read) ── */

/** GET /folios (finance/folios.ts toFolio): every bill carrying a balance, by balance. */
export interface FolioRow {
  stayId: string | null;
  balance: number;
  /** A group's master bill (D27-226): no stay, the group named. */
  groupId?: string;
  group?: string | null;
}

/** A group's master bill, listed once under its name. */
export interface GroupBill { groupId: string; group: string | null; balance: number }

/** GET /payments (finance/billing.ts PaymentRow). `at` is Postgres's text: read through `instant()`. */
export interface PaymentRow {
  id: string;
  businessDate: string;
  at: string;
  guest: string;
  roomNumber: string;
  reference: string;
  method: string;
  description: string;
  amount: number;
  user: string | null;
  reversed: boolean;
}

/** GET /billable (BillableRow): one row per bill of a departed stay. */
export interface BillableRow {
  folioId: string;
  stayId: string;
  reference: string;
  guest: string;
  roomNumber: string;
  billTo: string;
  nights: number;
  charges: number;
  tax: number;
  balance: number;
  status: "settled" | "outstanding" | "overpaid";
  invoice: string | null;
}

/** GET /invoice-series (InvoiceSeriesState). */
export interface SeriesState { prefix: string; finYear: string; next: string; issued: number; note: string }

/** GET /invoices (IssuedInvoice): the last 200, newest first. `issuedAt` is the server's words. */
export interface IssuedInvoice {
  number: string;
  recipient: string | null;
  total: number;
  taxTotal: number;
  issuedAt: string;
  isCreditNote: boolean;
  creditedBy: string | null;
}

/** GET /vat-bills (IssuedVatBill). */
export interface IssuedVatBill {
  number: string;
  recipient: string | null;
  total: number;
  vatTotal: number;
  issuedAt: string;
  isCancellation: boolean;
  cancelledBy: string | null;
}

/** GET /invoices/:number (InvoiceDetail), cut to what the phone shows. */
export interface InvoiceDetail {
  number: string;
  finYear: string;
  issuedAt: string;
  issuedBy: string | null;
  businessDate: string | null;
  supplier: {
    name: string; address: string | null; city: string | null; state: string | null; gstin: string | null;
    fssai?: string | null; phone?: string | null; email?: string | null; website?: string | null; pan?: string | null;
  };
  stay?: {
    reference: string; guest: string; roomType: string; room: string | null; grCardNo?: number | null;
    adults: number; children: number; plan: string | null; nights: number;
    arrival: string; departure: string; source: string | null; checkedInBy: string | null; checkedOutBy: string | null;
  } | null;
  payments?: Array<{ date: string; description: string; amount: number }>;
  recipient: { name: string | null; gstin: string | null; address: string | null };
  placeOfSupply: string | null;
  sacCode: string;
  lines: Array<{
    description: string; category: string; amount: number; taxRate: number; taxAmount: number; date: string;
    sac?: string | null; vat?: { rate: number; amount: number };
  }>;
  taxableValue: number;
  cgst: { rate: number | null; amount: number };
  sgst: { rate: number | null; amount: number };
  taxTotal: number;
  total: number;
  creditsInvoiceId: string | null;
  creditsNumber: string | null;
  reason: string | null;
  creditedBy: string | null;
  vatBill?: string | null;
  masterBill?: boolean;
}

/** GET /vat-bills/:number (VatBillDetail). */
export interface VatBillDetail {
  number: string;
  finYear: string;
  issuedAt: string;
  issuedBy: string | null;
  businessDate: string | null;
  supplier: { name: string; address: string | null; city: string | null; state: string | null };
  recipient: string | null;
  invoice: string | null;
  order: string | null;
  lines: Array<{ description: string; qty: number | null; amount: number }>;
  discount: number;
  taxableValue: number;
  vatRate: number | null;
  vatTotal: number;
  total: number;
  cancelsNumber: string | null;
  reason: string | null;
  cancelledBy: string | null;
}

/* ── Who may (api/src/roleGate.ts; each list from permissions.ts, 19 Nov) ── */

const BILL_READERS: readonly string[] = ["owner", "admin", "gm", "hotel_manager", "front_desk", "finance", "read_only"];
/** invoice approve (D22-33): a credit note, a VAT bill's cancellation. */
const APPROVERS: readonly string[] = ["owner", "admin", "gm", "finance"];
const READERS = "the owner, an administrator, the general manager, the hotel manager, reception, the accountant or a viewer";
const FOUR = "the owner, an administrator, the general manager or the accountant";
const allow = (list: readonly string[], role: string | null, refusal: string) =>
  role != null && list.includes(role) ? null : refusal;

/** GET /folios, /billable, /invoices, /vat-bills (BILLS): null, or the API's sentence. */
export const whyNotReadBills = (role: string | null) =>
  allow(BILL_READERS, role, `Reading bills is for ${READERS}. Ask one of them.`);
/** GET /payments (MONEY: `payment` view). */
export const whyNotReadPayments = (role: string | null) =>
  allow(BILL_READERS, role, `Reading payments and the cash drawer is for ${READERS}. Ask one of them.`);
/** POST /invoices/:number/credit-note (CREDIT_NOTE). */
export const whyNotCreditNote = (role: string | null) =>
  allow(APPROVERS, role, `Issuing a credit note is for ${FOUR}. Ask one of them.`);
/** POST /vat-bills/:number/cancel (VAT_CANCEL). */
export const whyNotCancelVat = (role: string | null) =>
  allow(APPROVERS, role, `Cancelling a VAT bill is for ${FOUR}. Ask one of them.`);

/* ── The writes, by address (writes.ts's way, so the check proves each refused offline) ── */

const H = (code: string) => `/api/hotels/${code}`;
/** An invoice number carries slashes (5EL/2026-27/00001): one segment, encoded, as the web sends it. */
const doc = (n: string) => encodeURIComponent(n);
export const BOOK_WRITES = {
  /** POST { reason }: a credit note against a tax invoice. */
  creditNote: (code: string, number: string) => `${H(code)}/invoices/${doc(number)}/credit-note`,
  /** POST { reason }: a VAT bill's cancellation. */
  cancelVat: (code: string, number: string) => `${H(code)}/vat-bills/${doc(number)}/cancel`,
} as const;
export const BOOK_READS = {
  invoice: (code: string, number: string) => `${H(code)}/invoices/${doc(number)}`,
  vatBill: (code: string, number: string) => `${H(code)}/vat-bills/${doc(number)}`,
} as const;

/* ── Folios (Folios.tsx, folios.ts) ── */

/** listOpenFolios: the bills of the stays that owe, with their stay, by
    balance (overpaid first). A bill whose stay was not sent is left out, as
    the web does. Nothing is summed: each row carries its own balance. */
export function openFolios<S extends { id: string }>(folios: readonly FolioRow[], stays: readonly S[]): Array<S & { balance: number }> {
  const byId = new Map(stays.map((s) => [s.id, s]));
  return folios
    .flatMap((f) => (f.stayId !== null && byId.has(f.stayId) ? [{ ...byId.get(f.stayId)!, balance: f.balance }] : []))
    .sort((a, b) => a.balance - b.balance);
}

/** listGroupBills: a group's master bill, once, under the group's name. */
export const groupBills = (folios: readonly FolioRow[]): GroupBill[] =>
  folios.flatMap((f) => (f.groupId ? [{ groupId: f.groupId, group: f.group ?? null, balance: f.balance }] : []));

/** How many bills owe and how many are overpaid: a count, never a sum. */
export function openCounts(balances: readonly number[]) {
  return {
    open: balances.length,
    owing: balances.filter((b) => b > 0).length,
    overpaid: balances.filter((b) => b < 0).length,
  };
}

export const openPill = (open: number) => ({ label: `${open} open`, tone: open ? "warning" as const : "success" as const });
export const owingNote = (n: number) => `${plural(n, "folio")} owing`;
export const overpaidNote = (n: number) => (n ? `${plural(n, "refund")} due` : "Nothing to refund");
/** The web's "N guests overpaid, ₹X to return", without the ₹X the browser adds up. */
export const overpaidBanner = (n: number) => `${plural(n, "guest")} overpaid`;

/** A balance's colour and words, as StayTable prints it: owed red, in credit
    blue with " over", settled green. The figure is the server's, to the paisa. */
export function balanceShown(b: number | null | undefined): { text: string; over: boolean; tone: "owes" | "credit" | "settled" | "none" } {
  if (b == null || !Number.isFinite(b)) return { text: DASH, over: false, tone: "none" };
  return { text: rupees(Math.abs(b)), over: b < 0, tone: b > 0 ? "owes" : b < 0 ? "credit" : "settled" };
}

/** A group bill's balance (Folios.tsx 136): "−₹1,050.00" when owed to the group. */
export const groupBalance = (b: number) => `${b < 0 ? "−" : ""}${rupees(Math.abs(b))}`;

/* ── Payments (Billing.tsx, billing.ts) ── */

/** paymentsByMethod, COUNTED: the live receipts of each way of paying.
    The web also adds each method's amount and orders by it; the phone sums
    no money, so the tiles carry the count and the order is by count. */
export function methodCounts(rows: readonly PaymentRow[]): Array<{ method: string; count: number }> {
  const map = new Map<string, number>();
  for (const r of rows) if (!r.reversed) map.set(r.method, (map.get(r.method) ?? 0) + 1);
  return [...map].map(([method, count]) => ({ method, count })).sort((a, b) => b.count - a.count);
}

export const receiptsNote = (n: number) => plural(n, "receipt");

/** The note under the list (Billing.tsx 150-157), or null when nothing was reversed. */
export function reversedNote(rows: readonly PaymentRow[]): string | null {
  const n = rows.filter((r) => r.reversed).length;
  if (!n) return null;
  return `${n} receipt${n === 1 ? " is" : "s are"} marked Reversed. The ledger is append-only, so a reversal is its own line and the original stays where it was - a receipt that disappeared is a receipt somebody would go looking for.`;
}

/* ── Invoices (Invoices.tsx) ── */

/** "N ready to bill": the settled bills with no invoice standing. */
export const readyToBill = (rows: readonly BillableRow[]) => rows.filter((b) => b.status === "settled" && !b.invoice).length;

/** Rule 6: a bill that cannot be invoiced yet says why (Invoices.tsx 254-258). */
export const whyNotIssueYet = (status: BillableRow["status"]): string | null =>
  status === "outstanding" ? "The folio still carries a balance. Settle it, or transfer it to the city ledger, before invoicing."
    : status === "overpaid" ? "The folio is overpaid. Refund the difference before invoicing." : null;

/** An issued number's state (Invoices.tsx 124-137): credited, a credit note (a dash), or issued. */
export function issuedState(i: { creditedBy: string | null; isCreditNote: boolean }): { label: string; tone: "warning" | "success"; note?: string } | null {
  if (i.creditedBy) return { label: "credited", tone: "warning", note: `Cancelled by ${i.creditedBy}` };
  if (i.isCreditNote) return null;
  return { label: "issued", tone: "success" };
}
/** A VAT bill's (Invoices.tsx 181-189). */
export function vatState(v: { cancelledBy: string | null; isCancellation: boolean }): { label: string; tone: "warning" | "success"; note?: string } | null {
  if (v.cancelledBy) return { label: "cancelled", tone: "warning", note: `Cancelled by ${v.cancelledBy}` };
  if (v.isCancellation) return null;
  return { label: "issued", tone: "success" };
}

/* ── An invoice's own page (Invoice.tsx) ── */

/** A test hotel (D27-296): the server's `testOf`, never guessed from a name. */
export const isTestHotel = (h: { testOf?: string | null }) => Boolean(h.testOf);
export const TEST_DOCUMENT = "TEST · NOT VALID";

const FOOD = ["food", "beverage", "minibar"];

export const invoiceTitle = (d: Pick<InvoiceDetail, "creditsInvoiceId">) => (d.creditsInvoiceId !== null ? "Credit Note" : "Tax Invoice");
export const vatTitle = (d: Pick<VatBillDetail, "cancelsNumber">) => (d.cancelsNumber !== null ? "VAT credit note" : "VAT bill");

/** Only a live tax invoice is offered "Cancel this invoice" (Invoice.tsx 213):
    a credit note cannot be credited, a cancelled one has nothing left. */
export const creditable = (d: Pick<InvoiceDetail, "creditsInvoiceId" | "creditedBy">) => d.creditsInvoiceId === null && !d.creditedBy;
export const cancellable = (d: Pick<VatBillDetail, "cancelsNumber" | "cancelledBy">) => d.cancelsNumber === null && !d.cancelledBy;

/** The document's sign: a credit note's lines are the invoice's, negated, so
    its figures print negative (Invoice.tsx `sign`). A sign, not a sum. */
export const signed = (creditNote: boolean, n: number) => (creditNote ? -n : n);

/** The place of supply's sentence (Invoice.tsx 444-448). */
export const supplyLine = (sac: string) => sac === "996311"
  ? "Accommodation is supplied at the property's location - IGST Act s.12(3)(b) - so this supply is intra-state."
  : "A function at the property is supplied at the property's location - IGST Act s.12(3)(c) - so this supply is intra-state.";

/** placeAfter (finance/place.ts): the city and state after an address, once. */
export function placeAfter(address: string | null, city: string | null, state: string | null): string | null {
  if (city && (address ?? "").toLowerCase().includes(city.toLowerCase())) return null;
  const parts = [city, state].filter(Boolean);
  return parts.length ? parts.join(", ") : null;
}
export const placeLine = (address: string | null, city: string | null, state: string | null) =>
  [address, placeAfter(address, city, state)].filter(Boolean).join(", ");

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** "25 Aug 2026", the web's dateShort, of a day the server sent. */
export const dayOf = (iso: string | null | undefined) =>
  !iso ? DASH : `${Number(iso.slice(8, 10))} ${MONTHS[Number(iso.slice(5, 7)) - 1]} ${iso.slice(0, 4)}`;

/** The two columns of facts, in the web's order (Invoice.tsx 401-439); a dash where none is held. */
export function invoiceFacts(d: InvoiceDetail, test: boolean): { left: Array<[string, string]>; right: Array<[string, string]> } {
  const s = d.stay ?? null;
  const left: Array<[string, string]> = [];
  if (s) left.push(["Booking ref", s.reference], ["G.R. card no", s.grCardNo == null ? DASH : String(s.grCardNo)], ["Guest name", s.guest]);
  left.push(["Bill to", d.recipient.name ?? DASH]);
  if (d.recipient.address) left.push(["Bill to address", d.recipient.address]);
  /* Not blank: an unregistered recipient is a fact the invoice states. No GSTIN on a test hotel's. */
  if (!test) left.push(["Bill to GSTIN", d.recipient.gstin ?? "not registered"]);
  if (s) left.push(["Source", s.source ?? DASH]);
  left.push(["Place of supply", d.placeOfSupply ?? DASH]);
  if (d.lines.some((l) => FOOD.includes(l.category))) left.push(["FSSAI licence", d.supplier.fssai ?? DASH]);
  const right: Array<[string, string]> = [];
  if (d.businessDate) right.push(["Business date", dayOf(d.businessDate)]);
  if (s) {
    right.push(
      ["Room", `${s.roomType} / ${s.room ?? DASH}`],
      ["Persons", `${plural(s.adults, "adult")} · ${s.children} ${s.children === 1 ? "child" : "children"}`],
      ["Rate type", s.plan ?? DASH],
      ["Nights", s.nights === 0 ? "Day use" : String(s.nights)],
      ["Arrival", s.arrival],
      ["Departure", s.departure],
    );
  }
  return { left, right };
}

/** "CGST @ 2.5%" when the invoice's lines share one rate, else the word alone
    (the server's `rate` is null then: no single rate can honestly be named). */
export const halfLabel = (word: "CGST" | "SGST", rate: number | null) => (rate === null ? word : `${word} @ ${rate}%`);

/* ── The amount in words (src/lib/format.ts amountInWords): Indian numbering ── */

const ONES = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve",
  "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
function underHundred(n: number): string {
  if (n < 20) return ONES[n]!;
  const o = ONES[n % 10]!;
  return o ? `${TENS[Math.floor(n / 10)]!} ${o}` : TENS[Math.floor(n / 10)]!;
}
function underThousand(n: number): string {
  const h = Math.floor(n / 100);
  const rest = underHundred(n % 100);
  if (!h) return rest;
  return rest ? `${ONES[h]} Hundred ${rest}` : `${ONES[h]} Hundred`;
}
/** The server's total in words, paise stated apart: the tie-breaker against a smudged figure. */
export function amountInWords(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return DASH;
  const negative = value < 0;
  const totalPaise = Math.round(Math.abs(value) * 100);
  const rupee = Math.floor(totalPaise / 100);
  const paise = totalPaise % 100;
  const parts: string[] = [];
  const crore = Math.floor(rupee / 10_000_000);
  const lakh = Math.floor((rupee % 10_000_000) / 100_000);
  const thousand = Math.floor((rupee % 100_000) / 1_000);
  const rest = rupee % 1_000;
  if (crore) parts.push(`${underThousand(crore)} Crore`);
  if (lakh) parts.push(`${underThousand(lakh)} Lakh`);
  if (thousand) parts.push(`${underThousand(thousand)} Thousand`);
  if (rest) parts.push(underThousand(rest));
  const words = parts.length ? parts.join(" ") : "Zero";
  const unit = rupee === 1 ? "Rupee" : "Rupees";
  const said = paise ? `${words} ${unit} and ${underHundred(paise)} ${paise === 1 ? "Paisa" : "Paise"}` : `${words} ${unit}`;
  return `${negative ? "Minus " : ""}${said} Only`;
}

/* ── Paging a long list on a phone ── */

/** The web draws every row (Invoices' ready to bill ran to 765); the phone
    draws them PAGE at a time with "Show more", and says how many are shown. */
export const PAGE = 50;
export const shownLine = (shown: number, of: number) => (shown >= of ? `${of} shown` : `${shown} of ${of} shown`);
