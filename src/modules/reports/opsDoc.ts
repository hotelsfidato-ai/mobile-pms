/* ══════════════════════════════════════════════════════════════════
   A REPORT, AS ONE OBJECT, ON A PHONE (mobile/m13-rep-ops, 19 Nov)

   The server builds every report in the owner's eZee layout as one
   document (api/src/modules/reports/document.ts); the web draws it with
   src/modules/reports/components/ReportView.tsx and wraps it in
   ReportShell.tsx. This is the phone's copy of the contract
   (src/modules/reports/data/document.ts, the fields the phone reads) and
   of ReportView's rules for writing a cell, trimmed to a phone:

   - a cell is written as the web writes it (formatCell): money with its
     paise, a percent to two places, a count in Indian digits, a date
     25/08/2026, a moment in the property's time; null is "-", never 0;
   - a section with more columns than a phone can hold becomes cards of
     labelled figures, in the web's order of columns (BRIEF-T3);
   - nothing is added up here: every total is the server's own row.

   Pure: no React Native, so opsDoc.check.ts runs under node.
   ══════════════════════════════════════════════════════════════════ */

import type { ExportTable } from "../../core/exportDoc.ts";
import { instant } from "../../core/format.ts";

/* ── The contract: src/modules/reports/data/document.ts ───────────── */

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
/** The question a report is asked (document.ts ReportQuery), the parts these screens ask. */
export interface ReportQuery { asOn?: string; month?: string; year?: number; from?: string }

/** The query string, in the web's order (getReport / fileQuery). */
export function queryString(q: ReportQuery): string {
  const parts: string[] = [];
  if (q.asOn) parts.push(`asOn=${q.asOn}`);
  if (q.month) parts.push(`month=${q.month}`);
  if (q.year) parts.push(`year=${q.year}`);
  if (q.from) parts.push(`from=${q.from}`);
  return parts.length ? `?${parts.join("&")}` : "";
}

/* ── Writing a cell: ReportView.tsx formatCell, src/lib/format.ts ─── */

/** A figure nobody holds (D17-49): a short hyphen, never a zero. */
export const NO_FIGURE = "-";

const inrPrecise = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const num = new Intl.NumberFormat("en-IN");

/** format.ts dateReport: "2026-08-25" → "25/08/2026". */
export function dateReport(value: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : NO_FIGURE;
}

const two = (n: number) => String(n).padStart(2, "0");
/** Hours as the web's en-US 12-hour clock writes them: "04", "12". */
const twelve = (h: number) => two(h % 12 === 0 ? 12 : h % 12);

/** format.ts dateTimeReport: an ISO moment → "25/08/2026 04:12:43 PM" in the
    property's time. Through the core's `instant` first: Postgres's own text
    reads NaN on a phone's engine (MEMORY 7). India keeps one offset all year,
    so its clock is worked out without Intl's time zones; any other zone asks
    Intl, and a phone that cannot answer gets the moment as the server wrote it. */
export function dateTimeReport(value: string, timeZone = "Asia/Kolkata"): string {
  const ms = Date.parse(instant(value));
  if (Number.isNaN(ms)) return NO_FIGURE;
  if (timeZone === "Asia/Kolkata" || timeZone === "Asia/Calcutta") {
    const d = new Date(ms + 330 * 60_000);
    const h = d.getUTCHours();
    return `${two(d.getUTCDate())}/${two(d.getUTCMonth() + 1)}/${d.getUTCFullYear()} ${twelve(h)}:${two(d.getUTCMinutes())}:${two(d.getUTCSeconds())} ${h < 12 ? "AM" : "PM"}`;
  }
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone, day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true,
    }).formatToParts(new Date(ms));
    const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
    return `${get("day")}/${get("month")}/${get("year")} ${get("hour")}:${get("minute")}:${get("second")} ${get("dayPeriod").toUpperCase()}`;
  } catch {
    return value;
  }
}

/** ReportView.tsx formatCell: one cell, as the web and the printed report write it. */
export function formatCell(value: Cell | undefined, kind: CellKind, timeZone = "Asia/Kolkata"): string {
  if (value === null || value === undefined || value === "") return NO_FIGURE;
  if (typeof value === "string") {
    /* A label in a date column ("Total") is words, not a broken date. */
    if (kind === "date" && /^\d{4}-\d{2}-\d{2}$/.test(value)) return dateReport(value);
    if (kind === "datetime" && !Number.isNaN(Date.parse(instant(value)))) return dateTimeReport(value, timeZone);
    return value;
  }
  switch (kind) {
    case "money": case "rupees": return inrPrecise.format(value);
    case "percent": return `${value.toFixed(2)}%`;
    case "count": return num.format(value);
    /* The web's own rounding of a ratio for the eye (quantities, guests per room); never money. */
    case "ratio": return num.format(Math.round(value * 100) / 100);
    default: return String(value);
  }
}

/** ReportView.tsx numeric: a column of figures, set to the right. */
export const numeric = (kind: CellKind) => kind !== "text" && kind !== "date" && kind !== "datetime";

/** ReportView.tsx factsLine: the report's own header line. */
export const factsLine = (facts: ReportFact[], timeZone?: string) =>
  facts.map((f) => `${f.label} ${formatCell(f.value, f.kind, timeZone)}`).join("   ");

/* ── A section on a phone ───────────────────────────────────────── */

/** A label and a figure fit one line of a phone; more columns become a card per row. */
export const layoutOf = (columns: ReportColumn[]): "lines" | "cards" => (columns.length <= 2 ? "lines" : "cards");

/** A column's name as the export writes a grouped one: "CGST @2.5% Net Amt.". */
export const columnName = (c: ReportColumn) => (c.group ? `${c.group} ${c.label}` : c.label);

export interface Written {
  label: string;
  text: string;
  /** Not held: drawn grey, as the web's. */
  missing: boolean;
  /** A negative sum of money: drawn red, as the web's. */
  negative: boolean;
  numeric: boolean;
}

/** One cell of a row, as ReportView's Line writes it; null when the web leaves it blank
    (a total row's empty words: a dash means "not held", and a total has no guest). */
export function writeCell(row: ReportRow, c: ReportColumn, timeZone?: string): Written | null {
  const isNumber = numeric(c.kind);
  const kind = isNumber && row.unit ? row.unit : c.kind;
  const value = row.cells[c.key] ?? null;
  if (value === null && !isNumber && row.kind === "total") return null;
  return {
    label: columnName(c),
    text: formatCell(value, kind, timeZone),
    missing: value === null,
    negative: typeof value === "number" && value < 0 && kind === "money",
    numeric: isNumber,
  };
}

/** A row as a card: its first column is its name, the rest its labelled figures,
    in the web's order. A band is a sub-heading: its first cell only. */
export function cardOf(row: ReportRow, columns: ReportColumn[], timeZone?: string) {
  const [first, ...rest] = columns;
  if (!first) return { title: "", figures: [] as Written[] };
  const head = writeCell(row, first, timeZone);
  if (row.kind === "band") return { title: formatCell(row.cells[first.key] ?? null, "text"), figures: [] as Written[] };
  return {
    title: head?.text ?? "",
    figures: rest.map((c) => writeCell(row, c, timeZone)).filter((w): w is Written => w !== null),
  };
}

/* ── The chart: ReportView.tsx Chart (recharts) ───────────────────── */

/** The value axis: a percent runs 0 to 120 in steps of 20, as the web's; anything
    else from 0 to a round number over the tallest bar (recharts' "auto"). */
export function chartAxis(unit: CellKind, values: Array<number | null>): number[] {
  if (unit === "percent") return [0, 20, 40, 60, 80, 100, 120];
  const top = Math.max(0, ...values.filter((v): v is number => typeof v === "number"));
  if (top === 0) return [0, 1, 2, 3, 4];
  const raw = top / 4;
  const power = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * power).find((s) => s >= raw)!;
  return [0, 1, 2, 3, 4].map((i) => i * step);
}

/** The figure over a bar: the web's LabelList writes the number as sent, nothing for none. */
export const barLabel = (v: number | null | undefined) => (typeof v === "number" ? String(v) : "");

/* ── The shell: ReportShell.tsx ──────────────────────────────────── */

/** When this copy was made, as the web's `toLocaleString("en-IN")` writes it:
    "31/10/2026, 07:28:14 pm" in the phone's own time. */
export function printedAt(d: Date): string {
  const h = d.getHours();
  return `${two(d.getDate())}/${two(d.getMonth() + 1)}/${d.getFullYear()}, ${twelve(h)}:${two(d.getMinutes())}:${two(d.getSeconds())} ${h < 12 ? "am" : "pm"}`;
}

/** lib/testHotel.ts TEST_DOCUMENT: on a test hotel's report itself (D27-296 (8)). */
export const TEST_DOCUMENT = "TEST · NOT VALID";

/* ── The days a report is of: statistics.ts monthOf, the pages' words ── */

const MONTHS = ["January", "February", "March", "April", "May", "June", "July",
  "August", "September", "October", "November", "December"];

/** "11 Oct 2026": the web's dateShort. */
export const dayWords = (date: string) => `${Number(date.slice(8))} ${MONTHS[Number(date.slice(5, 7)) - 1]!.slice(0, 3)} ${date.slice(0, 4)}`;
/** "October 2026", from a date or a "YYYY-MM". */
export const monthWords = (date: string) => `${MONTHS[Number(date.slice(5, 7)) - 1]} ${date.slice(0, 4)}`;
/** statistics.ts monthOf(...).from: the first of the date's month. */
export const monthFrom = (date: string) => `${date.slice(0, 7)}-01`;

/** A day forward or back on a "YYYY-MM-DD", the same in every time zone. */
export const plusDays = (date: string, n: number) =>
  new Date(Date.parse(`${date}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
/** A month forward or back on a "YYYY-MM". */
export function plusMonths(month: string, n: number): string {
  const i = Number(month.slice(0, 4)) * 12 + Number(month.slice(5, 7)) - 1 + n;
  return `${Math.floor(i / 12)}-${two((i % 12) + 1)}`;
}

/** Voids.tsx WindowReport's heading: one day, or "1 Oct 2026 to 11 Oct 2026". */
export const rangeWords = (from: string, to: string) => (from === to ? dayWords(to) : `${dayWords(from)} to ${dayWords(to)}`);

/* ── The export: src/core/Export.tsx, from what the screen shows ──── */

const sameColumns = (a: ReportColumn[], b: ReportColumn[]) =>
  a.length === b.length && a.every((c, i) => c.key === b[i]!.key && c.label === b[i]!.label);

/** The report as one table for the phone's print and share sheets, every cell written as
    the screen writes it. Sections with one set of columns keep them (the section named
    first when there are several); sections that differ become "line and its figures"
    rows. The server's total rows stay where it put them: nothing is summed here. A chart
    with no sections (Monthly occupancy) is its days and their figures. */
export function exportOf(doc: ReportDoc, period: string): ExportTable {
  const tz = doc.property.timezone ?? "Asia/Kolkata";
  const subtitle = [doc.property.name, period, factsLine(doc.facts, tz)].filter(Boolean).join(" · ");
  const note = doc.footnotes.map((f) => `* ${f}`).join(" ") || undefined;
  const sections = doc.sections;
  const text = (row: ReportRow, c: ReportColumn) => writeCell(row, c, tz)?.text ?? "";
  if (sections.length === 0 && doc.chart?.series[0]) {
    const series = doc.chart.series[0];
    return {
      title: doc.title, subtitle, note,
      columns: ["Day", series.label],
      rows: doc.chart.x.map((x, i) => [x, formatCell(series.values[i] ?? null, doc.chart!.unit)]),
    };
  }
  const first = sections[0];
  if (first && sections.every((s) => sameColumns(s.columns, first.columns))) {
    const several = sections.length > 1;
    const cols = first.columns;
    return {
      title: doc.title, subtitle, note,
      columns: [...(several ? ["Section"] : []), ...cols.map(columnName)],
      rows: sections.flatMap((s) => s.rows.map((row) => [
        ...(several ? [s.title] : []),
        ...(row.kind === "band" ? [formatCell(row.cells[cols[0]!.key] ?? null, "text"), ...cols.slice(1).map(() => "")] : cols.map((c) => text(row, c))),
      ])),
    };
  }
  return {
    title: doc.title, subtitle, note,
    columns: ["Section", "Line", "Figures"],
    rows: sections.flatMap((s) => s.rows.map((row) => {
      const card = cardOf(row, s.columns, tz);
      return [s.title, card.title, card.figures.map((f) => `${f.label} ${f.text}`).join(" · ")];
    })),
  };
}
