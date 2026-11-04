/* ══════════════════════════════════════════════════════════════════
   RATES' RULES ON A PHONE — ported by hand from the web's
   src/modules/inventory/pages/Rates.tsx and data/{pricing,rates,rateGrid}.ts
   (the PMS at a4527ea, 2 Nov), trimmed to what the phone draws and sends.

   EVERY FIGURE IS THE SERVER'S. The phone works out no price: the base,
   the break-up rows and how each day sold come from GET /pricing,
   /pricing?breakup= and /rates, and are drawn as they came. A price not
   set is null and a DASH, never ₹0 (CLAUDE.md: no default prices; the
   web's MODULE.md "Rules that bind it"). A figure is never rounded or
   clamped here (MEMORY 9): ₹4,099.50 reads ₹4,099.50.

   WHAT IS SENT IS WHAT WAS TYPED: the price field holds only what can be
   sent - digits and one point with at most two places - so the figure the
   person sees in the field is the figure the server gets. Empty is "not
   ready" (the web's disabled Set base), never a zero and never a clear.

   Pure: no React Native here, so rates.check.ts runs under node.
   ══════════════════════════════════════════════════════════════════ */

/* ── The server's shapes (data/pricing.ts, data/rates.ts, data/rateGrid.ts) ── */

/** Which layer answered: a base or set price, base + add-ons, the old rack. */
export type PriceSource = "typed" | "derived" | "rack" | null;

export interface PricingRoomType {
  id: string;
  name: string;
  baseOccupancy: number;
  maxOccupancy: number;
  /** The old rack rate: priced only where no base covers a date. */
  rack: number | null;
  /** Its difference from the base room type; null never set (a dash). */
  difference: { amount: number; unit: "rupees" | "percent" } | null;
}

export interface PricingCell {
  date: string;
  roomTypeId: string;
  mealPlan: string;
  /** null: nobody has priced it. A dash. */
  price: number | null;
  /** How many guests that price covers: 1 for a base. */
  covers: number | null;
  source: PriceSource;
}

/** Set once per hotel. null: a dash, not sold. 0: Free. */
export interface Addons {
  CP: number | null; MAP: number | null; AP: number | null; AI: number | null;
  double: number | null; extraAdult: number | null; extraChild: number | null;
}

/** A price typed before migration 162: kept exactly. */
export interface OlderPrice {
  id: string; roomTypeId: string; mealPlan: string; price: number;
  from: string; /** Exclusive; null is open-ended. */ to: string | null;
  label: string | null; covers: number;
}

export interface Pricing {
  from: string;
  /** null: no base room type - each type has its own base. */
  basis: { roomTypeId: string; roomType: string; mealPlan: string } | null;
  roomTypes: PricingRoomType[];
  addons: Addons;
  older: OlderPrice[];
  cells: PricingCell[];
}

/** One day of a room type's break-up (D27-206): app.tariff_for's figures. */
export interface BreakupDay {
  date: string;
  /** How many guests the rows price: two, or one for a room that sleeps one. */
  guests: number;
  EP: number | null; CP: number | null; MAP: number | null; AP: number | null; AI: number | null;
  extraAdult: number | null; extraChild: number | null;
}

export interface InventoryCell {
  roomTypeId: string; roomType: string; date: string;
  sellable: number; occupied: number; sold: number; available: number;
}

export interface Restriction {
  roomTypeId: string; date: string;
  stopSell: boolean; closedArrival: boolean; closedDeparture: boolean;
  minNights: number | null; maxNights: number | null;
}

export interface Inventory { from: string; to: string; cells: InventoryCell[]; restrictions: Restriction[] }

/** How a day sold (rateGrid.ts): paying rooms only, no day use, before tax. */
export interface RateDay {
  date: string;
  paidSold: number;
  /** A percentage; null when the hotel had no rooms to sell. */
  occupancy: number | null;
  /** null when nothing was sold - a dash, never ₹0. */
  adr: number | null;
  revenue: number;
}

/* ── Dates (Rates.tsx 50-68) ─────────────────────────────────────── */

/** The fortnight the calendar shows (Rates.tsx DAYS). */
export const DAYS = 14;

export function addDays(date: string, n: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export const windowOf = (from: string) => Array.from({ length: DAYS }, (_, i) => addDays(from, i));

const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DOW = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

/** The web's dateShort: "11 Oct 2026". */
export const dateShort = (date: string) => `${Number(date.slice(8))} ${MON[Number(date.slice(5, 7)) - 1]} ${date.slice(0, 4)}`;

/** The toolbar's range: "11 Oct 2026 – 24 Oct 2026". */
export const rangeOf = (from: string) => `${dateShort(from)} – ${dateShort(addDays(from, DAYS - 1))}`;

/** The hotel's weekend and holidays, shading only (GET /api/hotels deskRules; D27-243 3.4, 192). */
export interface DayRules { weekendDays?: number[]; holidays?: { day: string }[] }

export function dayHead(date: string, rules?: DayRules) {
  const d = new Date(`${date}T00:00:00Z`);
  return {
    dow: DOW[d.getUTCDay()]!,
    day: d.getUTCDate(),
    weekend: (rules?.weekendDays ?? [0, 6]).includes(d.getUTCDay()) || (rules?.holidays ?? []).some((h) => h.day === date),
  };
}

/* ── Figures ─────────────────────────────────────────────────────── */

export const DASH = "-";
const whole = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const paise = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** A rupee figure as the server sent it: whole rupees when it is whole,
    else to the paisa (MEMORY 9; the web's money() rounds). Missing: a dash. */
export const rupees = (n: number | null | undefined) =>
  n == null || !Number.isFinite(n) ? DASH : Number.isInteger(n) ? whole.format(n) : paise.format(n);

/** A figure, "Free" for a typed 0, or a dash for nothing set (Rates.tsx figure). */
export const figure = (v: number | null | undefined) => (v == null ? DASH : v === 0 ? "Free" : rupees(v));

/** Occupancy as the web writes it, percent(x, 0); null a dash. */
export const occupancyOf = (v: number | null | undefined) => (v == null ? DASH : `${v.toFixed(0)}%`);

/** The occupancy capsule's fill, 0 to 100 (Rates.tsx 715): a width, not a figure. */
export const fillOf = (v: number | null | undefined) => Math.min(Math.max(v ?? 0, 0), 100);

/** A room type's difference from the base room type (SetupCard). */
export function differenceOf(d: PricingRoomType["difference"]): string {
  if (d === null) return DASH;
  if (d.unit === "percent") return `${d.amount >= 0 ? "+" : ""}${d.amount}%`;
  return `${d.amount >= 0 ? "+" : "-"}${rupees(Math.abs(d.amount))}`;
}

/* ── The calendar's base row (BaseGrid) ──────────────────────────── */

export type Look = "none" | "older" | "derived" | "base";

/** How a base cell is drawn: an older price (rack, or covering more than
    one) grey and italic, a derived one grey, a base bold, none a dash. */
export function lookOf(cell: PricingCell | undefined): Look {
  if (cell?.price == null) return "none";
  if (cell.source === "rack" || (cell.covers ?? 1) > 1) return "older";
  if (cell.source === "derived") return "derived";
  return "base";
}

/** What the dialog starts on when a price is tapped: the base itself, or
    nothing for an older or derived figure (the web's `price:` of setEditing). */
export function tappedPrice(cell: PricingCell | undefined): number | null {
  const look = lookOf(cell);
  return look === "older" || look === "derived" ? null : cell?.price ?? null;
}

/** With a base room type chosen, only its base (and an Independent type's,
    D27-258 Q2) is typed; the rest follow it (BaseGrid editable, offered). */
export const typesOwnBase = (p: Pricing, id: string) =>
  !p.basis || p.basis.roomTypeId === id || p.roomTypes.find((t) => t.id === id)?.difference === null;

export const offered = (p: Pricing) => p.roomTypes.filter((t) => typesOwnBase(p, t.id));

/** The base plan's cells by type and day (the calendar shows EP). */
export function cellsByDay(p: Pricing): Map<string, PricingCell> {
  const m = new Map<string, PricingCell>();
  for (const cell of p.cells) if (cell.mealPlan === "EP") m.set(`${cell.roomTypeId}/${cell.date}`, cell);
  return m;
}

/** A break-up row: its label and which of the server's figures it shows. */
export type BreakupPick = "EP" | "CP" | "MAP" | "AP" | "AI" | "extraAdult" | "extraChild";

/** The break-up rows (BreakupRows): two guests (one for a room that sleeps
    one, whose base line is the row already), each meal plan, and a
    further guest only where one fits (the owner, D27-206). */
export function breakupRows(guests: number, sleeps: number): { label: string; pick: BreakupPick }[] {
  const who = guests === 1 ? "1 guest" : `${guests} guests`;
  return [
    ...(guests > 1 ? [{ label: who, pick: "EP" as const }] : []),
    { label: `CP · ${who}`, pick: "CP" },
    { label: `MAP · ${who}`, pick: "MAP" },
    { label: `AP · ${who}`, pick: "AP" },
    { label: `AI · ${who}`, pick: "AI" },
    ...(sleeps > guests ? [
      { label: "+ per extra adult", pick: "extraAdult" as const },
      { label: "+ per extra child", pick: "extraChild" as const },
    ] : []),
  ];
}

/* ── Rooms left (InventoryGrid) ──────────────────────────────────── */

/** Room types in the order the server listed their cells. */
export function typesOf(cells: InventoryCell[]): { id: string; name: string }[] {
  const seen = new Map<string, string>();
  for (const cell of cells) if (!seen.has(cell.roomTypeId)) seen.set(cell.roomTypeId, cell.roomType);
  return [...seen.entries()].map(([id, name]) => ({ id, name }));
}

/** A day's tone: closed (stop sell), nothing left, or open. */
export const toneOf = (cell: InventoryCell | undefined, rule: Restriction | undefined) =>
  rule?.stopSell === true ? "closed" : cell && cell.available === 0 ? "none" : "open";

/** "2–5", "2", "–5" … the nights a day's rule asks (RuleMarks). */
export function nightsMark(rule: Restriction): string {
  const { minNights: min, maxNights: max } = rule;
  if (!min && !max) return "";
  return `${min ?? ""}${min && max ? "–" : ""}${max ?? ""}`;
}

/* ── What a person types ─────────────────────────────────────────── */

/** The price field keeps only what can be sent: digits, one point, two places. */
export const typedPrice = (text: string) =>
  text.replace(/[^\d.]/g, "").replace(/^(\d*\.?)(.*)$/, (_, head: string, rest: string) => head + rest.replace(/\./g, ""))
    .replace(/^(\d*\.\d{0,2}).*$/, "$1");

/** The nights fields keep only digits. */
export const typedNights = (text: string) => text.replace(/\D/g, "");

/** The figure the field holds, as the API takes it; null when there is none yet. */
export const priceOf = (text: string): number | null => (/\d/.test(text) ? Number(text) : null);

/** Days from `from` through `until`, both counted (BaseDialog, RestrictionDialog). */
export const daysThrough = (from: string, until: string) =>
  Math.max(1, Math.round((Date.parse(`${until}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000) + 1);

/** "11 Oct 2026 only." / "3 days, 11 Oct 2026 through 13 Oct 2026." */
export function spanWords(from: string, until: string): string {
  const n = daysThrough(from, until);
  return n === 1 ? `${dateShort(from)} only.` : `${n} days, ${dateShort(from)} through ${dateShort(until)}.`;
}

/** The toast after a base is set or cleared. */
export const baseDone = (roomType: string, from: string, until: string) => {
  const n = daysThrough(from, until);
  return `${roomType} · ${n} ${n === 1 ? "day" : "days"} from ${dateShort(from)}`;
};

export interface BaseBody { roomTypeId: string; from: string; to: string; price: number | null; free?: true }

/** PUT /pricing/base's body (BaseDialog save): the half-open range (`to` is
    the first day NOT covered), the typed figure, 0 only when ticked Free
    (X-1, D27-120), null only to Clear. undefined: nothing to send yet. */
export function baseBody(a: {
  roomTypeId: string; from: string; until: string; text: string; free: boolean; clearing: boolean;
}): BaseBody | undefined {
  const range = { roomTypeId: a.roomTypeId, from: a.from, to: addDays(a.until, 1) };
  if (a.clearing) return { ...range, price: null };
  if (a.free) return { ...range, price: 0, free: true };
  const price = priceOf(a.text);
  return price === null ? undefined : { ...range, price };
}

export interface RestrictionBody {
  roomTypeId: string; from: string; to: string;
  stopSell: boolean; closedArrival: boolean; closedDeparture: boolean;
  minNights: number | null; maxNights: number | null;
}

/** POST /restrictions's body (RestrictionDialog save). Inclusive `to`: the
    API applies [from, to] with a generate_series, unlike the base's range.
    An empty nights field is null - no rule - never a zero. */
export const restrictionBody = (a: {
  roomTypeId: string; from: string; until: string;
  stopSell: boolean; closedArrival: boolean; closedDeparture: boolean; min: string; max: string;
}): RestrictionBody => ({
  roomTypeId: a.roomTypeId, from: a.from, to: a.until,
  stopSell: a.stopSell, closedArrival: a.closedArrival, closedDeparture: a.closedDeparture,
  minNights: a.min === "" ? null : Number(a.min),
  maxNights: a.max === "" ? null : Number(a.max),
});
