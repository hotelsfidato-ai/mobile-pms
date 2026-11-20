import { DASH } from "../../core/format.ts";
import { dateDay, rupees } from "./bill.ts";

/* ══════════════════════════════════════════════════════════════════
   THE FINANCE DESK'S RULES (lane m13-fin-desk, 19 Nov) — Cashiering, Company
   accounts, Cash deposits, Form III and Supplier dues, ported from the web:
     src/modules/finance/pages/Cashiering.tsx, data/cashier.ts
     src/modules/finance/pages/CashDeposits.tsx, data/deposits.ts
     src/modules/finance/pages/Billing.tsx (PropertyCityLedgerPage),
       flows/CompanyPayments.tsx, data/companyPayments.ts
     src/modules/guests/pages/FormC.tsx, data/formC.ts,
       components/StayCompanions.tsx (peopleWords)
     src/modules/purchasing/components/SupplierDues.tsx, data/purchasing.ts
   and the API's: api/src/roleGate.ts (DRAWER, MONEY, COMPANY_PAYMENT*,
   MONEY_REPORT, FORM_C, GUEST_ID, refusalFor), permissions.ts (who holds
   each grant, read 19 Nov), finance/cashier.ts, finance/deposits.ts (RECORD,
   VERIFY, SEE), purchasing/purchasingGrants.ts (DUES_ROLES, PURCHASING_REFUSED),
   reports/builders/cityLedger.ts and supplierDues.ts (their total rows).

   MONEY IS THE SERVER'S. Every figure shown is one the server sent, to the
   paisa (bill.ts `rupees`), a dash where it sent none. Where the web adds
   figures up in the browser (the ledger's owed, a supplier's total, the
   drawer's per-kind sums, the float "to deposit"), the phone shows the
   server's own total row or leaves the sum out (MODULE.md). The one sum the
   phone makes is the tally of notes the person typed, the web's own, shown as
   theirs and sent as typed. A blank is never a zero.
   Pure: no React Native here, so `desk.check.ts` runs under node.
   ══════════════════════════════════════════════════════════════════ */

export { DASH, dateDay, rupees };

/** A write whose outcome was lost (MEMORY 16) stays unknown until a read that BEGAN after the loss
    has come back (pos dayEnd.ts stillUnknown, the reviews of 20 Nov): `stuckAt` the moment it was
    lost, `began` when the read now on screen began. */
export const stillUnknown = (stuckAt: number | null, began: number) => stuckAt !== null && began <= stuckAt;

/* ── Who may (the API's lists and sentences) ─────────────────────── */

const DESK = ["owner", "admin", "gm", "hotel_manager", "front_desk", "finance"];
const DESK_WORDS = "the owner, an administrator, the general manager, the hotel manager, reception or the accountant";
const READERS = [...DESK, "read_only"];
const READER_WORDS = "the owner, an administrator, the general manager, the hotel manager, reception, the accountant or a viewer";
const FOUR = ["owner", "admin", "gm", "finance"];
const FOUR_WORDS = "the owner, an administrator, the general manager or the accountant";
const CHECKERS = ["owner", "admin", "gm", "hotel_manager", "front_desk"];
const CHECKER_WORDS = "the owner, an administrator, the general manager, the hotel manager or reception";

const allow = (list: readonly string[], role: string | null, refusal: string) =>
  role != null && list.includes(role) ? null : refusal;

/** GET /cashier-shift: MONEY, `payment` view. */
export const whyNotReadDrawer = (role: string | null) =>
  allow(READERS, role, `Reading payments and the cash drawer is for ${READER_WORDS}. Ask one of them.`);
/** POST /cashier-shift/*: DRAWER, `payment` create. */
export const whyNotRunDrawer = (role: string | null) =>
  allow(DESK, role, `Running the cashier's drawer is for ${DESK_WORDS}. Ask one of them.`);
/** GET /reports/city-ledger: MONEY_REPORT, `invoice` view. */
export const whyNotReadLedger = (role: string | null) =>
  allow(READERS, role, `Reading money owed and taken is for ${READER_WORDS}. Ask one of them.`);
/** POST /company-payments: COMPANY_PAYMENT, `payment` create. */
export const whyNotRecordCompanyPayment = (role: string | null) =>
  allow(DESK, role, `Recording a company's payment is for ${DESK_WORDS}. Ask one of them.`);
/** POST /company-payments/:id/reverse: COMPANY_PAYMENT_REVERSE, `payment` edit. */
export const whyNotReverseCompanyPayment = (role: string | null) =>
  allow(FOUR, role, `Reversing a company's payment is for ${FOUR_WORDS}. Ask one of them.`);
/** GET /cash-deposits: deposits.ts SEE, in its own words. */
export const whyNotReadDeposits = (role: string | null) =>
  allow(["owner", "admin", "gm", "finance", "read_only"], role,
    "Cash deposits are for the owner, an administrator, the general manager, the accountant or a viewer.");
/** Record, reverse, explain: deposits.ts RECORD. The server also says it (canRecord). */
export const RECORD_DEPOSIT_REFUSED = "That is for the owner, an administrator or the general manager.";
/** Verify: deposits.ts VERIFY (canVerify). */
export const VERIFY_DEPOSIT_REFUSED = "That is for the owner or the accountant.";
/** GET /form-c: GUEST_ID, `customer` edit (the passports are on it). */
export const whyNotReadFormC = (role: string | null) =>
  allow(CHECKERS, role, `Reading guests' passport and ID details is for ${CHECKER_WORDS}. Ask one of them.`);
/** POST /form-c/:id, PUT /form-c/:id/details: FORM_C, the same five. */
export const whyNotRecordFormC = (role: string | null) =>
  allow(CHECKERS, role, `Recording Form III is for ${CHECKER_WORDS}. Ask one of them.`);
/** GET /purchasing/dues: DUES_ROLES, PURCHASING_REFUSED.dues. */
export const whyNotReadDues = (role: string | null) =>
  allow(FOUR, role, `What is owed to suppliers is for ${FOUR_WORDS}.`);
/** POST /purchasing/dues/*: DUES_ROLES, PURCHASING_REFUSED.pay. */
export const whyNotPaySupplier = (role: string | null) =>
  allow(FOUR, role, `Recording a payment to a supplier is for ${FOUR_WORDS}.`);

/* ══════════════════════════════════════════════════════════════════
   CASHIERING — the drawer somebody is holding right now
   ══════════════════════════════════════════════════════════════════ */

export interface CashierReceipt { method: string; count: number; amount: number }
export interface CashierMovement {
  id: string; kind: string; amount: number; reason: string; recordedBy: string; at: string;
  /** pending, clarify, approved, rejected; null where nobody was asked (D27-242). */
  approval?: string | null; approvalNote?: string | null;
  category?: string | null; photo?: boolean;
}
export interface CashierDrawer {
  id: string; openedAt: string; opening: number;
  received?: { amount: number; from: string | null; closedAt: string }[];
  receipts: CashierReceipt[]; movements: CashierMovement[];
  /** The server's: the float, cash taken, money in, less money out. */
  expected: number;
  /** Null until somebody counts. Not zero - nobody counted zero. */
  counted: number | null;
  variance: number | null;
  waiting?: number;
  varianceReason: string | null;
  denominations: { value: number; count: number }[];
}
export interface CashierDrawerView {
  businessDate: string;
  shift: CashierDrawer | null;
  waiting?: number;
  colleagues: { id: string; name: string }[];
  previous: { closedAt: string; counted: number; kept?: number | null; handedTo: string | null } | null;
}

/** The notes and coins a front desk holds (Cashiering.tsx DENOMINATIONS). */
export const DENOMINATIONS = [500, 200, 100, 50, 20, 10, 5, 2] as const;

export const MOVEMENTS = [
  { kind: "expense", label: "Paid out", hint: "A taxi, a courier - money that left the drawer", sign: -1 },
  { kind: "top_up", label: "Cash in", hint: "Change brought from the safe", sign: 1 },
  { kind: "withdrawal", label: "To the safe", hint: "Cash taken out mid-shift", sign: -1 },
] as const;
export type MovementKind = (typeof MOVEMENTS)[number]["kind"];

/** expenses.ts EXPENSE_CATEGORIES: the petty cash book's five (D27-370). */
export const EXPENSE_CATEGORIES = ["Kitchen", "Housekeeping", "Maintenance", "Office", "Other"] as const;

export const METHOD_LABEL: Record<string, string> = {
  cash: "Cash", card: "Card", upi: "UPI", netbanking: "Net banking", wallet: "Wallet", cheque: "Cheque",
  bank_transfer: "Bank transfer", city_ledger: "To a company account", unrecorded: "Method not recorded",
};

export type Counts = Partial<Record<number, string>>;

/** A count already saved, as the boxes hold it. */
export const seedCounts = (saved: { value: number; count: number }[]): Counts =>
  Object.fromEntries(saved.map((d) => [d.value, String(d.count)]));

const blank = (text: string | undefined) => text == null || text.trim() === "";
const anyTyped = (counts: Counts) => DENOMINATIONS.some((v) => !blank(counts[v]));
/** A count is a whole number of notes or coins, zero or more (cashier.ts /count's own rule). */
const wholeCount = (text: string) => /^\d+$/.test(text.trim());
export const COUNT_REFUSED = "A count is a whole number of notes or coins - zero or more.";

/** One row's figure: the notes typed times their value; a dash when nothing is (the web's NoteGrid). */
export function noteLine(value: number, text: string | undefined): string {
  if (blank(text) || !wholeCount(text!)) return DASH;
  const n = Number(text);
  return n > 0 ? rupees(value * n) : DASH;
}

/** The tally of what was typed, null while nothing is, or when a box is not a whole number. */
export function tally(counts: Counts): number | null {
  if (!anyTyped(counts)) return null;
  let sum = 0;
  for (const v of DENOMINATIONS) {
    const text = counts[v];
    if (blank(text)) continue;
    if (!wholeCount(text!)) return null;
    sum += v * Number(text);
  }
  return sum;
}

/** Opening by hand (D27-190): nothing until something is typed; 0 only when somebody types it.
    A box that is not a whole number is refused here with the count's own sentence, so the
    drawer never opens on a figure nobody counted. */
export function openingOf(counts: Counts): { opening: number } | { problem: string } | null {
  if (!anyTyped(counts)) return null;
  const sum = tally(counts);
  return sum === null ? { problem: COUNT_REFUSED } : { opening: sum };
}

/** The count as typed (QA FI-10: a mistake is sent, so the server refuses it): each box with
    something in it, its figure as typed; a blank box is not sent, it is not a zero. Null while
    nothing is typed: a count of nothing is not saved as ₹0. */
export function countBody(counts: Counts): { denominations: { value: number; count: number }[] } | null {
  if (!anyTyped(counts)) return null;
  return { denominations: DENOMINATIONS.filter((v) => !blank(counts[v])).map((v) => ({ value: v, count: Number(counts[v]!.trim()) })) };
}

/** Open's words, as the web: the tally once something is typed. */
export const openLabel = (counts: Counts) => {
  const sum = tally(counts);
  return anyTyped(counts) ? `Open the drawer - ${sum === null ? DASH : rupees(sum)}` : "Count a float to open by hand";
};
export const saveLabel = (counts: Counts) => {
  const sum = tally(counts);
  return anyTyped(counts) ? `Save the count - ${sum === null ? DASH : rupees(sum)}` : "Type the count to save it";
};

/** The float handed to this person by name (D27-201), the server's figure. */
export const handedWords = (waiting: number | null | undefined) =>
  waiting != null && waiting > 0
    ? `${rupees(waiting)} was handed to you: your drawer opens on it.`
    : "Nothing was handed to you: your drawer opens at ₹0.";

/** The last close (D27-202): what was counted, the float kept and for whom. The web also
    prints the count less the float as "to deposit"; that is a sum, so the phone leaves it
    to Cash deposits, which the server works out. */
export function lastClose(p: CashierDrawerView["previous"]): string | null {
  if (!p) return null;
  const head = `Your last shift closed ${p.closedAt} with ${rupees(p.counted)} counted`;
  if (p.kept == null) return `${head}.`;
  return `${head}: ${rupees(p.kept)} kept${p.kept > 0 ? ` for ${p.handedTo ?? DASH}` : ""}, the rest to deposit.`;
}

/** Cash taken this shift: the server's cash line, a dash when it sent none. */
export const cashTaken = (receipts: CashierReceipt[]) => receipts.find((r) => r.method === "cash")?.amount ?? null;

export const receiptWords = (r: CashierReceipt) =>
  `${METHOD_LABEL[r.method] ?? r.method} · ${r.count} ${r.count === 1 ? "receipt" : "receipts"}`;

/** A paid-out still waiting for a yes, or refused: not taken off the drawer (D27-242). */
export const waitsOrRefused = (m: { approval?: string | null }) =>
  m.approval === "pending" || m.approval === "clarify" || m.approval === "rejected";

export const movementOf = (kind: string) => MOVEMENTS.find((m) => m.kind === kind);
/** "+₹500.00" / "−₹120.00": the server's amount with its kind's sign. */
export const movementAmount = (m: { kind: string; amount: number }) =>
  `${movementOf(m.kind)?.sign === 1 ? "+" : "−"}${rupees(m.amount)}`;
export const movementLine = (m: CashierMovement) =>
  `${movementOf(m.kind)?.label ?? m.kind}${m.kind === "expense" ? ` · ${m.category ?? DASH}` : ""} · ${m.recordedBy} · ${m.at}`;
export const approvalLine = (m: CashierMovement) =>
  !waitsOrRefused(m) ? null
    : m.approval === "rejected"
      ? `Not approved${m.approvalNote ? `: ${m.approvalNote}` : ""} - not taken off the drawer`
      : "Waiting for a yes - not taken off the drawer yet";

/** The difference, in the server's figure (`variance`, the count less Expected). */
export function varianceWords(variance: number | null, waiting = 0):
  { tone: "none" | "ok" | "warn"; title: string; lines: string[] } {
  if (variance === null) return { tone: "none", title: "Nothing counted yet.", lines: [] };
  if (Math.abs(variance) < 0.01) return { tone: "ok", title: "The drawer balances", lines: [] };
  const lines: string[] = [];
  /* The smaller of two of the server's figures: which part of a shortage is waiting. */
  if (variance < 0 && waiting > 0) lines.push(`${rupees(Math.min(waiting, -variance))} of it is paid out and waiting for a yes.`);
  lines.push("This does not stop the handover. It has to be written down.");
  return { tone: "warn", title: `${variance > 0 ? "Over" : "Short"} by ${rupees(Math.abs(variance))}`, lines };
}

/** Close and hand over: only once a count is saved (the web's button). */
export const whyNotClose = (shift: CashierDrawer) => (shift.counted === null ? "Save the count first." : null);

/** The close's guard, the web's CloseDialog exactly: a reason when the difference is more than
    the paid-outs waiting explain; the float kept typed, from ₹0 to the count; above ₹0 it names
    the next person. Blank is not zero. */
export function closeState(shift: CashierDrawer, kept: string, handOverTo: string, why: string) {
  const waiting = shift.waiting ?? 0;
  const needsReason = shift.variance !== null && Math.abs(shift.variance + waiting) >= 0.01;
  const counted = shift.counted;
  const keptNum = kept.trim() === "" ? null : Number(kept);
  const keptValid = counted !== null && keptNum !== null && Number.isFinite(keptNum) && keptNum >= 0 && keptNum <= counted;
  const needsName = keptValid && keptNum! > 0 && handOverTo === "";
  const ok = keptValid && !needsName && !(needsReason && !why.trim());
  const hint = needsName
    ? "A float kept needs the next person's name: choose who takes it above."
    : `From ₹0 to the ${rupees(counted)} counted. The rest is deposited.`;
  return { needsReason, needsName, ok, hint, body: ok ? { varianceReason: why, handOverTo: handOverTo || null, keptCash: keptNum! } : null };
}

/** What the close said: whom it went to, and the server's figure to deposit. */
export function closedWords(handedTo: string | null, toDeposit: number | null | undefined) {
  const to = handedTo ? `Handed to ${handedTo}.` : "Handed to nobody - the drawer is closed.";
  return toDeposit == null ? to : `${to} To deposit: ${rupees(toDeposit)}.`;
}

/** A movement's form, as the web's MovementDialog guards it. */
export function movementState(kind: MovementKind, amount: string, reason: string, category: string) {
  const expense = kind === "expense";
  const ok = amount.trim() !== "" && reason.trim() !== "" && (!expense || category !== "");
  return {
    ok,
    body: ok ? { kind, amount: Number(amount), reason, ...(expense ? { category } : {}) } : null,
  };
}

/* ══════════════════════════════════════════════════════════════════
   CASH DEPOSITS — each closed day's cash to deposit (D27-190, D27-191)
   ══════════════════════════════════════════════════════════════════ */

export interface DepositDay {
  date: string;
  points: { point: string; amount: number | null }[];
  toDeposit: number | null;
  deposited: number;
  difference: number | null;
  explanation: { reason: string; by: string | null; at: string } | null;
  red: boolean;
}
export interface Deposit {
  id: string; businessDate: string; amount: number; depositedOn: string | null; bank: string | null;
  slipNo: string | null; reversesId: string | null; reason: string | null; recordedBy: string | null;
  recordedAt: string; verifiedBy: string | null; verifiedAt: string | null; reversed: boolean; slipId: string | null;
}
export interface CashDeposits { businessDate: string; canRecord: boolean; canVerify: boolean; days: DepositDay[]; deposits: Deposit[] }

export const pointsLine = (day: DepositDay) => day.points.map((p) => `${p.point} ${rupees(p.amount)}`).join(" · ");
export const explanationLine = (day: DepositDay) =>
  day.explanation ? `“${day.explanation.reason}” - ${day.explanation.by ?? DASH}, ${day.explanation.at}` : null;
/** Red until explained; green once the server's difference is nothing. */
export const differenceTone = (day: DepositDay): "danger" | "success" | "plain" =>
  day.red ? "danger" : day.difference !== null && Math.abs(day.difference) < 0.01 ? "success" : "plain";

export const depositTitle = (x: Deposit) =>
  x.reversesId ? `Reversal for ${dateDay(x.businessDate)} - “${x.reason ?? DASH}”`
    : `${dateDay(x.businessDate)}'s cash · ${x.bank ?? DASH} · slip ${x.slipNo ?? DASH}`;
export const depositLine = (x: Deposit) =>
  x.reversesId ? `${x.recordedBy ?? DASH} · ${x.recordedAt}`
    : `Deposited ${dateDay(x.depositedOn)} · recorded by ${x.recordedBy ?? DASH}, ${x.recordedAt}`
      + (x.verifiedAt ? ` · verified by ${x.verifiedBy ?? DASH}, ${x.verifiedAt}` : "");

/** The acts on a deposit line, as the web offers them; a role the server refuses gets its words. */
export function depositActs(x: Deposit, d: { canRecord: boolean; canVerify: boolean }) {
  if (x.reversesId) return null;
  const open = !x.reversed && !x.verifiedAt;
  return {
    verify: open ? { why: d.canVerify ? null : VERIFY_DEPOSIT_REFUSED } : null,
    reverse: open ? { why: d.canRecord ? null : RECORD_DEPOSIT_REFUSED } : null,
  };
}

/** A day in YYYY-MM-DD, as the date boxes take it (M-7: no date-picker package). */
export const isDay = (text: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text.trim())) return false;
  const d = new Date(`${text.trim()}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === text.trim();
};

/** Record a deposit: the web's guard (every box), the amount sent as typed. */
export function depositState(f: { day: string; amount: string; depositedOn: string; bank: string; slipNo: string }) {
  const ok = f.day !== "" && f.amount.trim() !== "" && f.depositedOn.trim() !== "" && f.bank.trim() !== "" && f.slipNo.trim() !== "";
  return {
    ok,
    body: ok ? { businessDate: f.day, amount: Number(f.amount), depositedOn: f.depositedOn.trim(), bank: f.bank, slipNo: f.slipNo } : null,
  };
}
export const dayHint = (day: DepositDay | undefined) =>
  day ? `To deposit ${rupees(day.toDeposit)}, deposited so far ${rupees(day.deposited)}.` : undefined;
export const explainHead = (day: DepositDay) =>
  `To deposit ${rupees(day.toDeposit)}, deposited ${rupees(day.deposited)}: a difference of ${rupees(day.difference)}.`;

/* ══════════════════════════════════════════════════════════════════
   COMPANY ACCOUNTS — the City ledger report's figures, and what each paid
   ══════════════════════════════════════════════════════════════════ */

export interface ReportDoc { sections: Array<{ key: string; rows: Array<{ kind: "row" | "total" | "band"; cells: Record<string, unknown> }> }> }
export interface LedgerRow { account: string; opening: number | null; debit: number | null; credit: number | null; closing: number | null }

const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);

/** The report's accounts, as the server sent each figure: a dash where it sent none (the web's
    `Number(v ?? 0)` would print a zero nobody sent). */
export function ledgerRows(doc: ReportDoc | null | undefined): LedgerRow[] {
  return (doc?.sections.find((s) => s.key === "accounts")?.rows ?? [])
    .filter((r) => r.kind === "row")
    .map((r) => ({
      account: typeof r.cells["account"] === "string" && r.cells["account"] ? (r.cells["account"] as string) : DASH,
      opening: num(r.cells["opening"]), debit: num(r.cells["debit"]), credit: num(r.cells["credit"]), closing: num(r.cells["closing"]),
    }));
}

/** What is owed: the report's own Total row (the web adds the balances in the browser). */
export function ledgerOwed(doc: ReportDoc | null | undefined): number | null {
  const t = doc?.sections.find((s) => s.key === "accounts")?.rows.find((r) => r.kind === "total");
  return t ? num(t.cells["closing"]) : null;
}
export const owedPill = (owed: number | null): { tone: "warning" | "success"; words: string } | null =>
  owed === null ? null : { tone: owed > 0 ? "warning" : "success", words: `${rupees(owed)} owed` };

export interface LedgerAccount { companyId: string | null; bookingSourceId: string | null; name: string }
export interface CompanyPayment {
  id: string; account: string; companyId: string | null; bookingSourceId: string | null;
  amount: number; receivedOn: string; method: string; reference: string | null; note: string | null;
  reversesId: string | null; reason: string | null; recordedBy: string | null; recordedAt: string; reversed: boolean;
}
export interface CompanyPaymentsView { businessDate: string; methods: Record<string, string>; accounts: LedgerAccount[]; payments: CompanyPayment[] }

export const accountKey = (a: { companyId: string | null; bookingSourceId: string | null }) =>
  a.companyId ? `c:${a.companyId}` : `s:${a.bookingSourceId}`;

export const paymentTitle = (p: CompanyPayment) =>
  p.reversesId ? `Reversal: ${p.account} - "${p.reason}"` : `${p.account} · ${p.method}${p.reference ? ` · ${p.reference}` : ""}`;
export const paymentLine = (p: CompanyPayment) =>
  `Received ${dateDay(p.receivedOn)} · recorded by ${p.recordedBy ?? DASH}, ${p.recordedAt}${p.note ? ` · ${p.note}` : ""}`;

/** Record a company's payment: the web's guard (an account, more than zero, a date, a way). */
export function companyPaymentState(view: CompanyPaymentsView | undefined, f: { account: string; amount: string; receivedOn: string; method: string; reference: string; note: string }) {
  const chosen = view?.accounts.find((a) => accountKey(a) === f.account);
  const ok = Boolean(chosen) && Number(f.amount) > 0 && f.receivedOn.trim() !== "" && f.method !== "";
  return {
    ok, chosen,
    body: ok ? {
      ...(chosen!.companyId ? { companyId: chosen!.companyId } : {}),
      ...(chosen!.bookingSourceId ? { bookingSourceId: chosen!.bookingSourceId } : {}),
      amount: Number(f.amount), receivedOn: f.receivedOn.trim(), method: f.method, reference: f.reference, note: f.note,
    } : null,
  };
}

/* ══════════════════════════════════════════════════════════════════
   FORM III — the register of foreign guests (Form C until the 2025 Act)
   ══════════════════════════════════════════════════════════════════ */

export interface FormCRow {
  reservationId: string; guestId: string; companion: boolean; guest: string; nationality: string;
  passport: string | null; room: string; adults: number; recorded: number; children: number;
  arrived: string; checkOut: string; status: "checked_in" | "checked_out";
  arrivedAt: string | null; departedAt: string | null; dueBy: string; departureDueBy: string | null;
  overdue: boolean; departureOverdue: boolean; arrivalNumbers: string[]; departureNumbers: string[];
  filed: boolean; reference: string | null;
  [field: string]: string | number | boolean | string[] | null;
}
export interface FormCRegister {
  note: string;
  premises: { name: string; address: string | null; city: string | null; state: string | null; phone: string | null } | null;
  due: number; overdue: number;
  unrecorded: { room: string; adults: number; recorded: number }[];
  rows: FormCRow[];
}
export type FilingKind = "arrival" | "departure";

export const rowOf = (r: FormCRow) => `${r.reservationId}|${r.guestId}`;
/** StayCompanions.tsx peopleWords. */
export const peopleWords = (adults: number, recorded: number) => `${adults} adult${adults === 1 ? "" : "s"}, ${recorded} recorded`;

export const formCPill = (d: FormCRegister): { tone: "danger" | "warning" | "success"; words: string } =>
  ({ tone: d.overdue ? "danger" : d.due ? "warning" : "success", words: d.overdue ? `${d.overdue} overdue` : `${d.due} due` });

export const unrecordedLine = (d: FormCRegister) =>
  d.unrecorded.length === 0 ? null
    : `Adults not recorded in house, each may be a foreigner: ${d.unrecorded.map((u) => `room ${u.room} (${peopleWords(u.adults, u.recorded)})`).join(", ")}. Add them on the stay.`;

export const guestLine = (r: FormCRow) => `${r.nationality} · room ${r.room} · ${r.adults + r.children} in the room`;

/** "13 Oct 2026, 20:12" from the property's clock "2026-10-13 20:12"; a dash when not recorded. */
export const clockAt = (at: string | null) => (at ? `${dateDay(at.slice(0, 10))}, ${at.slice(11)}` : DASH);

/** One filing's state: filed with its numbers, or due / overdue by the server's time. */
export function filing(numbers: string[], overdue: boolean, due: string | null) {
  return numbers.length
    ? { tone: "success" as const, pill: "filed", words: numbers.join(", ") }
    : { tone: overdue ? "danger" as const : "warning" as const, pill: overdue ? "overdue" : "due", words: `by ${due ?? DASH}` };
}
export const recordLabel = (numbers: string[]) => (numbers.length ? "Add a number" : "Record number");

export const allFiled = (d: FormCRegister) => d.due === 0 && d.rows.length > 0;

/** What a filing sends: the number trimmed, its kind, and whose row when a companion's. */
export const filingBody = (r: FormCRow, kind: FilingKind, reference: string) =>
  ({ reference: reference.trim(), kind, ...(r.companion ? { guestId: r.guestId } : {}) });

/** A row's answers as the boxes hold them (FormC.tsx particularsOf): the address abroad
    comes back as home*, and goes as the document's own address. */
const HOME: Record<string, string> = { homeAddress: "addressLine", homeCity: "city", homeCountry: "country" };
export const particularsOf = (r: FormCRow): Record<string, string> => Object.fromEntries(
  Object.entries(r)
    .filter(([, v]) => typeof v === "string" || typeof v === "boolean")
    .map(([k, v]) => [HOME[k] ?? k, typeof v === "boolean" ? (v ? "yes" : "no") : (v as string)]));

/** Complete details' document (GUE-5): sent only when changed. */
export function documentChange(r: FormCRow, idType: string, idNumber: string, problem: (type: string, n: string) => string | null) {
  const hadType = typeof r["idType"] === "string" ? (r["idType"] as string) : "";
  const hadNumber = r.passport ?? "";
  const changed = idType !== hadType || idNumber.trim() !== hadNumber;
  const wrong = !changed || !idType ? null : !idNumber.trim() ? "Type the document's number." : problem(idType, idNumber);
  return { changed, wrong };
}

/** The card the guest signs (FormC.tsx FormIIICard), its lines in Form III's own order. A blank is a dash. */
export function cardLines(r: FormCRow, premises: FormCRegister["premises"], purposes: readonly (readonly [string, string])[]): Array<[string, string] | string> {
  const v = (x: unknown) => (x === null || x === undefined || x === "" ? DASH : String(x));
  const date = (x: unknown) => (typeof x === "string" && x ? dateDay(x) : DASH);
  const [arrivedDate, arrivedTime] = (r.arrivedAt ?? "").split(" ");
  const [departedDate, departedTime] = (r.departedAt ?? "").split(" ");
  const purpose = purposes.find(([k]) => k === r["purpose"])?.[1];
  const nights = Math.round((Date.parse(`${r.checkOut}T00:00:00Z`) - Date.parse(`${r.arrived}T00:00:00Z`)) / 86_400_000);
  const join = (xs: unknown[]) => xs.filter(Boolean).join(", ");
  return [
    "Premises",
    ["Name and address", join([premises?.name, premises?.address ?? join([premises?.city, premises?.state])]) || DASH],
    ["Phone of the place of stay", v(premises?.phone)],
    "Foreigner",
    ["Name in full (as in the passport)", r.guest],
    ["Nationality", r.nationality],
    ["Passport number", v(r.passport)],
    ["Visa or OCI number", v(r["visaNumber"])],
    ["Visa type", v(r["visaType"])],
    ["Contact phone in India", v(r["phoneInIndia"])],
    ["Mobile in India", v(r["mobileInIndia"])],
    ["Phone outside India", v(r["phoneAbroad"])],
    ["Mobile outside India", v(r["mobileAbroad"])],
    ["Email", v(r["email"])],
    ["Other details or remarks", v(r["remarks"])],
    "Arrival",
    ["Arrived from", v(r["arrivedFrom"])],
    ["Date of arrival", date(arrivedDate)],
    ["Time of arrival", v(arrivedTime)],
    ["Purpose of visit", r["purpose"] === "others" ? `Others: ${v(r["purposeOther"])}` : v(purpose)],
    ["Previous place of stay", v(r["previousStay"])],
    "Departure",
    ["Date of departure", date(departedDate)],
    ["Time", v(departedTime)],
    ["Next destination", v(r["nextDestination"])],
    "The portal's other boxes",
    ["Gender", typeof r["gender"] === "string" && r["gender"] ? (r["gender"] as string).charAt(0).toUpperCase() + (r["gender"] as string).slice(1) : DASH],
    ["Date of birth", date(r["dateOfBirth"])],
    ["Passport issued on, at, by", [date(r["passportIssuedOn"]), v(r["passportIssuePlace"]), v(r["passportIssueCountry"])].join(" · ")],
    ["Passport expiry", date(r["passportExpiry"])],
    ["Visa issued on, at, by", [date(r["visaIssuedOn"]), v(r["visaIssuePlace"]), v(r["visaIssueCountry"])].join(" · ")],
    ["Visa expiry", date(r["visaExpiry"])],
    ["Arrived in India on, at", [date(r["arrivedInIndiaOn"]), v(r["arrivalPort"])].join(" · ")],
    ["Address abroad", join([r["homeAddress"], r["homeCity"], r["homeCountry"]]) || DASH],
    ["Reference address in India", join([r["refAddress"], r["refCity"], r["refState"], r["refPincode"]]) || DASH],
    ["Employed in India", r["employedInIndia"] === null || r["employedInIndia"] === undefined ? DASH : r["employedInIndia"] ? "Yes" : "No"],
    ["Length of stay", Number.isFinite(nights) ? `${nights} night${nights === 1 ? "" : "s"} (booked), expected to leave ${dateDay(r.checkOut)}` : DASH],
    ["Portal number, arrival", r.arrivalNumbers.join(", ") || DASH],
    ["Portal number, departure", r.departureNumbers.join(", ") || DASH],
  ];
}

/* ══════════════════════════════════════════════════════════════════
   SUPPLIER DUES — what we owe suppliers (D27-370, D27-372)
   ══════════════════════════════════════════════════════════════════ */

export type PayMethod = "cash" | "cheque" | "bank" | "upi";
export type TdsSection = "194C" | "194Q" | "194J" | "194I";
export const PAY_METHODS: { value: PayMethod; label: string }[] = [
  { value: "cash", label: "Cash" }, { value: "cheque", label: "Cheque" }, { value: "bank", label: "Bank transfer" }, { value: "upi", label: "UPI" },
];
export const TDS_SECTIONS: TdsSection[] = ["194C", "194Q", "194J", "194I"];

export interface BillDifference { lineId: string; item: string; unit: string; kind: "quantity" | "price" | "gst"; billed: string; against: string }
export interface SupplierPayment {
  id: string; paidOn: string; method: PayMethod; reference: string | null; amount: string;
  tds: { section: TdsSection; rate: string; amount: string } | null;
  handedOverBy: string | null; recordedBy: string | null; reversed: boolean; differencesSeenBy: string | null;
}
export interface SupplierCreditNote { id: string; noteNo: string; noteDate: string; amount: string; issuedBy: "supplier" | "hotel"; reason: string }
export interface SupplierDue {
  id: string; supplierId: string | null; supplier: string; billNo: string; billDate: string;
  amount: string; dueOn: string; owed: string; paid: string; tds: string; credited: string;
  status: "unpaid" | "part-paid" | "paid"; replaces: string | null;
  from: { kind: "bar" } | { kind: "order"; id: string; reference: string };
  differences: BillDifference[]; payments: SupplierPayment[]; creditNotes: SupplierCreditNote[];
}
export interface SupplierDues {
  today: string; suppliers: { id: string; name: string }[]; bills: SupplierDue[];
  credits: (SupplierCreditNote & { supplierId: string; supplier: string })[];
}

/** A figure the server sent as text: to the paisa, a dash when there is none. */
export const money = (text: string | number | null | undefined) =>
  text === null || text === undefined || text === "" ? DASH : rupees(Number(text));

/** purchasing.ts differenceText. */
export function differenceText(d: BillDifference): string {
  const n = (v: string) => String(Number(v));
  if (d.kind === "quantity") return `${d.item}: billed ${n(d.billed)} ${d.unit}, ${n(d.against)} ${d.unit} came`;
  if (d.kind === "price") return `${d.item}: ${money(d.billed)} a ${d.unit} on the bill, ${money(d.against)} agreed`;
  return `${d.item}: GST ${n(d.billed)}% on the bill, ${n(d.against)}% on the order`;
}

export interface DueGroup { key: string; supplierId: string | null; name: string; bills: SupplierDue[]; credits: SupplierDues["credits"] }
/** By supplier: its bills, and its credit notes not against one bill (the web's grouping). */
export function dueGroups(d: SupplierDues): DueGroup[] {
  const groups = new Map<string, DueGroup>();
  const group = (key: string, supplierId: string | null, name: string) => {
    let g = groups.get(key);
    if (!g) { g = { key, supplierId, name, bills: [], credits: [] }; groups.set(key, g); }
    return g;
  };
  for (const b of d.bills) group(b.supplierId ?? b.supplier.trim().toLowerCase(), b.supplierId, b.supplier).bills.push(b);
  for (const n of d.credits) group(n.supplierId, n.supplierId, n.supplier).credits.push(n);
  return [...groups.values()];
}

/** What is owed, from the Supplier dues report's own total rows (reports/builders/
    supplierDues.ts: "<supplier>, owed" and "Total owed"); the web adds them in the browser. */
export function duesTotals(doc: ReportDoc | null | undefined) {
  const rows = doc?.sections.find((s) => s.key === "owed")?.rows.filter((r) => r.kind === "total") ?? [];
  const of = new Map<string, number>();
  let total: number | null = null;
  for (const r of rows) {
    const label = typeof r.cells["supplier"] === "string" ? (r.cells["supplier"] as string) : "";
    const owed = num(r.cells["owed"]);
    if (owed === null) continue;
    if (label === "Total owed") total = owed;
    else if (label.endsWith(", owed")) of.set(label.slice(0, -", owed".length), owed);
  }
  return { total: doc ? total : null, of: (name: string) => of.get(name) ?? null };
}
export const duesHead = (total: number | null, bills: number) =>
  ({ owed: rupees(total), count: `${bills} bill${bills === 1 ? "" : "s"}` });

export const isOverdue = (b: SupplierDue, today: string) => b.dueOn < today;
export const billFrom = (b: SupplierDue) =>
  `${b.from.kind === "bar" ? "bar bill" : b.from.reference}${b.replaces ? ` · replaces ${b.replaces}` : ""}`;

export function paymentText(p: SupplierPayment) {
  return `Paid ${money(p.amount)} on ${dateDay(p.paidOn)} by ${PAY_METHODS.find((m) => m.value === p.method)?.label ?? p.method}`
    + (p.reference ? ` (${p.reference})` : "")
    + (p.tds ? ` · TDS ${p.tds.section} ${p.tds.rate}%: ${money(p.tds.amount)}` : "")
    + (p.handedOverBy ? ` · handed over by ${p.handedOverBy}` : "")
    + (p.differencesSeenBy ? ` · differences from the order seen by ${p.differencesSeenBy}` : "");
}
export const creditText = (n: SupplierCreditNote) => `Credit note ${n.noteNo} of ${dateDay(n.noteDate)}: ${money(n.amount)} - ${n.reason}`;

export interface PayForm {
  amount: string; method: PayMethod | ""; reference: string; paidOn: string; handedOverBy: string;
  withTds: boolean; section: TdsSection | ""; rate: string; tdsAmount: string; seen: boolean;
}
/** Pay a bill: the web's PayDialog checks, in its order and words; the amount as typed. */
export function payBody(b: SupplierDue, f: PayForm) {
  const differs = b.differences.length > 0;
  if (differs && !f.seen) return { problem: "Tick that you have seen how this bill differs from its order, then record the payment." };
  if (!(Number(f.amount) > 0)) return { problem: "Type the amount paid to the supplier: more than zero." };
  if (!f.method) return { problem: "How was it paid? Cash, cheque, bank or UPI." };
  if (f.method !== "cash" && !f.reference.trim()) return { problem: "Type the cheque, UTR or UPI reference." };
  if (!f.paidOn) return { problem: "Pick the date it was paid." };
  if (f.withTds && (!f.section || !(Number(f.rate) > 0) || !(Number(f.tdsAmount) > 0))) return { problem: "TDS is its section, rate and amount: all three." };
  return {
    body: {
      amount: Number(f.amount), method: f.method, reference: f.reference.trim() || null, paidOn: f.paidOn.trim(), handedOverBy: f.handedOverBy.trim(),
      tds: f.withTds ? { section: f.section as TdsSection, rate: Number(f.rate), amount: Number(f.tdsAmount) } : null,
      ...(differs ? { differencesSeen: f.seen } : {}),
    },
  };
}

/** A credit note: the web's CreditDialog checks. */
export function creditBody(target: { bill: SupplierDue | null; supplierId: string },
  f: { issuedBy: "supplier" | "hotel"; noteNo: string; noteDate: string; amount: string; reason: string }) {
  if (!f.noteNo.trim()) return { problem: "Type the credit note's number." };
  if (!(Number(f.amount) > 0)) return { problem: "Type the credit note's amount: more than zero." };
  if (!f.reason.trim()) return { problem: "Say what it is for: goods returned, a short supply, a price corrected." };
  return {
    body: {
      billId: target.bill?.id ?? null, supplierId: target.bill ? null : target.supplierId, issuedBy: f.issuedBy,
      noteNo: f.noteNo.trim(), noteDate: f.noteDate.trim(), amount: Number(f.amount), reason: f.reason.trim(),
    },
  };
}

export type Reversing = { kind: "bill" | "payment" | "credit-note"; id: string; what: string };
/** A reversal: the web's ReverseDialog checks; a wrong bill may name its right one. */
export function reverseBody(entry: Reversing, reason: string, right: { billNo: string; billDate: string; amount: string; dueOn: string }) {
  if (!reason.trim()) return { problem: "Say why it is reversed." };
  const correct = entry.kind === "bill" && right.billNo.trim()
    ? { billNo: right.billNo.trim(), billDate: right.billDate.trim(), amount: Number(right.amount), dueOn: right.dueOn.trim() }
    : null;
  if (correct && (!correct.billDate || !(correct.amount > 0) || !correct.dueOn)) {
    return { problem: "The right bill needs its number, date, amount and due date - or leave its number empty." };
  }
  return { body: { kind: entry.kind, id: entry.id, reason: reason.trim(), correct } };
}

/* ══════════════════════════════════════════════════════════════════
   THE EXPORTS the web offers on three of these lists (its ExportButtons:
   cash-deposits, company-accounts, form-iii; api/src/modules/reports/
   listExports.ts). The phone's print and share sheets (core Export.tsx),
   from the rows the screen shows; refused as the server refuses a file.
   ══════════════════════════════════════════════════════════════════ */

const DOWNLOADERS = ["owner", "admin", "gm", "hotel_manager", "revenue_manager", "finance"];
/** listExports.ts exportRefusal: a file of money, or of guests' details, is for those who download reports. */
export const whyNotExport = (role: string | null, holds: "money" | "guests") =>
  allow(DOWNLOADERS, role, `A file of ${holds === "money" ? "money" : "guests' details"} is for those who download reports: `
    + "the owner, an administrator, the general manager, the hotel manager, the revenue manager or the accountant. Ask one of them.");

/** listExports.ts maskId: a file never carries an ID number whole - its last four, the rest X. */
export function maskId(value: string | null): string {
  if (!value) return DASH;
  const v = value.replace(/\s+/g, "");
  return v.length <= 4 ? "X".repeat(v.length) : `${"X".repeat(v.length - 4)}${v.slice(-4)}`;
}

const text = (v: string | null | undefined) => (v === null || v === undefined || v === "" ? DASH : v);

/** CashDeposits.tsx DEPOSIT_EXPORT, newest first as listed. */
export const depositsTable = (d: CashDeposits, subtitle: string) => ({
  title: "Cash deposits", subtitle,
  columns: ["Day banked", "Amount", "Deposited on", "Bank", "Slip number", "Recorded by", "Recorded", "Verified by", "Verified", "Line", "Reason"],
  rows: d.deposits.map((x) => [dateDay(x.businessDate), rupees(x.amount), dateDay(x.depositedOn), text(x.bank), text(x.slipNo), text(x.recordedBy),
    text(x.recordedAt), text(x.verifiedBy), text(x.verifiedAt), x.reversesId ? "Reversal" : x.reversed ? "Reversed" : "Deposit", text(x.reason)]),
});

/** Billing.tsx LEDGER_EXPORT, with the period; the report's own Total row when it sent one. */
export const ledgerTable = (rows: LedgerRow[], owed: number | null, subtitle: string) => ({
  title: "Company accounts", subtitle,
  columns: ["Account", "Opening", "Sent to the account", "Received", "Balance"],
  rows: rows.map((r) => [r.account, rupees(r.opening), rupees(r.debit), rupees(r.credit), rupees(r.closing)]),
  ...(owed !== null ? { totals: ["Total", "", "", "", rupees(owed)] } : {}),
});

/** FormC.tsx FORM_III_EXPORT: the passport number masked to its last four. */
export const formCTable = (d: FormCRegister, subtitle: string) => ({
  title: "Form III", subtitle,
  columns: ["Guest", "Nationality", "Room", "Passport number", "Adults", "Recorded", "Children", "Arrived", "Arrival due by",
    "Arrival portal numbers", "Departed", "Departure due by", "Departure portal numbers", "Overdue"],
  rows: d.rows.map((r) => [r.guest, r.nationality, r.room, maskId(r.passport), String(r.adults), String(r.recorded), String(r.children),
    text(r.arrivedAt ?? r.arrived), text(r.dueBy), r.arrivalNumbers.join(", ") || DASH,
    r.status === "checked_out" ? text(r.departedAt ?? r.checkOut) : "In house", text(r.departureDueBy),
    r.departureNumbers.join(", ") || DASH, r.overdue || r.departureOverdue ? "Yes" : DASH]),
});
