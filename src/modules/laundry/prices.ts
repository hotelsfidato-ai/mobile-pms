/* ══════════════════════════════════════════════════════════════════
   THE LAUNDRY PRICE LIST'S RULES ON A PHONE (lane U, 19 Nov) — ported by
   hand from the web's src/modules/laundry/pages/PriceList.tsx (the yellow
   tile's count and words, ItemRow's save and retire, AddDialog's checks,
   PRICE_EXPORT's columns) and data/laundry.ts (the shapes, in ./docket.ts).
   The server is api/src/modules/laundry/laundry.ts lines 95-205 (GET and
   POST /price-list, POST /price-list/:id), its gates LAUNDRY_PRICE_ADD
   (`laundry` create) and LAUNDRY_PRICE (`laundry` edit) in
   api/src/roleGate.ts lines 218-219.

   NO DEFAULT PRICES, and this screen is where that rule is seen: a price
   nobody has set reads "-"; it is not 0 and not blank-meaning-free. Blank
   puts a line back to "nobody has priced it" (null); 0 only with Free
   ticked (D27-120). RETIRING IS NOT DELETING: a docket already written
   keeps its own copy. Retiring asks first (M-13).

   Pure: no React Native, so prices.check.ts runs under node.
   ══════════════════════════════════════════════════════════════════ */

import { rupees, SERVICE_WORDS, type LaundryService, type PriceItem } from "./docketRules.ts";

/* ── Who may (refusalFor's words; the same six as taking in a bag) ── */

export const PRICE_KEEPERS: readonly string[] = ["owner", "admin", "gm", "hotel_manager", "front_desk", "housekeeping"];
const SIX = "the owner, an administrator, the general manager, the hotel manager, reception or housekeeping";
export const ADD_REFUSED = `Adding to the laundry price list is for ${SIX}. Ask one of them.`;
export const PRICE_REFUSED = `Changing the laundry price list is for ${SIX}. Ask one of them.`;
const allow = (role: string | null, refusal: string) => (role != null && PRICE_KEEPERS.includes(role) ? null : refusal);
export const whyNotAdd = (role: string | null) => allow(role, ADD_REFUSED);
export const whyNotPrice = (role: string | null) => allow(role, PRICE_REFUSED);

/* ── The yellow tile: said where somebody would look ── */

export const unpricedCount = (items: readonly Pick<PriceItem, "isActive" | "price">[]) =>
  items.filter((i) => i.isActive && i.price === null).length;

/** The tile's words, or null when nothing on the list is unpriced. */
export function unpricedWords(n: number): string | null {
  if (n <= 0) return null;
  return `${n === 1 ? "One item has no price yet. It reads \"-\", never 0, " : `${n} items have no price yet. They read "-", never 0, `}`
    + "and a guest's bag holding one has no total and cannot be charged to a room. A price added later applies to new bags only; "
    + "a bag already taken keeps the dash and is taken again. Leave it blank for the hotel's own linen, which is counted and never charged.";
}

/* ── One line's price (ItemRow), typed in the row ── */

export const BAD_PRICE = "A price is zero or more, or nothing at all.";

/** What the box holds for a line: blank where nobody has priced it. */
export const priceText = (price: number | null) => (price === null ? "" : String(price));

/** What leaving the box sends: nothing when it is what the server holds; the sentence
    when it is not a figure; else the body - blank is null (unpriced), never 0. */
export function priceSave(item: Pick<PriceItem, "price">, typed: string, free: boolean):
  { skip: true } | { problem: string } | { body: { price: number | null; free: boolean } } {
  const s = typed.trim();
  if (s !== "" && (!Number.isFinite(Number(s)) || Number(s) < 0)) return { problem: BAD_PRICE };
  if (s === priceText(item.price)) return { skip: true };
  return { body: { price: s === "" ? null : Number(s), free } };
}

/** Free ticked fills 0 and greys the box, and is saved at once; unticked empties it (unpriced). */
export const freeTyped = (on: boolean) => (on ? "0" : "");

/* ── Retire, put back ── */

export const itemTitle = (i: Pick<PriceItem, "name" | "service">) => `${i.name} · ${SERVICE_WORDS[i.service]}`;
export const retireAct = (isActive: boolean) => (isActive ? "Retire" : "Put back");
export const retiredWords = (i: Pick<PriceItem, "name" | "isActive">) =>
  i.isActive ? `${i.name} is off the list. Dockets already written keep their own copy.` : `${i.name} is back on the list.`;
export const retireAsk = (i: Pick<PriceItem, "name" | "service">) => ({
  title: `Retire ${itemTitle(i)}?`,
  body: "It is taken off the list, so it cannot be collected from now. Dockets already written keep their own copy of the description and the price, and it can be put back.",
});

/* ── Add an item (AddDialog) ── */

export interface AddDraft { name: string; service: LaundryService; price: string; free: boolean }
export const NO_ITEM: AddDraft = { name: "", service: "wash", price: "", free: false };
export const SERVICES: { value: LaundryService; label: string }[] = [
  { value: "wash", label: "Wash" }, { value: "press", label: "Press" }, { value: "dry_clean", label: "Dry-clean" },
];

export function addBody(d: AddDraft):
  { problem: string } | { body: { name: string; service: LaundryService; price: number | null; free: boolean } } {
  if (!d.name.trim()) return { problem: "What is it called?" };
  const s = d.price.trim();
  if (s !== "" && (!Number.isFinite(Number(s)) || Number(s) < 0)) return { problem: BAD_PRICE };
  /* BLANK IS NOT ZERO: nobody has priced it, so null is sent. */
  return { body: { name: d.name.trim(), service: d.service, price: s === "" ? null : Number(s), free: d.free } };
}

export const addedWords = (name: string, priced: boolean) =>
  priced ? `${name} is on the list.` : `${name} is on the list with no price. It reads "-" until somebody sets one.`;

/* ── The export (PRICE_EXPORT, D27-383): no price set is a dash; 0 is free ── */

export const PRICE_COLUMNS = ["Item", "Service", "Price", "In use"] as const;
export const priceRows = (items: readonly PriceItem[]) =>
  items.map((i) => [i.name, SERVICE_WORDS[i.service], rupees(i.price), i.isActive ? "Yes" : "No"]);
