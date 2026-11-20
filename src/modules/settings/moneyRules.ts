/* ══════════════════════════════════════════════════════════════════
   SETTINGS → RATES AND TAX, AND MONEY: THE SHAPES AND RULES (lane
   m13-set-money, 20 Nov, M-13). Ported by hand from the PMS at its 16 Nov
   release (/home/user/hotelsfidato-ai/pms), each with its source:

     Payment methods, Extra charges, Pickup and drop, Room discounts,
     Commission   src/modules/finance/data/money.ts, pages/money/*.tsx;
                  api/src/modules/finance/money.ts (the routes, their checks
                  and sentences)
     Taxes        src/modules/finance/data/tax.ts, flows/TaxRulesCard.tsx;
                  api/src/modules/finance/tax.ts
     Rate plans   src/modules/inventory/pages/RatePlans.tsx (planRows, the
                  editor's steps), data/planSettings.ts;
                  api/src/modules/inventory/planSettings.ts, pricing.ts
                  (PUT pricing/basis 300-350, pricing/addon 532-600)
     Meal plans   src/modules/inventory/pages/MealPlans.tsx, data/planSettings.ts
     Who may      api/src/roleGate.ts 201-211 (GST, PRICE, COMMISSION,
                  MONEY_SETTING), 174 SETUP_CHANGE (PATCH front-desk: the
                  early and late fees), 849-875 see(), 1022-1025 (the money
                  reads), 1103-1106 (plan-settings, rate-plans: PRICES),
                  1289-1329 WHO, allows, whoMay, refusalFor

   THE FIGURE RULES (CLAUDE.md, MEMORY 9, BRIEF-T4): every figure, rate and
   percentage is the server's, drawn as sent (paise kept: inventory rates.ts
   rupees); a missing one is a dash, never 0. What a person types is kept to
   what can be sent (digits, one point, two places: rates.ts typedPrice) and
   sent as typed: blank is null ("included at no charge", "no fee", "no
   commission agreed"), never Number("") || 0. No tax, price or commission
   is worked out here. The one sum is the web's own green offset on Rate
   plans (a plan's price less the master's, both the server's), done in
   whole paise so no float error can show.

   Pure: no React Native here, so moneyRules.check.ts runs under node.
   ══════════════════════════════════════════════════════════════════ */

import { ROLES, can, asRole, type Resource, type Role } from "../../core/menu.ts";
import { DASH, dateShort, rupees, typedPrice, type BreakupDay, type Pricing } from "../inventory/rates.ts";
import { figureOf } from "../inventory/config.ts";

export { DASH, rupees };

/* ══ WHO MAY (roleGate.ts) ═══════════════════════════════════════ */

type Action = "view" | "create" | "edit";
export interface Grant { resource: readonly Resource[]; action: Action; doing: string; also: readonly Role[] }

const grant = (resource: Resource | readonly Resource[], action: Action, doing: string, also: readonly Role[] = []): Grant =>
  ({ resource: ([] as Resource[]).concat(resource), action, doing, also });

/** roleGate.ts WHO. */
const WHO: Readonly<Record<Role, string>> = {
  owner: "the owner", admin: "an administrator", gm: "the general manager", hotel_manager: "the hotel manager",
  revenue_manager: "the revenue manager", front_desk: "reception", housekeeping: "housekeeping",
  kitchen_manager: "the kitchen manager", chef: "a chef", pos: "a waiter", bar: "a bar person",
  stores: "the Inventory Manager", finance: "the accountant", read_only: "a viewer", automation: "an automation account",
};

/* 1022-1025: GET payment-methods, extra-charges, discounts, commission. */
export const MONEY_READ = grant("setting", "view", "Reading the money settings");
/* 211: every write of the three lists, a method made the default. */
export const MONEY_SETTING = grant("room_config", "edit", "Changing the hotel's money settings");
/* 174, 666: PATCH front-desk - the early check-in and late check-out fees. */
export const SETUP_CHANGE = grant("room_config", "edit", "Changing the hotel's setup");
/* 210, 446: PUT booking-sources/:id/commission. */
export const COMMISSION = grant("commission", "edit", "Setting a booking source's commission");
/* 201, 428-430: PUT tax/:kind, tax/:kind/sac, PATCH menu-categories/:name/tax-kind - and the accountant. */
export const GST = grant("room_config", "edit", "Setting GST", ["finance"]);
/* 205: PUT pricing/basis, pricing/addon, plan-settings, meal-days. */
export const PRICE = grant("rate", "edit", "Setting a price");
/* 874, 1103: GET plan-settings, pricing. */
export const PRICES = grant("rate", "view", "Reading prices");
/* 945: GET booking-sources (the Rate plan's "Who sells it"). */
export const SOURCES_READ = grant(["reservation", "commission"], "view", "Reading booking sources");

export const allows = (g: Grant, role: Role) => g.resource.some((r) => can(role, g.action, r)) || g.also.includes(role);
export const whoMay = (g: Grant): Role[] => ROLES.filter((r) => r !== "automation" && allows(g, r));
const list = (names: string[]) =>
  names.length <= 1 ? names.join("") : `${names.slice(0, -1).join(", ")} or ${names[names.length - 1]}`;
/** roleGate.ts refusalFor: what a refused person reads. */
export const refusalFor = (g: Grant) => `${g.doing} is for ${list(whoMay(g).map((r) => WHO[r]))}. Ask one of them.`;
/** null when the API lets this role through, else its sentence (an unknown role is a viewer). */
export const whyNot = (g: Grant, role: string | null): string | null => (allows(g, asRole(role)) ? null : refusalFor(g));

/* ══ AN UNKNOWN OUTCOME, AND FRESH AFTER A WRITE ══════════════════
   None of these routes reads an idempotency key (api/src: only refunds,
   postings, housekeeping, minibar, banquet, loyalty, night audit and pos
   do). The unknown outcome is the core's stop book (src/core/stop.ts,
   ui.tsx useScreenStop), one for the app, named "settings/<code>/<page>".

   FRESH AFTER A WRITE (the review of 20 Nov, MSET-M5): every write here
   that opens from a sheet REPLACES a whole set - PUT tax/:kind deletes and
   re-inserts every band (tax.ts 226-236), PUT plan-settings sources the
   same (planSettings.ts 117-125). After a save, a sheet opened from the
   last read would carry the old set, and its Save would send it back. So a
   page's writes stay grey after each one that landed until a read that
   BEGAN after its end has come back good. Ordered by the stop book's own
   counter (`begin`), so a read already on its way when the write ended
   never counts. Kept outside React, by the same name. */

export interface FreshBook {
  /** A write under `name` has just ended (answered yes). */
  wrote(name: string): void;
  /** A read that began at `ticket` came back good. */
  seen(name: string, ticket: { n: number }): void;
  /** True while no read begun after the last write's end has come back. */
  stale(name: string): boolean;
}
export function freshBook(book: { begin: () => { n: number } }): FreshBook {
  const wrote = new Map<string, number>();
  return {
    wrote: (name) => { wrote.set(name, book.begin().n); },
    seen: (name, ticket) => { const w = wrote.get(name); if (w !== undefined && ticket.n > w) wrote.delete(name); },
    stale: (name) => wrote.has(name),
  };
}

/* ══ WHAT IS TYPED ════════════════════════════════════════════════ */

/** A price, a fee, a percentage: digits, one point, two places (rates.ts). */
export const typedFigure = typedPrice;
/** A room type's difference may be below the master (pricing.ts 560): a leading minus, then a figure. */
export const typedSigned = (text: string) => (text.trim().startsWith("-") ? "-" : "") + typedPrice(text);
/** What a field holds, null when nothing (config.ts figureOf: "" and "-" are not a number). */
export { figureOf };

/** The list's search (MoneyList.tsx 36). */
export const matches = (name: string, search: string) => name.toLowerCase().includes(search.trim().toLowerCase());

/** The drag of MoneyList and Rate plans, as a phone does it: one place up (-1) or down (+1). The
    whole list's ids in their new order, or null at an end. */
export function moved<T>(ids: readonly T[], id: T, by: -1 | 1): T[] | null {
  const i = ids.indexOf(id);
  const j = i + by;
  if (i < 0 || j < 0 || j >= ids.length) return null;
  const out = [...ids];
  [out[i], out[j]] = [out[j]!, out[i]!];
  return out;
}

/* ══ PAYMENT METHODS ══════════════════════════════════════════════ */

export interface PaymentMethodRow { id: string; label: string; kind: string; isActive: boolean; used: boolean }
export interface PaymentMethodsView { methods: PaymentMethodRow[]; defaultMethod: string; kinds: Record<string, string> }

/** PaymentMethods.tsx 54-56: what it is in the books, by the server's own words. */
export const kindWords = (v: PaymentMethodsView, kind: string) => v.kinds[kind] ?? kind;
export const isDefault = (v: PaymentMethodsView, m: PaymentMethodRow) => m.label === v.defaultMethod;
/** MethodDialog 117: a name and a kind. */
export const methodReady = (label: string, kind: string) => label.trim() !== "" && kind !== "";
/** MethodDialog 112-113: Make default only for one that is On (a switched-off method is not offered). */
export const whyNotDefault = (m: PaymentMethodRow) => (m.isActive ? null : "Switch it On first: a method that is Off is not offered.");

/* ══ EXTRA CHARGES, PICKUP AND DROP ═══════════════════════════════ */

export interface ExtraCharge {
  id: string; name: string; description: string | null;
  /** Null: included at no charge - never a zero (065). */
  rate: number | null;
  category: string; isTransport: boolean; isActive: boolean; used: boolean;
}
export interface ExtraChargesView { charges: ExtraCharge[]; earlyCheckinCharge: number | null; lateCheckoutCharge: number | null }

/** ExtraCharges.tsx COLUMNS: the bill's columns, in the web's order. */
export const COLUMNS: readonly { value: string; label: string }[] = [
  { value: "misc", label: "Other charges" }, { value: "food", label: "Food" }, { value: "beverage", label: "Beverage" },
  { value: "spa", label: "Spa" }, { value: "laundry", label: "Laundry" }, { value: "minibar", label: "Minibar" },
  { value: "telephone", label: "Telephone" }, { value: "room", label: "Room" },
];
export const columnOf = (category: string) => COLUMNS.find((x) => x.value === category)?.label ?? category;
/** ExtraCharges.tsx price: blank is "Included, no charge", a figure to the paisa. */
export const chargePrice = (rate: number | null) => (rate === null ? "Included, no charge" : rupees(rate));
export const chargeLine = (x: ExtraCharge) => `${chargePrice(x.rate)} · ${columnOf(x.category)}`;
export const chargesOf = (v: ExtraChargesView, transport: boolean) => v.charges.filter((x) => x.isTransport === transport);

/** ChargeDialog 136-137: the body, blank price null (065). */
export const chargeBody = (name: string, rate: string, category: string, isTransport: boolean) =>
  ({ name: name.trim(), rate: figureOf(rate), category, isTransport });

/** EarlyLate: blank is "no fee for this", not ₹0 (063). */
export const feesBody = (early: string, late: string) => ({ earlyCheckinCharge: figureOf(early), lateCheckoutCharge: figureOf(late) });
export const feesChanged = (early: string, late: string, v: Pick<ExtraChargesView, "earlyCheckinCharge" | "lateCheckoutCharge">) =>
  figureOf(early) !== v.earlyCheckinCharge || figureOf(late) !== v.lateCheckoutCharge;
export const feeText = (n: number | null) => (n === null ? "" : String(n));

/* ══ ROOM DISCOUNTS ═══════════════════════════════════════════════ */

export interface Discount { id: string; name: string; percent: number | null; amount: number | null; isActive: boolean; used: boolean }

/** Discounts.tsx off: a dash if the server ever sends neither (the web would say ₹0). */
export const discountOff = (d: Discount) =>
  d.percent !== null ? `${d.percent}% off each night` : d.amount !== null ? `${rupees(d.amount)} off each night` : DASH;

/** DiscountDialog 77-80 and the API's discountProblem (money.ts 296-305), its words. null while the
    figure is blank (the button is grey) or when it may go. */
export function discountProblem(by: "percent" | "amount", text: string): string | null {
  const n = figureOf(text);
  if (n === null) return null;
  if (by === "percent") return n > 0 && n <= 100 ? null : "A percentage is above 0 and at most 100.";
  return n > 0 ? null : "An amount is above ₹0.";
}
export const discountReady = (name: string, by: "percent" | "amount", text: string) =>
  name.trim() !== "" && figureOf(text) !== null && discountProblem(by, text) === null;
export const discountBody = (name: string, by: "percent" | "amount", text: string) => {
  const n = figureOf(text);
  return { name: name.trim(), percent: by === "percent" ? n : null, amount: by === "amount" ? n : null };
};

/* ══ COMMISSION ═══════════════════════════════════════════════════ */

export interface CommissionView {
  sources: { id: string; name: string; kind: string; commissionPct: number | null }[];
  contracts: { id: string; name: string; companyId: string; company: string; validFrom: string; validTo: string | null; commissionPct: number }[];
}
/** Commission.tsx 54-55. */
export const contractLine = (k: CommissionView["contracts"][number]) =>
  `${k.name} · from ${dateShort(k.validFrom)}${k.validTo ? ` to ${dateShort(k.validTo)}` : ""}`;
/** Commission.tsx 79: the words after Save. */
export const commissionSaved = (name: string, value: number | null) => `${name}: ${value === null ? "no commission" : `${value}%`}`;

/* ══ TAXES ════════════════════════════════════════════════════════ */

export type TaxKind = "room" | "restaurant" | "bar" | "banquet" | "spa" | "alcohol" | "laundry" | "other";
export interface TaxSlab {
  id: string; overAmount: number; rate: number; note: string | null; setBy: string | null;
  /** Half-open by the business date: null from = always, null to = current. */
  validFrom: string | null; validTo: string | null;
}
export interface TaxKindRules { kind: TaxKind; sac: string | null; slabs: TaxSlab[] }
export interface TaxSetup { servesAlcohol: boolean; kinds: TaxKindRules[]; categories: { name: string; kind: TaxKind | null; items: number }[] }

/** TaxRulesCard.tsx LABEL. */
export const TAX_LABEL: Record<TaxKind, string> = {
  room: "Rooms", restaurant: "Restaurant", bar: "Bar", banquet: "Banquet", spa: "Spa", alcohol: "Alcohol", laundry: "Laundry", other: "Everything else",
};
/** TaxRulesCard.tsx WHAT. */
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
/** Only alcohol is VAT (D21-91). */
export const taxName = (kind: TaxKind) => (kind === "alcohol" ? "VAT" : "GST");
/** tax.ts sacShown: rooms keep 996311 when nobody said another; the others a dash. */
export const sacShown = (r: Pick<TaxKindRules, "kind" | "sac">) => r.sac ?? (r.kind === "room" ? "996311" : DASH);

const shift = (day: string, n: number) => {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
/** The server keeps the first day a rate does NOT apply; the card says the last day it does. */
export const dayBefore = (day: string) => shift(day, -1);

/** A band's date as the sheet shows it: the first day, or (`last`) the last day it applies; null for none. */
export const dateShortOrNull = (day: string | null, last = false) => (day ? dateShort(last ? dayBefore(day) : day) : null);

/** KindTile 170-180: the band's words, and when it applies. */
export function slabWords(s: TaxSlab, rules: TaxKindRules): { where: string; when: string | null } {
  const where = s.overAmount === 0
    ? rules.slabs.some((o) => o.overAmount > 0) ? "up to the next band" : "on everything"
    : `above ${rupees(s.overAmount)}`;
  const when = [s.validFrom && `from ${dateShort(s.validFrom)}`, s.validTo && `until ${dateShort(dayBefore(s.validTo))}`].filter(Boolean).join(" ");
  return { where, when: when || null };
}

/** TaxRulesCard 76-80: a menu category under a heading with no rate stops the till. */
export const orphaned = (setup: TaxSetup) =>
  setup.categories.filter((x) => x.kind === null || !(setup.kinds.find((k) => k.kind === x.kind)?.slabs.length));
export const orphanLine = (names: string[]) =>
  `${names.length === 1 ? "One menu category sells" : `${names.length} menu categories sell`} under a heading with no rate set - ${names.join(", ")}. The till will refuse those items rather than bill them at nothing.`;

/** CategoryKinds' choices, in the web's order: Alcohol only where the property serves it, or the
    section is already set to it. "" is Not set (null). */
export const categoryChoices = (servesAlcohol: boolean, current: TaxKind | null) => [
  { value: "", label: "Not set" }, { value: "restaurant", label: "Restaurant" }, { value: "bar", label: "Bar" },
  { value: "banquet", label: "Banquet" },
  ...(servesAlcohol || current === "alcohol" ? [{ value: "alcohol", label: "Alcohol (VAT)" }] : []),
  { value: "other", label: "Everything else" },
];

/** One band being edited. The dates are kept exactly as the server sent them (the phone has no date
    picker: they are shown, not changed - BRIEF-T4), so a save never moves a period. */
export interface SlabDraft { overAmount: string; rate: string; note: string; validFrom: string | null; validTo: string | null }
export const draftsOf = (r: TaxKindRules): SlabDraft[] =>
  r.slabs.length > 0
    ? r.slabs.map((s) => ({ overAmount: String(s.overAmount), rate: String(s.rate), note: s.note ?? "", validFrom: s.validFrom, validTo: s.validTo }))
    : [{ overAmount: "0", rate: "", note: "", validFrom: null, validTo: null }];
/** SlabsDialog "Add a band": a band above ₹7,500 (the web's own starting figure), no rate. */
export const newBand = (): SlabDraft => ({ overAmount: "7500", rate: "", note: "", validFrom: null, validTo: null });
export const firstRate = (): SlabDraft => ({ overAmount: "0", rate: "", note: "", validFrom: null, validTo: null });

export type SlabBody = { overAmount: number; rate: number; note: string | null; validFrom: string | null; validTo: string | null };

/** SlabsDialog save (TaxRulesCard 203-213), stricter where the web guesses: the web drops a row whose
    rate is blank (and so can clear a whole heading unasked) and sends a blank amount as 0
    (Number(x) || 0). Here a blank is never sent: the row is finished or removed. The rate's range is
    the API's own check and sentence (tax.ts 162-165). */
export function slabsBody(kind: TaxKind, rows: readonly SlabDraft[]): { slabs: SlabBody[] } | { problem: string } {
  for (const r of rows) {
    const rate = figureOf(r.rate);
    if (rate === null) return { problem: "Type the rate on every row, or remove the row." };
    if (!(rate >= 0 && rate <= 100)) return { problem: `A ${taxName(kind)} rate is a percentage between 0 and 100.` };
    if (figureOf(r.overAmount) === null) return { problem: "Type the amount each band starts above - 0 for everything." };
  }
  return {
    slabs: rows.map((r) => ({
      overAmount: Number(r.overAmount), rate: Number(r.rate), note: r.note.trim() || null, validFrom: r.validFrom, validTo: r.validTo,
    })),
  };
}

/** The API's own check of a code (tax.ts 255-257): 4, 6 or 8 digits, or blank to clear it. */
export const sacProblem = (text: string) =>
  text.trim() === "" || /^(\d{4}|\d{6}|\d{8})$/.test(text.trim()) ? null : "An HSN or SAC code is 4, 6 or 8 digits, like 996311.";
export const sacValue = (text: string) => text.trim() || null;

/** SlabsDialog 220-226: the words after Save. */
export const taxSaved = (kind: TaxKind, slabs: number) => ({
  title: `${TAX_LABEL[kind]} ${taxName(kind)} saved`,
  body: slabs === 0 ? "Cleared. Nothing under this heading can be billed until a rate is set." : `${slabs} ${slabs === 1 ? "rate" : "rates"}.`,
});
export const NO_RATES = "With no rates, nothing under this heading can be billed - the desk and the till will refuse it and say why. That is the right state for something the property does not sell yet.";

/* ══ MEAL PLANS BY DAY ════════════════════════════════════════════ */

export type Day = "arrival" | "stay" | "departure";
export interface MealDays { mealPlan: string; breakfast: Day[]; lunch: Day[]; dinner: Day[] }
export interface PlanSetting { roomTypeId: string; mealPlan: string; isActive: boolean; position: number; sources: string[] }
export interface PlanSettings { plans: PlanSetting[]; mealDays: MealDays[] }
export type Meal = "breakfast" | "lunch" | "dinner";

/** MealPlans.tsx PLANS, MEALS, DAYS. */
export const MEAL_PLANS = [
  { code: "CP", name: "Breakfast (CP)" }, { code: "MAP", name: "MAP" }, { code: "AP", name: "AP" }, { code: "AI", name: "All inclusive (AI)" },
] as const;
export const MEALS: readonly Meal[] = ["breakfast", "lunch", "dinner"];
export const MEAL_DAYS: readonly { day: Day; label: string; short: string }[] = [
  { day: "arrival", label: "Check-in day", short: "Check-in" },
  { day: "stay", label: "Stay-over days", short: "Stay-over" },
  { day: "departure", label: "Check-out day", short: "Check-out" },
];

const MEAL_NAMES: Record<Meal, string> = { breakfast: "Breakfast", lunch: "Lunch", dinner: "Dinner" };
const DAY_WORDS: Record<Day, string> = { arrival: "check-in", stay: "stay-over", departure: "check-out" };

/** planSettings.ts mealDaysInWords: or null when nothing is said. */
export function mealDaysInWords(days: Omit<MealDays, "mealPlan"> | undefined): string | null {
  if (!days) return null;
  const parts = MEALS.filter((m) => days[m].length > 0).map((m, i) => {
    const words = (["arrival", "stay", "departure"] as const).filter((d) => days[m].includes(d)).map((d) => DAY_WORDS[d]);
    const said = words.length > 1 ? `${words.slice(0, -1).join(", ")} and ${words[words.length - 1]}` : words[0];
    return `${i === 0 ? MEAL_NAMES[m] : MEAL_NAMES[m].toLowerCase()} on ${said} days`;
  });
  return parts.length ? parts.join("; ") : null;
}

export const flipDay = (held: Record<Meal, Day[]>, meal: Meal, day: Day): Record<Meal, Day[]> =>
  ({ ...held, [meal]: held[meal].includes(day) ? held[meal].filter((d) => d !== day) : [...held[meal], day] });

/* ══ RATE PLANS ═══════════════════════════════════════════════════ */

export const PLANS = ["EP", "CP", "MAP", "AP", "AI"] as const;
export type Plan = (typeof PLANS)[number];
export const PLAN_NAME: Record<Plan, string> = { EP: "Room only (EP)", CP: "Breakfast (CP)", MAP: "MAP", AP: "AP", AI: "All inclusive (AI)" };
export type PlanKind = "master" | "derived" | "independent";
export const KIND_WORDS: Record<PlanKind, string> = { master: "Master", derived: "Derived", independent: "Independent" };

export interface PlanRow {
  key: string; roomTypeId: string; roomType: string; plan: Plan; name: string;
  kind: PlanKind; price: number | null; offset: number | null; setting: PlanSetting | undefined;
}

/** The master's price taken from another's, both the server's, in whole paise (no float error). */
const less = (a: number, b: number) => (Math.round(a * 100) - Math.round(b * 100)) / 100;

/** RatePlans.tsx planRows: every active room type, on room only and on each meal plan the hotel
    sells (its add-on set); the master first, then the order the owner set. */
export function planRows(pricing: Pricing, days: readonly (BreakupDay | undefined)[], settings: readonly PlanSetting[]): PlanRow[] {
  const basis = pricing.basis?.roomTypeId ?? null;
  const masterEP = basis ? days[pricing.roomTypes.findIndex((x) => x.id === basis)]?.EP ?? null : null;
  const sold = PLANS.filter((p) => p === "EP" || pricing.addons[p as "CP"] !== null);
  const at = new Map(settings.map((s) => [`${s.roomTypeId}/${s.mealPlan}`, s]));
  const rows: (PlanRow & { sort: number })[] = [];
  pricing.roomTypes.forEach((type, i) => {
    const day = days[i];
    const typeKind: PlanKind = !basis ? "independent" : type.id === basis ? "master" : type.difference ? "derived" : "independent";
    sold.forEach((p, j) => {
      const price = day ? day[p] : null;
      const setting = at.get(`${type.id}/${p}`);
      rows.push({
        key: `${type.id}/${p}`, roomTypeId: type.id, roomType: type.name, plan: p, name: `${type.name} · ${PLAN_NAME[p]}`,
        kind: p === "EP" ? typeKind : "derived", price, setting,
        offset: price !== null && masterEP !== null && !(type.id === basis && p === "EP") ? less(price, masterEP) : null,
        sort: setting?.position ?? (i + 1) * 100 + j,
      });
    });
  });
  const root = (r: PlanRow) => r.kind === "master" && r.plan === "EP";
  return rows.sort((a, b) => (root(a) ? -1 : root(b) ? 1 : a.sort - b.sort)).map(({ sort: _, ...r }) => r);
}

/** The green figure beside a plan's price: "+₹500", "-₹250.50"; none for 0 or unknown. */
export const offsetWords = (offset: number | null) =>
  offset === null || offset === 0 ? null : `${offset > 0 ? "+" : "-"}${rupees(Math.abs(offset))}`;

/** PlanEditor 230-232: what a row may be. */
export function kindsFor(row: PlanRow, basis: Pricing["basis"]): PlanKind[] {
  if (row.plan !== "EP") return ["derived"];
  if (!basis) return ["master", "independent"];
  return row.roomTypeId === basis.roomTypeId ? ["master"] : ["master", "derived", "independent"];
}

export type Difference = { amount: number; unit: "rupees" | "percent" } | null;
export type PlanStep =
  | { what: "basis"; roomTypeId: string }
  | { what: "addon"; body: { kind: "room_type"; roomTypeId: string; amount: number | null; unit: "rupees" | "percent" } }
  | { what: "sources"; sources: string[] };

/** PlanEditor save (RatePlans.tsx 195-214): the writes, in the web's order. The difference is sent
    as typed (blank clears it, as the web); the server rounds a percentage's price. */
export function planSteps(row: PlanRow, was: Difference, kind: PlanKind, amount: string, unit: "rupees" | "percent", chosen: readonly string[]): PlanStep[] {
  const steps: PlanStep[] = [];
  const roomOnly = row.plan === "EP";
  if (roomOnly && kind !== row.kind) {
    if (kind === "master") steps.push({ what: "basis", roomTypeId: row.roomTypeId });
    if (kind === "independent") steps.push({ what: "addon", body: { kind: "room_type", roomTypeId: row.roomTypeId, amount: null, unit: "rupees" } });
  }
  if (roomOnly && kind === "derived") {
    const value = figureOf(amount);
    if (value !== (was?.amount ?? null) || unit !== (was?.unit ?? "rupees")) {
      steps.push({ what: "addon", body: { kind: "room_type", roomTypeId: row.roomTypeId, amount: value, unit } });
    }
  }
  const before = new Set(row.setting?.sources ?? []);
  if (chosen.length !== before.size || chosen.some((s) => !before.has(s))) steps.push({ what: "sources", sources: [...chosen] });
  return steps;
}

/** What the editor asks before it sends (each phone's own dialog), or null. Making a type the master
    moves every derived plan (the web's own warning); clearing a type's difference - Independent, or the
    difference left blank - sends PUT pricing/addon {amount: null}, and its plans then have no price
    unless the type has its own base on Rates (the review of 20 Nov, MSET-M6). */
export function planAsk(row: PlanRow, steps: readonly PlanStep[]): { title: string; message: string; act: string } | null {
  if (steps.some((s) => s.what === "basis")) {
    return { title: `Make ${row.roomType} the master?`, message: "Making it the master moves every derived plan to follow it.", act: "Make it the master" };
  }
  if (steps.some((s) => s.what === "addon" && s.body.amount === null)) {
    return {
      title: `Clear ${row.roomType}'s difference?`,
      message: `${row.roomType} will no longer follow the master. Its plans lose their price unless ${row.roomType} has its own base on Rates.`,
      act: "Clear the difference",
    };
  }
  return null;
}

/** The editor's summary line (RatePlans.tsx 323-325). */
export const planPriceLine = (price: number | null) => (price === null ? "Not priced yet" : `${rupees(price)} per night, two guests`);
