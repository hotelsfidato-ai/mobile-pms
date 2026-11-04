import type {
  AddonGroup, CustomAddon, ExtraInput, LineAddon, MenuCategory, MenuItem, MenuVariation, NumberedAddon, OrderLine, SendLine,
} from "./types";

/* ══════════════════════════════════════════════════════════════════
   THE ORDER PAD'S RULES — ported, word for word where the web has words,
   from the web (one folder up):
     src/modules/pos/lib/pricing.ts     what one dish costs (unitPriceOf …)
     src/lib/draft.ts                   the draft line, draftTotal, draftCount
     src/modules/pos/flows/OrderPad.tsx put, bump, drop, customise, addTo, Send's body
     src/modules/pos/flows/DishDialog.tsx  the dish sheet's Add rule, sides, notes
     src/modules/pos/flows/CustomiseDialog.tsx  the numbered add-ons, the typed one
     src/modules/pos/data/till.ts       isBarSection, isBarDish, customInputs
     src/modules/pos/lib/oneLinePerDish.ts  the same dish sent twice is one line (D27-353)
     src/modules/pos/components/KotStation.tsx  KotsSent, the table's KOTs (D27-324)
   The web wins if the two differ: copy again. Its long notes say WHY.

   ⚠ THE PAD'S "BEFORE TAX" FIGURE IS THE ONLY SUM ON THE PHONE. It is
   what the DISHES come to; tax, discount and rounding are the server's
   and appear on the bill, never here. The server's twin is pinned by the
   PMS's api/test/modules/pos/padTotal.test.ts.

   Pure: no React Native, so `pad.check.ts` runs under node.
   ══════════════════════════════════════════════════════════════════ */

/** One dish on the pad (src/lib/draft.ts DraftLine). */
export interface DraftLine {
  /** Local only: two of a dish with different sides are two lines. */
  uid: string;
  itemId: string;
  name: string;
  qty: number;
  note: string;
  variationId?: string;
  moreChoiceIds?: string[];
  variationLabel?: string;
  addonIds: string[];
  addonLabels: string[];
  /** One of it, sides included, AT THE MOMENT IT WENT ON. Display only. */
  unitPrice: number;
  numberedAddons?: LineAddon[];
  baseUnitPrice?: number;
  customAddons?: CustomAddon[];
  /** An add-on for a dish already on the bill (D27-291), not a dish. */
  extraFor?: { lineId: string; dish: string; numberedId?: string };
}

/** Today's order line (till.ts): `types.ts` holds the shape of 15 Oct and is
    the mobile chat's. Absent on an answer from before each of these. */
export interface PadLine extends OrderLine {
  kotNo?: number | null;
  kotKind?: { id: string; name: string } | null;
  /** A parcel's packing charge (D27-359): on the bill, never a dish. */
  packing?: boolean;
  itemId?: string | null;
  addonId?: string | null;
  moreChoiceIds?: string[];
}

/* ── What one dish costs (pricing.ts) ─────────────────────────────── */

/** The price of ONE of this dish, sides included. A missing variation
    prices at zero; the sheet keeps Add disabled and the server refuses. */
export function unitPriceOf(
  item: MenuItem,
  variationId: string | null | undefined,
  addonIds: Iterable<string> | null | undefined,
  moreChoiceIds: Iterable<string> | null | undefined = undefined,
): number {
  const [first, ...later] = typesOf(item);
  const base = first ? first.choices.find((v) => v.id === variationId)?.price ?? 0 : item.price;
  const more = new Set(moreChoiceIds ?? []);
  const added = later.flatMap((t) => t.choices).filter((v) => more.has(v.id)).reduce((sum, v) => sum + v.price, 0);
  const wanted = new Set(addonIds ?? []);
  const sides = wanted.size === 0 ? 0
    : item.addonGroups.flatMap((g) => g.addons).filter((a) => wanted.has(a.id)).reduce((sum, a) => sum + a.price, 0);
  return base + added + sides;
}

/** A dish's variation types, in order (D27-192). */
export function typesOf(item: MenuItem): { typeNo: number; heading: string; choices: MenuVariation[] }[] {
  const byType = new Map<number, MenuVariation[]>();
  for (const v of item.variations) {
    const n = v.typeNo ?? 1;
    byType.set(n, [...(byType.get(n) ?? []), v]);
  }
  return [...byType.entries()].sort(([a], [b]) => a - b)
    .map(([typeNo, choices]) => ({ typeNo, heading: headingOf(choices[0]!), choices }));
}

export function headingOf(v: MenuVariation): string {
  return v.heading ?? (v.kind === "size" ? "Size" : v.kind === "quantity" ? "Quantity" : "Variation");
}

/** The labels that go with those ids, so a line reads without the menu. */
export function chosenLabels(
  item: MenuItem,
  variationId: string | null | undefined,
  addonIds: Iterable<string> | null | undefined,
  moreChoiceIds: Iterable<string> | null | undefined = undefined,
): { variationLabel?: string; addonLabels: string[] } {
  const wanted = new Set(addonIds ?? []);
  const picked = new Set([variationId, ...(moreChoiceIds ?? [])]);
  const variationLabel = typesOf(item).flatMap((t) => t.choices)
    .filter((v) => picked.has(v.id)).map((v) => v.label).join(", ") || undefined;
  const addonLabels = item.addonGroups.flatMap((g) => g.addons).filter((a) => wanted.has(a.id)).map((a) => a.label);
  return { ...(variationLabel ? { variationLabel } : {}), addonLabels };
}

/** One of a dish with its numbered add-ons, in paise as the server does. */
export function priceWithAddons(base: number, addons: readonly { price: number; qty: number }[]): number {
  const paise = (rupees: number) => Math.round(rupees * 100);
  return (paise(base) + addons.reduce((sum, a) => sum + paise(a.price) * a.qty, 0)) / 100;
}

/** "Veg Biryani with add-on Kebab"; "… with add-ons Kebab ×2, Raita". */
export function nameWithAddons(dish: string, addons: readonly { name: string; qty: number }[]): string {
  if (addons.length === 0) return dish;
  const parts = addons.map((a) => (a.qty > 1 ? `${a.name} ×${a.qty}` : a.name));
  return `${dish} with add-on${addons.length > 1 ? "s" : ""} ${parts.join(", ")}`;
}

/* ── The pad's total (draft.ts) ───────────────────────────────────── */

export function draftTotal(lines: DraftLine[]): number {
  return lines.reduce((sum, l) => sum + l.unitPrice * l.qty
    + (l.customAddons ?? []).reduce((s, c) => s + c.price * c.qty, 0), 0);
}

export function draftCount(lines: DraftLine[]): number {
  return lines.reduce((n, l) => n + l.qty, 0);
}

/** The footer's small line: "nothing on the pad", "2 dishes · before tax". */
export function footerLine(lines: DraftLine[]): string {
  const n = draftCount(lines);
  return lines.length === 0 ? "nothing on the pad" : `${n} ${n === 1 ? "dish" : "dishes"} · before tax`;
}

/* ── The menu on the pad (OrderPad.tsx, till.ts) ──────────────────── */

export const isBarSection = (c: { taxKind?: MenuCategory["taxKind"] }) => c.taxKind === "bar" || c.taxKind === "alcohol";
export const isBarDish = (menu: MenuCategory[] | undefined, itemId: string | undefined) =>
  !!itemId && (menu ?? []).some((c) => isBarSection(c) && c.items.some((i) => i.id === itemId));

/** Two tabs only when the menu has both sides; one section at a time when
    its chip is tapped; a search looks across the whole menu. */
export function menuShown(categories: MenuCategory[], side: "restaurant" | "bar", section: string | null, search: string, barOnly = false) {
  const split = !barOnly && categories.some(isBarSection) && categories.some((c) => !isBarSection(c));
  const onSide = split ? categories.filter((c) => isBarSection(c) === (side === "bar")) : categories;
  const q = search.trim().toLowerCase();
  const filtered = !q ? (section ? onSide.filter((c) => c.id === section) : onSide)
    : categories
      .map((c) => ({ ...c, items: c.items.filter((i) => i.name.toLowerCase().includes(q) || (i.shortCode ?? "").toLowerCase().includes(q)) }))
      .filter((c) => c.items.length > 0);
  return { split, onSide, filtered };
}

/** A dish sold by variation has no price of its own: a dash, never a zero. */
export const dishPrice = (item: MenuItem): number | null => (item.variations.length > 0 ? null : item.price);

/** A plain dish goes straight on; one with variations or sides asks first. */
export const asksFirst = (item: MenuItem) => item.variations.length > 0 || item.addonGroups.length > 0;

const stamp = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

/** A dish onto the pad. The same dish with the same choices is one more of
    it (D27-189); a line with add-ons or for a sent dish never joins.
    Answers the pad and the uid of the line that now holds it. */
export function putLine(
  lines: DraftLine[], item: MenuItem, qty: number, note: string,
  variationId?: string, addonIds?: string[], moreChoiceIds?: string[],
): { lines: DraftLine[]; uid: string } {
  const { variationLabel, addonLabels } = chosenLabels(item, variationId, addonIds, moreChoiceIds);
  const line: DraftLine = {
    uid: `${item.id}-${stamp()}`,
    itemId: item.id,
    name: item.name,
    qty,
    note,
    ...(variationId ? { variationId } : {}),
    ...(moreChoiceIds?.length ? { moreChoiceIds } : {}),
    ...(variationLabel ? { variationLabel } : {}),
    addonIds: addonIds ?? [],
    addonLabels,
    unitPrice: unitPriceOf(item, variationId, addonIds, moreChoiceIds),
  };
  const sides = [...line.addonIds].sort().join();
  const same = lines.find((l) => l.itemId === item.id
    && l.variationId === line.variationId && l.note.trim() === note.trim()
    && (l.moreChoiceIds ?? []).join() === (line.moreChoiceIds ?? []).join()
    && [...l.addonIds].sort().join() === sides
    && !(l.numberedAddons?.length) && !(l.customAddons?.length) && !l.extraFor);
  return same
    ? { lines: lines.map((l) => (l === same ? { ...l, qty: l.qty + qty } : l)), uid: same.uid }
    : { lines: [...lines, line], uid: line.uid };
}

/** One less / one more. Counting down to none takes it off, as the bin. */
export const bump = (lines: DraftLine[], uid: string, by: number): DraftLine[] =>
  lines.flatMap((l) => {
    if (l.uid !== uid) return [l];
    const next = l.qty + by;
    return next <= 0 ? [] : [{ ...l, qty: next }];
  });

export const drop = (lines: DraftLine[], uid: string): DraftLine[] => lines.filter((l) => l.uid !== uid);

/** Customise (D27-289): the numbered add-ons on THIS pad line, priced on
    one of it before them; "one" splits one off a line of several (D27-290);
    a line that becomes the twin of another joins it, as the server would. */
export function customiseLine(
  lines: DraftLine[], uid: string, chosen: LineAddon[], scope: "all" | "one" = "all", customs: CustomAddon[] = [],
): DraftLine[] {
  const withAddons = (l: DraftLine, typed: CustomAddon[]): DraftLine => {
    const base = l.baseUnitPrice ?? l.unitPrice;
    const { numberedAddons: _gone, baseUnitPrice: _was, customAddons: _typed, ...rest } = l;
    const kept = typed.length > 0 ? { customAddons: typed } : {};
    return chosen.length === 0
      ? { ...rest, ...kept, unitPrice: base }
      : { ...rest, ...kept, numberedAddons: chosen, baseUnitPrice: base, unitPrice: priceWithAddons(base, chosen) };
  };
  const next = lines.flatMap((l) => {
    if (l.uid !== uid) return [l];
    if (scope === "one" && l.qty > 1) {
      const had = l.customAddons ?? [];
      const kept = had.filter((c) => customs.includes(c));
      const { customAddons: _typed, ...rest } = l;
      return [{ ...rest, ...(kept.length ? { customAddons: kept } : {}), qty: l.qty - 1 },
        withAddons({ ...l, uid: `${l.uid}-1-${Date.now()}`, qty: 1 }, customs.filter((c) => !had.includes(c)))];
    }
    return [withAddons(l, customs)];
  });
  const same = (l: DraftLine) => (l.customAddons?.length || l.extraFor) ? l.uid : JSON.stringify([
    l.itemId, l.variationId ?? null, l.note.trim(), l.moreChoiceIds ?? [],
    [...l.addonIds].sort(), (l.numberedAddons ?? []).map((a) => [a.id, a.qty]),
  ]);
  const changed = scope === "one"
    ? next.find((l) => l.uid.startsWith(`${uid}-1-`)) ?? next.find((l) => l.uid === uid)
    : next.find((l) => l.uid === uid);
  const twin = changed && next.find((l) => l.uid !== changed.uid && same(l) === same(changed));
  return changed && twin
    ? next.filter((l) => l.uid !== changed.uid).map((l) => (l === twin ? { ...l, qty: l.qty + changed.qty } : l))
    : next;
}

/** ONE LINE PER DISH (D27-353): the same dish, size, choices, sides, add-ons,
    note and price, sent in two rounds, shows once; a struck line stays its
    own. Display only; the merged line carries the NEWEST round's id. */
export function oneLinePerDish(lines: readonly PadLine[]): PadLine[] {
  const kids = (id: string) => lines.filter((c) => c.parentLineId === id);
  const kidKey = (c: PadLine) => JSON.stringify([c.name, c.unitPrice, c.addonId ?? null, c.extra ?? null]);
  const key = (l: PadLine) => l.voided ? `struck ${l.id}` : JSON.stringify([
    l.itemId ?? null, l.name, l.variationId ?? null, l.unitPrice, l.taxRate, l.note ?? "",
    l.numberedAddons ?? null, [...(l.moreChoiceIds ?? [])].sort(), l.extra ?? null,
    kids(l.id).filter((c) => !c.voided).map((c) => `${kidKey(c)} ${c.qty / l.qty}`).sort(),
  ]);
  const groups = new Map<string, PadLine[]>();
  for (const l of lines) {
    if (l.parentLineId !== null) continue;
    const k = key(l);
    groups.set(k, [...(groups.get(k) ?? []), l]);
  }
  const out: PadLine[] = [];
  for (const same of groups.values()) {
    const newest = same[same.length - 1]!;
    out.push({ ...newest, qty: same.reduce((n, l) => n + l.qty, 0) });
    const children = same.flatMap((l) => kids(l.id));
    const live = new Map<string, PadLine[]>();
    for (const c of children.filter((x) => !x.voided)) live.set(kidKey(c), [...(live.get(kidKey(c)) ?? []), c]);
    for (const alike of live.values()) out.push({ ...alike[alike.length - 1]!, qty: alike.reduce((n, c) => n + c.qty, 0) });
    out.push(...children.filter((c) => c.voided));
  }
  return out;
}

/** The table's dishes the kitchen already has (D27-291, D27-353): each takes
    one more and add-ons; a parcel's packing charge is not a dish. */
export const sentDishes = (orderLines: PadLine[]) =>
  oneLinePerDish(orderLines.filter((l) => l.kotStatus !== "pending"))
    .filter((l) => !l.voided && l.parentLineId === null && !l.packing);

/** ONE MORE OF A DISH ALREADY SENT (D27-349): the same dish with its choices,
    sides, note and numbered add-ons joins this round; the sent one is
    untouched. `item` is the dish on today's menu; none: the caller says so. */
export function onceMore(lines: DraftLine[], d: PadLine, orderLines: PadLine[], item: MenuItem): { lines: DraftLine[]; uid: string } {
  const sides = orderLines.filter((x) => x.parentLineId === d.id && x.isAddon && !x.voided && x.addonId).map((x) => x.addonId!);
  const variationId = d.variationId ?? undefined;
  const more = d.moreChoiceIds ?? [];
  const chosen = d.numberedAddons?.addons ?? [];
  if (chosen.length === 0) return putLine(lines, item, 1, d.note ?? "", variationId, sides, more);
  const { variationLabel, addonLabels } = chosenLabels(item, variationId, sides, more);
  const base = unitPriceOf(item, variationId, sides, more);
  const line: DraftLine = {
    uid: `${item.id}-${stamp()}`, itemId: item.id, name: item.name, qty: 1, note: d.note ?? "",
    ...(variationId ? { variationId } : {}),
    ...(more.length ? { moreChoiceIds: more } : {}),
    ...(variationLabel ? { variationLabel } : {}),
    addonIds: sides, addonLabels,
    numberedAddons: chosen, baseUnitPrice: base, unitPrice: priceWithAddons(base, chosen),
  };
  const key = (l: DraftLine) => JSON.stringify([l.itemId, l.variationId ?? null, l.note.trim(),
    l.moreChoiceIds ?? [], [...l.addonIds].sort(), (l.numberedAddons ?? []).map((a) => [a.id, a.qty])]);
  const twin = lines.find((l) => !l.customAddons?.length && !l.extraFor && key(l) === key(line));
  return { lines: twin ? lines.map((l) => (l === twin ? { ...l, qty: l.qty + 1 } : l)) : [...lines, line], uid: line.uid };
}

/** An order's KOTs, one per number and kind ("KOT 3 · Bar"). */
export function kotsSent(lines: readonly PadLine[]) {
  return [...new Map(lines.flatMap((l) => (l.kotNo == null ? [] : [[
    `${l.kotNo}:${l.kotKind?.id ?? ""}`,
    { no: l.kotNo, kindId: l.kotKind?.id ?? null, label: `KOT ${l.kotNo}${l.kotKind ? ` · ${l.kotKind.name}` : ""}` },
  ] as const]))).values()];
}

/** Add-ons for a dish already sent: each a pad line of its own. */
export function addToSent(lines: DraftLine[], dish: PadLine, chosen: LineAddon[], customs: CustomAddon[]): DraftLine[] {
  const name = dish.numberedAddons?.dish ?? dish.name;
  const at = stamp();
  const extra = (i: number, line: Pick<DraftLine, "name" | "qty" | "unitPrice">, numberedId?: string): DraftLine => ({
    uid: `x-${dish.id}-${at}-${i}`, itemId: "", note: "", addonIds: [], addonLabels: [],
    ...line,
    extraFor: { lineId: dish.id, dish: name, ...(numberedId ? { numberedId } : {}) },
  });
  return [
    ...lines,
    ...chosen.map((a, i) => extra(i, { name: a.name, qty: a.qty, unitPrice: a.price }, a.id)),
    ...customs.map((c, i) => extra(chosen.length + i, { name: c.name, qty: c.qty, unitPrice: c.price })),
  ];
}

/** Typed add-ons as the server takes them: a 0 goes as Free, never as a price. */
export const customInputs = (customs: readonly CustomAddon[]): ExtraInput[] =>
  customs.map((c) => (c.price === 0 ? { name: c.name, free: true, qty: c.qty } : { name: c.name, price: c.price, qty: c.qty }));

/** Send: ONE request with every dish (POST /till/orders/batch), as the
    web's OrderPad builds it. A round on an open bill names the order; a
    new one the outlet and the table. `table` (the name) only when the
    phone does not hold the table's id - the server finds it by name. */
export function batchBody(to: { orderId?: string; outlet: string; tableId?: string; table?: string }, lines: DraftLine[]) {
  const where = to.orderId ? { orderId: to.orderId }
    : to.tableId ? { outlet: to.outlet, tableId: to.tableId } : { outlet: to.outlet, table: to.table };
  const sent: SendLine[] = lines.map((l) => l.extraFor ? {
    qty: l.qty,
    extraFor: l.extraFor.lineId,
    extras: l.extraFor.numberedId
      ? [{ numberedId: l.extraFor.numberedId, qty: l.qty }]
      : customInputs([{ name: l.name, price: l.unitPrice, qty: l.qty }]),
  } : {
    itemId: l.itemId,
    qty: l.qty,
    ...(l.note ? { note: l.note } : {}),
    ...(l.variationId ? { variationId: l.variationId } : {}),
    ...(l.moreChoiceIds?.length ? { moreChoiceIds: l.moreChoiceIds } : {}),
    ...(l.addonIds.length ? { addonIds: l.addonIds } : {}),
    ...(l.numberedAddons?.length ? { numberedAddons: l.numberedAddons.map((a) => ({ id: a.id, qty: a.qty })) } : {}),
    ...(l.customAddons?.length ? { extras: customInputs(l.customAddons) } : {}),
  });
  return { ...where, lines: sent, send: true };
}

/* ── The dish's sheet (DishDialog.tsx) ────────────────────────────── */

/** The list from the screenshots; a drink gets the bar's words (D27-267). */
export const PRESET_NOTES = ["Crispy", "Extra Garlic", "Less Butter", "Less Garlic", "Less Spicy", "Less Sugar"];
export const BAR_NOTES = ["Neat", "On the rocks", "With soda", "With water"];

/** "choose 1", "choose up to 2", "choose 1 to 3"; nothing when any number will do. */
export function chooseRule(min: number, max: number | null): string {
  if (max === null) return min > 0 ? `choose at least ${min}` : "";
  if (min === max) return `choose ${min}`;
  return min > 0 ? `choose ${min} to ${max}` : `choose up to ${max}`;
}

export const countIn = (g: AddonGroup, chosen: ReadonlySet<string>) => g.addons.filter((a) => chosen.has(a.id)).length;

/** A side tapped: a group of one is a choice (a second replaces the first);
    a full group takes no more (the tap does nothing). */
export function toggleSide(chosen: ReadonlySet<string>, id: string, group: AddonGroup): Set<string> {
  const next = new Set(chosen);
  if (next.has(id)) { next.delete(id); return next; }
  if (group.maxSelect === 1) {
    for (const a of group.addons) next.delete(a.id);
  } else if (group.maxSelect !== null && countIn(group, next) >= group.maxSelect) {
    return new Set(chosen);
  }
  next.add(id);
  return next;
}

/** Add waits for one choice of EACH type and every group's minimum. */
export function dishReady(item: MenuItem, picked: Readonly<Record<number, string>>, chosen: ReadonlySet<string>): boolean {
  const short = item.addonGroups.find((g) => countIn(g, chosen) < g.minSelect);
  return typesOf(item).every((t) => picked[t.typeNo]) && !short;
}

/** What the sheet hands the pad: the first type's choice and the rest's. */
export function pickedIds(item: MenuItem, picked: Readonly<Record<number, string>>) {
  const types = typesOf(item);
  const variationId = types[0] ? picked[types[0].typeNo] ?? null : null;
  const moreChoiceIds = types.slice(1).flatMap((t) => picked[t.typeNo] ?? []);
  return { variationId, moreChoiceIds };
}

/** The sheet's footer figure: what this many of the dish come to, sides
    included - a DASH (null) until one of each variation type is chosen,
    since unitPriceOf prices a missing variation at zero (MPOS-2). */
export function sheetFigure(item: MenuItem, picked: Readonly<Record<number, string>>, chosen: ReadonlySet<string>, qty: number): number | null {
  if (!typesOf(item).every((t) => picked[t.typeNo])) return null;
  const { variationId, moreChoiceIds } = pickedIds(item, picked);
  return unitPriceOf(item, variationId, chosen, moreChoiceIds) * qty;
}

/* ── Customise (CustomiseDialog.tsx) ──────────────────────────────── */

export const MOST_OF_ONE = 9;
export const MOST_OF_A_CUSTOM = 99;
export const LONGEST_NAME = 60;

export function addNumbered(chosen: LineAddon[], a: NumberedAddon): LineAddon[] {
  const have = chosen.find((c) => c.id === a.id);
  if (have) return have.qty >= MOST_OF_ONE ? chosen : chosen.map((c) => (c.id === a.id ? { ...c, qty: c.qty + 1 } : c));
  return [...chosen, { id: a.id, number: a.number, name: a.name, price: a.price, qty: 1 }].sort((x, y) => x.number - y.number);
}

export const lessNumbered = (chosen: LineAddon[], id: string): LineAddon[] =>
  chosen.flatMap((c) => (c.id !== id ? [c] : c.qty > 1 ? [{ ...c, qty: c.qty - 1 }] : []));

/** A typed add-on: a name, and rupees above 0 or Free - a blank is not zero. */
export function customProblems(name: string, price: string, free: boolean) {
  const p = price.trim();
  const priceN = p === "" ? null : Number(p);
  const priceBad = !free && (priceN === null || !/^\d+(\.\d{1,2})?$/.test(p) || priceN <= 0);
  const nameBad = name.trim() === "" || name.trim().length > LONGEST_NAME;
  return { priceN, priceBad, nameBad, ready: !nameBad && !priceBad };
}

/* ── The draft, kept on this phone ────────────────────────────────────
   One per table (the web's src/lib/draft.ts: per table, not per waiter),
   written as it grows, cleared on Send. ponytail: IN MEMORY - it lasts
   while the app runs (closing the pad keeps it; closing the app loses it).
   The web writes it to IndexedDB; expo-sqlite here when the mobile chat
   says so. */

export interface Draft { key: string; table: string; orderId?: string; lines: DraftLine[]; updatedAt: string }

const drafts = new Map<string, Draft>();

export const draftKey = (hotel: string, outlet: string, table: string) => `${hotel}:${outlet}:${table}`;
export const loadDraft = (key: string): Draft | null => drafts.get(key) ?? null;
export function saveDraft(draft: Draft) {
  if (draft.lines.length === 0) drafts.delete(draft.key);
  else drafts.set(draft.key, { ...draft, updatedAt: new Date().toISOString() });
}
export const clearDraft = (key: string) => { drafts.delete(key); };
/** The tables of this hotel with an unsent round on a pad (by name). */
export function draftedTables(hotel: string): Set<string> {
  const found = new Set<string>();
  for (const d of drafts.values()) if (d.key.startsWith(`${hotel}:`)) found.add(d.table);
  return found;
}
