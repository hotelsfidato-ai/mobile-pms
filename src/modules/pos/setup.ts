/* ══════════════════════════════════════════════════════════════════
   RESTAURANT SETUP AND THE MENU, THE RULES — the m13-pos-setup lane (19 Nov).
   Ported by hand from today's PMS (16 Nov release), read only:
     src/modules/pos/pages/Setup.tsx           the screen, its words and order
     src/modules/pos/components/KotSection.tsx the KOT section
     src/modules/finance/flows/TaxRulesCard.tsx Taxes (the same card as Settings, Taxes)
     src/modules/pos/data/till.ts 1033-1060, 1520-1620, 1832-1920 the shapes
     src/modules/pos/data/tableBookings.ts 85-99, src/modules/finance/data/tax.ts
     api/src/roleGate.ts MENU, TILL_SETUP, TABLE_HOURS, KOT_SWITCH, GST and
       refusalFor (the sentences below are what it builds from permissions.ts,
       computed on 19 Nov); api/src/modules/admin/grants.ts MODULE_SWITCH_REFUSED;
       api/src/modules/pos/kotDesign.ts KOT_DESIGNERS, ownerAllowance.ts SET_REFUSED.
   Pure: no React Native, so setup.check.ts runs under node.
   The API decides; a refused control is drawn disabled with these words.
   ══════════════════════════════════════════════════════════════════ */

import { DASH } from "../../core/format.ts";
import { since } from "./floor.ts";

/* ── Who may (the API's lists and its own sentences) ──────────────── */

const MAY = {
  /** roleGate MENU: `menu` edit. Every Menu write, and KOT_SWITCH the same four. */
  menu: ["owner", "admin", "gm", "kitchen_manager"],
  /** roleGate TILL_SETUP and TABLE_HOURS: `room_config` edit. */
  setup: ["owner", "admin", "gm"],
  /** roleGate GST: `room_config` edit and the accountant by name. */
  gst: ["owner", "admin", "gm", "finance"],
  /** moduleSwitches.ts: the owner or an administrator (D17-36). */
  modules: ["owner", "admin"],
  /** kotDesign.ts KOT_DESIGNERS. */
  design: ["owner", "admin", "gm"],
  /** roleGate READ_RULES till/dish-profit: `reservation` approve. */
  profit: ["owner", "admin", "gm"],
} as const;

const SAID = {
  menu: "Changing the menu is for the owner, an administrator, the general manager or the kitchen manager. Ask one of them.",
  setup: "Setting up the restaurant's tables is for the owner, an administrator or the general manager. Ask one of them.",
  hours: "Setting the restaurant's table-booking hours is for the owner, an administrator or the general manager. Ask one of them.",
  kot: "Choosing the KOT printer is for the owner, an administrator, the general manager or the kitchen manager. Ask one of them.",
  gst: "Setting GST is for the owner, an administrator, the general manager or the accountant. Ask one of them.",
  modules: "Switching a module on or off is for the owner or an administrator. Ask one of them.",
  design: "The KOT's design is set by the GM, the owner or an Admin.",
  allowance: "The owner's allowance is set by the owner or an Admin.",
} as const;

const allow = (list: readonly string[], role: string | null, refusal: string) =>
  role != null && list.includes(role) ? null : refusal;

/** Each answers null when the API would allow it, else the API's sentence. */
export const whyNotMenu = (role: string | null) => allow(MAY.menu, role, SAID.menu);
export const whyNotSetup = (role: string | null) => allow(MAY.setup, role, SAID.setup);
export const whyNotHours = (role: string | null) => allow(MAY.setup, role, SAID.hours);
export const whyNotKot = (role: string | null) => allow(MAY.menu, role, SAID.kot);
export const whyNotGst = (role: string | null) => allow(MAY.gst, role, SAID.gst);
export const whyNotModules = (role: string | null) => allow(MAY.modules, role, SAID.modules);
export const whyNotDesign = (role: string | null) => allow(MAY.design, role, SAID.design);
/** The allowance: the server answers `mayEdit` itself (ownerAllowance.ts). */
export const whyNotAllowance = (mayEdit: boolean) => (mayEdit ? null : SAID.allowance);
/** Setup.tsx `whole`: the rest of the page is not even read for anybody else (D27-292). */
export const seesWholeSetup = (role: string | null) => role != null && (MAY.setup as readonly string[]).includes(role);
/** Menu.tsx `seesCosts`: the Profit per dish tab. */
export const seesProfit = (role: string | null) => role != null && (MAY.profit as readonly string[]).includes(role);

/* ── The shapes (data/till.ts, tableBookings.ts, finance/data/tax.ts) ── */

export interface SetupTable {
  id: string;
  label: string;
  /** Null when nobody typed it: a dash, never a number. */
  seats: number | null;
  /** A bill sits on it - open, or paid and not yet cleared. */
  busy: boolean;
}
export interface SetupSection { id: string; name: string; tables: SetupTable[] }
export interface TillSetup {
  /** Null until somebody names it: there is no restaurant yet. */
  restaurant: { name: string; packingCharge?: number | null; serviceChargePct?: number | null } | null;
  sections: SetupSection[];
  /** People with the Waiter role here. */
  waiters: number;
}
export interface OwnerAllowance {
  monthly: number | null; offPct: number | null; month: string; used: number; left: number | null;
  mayEdit: boolean; maySettle: boolean;
  bills: { orderNo: string; date: string; free: number; discount: number; paid: number }[];
}
export interface TableHours {
  code: string; name: string;
  /** "12:30-15:00", or "" when that meal is not offered. */
  lunch: string; dinner: string;
  slots: string[];
}

export interface KotStationRef { id: string; name: string; mine: boolean; online: boolean; seenAt: string | null }
export interface KotKindFull {
  id: string; name: string; role: "food" | "bar" | null;
  /** Kitchen and Bar: renamed, never switched off. */
  fixed: boolean;
  station: KotStationRef | null;
  sections: number;
}
export type Heading = "restaurant" | "bar" | "banquet" | "alcohol" | "other";
export type KotSize = "small" | "normal" | "large";
export interface KotDesign {
  dishSize: KotSize; numberSize: KotSize;
  show: { waiter: boolean; covers: boolean; time: boolean; kind: boolean; notes: boolean; orderNo: boolean };
  heading: string | null; widthMm: 58 | 80;
}
export interface KotSetupFull {
  kinds: KotKindFull[];
  stations: (KotStationRef & { printsBills: boolean; kinds: string[]; slipMm?: number | null })[];
  sections: { id: string; name: string; heading: Heading | null; own: string | null; kind: string | null }[];
  billPrinter: KotStationRef | null;
  me: string | null;
  design?: KotDesign;
}

export type TaxKind = "room" | "restaurant" | "bar" | "banquet" | "spa" | "alcohol" | "laundry" | "other";
export interface TaxSlab {
  id: string; overAmount: number; rate: number; note: string | null; setBy: string | null;
  validFrom: string | null; validTo: string | null;
}
export interface TaxKindRules { kind: TaxKind; sac: string | null; slabs: TaxSlab[] }
export interface TaxSetup {
  servesAlcohol: boolean;
  kinds: TaxKindRules[];
  categories: { name: string; kind: TaxKind | null; items: number }[];
}

/* ── Where each read and write goes (the web's data files) ─────────── */

const H = (code: string) => `/api/hotels/${encodeURIComponent(code)}`;
export const P = {
  setup: (code: string) => `${H(code)}/till/setup`,
  restaurant: (code: string) => `${H(code)}/till/setup/restaurant`,
  packing: (code: string) => `${H(code)}/till/setup/packing`,
  serviceCharge: (code: string) => `${H(code)}/till/setup/service-charge`,
  sections: (code: string) => `${H(code)}/till/setup/sections`,
  section: (code: string, id: string) => `${H(code)}/till/setup/sections/${id}`,
  sectionOff: (code: string, id: string) => `${H(code)}/till/setup/sections/${id}/off`,
  tables: (code: string, sectionId: string) => `${H(code)}/till/setup/sections/${sectionId}/tables`,
  table: (code: string, id: string) => `${H(code)}/till/setup/tables/${id}`,
  tableOff: (code: string, id: string) => `${H(code)}/till/setup/tables/${id}/off`,
  allowance: (code: string) => `${H(code)}/till/owner-allowance`,
  hours: (code: string) => `${H(code)}/table-bookings/hours`,
  modules: (code: string) => `${H(code)}/modules`,
  module: (code: string, name: string) => `${H(code)}/modules/${name}`,
  tax: (code: string) => `${H(code)}/tax`,
  taxKind: (code: string, kind: TaxKind) => `${H(code)}/tax/${kind}`,
  taxSac: (code: string, kind: TaxKind) => `${H(code)}/tax/${kind}/sac`,
  categoryTax: (code: string, name: string) => `${H(code)}/menu-categories/${encodeURIComponent(name)}/tax-kind`,
  /** The phone is never a KOT computer, so it names no device (as KitchenBoard). */
  kot: (code: string) => `${H(code)}/till/kot-setup`,
  kotKinds: (code: string) => `${H(code)}/till/kot-setup/kinds`,
  kotKind: (code: string, id: string) => `${H(code)}/till/kot-setup/kinds/${id}`,
  kotKindOff: (code: string, id: string) => `${H(code)}/till/kot-setup/kinds/${id}/off`,
  kotSection: (code: string, id: string) => `${H(code)}/till/kot-setup/sections/${id}`,
  kotStationOff: (code: string, id: string) => `${H(code)}/till/kot-setup/stations/${id}/remove`,
  kotDesign: (code: string) => `${H(code)}/till/kot-setup/design`,
  menu: (code: string) => `${H(code)}/till/menu`,
};

/* ── Figures as the web writes them ─────────────────────────────────── */

const inrPaise = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const inrWhole = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
/** The web's moneyPrecise, "₹1,20,000.00": paise kept (MEMORY 9); not held is a dash. */
export const paise = (n: number | null | undefined) => (n == null ? DASH : inrPaise.format(n));
/** The web's money, "₹7,500" - a band's threshold, a promotion's value. */
export const rupees = (n: number | null | undefined) => (n == null ? DASH : inrWhole.format(n));

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** The web's dateShort, "d MMM yyyy", of a plain date. */
export const dayShort = (day: string) => `${Number(day.slice(8, 10))} ${MONTHS[Number(day.slice(5, 7)) - 1]} ${day.slice(0, 4)}`;
/** A plain date moved by whole days (TaxRulesCard.tsx shift). */
export function shiftDay(day: string, n: number): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** A figure typed into a box whose blank means "none": blank is null, never
    0; a figure is the number typed. Not a figure: `bad`, and nothing is sent
    (the web would send `Number("abc")` - NaN, which JSON writes as null,
    and clear the setting: R-request in the report). */
export function typed(text: string): { value: number | null; bad: boolean } {
  const t = text.trim();
  if (t === "") return { value: null, bad: false };
  const n = Number(t);
  return Number.isFinite(n) ? { value: n, bad: false } : { value: null, bad: true };
}
/** The box's first words: the saved figure as text, blank when none. */
export const shown = (n: number | null | undefined) => (n == null ? "" : String(n));

/* ── Ready to open (Setup.tsx ReadyToOpen) ─────────────────────────── */

export interface Tick { done: boolean; label: string; detail: string; to?: string; open?: string }
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** The six ticks the owner chose. `menu`: the dishes on sale, null while
    the menu is read; `menuSaid` is what stands in for it then. */
export function readyTicks(setup: TillSetup, menu: { isActive: boolean; taxRate: number | null }[] | null, menuSaid: string | null): Tick[] {
  const tables = setup.sections.reduce((n, s) => n + s.tables.length, 0);
  const dishes = (menu ?? []).filter((i) => i.isActive);
  const noRate = dishes.filter((i) => i.taxRate === null).length;
  const said = (text: string) => menuSaid ?? text;
  return [
    { done: setup.restaurant !== null, label: "Restaurant named", detail: setup.restaurant?.name ?? "Not named yet - below" },
    { done: tables > 0, label: "Tables laid out",
      detail: tables ? `${plural(tables, "table", "tables")} in ${plural(setup.sections.length, "section", "sections")}` : "None yet - below" },
    { done: dishes.length > 0, label: "Dishes on the menu",
      detail: said(dishes.length ? plural(dishes.length, "dish", "dishes") : "None yet"), to: "/pos/:code/menu", open: "Open Menu" },
    { done: dishes.length > 0 && noRate === 0, label: "A GST rate for every dish",
      detail: said(!dishes.length ? "Checked once there are dishes"
        : noRate ? `${plural(noRate, "dish has", "dishes have")} none - they cannot be rung` : "Every dish has one"),
      to: "/settings/rates/taxes", open: "Open Settings" },
    { done: setup.waiters > 0, label: "A waiter",
      detail: setup.waiters ? `${plural(setup.waiters, "person", "people")} with the Waiter role` : "Nobody has the Waiter role yet",
      to: "/people", open: "Open People" },
    /* Always ticked: this screen, like the till, does not open where the restaurant is off. */
    { done: true, label: "Restaurant switched on", detail: "On - this screen opens only when it is",
      to: "/settings/connections/modules", open: "Open Settings" },
  ];
}

/* ── Sections and tables ───────────────────────────────────────────── */

export const tablesCount = (n: number) => (n === 1 ? "1 table" : `${n} tables`);
export const seatsShown = (seats: number | null) => (seats === null ? DASH : `${seats} seats`);

/** Take a section away: refused while a bill sits on one of its tables. */
export function sectionAway(section: SetupSection): { busy: string[]; line: string } {
  const busy = section.tables.filter((t) => t.busy).map((t) => t.label);
  return {
    busy,
    line: busy.length ? `A bill still sits on ${busy.join(", ")}. Settle or clear those tables first.`
      : `${section.name} has no bill on any table.`,
  };
}

export type AddMode = "one" | "run";
export interface AddForm { mode: AddMode; label: string; prefix: string; from: string; to: string; seats: string }
/** Add tables (AddTables): one, or a numbered run. Every figure the TEXT typed: the server refuses a blank. */
export function addTablesReady(f: AddForm): boolean {
  return f.mode === "one" ? f.label.trim() !== "" : f.from.trim() !== "" && f.to.trim() !== "";
}
export function addTablesBody(f: AddForm) {
  return f.mode === "one" ? { label: f.label, seats: f.seats } : { prefix: f.prefix, from: f.from, to: f.to, seats: f.seats };
}
export function addTablesDone(f: AddForm): string {
  return f.mode === "one" ? `${f.label.trim()} added`
    : `${f.prefix.trim()}${f.from.trim()} to ${f.prefix.trim()}${f.to.trim()} added`;
}

export const tableAbout = (t: SetupTable) => (t.busy
  ? "A bill sits on this table. It can be renamed; it can be taken away once it is settled or cleared."
  : "Its name as painted on it, and its seats.");

/* ── Table booking hours ──────────────────────────────────────────── */

export const slotsLine = (h: TableHours) => (h.slots.length ? `Slots: ${h.slots.join(", ")}` : "No table booking at this restaurant.");

/* ── The owner's allowance ────────────────────────────────────────── */

/** "This month (2026-10): ₹500.00 used, ₹0.00 left of ₹500.00." - a dash
    where the server sends no figure (the web writes ₹0.00 for none). */
export const allowanceLine = (a: OwnerAllowance) =>
  `This month (${a.month}): ${paise(a.used)} used, ${paise(a.left)} left of ${paise(a.monthly)}.`;
/** A bill's "% off, before tax" and "Paid": a dash when nothing. */
export const orDash = (n: number) => (n > 0 ? paise(n) : DASH);

/* ── The KOT section (KotSection.tsx) ─────────────────────────────── */

export function kindLine(k: KotKindFull, now = new Date()): string {
  const where = k.station
    ? `${k.station.name} · ${k.station.online ? "online" : `not seen since ${since(k.station.seenAt, now)}`}`
    : "No computer prints it";
  return `${where} · ${k.sections} ${k.sections === 1 ? "section" : "sections"}`;
}
/** The pill beside a kind: red when something prints to nobody, amber when its computer is away. */
export function kindPill(k: KotKindFull): { tone: "danger" | "warning"; text: string } | null {
  if (!k.station && k.sections > 0) return { tone: "danger", text: "Not printing" };
  if (k.station && !k.station.online) return { tone: "warning", text: "Offline" };
  return null;
}
export function stationPrints(s: KotSetupFull["stations"][number], kinds: KotKindFull[]): string[] {
  const name = new Map(kinds.map((k) => [k.id, k.name]));
  return [...s.kinds.map((id) => `${name.get(id) ?? "?"} KOTs`), ...(s.printsBills ? ["bills"] : [])];
}
export const printsLine = (prints: string[]) => (prints.length ? `Prints ${prints.join(", ")}` : "Prints nothing");
export const stationPill = (s: KotStationRef, now = new Date()) =>
  (s.online ? { tone: "success" as const, text: "Online" } : { tone: "warning" as const, text: `Not seen since ${since(s.seenAt, now)}` });

export const HEADING: Record<string, string> = {
  restaurant: "Restaurant", bar: "Bar", alcohol: "Alcohol", banquet: "Banquet", other: "Other",
};
/** The kind a section prints on by its tax heading: Bar and Alcohol to the bar's, the rest to the kitchen's. */
export function byHeading(kinds: KotKindFull[], heading: Heading | null): KotKindFull | undefined {
  return kinds.find((k) => k.role === (heading === "bar" || heading === "alcohol" ? "bar" : "food"));
}
export function routingAbout(kinds: KotKindFull[]): string {
  const bar = kinds.find((k) => k.role === "bar")?.name ?? "Bar";
  const food = kinds.find((k) => k.role === "food")?.name ?? "Kitchen";
  return `Filled in from each section's tax heading: Bar and Alcohol to the ${bar}, the rest to the ${food}. Change the odd one. Add-ons go with their dish.`;
}
/** The choices of one section's "prints on", the web's select in its order. */
export function routeChoices(kinds: KotKindFull[], heading: Heading | null): { id: string | null; label: string }[] {
  return [{ id: null, label: `${byHeading(kinds, heading)?.name ?? "Kitchen"} (by its heading)` },
    ...kinds.map((k) => ({ id: k.id, label: k.name }))];
}
export function routedWords(kinds: KotKindFull[], section: { name: string; heading: Heading | null }, kindId: string | null): string {
  const name = kindId ? kinds.find((k) => k.id === kindId)?.name : byHeading(kinds, section.heading)?.name;
  return `${section.name} prints on the ${name} KOT`;
}
/** A KOT kind's name: 1 to 30 letters (KindDialog). */
export const kindNameReady = (name: string) => name.trim() !== "" && name.trim().length <= 30;

export const KOT_TODAY: KotDesign = {
  dishSize: "normal", numberSize: "normal",
  show: { waiter: false, covers: false, time: true, kind: true, notes: true, orderNo: true },
  heading: null, widthMm: 80,
};
export const SIZES: { value: KotSize; label: string }[] = [
  { value: "small", label: "Small" }, { value: "normal", label: "Normal" }, { value: "large", label: "Large" },
];
export const LINE_LABEL: Record<keyof KotDesign["show"], string> = {
  waiter: "Waiter", covers: "Covers", time: "Time sent", kind: "The KOT kind (KITCHEN, BAR)",
  notes: "Notes", orderNo: "The order number",
};
export const sameDesign = (a: KotDesign, b: KotDesign) => JSON.stringify(a) === JSON.stringify(b);
/** What is sent: a blank heading is none. */
export const designBody = (d: KotDesign): KotDesign => ({ ...d, heading: d.heading?.trim() || null });
/** DocketSlip.tsx's sizes, for the preview. */
export const DISH_PX: Record<KotSize, number> = { small: 12, normal: 13, large: 16 };
export const NUMBER_PX: Record<KotSize, number> = { small: 18, normal: 22, large: 28 };
export const TABLE_PX: Record<KotSize, number> = { small: 12, normal: 13, large: 18 };

/* ── Taxes (TaxRulesCard.tsx) ──────────────────────────────────────── */

export const TAX_LABEL: Record<TaxKind, string> = {
  room: "Rooms", restaurant: "Restaurant", bar: "Bar", banquet: "Banquet", spa: "Spa",
  alcohol: "Alcohol", laundry: "Laundry", other: "Everything else",
};
export const TAX_WHAT: Record<TaxKind, string> = {
  room: "The night, and everything the front desk adds to it - an early arrival, a late departure, transport.",
  restaurant: "Food and non-alcoholic drink, on any menu category set to it.",
  bar: "What the bar sells under GST - soft drinks, mocktails, snacks. Alcohol itself is VAT, under its own heading, where the property serves it.",
  banquet: "Hall hire and the packages sold with it.",
  spa: "Treatments, when they go on the room bill. Its own rate, and its own decision.",
  alcohol: "Beer, wine and spirits, on any menu category set to it. VAT, not GST: one VAT line on the bill, never split into CGST and SGST, and kept off the GST invoice. Your accountant confirms the rate.",
  laundry: "A guest's laundry, charged to the room bill. Its own rate - your accountant confirms it.",
  other: "Anything that belongs under none of the above.",
};
export const taxName = (kind: TaxKind) => (kind === "alcohol" ? "VAT" : "GST");
/** Rooms' code when nobody has said another: what invoices have always carried. */
export const sacShown = (r: Pick<TaxKindRules, "kind" | "sac">) => r.sac ?? (r.kind === "room" ? "996311" : DASH);

/** One slab's words beside its rate. */
export function slabWords(rules: TaxKindRules, s: TaxSlab): string {
  const band = s.overAmount === 0
    ? rules.slabs.some((o) => o.overAmount > 0) ? "up to the next band" : "on everything"
    : `above ${rupees(s.overAmount)}`;
  const when = [s.validFrom && `from ${dayShort(s.validFrom)}`, s.validTo && `until ${dayShort(shiftDay(s.validTo, -1))}`]
    .filter(Boolean).join(" ");
  return when ? `${band} ${when}` : band;
}

/** Categories selling under a heading with no rate: the one thing here that stops a till. */
export function orphaned(setup: TaxSetup): string[] {
  return setup.categories.filter((c) => {
    if (c.kind === null) return true;
    const k = setup.kinds.find((x) => x.kind === c.kind);
    return !k || k.slabs.length === 0;
  }).map((c) => c.name);
}
export const orphanedLine = (names: string[]) =>
  `${names.length === 1 ? "One menu category sells" : `${names.length} menu categories sell`} under a heading with no rate set - ${names.join(", ")}. The till will refuse those items rather than bill them at nothing.`;

/** One band being edited (TaxRulesCard.tsx Draft): its From and its LAST DAY as the person sees them
    ("" for none, the phone's own picker since M-16). The server keeps `validTo` as the day AFTER the
    last day, so the last day shown is the day before it, and the day after it is sent. */
export interface SlabRow { overAmount: string; rate: string; note: string; validFrom: string; lastDay: string }
export const slabRows = (rules: TaxKindRules): SlabRow[] => (rules.slabs.length > 0
  ? rules.slabs.map((s) => ({ overAmount: String(s.overAmount), rate: String(s.rate), note: s.note ?? "", validFrom: s.validFrom ?? "", lastDay: s.validTo ? shiftDay(s.validTo, -1) : "" }))
  : [{ overAmount: "0", rate: "", note: "", validFrom: "", lastDay: "" }]);
/** A new band (the web's "Add a band" row: above 7,500, no rate). */
export const newBand = (): SlabRow => ({ overAmount: "7500", rate: "", note: "", validFrom: "", lastDay: "" });
/** What is sent (SlabsDialog save): a row with no rate is left out; an empty From is none, the Last day
    goes as the day after it. */
export const slabsBody = (rows: SlabRow[]) => ({
  slabs: rows.filter((r) => r.rate.trim() !== "").map((r) => ({
    overAmount: Number(r.overAmount) || 0,
    rate: Number(r.rate),
    note: r.note.trim() || null,
    validFrom: r.validFrom || null,
    validTo: r.lastDay ? shiftDay(r.lastDay, 1) : null,
  })),
});
/** A rate typed that is not a figure: nothing is sent (the web would send NaN as null). */
export const slabsBad = (rows: SlabRow[]) =>
  rows.some((r) => r.rate.trim() !== "" && (!Number.isFinite(Number(r.rate)) || !Number.isFinite(Number(r.overAmount || "0"))));
export const slabsSaved = (kind: TaxKind, slabs: number) => ({
  title: `${TAX_LABEL[kind]} ${taxName(kind)} saved`,
  body: slabs === 0 ? "Cleared. Nothing under this heading can be billed until a rate is set." : `${slabs} ${slabs === 1 ? "rate" : "rates"}.`,
});
/** The tax card's half (CategoryKinds): Not set may be chosen; Alcohol only
    where served, or still drawn for a section already set to it. */
export function taxHeadings(servesAlcohol: boolean, current: TaxKind | null): { value: TaxKind | ""; label: string }[] {
  return [
    { value: "", label: "Not set" },
    { value: "restaurant", label: "Restaurant" }, { value: "bar", label: "Bar" }, { value: "banquet", label: "Banquet" },
    ...(servesAlcohol || current === "alcohol" ? [{ value: "alcohol" as const, label: "Alcohol (VAT)" }] : []),
    { value: "other", label: "Everything else" },
  ];
}
