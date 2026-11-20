/* ══════════════════════════════════════════════════════════════════
   THE MENU AS THE HOTEL KEEPS IT, THE RULES — the m13-pos-setup lane (19 Nov).
   Ported by hand from today's PMS (16 Nov release), read only:
     src/modules/pos/pages/Menu.tsx                the screen: dishes, prices, MRP,
       variations (D27-192), sides (D21-41), off and back on, promotions
     src/modules/pos/components/NumberedAddonsTab.tsx the Add-ons tab (D27-289, D27-291)
     src/modules/pos/components/DishProfitTab.tsx  Profit per dish (D27-383 item 9)
     src/modules/pos/data/till.ts 17-125, 202-215, 764-850, 896-975, 1186-1420, 1572-1585
   PRICES ARE TYPED, NEVER DEFAULTED (CLAUDE.md, the web's POS-14, D27-120):
   a blank is not zero; a 0 only when Free is ticked; every price is sent
   as the text typed where the web sends text, as the number typed where it
   sends a number. Pure: menuEdit.check.ts runs it under node.
   ══════════════════════════════════════════════════════════════════ */

import { DASH } from "../../core/format.ts";
import { msAt } from "../../core/format.ts";
import { chooseRule, typesOf } from "./pad.ts";
import { paise } from "./setup.ts";
import type { AddonGroup, MenuCategory, MenuItem, MenuVariation, NumberedAddon, SectionHeading, VariationKind } from "./types";

/* ── The shapes the menu screen reads beyond the till's (data/till.ts) ── */

/** A dish as the Menu reads it: the till's, with its MRP (D27-373). */
export type Dish = MenuItem & { mrp?: number | null; variations: (MenuVariation & { mrp?: number | null })[] };
export type Section = Omit<MenuCategory, "items"> & { items: Dish[] };
/** Every group the hotel has, with the dishes that offer it. */
export interface AddonGroupSetup extends AddonGroup { itemIds: string[] }
export interface CustomAddonUsed { name: string; price: number; times: number; qty: number; lastAt: string; by: string | null }
export interface Promo {
  id: string; code: string; name: string; kind: "percent" | "fixed"; value: number; isActive: boolean; used: number;
  coupon?: { from: string; to: string; maxUses: number | null; minBill: number | null } | null;
}
export type NoCost = "no recipe" | "an ingredient has no cost";
export interface DishProfit {
  from: string; to: string;
  dishes: { itemId: string; variationId: string | null; section: string; name: string;
    price: number; cost: number | null; margin: number | null; marginPct: number | null; noCost: NoCost | null }[];
  sold: { itemId: string; variationId: string | null; section: string; name: string;
    qty: number; sales: number; cost: number | null; margin: number | null; noCost: NoCost | null }[];
  totals: { sales: number; costedSales: number; cost: number; margin: number; uncostedSales: number };
}

/* ── Where each goes (data/till.ts) ─────────────────────────────────── */

const T = (code: string) => `/api/hotels/${encodeURIComponent(code)}/till`;
export const M = {
  menu: (code: string) => `${T(code)}/menu`,
  categories: (code: string) => `${T(code)}/menu/categories`,
  items: (code: string) => `${T(code)}/menu/items`,
  item: (code: string, id: string, act: "toggle" | "off" | "on" | "prep" | "course" | "mrp" | "variations") => `${T(code)}/menu/items/${id}/${act}`,
  category: (code: string, id: string, act: "prep" | "course" | "tax-kind") => `${T(code)}/menu/categories/${id}/${act}`,
  addonOff: (code: string, id: string, act: "off" | "on") => `${T(code)}/addons/${id}/${act}`,
  groups: (code: string) => `${T(code)}/menu/addon-groups`,
  group: (code: string, id: string) => `${T(code)}/menu/addon-groups/${id}`,
  groupDishes: (code: string, id: string) => `${T(code)}/menu/addon-groups/${id}/dishes`,
  groupOptions: (code: string, id: string) => `${T(code)}/menu/addon-groups/${id}/addons`,
  option: (code: string, id: string) => `${T(code)}/menu/addons/${id}`,
  optionOff: (code: string, id: string) => `${T(code)}/menu/addons/${id}/remove`,
  promotions: (code: string) => `${T(code)}/promotions`,
  promotion: (code: string, id: string) => `${T(code)}/promotions/${id}`,
  numbered: (code: string, all = false) => `${T(code)}/numbered-addons${all ? "?all=1" : ""}`,
  numberedOne: (code: string, id: string) => `${T(code)}/numbered-addons/${id}`,
  numberedOff: (code: string, id: string, act: "off" | "on") => `${T(code)}/numbered-addons/${id}/${act}`,
  customUsed: (code: string) => `${T(code)}/custom-addons-used`,
  profit: (code: string, from: string, to: string) => `${T(code)}/dish-profit?from=${from}&to=${to}`,
  /** POST `{ rows, dryRun }` (the web's till.ts importMenu, importAddons). */
  imports: (code: string, which: "menu" | "addons") => `${T(code)}/menu/${which === "menu" ? "" : "addon-groups/"}import`,
};

/** The stop an import's lost reply puts on the Menu (ImportSheet.tsx): let go by the read that shows what
    it imported - the dishes for the menu file, the sides (add-on groups) for the sides file. */
export const importStop = (code: string, which: "menu" | "addons") => `pos/${code}/menu/import/${which}`;

/* ── A new dish (CategoryCard add, POS-14, D27-120) ─────────────────── */

/** The rates a hotel restaurant meets: a choice, never a free number. */
export const TAX_RATES = ["0", "5", "12", "18"] as const;

/** A new dish's body, or why not. The price box blank is refused, never 0. */
export function newDish(categoryId: string, name: string, price: string, free: boolean, tax: string):
  { ok: true; body: { categoryId: string; name: string; price: number; taxRate: number; free?: true } } | { ok: false; reason: string } | null {
  const trimmed = name.trim();
  if (!trimmed) return null;
  if (price.trim() === "" && !free) return { ok: false, reason: "Type a price. A blank is not zero - tick Free for a dish that costs nothing." };
  const rupees = free ? 0 : Number(price);
  if (!Number.isFinite(rupees) || rupees < 0) return { ok: false, reason: "A price must be zero or more." };
  const rate = Number(tax);
  if (!Number.isFinite(rate) || rate < 0 || rate > 100) return { ok: false, reason: "A tax rate must be between 0 and 100." };
  return { ok: true, body: { categoryId, name: trimmed, price: rupees, taxRate: rate, ...(free ? { free: true as const } : {}) } };
}

/** A dish's own figures on its row: a dish sold by variation has no price of its own - a dash. */
export const priceShown = (d: Dish) => (d.variations.length > 0 ? DASH : paise(d.price));
/** The rate the till rings it at; a dash, never "0%", when none is set (POS-15). */
export const rateShown = (d: Pick<MenuItem, "taxRate">) => (d.taxRate === null ? DASH : `${d.taxRate}%`);

/* ── Minutes, course, MRP: tap, type, done; empty clears (PrepControl …) ── */

type Parsed = { ok: true; value: number | null } | { ok: false; title: string; body: string };
export function parsePrep(text: string): Parsed {
  const t = text.trim();
  const n = t === "" ? null : Number(t);
  if (n !== null && (!Number.isInteger(n) || n < 1 || n > 480)) {
    return { ok: false, title: "That is not a preparation time",
      body: "A whole number of minutes, from 1 to 480. Leave it empty to clear it and use the category default." };
  }
  return { ok: true, value: n };
}
export function parseCourse(text: string): Parsed {
  const t = text.trim();
  const n = t === "" ? null : Number(t);
  if (n !== null && (!Number.isInteger(n) || n < 1 || n > 9)) {
    return { ok: false, title: "That is not a course",
      body: "A whole number from 1 to 9. Leave it empty for a dish that is not part of the sequence - a drink goes when it is poured." };
  }
  return { ok: true, value: n };
}
export function parseMrp(text: string): Parsed {
  const t = text.replace(/[,₹\s]/g, "");
  const n = t === "" ? null : Number(t);
  if (n !== null && (!Number.isFinite(n) || n <= 0)) return { ok: false, title: "That is not an MRP", body: "A figure above 0, or leave it empty for none." };
  return { ok: true, value: n };
}
/** An untimed dish is a dash, never "0 min"; inherited is starred. `== null` catches an old cached answer too. */
export function prepShown(minutes: number | null | undefined, own: number | null | undefined): string {
  if (minutes == null) return DASH;
  return `${minutes}${own == null ? "*" : ""} min`;
}
export function courseShown(course: number | null | undefined, own: number | null | undefined): string {
  if (course == null) return "Any";
  return `${course}${own == null ? "*" : ""}`;
}
export const mrpShown = (mrp: number | null | undefined) => `MRP ${mrp == null ? DASH : paise(mrp)}`;
/** The box's first words when tapped: the row's own, blank when inherited. */
export const ownText = (own: number | null | undefined) => (own == null ? "" : String(own));

/* ── Off for a while (OffControl): a duration, never a switch ──────── */

export type OffFor = "2h" | "4h" | "8h" | "24h" | "next_business_day";
export const OFF_FOR: { key: OffFor; label: string }[] = [
  { key: "2h", label: "2 hours" }, { key: "4h", label: "4 hours" }, { key: "8h", label: "8 hours" },
  { key: "24h", label: "24 hours" }, { key: "next_business_day", label: "Tomorrow" },
];
/** The Add-ons tab's own list (NumberedAddonsTab.tsx OFF_FOR). */
export const OFF_FOR_NUMBERED: { key: OffFor; label: string }[] = [
  { key: "2h", label: "2 hours" }, { key: "4h", label: "4 hours" }, { key: "8h", label: "8 hours" },
  { key: "next_business_day", label: "Rest of today" },
];
const hm = (ms: number, pad: boolean) => {
  const d = new Date(ms);
  const h = d.getHours() % 12 || 12;
  return `${pad ? String(h).padStart(2, "0") : h}:${String(d.getMinutes()).padStart(2, "0")} ${d.getHours() < 12 ? "am" : "pm"}`;
};
/** Off till a time still to come: "Off till 04:46 pm - put back" (en-IN 2-digit). Null when on. */
export function offTill(offUntil: string | null | undefined, now = Date.now()): string | null {
  const until = msAt(offUntil);
  return until !== null && until > now ? `Off till ${hm(until, true)} - put back` : null;
}
/** The Add-ons tab's "Off until 4:46 pm" (numeric hour). */
export function offUntilShort(offUntil: string | null | undefined, now = Date.now()): string | null {
  const until = msAt(offUntil);
  return until !== null && until > now ? `Off until ${hm(until, false)}` : null;
}
export const offDone = (name: string, until: OffFor) =>
  ({ title: `${name} is off`, body: `Back in ${OFF_FOR.find((o) => o.key === until)?.label.toLowerCase()}.` });
/** The question, and the dishes a shared side goes off on. */
export const offAbout = (alsoOn?: string[]) => ((alsoOn?.length ?? 0) > 1
  ? `For how long? It comes back on by itself. It goes off on every dish that offers it: ${alsoOn!.join(", ")}.`
  : "For how long? It comes back on by itself.");

/** A group of sides is shared: every dish on the menu that offers it. */
export function dishesByGroup(sections: Section[]): Map<string, string[]> {
  const out = new Map<string, string[]>();
  for (const item of sections.flatMap((c) => c.items)) {
    for (const g of item.addonGroups) out.set(g.id, [...(out.get(g.id) ?? []), item.name]);
  }
  return out;
}

/** A section's tax heading on the Menu (D22-4): Not set and Alcohol where no longer served are shown, not chosen. */
export function menuHeadings(servesAlcohol: boolean, current: SectionHeading | null | undefined): { value: SectionHeading | ""; label: string; off?: boolean }[] {
  return [
    ...(!current ? [{ value: "" as const, label: "Not set", off: true }] : []),
    { value: "restaurant", label: "Restaurant" }, { value: "bar", label: "Bar" }, { value: "banquet", label: "Banquet" },
    ...(servesAlcohol || current === "alcohol" ? [{ value: "alcohol" as const, label: "Alcohol (VAT)", off: !servesAlcohol }] : []),
    { value: "other", label: "Everything else" },
  ];
}

/* ── A dish's variations, every type at once (VariationsDialog, D27-192) ── */

export const KINDS: { kind: VariationKind; label: string; names: string[] }[] = [
  { kind: "size", label: "Size", names: ["Small", "Medium", "Large"] },
  { kind: "quantity", label: "Quantity", names: ["Half", "Full"] },
  { kind: "option", label: "Option", names: [] },
];
export type ChoiceRow = { id?: string; label: string; price: string; free: boolean; mrp: string };
export type TypeRow = { kind: VariationKind | null; heading: string; choices: ChoiceRow[] };
export const blankChoice = (): ChoiceRow => ({ label: "", price: "", free: false, mrp: "" });
const priced = (c: { price: string; free: boolean }) => c.free || c.price.trim() !== "";

/** The form's rows from the dish. A ₹0 choice was ticked Free; a carried-over type is not picked yet. */
export function typeRows(item: Dish): TypeRow[] {
  return typesOf(item).map((t) => ({
    kind: t.choices[0]!.kind ?? null,
    heading: t.choices[0]!.heading ?? "",
    choices: t.choices.map((v) => {
      const mrp = (v as { mrp?: number | null }).mrp;
      return { id: v.id, label: v.label, price: v.price === 0 ? "" : String(v.price), free: v.price === 0, mrp: mrp == null ? "" : String(mrp) };
    }),
  }));
}
/** Picking a type fills in the NAMES when its list is untouched - never a price. */
export function pickKind(types: TypeRow[], i: number, kind: VariationKind): TypeRow[] {
  const t = types[i]!;
  const untouched = t.choices.every((c) => !c.label.trim() && !priced(c));
  const names = KINDS.find((k) => k.kind === kind)!.names;
  const next: TypeRow = {
    ...t, kind,
    ...(kind === "option" ? {} : { heading: "" }),
    ...(untouched && names.length > 0 ? { choices: names.map((label) => ({ ...blankChoice(), label })) } : {}),
  };
  return types.map((x, j) => (j === i ? next : x));
}
/** The first type gone: the next one's figures were additions, so they are cleared to be typed as the dish's price. */
export function removeType(types: TypeRow[], i: number): { types: TypeRow[]; moved: boolean } {
  return {
    moved: i === 0 && types.length > 1,
    types: types.filter((_, j) => j !== i).map((t, j) => (i === 0 && j === 0
      ? { ...t, choices: t.choices.map((c) => ({ ...c, price: "", free: false, mrp: "" })) } : t)),
  };
}
export function variationsReady(types: TypeRow[], hadAny: boolean, dishPrice: string, dishFree: boolean): boolean {
  return types.length > 0
    ? types.every((t) => t.kind && (t.kind !== "option" || t.heading.trim())
        && t.choices.length > 0 && t.choices.every((c) => c.label.trim() && priced(c)))
    : hadAny && priced({ price: dishPrice, free: dishFree });
}
/** The whole set, as typed: the server keeps all of it or none. */
export function variationsBody(types: TypeRow[], dishPrice: string, dishFree: boolean) {
  return {
    types: types.map((t, i) => ({
      kind: t.kind!,
      ...(t.kind === "option" ? { heading: t.heading.trim() } : {}),
      choices: t.choices.map((c) => ({
        ...(c.id ? { id: c.id } : {}), label: c.label.trim(), price: c.price, free: c.free,
        ...(i === 0 ? { mrp: c.mrp } : {}) })),
    })),
    ...(types.length === 0 ? { dishPrice, dishFree } : {}),
  };
}
/** One type's line under the dish: "Oil ₹300.00 (MRP -) · Butter ₹400.00 (MRP -)". */
export function variationLine(item: Dish): { heading: string; text: string }[] {
  return typesOf(item).map((t, i) => ({
    heading: t.heading,
    text: t.choices.map((v) => {
      const mrp = (v as { mrp?: number | null }).mrp;
      return `${v.label} ${v.price === 0 ? "Free" : `${i > 0 ? "+" : ""}${paise(v.price)}`}${i === 0 ? ` (MRP ${mrp == null ? DASH : paise(mrp)})` : ""}`;
    }).join(" · "),
  }));
}

/* ── A side: a name and a price, or Free (EntryDialog) ─────────────── */

export function optionForm(label: string, price: string, free: boolean) {
  const typedPrice = price.trim();
  const rupees = Number(typedPrice.replace(/[,₹\s]/g, ""));
  const bad = !free && typedPrice !== "" && (!Number.isFinite(rupees) || rupees < 0);
  return { bad, ready: label.trim() !== "" && (free || typedPrice !== "") && !bad,
    body: { label: label.trim(), price: free ? "" : typedPrice, free } };
}

/* ── A group of sides: how many a guest may choose (GroupDialog) ────── */

export function groupForm(label: string, min: string, max: string) {
  const minBad = !/^\d+$/.test(min.trim());
  const maxN = max.trim() === "" ? null : Number(max.trim());
  const maxBad = maxN !== null && (!/^\d+$/.test(max.trim()) || maxN < 1);
  const crossed = !minBad && !maxBad && maxN !== null && Number(min) > maxN;
  return {
    minError: minBad ? "A whole number." : undefined,
    maxError: maxBad ? "A whole number from 1." : crossed ? "Not fewer than at least." : undefined,
    ready: label.trim() !== "" && !minBad && !maxBad && !crossed,
    body: { label: label.trim(), minSelect: Number(min), maxSelect: maxN },
  };
}
/** "Choose up to 4", or "Any number, or none". */
export function groupRule(min: number, max: number | null): string {
  const rule = chooseRule(min, max);
  return rule ? rule[0]!.toUpperCase() + rule.slice(1) : "Any number, or none";
}
export const groupOn = (names: string[]) => (names.length > 0 ? `On ${names.join(", ")}` : "Not on any dish yet.");
export const dishesSaved = (label: string, n: number) => `${label} is on ${n} dish${n === 1 ? "" : "es"}`;

/* ── A numbered add-on (AddonDialog): the number never changes ────── */

/** The next free number, a suggestion only - never a price. */
export const nextNumber = (list: NumberedAddon[]) => Math.max(0, ...list.filter((a) => a.isActive).map((a) => a.number)) + 1;
export function numberedForm(isNew: boolean, number: string, name: string, description: string, price: string, free: boolean) {
  const n = Number(number.trim());
  const numberBad = isNew && (!/^\d+$/.test(number.trim()) || n < 1 || n > 999);
  const priceN = price.trim() === "" ? null : Number(price.trim());
  /* Rupees and paise as typed: "120" or "120.50", not "12.345" nor "1e2". */
  const priceBad = !free && (priceN === null || !/^\d+(\.\d{1,2})?$/.test(price.trim()) || priceN <= 0);
  const body = { name: name.trim(), description: description.trim() || null, price: free ? 0 : priceN, free };
  return {
    numberError: numberBad ? "A whole number from 1 to 999." : undefined,
    priceError: !free && price.trim() !== "" && priceBad ? "Rupees, more than 0 - like 120 or 120.50. Or tick Free." : undefined,
    ready: name.trim() !== "" && !numberBad && !priceBad,
    body: isNew ? { ...body, number: n } : body,
    n,
  };
}
export const numberedPrice = (a: NumberedAddon) => (a.free ? "Free" : `+${paise(a.price)}`);
export function numberedState(a: NumberedAddon, now = Date.now()): { tone: "neutral" | "warning" | "success"; text: string } {
  if (!a.isActive) return { tone: "neutral", text: "Switched off" };
  const off = offUntilShort(a.offUntil, now);
  return off ? { tone: "warning", text: off } : { tone: "success", text: "In use" };
}
export const customLine = (u: CustomAddonUsed) => `${u.times} ${u.times === 1 ? "time" : "times"}, ${u.qty} in all${u.by ? ` · by ${u.by}` : ""}`;

/* ── Promotions (PromotionDialog) ─────────────────────────────────── */

export function promoForm(isNew: boolean, code: string, name: string, kind: "percent" | "fixed", value: string) {
  const amount = Number(value);
  const bad = !Number.isFinite(amount) || amount <= 0 || (kind === "percent" && amount > 100);
  return {
    error: value.trim() !== "" && bad ? (kind === "percent" ? "Between 0 and 100." : "More than nothing.") : undefined,
    ready: name.trim().length > 0 && (!isNew || code.trim().length > 0) && !bad,
    amount,
  };
}
/** A coupon's part of a new promotion (Menu.tsx PromotionDialog, 261): both days chosen before Save;
    a blank limit is none (null), never a number nobody typed; the days as the API's text. */
export function couponPart(isCoupon: boolean, l: { from: string; to: string; maxUses: string; minBill: string }) {
  if (!isCoupon) return { ready: true, body: {} };
  return {
    ready: l.from !== "" && l.to !== "",
    body: { coupon: {
      from: l.from, to: l.to,
      maxUses: l.maxUses.trim() === "" ? null : Number(l.maxUses),
      minBill: l.minBill.trim() === "" ? null : Number(l.minBill),
    } },
  };
}
export const promoValue = (p: Promo) => (p.kind === "percent" ? `${p.value}%` : rupeesWhole(p.value));
const inrWhole = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const rupeesWhole = (n: number) => inrWhole.format(n);
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const dayShort = (day: string) => `${Number(day.slice(8, 10))} ${MONTHS[Number(day.slice(5, 7)) - 1]} ${day.slice(0, 4)}`;
/** A coupon's dates and limits (261). */
export function couponLine(p: Promo): string | null {
  if (!p.coupon) return null;
  return `Coupon · ${dayShort(p.coupon.from)} to ${dayShort(p.coupon.to)}`
    + (p.coupon.maxUses !== null ? ` · ${p.used} of ${p.coupon.maxUses} used` : "")
    + (p.coupon.minBill !== null ? ` · bills from ${rupeesWhole(p.coupon.minBill)}` : "");
}
export const usedLine = (n: number) => `${n} bill${n === 1 ? "" : "s"}`;

/* ── Profit per dish ──────────────────────────────────────────────── */

/** No cost is a dash, never zero, and the reason beside it. */
export const costShown = (n: number | null) => paise(n);
export const marginPctShown = (n: number | null) => (n === null ? DASH : `${n}%`);
/** The web's first range: the business month to the business date. */
export const firstRange = (businessDate: string) => ({ from: `${businessDate.slice(0, 8)}01`, to: businessDate });
export function profitLine(t: DishProfit["totals"]): { line: string; uncosted: string | null } {
  return {
    line: `Sales ${paise(t.sales)}. Of the dishes with a cost: sales ${paise(t.costedSales)}, cost ${paise(t.cost)}, margin ${paise(t.margin)}.`,
    uncosted: t.uncostedSales > 0 ? `${paise(t.uncostedSales)} was sold of dishes with no cost.` : null,
  };
}

/* ── The dishes in a file (DISH_EXPORT, D27-383 item 1) ───────────── */

export const DISH_COLUMNS = ["Section", "Dish", "Short code", "Price", "Choices", "MRP", "Tax rate", "Veg", "Minutes", "Course", "On sale"] as const;
/** One row per dish, written as the web's file: a price is a price; no rate or MRP is a dash. */
export function dishRows(sections: Section[]): string[][] {
  return sections.flatMap((c) => c.items.map((d) => {
    return [
      c.name, d.name, d.shortCode ?? DASH,
      d.variations.length ? DASH : paise(d.price),
      d.variations.map((v) => `${v.label} ${v.price}`).join(", ") || DASH,
      paise(d.mrp),
      d.taxRate === null ? DASH : `${d.taxRate}%`,
      d.isVeg === null ? DASH : d.isVeg ? "Veg" : "Non-veg",
      d.prepMinutes == null ? DASH : String(d.prepMinutes),
      d.course == null ? DASH : String(d.course),
      /* The web's words: any offUntil on file reads "Off until …". */
      !d.isActive ? "No" : d.offUntil ? `Off until ${d.offUntil}` : "Yes",
    ];
  }));
}
