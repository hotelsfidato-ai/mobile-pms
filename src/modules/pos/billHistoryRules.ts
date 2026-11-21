/* ══════════════════════════════════════════════════════════════════
   BILL HISTORY'S RULES (the owner's D27-370, D27-372, D27-394) — ported
   from the web's src/modules/pos/pages/BillHistory.tsx (16 Nov) and its
   shapes from src/modules/pos/data/till.ts 499-541; the API is
   api/src/modules/pos/till.ts 2132-2290 (GET /till/bills).

   Every figure is the server's row: `payable` (the bill's grand total,
   app.pos_order_total), `net` (an NC bill's value at menu prices),
   `serviceCharge` and `tip`. Nothing here adds two figures together.
   Pure: billHistory.check.ts runs it under node.
   ══════════════════════════════════════════════════════════════════ */

import { DASH } from "../../core/format.ts";

/** data/till.ts BillHistoryRow (OrderSummary + the history's fields), trimmed to what the phone shows. */
export interface BillHistoryRow {
  id: string;
  orderNo: string;
  outlet: string;
  table: string | null;
  status: "settled" | "void" | "no_charge" | string;
  businessDate: string;
  /** What the guest paid: the bill's GRAND TOTAL. */
  payable: number;
  /** Before tax; on an NC bill its value at menu prices (D27-394). */
  net: number;
  modes: string[];
  waiter: string | null;
  guest: string | null;
  phone: string | null;
  /** When it was paid, or given NC, HH:MM on the hotel's clock. */
  settledAt: string | null;
  /** A bill charged to a room: the stay's guest and room. */
  stayGuest: string | null;
  room: string | null;
  /** The voluntary service charge inside the total, 0 when none; a tip outside it (260). */
  serviceCharge?: number;
  tip?: number | null;
}

export interface BillHistory {
  bills: BillHistoryRow[];
  /** More matched than the server sent: `cap` is what it sent. */
  capped: boolean;
  cap: number;
  outlets: { code: string; name: string }[];
}

/** The filters, every one optional (BillHistoryAsk). */
export interface Ask { from: string; to: string; no: string; table: string; guest: string; mode: string; waiter: string; outlet: string }
export const EMPTY: Ask = { from: "", to: "", no: "", table: "", guest: "", mode: "", waiter: "", outlet: "" };

/** BillHistory.tsx MODE_WORD: how a bill was paid, in words. */
export const MODE_WORD: Record<string, string> = {
  cash: "Cash", card: "Card", upi: "UPI", room: "To a room", function: "To a function",
  allowance: "Owner's allowance", split: "Split",
};
/** The Paid by choices, in the web's order, "Any way" first. */
export const MODE_CHOICES = [{ value: "", label: "Any way" }, ...Object.entries(MODE_WORD).map(([value, label]) => ({ value, label }))];

/** BillHistory.tsx STATE: the pill's words and tone. */
export const STATE: Record<string, { words: string; tone: "success" | "danger" | "neutral" }> = {
  settled: { words: "Paid", tone: "success" },
  void: { words: "VOID", tone: "danger" },
  no_charge: { words: "NC", tone: "neutral" },
};
export const stateOf = (status: string) => STATE[status] ?? { words: status, tone: "neutral" as const };

/** Who the bill was for: the stay's guest on a bill charged to a room, else the name taken at the till. */
export const guestOf = (r: Pick<BillHistoryRow, "stayGuest" | "guest">) => r.stayGuest ?? r.guest;
export const modesWords = (r: Pick<BillHistoryRow, "modes">) =>
  r.modes.length ? r.modes.map((m) => MODE_WORD[m] ?? m).join(", ") : DASH;

/** Search's refusals, before anything is asked (BillHistory.tsx `search`). Null: ask. */
export function askProblem(a: Ask): string | null {
  if (!a.from && !a.to && !a.no.trim() && !a.table.trim() && !a.guest.trim()) {
    return "Pick the dates, or type a bill number, a table or a guest.";
  }
  if (a.from && a.to && a.from > a.to) return "The first date is after the last.";
  return null;
}

/** The question, as listBillHistory asks it: only what was typed, trimmed. */
export function askPath(code: string, a: Ask): string {
  const parts = (Object.entries(a) as Array<[keyof Ask, string]>)
    .filter(([, v]) => v.trim() !== "")
    .map(([k, v]) => `${k}=${encodeURIComponent(v.trim())}`);
  return `/api/hotels/${code}/till/bills?${parts.join("&")}`;
}

/** It opens on today's business day, as the Till does. */
export const opening = (businessDate: string): Ask => ({ ...EMPTY, from: businessDate, to: businessDate });

/** The line over the list (data-bill-count). */
export const countWords = (h: Pick<BillHistory, "bills" | "capped" | "cap">) =>
  h.capped
    ? `Showing the first ${h.cap} bills. More matched: narrow the dates or add a filter to see the rest.`
    : `${h.bills.length} bill${h.bills.length === 1 ? "" : "s"}.`;

/** The Total cell: an NC bill says NC with its value, never a sale (D27-394);
    a voided bill keeps its total, struck (D27-324). The figures as sent,
    to the paisa (`precise`, the web's moneyPrecise). */
export function totalCell(b: Pick<BillHistoryRow, "status" | "payable" | "net" | "serviceCharge" | "tip">, precise: (n: number) => string) {
  if (b.status === "no_charge") return { main: `NC ${precise(b.net)}`, struck: false, notes: [] as string[] };
  const notes: string[] = [];
  /* Inside the total: the voluntary service charge; outside it: a tip (260). */
  if (b.serviceCharge) notes.push(`incl. service ${precise(b.serviceCharge)}`);
  if (b.tip) notes.push(`+ tip ${precise(b.tip)}`);
  return { main: precise(b.payable), struck: b.status === "void", notes };
}

/** data/till.ts nextBillHeading: what a bill opened here is headed. */
export function headingOf(o: { status: string; billsPrinted?: number }): string {
  if (o.status === "void") return "VOID";
  if (o.status === "no_charge") return "NC";
  if (o.status !== "settled") return "Interim bill";
  return (o.billsPrinted ?? 0) > 0 ? "Bill · duplicate" : "Bill";
}

/* ── Dates without a picker (no package: the owner's M-7 day stepper) ── */

const DAY = /^\d{4}-\d{2}-\d{2}$/;
/** A real calendar day written 2026-10-27, as the server asks (till.ts isoDay). */
export const isDay = (v: string) => DAY.test(v) && new Date(`${v}T00:00:00Z`).toISOString().slice(0, 10) === v;
/** One day on or back; an empty or unreadable field starts from `from`. */
export function stepDay(v: string, by: number, from: string): string {
  const base = isDay(v) ? v : from;
  if (!isDay(base)) return v;
  const d = new Date(`${base}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + by);
  return d.toISOString().slice(0, 10);
}
