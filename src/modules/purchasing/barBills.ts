/* ══════════════════════════════════════════════════════════════════
   THE BAR'S BILLS (the owner's D27-354; M-16 lane m16-pick-money, row 1.9)
   — the web's purchasing/components/BarBills.tsx and data/barBills.ts, the
   API's api/src/modules/purchasing/barBills.ts and purchasingGrants.ts.
   A bill that has come, recorded AS PRINTED: the supplier (picked from the
   hotel's list, D27-372), its number, date and T.P. number, each drink's
   MRP, cases and loose bottles, bottles to a case and rate per case, the
   handling, the TCS and the printed total, a photo of it; on credit, its
   due date (D27-370). The drinks go into the bar's store at once.

   MONEY: every figure on a recorded bill is the server's, to the paisa, a
   dash where it sent none. In the form, the one tally the phone makes is
   the web's own check of what the person TYPED ("The lines, handling and
   TCS make ₹X", lineAmount being the server's own formula, copied as the
   web copies it); what is sent is the figures as typed, and the server
   works the total out again and refuses a bill whose lines do not make it.
   A REPEAT: the server refuses a second bill with the same supplier and
   number ("Bill … from … is already recorded."), and a second upload of
   the same photo ("That photo is already on this bill.").
   Pure: barBills.check.ts runs it under node.
   ══════════════════════════════════════════════════════════════════ */

import { DASH } from "../../core/format.ts";
import { dateDay, rupees } from "../finance/bill.ts";
import { COMMA } from "../finance/desk.ts";

export { rupees };

/** purchasingGrants.ts BAR_RECORDERS: who records a bar bill and adds its photo. */
export const BAR_RECORDERS: readonly string[] = ["owner", "admin", "gm", "stores", "bar"];
/** purchasingGrants.ts PURCHASING_REFUSED.barBill, the server's words. */
export const BAR_BILL_REFUSED = "Recording a bar bill is for the owner, an administrator, the general manager, the Inventory "
  + "Manager or the bar manager.";
export const whyNotRecordBar = (role: string | null): string | null =>
  role !== null && BAR_RECORDERS.includes(role) ? null : BAR_BILL_REFUSED;

export interface BarDrink {
  id: string; name: string; unit: string;
  sizeMl: number | null; onHand: number | null;
  /** Bottles to a case, from its last bill; null before one. */
  perCase: number | null;
}
export interface BarDrinks {
  store: { id: string; name: string; isActive: boolean } | null;
  drinks: BarDrink[];
  suppliers: { id: string; name: string }[];
}
export interface BarBillLine {
  item: string; unit: string; sizeMl: number | null; mrp: number | null;
  perCase: number; cases: number; bottles: number; ratePerCase: number; amount: number;
}
export interface BarBill {
  id: string; supplier: string; billNo: string; billDate: string; tpNo: string | null;
  handling: number | null; tcs: number | null; total: number | null;
  recordedBy: string | null; recordedAt: string; photoId: string | null;
  credit: { dueOn: string; owed: string } | null;
  lines: BarBillLine[];
}

type LineFigures = { mrp: number | null; perCase: number; cases: number; bottles: number; ratePerCase: number };
export type NewBillLine =
  | ({ itemId: string } & LineFigures)
  | ({ newDrink: { name: string; unit: string; sizeMl: number | null } } & LineFigures);
export interface BarBillBody {
  supplierId: string; billNo: string; billDate: string; tpNo: string | null;
  handling: number | null; tcs: number | null; total: number; lines: NewBillLine[]; dueOn?: string;
}

/* ── A recorded bill, as the web shows it ── */

/** "2 cases + 3 loose". */
export const casesText = (l: { cases: number; bottles: number }) =>
  [l.cases ? `${l.cases} case${l.cases === 1 ? "" : "s"}` : "", l.bottles ? `${l.bottles} loose` : ""].filter(Boolean).join(" + ");

/** The web's bottlesAndMl (src/lib/format.ts) with no size: "26 bottles". */
export function bottlesOf(l: { cases: number; perCase: number; bottles: number; unit: string }): string {
  const n = Math.round((l.cases * l.perCase + l.bottles) * 1000) / 1000;
  return `${n} ${l.unit}${n === 1 || l.unit.endsWith("s") ? "" : "s"}`;
}

/** One line of a recorded bill: "2 cases + 3 loose (27 bottles) at ₹12,000.00 a case of 12 · ₹27,000.00". */
export const lineFigures = (l: BarBillLine) =>
  `${casesText(l)} (${bottlesOf(l)}) at ${rupees(l.ratePerCase)} a case of ${l.perCase} · ${rupees(l.amount)}`;

/** The bill's head line, as the web's: "18 Nov · T.P. 4411". */
export const billWhen = (b: BarBill) => `${dateDay(b.billDate)}${b.tpNo ? ` · T.P. ${b.tpNo}` : ""}`;

/** Handling and TCS, when either was printed. */
export const chargesLine = (b: BarBill): string | null =>
  b.handling === null && b.tcs === null ? null : `Handling ${rupees(b.handling)} · TCS ${rupees(b.tcs)}`;

/** On credit (D27-370): what is left on it (PUR-4), never a payment date. Null: paid on the day. */
export function creditWords(b: BarBill): string | null {
  if (!b.credit) return null;
  const owed = Number(b.credit.owed);
  const left = owed === 0 ? " - paid"
    : b.total !== null && Number.isFinite(owed) && owed < b.total ? ` - ${rupees(owed)} left to pay`
    : " - not paid yet";
  return `On credit, due ${dateDay(b.credit.dueOn)}${left}`;
}

/* ── The form (RecordDialog) ── */

export interface LineDraft {
  /** "" not picked; "new" another drink. */
  itemId: string;
  name: string; sizeMl: string; unit: string;
  perCase: string; cases: string; bottles: string; mrp: string; rate: string;
}
export const EMPTY_LINE: LineDraft = { itemId: "", name: "", sizeMl: "", unit: "bottle", perCase: "", cases: "", bottles: "", mrp: "", rate: "" };
export const UNITS = ["bottle", "can", "packet", "piece"];

const num = (v: string) => (v.trim() === "" ? null : Number(v));
/** A box with something in it that is not a number ("1250,50", "12 bottles"): Number() would make it
    NaN, sent as null and counted as 0 by the check (the money review of 20 Nov, m16). The sentence:
    the desk's COMMA for a comma, else the box named. Null: blank, or a number. */
export function notNumber(v: string, what: string): string | null {
  if (v.trim() === "" || Number.isFinite(Number(v))) return null;
  return v.includes(",") ? COMMA : `${what}: type it as a number.`;
}

/** A line's amount as the bill works it: the server's lineAmount, copied (as the web copies it). */
export const lineAmount = (l: { perCase: number; cases: number; bottles: number; ratePerCase: number }) =>
  Math.round(l.ratePerCase * (l.cases + l.bottles / l.perCase) * 100) / 100;

/** A typed line's figures, or null while one is missing or not a number (the web's figures()). */
export function figures(l: LineDraft) {
  const perCase = num(l.perCase), cases = num(l.cases) ?? 0, bottles = num(l.bottles) ?? 0, rate = num(l.rate);
  if (perCase === null || rate === null || [perCase, cases, bottles, rate].some((n) => !Number.isFinite(n))) return null;
  if (perCase < 1 || cases + bottles <= 0) return null;
  return { perCase, cases, bottles, ratePerCase: rate };
}

/** A typed line's amount, a dash while it cannot be worked out. */
export const draftAmount = (l: LineDraft): string => {
  const f = figures(l);
  return f ? rupees(lineAmount(f)) : DASH;
};

/** The web's check of the typed figures against the printed total: what the lines, handling and TCS
    make, and whether that matches the bill (within the server's ₹1 round-off). Never sent. */
export function billCheck(lines: LineDraft[], handling: string, tcs: string, printed: string) {
  /* A charge or the total that is not a number makes nothing: no figure, no match, never a 0 in its place. */
  if ([handling, tcs, printed].some((v) => notNumber(v, "") !== null)) return { made: DASH, words: null };
  const sum = lines.reduce((t, l) => { const f = figures(l); return t + (f ? lineAmount(f) : 0); }, 0);
  const made = Math.round((sum + (Number(handling) || 0) + (Number(tcs) || 0)) * 100) / 100;
  const off = printed.trim() === "" ? null : Math.round((made - Number(printed)) * 100) / 100;
  const words = off === null || !Number.isFinite(off) ? null
    : Math.abs(off) <= 1 ? { ok: true, text: "matches the bill" }
    : { ok: false, text: `${rupees(Math.abs(off))} ${off > 0 ? "more" : "less"} than the bill` };
  return { made: rupees(made), words };
}

export interface BillDraft {
  supplierId: string; billNo: string; billDate: string; tpNo: string;
  handling: string; tcs: string; printed: string; onCredit: boolean; dueOn: string;
}

/** The body the web sends (RecordDialog's submit), or its sentence why not - checked in the web's order. */
export function billBody(f: BillDraft, lines: LineDraft[]): { body: BarBillBody } | { problem: string } {
  const out: NewBillLine[] = [];
  for (const l of lines) {
    if (!l.itemId) return { problem: "Pick each drink, or choose Add another drink." };
    const n = out.length + 1;
    const wrong = notNumber(l.perCase, `Bottles a case, line ${n}`) ?? notNumber(l.cases, `Cases, line ${n}`)
      ?? notNumber(l.bottles, `Loose bottles, line ${n}`) ?? notNumber(l.mrp, `MRP, line ${n}`) ?? notNumber(l.rate, `Rate a case, line ${n}`)
      ?? (l.itemId === "new" ? notNumber(l.sizeMl, `Size, line ${n}`) : null);
    if (wrong) return { problem: wrong };
    const fig = figures(l);
    if (!fig) return { problem: "Type each line's bottles to a case, the cases or loose bottles, and the rate per case." };
    const common = { ...fig, mrp: num(l.mrp) };
    out.push(l.itemId === "new"
      ? { newDrink: { name: l.name.trim(), unit: l.unit, sizeMl: num(l.sizeMl) }, ...common }
      : { itemId: l.itemId, ...common });
  }
  if (!f.supplierId) return { problem: "Who is the bill from? Pick the supplier." };
  if (f.printed.trim() === "") return { problem: "Type the bill's total, as printed on it." };
  const charge = notNumber(f.handling, "Handling charges") ?? notNumber(f.tcs, "TCS") ?? notNumber(f.printed, "Total, as printed");
  if (charge) return { problem: charge };
  if (f.onCredit && !f.dueOn) return { problem: "Pick the date the bill is due." };
  return {
    body: {
      supplierId: f.supplierId, billNo: f.billNo, billDate: f.billDate, tpNo: f.tpNo.trim() || null,
      handling: num(f.handling), tcs: num(f.tcs), total: Number(f.printed), lines: out,
      ...(f.onCredit ? { dueOn: f.dueOn } : {}),
    },
  };
}

/** The web's toast once the bill is saved. */
export const recordedWords = (billNo: string) => `Bill ${billNo.trim()} recorded`;
