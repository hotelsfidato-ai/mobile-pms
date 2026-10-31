/* ══════════════════════════════════════════════════════════════════
   A STAY'S BILL ON A PHONE — the pure rules, ported from the web's
   src/modules/finance (flows/FolioPanel.tsx, sections.ts, data/*.ts) and
   src/lib/rules.ts. Pure: no React Native, so bill.check.ts runs under node.

   THE PHONE ADDS NOTHING UP. Every amount, tax and balance shown is one the
   server sent: a line's own amount (GET /stays/:id/postings), a bill's
   balance (/folio, /folios), the bill's totals (/bill: app.stay_bill), the
   bills ready to invoice (/billable). Where the web adds lines itself (a
   section's subtotal, "Everything", charges to come, Settle's Remaining)
   the phone shows the server's own figure instead, or none (MODULE.md).
   Here a line is only PLACED, never summed.
   ══════════════════════════════════════════════════════════════════ */

export const DASH = "-";

/** ₹1,20,000.00 - the web's moneyPrecise, for anything a person is handed. */
const inrPrecise = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
export const rupees = (n: number | null | undefined) => (n == null ? DASH : inrPrecise.format(n));
/** ₹1,20,000 - the web's money(), where it prints one (a refusal, a tile). */
export const rupeesRound = (n: number | null | undefined) => (n == null ? DASH : inr.format(n));

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** "25 Aug 2026" - the web's dateShort (src/lib/format.ts, "d MMM yyyy"). */
export const dateDay = (iso: string | null | undefined) =>
  !iso ? DASH : `${Number(iso.slice(8, 10))} ${MONTHS[Number(iso.slice(5, 7)) - 1]} ${iso.slice(0, 4)}`;

/* ── The shapes the API answers (the web's data files, cut to what is read) ── */

/** GET /stays/:id/postings: data/postings.ts BillLine = the core Posting + D27-157/200/223. */
export interface BillLine {
  id: string;
  folioId: string;
  billTo: string;
  company: string | null;
  businessDate: string;
  category: string;
  description: string;
  /** Before tax; a payment is negative. */
  amount: number;
  tax: number;
  kind: "charge" | "payment" | "reversal";
  reversalOf?: string;
  reversed: boolean;
  /** Who posted it, by name; null where nobody was recorded. */
  user: string | null;
  dayClosed?: boolean;
  /** The tax invoice standing on its bill. */
  invoice?: string | null;
  scheme?: "gst" | "vat" | string;
  rate?: number | null;
  source?: string | null;
}

/** GET /stays/:id/folios: data/folios.ts StayFolio. */
export interface StayFolio {
  id: string;
  billTo: string;
  companyId: string | null;
  company: string | null;
  status: string;
  balance: number;
  lines: number;
}

/** GET /stays/:id/folio (folios.ts toFolio); 404 `noBill` is no bill (FIN-2). */
export interface Folio { stayId: string; tax: number; payments: number; balance: number; status: string }

/** GET /stays/:id/bill: app.stay_bill (data/bill.ts StayBill). */
export interface StayBill {
  hotel: { name: string; address: string | null; city: string | null; state: string | null; phone: string | null; gstin: string | null };
  stay: { reference: string; guest: string; checkIn: string; checkOut: string; room: string | null };
  lines: Array<{ date: string; description: string; category: string; amount: number; tax: number; rate: number | null; scheme?: string; source?: string | null }>;
  taxes: Array<{ rate: number; taxable: number; cgst: number; sgst: number }>;
  vat?: Array<{ rate: number; taxable: number; vat: number }>;
  net: number;
  tax: number;
  total: number;
  paid: number;
  balance: number;
  tonight?: { description: string; amount: number; tax: number; rate: number };
  nightsToCome?: number;
}

/** GET /billable: data/billing.ts BillableRow, cut. */
export interface Billable {
  folioId: string;
  stayId: string;
  guest: string;
  roomNumber: string;
  reference: string;
  billTo: string;
  balance: number;
  status: "settled" | "outstanding" | "overpaid";
  invoice: string | null;
}

/** The hotel's ways of paying, from GET /api/hotels's deskRules (src/lib/api.ts DeskRules). */
export interface DeskRules { defaultPaymentMethod?: string; paymentMethods?: Array<{ label: string; kind: string }> }

/* ── The bill in sections (sections.ts, the owner's D27-200) ── */

export type SectionKey = "room" | "restaurant" | "bar" | "other";
const ROOM_FEES = new Set(["early_checkin", "late_checkout"]);

/** Where a line sits, by what it was billed under - never its words. */
export function sectionOf(l: { category: string; scheme?: string | null; source?: string | null }): SectionKey {
  if (l.scheme === "vat") return "bar";
  if (l.category === "room" || ROOM_FEES.has(l.source ?? "")) return "room";
  if (l.category === "food" || l.category === "beverage") return "restaurant";
  return "other";
}

/** A reversal right under the line it reverses (FolioPanel's LedgerList). */
export function inOrder<T extends { id: string; reversalOf?: string }>(lines: T[]): T[] {
  const ids = new Set(lines.map((l) => l.id));
  return [
    ...lines.filter((l) => !l.reversalOf).flatMap((l) => [l, ...lines.filter((r) => r.reversalOf === l.id)]),
    ...lines.filter((r) => r.reversalOf && !ids.has(r.reversalOf)),
  ];
}

/** The charges in the owner's order, each section its lines; the payments
    apart. A section is not added up here: the bill's totals are the server's. */
export function inSections<T extends BillLine>(lines: T[], keep: SectionKey[] = []) {
  const ordered = inOrder(lines);
  const charges = ordered.filter((l) => l.category !== "payment");
  const sections = (["room", "restaurant", "bar", "other"] as SectionKey[]).flatMap((key) => {
    const own = charges.filter((l) => sectionOf(l) === key);
    if (own.length === 0 && !keep.includes(key)) return [];
    const title = key === "room" ? "Room" : key === "restaurant" ? "Restaurant" : key === "bar" ? "Bar"
      : own.some((l) => l.category === "discount" || l.category === "tax") ? "Other charges and adjustments" : "Other charges";
    return [{ key, title, lines: own }];
  });
  return { sections, payments: ordered.filter((l) => l.category === "payment") };
}

/* ── The headline and the bill's main action (FolioPanel BalanceHeader, rules.ts canCheckOut) ── */

export type Tone = "danger" | "info" | "success" | "neutral";

/** The balance's word and colour; null is no bill yet (D17-16), a dash. */
export function headline(balance: number | null): { label: string; pill: string; tone: Tone } {
  if (balance === null) return { label: "Balance", pill: "No bill yet", tone: "neutral" };
  if (balance > 0) return { label: "Balance", pill: "Outstanding", tone: "danger" };
  if (balance < 0) return { label: "Balance", pill: "Overpaid", tone: "info" };
  return { label: "Balance", pill: "Settled", tone: "success" };
}

/** The bill's closing row: the server's balance and its word. */
export const closingWord = (balance: number | null) =>
  balance === null ? "Balance" : balance > 0 ? "Outstanding" : balance < 0 ? "Overpaid" : "Settled";

/** canCheckOut (src/lib/rules.ts): the departure turns on the balance on
    screen. No bill owes nothing (D17-16), as the web reads it. */
export function whyNotLeave(status: string, balance: number | null): string | null {
  if (status === "checked-out") return "Already checked out.";
  if (status !== "in-house" && status !== "due-out") return "This guest is not in house.";
  const b = balance ?? 0;
  if (b > 0) return `${rupeesRound(b)} is still owed on this bill.`;
  if (b < 0) return "This bill is overpaid. Refund the difference first.";
  return null;
}

/** Settle is the main action while money is owed (FolioPanel 179). */
export const settleIsMain = (status: string, balance: number | null) => (balance ?? 0) > 0 && status !== "due-in";

/** Form III: a guest from abroad says where they go next (D27-25). */
export const isForeign = (nationality: string | null | undefined) => (nationality ?? "IN").toUpperCase() !== "IN";

/* ── A line's own acts (FolioPanel EditButton, ReverseButton, TransferButton) ── */

/** A charge with something to edit: the pencil is not drawn otherwise (the web). */
export const editable = (l: BillLine) =>
  l.kind === "charge" && !l.reversed && l.amount > 0 && !["discount", "refund", "tax"].includes(l.category);

/** Why Edit would be refused before anybody types (D27-157), the server's words. */
export function whyNotEditLine(l: BillLine): string | null {
  if (l.dayClosed) return "This day is closed - correct it on Closed days.";
  if (l.invoice) return `This bill has tax invoice ${l.invoice}. Only a credit note corrects it now.`;
  return null;
}

/** Why the server would refuse this reversal (reverseFolioCharge's own order). */
export function whyNotReverseLine(l: BillLine): string | null {
  if (l.reversed) return "That posting has already been reversed.";
  if (l.kind === "reversal") return "A reversal cannot itself be reversed.";
  if (l.dayClosed) {
    return ["payment", "refund", "discount", "tax"].includes(l.category)
      ? "This day is closed. Its payments, refunds and discounts are not changed - put the difference right today."
      : "This day is closed - correct it on Closed days.";
  }
  if (l.invoice && !["payment", "refund"].includes(l.category)) {
    return `This bill has tax invoice ${l.invoice}. Only a credit note corrects it now.`;
  }
  return null;
}

/** The other open bills a charge may move to; none, no button (the web). */
export const moveTargets = (l: BillLine, folios: StayFolio[]) =>
  l.reversed || l.kind !== "charge" ? [] : folios.filter((f) => f.id !== l.folioId && f.status === "open");

/** A bill's name at the desk: its company, or "Guest". */
export const billName = (f: { billTo: string; company: string | null } | undefined) =>
  !f ? DASH : f.billTo === "company" ? f.company ?? "Company" : "Guest";

/* ── Taking money (FolioPanel SettleDialog, rules.ts payingWays, cashLimit.ts) ── */

/** The five every hotel started with (191's seed), for an older server. */
const STARTING_WAYS = [
  { label: "Cash", kind: "cash" }, { label: "UPI", kind: "upi" }, { label: "Credit Card", kind: "card" },
  { label: "Debit Card", kind: "card" }, { label: "Bill to company", kind: "city_ledger" },
];
export const payingWays = (desk?: DeskRules) => desk?.paymentMethods ?? STARTING_WAYS;
export const firstWay = (desk?: DeskRules) => desk?.defaultPaymentMethod ?? "Cash";

/** A typed amount, the web's `Number(amount) || 0`. */
export const typed = (text: string) => Number(text) || 0;

/** Rule 159 (D25-40): more than ₹1,00,000 in cash at once asks the PAN or
    Form 97. Asked by the method's kind - the server's own test (panFor). */
export const PAN_ABOVE = 100_000;
export const asksPan = (kind: string | undefined, amount: number) => kind === "cash" && amount > PAN_ABOVE;
export const PAN_SHAPE = /^[A-Z]{5}[0-9]{4}[A-Z]$/;

/** A refused payment named what would satisfy it (`needs`), which the core's
    ApiError does not carry yet: the server's own sentences, recognised. */
export const asksCredit = (said: string) => /more than the bill; it will be held as the (guest|host)'s credit\.$/.test(said);
export const overLimit = (said: string) => / is over its credit limit by ₹[\d,]+(\.\d+)?\./.test(said);
export const asksLateReason = (said: string) => /A late departure needs a reason and somebody to allow it/.test(said);
/** LateCheckOutFlow: the late charge posted, the balance then refused. */
export const stillOutstanding = (said: string) => /still outstanding/i.test(said);

/** "2.5" for 5: half a GST rate, the printed bill's label (BillPrint). */
export const half = (rate: number) => String(Math.round((rate / 2) * 100) / 100);

/* ── Add charge (FolioPanel AddChargeDialog, rules.ts CHARGE_CATEGORIES) ── */

export const CHARGE_CATEGORIES = [
  "Room posting", "Food", "Beverages", "Late check-out fee", "Early check-in fee", "Extra person fee", "Laundry", "Miscellaneous",
] as const;
/** An extra charge's bill column (065) as Add charge names it. */
export const FROM_LIST: Record<string, (typeof CHARGE_CATEGORIES)[number]> = {
  food: "Food", beverage: "Beverages", laundry: "Laundry", room: "Room posting",
  misc: "Miscellaneous", spa: "Miscellaneous", minibar: "Miscellaneous", telephone: "Miscellaneous",
};
