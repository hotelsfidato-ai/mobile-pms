import type { ExportTable } from "../../core/exportDoc.ts";
import type { AuditUndoRecord } from "../night-audit/audit.ts";
import { DASH, msAt } from "../../core/format.ts";
import { dateYear } from "./figures.ts";

/* ══════════════════════════════════════════════════════════════════
   THE MONEY AND TAX REPORTS, AS THE PHONE DRAWS THEM (lane m13-rep-money,
   19 Nov). Pure: no React Native here, so money.check.ts runs it in node.

   Every figure is the SERVER'S. A report in the eZee layout arrives as one
   ReportDoc (src/modules/reports/data/document.ts, a copy of the API's
   api/src/modules/reports/document.ts) and is drawn as it came: its rows,
   its bands, its own total rows, in its own order. The phone adds nothing
   up, rounds nothing and clamps nothing (MEMORY 9): GST, TDS and the lodging
   tax must read on the phone exactly as the server filed them. A null is a
   figure the system does not hold and prints "-", never 0.
   ══════════════════════════════════════════════════════════════════ */

/* ── The document, the web's copy of the contract (data/document.ts) ── */

export type CellKind = "text" | "money" | "count" | "ratio" | "percent" | "date" | "datetime" | "rupees";
export type Cell = string | number | null;
export interface ReportColumn { key: string; label: string; kind: CellKind; group?: string }
export interface ReportRow { kind: "row" | "total" | "band"; indent?: 0 | 1 | 2 | 3; unit?: CellKind; cells: Record<string, Cell> }
export interface ReportSection { key: string; title: string; columns: ReportColumn[]; rows: ReportRow[]; empty?: string; note?: string }
export interface ReportFact { label: string; value: Cell; kind: CellKind }
export interface ReportDoc {
  report: string;
  title: string;
  property: { code: string; name: string; address: string | null; gstin: string | null; timezone?: string };
  orientation: "portrait" | "landscape";
  facts: ReportFact[];
  sections: ReportSection[];
  chart?: unknown;
  footnotes: string[];
}

/** The reports of this lane that come as one document (data/document.ts ReportKey). */
export type DocKey =
  | "city-ledger" | "lodging-tax" | "voids" | "nc-bills" | "tds" | "petty-cash"
  | "dues-by-age" | "company-statement" | "commission" | "gstr-1" | "input-tax-credit" | "gst-advances";

/** data/document.ts ReportQuery. */
export interface ReportQuery { asOn?: string; month?: string; from?: string; ignoreZero?: boolean; account?: string }

/** The question, in getReport's own order (data/document.ts 120-128). */
export function queryString(q: ReportQuery): string {
  const p: string[] = [];
  const put = (k: string, v: string) => p.push(`${k}=${encodeURIComponent(v)}`);
  if (q.asOn) put("asOn", q.asOn);
  if (q.month) put("month", q.month);
  if (q.from) put("from", q.from);
  if (q.ignoreZero !== undefined) put("ignoreZero", q.ignoreZero ? "1" : "0");
  if (q.account) put("account", q.account);
  return p.length ? `?${p.join("&")}` : "";
}

/* ── A cell as the web writes it (components/ReportView.tsx formatCell) ── */

/* Paise kept: the web's moneyPrecise, ₹1,20,000.00 (src/lib/format.ts). */
const inrPrecise = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const rupees = (n: number) => inrPrecise.format(n);
const num = new Intl.NumberFormat("en-IN");

/** "2026-08-25" -> "25/08/2026" (format.ts dateReport); anything else "-". */
export function dateReport(value: string | null | undefined): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value ?? "");
  return m ? `${m[3]}/${m[2]}/${m[1]}` : DASH;
}

/** A server moment -> "25/08/2026 04:12:43 PM" in the property's clock
    (format.ts dateTimeReport), through the core's ISO reader first (MEMORY 7). */
export function dateTimeReport(value: string, timeZone: string): string {
  const ms = msAt(value);
  if (ms === null) return DASH;
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone, day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true,
  }).formatToParts(new Date(ms));
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("day")}/${get("month")}/${get("year")} ${get("hour")}:${get("minute")}:${get("second")} ${get("dayPeriod").toUpperCase()}`;
}

const numeric = (kind: CellKind) => kind !== "text" && kind !== "date" && kind !== "datetime";

/** One cell, exactly as ReportView prints it. Money keeps its paise; the
    percent and the ratio are written as the web writes them (two places). */
export function formatCell(value: Cell | undefined, kind: CellKind, timeZone = "Asia/Kolkata"): string {
  if (value === null || value === undefined || value === "") return DASH;
  if (typeof value === "string") {
    /* A label in a date column ("Total") is words, not a broken date. */
    if (kind === "date" && /^\d{4}-\d{2}-\d{2}$/.test(value)) return dateReport(value);
    if (kind === "datetime" && msAt(value) !== null) return dateTimeReport(value, timeZone);
    return value;
  }
  switch (kind) {
    case "money": case "rupees": return rupees(value);
    case "percent": return `${value.toFixed(2)}%`;
    case "count": return num.format(value);
    case "ratio": return num.format(Math.round(value * 100) / 100);
    default: return String(value);
  }
}

/** The line under the masthead: "Date From 11/10/2026 To 11/10/2026 …" (factsLine). */
export const factsLine = (facts: ReportFact[], timeZone?: string) =>
  facts.map((f) => `${f.label} ${formatCell(f.value, f.kind, timeZone)}`).join("   ");

/* ── The document as cards: a row too wide for a phone, labelled ── */

export interface Figure { label: string; text: string; missing: boolean; negative: boolean }
export type CardItem =
  | { kind: "band"; text: string }
  | { kind: "row" | "total"; title: string; indent: number; figures: Figure[] };
export interface CardSection { key: string; title: string; items: CardItem[]; empty: string; note?: string }

/** A column's label as the exports write a grouped one: "CGST Net amt.". */
export const columnLabel = (c: ReportColumn) => (c.group ? `${c.group} ${c.label}` : c.label);

/** Every section, every row in the server's order: the first column is the
    card's title, the rest its labelled figures in the columns' order. The
    server's total rows stay total rows; nothing is added (ReportView Line). */
export function docCards(doc: ReportDoc): CardSection[] {
  const tz = doc.property.timezone ?? "Asia/Kolkata";
  return doc.sections.map((s) => {
    const [first, ...rest] = s.columns;
    const items: CardItem[] = s.rows.map((r): CardItem => {
      if (r.kind === "band") return { kind: "band", text: formatCell(first ? r.cells[first.key] ?? null : null, "text") };
      const isTotal = r.kind === "total";
      const figures: Figure[] = [];
      for (const c of rest) {
        const value = r.cells[c.key] ?? null;
        const isNumber = numeric(c.kind);
        /* A total leaves its empty words blank: a total has no guest. */
        if (value === null && !isNumber && isTotal) continue;
        const kind = isNumber && r.unit ? r.unit : c.kind;
        figures.push({
          label: columnLabel(c), text: formatCell(value, kind, tz), missing: value === null || value === "",
          negative: typeof value === "number" && value < 0 && (kind === "money" || kind === "rupees"),
        });
      }
      const head = first ? r.cells[first.key] ?? null : null;
      return {
        kind: isTotal ? "total" : "row", indent: r.indent ?? 0, figures,
        title: first ? formatCell(head, first.kind, tz) : DASH,
      };
    });
    return { key: s.key, title: s.title, items, empty: s.empty ?? "Nothing to report.", ...(s.note ? { note: s.note } : {}) };
  });
}

/** Every account the City ledger names (Ledgers.tsx CompanyStatementPage),
    zero balances included, with the one in the address kept. */
export function accountNames(doc: ReportDoc | null | undefined, keep?: string): string[] {
  const names = (doc?.sections[0]?.rows ?? [])
    .filter((r) => r.kind === "row" && typeof r.cells["account"] === "string")
    .map((r) => r.cells["account"] as string);
  return [...new Set([...names, ...(keep ? [keep] : [])])];
}

/* ── Periods (data/statistics.ts monthOf; the pages' own words) ────── */

const MONTHS = ["January", "February", "March", "April", "May", "June", "July",
  "August", "September", "October", "November", "December"];
export const monthStartOf = (date: string) => `${date.slice(0, 7)}-01`;
/** "2026-10" -> "October 2026" (Gst.tsx monthName). */
export const monthWords = (month: string) => `${MONTHS[Number(month.slice(5, 7)) - 1] ?? ""} ${month.slice(0, 4)}`;
/** A month n months on, "YYYY-MM". */
export function addMonths(month: string, n: number): string {
  const i = Number(month.slice(0, 4)) * 12 + Number(month.slice(5, 7)) - 1 + n;
  return `${Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, "0")}`;
}
/** "1 Oct 2026 to 11 Oct 2026", or the one day (Voids.tsx WindowReport). */
export const rangeWords = (from: string, to: string) =>
  from === to ? dateYear(to) : `${dateYear(from)} to ${dateYear(to)}`;

/* ── The four lists the server sends as rows (data/reportData.ts) ──── */

export interface GuestLedgerRow {
  folioId: string; reference: string; guest: string; room: string; status: string;
  opening: number; charges: number; payments: number; closing: number;
}
export interface CashierShiftRow { staffId: string | null; cashier: string | null; method: string; count: number; amount: number }
export interface GstSalesRow {
  number: string; issued: string; recipient: string | null; gstin: string | null; placeOfSupply: string | null;
  sac: string; taxable: number; cgst: number; sgst: number; total: number; creditsInvoice: string | null; type: "B2B" | "B2C";
}
/** The fields the register's table shows (reportData.ts CFormRow, trimmed). */
export interface CFormRow {
  guest: string; nationality: string; passport: string | null; visaNumber: string | null; visaType: string | null;
  arrivedFrom: string | null; arrivedAt: string | null; purpose: string | null; departedAt: string | null;
  nextDestination: string | null; address: string | null; room: string; arrived: string; departed: string;
  reference: string | null; departureReference: string | null;
}
export interface Rows<T> { from: string; to: string; rows: T[]; note?: string }

/** Compliance.tsx METHOD_LABEL. */
const METHOD: Record<string, string> = {
  cash: "Cash", card: "Credit card", upi: "UPI", bank_transfer: "Bank transfer",
  cheque: "Cheque", city_ledger: "City ledger", unrecorded: "Unrecorded",
};
export const methodLabel = (m: string) => METHOD[m] ?? m;

/** The Form III register's "N awaiting an FRRO number" (Compliance.tsx CFormPage). */
export const unfiled = (rows: CFormRow[]) => rows.filter((r) => !r.reference).length;
/** "YYYY-MM-DD HH:MM" in the property's clock, as the register prints it. */
export const when = (at: string) => `${dateYear(at.slice(0, 10))}, ${at.slice(11)}`;

/** The words where the web draws a total it adds up in the browser: the
    server sends no total for these lists, so the phone draws none. */
export const NO_TOTAL = "The total is on the website for now: the server sends each row, and the website adds them up.";

/* ── The accounting export (src/modules/accounting/data/accounting.ts) ── */

export type ExportFormat = "day-book-csv" | "day-book-xlsx" | "tally-prime-xml" | "tally-erp9-xml";
export const FORMATS: ReadonlyArray<{ key: ExportFormat; label: string; what: string }> = [
  { key: "day-book-csv", label: "Day book (CSV)", what: "One row a day: sales, the tax on them and what was received. Every accounting package opens it." },
  { key: "day-book-xlsx", label: "Day book (Excel)", what: "The same columns and figures as the CSV, as an Excel workbook." },
  { key: "tally-prime-xml", label: "Tally Prime (XML)", what: "Sales, receipt, payment and journal vouchers for days the night audit has closed." },
  { key: "tally-erp9-xml", label: "Tally ERP 9 (XML)", what: "The same vouchers in the older Tally's format." },
];
export const isTally = (f: ExportFormat) => f === "tally-prime-xml" || f === "tally-erp9-xml";

export interface TallyLedger { key: string; label: string; what: string; name: string | null }
export interface TallyLedgers { ledgers: TallyLedger[]; missing: string[] }

/** Why this format cannot be exported, naming which ledgers, or null (whyNot). */
export function whyNot(format: ExportFormat, ledgers: TallyLedgers | undefined): string | null {
  if (!isTally(format)) return null;
  if (!ledgers) return "Reading the ledger names.";
  return ledgers.missing.length ? `Type these ledger names first: ${ledgers.missing.join(", ")}.` : null;
}

export interface DayBookRow {
  date: string; room: number; roomTax: number; extra: number; food: number; otherExtra: number; extraTax: number;
  pos: number; posTax: number; discount: number; alcohol: number; vat: number; sales: number; tax: number;
  receipt: number; companyReceipt?: number | null; closed: boolean;
}
export interface DayBook {
  property: { code: string; name: string };
  businessDate: string; from: string; to: string;
  days: DayBookRow[];
  total: Omit<DayBookRow, "date" | "closed">;
  openDays: string[];
  companyReceipts?: Array<{ date: string; account: string; method: string; reference: string | null; amount: number }>;
}

/** Accounting.tsx COLUMNS, in its order: each day's figures. */
export const DAY_COLUMNS: ReadonlyArray<[keyof DayBookRow, string]> = [
  ["room", "Room revenue"], ["roomTax", "Room tax"], ["food", "Food charged to a room"], ["otherExtra", "Other extras"],
  ["extraTax", "Extra tax"], ["pos", "Restaurant"], ["posTax", "Restaurant tax"], ["discount", "Discount"],
  ["alcohol", "Alcohol"], ["vat", "VAT"], ["sales", "Sales"], ["tax", "GST"], ["receipt", "Receipts"],
  ["companyReceipt", "Received from companies"],
];

/** A figure of the day book: the server's, paise kept; a dash where the
    answer has none (the web writes 0 for a missing companyReceipt). */
export const bookFigure = (v: unknown) => (typeof v === "number" ? rupees(v) : DASH);

/** A range where nothing was charged or received (Accounting.tsx quiet). */
export const quiet = (b: DayBook) =>
  b.total.sales === 0 && b.total.tax === 0 && b.total.vat === 0 && b.total.receipt === 0 && !b.total.companyReceipt;

/** The yellow note over a range the night audit has not closed (DayBookTable). */
export function openDaysWords(b: DayBook): string | null {
  const first = b.openDays[0];
  if (!first) return null;
  return `${b.openDays.length === 1
    ? `The night audit has not run for ${dateYear(first)}. Its figures are here and may still change.`
    : `The night audit has not run for ${b.openDays.length} of these days, from ${dateYear(first)}. Their figures are here and may still change.`}`
    + ` Today is ${dateYear(b.businessDate)} at this property.`;
}

/* ── Night audits cancelled in the last 60 days (Accounting.tsx CancelledDays) ── */

const RECENT_MS = 60 * 86_400_000;
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** night-audit/data/nightAudit.ts tallyDays. */
export const tallyDays = (first: string, last: string) =>
  first === last
    ? `Tally: if ${dateYear(first)} was already imported into Tally, delete that day there and export it again once it is closed again.`
    : `Tally: if ${dateYear(first)} to ${dateYear(last)} were already imported into Tally, delete those days there and export them again once each is closed again.`;

/** The cancels of the last 60 days, as the card says them. A time the phone
    cannot read is left out, as the web's NaN comparison leaves it out. */
export function cancelledLines(undos: AuditUndoRecord[], now: number): string[] {
  return undos.flatMap((u) => {
    const at = msAt(u.undoneAt);
    if (at === null || at < now - RECENT_MS) return [];
    const d = new Date(at);
    return [`Cancelled on ${d.getDate()} ${MON[d.getMonth()]} ${d.getFullYear()}: ${tallyDays(u.backTo, u.lastDay)}`];
  });
}

/* ── Taken away: print, save as PDF, share (src/core/Export.tsx) ──────
   Built from the rows the screen shows, each cell as the screen writes it;
   the server's own total rows where it sends them, never a phone sum. */

/** A document, every section one after another, as the web's CSV lays it
    out (ReportView.tsx documentCsv): the section's title, its columns, its
    rows (its own total rows among them), a blank line. */
export function docTable(doc: ReportDoc, subtitle: string): ExportTable {
  const tz = doc.property.timezone ?? "Asia/Kolkata";
  const width = Math.max(1, ...doc.sections.map((s) => s.columns.length));
  const pad = (r: string[]) => [...r, ...Array<string>(width - r.length).fill("")];
  const rows: string[][] = [];
  for (const s of doc.sections) {
    rows.push(pad([s.title]));
    rows.push(pad(s.columns.map(columnLabel)));
    if (s.rows.length === 0) rows.push(pad([s.empty ?? "Nothing to report."]));
    for (const r of s.rows) {
      rows.push(pad(r.kind === "band"
        ? [formatCell(s.columns[0] ? r.cells[s.columns[0].key] ?? null : null, "text")]
        : s.columns.map((c) => {
          const v = r.cells[c.key] ?? null;
          /* A total leaves its empty words blank, as on screen. */
          if (r.kind === "total" && v === null && !numeric(c.kind)) return "";
          return formatCell(v, numeric(c.kind) && r.unit ? r.unit : c.kind, tz);
        })));
    }
    rows.push(pad([]));
  }
  return {
    title: doc.title, subtitle: `${doc.property.name} · ${subtitle}`,
    columns: pad([doc.title]), rows,
    ...(doc.footnotes.length ? { note: doc.footnotes.map((f) => `* ${f}`).join(" ") } : {}),
  };
}

/** A guest's ID number as a file carries it: the last four, the rest X
    (api/src/modules/reports/listExports.ts maskId) - a file leaves the system. */
export const maskId = (value: string) => {
  const v = value.replace(/\s+/g, "");
  return v.length <= 4 ? "X".repeat(v.length) : `${"X".repeat(v.length - 4)}${v.slice(-4)}`;
};

const or = (v: string | null | undefined) => (v == null || v === "" ? DASH : v);

/** The four lists as their web files carry them (Compliance.tsx ExportButtons columns). */
export const guestLedgerTable = (d: Rows<GuestLedgerRow>, subtitle: string): ExportTable => ({
  title: "Guest ledger", subtitle,
  columns: ["Reference", "Guest", "Room", "Status", "Opening", "Charges", "Received", "Closing"],
  rows: d.rows.map((r) => [r.reference, r.guest, r.room, r.status, rupees(r.opening), rupees(r.charges), rupees(r.payments), rupees(r.closing)]),
  note: NO_TOTAL,
});
export const cashierTable = (d: Rows<CashierShiftRow>, subtitle: string): ExportTable => ({
  title: "Cashier shift", subtitle,
  columns: ["Cashier", "Method", "Receipts", "Amount"],
  rows: d.rows.map((r) => [or(r.cashier), methodLabel(r.method), String(r.count), rupees(r.amount)]),
  note: NO_TOTAL,
});
export const gstTable = (d: Rows<GstSalesRow>, subtitle: string): ExportTable => ({
  title: "GST sales register", subtitle,
  columns: ["Invoice number", "Issued", "Recipient", "Recipient GSTIN", "Type", "Place of supply", "SAC", "Taxable value", "CGST", "SGST", "Total", "Credits invoice"],
  rows: d.rows.map((r) => [r.number, dateReport(r.issued), or(r.recipient), or(r.gstin), r.type, or(r.placeOfSupply), r.sac,
    rupees(r.taxable), rupees(r.cgst), rupees(r.sgst), rupees(r.total), or(r.creditsInvoice)]),
  note: NO_TOTAL,
});
export const cFormTable = (d: Rows<CFormRow>, subtitle: string): ExportTable => ({
  title: "Form III register", subtitle,
  columns: ["Name (as in the passport)", "Nationality", "Passport number", "Visa or OCI number", "Visa type", "Arrived from",
    "Arrival (date and time)", "Purpose of visit", "Departure (date and time)", "Next destination", "Room", "Booked from", "Booked to",
    "Portal number, arrival", "Portal number, departure"],
  rows: d.rows.map((r) => [r.guest, r.nationality, r.passport ? maskId(r.passport) : DASH, r.visaNumber ? maskId(r.visaNumber) : DASH,
    or(r.visaType), or(r.arrivedFrom), or(r.arrivedAt), or(r.purpose), or(r.departedAt), or(r.nextDestination), r.room,
    dateReport(r.arrived), dateReport(r.departed), or(r.reference), or(r.departureReference)]),
  note: "ID numbers show their last four characters only.",
});

/** The day book, day by day, and the server's own total of the range. */
export const dayBookTable = (b: DayBook, subtitle: string): ExportTable => ({
  title: "Day book", subtitle,
  columns: ["Date", ...DAY_COLUMNS.map(([, label]) => label), "Night audit"],
  rows: b.days.map((d) => [dateReport(d.date), ...DAY_COLUMNS.map(([k]) => bookFigure(d[k])), d.closed ? "Closed" : "Not run"]),
  totals: ["Total", ...DAY_COLUMNS.map(([k]) => bookFigure((b.total as Record<string, unknown>)[k])), ""],
});
