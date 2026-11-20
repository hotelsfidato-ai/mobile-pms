import type { ExportTable } from "../../core/exportDoc.ts";
import { DASH } from "../../core/format.ts";
import { gstinProblem } from "../front-desk/booking.ts";
import { addDays, moneyPrecise } from "../front-desk/desk.ts";
import { dateProblem, emailProblem, phoneProblem } from "../front-desk/guestId.ts";
import { rupees } from "../marketing/rules.ts";
import { day } from "../reputation/rules.ts";

/* ══════════════════════════════════════════════════════════════════
   CONTRACTS — the shapes, the rules and the words (mobile/m13-sales,
   19 Nov). Ported from the web's src/modules/contracts/ (data/contracts.ts;
   pages/Contracts.tsx, CompanyContracts.tsx; components/CompanyDialog.tsx,
   ContractDialog.tsx, AllotmentDialog.tsx); the server is
   api/src/modules/contracts/contracts.ts and allotments.ts, which ask
   every rule again (and the database under them, migration 177).

   A COMPANY'S CONTRACT PRICES ARE MONEY: each is sent as it was typed
   (Number of the typed text, nothing filled in), a blank is "not agreed"
   (null: the booking takes the day's price, C-4), never a default and
   never a zero; on screen a price is written with its paise (MEMORY 9).
   The phone works out no price: what a party pays under a contract is the
   server's (GET /contract-price), not this screen's.
   ══════════════════════════════════════════════════════════════════ */

export type CompanyKind = "corporate" | "travel_agent";
export const KIND_LABEL: Record<CompanyKind, string> = { corporate: "Corporate", travel_agent: "Travel agent" };
export const KINDS = Object.keys(KIND_LABEL) as CompanyKind[];

export interface Company {
  id: string;
  name: string;
  kind: CompanyKind;
  gstin: string | null;
  contactName: string | null;
  phone: string | null;
  email: string | null;
  addressLine: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  creditAllowed: boolean;
  /** Not set is null: a dash, never 0. */
  creditDays: number | null;
  creditLimit: number | null;
}
export interface CompanyRow extends Company { contractName: string | null; contractTo: string | null }
export type CompanyInput = Omit<Company, "id">;

export interface ContractRate { roomTypeId: string; mealPlan: string; single: number | null; double: number | null }
export interface Contract {
  id: string; name: string; validFrom: string; validTo: string; pricing: "rates" | "discount";
  discountPercent: number | null; commissionPct: number | null; notes: string | null; rates: ContractRate[];
}
export type ContractInput = Omit<Contract, "id">;

export interface AllotmentNight {
  night: string; picked: number; held: number; released: boolean; releasedRooms: number | null; releasedOn: string | null;
}
export interface Allotment {
  id: string; contractId: string; contractName: string; companyId: string; companyName: string; companyKind: CompanyKind;
  roomTypeId: string; roomType: string; firstNight: string; lastNight: string; rooms: number; releaseDays: number;
  notes: string | null; rates: { mealPlan: string; single: number | null; double: number | null }[];
  discountPercent: number | null; nights: AllotmentNight[];
}
export interface AllotmentInput {
  contractId?: string; roomTypeId?: string; firstNight: string; lastNight: string; rooms: number; releaseDays: number; notes: string | null;
}

export interface CompanyContracts {
  company: Company;
  allotments: Allotment[];
  contracts: Contract[];
  roomTypes: { id: string; name: string }[];
  mealPlans: { code: string; includes: string }[];
  /** The property's business date. */
  today: string;
}

/* ── Reading a company ───────────────────────────────────────────── */

/** Contracts.tsx creditLine: "Allowed · 30 days · ₹5,00,000"; a figure not set is a dash. */
export const creditLine = (c: Pick<Company, "creditAllowed" | "creditDays" | "creditLimit">) =>
  c.creditAllowed
    ? `Allowed · ${c.creditDays === null ? DASH : `${c.creditDays} days`} · ${c.creditLimit === null ? DASH : rupees(c.creditLimit)}`
    : "No";

/** "Acme 2026-27 to 31 Mar 2027", or a dash where none is in force today. */
export const contractHere = (r: Pick<CompanyRow, "contractName" | "contractTo">) =>
  r.contractName ? `${r.contractName} to ${day(r.contractTo)}` : DASH;

export const addressWords = (c: Pick<Company, "addressLine" | "city" | "state" | "pincode">) =>
  [c.addressLine, c.city, c.state, c.pincode].filter(Boolean).join(", ") || DASH;
export const contactWords = (c: Pick<Company, "contactName" | "phone" | "email">) =>
  [c.contactName, c.phone, c.email].filter(Boolean).join(" · ") || DASH;

/* ── Reading a contract ──────────────────────────────────────────── */

export const inForce = (k: Pick<Contract, "validFrom" | "validTo">, today: string) => today >= k.validFrom && today <= k.validTo;
export const validWords = (k: Pick<Contract, "validFrom" | "validTo">) => `${day(k.validFrom)} to ${day(k.validTo)}`;
/** A contract price as typed, paise kept; not agreed is a dash. */
export const priceWords = (n: number | null) => (n === null ? DASH : moneyPrecise(n));
export const discountWords = (k: Pick<Contract, "discountPercent">) => `${k.discountPercent ?? DASH}% off the day's rate`;
export const commissionWords = (k: Pick<Contract, "commissionPct">) => `Commission ${k.commissionPct === null ? DASH : `${k.commissionPct}%`}`;
export const typeName = (d: Pick<CompanyContracts, "roomTypes">, id: string) => d.roomTypes.find((t) => t.id === id)?.name ?? DASH;

/* ── Reading an allotment (CompanyContracts.tsx Allotments) ──────── */

/** The nights still to come that are not released: what can be booked from. */
export const nightsAhead = (a: Pick<Allotment, "nights">, today: string) => a.nights.filter((n) => !n.released && n.night >= today);
/** The fewest rooms still held on a night to come, or null when none is. */
export function leftIn(a: Pick<Allotment, "nights">, today: string): number | null {
  const ahead = nightsAhead(a, today);
  return ahead.length ? Math.min(...ahead.map((n) => n.held)) : null;
}
export const allotmentHead = (a: Pick<Allotment, "roomType" | "rooms">) => `${a.roomType} · ${a.rooms} ${a.rooms === 1 ? "room" : "rooms"} a night`;
export const allotmentNights = (a: Pick<Allotment, "firstNight" | "lastNight">) => `${day(a.firstNight)} to ${day(a.lastNight)}`;
export function releaseLine(a: Pick<Allotment, "releaseDays" | "nights">, today: string): string {
  const next = nightsAhead(a, today)[0];
  return `Released ${a.releaseDays} ${a.releaseDays === 1 ? "day" : "days"} before each night`
    + (next ? ` · next on ${day(addDays(next.night, -a.releaseDays))}` : "");
}
/** "Booked from it 2 · Still held 3 (the fewest on a night) · Back on sale 4 over 2 nights": the server's
    counts per night, read as the web reads them (the most picked on a night; the rooms released). */
export function heldLine(a: Pick<Allotment, "nights">, today: string): string {
  const left = leftIn(a, today);
  const booked = Math.max(0, ...a.nights.map((n) => n.picked));
  const released = a.nights.filter((n) => n.released);
  const back = released.reduce((s, n) => s + (n.releasedRooms ?? 0), 0);
  return `Booked from it ${booked} · Still held ${left === null ? DASH : left}${left !== null ? " (the fewest on a night)" : ""}`
    + ` · Back on sale ${back}${released.length > 0 ? ` over ${released.length} ${released.length === 1 ? "night" : "nights"}` : ""}`;
}
export function allotmentRate(a: Pick<Allotment, "rates">, k: Pick<Contract, "pricing" | "discountPercent">): string {
  if (k.pricing === "discount") return discountWords(k);
  if (a.rates.length === 0) return DASH;
  return a.rates.map((r) => `${r.mealPlan} ${priceWords(r.single)} / ${priceWords(r.double)}`).join(" · ");
}

/* ── The company form (CompanyDialog.tsx) ────────────────────────── */

type Text = "name" | "gstin" | "contactName" | "phone" | "email" | "addressLine" | "city" | "state" | "pincode" | "creditDays" | "creditLimit";
export type CompanyForm = Record<Text, string> & { kind: CompanyKind; creditAllowed: boolean };

const typed = (n: number | null | undefined) => (n === null || n === undefined ? "" : String(n));
/** A typed figure: blank is null (not set); anything else is Number of what was typed (NaN is refused below). */
export const figureOf = (v: string) => (v.trim() === "" ? null : Number(v.trim()));
const orNull = (v: string) => v.trim() || null;

export const companyForm = (c?: Company): CompanyForm => ({
  name: c?.name ?? "", kind: c?.kind ?? "corporate", gstin: c?.gstin ?? "",
  contactName: c?.contactName ?? "", phone: c?.phone ?? "", email: c?.email ?? "",
  addressLine: c?.addressLine ?? "", city: c?.city ?? "", state: c?.state ?? "", pincode: c?.pincode ?? "",
  creditAllowed: c?.creditAllowed ?? false, creditDays: typed(c?.creditDays), creditLimit: typed(c?.creditLimit),
});

/** CompanyDialog.tsx `wrong`: the first thing the server would refuse, in its words. */
export function companyWrong(f: CompanyForm): string | null {
  const days = figureOf(f.creditDays);
  const limit = figureOf(f.creditLimit);
  return (!f.name.trim() ? "A company has a name." : null)
    ?? gstinProblem(f.gstin) ?? phoneProblem(f.phone) ?? emailProblem(f.email)
    ?? (f.pincode.trim() && !/^[1-9][0-9]{5}$/.test(f.pincode.trim()) ? "A PIN code is 6 digits, e.g. 413216." : null)
    ?? (f.creditAllowed && days !== null && !(Number.isInteger(days) && days >= 1 && days <= 365)
      ? "Credit days is a whole number from 1 to 365." : null)
    ?? (f.creditAllowed && limit !== null && !(limit > 0) ? "A credit limit is an amount above 0, in rupees." : null);
}

/** What is sent: no credit, no terms (the server's companyFrom drops them too). */
export const companyInput = (f: CompanyForm): CompanyInput => ({
  name: f.name.trim(), kind: f.kind, gstin: orNull(f.gstin)?.toUpperCase() ?? null,
  contactName: orNull(f.contactName), phone: orNull(f.phone), email: orNull(f.email),
  addressLine: orNull(f.addressLine), city: orNull(f.city), state: orNull(f.state), pincode: orNull(f.pincode),
  creditAllowed: f.creditAllowed,
  creditDays: f.creditAllowed ? figureOf(f.creditDays) : null, creditLimit: f.creditAllowed ? figureOf(f.creditLimit) : null,
});

/* ── The contract form (ContractDialog.tsx) ──────────────────────── */

export type Cells = Record<string, { single: string; double: string }>;
export const cellKey = (roomTypeId: string, mealPlan: string) => `${roomTypeId}|${mealPlan}`;
export interface ContractForm {
  name: string; validFrom: string; validTo: string; pricing: "rates" | "discount";
  discountPercent: string; commissionPct: string; notes: string; cells: Cells;
}

/** A new contract starts on the business date (the web's); every price starts BLANK. */
export const contractForm = (k: Contract | undefined, today: string): ContractForm => ({
  name: k?.name ?? "", validFrom: k?.validFrom ?? today, validTo: k?.validTo ?? "",
  pricing: k?.pricing ?? "rates", discountPercent: typed(k?.discountPercent),
  commissionPct: typed(k?.commissionPct), notes: k?.notes ?? "",
  cells: Object.fromEntries((k?.rates ?? []).map((r) => [cellKey(r.roomTypeId, r.mealPlan), { single: typed(r.single), double: typed(r.double) }])),
});

/** The typed rates as sent: a row where both are blank is left out; a blank is null. */
export const ratesOf = (cells: Cells): ContractRate[] =>
  Object.entries(cells)
    .map(([key, c]) => {
      const [roomTypeId, mealPlan] = key.split("|") as [string, string];
      return { roomTypeId, mealPlan, single: figureOf(c.single), double: figureOf(c.double) };
    })
    .filter((r) => r.single !== null || r.double !== null);

/** The phone's own check first (a date is typed here, where the web's date input cannot be wrong),
    then ContractDialog.tsx `wrong`, in its words. */
export function contractWrong(f: ContractForm): string | null {
  const rates = ratesOf(f.cells);
  const pct = figureOf(f.discountPercent);
  const commission = figureOf(f.commissionPct);
  return (!f.name.trim() ? "Give the contract a name, e.g. the company and the year." : null)
    ?? (!f.validFrom.trim() || !f.validTo.trim() ? "Valid from and to: choose both dates." : null)
    ?? typedDate("Valid from", f.validFrom) ?? typedDate("Valid to", f.validTo)
    ?? (f.validTo < f.validFrom ? "A contract ends on or after the day it starts." : null)
    ?? (f.pricing === "discount" && !(pct !== null && pct > 0 && pct <= 100) ? "The discount is a percentage above 0, at most 100." : null)
    ?? (f.pricing === "rates" && rates.some((r) => [r.single, r.double].some((p) => p !== null && !(p > 0)))
      ? "A contract rate is an amount above 0. Leave it blank where none is agreed." : null)
    ?? (f.pricing === "rates" && rates.length === 0 ? "Type at least one rate, or choose a discount off the day's rate." : null)
    ?? (commission !== null && !(commission >= 0 && commission <= 100) ? "Commission is a percentage from 0 to 100." : null);
}

/** What is sent: the discount only when priced by it, commission only for an agent, rates only when by rates. */
export const contractInput = (f: ContractForm, agent: boolean): ContractInput => ({
  name: f.name.trim(), validFrom: f.validFrom.trim(), validTo: f.validTo.trim(), pricing: f.pricing,
  discountPercent: f.pricing === "discount" ? figureOf(f.discountPercent) : null,
  commissionPct: agent ? figureOf(f.commissionPct) : null,
  notes: f.notes.trim() || null,
  rates: f.pricing === "rates" ? ratesOf(f.cells) : [],
});

/** A date as the phone takes it: typed "YYYY-MM-DD", as the web's date input sends it. */
function typedDate(label: string, v: string): string | null {
  const wrong = dateProblem(v.trim());
  return wrong ? `${label}: ${wrong === "Choose a date." ? "type it as 2026-04-01." : wrong}` : null;
}

/* ── The allotment form (AllotmentDialog.tsx) ────────────────────── */

export interface AllotmentForm { roomTypeId: string; firstNight: string; lastNight: string; rooms: string; releaseDays: string; notes: string }

export const allotmentForm = (a: Allotment | undefined, k: Pick<Contract, "validFrom">, d: Pick<CompanyContracts, "roomTypes" | "today">): AllotmentForm => ({
  roomTypeId: a?.roomTypeId ?? d.roomTypes[0]?.id ?? "",
  firstNight: a?.firstNight ?? (d.today > k.validFrom ? d.today : k.validFrom),
  lastNight: a?.lastNight ?? "",
  rooms: a ? String(a.rooms) : "",
  releaseDays: a ? String(a.releaseDays) : "",
  notes: a?.notes ?? "",
});

export function allotmentWrong(f: AllotmentForm, k: Pick<Contract, "validFrom" | "validTo">): string | null {
  const rooms = Number(f.rooms);
  const release = Number(f.releaseDays);
  return (!f.firstNight.trim() || !f.lastNight.trim() ? "Choose the first and the last night." : null)
    ?? typedDate("First night", f.firstNight) ?? typedDate("Last night", f.lastNight)
    ?? (f.lastNight < f.firstNight ? "The last night is on or after the first." : null)
    ?? (f.firstNight < k.validFrom || f.lastNight > k.validTo ? "An allotment's nights are inside its contract." : null)
    ?? (!(f.rooms.trim() !== "" && Number.isInteger(rooms) && rooms >= 1 && rooms <= 500) ? "Rooms is a whole number from 1 to 500." : null)
    ?? (f.releaseDays.trim() === "" || !(Number.isInteger(release) && release >= 0 && release <= 365)
      ? "Release days is a whole number from 0 to 365." : null);
}

export const allotmentInput = (f: AllotmentForm): AllotmentInput => ({
  firstNight: f.firstNight.trim(), lastNight: f.lastNight.trim(), rooms: Number(f.rooms), releaseDays: Number(f.releaseDays),
  notes: f.notes.trim() || null,
});

/* ── The words ───────────────────────────────────────────────────── */

export const TITLE = "Contracts";
export const UNDER = "Companies and agents, and the rates each has agreed with this hotel.";
export const EMPTY = {
  title: "No companies yet",
  line: "A company or travel agent added here can be named on a booking, billed, and given a contract.",
};
export const NO_CONTRACT = {
  title: "No contract at this hotel",
  line: "Bookings for this company take the price on Rates until a contract is added.",
};
export const RATES_NOTE =
  "Per room per night, before tax. Single is one guest, double two; a third guest pays the extra-person price on Rates. "
  + "Blank is not agreed: the booking takes the day's price.";
export const CONTRACT_SAVED = "The next booking for this company is priced by it. Bookings already made keep their rate.";
export const HELD_SAID = "Availability and the Calendar show them as held. Bookings from it are made from its Book button.";
export const STOP_ASK = "What it still holds goes back on sale now. Bookings made from it stand.";
export const STOPPED_SAID = "What it still holds is back on sale. Bookings made from it stand.";
/** The phone's own: Book from it opens New booking from the allotment (/h/:code/book?allotment=), which the phone's New booking does not read yet. */
export const BOOK_ON_WEB = "Booking from an allotment: On the website for now";

/** Contracts.tsx CONTRACT_EXPORT: the list as shown and as the web's file carries it. */
export const contractsTable = (rows: readonly CompanyRow[]): ExportTable => ({
  title: TITLE,
  columns: ["Company", "Kind", "GSTIN", "Contact", "Phone", "Email", "City", "State", "Credit", "Credit days", "Credit limit", "Contract here", "Contract until"],
  rows: rows.map((c) => [
    c.name, KIND_LABEL[c.kind] ?? c.kind, c.gstin ?? DASH, c.contactName ?? DASH, c.phone ?? DASH, c.email ?? DASH,
    c.city ?? DASH, c.state ?? DASH, c.creditAllowed ? "Yes" : "No",
    c.creditDays === null ? DASH : String(c.creditDays), c.creditLimit === null ? DASH : rupees(c.creditLimit),
    c.contractName ?? DASH, c.contractTo ? day(c.contractTo) : DASH,
  ]),
});

/* ── An outcome nobody knows (MEMORY 16; MCON-1) ─────────────────────
   None of these routes reads a key, and POST /allotments has no check for
   a second hold over the same nights. So once a write's outcome is not
   known, the COMPANY page (not the sheet, which can be closed) greys every
   write until a read of the company that began after that moment has
   landed without an error - then its allotments and contracts say what
   was done. */

/** True while the writes stay grey: an unknown moment, and no clean read of the company since it. */
export function stillUnknown(at: number | null, read: { dataUpdatedAt: number; error: unknown } | undefined): boolean {
  if (at === null) return false;
  return !(read !== undefined && read.error == null && read.dataUpdatedAt > at);
}

/** A repeated Stop holding: the allotment is no longer held, so the server answers 404 "No such
    allotment here" - already stopped, not a failure (it was the first press that stopped it). */
export const alreadyStopped = (status: number | undefined) => status === 404;
