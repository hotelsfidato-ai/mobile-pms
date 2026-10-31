import { addDays } from "./desk.ts";
import { emailProblem, phoneProblem } from "./guestId.ts";

/* ══════════════════════════════════════════════════════════════════
   THE WALK-IN'S BOOKING RULES — the web's New booking page opened from an
   empty room (src/modules/reservations/pages/BookingPage.tsx, D27-163):
   that room, tonight, one night, the Walk-in source. One room at a time:
   "Another room" and the group that comes with it are New booking's own
   slice (10). The discount, the price line and the summary are the web's
   preview of what the bill will carry, from the server's tariff and tax
   rate, in whole paise as Postgres rounds; the server charges it.
   Pure: no React Native here, so `booking.check.ts` runs under node.
   ══════════════════════════════════════════════════════════════════ */

export const PLANS = [
  { value: "EP", label: "EP · Room only" }, { value: "CP", label: "CP · Room + breakfast" },
  { value: "MAP", label: "MAP · Room + breakfast + one meal" }, { value: "AP", label: "AP · Room + all meals" },
  { value: "AI", label: "AI · Everything charged to the room" },
];
export const TITLES = ["Mr", "Ms", "Mrs", "Dr"];
export const MARKET_SEGMENTS = ["Corporate", "Leisure", "Group", "Crew", "Government"];
/** Over this only through a named promotion (the owner's D27-36). */
export const FREEHAND_CAP = 10;
export const OTHER = "__other";

const B36 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
/** validate.ts gstinProblem: GSTN's shape and check digit. */
export function gstinProblem(gstin: string | null | undefined): string | null {
  if (!gstin?.trim()) return null;
  const g = gstin.trim().toUpperCase();
  if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z]$/.test(g)) {
    return "A GSTIN is 15 characters: 2 digits, the 10-character PAN, then 3 more, e.g. 27AAPFU0939F1ZV.";
  }
  let sum = 0;
  for (let i = 0; i < 14; i += 1) {
    const product = B36.indexOf(g[i]!) * (i % 2 === 0 ? 1 : 2);
    sum += Math.floor(product / 36) + (product % 36);
  }
  return B36[(36 - (sum % 36)) % 36] === g[14] ? null
    : "That GSTIN is not right - a character is mistyped. Check it against the company's GST certificate.";
}

/** contactKeys.ts phoneKey: a number under ten digits, or all one digit, matches nobody. */
export function phoneKey(phone: string): string | null {
  const d = phone.replace(/\D/g, "");
  const k = d.length === 12 && d.startsWith("91") ? d.slice(2) : d.length === 11 && d.startsWith("0") ? d.slice(1) : d;
  return k.length < 10 || /^(\d)\1*$/.test(k) ? null : k;
}
/** ReturningGuest.tsx: asked only once there is a number or an address worth asking about. */
export const worthAsking = (phone: string, email: string) => phoneKey(phone) !== null || /.+@.+\..+/.test(email.trim());

/* ── The price of the one line ─────────────────────────────────────── */
const paise = (rupees: number) => Math.round(rupees * 100);
const afterDiscount = (rate: number, pct: number) => Math.round(paise(rate) * (100 - pct) / 100) / 100;
export const taxOn = (nightly: number, pct: number) => Math.round(paise(nightly) * pct / 100) / 100;

export type DiscountMode = "none" | "hand" | "rupees" | "promotion";
export interface Promotion { id: string; name: string; percent: number | null; amount: number | null }
export interface Discount { mode: DiscountMode; text: string; reason: string; promotion: Promotion | null }

/** What the discount takes off a night, and what is wrong with it. */
export function discountIn(d: Discount) {
  const hand = Number(d.text);
  const pct = d.mode === "hand" && Number.isFinite(hand) && hand > 0 ? hand : d.mode === "promotion" && d.promotion ? d.promotion.percent ?? 0 : 0;
  const rupeesOff = d.mode === "rupees" && hand > 0 ? hand : d.mode === "promotion" && d.promotion ? d.promotion.amount ?? 0 : 0;
  const problem =
    d.mode === "rupees" && d.text.trim() !== ""
      ? !(hand > 0) ? "A discount in rupees is above ₹0." : !d.reason.trim() ? "Say why the discount is given." : null
      : d.mode === "hand" && d.text.trim() !== ""
        ? !(hand > 0) ? "A discount is a percentage above 0."
          : hand > FREEHAND_CAP ? `Over ${FREEHAND_CAP}% only through a named promotion.`
            : !d.reason.trim() ? "Say why the discount is given." : null
        : d.mode === "promotion" && !d.promotion ? "Choose the promotion." : null;
  return { pct, rupeesOff, problem, off: (rate: number) => Math.max(0, afterDiscount(rate, pct) - rupeesOff) };
}

export interface Tariff {
  nights: Array<{ night: string; total: number | null; unpriced: string | null }>;
  total: number | null;
  unpriced: string | null;
  /** Only the contract's read carries these. */
  contract?: { id: string; name: string } | null;
  note?: string | null;
}
export type Split = { ok: true; pre: number; rate: number; total: number } | { ok: false; reason: string };

export interface LineIn { rate: string; inclusive: boolean; comp: boolean }
/** No rate typed, and the contract has a figure for it (D27-233): before GST, no tick. */
export const byContract = (l: LineIn, t: Tariff | null | undefined) => l.rate.trim() === "" && !!t && !!t.contract && !t.note;
export const inclusive = (l: LineIn, t: Tariff | null | undefined) => l.inclusive && !byContract(l, t);
/** The figure the server splits (D27-195): the typed rate, or with none the list price (D27-199). */
export const allIn = (l: LineIn, t: Tariff | null | undefined) => (l.rate.trim() !== "" ? Number(l.rate) : t?.nights[0]?.total ?? null);

export interface Quote {
  nightly: number | null;
  unpriced: string | null;
  differs: boolean;
  contract?: string | null;
  note?: string | null;
}

/** The web's `priced`: what the line will cost a night. */
export function priceLine(l: LineIn, t: Tariff | null | undefined, split: Split | null | undefined, off: (rate: number) => number): Quote {
  if (l.comp) return { nightly: 0, unpriced: null, differs: false };
  if (l.rate.trim() !== "") {
    const typed = !l.inclusive || !(Number(l.rate) > 0) ? Number(l.rate) : split?.ok ? split.pre : null;
    if (typed === null) return { nightly: null, unpriced: null, differs: false };
    return { nightly: typed > 0 ? off(typed) : typed, unpriced: null, differs: false };
  }
  if (!t) return { nightly: null, unpriced: null, differs: false };
  const terms = t.contract !== undefined ? { contract: t.contract?.name ?? null, note: t.note ?? null } : {};
  const first = t.nights[0]?.total ?? null;
  if (first === null) return { nightly: null, unpriced: t.nights[0]?.unpriced ?? t.unpriced ?? "this party", differs: false, ...terms };
  if (inclusive(l, t) && !split?.ok) return { nightly: null, unpriced: null, differs: false };
  return { nightly: off(inclusive(l, t) && split?.ok ? split.pre : first), unpriced: null, differs: t.nights.some((n) => n.total !== first), ...terms };
}

/** The Summary: refuses a total it cannot stand behind (a dash). */
export function summary(q: Quote, taxRate: number | null | undefined, nights: number, dayUse: boolean, advance: number | null) {
  const units = dayUse ? 1 : nights;
  const rate = q.nightly === 0 ? 0 : taxRate;
  const taxPerNight = q.nightly === null || rate === null || rate === undefined ? null : taxOn(q.nightly, rate);
  const charges = q.nightly === null ? null : paise(q.nightly) * units / 100;
  const tax = taxPerNight === null ? null : paise(taxPerNight) * units / 100;
  const bill = charges !== null && tax !== null ? charges + tax : null;
  const due = bill === null ? null : Math.round((bill - (advance ?? 0)) * 100) / 100;
  return { rate, taxPerNight, charges, tax, due, noRule: q.nightly !== null && taxPerNight === null && rate === null };
}

/* ── Why a button is grey (RULE 6) ─────────────────────────────────── */
export interface Reasons {
  name: string; phone: string; email: string; gstin: string; showCompany: boolean; sourceId: string;
  dayUse: boolean; comp: boolean; rate: string; discountProblem: string | null; billTo: "guest" | "company"; companyId: string;
  salesPick: string; salesOther: string; inclusiveRefused: string | null; advanceProblem: string | null;
  /** The hotel's required fields (192): key to [its words, what was typed]. */
  required: string[]; fields: Record<string, [string, string]>;
}

/** The web's `saveReason`, in its order. */
export function saveReason(r: Reasons): string | null {
  if (!r.name.trim()) return "Type the guest's name.";
  const missing = r.required.find((k) => !r.fields[k]?.[1]?.trim());
  return (missing ? `${r.fields[missing]![0]} is needed for a booking at this hotel.` : null)
    ?? phoneProblem(r.phone) ?? emailProblem(r.email) ?? (r.showCompany ? gstinProblem(r.gstin) : null)
    ?? (!r.sourceId ? "Choose the booking source." : null)
    ?? (r.dayUse && !r.comp && !(Number(r.rate) > 0) ? "Type the day-use price." : null)
    ?? r.discountProblem
    ?? (r.showCompany && r.billTo === "company" && !r.companyId ? "Choose the company." : null)
    ?? (r.salesPick === OTHER && !r.salesOther.trim() ? "Type the sales person's name." : null)
    ?? r.inclusiveRefused ?? r.advanceProblem;
}

export const assignReason = (waiting: boolean, room: string) =>
  (waiting ? "A booking waiting for the hotel gets its room once it is confirmed." : !room ? "Pick a room." : null);

/** The web's `checkInReason`, for the one room. */
export function checkInReason(a: {
  waiting: boolean; arrivesToday: boolean; room: string; roomsFailed: boolean;
  picked: { number: string; allowed: boolean; reason?: string | undefined } | undefined; idBlocked: string | null; early: boolean; earlyReason: string;
}): string | null {
  if (a.waiting) return "A booking waiting for the hotel is checked in once it is confirmed.";
  if (!a.arrivesToday) return "Check in now is for an arrival today.";
  if (!a.room) return "Pick a room.";
  if (a.roomsFailed) return "The rooms could not be read. Try again.";
  if (!a.picked) return "Checking the room…";
  if (!a.picked.allowed) return `Room ${a.picked.number}: ${a.picked.reason}`;
  return a.idBlocked ?? (a.early && !a.earlyReason.trim() ? "Say why the room is given early." : null);
}

/** Tonight, one night (a walk-in's dates): `to` never before `from`. */
export const firstDeparture = (from: string) => addDays(from, 1);
