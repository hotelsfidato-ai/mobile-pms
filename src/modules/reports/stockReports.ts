import { DASH, instant } from "../../core/format.ts";
import { rupees } from "../finance/bill.ts";
import { dayText } from "../stores/shelf.ts";

/* ══════════════════════════════════════════════════════════════════
   THE STORE, BAR AND SUPPLIER REPORTS ON A PHONE (lane m13-rep-stock, 19 Nov)

   Every one of them is the server's document (api/src/modules/reports/
   document.ts, the web's copy src/modules/reports/data/document.ts): a
   property, a title, facts, sections of rows, footnotes. The web draws it
   with ReportView (src/modules/reports/components/ReportView.tsx) inside
   DocumentReport / ReportShell; here the same object becomes cards of
   labelled figures, in the web's order, because a phone cannot hold the
   web's table (BRIEF-T3). Nothing is added up, worked out or rounded here
   beyond the web's own formatCell: quantities, values, totals and the
   excise registers' bottles are the server's cells, as sent.
   ══════════════════════════════════════════════════════════════════ */

/* ── The document, as the server sends it (document.ts) ──────────── */

export type CellKind = "text" | "money" | "count" | "ratio" | "percent" | "date" | "datetime" | "rupees";
export type Cell = string | number | null;
export interface ReportColumn { key: string; label: string; kind: CellKind; group?: string }
export interface ReportRow { kind: "row" | "total" | "band"; indent?: 0 | 1 | 2 | 3; unit?: CellKind; cells: Record<string, Cell> }
export interface ReportSection { key: string; title: string; columns: ReportColumn[]; rows: ReportRow[]; empty?: string; note?: string }
export interface ReportFact { label: string; value: Cell; kind: CellKind }
export interface ReportChart { kind: "bar"; title: string; x: string[]; unit: CellKind; series: Array<{ label: string; values: Array<number | null> }> }
export interface ReportDoc {
  report: string;
  title: string;
  property: { code: string; name: string; address: string | null; gstin: string | null; timezone?: string };
  orientation: "portrait" | "landscape";
  facts: ReportFact[];
  sections: ReportSection[];
  chart?: ReportChart;
  footnotes: string[];
}

/* ── One cell, as the web prints it (ReportView.tsx formatCell) ───── */

const num = new Intl.NumberFormat("en-IN");
/** "25/08/2026" (src/lib/format.ts dateReport). */
export const dateReport = (value: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : DASH;
};
/** "25/08/2026 04:12:43 PM" in the property's time zone (dateTimeReport); the
    server's time made ISO first, as Hermes reads only ISO (MEMORY 7). */
export function dateTimeReport(value: string, timeZone: string): string {
  const ms = Date.parse(instant(value));
  if (Number.isNaN(ms)) return DASH;
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone, day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true,
    }).formatToParts(new Date(ms));
    const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
    return `${get("day")}/${get("month")}/${get("year")} ${get("hour")}:${get("minute")}:${get("second")} ${get("dayPeriod").toUpperCase()}`;
  } catch {
    return DASH;
  }
}

/** A figure nobody holds is "-", never 0 (D17-49); money to the paisa (moneyPrecise),
    a percent to two places, a count in Indian grouping, a ratio to two places. */
export function formatCell(value: Cell | undefined, kind: CellKind, timeZone = "Asia/Kolkata"): string {
  if (value === null || value === undefined || value === "") return DASH;
  if (typeof value === "string") {
    /* A label in a date column ("Total") is words, not a broken date. */
    if (kind === "date" && /^\d{4}-\d{2}-\d{2}$/.test(value)) return dateReport(value);
    if (kind === "datetime" && !Number.isNaN(Date.parse(instant(value)))) return dateTimeReport(value, timeZone);
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

export const numeric = (kind: CellKind) => kind !== "text" && kind !== "date" && kind !== "datetime";

/** The line over the sections: "From 01/10/2026   To 11/10/2026" (factsLine). */
export const factsLine = (facts: ReportFact[], timeZone?: string) =>
  facts.map((f) => `${f.label} ${formatCell(f.value, f.kind, timeZone)}`).join("   ");

/* ── A row as a card of labelled figures (ReportView's Line) ─────── */

export interface Figure { label: string; value: string; numeric: boolean; missing: boolean; negative: boolean }
/** In the columns' order: a lone figure, or a group's figures under its heading
    ("Opening balance": 2000, 1000, 750 … on the excise registers). */
export type Part = { group: null; figure: Figure } | { group: string; figures: Figure[] };
export type Card =
  | { kind: "band"; text: string }
  | { kind: "row" | "total"; title: string | null; indent: number; parts: Part[] };

export function cardOf(row: ReportRow, columns: ReportColumn[], timeZone = "Asia/Kolkata"): Card {
  const first = columns[0];
  if (row.kind === "band") return { kind: "band", text: formatCell(first ? row.cells[first.key] ?? null : null, "text") };
  const isTotal = row.kind === "total";
  /* The first column, when it is words or a date, names the card. A bare number
     ("1", a day of the month on FLR-3) is said with its column's name. */
  const titled = first !== undefined && !numeric(first.kind);
  let title: string | null = null;
  if (titled) {
    const v = formatCell(row.cells[first.key] ?? null, first.kind, timeZone);
    title = /^\d+$/.test(v) && first.label ? `${first.label} ${v}` : v;
  }
  const parts: Part[] = [];
  for (const c of titled ? columns.slice(1) : columns) {
    const value = row.cells[c.key] ?? null;
    const isNumber = numeric(c.kind);
    /* A total leaves its empty words blank (the web prints ""), and a column
       with no heading and nothing in it says nothing: neither is drawn. */
    if (value === null && !isNumber && (isTotal || !c.label)) continue;
    const kind = isNumber && row.unit ? row.unit : c.kind;
    const figure: Figure = {
      label: c.label, value: formatCell(value, kind, timeZone), numeric: isNumber, missing: value === null,
      negative: typeof value === "number" && value < 0 && kind === "money",
    };
    const last = parts.at(-1);
    if (c.group) {
      if (last && last.group === c.group) last.figures.push(figure);
      else parts.push({ group: c.group, figures: [figure] });
    } else parts.push({ group: null, figure });
  }
  return { kind: row.kind, title, indent: row.indent ?? 0, parts };
}

/** A section's cards; an empty one says why, in the server's words (SectionBody). */
export const sectionCards = (section: ReportSection, timeZone?: string) =>
  section.rows.map((r) => cardOf(r, section.columns, timeZone));
export const emptyWords = (section: ReportSection) => section.empty ?? "Nothing to report.";

/* ── The reports of this lane, as the web asks them ──────────────── */

/** src/modules/reports/pages/Store.tsx, Ledgers.tsx (SupplierDuesPage, SupplierStatementPage). */
export type StockReportKey =
  | "stock-on-hand" | "stock-movements" | "stock-consumption" | "stock-wastage" | "stock-count-differences"
  | "stock-dead" | "stock-cover" | "supplier-spend" | "equipment" | "bar-stock" | "flr-daily" | "flr-monthly"
  | "supplier-dues" | "supplier-statement";

type Span = "asOn" | "over" | "window" | "month" | "dues" | "statement";
interface About { title: string; what: string; span: Span }

/** Each report's heading while it loads, what it is called when it fails, and its question. */
export const STOCK_REPORTS: Readonly<Record<StockReportKey, About>> = {
  "stock-on-hand": { title: "Closing stock", what: "the closing stock", span: "asOn" },
  "stock-movements": { title: "Stock movement by day", what: "the stock movement", span: "over" },
  "stock-consumption": { title: "Consumption", what: "the consumption report", span: "over" },
  "stock-wastage": { title: "Wastage and breakage", what: "the wastage and breakage report", span: "over" },
  "stock-count-differences": { title: "Count differences", what: "the count differences", span: "over" },
  "stock-dead": { title: "Dead stock", what: "the dead stock report", span: "asOn" },
  "stock-cover": { title: "Days of cover", what: "the days of cover", span: "asOn" },
  "supplier-spend": { title: "Supplier spend", what: "the supplier spend", span: "over" },
  equipment: { title: "Equipment report", what: "the equipment report", span: "asOn" },
  /* Over any days, opening on the business date alone (the owner, 16 Nov). */
  "bar-stock": { title: "Bar stock", what: "the bar stock report", span: "window" },
  "flr-daily": { title: "FLR-1A/2A/3A (daily register)", what: "the daily excise register", span: "asOn" },
  "flr-monthly": { title: "FLR-3 (monthly register)", what: "the monthly excise register", span: "month" },
  "supplier-dues": { title: "Supplier dues", what: "the supplier dues", span: "dues" },
  "supplier-statement": { title: "Supplier statement", what: "the supplier's statement", span: "statement" },
};

/** The web's menu address of each (reports/nav.ts), which RequireAccess asks. */
export const webPath = (key: StockReportKey) => `/reports/${key}`;

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
export const monthStartOf = (date: string) => `${date.slice(0, 7)}-01`;

export interface Choice { from?: string; to?: string; supplier?: string; supplierName?: string }
export interface Asked { title: string; period: string; query: Record<string, string> | null }

/** What the screen asks and how it heads it, on the property's business date:
    a report as on it; over the 1st of its month to it; its month (FLR-3); a
    window (Bar stock); a supplier's days (the statement, nothing asked until one
    is picked - DocumentReport's `query` undefined). The param order is the web's. */
export function asked(key: StockReportKey, businessDate: string, choice: Choice = {}): Asked {
  const about = STOCK_REPORTS[key];
  const bd = businessDate;
  const first = monthStartOf(bd);
  switch (about.span) {
    case "asOn": return { title: about.title, period: dayText(bd), query: { asOn: bd } };
    case "over": return { title: about.title, period: `${dayText(first)} to ${dayText(bd)}`, query: { asOn: bd, from: first } };
    case "dues": return {
      title: about.title, period: `Owed on ${dayText(bd)} · paid ${dayText(first)} to ${dayText(bd)}`, query: { asOn: bd, from: first },
    };
    case "month": return {
      title: about.title, period: `${MONTHS[Number(bd.slice(5, 7)) - 1]} ${bd.slice(0, 4)}`, query: { asOn: bd, month: bd.slice(0, 7) },
    };
    case "window": {
      /* WindowReport: a cleared box falls back to the default end of the range. */
      const from = choice.from || bd;
      const to = choice.to || bd;
      return { title: about.title, period: from === to ? dayText(to) : `${dayText(from)} to ${dayText(to)}`, query: { asOn: to, from } };
    }
    case "statement": {
      const from = choice.from ?? first;
      const to = choice.to ?? bd;
      const ok = Boolean(choice.supplier && from && to && from <= to);
      return {
        title: choice.supplierName ? `Statement: ${choice.supplierName}` : about.title,
        period: ok ? `${dayText(from)} to ${dayText(to)}` : "Pick a supplier and the days",
        query: ok ? { asOn: to, from, supplier: choice.supplier! } : null,
      };
    }
  }
}

export const queryText = (query: Record<string, string>) =>
  Object.entries(query).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("&");

/* ── What came back (DocumentReport, ReadProblem.tsx readProblem) ─── */

/** A refusal is the server's no with its sentence (a 4xx: the role, Bar stock
    switched off, "Pick a supplier for the statement."), shown as "… is not
    available"; a 404 is "This property has no report to show."; nothing
    arriving or a 5xx is a failed read, said by the screen with Try again. */
export type Outcome = { doc: ReportDoc } | { refused: string } | { none: true };
export function outcomeOf(status: number, message: string): Outcome | null {
  if (status === 404) return { none: true };
  if (status >= 400 && status < 500) return { refused: message };
  return null;
}
export const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
export const refusedTitle = (what: string) => `${capital(what)} is not available`;
export const failedTitle = (what: string) => `${capital(what)} did not load`;
export const NO_REPORT = "This property has no report to show.";
export const CHOOSE_FIRST = "Choose above what the report is of.";

/* ── The foot (ReportShell): when this copy was produced, and by whom ── */

const two = (n: number) => String(n).padStart(2, "0");
/** "31/10/2026, 08:24:27 pm", the web's toLocaleString("en-IN") stamp, in the phone's own time. */
export function printedStamp(at: Date): string {
  const h = at.getHours();
  return `${two(at.getDate())}/${two(at.getMonth() + 1)}/${at.getFullYear()}, ${two(h % 12 || 12)}:${two(at.getMinutes())}:${two(at.getSeconds())} ${h < 12 ? "am" : "pm"}`;
}

/** The test hotel's mark on its reports (lib/testHotel.ts TEST_DOCUMENT, D27-296 (8)). */
export const TEST_DOCUMENT = "TEST · NOT VALID";

/* ── The export (src/core/exportDoc.ts ExportTable; BRIEF-T3 19 Nov) ─── */

/** The web's Print, PDF and CSV become the phone's print sheet and share sheet,
    from the cards the screen shows. Sections with the same columns keep them,
    each figure in its column ("Opening Balance 750" for a grouped one); sections
    whose columns differ (the excise registers' sizes) become one line per row,
    its figures said in words. The server's total rows go as rows, as it sent
    them: no totals line is made here. The facts and footnotes go under it. */
export interface DocExport {
  title: string; subtitle: string; columns: string[]; rows: string[][]; note?: string;
}
const sameColumns = (a: ReportColumn[], b: ReportColumn[]) =>
  a.length === b.length && a.every((c, i) => c.key === b[i]!.key && c.label === b[i]!.label && c.group === b[i]!.group);
const heading = (c: ReportColumn) => (c.group ? `${c.group} ${c.label}` : c.label);
export function exportOf(doc: ReportDoc, period: string): DocExport | null {
  const tz = doc.property.timezone ?? "Asia/Kolkata";
  const rowsIn = doc.sections.reduce((n, s) => n + s.rows.length, 0);
  if (rowsIn === 0) return null;
  const note = [factsLine(doc.facts, tz), ...doc.footnotes.map((f) => `* ${f}`)].filter(Boolean).join("\n");
  const base = { title: doc.title, subtitle: `${doc.property.name} · ${period}`, ...(note ? { note } : {}) };
  const one = doc.sections[0]!.columns;
  if (doc.sections.every((s) => sameColumns(s.columns, one))) {
    const rows = doc.sections.flatMap((s) => s.rows.map((r) => [s.title, ...one.map((c, i) => {
      if (r.kind === "band") return i === 0 ? formatCell(r.cells[c.key] ?? null, "text") : "";
      const v = r.cells[c.key] ?? null;
      if (v === null && !numeric(c.kind) && r.kind === "total") return "";
      return formatCell(v, numeric(c.kind) && r.unit ? r.unit : c.kind, tz);
    })]));
    return { ...base, columns: ["Section", ...one.map(heading)], rows };
  }
  const rows = doc.sections.flatMap((s) => sectionCards(s, tz).map((card) => {
    if (card.kind === "band") return [s.title, card.text, ""];
    const said = card.parts.map((p) => p.group === null
      ? `${p.figure.label} ${p.figure.value}`
      : `${p.group}: ${p.figures.map((f) => `${f.label} ${f.value}`).join(", ")}`);
    return [s.title, card.title ?? "", said.join(" · ")];
  }));
  return { ...base, columns: ["Section", "Line", "Figures"], rows };
}
