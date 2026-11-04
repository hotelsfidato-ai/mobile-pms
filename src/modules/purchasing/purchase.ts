/* ══════════════════════════════════════════════════════════════════
   PURCHASING'S RULES ON A PHONE — ported by hand from the web's
   src/modules/purchasing/data/purchasing.ts (the shapes, suggestedDue),
   pages/Purchasing.tsx (STATE_WORDS, STATE_TONE, AskDialog's checks, its
   notes) and pages/PurchaseRequest.tsx (the facts, each act's condition,
   the unpriced tile, LineRow's and DeliveryDialog's and CancelDialog's
   checks, the toasts). The server is api/src/modules/purchasing/
   purchasing.ts; every shape is its answer and every sentence here that
   is also the server's is the server's own (its 409 `reason`).

   MONEY ARRIVES AS A STRING (numeric(12,2) as text) and is shown as the
   server wrote it: regrouped, never rounded (approvals' amountText, MEMORY
   9). NULL IS A REAL ANSWER: a price nobody agreed is a dash, and an order
   carrying one has NO total (the server's ordered_total). Nothing here
   totals an order or works out a tax. A line's amount and a GST amount,
   which the web multiplies on the device, are shown as their parts.

   A FIGURE TYPED IS SENT AS TYPED: read by a strict decimal pattern, never
   Number("") (0) and never Number("0x10") (16). A blank is never a zero.

   Pure: no React Native, so purchase.check.ts runs under node.
   ══════════════════════════════════════════════════════════════════ */

import { DASH } from "../../core/format.ts";
import { amountText } from "../approvals/rules.ts";
import { clockOf, dayOf } from "../laundry/docket.ts";

/* ── The server's shapes (purchasing.ts asRequest, the line select) ── */

/** Where a request has got to: the server's stateOf, derived once. */
export type PurchaseState = "waiting" | "refused" | "sent_back" | "ready" | "ordered" | "received" | "cancelled";

export interface PurchaseRequest {
  id: string;
  reference: string;
  state: PurchaseState;
  reason: string;
  store: { id: string; name: string };
  supplier: { id: string; name: string | null } | null;
  approvalId: string | null;
  /** The order's total as text, or null while a line has no agreed price. */
  total: string | null;
  lines: number;
  unpriced: number;
  requestedBy: string | null;
  /** Postgres's text ("2026-10-28 10:12:33.12+05:30"): read as text, never through Date. */
  requestedAt: string;
  decidedBy: string | null;
  decisionNote: string | null;
  orderedBy: string | null;
  orderedAt: string | null;
  receivedBy: string | null;
  receivedAt: string | null;
  deliveryNote: string | null;
  cancelledReason: string | null;
}

export interface PurchaseLine {
  id: string;
  lineNo: number;
  itemId: string;
  item: string;
  unit: string;
  /** numeric as text ("40.000"). */
  quantity: string;
  /** Null until somebody agrees one. */
  unitPrice: string | null;
  receivedQuantity: string | null;
  receivedUnitCost: string | null;
  note: string | null;
}

export interface PurchaseStore { id: string; name: string; isMain: boolean }
export interface PurchaseItem { id: string; name: string; unit: string; onHand: number }

export interface PurchasingList {
  me: { mayRaise: boolean; maySetRequesters: boolean };
  stores: PurchaseStore[];
  suppliers: { id: string; name: string }[];
  items: PurchaseItem[];
  requests: PurchaseRequest[];
}

/** On credit (D27-370): the supplier's bill standing against this order. */
export interface Credit { billNo: string; billDate: string; amount: string; dueOn: string; owed?: string; paidOn?: string | null }

export interface RequestDetail { request: PurchaseRequest; lines: PurchaseLine[]; credit: Credit | null }

/** The approval waiting on one request, from the ONE queue (api/src/routes/approvals.ts). */
export interface PurchaseApproval {
  id: string;
  kind: string;
  subject: { table: string; id: string };
  status: string;
  amount: string | null;
  mayDecide: boolean;
  blockedBecause?: string;
}

/** The web's getPurchaseApproval: the row of kind `purchase` pointing at this request, or null. */
export const approvalFor = (rows: readonly PurchaseApproval[], requestId: string): PurchaseApproval | null =>
  rows.find((r) => r.kind === "purchase" && r.subject.table === "purchase_requests" && r.subject.id === requestId) ?? null;

/* ── Words ─────────────────────────────────────────────────────────── */

/** Purchasing.tsx STATE_WORDS (the server keeps the same, purchasing.ts). */
export const STATE_WORDS: Record<PurchaseState, string> = {
  waiting: "Waiting for approval",
  refused: "Refused",
  sent_back: "Sent back",
  ready: "Ready to order",
  ordered: "Ordered",
  received: "Delivered",
  cancelled: "Cancelled",
};

export type Tone = "warning" | "danger" | "info" | "success";
/** Purchasing.tsx STATE_TONE. */
export const STATE_TONE: Record<PurchaseState, Tone> = {
  waiting: "warning",
  refused: "danger",
  sent_back: "warning",
  ready: "info",
  ordered: "info",
  received: "success",
  cancelled: "danger",
};

/* ── Figures: the server's text, shown as it sent it ──────────────── */

/** A price or a total: "₹2,050", "₹51.25"; not agreed (null) or not sent is a dash. */
export const rupees = (v: string | null | undefined): string => amountText(v) ?? DASH;

/** A quantity as the web's figure(): "40.000" is "40", "2.500" is "2.5"; null is a dash.
    By its digits, never through a float. */
export function figure(v: string | null | undefined): string {
  if (v == null) return DASH;
  const m = /^(-?)(\d+)(?:\.(\d+))?$/.exec(v.trim());
  if (!m) return DASH;
  const whole = m[2]!.replace(/^0+(?=\d)/, "");
  const frac = (m[3] ?? "").replace(/0+$/, "");
  return `${m[1]}${whole}${frac ? `.${frac}` : ""}`;
}

/** A line's amount, which the web multiplies on the device: shown as its parts, "40 × ₹51.25". */
export const lineParts = (l: Pick<PurchaseLine, "quantity" | "unitPrice">): string =>
  l.unitPrice === null ? DASH : `${figure(l.quantity)} × ${rupees(l.unitPrice)}`;

/* Dates on the server's own clock, read as text (laundry's dayOf / clockOf:
   no Date, so no Hermes NaN, MEMORY 7): the web's dateShort and dateTime. */
export const askedDay = (r: Pick<PurchaseRequest, "requestedAt">) => dayOf(r.requestedAt);
export const when = (text: string | null | undefined) => (text ? clockOf(text) : DASH);
export { dayOf };

/** PurchaseRequest.tsx's facts card, in its order (two across on a phone). */
export function factsOf(r: PurchaseRequest): Array<{ label: string; value: string }> {
  return [
    { label: "What it is for", value: r.reason },
    { label: "Deliver to", value: r.store.name },
    { label: "Supplier", value: r.supplier?.name ?? DASH },
    { label: "Total", value: rupees(r.total) },
    { label: "Asked by", value: r.requestedBy ?? DASH },
    { label: "Asked", value: when(r.requestedAt) },
    { label: "Decided by", value: r.decidedBy ?? DASH },
    { label: "Ordered", value: when(r.orderedAt) },
  ];
}

/* ── What the order allows (PurchaseRequest.tsx): the server's state ── */

/** LineRow's mayPrice: until the order has gone out (the server: status still `requested`). */
export const mayPrice = (s: PurchaseState) => s !== "ordered" && s !== "received" && s !== "cancelled";
/** Send the order: approved (or no rule called for it) AND every line priced. */
export const maySend = (r: Pick<PurchaseRequest, "state" | "unpriced">) => r.state === "ready" && r.unpriced === 0;
/** Record the delivery: against an order that has been sent. */
export const mayDeliver = (s: PurchaseState) => s === "ordered";
/** Cancel: any time before it was delivered. */
export const mayCancel = (s: PurchaseState) => s !== "received" && s !== "cancelled";
/** The order on paper: before it goes (to read it over) and after. */
export const mayDownload = (s: PurchaseState) => s === "ready" || s === "ordered" || s === "received";

/** The tile under the lines while a price is missing; warm while it is work (D27-82). */
export function unpricedTile(r: Pick<PurchaseRequest, "state" | "unpriced">): { text: string; warm: boolean } | null {
  if (r.unpriced <= 0 || r.state === "cancelled" || r.state === "received") return null;
  return {
    text: `${r.unpriced === 1 ? "One line has no agreed price. " : `${r.unpriced} lines have no agreed price. `}`
      + "It reads \"-\", never 0, and this order cannot be sent to a supplier until every line has one - a blank "
      + "on an order is a price the supplier sets.",
    warm: r.state === "waiting" || r.state === "ready",
  };
}

/** The card for a decided request: refused or sent back, by whom, and its note. */
export function decidedCard(r: Pick<PurchaseRequest, "state" | "decidedBy" | "decisionNote">): { title: string; note: string } | null {
  if (r.state !== "refused" && r.state !== "sent_back") return null;
  return {
    title: `${r.state === "refused" ? "Refused" : "Sent back for something to be cleared up"}${r.decidedBy ? ` by ${r.decidedBy}` : ""}`,
    note: r.decisionNote ?? DASH,
  };
}

/** The delivered card's title: "Delivered - received by X on 28 Oct 2026, 2:05 PM". */
export const deliveredTitle = (r: Pick<PurchaseRequest, "receivedBy" | "receivedAt">) =>
  `Delivered${r.receivedBy ? ` - received by ${r.receivedBy}` : ""}${r.receivedAt ? ` on ${clockOf(r.receivedAt)}` : ""}`;

/** "On credit: bill KB-401 of 4 Oct 2026, ₹2,152.50, due 9 Oct 2026 - not paid yet." */
export const creditLine = (c: Credit) =>
  `On credit: bill ${c.billNo} of ${dayOf(c.billDate)}, ${rupees(c.amount)}, due ${dayOf(c.dueOn)}`
  + `${c.paidOn ? ` - paid on ${dayOf(c.paidOn)}.` : " - not paid yet."}`;

/* ── A figure typed ────────────────────────────────────────────────── */

const DECIMAL = /^\d+(?:\.\d+)?$/;
/** The figure exactly as typed, or null when it is not a plain decimal (a blank included). */
export const typed = (text: string | undefined): number | null => {
  const s = (text ?? "").trim();
  return DECIMAL.test(s) ? Number(s) : null;
};
const blank = (text: string | undefined) => (text ?? "").trim() === "";

/* ── Asking (Purchasing.tsx AskDialog, then the server's own checks) ── */

export interface AskDraft { itemId: string; quantity: string; unitPrice: string; free: boolean }
export const EMPTY_DRAFT: AskDraft = { itemId: "", quantity: "", unitPrice: "", free: false };

export interface AskLine { itemId: string; quantity: number; unitPrice: number | null; unitPriceFree?: true }
export interface AskBody { storeId: string; reason: string; lines: AskLine[] }

/** The server's sentences (purchasing.ts POST /requests; validate.ts priceProblem). */
export const PRICE_BAD = "A price is zero or more, or nothing at all.";
export const ZERO_NOT_FREE = "0 is kept only when it is ticked Free. Leave it blank if nobody has priced it yet.";
export const QUANTITY_BAD = "How much of it? A line for nothing is not a line.";

/** The store a request starts with: the main one, else the first (AskDialog). */
export const firstStore = (stores: readonly PurchaseStore[]) => (stores.find((s) => s.isMain) ?? stores[0])?.id ?? "";

/** AskDialog's checks in its order, then the server's on each line; the body to send, or the problem. */
export function askBody(storeId: string, reason: string, drafts: readonly AskDraft[]): { body: AskBody } | { problem: string } {
  if (!storeId) return { problem: "Which store is this for?" };
  if (!reason.trim()) return { problem: "Say what this is for. Whoever approves it has to know what they are approving." };
  /* A line with no item or no quantity is not a line (the web drops it). */
  const filled = drafts.filter((d) => d.itemId !== "" && !blank(d.quantity));
  if (filled.length === 0) return { problem: "What is being asked for?" };
  if (new Set(filled.map((d) => d.itemId)).size !== filled.length) {
    return { problem: "The same item is on this request twice. Put it on one line." };
  }
  const lines: AskLine[] = [];
  for (const d of filled) {
    const quantity = typed(d.quantity);
    if (quantity === null || quantity <= 0) return { problem: QUANTITY_BAD };
    if (d.free) { lines.push({ itemId: d.itemId, quantity, unitPrice: 0, unitPriceFree: true }); continue; }
    /* BLANK IS NOT ZERO: nobody has agreed a price, so none is sent. */
    if (blank(d.unitPrice)) { lines.push({ itemId: d.itemId, quantity, unitPrice: null }); continue; }
    const price = typed(d.unitPrice);
    if (price === null) return { problem: PRICE_BAD };
    if (price === 0) return { problem: ZERO_NOT_FREE };
    lines.push({ itemId: d.itemId, quantity, unitPrice: price });
  }
  return { body: { storeId, reason: reason.trim(), lines } };
}

/** The web's toast once the server said yes. */
export const raisedWords = (r: Pick<PurchaseRequest, "reference" | "state">) =>
  r.state === "waiting" ? `${r.reference} is with the general manager to approve.` : `${r.reference} is ready to order.`;

/* ── The agreed price of one line (LineRow) ──────────────────────── */

/** `same`: nothing changed, nothing is sent. Blank puts it back to "not agreed" (null). */
export function priceBody(text: string, free: boolean, now: string | null):
  { same: true } | { body: { unitPrice: number | null; free?: true } } | { problem: string } {
  if (free) return now !== null && typed(now) === 0 ? { same: true } : { body: { unitPrice: 0, free: true } };
  if (blank(text)) return now === null ? { same: true } : { body: { unitPrice: null } };
  const price = typed(text);
  if (price === null) return { problem: PRICE_BAD };
  if (price === 0) return { problem: ZERO_NOT_FREE };
  if (now !== null && typed(now) === price) return { same: true };
  return { body: { unitPrice: price } };
}
/** A line ticked Free is a 0 agreed (D27-120). */
export const isFree = (l: Pick<PurchaseLine, "unitPrice">) => l.unitPrice !== null && typed(l.unitPrice) === 0;

/* ── Sending, cancelling ──────────────────────────────────────────── */

export const sendProblem = (supplierId: string) => (supplierId ? null : "Who is this ordered from?");
export const sentWords = (reference: string) =>
  `${reference} is ordered. Download it and print it, or attach it to a message - nothing is sent automatically.`;
export const cancelProblem = (reason: string) => (reason.trim() ? null : "Say why. Whoever asked for it has to know what to do next.");

/* ── The delivery (DeliveryDialog, then the Store's deliveryFactsProblem) ── */

export interface DeliveryDraft {
  came: string;
  cost: string;
  /** GST: the rate in per cent, the amount as printed on the bill, claimable "yes" | "no" | "". */
  rate: string;
  gst: string;
  claimable: "" | "yes" | "no";
  useBy: string;
}
export interface BillDraft { billNo: string; billDate: string; amount: string; dueOn: string }

/** What the fields start from: the ordered quantity and the agreed price (the web's). */
export const deliveryStart = (l: Pick<PurchaseLine, "quantity" | "unitPrice">): DeliveryDraft => ({
  came: figure(l.quantity) === DASH ? "" : figure(l.quantity), cost: l.unitPrice ?? "", rate: "", gst: "", claimable: "", useBy: "",
});

/** The GST rates offered since 22 September 2025; 12 and 28 still typed for an older bill. */
export const GST_RATES = ["0", "5", "18", "40"] as const;

/** The parts the web multiplies into its suggested GST amount: "40 × ₹51.25 × 5%", or null while any is missing. */
export function gstParts(d: Pick<DeliveryDraft, "came" | "cost" | "rate">): string | null {
  if (typed(d.came) === null || typed(d.cost) === null || typed(d.rate) === null) return null;
  return `${figure(d.came.trim())} × ${rupees(d.cost.trim())} × ${figure(d.rate.trim())}%`;
}

export interface DeliveryLine {
  lineId: string; receivedQuantity: number; receivedUnitCost: number | null;
  gstRate?: number; gstAmount?: number; gstClaimable?: boolean; expiresOn?: string;
}
export interface DeliveryBody {
  note?: string;
  lines: DeliveryLine[];
  credit?: { billNo: string; billDate: string; amount: number; dueOn: string };
}

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const isDay = (s: string) => DAY.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`))
  && new Date(`${s}T00:00:00Z`).toISOString().slice(0, 10) === s;

/** The web's checks per line in its order, the Store's on GST and the use-by, and the bill's
    on credit (supplierDues.ts creditProblem): the body, or the first problem, in their words. */
export function deliveryBody(
  lines: readonly Pick<PurchaseLine, "id" | "item">[],
  drafts: Readonly<Record<string, DeliveryDraft>>,
  note: string,
  bill: BillDraft | null,
): { body: DeliveryBody } | { problem: string } {
  const out: DeliveryLine[] = [];
  for (const l of lines) {
    const d = drafts[l.id];
    /* A BLANK IS NEVER 0: nothing at all is typed as 0. */
    const came = typed(d?.came);
    if (!d || came === null) {
      return { problem: `How much of the ${l.item} came? Nothing at all is 0, and it stays on the record beside what was ordered.` };
    }
    const cost = blank(d.cost) ? null : typed(d.cost);
    if (!blank(d.cost) && cost === null) return { problem: `The cost of the ${l.item} is zero or more, or nothing at all.` };
    const given = [d.rate, d.gst, d.claimable].filter((v) => !blank(v)).length;
    if (given !== 0 && given !== 3) {
      return { problem: `GST on the ${l.item} is the rate, the amount and whether it can be claimed - all three, or none.` };
    }
    const line: DeliveryLine = { lineId: l.id, receivedQuantity: came, receivedUnitCost: cost };
    if (given === 3) {
      const rate = typed(d.rate), amount = typed(d.gst);
      if (rate === null || rate > 100) return { problem: "A GST rate is between 0 and 100 per cent." };
      if (amount === null) return { problem: "A GST amount is zero or more." };
      Object.assign(line, { gstRate: rate, gstAmount: amount, gstClaimable: d.claimable === "yes" });
    }
    if (!blank(d.useBy)) {
      if (!isDay(d.useBy.trim())) return { problem: "An expiry is a date." };
      line.expiresOn = d.useBy.trim();
    }
    out.push(line);
  }
  const body: DeliveryBody = { lines: out };
  if (note.trim()) body.note = note.trim();
  if (bill) {
    if (!bill.billNo.trim()) return { problem: "Type the supplier's bill number, as printed on it." };
    if (bill.billNo.trim().length > 60) return { problem: "A bill number is at most 60 characters." };
    if (!isDay(bill.billDate.trim())) return { problem: "Pick the date on the supplier's bill." };
    const amount = typed(bill.amount);
    if (amount === null || amount <= 0 || amount >= 1e10) return { problem: "Type the bill's amount, as printed on it: more than zero." };
    if (!isDay(bill.dueOn.trim())) return { problem: "Pick the date the bill is due." };
    if (bill.dueOn.trim() < bill.billDate.trim()) return { problem: "A bill is due on its own date or later, not before it." };
    body.credit = { billNo: bill.billNo.trim(), billDate: bill.billDate.trim(), amount, dueOn: bill.dueOn.trim() };
  }
  return { body };
}

/** purchasing.ts suggestedDue (D27-372): the bill's date + 30 days, offered to accept or change. */
export function suggestedDue(billDate: string): string {
  if (!isDay(billDate.trim())) return "";
  const d = new Date(`${billDate.trim()}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 30);
  return d.toISOString().slice(0, 10);
}

/** The web's toast once the delivery is recorded. */
export const deliveredWords = (received: number, store: string) =>
  received === 0 ? "Recorded. Nothing came, and that is on the order."
    : `${received === 1 ? "One item" : `${received} items`} received into ${store}.`;
