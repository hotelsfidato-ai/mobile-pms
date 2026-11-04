/* ══════════════════════════════════════════════════════════════════
   THE LAUNDRY'S RULES ON A PHONE — ported by hand from the web's
   src/modules/laundry/data/laundry.ts (the shapes, SERVICE_WORDS),
   pages/Dockets.tsx (STATUS_WORDS, STATUS_TONE, RANK, whoseWords, the
   still-out line, CollectDialog's checks, itemWords) and pages/Docket.tsx
   (mayReturn, mayCancel, mayCharge, ReturnDialog's checks). The server is
   api/src/modules/laundry/laundry.ts; every shape is its answer.

   NULL IS A REAL ANSWER. A price nobody has set is null: a dash, never 0,
   and a bag carrying one has NO total (the server's
   app.laundry_docket_total). 0 is a price and means free. Nothing here
   turns the one into the other, and nothing here totals a bag: the total
   is the server's. A line's amount, which the web multiplies on the
   device, is shown as its parts (count × each) - MODULE.md says why.

   Pure: no React Native, so docket.check.ts runs under node.
   ══════════════════════════════════════════════════════════════════ */

import { DASH } from "../../core/format.ts";

/** The server's SERVICES (laundry.ts); it refuses anything else. */
export type LaundryService = "wash" | "press" | "dry_clean";
export const SERVICE_WORDS: Record<LaundryService, string> = { wash: "Wash", press: "Press", dry_clean: "Dry-clean" };

/** GET /laundry/price-list items[]. */
export interface PriceItem { id: string; name: string; service: LaundryService; price: number | null; isActive: boolean }

export type DocketStatus = "open" | "returned" | "cancelled";

/** GET /laundry/dockets dockets[] (laundry.ts asDocket). */
export interface Docket {
  id: string;
  number: string;
  /** D18-5: the first fact about a docket. */
  belongsTo: "guest" | "hotel";
  stayId: string | null;
  stayReference: string | null;
  guestName: string | null;
  roomNumber: string | null;
  status: DocketStatus;
  /** "YYYY-MM-DD". */
  businessDate: string;
  /** On the property's own clock, "YYYY-MM-DDTHH:MI" (app.hotel_clock), no zone. */
  collectedAt: string | null;
  returnedAt: string | null;
  notes: string | null;
  /** Null when the bag is empty or ANY line is unpriced: a dash, never a part-total. */
  total: number | null;
  pieces: number;
  stillOut: number;
  unpricedLines: number;
  charged: boolean;
}

export interface DocketLine {
  id: string;
  description: string;
  service: LaundryService;
  quantity: number;
  returnedQuantity: number;
  stillOut: number;
  /** Copied from the price list at collection; null stays null. */
  unitPrice: number | null;
}

export interface DocketList { businessDate: string; nextNumber: string; dockets: Docket[] }
export type DocketDetail = Docket & { lines: DocketLine[] };

/* ── Words ───────────────────────────────────────────────────────── */

export const STATUS_WORDS: Record<DocketStatus, string> = { open: "Out", returned: "Back", cancelled: "Cancelled" };
export const STATUS_TONE: Record<DocketStatus, "info" | "success" | "danger"> = {
  open: "info", returned: "success", cancelled: "danger",
};

/** Open first: the only one anybody can still act on. Stable, so the
    server's newest-first order holds inside each state. */
const RANK: Record<DocketStatus, number> = { open: 0, returned: 1, cancelled: 2 };
export const byState = (dockets: readonly Docket[]) => [...dockets].sort((a, b) => RANK[a.status] - RANK[b.status]);

/** The line under the filter (Dockets.tsx). */
export function stillOutWords(dockets: readonly Docket[]): string {
  const n = dockets.filter((d) => d.status === "open").length;
  return n === 0 ? "Nothing is still out." : n === 1 ? "One bag is still out." : `${n} bags are still out.`;
}

/** D18-5 in one line of words (Dockets.tsx whoseWords). */
export function whoseWords(d: Pick<Docket, "belongsTo" | "guestName" | "roomNumber">): string {
  if (d.belongsTo === "hotel") return "The hotel's own linen";
  const room = d.roomNumber ? `Room ${d.roomNumber}` : "No room yet";
  return d.guestName ? `${d.guestName} · ${room}` : room;
}

/* ── Figures ─────────────────────────────────────────────────────── */

const whole = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const paise = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2, maximumFractionDigits: 2 });
/** The server's figure as it sent it: "₹430" as the web's money() writes a
    whole one, "₹80.50" where it carries paise - never rounded to a whole
    rupee (MEMORY 9, MFIN-4). Not sent: a dash. */
export const rupees = (n: number | null | undefined) =>
  n == null || !Number.isFinite(n) ? DASH : Number.isInteger(n) ? whole.format(n) : paise.format(n);

/** A line's parts, which the web multiplies on the device: "4 × ₹60". */
export const lineParts = (l: Pick<DocketLine, "quantity" | "unitPrice">) =>
  l.unitPrice === null ? DASH : `${l.quantity} × ${rupees(l.unitPrice)}`;

/** In the list somebody picks from, an unpriced item says so (Dockets.tsx itemWords). */
export const itemWords = (i: Pick<PriceItem, "name" | "service" | "price">) =>
  `${i.name} · ${SERVICE_WORDS[i.service]} · ${i.price === null ? "not priced" : rupees(i.price)}`;

/* ── Dates: the property's own clock, read as text (no Date, so no zone
   and no Hermes NaN, MEMORY 7). The web's dateShort "d MMM yyyy" and
   dateTime "d MMM yyyy, h:mm a". ── */

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAY = /^(\d{4})-(\d{2})-(\d{2})/;
const TIME = /^\d{4}-\d{2}-\d{2}[T ](\d{2}):(\d{2})/;

export function dayOf(text: string | null | undefined): string {
  const m = text ? DAY.exec(text) : null;
  return m ? `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]} ${m[1]}` : DASH;
}
export function clockOf(text: string | null | undefined): string {
  const m = text ? TIME.exec(text) : null;
  if (!m) return dayOf(text);
  const h = Number(m[1]);
  return `${dayOf(text)}, ${h % 12 === 0 ? 12 : h % 12}:${m[2]} ${h < 12 ? "AM" : "PM"}`;
}
/** The list's Collected: the day it was collected, else its business date. */
export const collectedDay = (d: Pick<Docket, "collectedAt" | "businessDate">) => dayOf(d.collectedAt ?? d.businessDate);

/* ── What the docket allows (Docket.tsx): the same facts the route reads ── */

export const mayReturn = (d: Pick<Docket, "status" | "stillOut">) => d.status !== "cancelled" && d.stillOut > 0;
export const mayCancel = (d: Pick<Docket, "status" | "charged">) => d.status !== "cancelled" && !d.charged;
/** D18-7: only a guest's bag, once, not cancelled, and with a total. */
export const mayCharge = (d: Pick<Docket, "belongsTo" | "status" | "charged" | "total">) =>
  d.belongsTo === "guest" && d.status !== "cancelled" && !d.charged && d.total !== null;

/** Why a guest's bag has no total (Docket.tsx), or null. */
export function unpricedWords(d: Pick<Docket, "belongsTo" | "unpricedLines" | "status">): string | null {
  if (d.belongsTo !== "guest" || d.unpricedLines <= 0 || d.status === "cancelled") return null;
  return `${d.unpricedLines === 1 ? "One thing in this bag has no price yet. " : `${d.unpricedLines} things in this bag have no price yet. `}`
    + "It reads \"-\", never 0, so the bag has no total at all rather than a part of one - and it cannot go "
    + "on the room's bill. A price added to the price list later applies to new bags only: cancel this one "
    + "and take it again.";
}

/* ── Collecting a bag (CollectDialog) ────────────────────────────── */

export interface Draft { priceItemId: string; quantity: string }
export interface NewDocket {
  belongsTo: "guest" | "hotel";
  stayId?: string;
  notes?: string;
  lines: { priceItemId: string; quantity: number }[];
}

/** The web's checks, in its order: the sentence, or the body to send. */
export function collectBody(
  belongsTo: "" | "guest" | "hotel", stayId: string, notes: string, lines: readonly Draft[],
): { problem: string } | { body: NewDocket } {
  if (belongsTo === "") return { problem: "Say whose this is: a guest's, or the hotel's own linen." };
  if (belongsTo === "guest" && !stayId) return { problem: "A guest's docket names the stay it belongs to." };
  const filled = lines.filter((l) => l.priceItemId !== "" && l.quantity.trim() !== "");
  if (filled.length === 0) return { problem: "What is in the bag?" };
  if (new Set(filled.map((l) => l.priceItemId)).size !== filled.length) {
    return { problem: "The same thing is on this docket twice. Put it on one line." };
  }
  if (filled.some((l) => !Number.isInteger(Number(l.quantity)) || Number(l.quantity) < 1)) {
    return { problem: "A count is a whole number, one or more." };
  }
  return {
    body: {
      belongsTo,
      ...(belongsTo === "guest" ? { stayId } : {}),
      ...(notes.trim() ? { notes: notes.trim() } : {}),
      lines: filled.map((l) => ({ priceItemId: l.priceItemId, quantity: Number(l.quantity) })),
    },
  };
}

/** The stays a guest's docket may name (data/laundry.ts getStaysToChargeTo):
    guests in the house only (LAU-4, BQ-2), by room number. */
export function stayChoices<S extends { status: string; roomNumber: string }>(stays: readonly S[]): S[] {
  return stays
    .filter((s) => s.status === "in-house" || s.status === "due-out")
    .sort((a, b) => a.roomNumber.localeCompare(b.roomNumber, undefined, { numeric: true }));
}
/** "Room 205 · Priya Menon · FD-1042" (the web's option). */
export const stayWords = (s: { roomNumber: string; guest: string; reference: string }) =>
  `${s.roomNumber ? `Room ${s.roomNumber} · ` : ""}${s.guest} · ${s.reference}`;

/* ── What came back (ReturnDialog): counts in total, not this time ── */

export function returnBody(
  lines: readonly Pick<DocketLine, "id" | "quantity" | "returnedQuantity" | "description">[], counts: Readonly<Record<string, string>>,
): { problem: string } | { body: { lineId: string; quantity: number }[] } {
  const returned = lines
    .map((l) => ({ lineId: l.id, quantity: Number(counts[l.id] ?? l.returnedQuantity) }))
    .filter((r) => Number.isInteger(r.quantity));
  if (returned.length !== lines.length) return { problem: "A count is a whole number." };
  const over = lines.find((l) => Number(counts[l.id] ?? 0) > l.quantity);
  if (over) return { problem: `Only ${over.quantity} ${over.description.toLowerCase()} went out.` };
  return { body: returned };
}
export const backWords = (stillOut: number) => (stillOut === 0 ? "Everything is back." : `${stillOut} still out.`);
