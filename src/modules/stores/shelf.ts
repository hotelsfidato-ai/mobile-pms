/* ══════════════════════════════════════════════════════════════════
   THE STORE'S RULES ON A PHONE — ported by hand from the web's
   src/modules/stores/pages/Stores.tsx, lib/tiles.ts and data/stores.ts
   (the PMS at a4527ea, 2 Nov), trimmed to what the phone draws and sends.

   EVERY FIGURE IS THE SERVER'S. On hand, what each store holds, the
   average cost, an item's worth, the deposit held: GET /stores sends them
   and they are drawn as sent - never rounded, never clamped (MEMORY 9). An
   item nobody has received has no cost and no worth: a dash, never ₹0.
   The phone adds no rupees up: the web's "₹34,857 on the shelf" and a
   picked store's worth are sums the browser makes (MST-1), so the phone
   says what it holds and leaves the sum to the server (PMS request).

   WHAT IS TYPED IS WHAT IS SENT. A quantity or a count is digits and one
   point; anything else is "not a count" and is not sent. A BLANK IS NEVER
   A ZERO (MEMORY 9, MLDY-1): a count line left blank is not counted, and
   a quantity left blank keeps the button grey.

   Pure: no React Native here, so shelf.check.ts runs under node.
   ══════════════════════════════════════════════════════════════════ */

import { rupees } from "../inventory/rates.ts";

export const DASH = "-";

/* ── The shapes GET /stores sends (data/stores.ts, api stores.ts 440-660) ── */

export type StockKind = "receipt" | "issue" | "wastage" | "adjustment" | "return" | "breakage";
export type MovementKind = StockKind | "transfer";

export interface StoreSummary { id: string; name: string; isActive: boolean; isMain: boolean }

export interface StockItem {
  id: string; name: string; unit: string; category: string | null;
  onHand: number;
  levels: Record<string, number>;
  lowIn: string[];
  low: boolean;
  cylinder: boolean;
  empties: number;
  emptiesByStore: Record<string, number>;
  cylindersOnDeposit: number | null;
  depositPerCylinder: number | null;
  depositHeld: number | null;
  inUse: number | null;
  sizeMl?: number | null;
  unitCost: number | null;
  value: number | null;
  byStore: Record<string, number>;
  lastMovement: string | null;
  movements: number;
  isActive: boolean;
  crockery: boolean;
  heldIn: string[];
  today: Partial<Record<"receipt" | "issue" | "wastage" | "breakage", string[]>>;
  lastCounted: Record<string, string>;
  onOrder: Record<string, number>;
}

export interface StoreList {
  stores: StoreSummary[];
  items: StockItem[];
  outlets: { id: string; name: string }[];
  businessDate: string;
  people: { id: string; name: string }[];
  inUse: { id: string; name: string; kind: string; isActive: boolean }[];
}

export interface StockMovement {
  id: string; date: string; kind: MovementKind; quantity: number;
  unitCost: number | null; supplier: string | null; reference: string | null; note: string | null;
  outlet: string | null; who: string | null; store: string;
  fromStore: string | null; toStore: string | null;
  isReversal: boolean; reversesKind: MovementKind | null; reversed: boolean; empty: boolean;
  gst: { rate: number; amount: number; claimable: boolean } | null;
  expiresOn: string | null; department: string | null; brokenBy: string | null;
}

/* ── Words (Stores.tsx 58-104) ───────────────────────────────────── */

/** What a history row says happened. */
export const KIND_LABEL: Record<MovementKind, string> = {
  receipt: "Received", issue: "Issued", wastage: "Wasted", adjustment: "Adjusted",
  return: "Returned", transfer: "Moved", breakage: "Broken",
};
/** What a button says will happen (STO-8). */
export const ACTION_LABEL: Record<StockKind, string> = {
  receipt: "Receive", issue: "Issue", wastage: "Record waste", adjustment: "Correct the count",
  return: "Return", breakage: "Record breakage",
};
/** What an undo undid, as a noun (STO-6). */
export const NOUN: Record<MovementKind, string> = {
  receipt: "delivery", issue: "issue", wastage: "waste", adjustment: "count correction",
  return: "return", transfer: "move", breakage: "breakage",
};
export const withArticle = (noun: string) => `${/^[aeiou]/.test(noun) ? "an" : "a"} ${noun}`;
const EMPTY_LABEL: Partial<Record<MovementKind, string>> = {
  receipt: "Empties back from the kitchen", return: "Empties to the supplier", adjustment: "Empties counted",
};
export const nounOf = (m: Pick<StockMovement, "empty" | "kind">) => (m.empty ? "record of empties" : NOUN[m.kind]);

export const NOTHING_ON_HAND = "Nothing on hand.";
export const ONLY_ONE_STORE = "There is only one store.";
export const NEVER_MOVED = "Nothing has moved yet.";

/* ── Figures ─────────────────────────────────────────────────────── */

export { rupees };

/** "11 Oct 2026" from the server's business date (the web's dateShort). */
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const dayText = (date: string) => `${Number(date.slice(8, 10))} ${MON[Number(date.slice(5, 7)) - 1]} ${date.slice(0, 4)}`;

/** "Main store" reads "Main" in an item's line of stores (the owner's layout). */
export const shortName = (name: string) => name.replace(/\s+store$/i, "") || name;

/** What is held, as the web writes it: a dash where none is held; a drink in
    full bottles and the open one's ml, "55 + 30 ml" (Stores.tsx heldText). */
export function heldText(n: number | null | undefined, sizeMl?: number | null): string {
  if (n === null || n === undefined) return DASH;
  if (!sizeMl) return String(n);
  const whole = Math.floor(n + 1e-9);
  const ml = Math.round((n - whole) * sizeMl);
  return ml > 0 ? `${whole} + ${ml} ml` : String(whole);
}

/* ── The places (Stores.tsx placesOf, startingStore) ─────────────── */

/** The stores, then the places crockery is in use: one list a picker reads. */
export const placesOf = (data: Pick<StoreList, "stores" | "inUse"> | undefined): StoreSummary[] => [
  ...(data?.stores ?? []),
  ...(data?.inUse ?? []).map((p) => ({ id: p.id, name: p.name, isActive: p.isActive, isMain: false })),
];

/** The store a dialog starts on: the one picked at the top, else the Main store. */
export function startingStore(offered: StoreSummary[], startId: string | null): string {
  if (startId && offered.some((s) => s.id === startId)) return startId;
  return offered.find((s) => s.isMain)?.id ?? offered[0]?.id ?? "";
}

/** What the screen shows for an item: the whole hotel's, or the picked
    store's - null (a dash) where that store holds none of it. */
export const shownOnHand = (i: StockItem, picked: StoreSummary | null): number | null =>
  picked ? (i.byStore[picked.id] ?? null) : i.onHand;

/* ── The tiles (lib/tiles.ts, the owner's meanings D27-242 Q3) ───── */

export type Tile = "below" | "runOut" | "received" | "issued" | "wasted" | "awaiting" | "notValued" | "notCounted";
export const TILES: { key: Tile; label: string; job: boolean }[] = [
  { key: "below", label: "Below level", job: true },
  { key: "runOut", label: "Run out", job: true },
  { key: "received", label: "Received today", job: false },
  { key: "issued", label: "Issued today", job: false },
  { key: "wasted", label: "Wasted today", job: false },
  { key: "awaiting", label: "Awaiting delivery", job: false },
  { key: "notValued", label: "Not valued", job: true },
  { key: "notCounted", label: "Not counted in 30 days", job: true },
];

const daysFrom = (from: string, to: string) => Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);

export function inTile(tile: Tile, i: StockItem, picked: StoreSummary | null, today: string): boolean {
  const here = (places?: string[]) => (places ?? []).some((p) => !picked || p === picked.id);
  const heldAt = Object.entries(i.byStore).filter(([p, n]) => n > 0 && (!picked || p === picked.id)).map(([p]) => p);
  switch (tile) {
    case "below": return picked ? i.lowIn.includes(picked.id) : i.low;
    case "runOut": return picked
      ? i.heldIn.includes(picked.id) && (i.byStore[picked.id] ?? 0) <= 0
      : i.heldIn.length > 0 && i.onHand <= 0;
    case "received": return here(i.today.receipt);
    case "issued": return here(i.today.issue);
    case "wasted": return here(i.today.wastage) || here(i.today.breakage);
    case "awaiting": return Object.entries(i.onOrder).some(([s, q]) => q > 0 && (!picked || s === picked.id));
    case "notValued": return i.unitCost === null && heldAt.length > 0;
    case "notCounted": return heldAt.some((p) => !i.lastCounted[p] || daysFrom(i.lastCounted[p]!, today) >= 30);
  }
}

export const tileCounts = (items: StockItem[], picked: StoreSummary | null, today: string) =>
  Object.fromEntries(TILES.map((t) => [t.key, items.filter((i) => inTile(t.key, i, picked, today)).length])) as Record<Tile, number>;

/* ── The list (StoresPage) ───────────────────────────────────────── */

/** What the list shows: a place in use holds crockery only; a tile narrows. */
export function shownItems(list: StoreList, picked: StoreSummary | null, tile: Tile | null): StockItem[] {
  const inUseIds = new Set(list.inUse.map((p) => p.id));
  return list.items
    .filter((i) => !picked || !inUseIds.has(picked.id) || i.crockery)
    .filter((i) => !tile || inTile(tile, i, picked, list.businessDate));
}

/** Grouped by where it belongs, in the server's order (category, nulls last). */
export function byCategory(items: StockItem[]): [string, StockItem[]][] {
  const groups = new Map<string, StockItem[]>();
  for (const i of items) {
    const key = i.category ?? "Everything else";
    groups.set(key, [...(groups.get(key) ?? []), i]);
  }
  return [...groups.entries()];
}

/** The line under the title. The web's "· ₹34,857 on the shelf" is a sum the
    browser makes; the phone counts items, never rupees (MST-1). */
export function headline(items: StockItem[]): string {
  if (items.length === 0) return "What the property keeps - rice, gas, linen, soap.";
  const unvalued = items.filter((i) => i.unitCost === null).length;
  const n = `${items.length} item${items.length === 1 ? "" : "s"}`;
  if (unvalued === items.length) return `${n} · nothing received yet, so nothing has a value`;
  return unvalued > 0 ? `${n}, ${unvalued} not yet valued` : n;
}

/* ── One item's card (ItemRow) ───────────────────────────────────── */

/** "Warn at Main 20 · Kitchen 4", "No level set"; one store: "Warn at 10 kg". */
export function levelText(i: StockItem, stores: StoreSummary[], picked: StoreSummary | null): string {
  if (picked) return i.levels[picked.id] === undefined ? `No level in ${picked.name}` : `Warn at ${i.levels[picked.id]} ${i.unit}`;
  if (Object.keys(i.levels).length === 0) return "No level set";
  return "Warn at " + stores.filter((s) => i.levels[s.id] !== undefined).map((s) => `${shortName(s.name)} ${i.levels[s.id]}`).join(" · ");
}

/** The card's grey line: the level, when it last moved, when last counted. */
export function cardLine(i: StockItem, stores: StoreSummary[], picked: StoreSummary | null): string {
  const counted = picked ? i.lastCounted[picked.id] : Object.values(i.lastCounted).sort().at(-1);
  return levelText(i, stores, picked)
    + (i.lastMovement ? ` · last moved ${dayText(i.lastMovement)}` : " · never moved")
    + (counted ? ` · counted ${dayText(counted)}` : "");
}

/** "Kitchen store: 4 kg, level 4" - each store at or below its level. */
export function belowLine(i: StockItem, stores: StoreSummary[], picked: StoreSummary | null): string | null {
  const below = stores.filter((s) => i.lowIn.includes(s.id) && (!picked || s.id === picked.id));
  if (below.length === 0) return null;
  return below.map((s) => `${s.name}: ${i.byStore[s.id] === undefined ? "none" : `${i.byStore[s.id]} ${i.unit}`}, level ${i.levels[s.id]}`).join(" · ");
}

/** "Main 30 · Kitchen 8 · Bar -", on All stores with more than one store. */
export const storeLine = (i: StockItem, stores: StoreSummary[]) =>
  stores.map((s) => `${shortName(s.name)} ${heldText(i.byStore[s.id], i.sizeMl)}`).join(" · ");

/** A cylinder's deposit, every figure the server's (D25-19). */
export function depositLine(i: StockItem): string {
  return `On deposit ${heldText(i.cylindersOnDeposit)}`
    + ` · ${i.depositPerCylinder === null ? DASH : rupees(i.depositPerCylinder)} each`
    + ` · ${i.depositHeld === null ? DASH : rupees(i.depositHeld)} held`
    + ` · ${i.inUse !== null && i.inUse < 0
      ? "more in the stores than on deposit - check the count or the deposit"
      : `${heldText(i.inUse)} in use at the kitchen`}`;
}

/** Worth is the server's `value`, for the whole hotel. With a store picked
    the web multiplies that store's share in the browser; the phone keeps the
    server's figure and says it is all the stores' (MST-1). */
export const worthLabel = (picked: StoreSummary | null) => (picked ? "Worth, all stores" : "Worth");

/** "₹167.40/bottle average": the server's average, to the paisa. */
export const averageText = (i: StockItem) => (i.unitCost === null ? null : `${rupees(i.unitCost)}/${i.unit} average`);

/* ── What is typed (every number field) ──────────────────────────── */

/** A typed figure: null when blank, NaN when it is not a plain figure (a
    sign, a letter, two points), else the figure. `Number("")` is 0 and
    `Number(" 1e2 ")` is 100 - neither is what was typed. */
export function typed(text: string): number | null {
  const s = text.trim();
  if (s === "") return null;
  return /^(\d+(\.\d+)?|\.\d+)$/.test(s) ? Number(s) : Number.NaN;
}

/** A whole number typed: the empties, a deposit count. */
export const typedWhole = (text: string): number | null => {
  const n = typed(text);
  return n === null || (Number.isFinite(n) && Number.isInteger(n)) ? n : Number.NaN;
};

/** The web's difference, to the thousandth (Stores.tsx MoveDialog, CountSheet). */
export const difference = (counted: number, book: number) => Math.round((counted - book) * 1000) / 1000;

/* ── A movement (MoveDialog's submit, Stores.tsx 905-1000) ───────── */

export const NOT_AN_OUTLET = "none";
export const NOT_KNOWN = "not-known";

/** Which stores a dialog offers: nothing is received into a switched-off
    store; crockery breaks and is counted where it is in use too. */
export const offeredFor = (kind: StockKind, stores: StoreSummary[], inUse: StoreSummary[]) =>
  kind === "receipt" ? stores.filter((s) => s.isActive)
    : kind === "breakage" || kind === "adjustment" ? [...stores, ...inUse] : stores;

export interface MoveDraft {
  kind: StockKind;
  storeId: string;
  qty: string;
  cost: string;
  free: boolean;
  supplier: string;
  reference: string;
  note: string;
  outletId: string;
  gstRate: string;
  gstAmount: string;
  claimable: "" | "yes" | "no";
  department: string;
  brokenBy: string;
  empties: string;
}

export const blankMove = (kind: StockKind, storeId: string): MoveDraft => ({
  kind, storeId, qty: "", cost: "", free: false, supplier: "", reference: "", note: "", outletId: "",
  gstRate: "", gstAmount: "", claimable: "", department: "", brokenBy: "", empties: "",
});

/** What the store holds of the item: the book a correction is against. */
export const bookIn = (i: StockItem, storeId: string) => i.byStore[storeId] ?? 0;

/** What is sent for one movement, or the reason it cannot be yet - the
    web's `ready`, said rather than only greyed. Quantity is ALWAYS
    POSITIVE except a correction, which sends the difference from the
    shelf's count (the kind decides the direction, the server the sign). */
export function moveBody(d: MoveDraft, i: StockItem, hasOutlets: boolean):
  { body: Record<string, unknown> } | { missing: string } {
  if (!d.storeId) return { missing: "Choose a store." };
  const isCount = d.kind === "adjustment";
  const isReceipt = d.kind === "receipt";
  const n = typed(d.qty);
  if (n === null) return { missing: isCount ? "Type what the shelf holds." : "Type how many." };
  if (!Number.isFinite(n)) return { missing: "A figure, zero or more - digits and one point." };
  const quantity = isCount ? difference(n, bookIn(i, d.storeId)) : n;
  if (isCount && quantity === 0) return { missing: "The shelf already matches the book - there is nothing to record." };
  if (!isCount && quantity <= 0) return { missing: "How many? More than none." };

  const needsOutlet = d.kind === "issue" && hasOutlets;
  if (needsOutlet && d.outletId === "") return { missing: "Choose which outlet, or Not an outlet." };

  const asksEmpties = i.cylinder && (d.kind === "issue" || isReceipt);
  const empties = typedWhole(d.empties);
  if (asksEmpties && (empties === null || !Number.isFinite(empties))) {
    return { missing: isReceipt ? "How many empties did the supplier take back? 0 is an answer." : "How many empties came back? 0 is an answer." };
  }

  const cost = d.free ? 0 : typed(d.cost);
  if (isReceipt && cost !== null && !Number.isFinite(cost)) return { missing: "The cost is a figure - digits and one point." };
  /* GST: the rate, the amount AS THE BILL SAYS and whether it can be
     claimed - all three or none (Q6). The web fills the amount from the
     rate; the phone works out no tax, so it is typed from the bill. */
  const rate = typed(d.gstRate);
  const amount = typed(d.gstAmount);
  const given = [d.gstRate.trim(), d.gstAmount.trim(), d.claimable].filter((v) => v !== "").length;
  if (isReceipt && given > 0) {
    if (given < 3) return { missing: "GST is the rate, the amount and whether it can be claimed - all three, or none." };
    if (!Number.isFinite(rate!) || rate! > 100 || !Number.isFinite(amount!)) return { missing: "The GST rate and amount are figures." };
  }
  if (d.kind === "breakage" && d.brokenBy === "") return { missing: "Choose who broke it, or Not known." };

  const t = (s: string) => s.trim();
  return {
    body: {
      itemId: i.id, kind: d.kind, locationId: d.storeId, quantity,
      ...(isReceipt && d.free ? { unitCost: 0, unitCostFree: true } : isReceipt && cost !== null ? { unitCost: cost } : {}),
      ...((isReceipt || d.kind === "return") && t(d.supplier) ? { supplier: t(d.supplier) } : {}),
      ...(isReceipt && t(d.reference) ? { reference: t(d.reference) } : {}),
      ...(!isReceipt && t(d.note) ? { note: t(d.note) } : {}),
      ...(needsOutlet ? { outletId: d.outletId === NOT_AN_OUTLET ? null : d.outletId } : {}),
      ...(asksEmpties ? (isReceipt ? { emptiesTaken: empties } : { emptiesBack: empties }) : {}),
      ...(isReceipt && given === 3 ? { gstRate: rate, gstAmount: amount, gstClaimable: d.claimable === "yes" } : {}),
      ...(d.kind === "issue" && t(d.department) ? { department: t(d.department) } : {}),
      ...(d.kind === "breakage" ? { brokenBy: d.brokenBy === NOT_KNOWN ? null : d.brokenBy } : {}),
    },
  };
}

/** "That is 2 kg fewer than the book says", once a count is typed. */
export function correctionWords(d: MoveDraft, i: StockItem): string | null {
  const n = typed(d.qty);
  if (d.kind !== "adjustment" || n === null || !Number.isFinite(n)) return null;
  const diff = difference(n, bookIn(i, d.storeId));
  return diff === 0
    ? "The shelf already matches the book - there is nothing to record."
    : `That is ${Math.abs(diff)} ${i.unit} ${diff > 0 ? "more" : "fewer"} than the book says.`;
}

/** The server's answer, said (MoveDialog's toast). */
export function movedWords(kind: StockKind, qty: string, i: StockItem,
  res: { onHandHere: number; emptiesHere: number | null; store: string; unit: string }): { title: string; body: string } {
  return {
    title: kind === "adjustment" ? `Count corrected - ${i.name}` : `${KIND_LABEL[kind]} ${qty.trim()} ${i.unit} of ${i.name}`,
    body: i.cylinder && res.emptiesHere !== null
      ? `${res.onHandHere} full and ${res.emptiesHere} empty in ${res.store}.`
      : `${res.onHandHere} ${res.unit} in ${res.store}.`,
  };
}

/* ── A move between stores (TransferDialog) ──────────────────────── */

export function transferBody(i: StockItem, fromId: string, toId: string, qty: string, note: string):
  { body: Record<string, unknown> } | { missing: string } {
  if (!fromId) return { missing: "Choose where it is moved from." };
  if (!toId) return { missing: "Choose where it goes." };
  const n = typed(qty);
  if (n === null) return { missing: "Type how many." };
  if (!Number.isFinite(n) || n <= 0) return { missing: "How many? More than none - digits and one point." };
  return { body: { itemId: i.id, fromId, toId, quantity: n, ...(note.trim() ? { note: note.trim() } : {}) } };
}

/* ── The count sheet (CountSheet, D25-15..17) ────────────────────── */

export interface SheetLine { key: string; itemId: string; empty: boolean; name: string; unit: string; book: number; sizeMl: number | null }

/** Every active item, with the book AS IT STANDS NOW; a cylinder's empties a line of their own. */
export const sheetFor = (items: StockItem[], storeId: string, crockeryOnly = false): SheetLine[] =>
  items.filter((i) => i.isActive && (!crockeryOnly || i.crockery)).flatMap((i) => [
    { key: i.id, itemId: i.id, empty: false, name: i.name, unit: i.unit, book: i.byStore[storeId] ?? 0, sizeMl: i.sizeMl ?? null },
    ...(i.cylinder
      ? [{ key: `${i.id}:empty`, itemId: i.id, empty: true, name: `${i.name} - empty`, unit: i.unit, book: i.emptiesByStore[storeId] ?? 0, sizeMl: null }]
      : []),
  ]);

/** What was counted on a line, in the item's unit: null when left blank (not
    counted, never zero); NaN when it is not a count. A drink's full bottles
    and the open one's ml make one figure, to the thousandth of a bottle. */
export function countedOf(l: SheetLine, full: string, ml: string): number | null {
  const m = l.sizeMl ? ml.trim() : "";
  if (full.trim() === "" && m === "") return null;
  const whole = full.trim() === "" ? 0 : typed(full)!;
  if (!Number.isFinite(whole)) return Number.NaN;
  if (!l.sizeMl || m === "") return whole;
  const open = typed(m)!;
  if (!Number.isFinite(open) || open >= l.sizeMl) return Number.NaN;
  return Math.round((whole + open / l.sizeMl) * 1000) / 1000;
}

/** "Book 8 kg · 1 fewer", shown only once a count is typed (D25-16). */
export function bookWords(l: SheetLine, n: number): string {
  if (!Number.isFinite(n)) {
    return l.sizeMl ? `Not a count - full ones, and under ${l.sizeMl} ml in the open one.` : "Not a count - type what is on the shelf, zero or more.";
  }
  const d = difference(n, l.book);
  const shown = (q: number) => (l.sizeMl ? bottlesAndMl(q, l.unit, l.sizeMl) : `${q} ${l.unit}`);
  return `Book ${shown(l.book)} · ` + (d === 0 ? "matches" : `${l.sizeMl ? shown(Math.abs(d)) : Math.abs(d)} ${d > 0 ? "more" : "fewer"}`);
}

/** src/lib/format.ts bottlesAndMl: "5 bottles + 120 ml". */
export function bottlesAndMl(q: number, unit: string, sizeMl: number | null | undefined): string {
  const plural = (n: number, u: string) => `${n} ${u}${n === 1 || u.endsWith("s") ? "" : "s"}`;
  if (!sizeMl) return plural(Math.round(q * 1000) / 1000, unit);
  const whole = Math.floor(q + 1e-9);
  const ml = Math.round((q - whole) * sizeMl);
  return ml > 0 ? `${plural(whole, unit)} + ${ml} ml` : plural(whole, unit);
}

/** The lines sent: only those typed; none when any typed line is not a count. */
export function countBody(lines: SheetLine[], counts: Record<string, string>, mls: Record<string, string>, reasons: Record<string, string>):
  { lines: { itemId: string; empty: boolean; book: number; counted: number; reason?: string }[] } | { missing: string } {
  const out: { itemId: string; empty: boolean; book: number; counted: number; reason?: string }[] = [];
  for (const l of lines) {
    const n = countedOf(l, counts[l.key] ?? "", mls[l.key] ?? "");
    if (n === null) continue;
    if (!Number.isFinite(n)) return { missing: `${l.name}: not a count.` };
    const why = (reasons[l.key] ?? "").trim();
    out.push({ itemId: l.itemId, empty: l.empty, book: l.book, counted: n, ...(why ? { reason: why } : {}) });
  }
  return out.length === 0 ? { missing: "Type a count on at least one line - a blank line is not counted." } : { lines: out };
}

/** After a refused save: the lines whose book moved take the new book and
    lose their count, so only they are counted again. */
export function rebook(lines: SheetLine[], fresh: SheetLine[]): { lines: SheetLine[]; moved: string[] } {
  const now = new Map(fresh.map((l) => [l.key, l.book]));
  const moved = lines.filter((l) => now.has(l.key) && now.get(l.key) !== l.book).map((l) => l.key);
  return { lines: lines.map((l) => (moved.includes(l.key) ? { ...l, book: now.get(l.key)! } : l)), moved };
}

/* ── The history (HistoryDialog) ─────────────────────────────────── */

const aMove = (m: StockMovement) => m.kind === "transfer" || m.reversesKind === "transfer";

export function rowTitle(m: StockMovement): string {
  if (m.isReversal && m.reversesKind) return `Undo of ${m.empty ? "a record of empties" : withArticle(NOUN[m.reversesKind])}`;
  if (m.kind === "transfer") return `Moved from ${m.fromStore} to ${m.toStore}`;
  return (m.empty && EMPTY_LABEL[m.kind]) || KIND_LABEL[m.kind];
}

/** "+5 kg", "-2 kg"; a move with no sign - nothing came in or left the hotel. */
export const rowQuantity = (m: StockMovement, unit: string) =>
  `${aMove(m) ? Math.abs(m.quantity) : `${m.quantity > 0 ? "+" : ""}${m.quantity}`} ${unit}`;
export const rowCameIn = (m: StockMovement) => !aMove(m) && m.quantity > 0;

export function rowLine(m: StockMovement): string {
  return dayText(m.date)
    + (m.who ? ` · ${m.who}` : "")
    + (m.kind === "transfer" ? "" : m.fromStore && m.toStore ? ` · ${m.fromStore} to ${m.toStore}` : ` · ${m.store}`)
    + (m.supplier ? ` · ${m.supplier}` : "")
    + (m.reference ? ` · ${m.reference}` : "")
    + (m.outlet ? ` · to ${m.outlet}` : "");
}

/** GST, use by, department, who broke it - every figure the server's. */
export function rowFacts(m: StockMovement): string | null {
  const parts = [
    m.gst && `GST ${m.gst.rate}% ${rupees(m.gst.amount)}, ${m.gst.claimable ? "claimable" : "not claimable"}`,
    m.expiresOn && `use by ${dayText(m.expiresOn)}`,
    m.department && `for ${m.department}`,
    m.kind === "breakage" && `broken by ${m.brokenBy ?? "not known"}`,
  ].filter(Boolean);
  return parts.length ? parts.join(" · ") : null;
}

/** Undo is offered on a row that is neither an undo nor already undone. */
export const undoable = (m: StockMovement) => !m.reversed && !m.isReversal;

export function undoQuestion(m: StockMovement, unit: string): { title: string; body: string; button: string } {
  return {
    title: `Undo this ${nounOf(m)} of ${Math.abs(m.quantity)} ${unit}?`,
    body: m.kind === "transfer"
      ? `It goes back from ${m.toStore} to ${m.fromStore}. It cannot be taken back - to put it right afterwards, move it again.`
      : "It cannot be taken back - to put it right afterwards, record it again.",
    button: `Undo ${nounOf(m)}`,
  };
}
