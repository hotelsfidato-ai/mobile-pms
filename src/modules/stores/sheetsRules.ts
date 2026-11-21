/* ══════════════════════════════════════════════════════════════════
   THE KITCHEN'S AND THE BAR'S DAILY SHEETS — ported by hand from the web's
   src/modules/stores/pages/KitchenStock.tsx and BarStock.tsx, and their
   data files data/kitchen.ts and data/barSheet.ts (the PMS at a4527ea).

   The same pattern as the Store's count: each line is the item, the book
   the server sent (`onHand`) and what was counted; a blank line is not
   counted and never sent as zero (MEMORY 9, MLDY-1). Every figure of the
   day - opening, received, used, closing - is the server's, drawn as sent.
   The bar's "Amount, all drinks" is a sum the web makes in the browser
   (BarStock.tsx totalAmount): the phone does not total rupees (MST-1).

   Pure: no React Native here, so sheets.check.ts runs under node.
   ══════════════════════════════════════════════════════════════════ */

import { DASH, typed } from "./shelf.ts";

/* ── The kitchen (data/kitchen.ts) ───────────────────────────────── */

export interface KitchenItem {
  id: string; name: string; unit: string;
  opening: number; received: number; movedIn: number; movedOut: number;
  used: number; wasted: number; corrected: number; closing: number;
  onHand: number;
  counted: number | null; countBook: number | null;
}

export interface KitchenSheet {
  businessDate: string; date: string;
  store: { id: string; name: string; isActive: boolean } | null;
  stores: { id: string; name: string }[];
  mayKeep: boolean; mayCount: boolean;
  items: KitchenItem[];
  wasted: { item: string; unit: string; quantity: number; note: string | null; reference: string | null }[];
}

/** KitchenStock.tsx figure: to the thousandth. */
export const figure = (n: number) => String(Math.round(n * 1000) / 1000);
/** A day's movement: blank when none, so what happened stands out. */
export const moved = (n: number) => (Math.abs(n) < 0.0005 ? "" : figure(n));
export const belowZero = (n: number) => n < -0.0005;

/** The kitchen's figures, in the web's column order. */
export const KITCHEN_COLUMNS: [string, keyof KitchenItem, "day" | "moved" | "closing"][] = [
  ["Opening", "opening", "day"], ["Received", "received", "moved"], ["Moved in", "movedIn", "moved"],
  ["Moved out", "movedOut", "moved"], ["Used by KOTs", "used", "moved"], ["Wastage", "wasted", "moved"],
  ["Corrected", "corrected", "moved"], ["Closing", "closing", "closing"],
];

/** The kitchen's count: only the lines typed, each against the book now. */
export function kitchenBody(items: KitchenItem[], draft: Record<string, string>):
  { lines: { itemId: string; book: number; counted: number }[] } | { missing: string } {
  const lines: { itemId: string; book: number; counted: number }[] = [];
  for (const i of items) {
    const n = typed(draft[i.id] ?? "");
    if (n === null) continue;
    if (!Number.isFinite(n)) return { missing: `${i.name}: a count is zero or more.` };
    lines.push({ itemId: i.id, book: i.onHand, counted: n });
  }
  return lines.length ? { lines } : { missing: "Type a count on at least one line - a blank line is not counted." };
}

/** The typed count against the book now, or the day's count against its
    book; a dash when neither (KitchenStock.tsx Difference). */
export function kitchenDifference(i: KitchenItem, draft: string | undefined): { text: string; off: boolean } {
  const now = draft !== undefined ? typed(draft) : null;
  const diff = now !== null && Number.isFinite(now) ? now - i.onHand
    : i.counted !== null && i.countBook !== null ? i.counted - i.countBook : null;
  if (diff === null) return { text: DASH, off: false };
  if (Math.abs(diff) < 0.0005) return { text: "matches", off: false };
  return { text: `${diff > 0 ? "+" : ""}${figure(diff)}`, off: true };
}

export const countSaidWords = (res: { recorded: number; matched: number }) =>
  res.recorded
    ? `${res.recorded} difference${res.recorded === 1 ? "" : "s"} corrected; ${res.matched} matched.`
    : "Everything counted matched the book.";

/* ── The bar (data/barSheet.ts) ──────────────────────────────────── */

export type Place = "counter" | "store";
export type Moment = "closing" | "morning";
export type CountAs = "poured" | "whole" | "packet";

export interface SheetDrink {
  id: string; name: string; unit: string; sizeMl: number | null;
  countAs: CountAs; packSize: number | null; poured: boolean;
  opening: number; received: number; moved: number; sold: number; other: number; corrected: number; closing: number;
  sell: { nip: number; p30: number; p60: number; p90: number; ml: number };
  counted: number | null; countBook: number | null;
  morning: number | null; morningBook: number | null;
  rate: number | null; amount: number | null;
  onHand: number;
}

export interface BarSheet {
  place: Place;
  places: { counter: { id: string; name: string } | null; store: { id: string; name: string } | null };
  store: { id: string; name: string; isActive: boolean } | null;
  businessDate: string; date: string; format: "paper" | "simple";
  mayCount: boolean; maySetFormat: boolean; mayApprove: boolean; mayCloseBar: boolean;
  closedToday: { reason: string; by: string | null } | null;
  pendingRequests: number;
  groups: { section: string; drinks: SheetDrink[] }[];
}

/** The open one's part at this place: a poured bottle's ml, an open
    packet's sticks; null where it is counted whole (the store, beer). */
export function subOf(d: SheetDrink, place: Place): { size: number; label: string } | null {
  if (place === "store") return null;
  if (d.countAs === "poured" && d.sizeMl) return { size: d.sizeMl, label: "ml" };
  if (d.countAs === "packet" && d.packSize && d.packSize > 1) return { size: d.packSize, label: "sticks" };
  return null;
}
export const wholeWord = (d: SheetDrink) => (d.countAs === "packet" ? "packets" : d.countAs === "poured" ? "NIPs" : "bottles");

/** "5 + 120 ml", "3 + 4 sticks", "120 ml" - or the count, counted whole. */
export function held(q: number, d: SheetDrink, place: Place): string {
  const sub = subOf(d, place);
  if (!sub) return String(Math.round(q * 1000) / 1000);
  const sign = q < 0 ? "-" : "";
  const a = Math.abs(q);
  const whole = Math.floor(a + 1e-9);
  const rest = Math.round((a - whole) * sub.size);
  if (!rest) return `${sign}${whole}`;
  return whole === 0 ? `${sign}${rest} ${sub.label}` : `${sign}${whole} + ${rest} ${sub.label}`;
}

export const differenceText = (diff: number, d: SheetDrink, place: Place) =>
  Math.abs(diff) < 0.0005 ? "matches" : `${diff > 0 ? "+" : "-"}${held(Math.abs(diff), d, place)}`;

/** Other moves (the owner's D27-364): breakages, wastage, corrections and
    whatever else the columns before do not show, so that opening +
    received - the third column + other moves = closing (SimpleSheet). */
export const otherMoves = (d: SheetDrink, place: Place) => d.other + d.corrected - (place === "store" ? d.sold : d.moved);

/** The typed count as one figure; null when the line is blank; a reason when it cannot be. */
export function barCountOf(d: SheetDrink, x: { nip: string; ml: string } | undefined, place: Place): number | null | string {
  if (!x || (x.nip.trim() === "" && x.ml.trim() === "")) return null;
  const nip = x.nip.trim() === "" ? 0 : typed(x.nip)!;
  const ml = x.ml.trim() === "" ? 0 : typed(x.ml)!;
  if (!Number.isFinite(nip)) return `${d.name}: a count is zero or more.`;
  const sub = subOf(d, place);
  if (!Number.isInteger(nip)) return `${d.name}: whole ${wholeWord(d)}.`;
  if (!sub) return nip;
  if (!Number.isFinite(ml) || !Number.isInteger(ml) || ml >= sub.size) {
    return `${d.name}: whole ${wholeWord(d)}, and the open one's ${sub.label} under ${sub.size}.`;
  }
  return Math.round((nip + ml / sub.size) * 1000) / 1000;
}

export function barBody(drinks: SheetDrink[], draft: Record<string, { nip: string; ml: string }>, place: Place):
  { lines: { itemId: string; book: number; counted: number }[] } | { missing: string } {
  const lines: { itemId: string; book: number; counted: number }[] = [];
  for (const d of drinks) {
    const n = barCountOf(d, draft[d.id], place);
    if (n === null) continue;
    if (typeof n === "string") return { missing: n };
    lines.push({ itemId: d.id, book: d.onHand, counted: n });
  }
  return lines.length ? { lines } : { missing: "Type a count on at least one line - a blank line is not counted." };
}

/** The difference the typed count makes today, or the day's closing count made. */
export function barDifference(d: SheetDrink, x: { nip: string; ml: string } | undefined, s: Pick<BarSheet, "mayCount" | "place">): { text: string; off: boolean } {
  if (s.mayCount) {
    const n = barCountOf(d, x, s.place);
    if (typeof n === "number") { const diff = n - d.onHand; return { text: differenceText(diff, d, s.place), off: Math.abs(diff) >= 0.0005 }; }
  }
  if (d.counted !== null && d.countBook !== null) {
    const diff = d.counted - d.countBook;
    return { text: differenceText(diff, d, s.place), off: Math.abs(diff) >= 0.0005 };
  }
  return { text: DASH, off: false };
}

/** The morning count against the book: anything but "matches" moved overnight. */
export function morningText(d: SheetDrink, place: Place): { text: string; off: boolean } {
  if (d.morning === null || d.morningBook === null) return { text: DASH, off: false };
  const diff = d.morning - d.morningBook;
  return { text: differenceText(diff, d, place), off: Math.abs(diff) >= 0.0005 };
}

/** The line under the sheet's controls (BarStock.tsx Sheet). */
export function barLead(s: BarSheet, moment: Moment): string {
  const placeName = barPlaceName(s);
  if (s.date !== s.businessDate) return `${placeName}, an earlier day: the count is typed on today's sheet.`;
  if (!s.mayCount) return `${placeName}, today.`;
  return moment === "morning"
    ? `${placeName}: the morning count, before the first KOT. A difference from last night's count shows in red.`
    : `${placeName}: the closing count, before the night audit. Type each drink you count; a blank line is not counted.`;
}
export const barPlaceName = (s: Pick<BarSheet, "place" | "places">) =>
  s.place === "store" ? s.places.store?.name ?? "Bar store" : s.places.counter?.name ?? "Bar counter";

/* ── The counter's asks (data/barSheet.ts BarRequest) ────────────── */

export interface BarRequest {
  id: string; status: "pending" | "approved" | "rejected"; note: string | null; decisionNote: string | null;
  requestedBy: string | null; mine: boolean; requestedAt: string; decidedBy: string | null; decidedAt: string | null;
  lines: { itemId: string; name: string; quantity: number; countAs: CountAs | null; inStore: number | null }[];
}

export const requestUnit = (countAs: CountAs | null) => (countAs === "packet" ? "packets" : countAs === "poured" ? "NIPs/bottles" : "bottles");
export const REQUEST_STATE: Record<BarRequest["status"], { words: string; tone: "warning" | "success" | "danger" }> = {
  pending: { words: "Waiting", tone: "warning" },
  approved: { words: "Approved, moved", tone: "success" },
  rejected: { words: "Rejected", tone: "danger" },
};

/** What is asked of the store: whole NIPs, bottles or packets, more than none. */
export function askBody(lines: { itemId: string; qty: string }[], note: string):
  { body: { lines: { itemId: string; quantity: number }[]; note: string } } | { missing: string } {
  const chosen = lines.filter((l) => l.itemId || l.qty.trim());
  if (!chosen.length) return { missing: "Pick a drink and how many." };
  const out: { itemId: string; quantity: number }[] = [];
  for (const l of chosen) {
    const n = typed(l.qty);
    if (!l.itemId || n === null || !Number.isInteger(n) || n <= 0) return { missing: "Each line: a drink, and how many whole NIPs, bottles or packets." };
    out.push({ itemId: l.itemId, quantity: n });
  }
  return { body: { lines: out, note } };
}

/* ── The day picked (the web's date input, stepped on a phone, M-7) ── */

/** The day before or after, as the server's YYYY-MM-DD. */
export function dayStep(date: string, n: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
