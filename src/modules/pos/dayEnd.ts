/* ══════════════════════════════════════════════════════════════════
   CLOSE RESTAURANT DAY'S RULES — ported from the web's
   src/modules/pos/pages/DayEnd.tsx (16 Nov) and its shapes from
   src/modules/pos/data/till.ts 2035-2142; the API is
   api/src/modules/pos/till.ts 4515-4955 (GET /till/day-end, POST
   day-end/open, /movements, /count, /close).

   THE MONEY IS THE SERVER'S. Expected, the saved count, the variance, the
   opening float, every sale and every movement are figures the server
   sends; the phone shows them as sent (paise kept, MEMORY 9) and adds
   none of them together. Two sums are the person's own and stay the
   phone's, as on the web: the notes and coins they type (each ₹500 × 3,
   and the float or count those make), because Open the day sends that
   figure and Save the count sends the notes. Both are whole rupees in
   whole notes, worked in integers, so they are exact.

   The close's guards are the server's own (till.ts 4880-4950): nothing
   outstanding, the drawer counted, a reason for a difference beyond the
   paid-outs waiting for a yes, and the float kept from ₹0 to the count.
   Pure: dayEnd.check.ts runs it under node.
   ══════════════════════════════════════════════════════════════════ */

export type MovementKind = "expense" | "top_up" | "withdrawal" | "due_collection";

/** data/till.ts DayEnd, trimmed to what the phone shows. */
export interface DayEnd {
  outlet: { code: string; name: string };
  businessDate: string;
  summary: {
    settledOrders: number; settledValue: number;
    abandonedOrders: number; abandonedValue: number;
    discountGiven: number;
    byMethod: Record<string, number>;
  };
  /** What a PERSON must decide before this can close. */
  blockers: { id: string; reason: string; detail: string | null }[];
  struck?: { orderNo: string; table: string | null; name: string; qty: number; value: number; reason: string | null; by: string | null; at: string }[];
  voided?: { orderNo: string; table: string | null; amount: number; method: string | null; reason: string; reference: string | null; by: string | null; at: string }[];
  noCharge?: { orderNo: string; table: string | null; reason: string; by: string | null; at: string; value: number }[];
  modeChanges?: { orderNo: string; table: string | null; from: string; to: string; amount: number; reason: string; by: string | null; at: string; afterDayEnd: boolean }[];
  serviceCharge?: { bills: number; amount: number };
  tips?: { cash: number; card: number; upi: number; total: number };
  movements: {
    id: string; kind: MovementKind | string; amount: number; reason: string; recordedBy: string | null; at: string;
    approval?: string | null; approvalNote?: string | null; category?: string | null; photo?: boolean;
  }[];
  cash: {
    opening: number;
    expected: number;
    /** Null until somebody counts. Not zero — nobody counted zero. */
    counted: number | null;
    variance: number | null;
    /** Paid-outs waiting for a yes, not in `expected` yet (D27-242). */
    waiting?: number;
    varianceReason: string | null;
    denominations: { value: number; count: number }[];
  };
  /** False only on the outlet's first-ever day, before its one count (D27-200). */
  opened: boolean;
  closedAt: string | null;
  closedBy: string | null;
}

/** The web asks the restaurant's outlet, REST (getDayEnd's default). */
export const OUTLET = "REST";

export type Step = "overview" | "cash" | "finalize";
export const STEPS: { id: Step; label: string; hint: string }[] = [
  { id: "overview", label: "Overview", hint: "What the shift did" },
  { id: "cash", label: "Cash", hint: "What is in the tin" },
  { id: "finalize", label: "Finalize", hint: "Close the day" },
];

/** The notes and coins in circulation (nobody counts a ₹1 coin into a till). */
export const DENOMINATIONS = [500, 200, 100, 50, 20, 10, 5, 2];

export const MOVEMENTS: { kind: MovementKind; label: string; hint: string; sign: -1 | 1 }[] = [
  { kind: "expense", label: "Expense", sign: -1, hint: "Paid out of the drawer - a delivery of vegetables, a repair" },
  { kind: "top_up", label: "Cash in", sign: 1, hint: "Change brought from the safe" },
  { kind: "withdrawal", label: "To the safe", sign: -1, hint: "Cash taken out mid-shift" },
  { kind: "due_collection", label: "Due paid", sign: 1, hint: "A bill settled to an account, paid now in cash" },
];
export const movementOf = (kind: string) => MOVEMENTS.find((m) => m.kind === kind);

/** finance/data/expenses.ts EXPENSE_CATEGORIES: the database's five (the petty cash book, D27-370). */
export const EXPENSE_CATEGORIES = ["Kitchen", "Housekeeping", "Maintenance", "Office", "Other"] as const;

export const METHOD_LABEL: Record<string, string> = {
  cash: "Cash", card: "Card", upi: "UPI", room: "To a room", due: "Due", comp: "Complimentary",
  function: "To a function", allowance: "Owner's allowance",
};
export const methodWord = (m: string | null | undefined) => (m ? METHOD_LABEL[m] ?? m : "-");

/** How the money arrived, largest first (Overview's `methods`). */
export const methodsByAmount = (byMethod: Record<string, number>) =>
  Object.entries(byMethod).sort(([, a], [, b]) => b - a);

/** "Tuesday, 25 August 2026 · 5 Elements Akkalkot" (D17-20): the day in
    words and the hotel by name, the page's OWN hotel - the code when the
    name is not known, never another hotel's name. */
export const dayAt = (dayWords: string, hotelName: string) => `${dayWords} · ${hotelName}`;
export const hotelNameOf = (hotels: readonly { code: string; name: string }[], code: string) =>
  hotels.find((h) => h.code === code)?.name ?? code;

/* ── The notes the person types (NoteGrid) ─────────────────────────── */

export type Counts = Record<number, string>;

/** A count is whole notes: blank is nothing typed, anything else not a count. */
const WHOLE = /^\d{1,6}$/;

export interface Typed {
  /** Something was typed in at least one row (Open waits until then: blank is not zero). */
  any: boolean;
  /** A row holds something that is not a whole number of notes. */
  bad: number | null;
  /** ₹ in whole rupees: Σ value × count, integers only. */
  total: number;
  /** What Save the count sends: the rows with notes, as the web sends them. */
  denominations: { value: number; count: number }[];
}

export function typed(counts: Counts): Typed {
  let total = 0;
  let any = false;
  let bad: number | null = null;
  const denominations: { value: number; count: number }[] = [];
  for (const value of DENOMINATIONS) {
    const raw = (counts[value] ?? "").trim();
    if (raw === "") continue;
    any = true;
    if (!WHOLE.test(raw)) { bad ??= value; continue; }
    const count = Number(raw);
    total += value * count;
    if (count > 0) denominations.push({ value, count });
  }
  return { any, bad, total, denominations };
}

/** A row's own figure: a dash, not a zero, where nobody counted (NoteGrid). */
export function rowFigure(value: number, raw: string | undefined): number | null {
  const s = (raw ?? "").trim();
  if (!WHOLE.test(s) || Number(s) === 0) return null;
  return value * Number(s);
}

/** The count as the server holds it, for the grid to start from (CashStep's seed). */
export function seedCounts(denominations: readonly { value: number; count: number }[]): Counts {
  const seed: Counts = {};
  for (const d of denominations) seed[d.value] = String(d.count);
  return seed;
}

export const badRow = (value: number) => `₹${value}: whole notes only.`;

/* ── The tin ─────────────────────────────────────────────────────────── */

/** A paid-out still waiting for a yes, or refused: not taken off the tin (D27-242). */
export const waitsOrRefused = (m: { approval?: string | null }) =>
  m.approval === "pending" || m.approval === "clarify" || m.approval === "rejected";

export function approvalWords(m: { approval?: string | null; approvalNote?: string | null }): string | null {
  if (!waitsOrRefused(m)) return null;
  return m.approval === "rejected"
    ? `Not approved${m.approvalNote ? `: ${m.approvalNote}` : ""} - not taken off the tin`
    : "Waiting for a yes - not taken off the tin yet";
}

const paise = (n: number) => Math.round(n * 100);

/** The Variance box: null amount = nothing counted. `waitingPart` is the
    server's `waiting` or the shortage itself, whichever is smaller - one of
    the two server figures, never a new one. */
export function variance(amount: number | null, waiting = 0) {
  if (amount === null) return { counted: false as const };
  const balanced = Math.abs(paise(amount)) < 1;
  return {
    counted: true as const,
    balanced,
    over: amount > 0,
    by: Math.abs(amount),
    waitingPart: !balanced && amount < 0 && waiting > 0 ? Math.min(waiting, -amount) : null,
  };
}

/** The server's rule (till.ts 4920-4930): a reason only for what the paid-outs waiting for a yes do not explain. */
export const needsReason = (cash: Pick<DayEnd["cash"], "variance" | "waiting">) =>
  cash.variance !== null && Math.abs(paise(cash.variance) + paise(cash.waiting ?? 0)) >= 1;

/** The float kept for tomorrow (D27-191): typed at every close, blank is not zero. */
const AMOUNT = /^\d{1,9}(\.\d{1,2})?$/;
export function kept(text: string, counted: number | null): { value: number | null; ok: boolean } {
  const s = text.trim();
  if (s === "" || !AMOUNT.test(s)) return { value: null, ok: false };
  const value = Number(s);
  return { value, ok: counted !== null && value >= 0 && paise(value) <= paise(counted) };
}

/** Why Close is grey, or null when it may be tapped: the server's own refusals, in its order. */
export function whyNotClose(day: Pick<DayEnd, "blockers" | "cash" | "closedAt">, why: string, keptText: string, rupees: (n: number) => string): string | null {
  if (day.closedAt) return "That day is already closed.";
  if (day.blockers.length) return day.blockers.map((b) => b.reason).join(" ");
  if (day.cash.counted === null) return "Count the drawer first.";
  if (needsReason(day.cash) && !why.trim()) return "The drawer does not balance. Say why, and it closes.";
  if (!kept(keptText, day.cash.counted).ok) {
    return `Say what float is kept for the next day - from ₹0 to the ${rupees(day.cash.counted)} counted.`;
  }
  return null;
}

/** What Close sends (closeDay): the reason trimmed by the server, the float as typed. */
export const closeBody = (why: string, keptText: string) => ({ varianceReason: why, keptCash: Number(keptText.trim()) });

/** What Record sends (recordMovement): a category only on a paid-out. */
export function movementBody(kind: MovementKind, amount: string, reason: string, category: string) {
  return { kind, amount: Number(amount.trim()), reason, ...(kind === "expense" ? { category } : {}) };
}
/** Record is grey until these are given (the web's disabled rule). */
export const mayRecord = (kind: MovementKind, amount: string, reason: string, category: string) =>
  amount.trim() !== "" && reason.trim() !== "" && (kind !== "expense" || category !== "");

const whole = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const exact = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2, maximumFractionDigits: 2 });
/** The web's money() (₹12,989) - except that a figure with paise keeps them (MEMORY 9). A figure not held: a dash. */
export const rupees = (n: number | null | undefined) =>
  n == null || !Number.isFinite(n) ? "-" : Number.isInteger(n) ? whole.format(n) : exact.format(n);
/** The web's moneyPrecise (₹336.00). */
export const precise = (n: number | null | undefined) => (n == null || !Number.isFinite(n) ? "-" : exact.format(n));
/** A movement's figure, signed as the web signs it. */
export const signed = (sign: -1 | 1 | undefined, n: number) => `${sign === 1 ? "+" : "−"}${rupees(n)}`;
