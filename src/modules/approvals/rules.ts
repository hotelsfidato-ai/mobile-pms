/* ══════════════════════════════════════════════════════════════════
   APPROVALS' WORDS AND RULES — ported from the web, each with its source;
   nothing here is the phone's own unless it says so.
     src/data/repositories/approvals.ts   Approval, KINDS, labelFor
     src/pages/Approvals.tsx              Row, Decide (the words, the tones)
     api/src/routes/approvals.ts          the answer's shape; mayDecide and
                                          blockedBecause are the SERVER's
   THE PHONE DECIDES NOTHING HERE: who may decide a row is the server's
   `mayDecide` / `blockedBecause`, the amount is the server's string.
   Pure: no React Native here, so `rules.check.ts` runs under node.
   ══════════════════════════════════════════════════════════════════ */

import { DASH, instant } from "../../core/format.ts";
import { relative } from "../../core/menu.ts";

/** One request in the queue (approvals.ts Approval, cut to what the phone reads). */
export interface Approval {
  id: string;
  kind: string;
  subject: { table: string; id: string };
  reason: string;
  /** What a waiter's request is, in a line (D27-363); null on any other kind. */
  detail?: string | null;
  /** numeric(12,2) as the database's text; null is a real answer (a stock
      adjustment has no amount), never a zero. */
  amount: string | null;
  status: string;
  approverRole: string;
  requestedBy: string | null;
  /** Postgres's own text ("2026-10-31 07:35:58.215147+05:30"): read through instant(). */
  requestedAt: string;
  decidedBy: string | null;
  decidedAt: string | null;
  decisionNote: string | null;
  /** The server's own answer, not the phone's guess. */
  mayDecide: boolean;
  blockedBecause?: string;
}

export interface ApprovalsAnswer {
  me: { staffId: string; role: string | null };
  rows: Approval[];
}

export type Tab = "pending" | "all";

/* approvals.ts KINDS: what each kind is called. A kind with no entry still
   SHOWS, with its own word: a service adding a new kind must never make a
   waiting request invisible. The web's links (`where`) open screens the
   phone does not have (purchasing, the store, equipment), so the phone
   names the kind without a link (MODULE.md, differences). */
const KINDS: Record<string, string> = {
  purchase: "Purchase request",
  cash_expense: "Cash expense",
  stock_adjustment: "Stock adjustment",
  equipment_issue: "Equipment leaving the store",
  equipment_retire: "Equipment being retired",
  pos_request: "Restaurant: sent to you",
};

export const labelFor = (kind: string): string => KINDS[kind] ?? kind.replace(/_/g, " ");

/** Approvals.tsx StatusPill: in words (D27-82; "Asked for more", 28 Sep). */
export const statusWord = (status: string): string =>
  status === "pending" ? "Waiting"
    : status === "approved" ? "Approved"
    : status === "rejected" ? "Refused"
    : status === "clarify" ? "Asked for more"
    : status;

/** "Asked for more" waits on the requester, so it is yellow like Waiting, not red like Refused. */
export const statusTone = (status: string): "warning" | "success" | "danger" =>
  status === "pending" || status === "clarify" ? "warning" : status === "approved" ? "success" : "danger";

/** The line under the detail: the reason without the detail repeated (Approvals.tsx Row). */
export const reasonLine = (a: Pick<Approval, "detail" | "reason">): string =>
  a.detail ? a.reason.replace(`${a.detail}. `, "") : a.reason;

/* ── The amount: the server's figure, exactly ──────────────────────
   The web prints money(Number(a.amount)), whole rupees: ₹450.50 would read
   "₹451" to the person approving it (MEMORY 9, MFIN-4). The phone writes the
   server's text with Indian grouping and keeps its paise when there are
   any; "450.00" is "₹450", as the picture. No arithmetic on the figure: the
   digits are regrouped, never rounded through a float. */
const groupIndian = (whole: string): string => {
  if (whole.length <= 3) return whole;
  const last = whole.slice(-3);
  const rest = whole.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ",");
  return `${rest},${last}`;
};

/** null: there is no amount (the web draws none); a dash: one was sent that cannot be read. */
export function amountText(amount: string | null | undefined): string | null {
  if (amount == null) return null;
  const m = /^(-?)(\d+)(?:\.(\d{1,2}))?$/.exec(amount.trim());
  if (!m) return DASH;
  const [, sign, digits, fraction] = m;
  const whole = groupIndian(digits!.replace(/^0+(?=\d)/, ""));
  const paise = (fraction ?? "").padEnd(2, "0");
  return `${sign}₹${whole}${paise === "00" ? "" : `.${paise}`}`;
}

/** "3 days ago" (the web's relative), the server's text read as a phone's engine reads it (MEMORY 7). */
export const askedWhen = (requestedAt: string, now = Date.now()): string => relative(instant(requestedAt), now);

/** "Asked by Test GM"; a name the server does not let this person see is a dash. */
export const askedBy = (a: Pick<Approval, "requestedBy">): string => `Asked by ${a.requestedBy ?? DASH}`;

/** A decided row: who decided, and their note (Approvals.tsx Row). The web
    says "Refused by" for a row sent back for more; the phone says what it is
    ("Asked for more by"), the pill's own words (MODULE.md, a question). */
export function decidedLine(a: Pick<Approval, "status" | "decidedBy" | "decisionNote">): string | null {
  if (a.status === "pending") return null;
  const word = a.status === "approved" ? "Approved" : a.status === "clarify" ? "Asked for more" : "Refused";
  return `${word} by ${a.decidedBy ?? DASH}${a.decisionNote ? ` — ${a.decisionNote}` : ""}`;
}

/** Why the buttons are not offered: the server's sentence (Approvals.tsx Decide). */
export const blockedLine = (a: Pick<Approval, "mayDecide" | "blockedBecause">): string | null =>
  a.mayDecide ? null : a.blockedBecause ?? "This one is not yours to decide.";

/** Approvals.tsx Decide: a refusal needs a reason, approving does not. The
    server says it too ("Say why this is refused…"); this is the web's own
    sentence, said before anything is sent. */
export const REFUSE_NEEDS_NOTE = "Say why it is refused, so the person who asked knows what to do next.";
export const whyNotDecide = (decision: "approved" | "rejected", note: string): string | null =>
  decision === "rejected" && !note.trim() ? REFUSE_NEEDS_NOTE : null;

/** What the web's toast says once the server has said yes. */
export const doneWord = (decision: "approved" | "rejected") =>
  decision === "approved" ? "Approved." : "Refused, and they have been told why.";

/** Approvals.tsx EmptyState: a different line for each tab. */
export const emptyOf = (tab: Tab) => tab === "pending"
  ? {
    title: "Nothing is waiting on you",
    description: "When somebody raises a purchase request, asks to take equipment out of the store, or pays a cash expense from a drawer or the restaurant tin, it appears here.",
  }
  : { title: "Nothing has been asked for yet", description: "Decided requests stay here so you can see what was approved and by whom." };
