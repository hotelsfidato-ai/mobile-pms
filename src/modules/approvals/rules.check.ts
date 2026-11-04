/* Run: node --experimental-strip-types mobile/src/modules/approvals/rules.check.ts
   Approvals' words and figures, against the web's Approvals.tsx and approvals.ts,
   and the decision's offline tier against the web's offline.ts. */
import { ruleFor } from "../../core/offline.ts";
import {
  amountText, askedBy, askedWhen, blockedLine, decidedLine, doneWord, emptyOf, labelFor, reasonLine,
  REFUSE_NEEDS_NOTE, statusTone, statusWord, whyNotDecide,
} from "./rules.ts";
import { instant } from "../../core/format.ts";

const eq = (got: unknown, want: unknown, what: string) => {
  if (JSON.stringify(got) !== JSON.stringify(want)) throw new Error(`${what}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
};

/* ── The amount is the server's, exactly (MEMORY 9, 11) ─────────────
   Data chosen where the web's whole-rupee money() would differ. */
eq(amountText("450.00"), "₹450", "whole rupees, as the picture");
eq(amountText("450.50"), "₹450.50", "paise kept: the web's money() says ₹451");
eq(amountText("0.20"), "₹0.20", "twenty paise is not ₹0");
eq(amountText("1234567.5"), "₹12,34,567.50", "Indian grouping, one place padded");
eq(amountText("99999999999.99"), "₹99,99,99,99,999.99", "the column's largest, no float");
eq(amountText("100000"), "₹1,00,000", "a lakh");
eq(amountText("672"), "₹672", "no decimals sent");
eq(amountText(null), null, "no amount: nothing drawn, never ₹0");
eq(amountText(undefined), null, "not sent at all");
eq(amountText("about 400"), "-", "unreadable: a dash, never a zero");
eq(amountText("-200.00"), "-₹200", "a negative keeps its sign");

/* ── Words ──────────────────────────────────────────────────────── */
eq(labelFor("cash_expense"), "Cash expense", "a known kind");
eq(labelFor("pos_request"), "Restaurant: sent to you", "a waiter's request");
eq(labelFor("room_upgrade"), "room upgrade", "an unknown kind still shows, in its own words");
eq([statusWord("pending"), statusWord("approved"), statusWord("rejected"), statusWord("clarify"), statusWord("odd")],
  ["Waiting", "Approved", "Refused", "Asked for more", "odd"], "the pill's words");
eq([statusTone("pending"), statusTone("clarify"), statusTone("approved"), statusTone("rejected")],
  ["warning", "warning", "success", "danger"], "asked for more is yellow, not red");

const detail = "NC, the bill free: ₹672.00 - Table 7 · bill 20261011-128";
eq(reasonLine({ detail, reason: `${detail}. Why: The owner's guests` }), "Why: The owner's guests", "the detail is not said twice");
eq(reasonLine({ detail: null, reason: "Fidato Restaurant tin: vegetables" }), "Fidato Restaurant tin: vegetables", "no detail: the reason whole");

eq(askedBy({ requestedBy: null }), "Asked by -", "a name not shown is a dash");
eq(askedBy({ requestedBy: "Test GM" }), "Asked by Test GM", "a name");

/* The server's time is Postgres's text: converted before Date (MEMORY 7). */
const sent = "2026-10-28 10:00:00.123456+05:30";
eq(instant(sent), "2026-10-28T10:00:00.123+05:30", "the text a phone's engine reads");
const now = Date.parse("2026-10-31T10:00:00+05:30");
/* As Hermes: node reads Postgres's text, a phone does not (NaN). */
const nodeParse = Date.parse;
Date.parse = (s: string) => (/^\d{4}-\d\d-\d\dT/.test(s) ? nodeParse(s) : NaN);
try {
  eq(askedWhen(sent, now), "3 days ago", "as the picture, read as a phone reads it");
  eq(askedWhen("nonsense", now), "-", "unreadable: a dash");
} finally {
  Date.parse = nodeParse;
}

/* ── Who decides: the server's answer, never the phone's ─────────── */
eq(blockedLine({ mayDecide: true, blockedBecause: undefined }), null, "the server says yes: the buttons");
eq(blockedLine({ mayDecide: false, blockedBecause: "You asked for this one, so you cannot be the person who approves it." }),
  "You asked for this one, so you cannot be the person who approves it.", "the server's sentence");
eq(blockedLine({ mayDecide: false }), "This one is not yours to decide.", "no sentence sent: the web's own");
/* A sentence sent with mayDecide true does not hide the buttons: mayDecide decides. */
eq(blockedLine({ mayDecide: true, blockedBecause: "Already approved." }), null, "mayDecide wins");

eq(whyNotDecide("rejected", "  "), REFUSE_NEEDS_NOTE, "a refusal needs a reason");
eq(whyNotDecide("rejected", "Too dear"), null, "a refusal with one");
eq(whyNotDecide("approved", ""), null, "approving needs none");
eq([doneWord("approved"), doneWord("rejected")], ["Approved.", "Refused, and they have been told why."], "the web's toasts");

eq(decidedLine({ status: "pending", decidedBy: null, decisionNote: null }), null, "waiting: no decided line");
eq(decidedLine({ status: "approved", decidedBy: "Test GM", decisionNote: null }), "Approved by Test GM", "approved");
eq(decidedLine({ status: "rejected", decidedBy: null, decisionNote: "Buy it cheaper" }), "Refused by - — Buy it cheaper", "refused, name not shown");
eq(decidedLine({ status: "clarify", decidedBy: "Test GM", decisionNote: "Which supplier?" }), "Asked for more by Test GM — Which supplier?", "sent back is not refused");

eq(emptyOf("pending").title, "Nothing is waiting on you", "empty, waiting");
eq(emptyOf("all").title, "Nothing has been asked for yet", "empty, everything");

/* ── Offline: a decision is refused, never held (the web's offline.ts) ── */
const offline = ruleFor("/api/hotels/5EL/approvals/0b6d/approved", "POST", "{}");
eq(offline.tier, "refuse", "a decision is not held");
eq(offline.reason, "This cannot be done offline yet. It has not been checked as safe to hold and send later, and guessing is how a guest gets charged twice.", "the web's sentence");
eq(ruleFor("/api/hotels/5EL/approvals/0b6d/rejected", "POST", '{"note":"x"}').tier, "refuse", "a refusal is not held either");

console.log("approvals rules: ok");
