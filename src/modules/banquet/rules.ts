/* ══════════════════════════════════════════════════════════════════
   THE BANQUET DIARY'S RULES ON A PHONE — ported by hand from the web's
   src/modules/banquet/data/banquet.ts (the shapes), pages/Banquet.tsx
   (STATUS, whenLabel, the head's sentence, a hall's line, RegisterDialog's
   checks), pages/BanquetEvent.tsx (which act shows when, the money card's
   lines, a course's and an order's words, PriceDialog's and CourseDialog's
   bodies) and components/FunctionBill.tsx (the bill card's rows and its
   buttons). The server is api/src/modules/banquet/banquet.ts; every shape
   is its answer.

   NULL IS A REAL ANSWER. An agreed amount or a rate nobody has typed is
   null: a dash, never 0, and the server's total is null while anything is
   unpriced (app.banquet_event_total), with its sentence saying what. 0 is a
   price only when ticked Free (D27-120). Nothing here totals anything: the
   hall, the catering, the restaurant orders, the total and the bill are
   the server's. A course's amount, which the web multiplies on the device,
   is shown as its parts (plates and the rate each).

   TIMES are the property's own clock as text ("YYYY-MM-DDTHH:MI",
   app.hotel_clock), read as text and never through Date (MEMORY 7).

   Pure: no React Native, so rules.check.ts runs under node.
   ══════════════════════════════════════════════════════════════════ */

import { DASH } from "../../core/format.ts";
import { clockOf, dayOf, rupees } from "../laundry/docket.ts";

export { clockOf, dayOf, rupees };

/* ── The server's answers (data/banquet.ts, banquet.ts) ─────────────── */

export type FnStatus = "enquiry" | "confirmed" | "completed" | "cancelled";

/** GET /banquet venues[].events[] (BanquetEventSummary). */
export interface DiaryEvent {
  id: string;
  reference: string;
  title: string;
  status: FnStatus;
  startsAt: string;
  endsAt: string;
  hostName: string;
  pax: number | null;
  /** Null: nobody has priced it. A dash. */
  agreedAmount: number | null;
  /** Null where the viewer may not know who (BQ-7): left out. */
  registeredBy: string | null;
}

/** An empty hall is a real answer, drawn, never left out. */
export interface DiaryHall { id: string; name: string; events: DiaryEvent[] }
export interface Diary { businessDate: string; from: string; to: string; venues: DiaryHall[] }

export interface Course {
  id: string;
  name: string;
  pax: number;
  /** Null while the menu is settled and the price is not. */
  ratePerHead: number | null;
  notes: string | null;
  addedBy: string | null;
}

export interface RestaurantOrder {
  id: string;
  orderNo: string;
  table: string | null;
  outlet: string | null;
  /** open or settled; an abandoned order is not sent. */
  status: string;
  openedAt: string;
  settledAt: string | null;
  amount: number | null;
}

/** The server's figures: total NULL when ANY part is unpriced, `unpriced` says which. */
export interface FnMoney { venue: number | null; food: number | null; pos: number | null; total: number | null; unpriced: string | null }

/** finance's folioBalance: null while nothing live is on the bill. balance < 0 is paid ahead. */
export interface FnBill { charges: number; tax: number; paid: number; balance: number }

/** GET /banquet/events/:id (BanquetEvent). `folioId`, `bill`, `invoice` come
    back null for a role without `invoice` view (roleGate WITHHELD). */
export interface Fn {
  id: string;
  reference: string;
  title: string;
  eventType: string | null;
  status: FnStatus;
  startsAt: string;
  endsAt: string;
  businessDate: string;
  hostName: string;
  hostPhone: string | null;
  hostEmail: string | null;
  pax: number | null;
  paxGuaranteed: number | null;
  agreedAmount: number | null;
  notes: string | null;
  cancelReason: string | null;
  venue: { id: string; name: string; seated: number | null; floating: number | null; defaultRate: number | null };
  registeredBy: string | null;
  registeredAt: string;
  confirmedBy: string | null;
  folioId: string | null;
  taxWarning: string | null;
  bill: FnBill | null;
  invoice: string | null;
  catering: Course[];
  restaurantOrders: RestaurantOrder[];
  money: FnMoney;
}

/** GET /banquet/setup: what Register and Add a course offer. */
export interface Hall { id: string; name: string; seated: number | null; floating: number | null; defaultRate: number | null; isActive: boolean; notes: string | null }
export interface Package { id: string; name: string; description: string | null; ratePerHead: number | null; mealType: string | null; isActive: boolean }
export interface Setup { venues: Hall[]; packages: Package[] }

/* ── Words ───────────────────────────────────────────────────────── */

export type Tone = "neutral" | "info" | "success" | "danger";
/** An enquiry is not a booking and never shares a colour with one (Banquet.tsx STATUS). */
export const STATUS: Record<FnStatus, { label: string; tone: Tone }> = {
  enquiry: { label: "Enquiry", tone: "neutral" },
  confirmed: { label: "Confirmed", tone: "success" },
  completed: { label: "Completed", tone: "info" },
  cancelled: { label: "Cancelled", tone: "danger" },
};
/** An unknown status reads as an enquiry, as the web's fallback. */
export const statusOf = (s: string) => STATUS[s as FnStatus] ?? STATUS.enquiry;

/** "6:00 PM" (the web's timeOnly), from the property's clock text. */
export function timeOf(text: string | null | undefined): string {
  const m = text ? /^\d{4}-\d{2}-\d{2}[T ](\d{2}):(\d{2})/.exec(text) : null;
  if (!m) return DASH;
  const h = Number(m[1]);
  return `${h % 12 === 0 ? 12 : h % 12}:${m[2]} ${h < 12 ? "AM" : "PM"}`;
}

/** "24 Oct 2026, 6:00 PM → 11:00 PM", or both days when it runs across them (whenLabel). */
export const whenLabel = (startsAt: string, endsAt: string) =>
  dayOf(startsAt) === dayOf(endsAt)
    ? `${clockOf(startsAt)} → ${timeOf(endsAt)}`
    : `${clockOf(startsAt)} → ${clockOf(endsAt)}`;

/** The diary's head: confirmed functions only - an enquiry holds no hall. */
export function confirmedWords(d: Pick<Diary, "from" | "to" | "venues">): string {
  const n = d.venues.reduce((k, v) => k + v.events.filter((e) => e.status === "confirmed").length, 0);
  const between = `between ${dayOf(d.from)} and ${dayOf(d.to)}.`;
  return n === 0 ? `Nothing confirmed ${between}` : `${n} ${n === 1 ? "function" : "functions"} confirmed ${between}`;
}

/** A hall's line beside its name. */
export const hallCount = (v: DiaryHall) => (v.events.length === 0 ? "nothing booked" : `${v.events.length} in this window`);

/* ── The window (Earlier / From today / Later: 30 days a step) ──── */

export const addDays = (date: string, n: number) =>
  new Date(Date.parse(`${date}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
export type Window = { from: string; to: string };
export const shift = (d: Window, days: number): Window => ({ from: addDays(d.from, days), to: addDays(d.to, days) });
export const fromToday = (businessDate: string): Window => ({ from: businessDate, to: addDays(businessDate, 30) });

/* ── Typed figures: blank is "not agreed", never 0 (MLDY-1) ─────── */

/** A typed amount: blank is null (unpriced), a figure is itself, anything else is not a figure. */
export function figure(text: string): number | null | "bad" {
  const s = text.trim();
  if (s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : "bad";
}

/** "18:00" or "6:30" on a 24-hour clock, as "HH:MM"; null when it is not a time. */
export function clockText(text: string): string | null {
  const m = /^(\d{1,2})[:.](\d{2})$/.exec(text.trim());
  if (!m) return null;
  const h = Number(m[1]), min = Number(m[2]);
  return h <= 23 && min <= 59 ? `${String(h).padStart(2, "0")}:${m[2]}` : null;
}
/** The day and the time as the web's datetime-local sends it: "YYYY-MM-DDTHH:MM", on the property's clock. */
export const momentOf = (day: string, time: string) => {
  const t = clockText(time);
  return t ? `${day}T${t}` : null;
};

/* ── Register a function (RegisterDialog) ──────────────────────── */

export interface RegisterDraft {
  venueId: string; title: string; hostName: string; hostPhone: string;
  fromDay: string; fromTime: string; untilDay: string; untilTime: string;
  pax: string; amount: string; free: boolean; notes: string;
}
export interface RegisterInput {
  venueId: string; title: string; hostName: string; hostPhone?: string;
  startsAt: string; endsAt: string; pax: number | null; agreedAmount: number | null; free: boolean; notes?: string;
}

/** The body the web sends, or null while it is not ready (its `ready`, and
    a time or a figure that is not one). The end must follow the start: the
    server's own refusal says so ("A function ends after it starts."). */
export function registerBody(d: RegisterDraft): RegisterInput | null {
  const startsAt = momentOf(d.fromDay, d.fromTime), endsAt = momentOf(d.untilDay, d.untilTime);
  const pax = figure(d.pax), amount = figure(d.amount);
  if (!d.venueId || !d.title.trim() || !d.hostName.trim() || !startsAt || !endsAt || pax === "bad" || amount === "bad") return null;
  return {
    venueId: d.venueId, title: d.title, hostName: d.hostName,
    ...(d.hostPhone ? { hostPhone: d.hostPhone } : {}),
    startsAt, endsAt, pax,
    /* Only what was typed: blank is UNPRICED. The hall's usual is offered, never assumed. */
    agreedAmount: amount, free: d.free,
    ...(d.notes ? { notes: d.notes } : {}),
  };
}

/** More guests than the hall holds: a warning, not a refusal (QA BQ-5). Null: no warning. */
export function overfull(h: Pick<Hall, "seated" | "floating"> | undefined, paxText: string): number | null {
  const sizes = h ? [h.seated, h.floating].filter((n): n is number => n != null) : [];
  const holds = sizes.length ? Math.max(...sizes) : 0;
  const pax = figure(paxText);
  return holds > 0 && typeof pax === "number" && pax > holds ? holds : null;
}

/** The hint under Agreed amount (Register): the hall's usual is OFFERED. */
export const usualHint = (defaultRate: number | null | undefined) =>
  defaultRate != null
    ? `This hall's usual is ${rupees(defaultRate)}. Leave blank if not yet agreed.`
    : "Leave blank if it is not agreed yet. It stays unpriced, not free.";

/** A hall in the picker: "Emerald Hall · seats 200". */
export const hallWords = (h: Pick<Hall, "name" | "seated">) => `${h.name}${h.seated !== null ? ` · seats ${h.seated}` : ""}`;

/* ── One function: which act shows (BanquetEvent.tsx, FunctionBill.tsx) ── */

export const mayConfirm = (f: Pick<Fn, "status">) => f.status === "enquiry";
/** A billed function is not cancelled (D27-135). */
export const mayCancel = (f: Pick<Fn, "status">) => f.status !== "cancelled" && f.status !== "completed";
/** Once billed the price and the courses are fixed (D27-138). */
export const mayChangeFood = (f: Pick<Fn, "status">) => f.status !== "completed";
export const priceAct = (f: Pick<Fn, "agreedAmount">) => (f.agreedAmount === null ? "Set the hall price" : "Change the hall price");

/** The bill card's buttons, by the function's state (who may is roles.ts). */
export function billActs(f: Pick<Fn, "status" | "bill" | "invoice">) {
  const billed = f.status === "completed";
  return {
    advance: f.status === "confirmed",
    bill: f.status === "confirmed",
    /* The server's balance, as sent: settle while it is owed. */
    settle: billed && f.bill !== null && f.bill.balance > 0,
    invoice: billed && !f.invoice,
    reopen: billed && !f.invoice,
  };
}

/** The bill card's rows: each the server's figure; a negative balance is "Paid ahead", its size as sent. */
export function billRows(f: Pick<Fn, "status" | "bill">): Array<{ label: string; value: string; strong?: boolean }> {
  if (!f.bill) return [];
  const b = f.bill;
  return [
    { label: f.status === "completed" ? "Billed" : "Charged so far", value: rupees(b.charges) },
    { label: "GST", value: rupees(b.tax) },
    { label: "Paid", value: rupees(b.paid) },
    { label: b.balance < 0 ? "Paid ahead" : "Balance", value: rupees(Math.abs(b.balance)), strong: true },
  ];
}

/** The money card's lines: nothing served is not ₹0 of food (QA BQ-5). */
export const moneyLines = (f: Pick<Fn, "catering" | "money">) => [
  { label: "Hall", value: rupees(f.money.venue) },
  { label: "Catering", value: rupees(f.catering.length === 0 ? null : f.money.food) },
  { label: "Restaurant orders", value: rupees(f.money.pos) },
];

/** A course's line: its plates and the rate each, or "no rate agreed". */
export const courseWords = (k: Pick<Course, "pax" | "ratePerHead" | "notes">) =>
  `${k.pax} ${k.pax === 1 ? "plate" : "plates"} · ${k.ratePerHead === null ? "no rate agreed" : `${rupees(k.ratePerHead)} each`}${k.notes ? ` · ${k.notes}` : ""}`;

/** A restaurant order's line: the outlet, its table, when it opened. */
export const orderWords = (o: Pick<RestaurantOrder, "outlet" | "table" | "openedAt">) =>
  `${o.outlet ?? DASH}${o.table ? ` · Table ${o.table}` : ""} · ${clockOf(o.openedAt)}`;
export const anyOpenOrder = (orders: readonly Pick<RestaurantOrder, "status">[]) => orders.some((o) => o.status !== "settled");

/* ── The hall price (PriceDialog) ──────────────────────────────── */

/** An EMPTY box clears the price: a quote withdrawn is a real act. Null: not a figure. */
export function priceBody(amount: string, free: boolean): { agreedAmount: number | null; free: boolean } | null {
  const n = figure(amount);
  return n === "bad" ? null : { agreedAmount: n, free };
}
export const priceHint = (defaultRate: number | null) =>
  defaultRate != null ? `This hall's usual is ${rupees(defaultRate)}.` : "Clear it to make the function unpriced again.";

/* ── Add a course (CourseDialog) ───────────────────────────────── */

export interface CourseDraft { packageId: string; name: string; heads: string; rate: string; free: boolean; notes: string }
export interface CourseInput { packageId?: string; name: string; pax: number; ratePerHead: number | null; free: boolean; notes?: string }

/** A package picked fills the name and OFFERS its rate; the rate sent is the box's (snapshotted). */
export function choosePackage(d: CourseDraft, p: Pick<Package, "id" | "name" | "ratePerHead"> | undefined): CourseDraft {
  if (!p) return { ...d, packageId: "" };
  return p.ratePerHead != null
    ? { ...d, packageId: p.id, name: p.name, rate: String(p.ratePerHead), free: p.ratePerHead === 0 }
    : { ...d, packageId: p.id, name: p.name };
}
/** At least one plate: a blank is no plates, never a count. */
export const platesProblem = (heads: string) => (heads.trim() !== "" && !(Number(heads) > 0) ? "At least one plate." : null);
export function courseBody(d: CourseDraft): CourseInput | null {
  const rate = figure(d.rate);
  if (!d.name.trim() || d.heads.trim() === "" || !(Number(d.heads) > 0) || rate === "bad") return null;
  return {
    ...(d.packageId ? { packageId: d.packageId } : {}),
    name: d.name, pax: Number(d.heads), ratePerHead: rate, free: d.free,
    ...(d.notes ? { notes: d.notes } : {}),
  };
}
/** A package in the picker: "Dinner buffet · ₹850 a head". */
export const packageWords = (p: Pick<Package, "name" | "ratePerHead">) =>
  `${p.name}${p.ratePerHead != null ? ` · ${rupees(p.ratePerHead)} a head` : ""}`;
