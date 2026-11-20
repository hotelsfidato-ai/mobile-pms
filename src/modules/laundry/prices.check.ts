/* Run: node --experimental-strip-types src/modules/laundry/prices.check.ts
   The laundry price list (lane U): who may (the matrix's `laundry` create and
   edit, refusalFor's words), the yellow tile's count, a row's save (blank is
   null, never 0; the same figure is not sent again; 0 only with Free), Add's
   checks, the export's rows, and the offline tier. */
import { can, ROLES } from "../../core/menu.ts";
import { ruleFor } from "../../core/offline.ts";
import {
  ADD_REFUSED, addBody, addedWords, BAD_PRICE, freeTyped, NO_ITEM, PRICE_REFUSED, priceRows, priceSave, priceText, retireAct, retiredWords,
  unpricedCount, unpricedWords, whyNotAdd, whyNotPrice,
} from "./prices.ts";
import { whyNotTake } from "./roles.ts";

const eq = (got: unknown, want: unknown, what = "") => {
  if (JSON.stringify(got) !== JSON.stringify(want)) throw new Error(`${what}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
};
const people = ROLES.filter((r) => r !== "automation");

for (const role of people) {
  eq(whyNotAdd(role) === null, can(role, "create", "laundry"), `add: ${role}`);
  eq(whyNotPrice(role) === null, can(role, "edit", "laundry"), `price: ${role}`);
  eq(whyNotAdd(role) === null, whyNotTake(role) === null, `the same six as taking a bag: ${role}`);
}
eq(whyNotAdd("finance"), ADD_REFUSED, "the accountant reads, may not add");
eq(whyNotPrice("read_only"), PRICE_REFUSED);

const item = (price: number | null, isActive = true) => ({ id: "i", name: "Shirt", service: "wash" as const, price, isActive });
eq(unpricedCount([item(null), item(null, false), item(0), item(60)]), 1, "a retired unpriced line is not counted; 0 is a price");
eq(unpricedWords(0), null);
eq(unpricedWords(1)?.startsWith("One item has no price yet. It reads \"-\", never 0, and a guest's bag"), true);
eq(unpricedWords(3)?.startsWith("3 items have no price yet. They read \"-\", never 0, "), true);

/* A row's save. */
eq(priceText(null), "", "unpriced opens empty, never 0");
eq(priceSave(item(60), "60", false), { skip: true }, "unchanged is not sent");
eq(priceSave(item(60), " 75.50 ", false), { body: { price: 75.5, free: false } }, "as typed");
eq(priceSave(item(60), "", false), { body: { price: null, free: false } }, "blank unprices, never 0");
eq(priceSave(item(null), "", false), { skip: true }, "still unpriced");
eq(priceSave(item(null), "abc", false), { problem: BAD_PRICE });
eq(priceSave(item(null), "-5", false), { problem: BAD_PRICE });
eq(priceSave(item(null), freeTyped(true), true), { body: { price: 0, free: true } }, "Free saves 0 with free");
eq(priceSave(item(0), freeTyped(false), false), { body: { price: null, free: false } }, "Free off unprices");
eq(priceSave(item(null), "0", false), { body: { price: 0, free: false } }, "a typed 0 goes; the server refuses it in its words");

eq([retireAct(true), retireAct(false)], ["Retire", "Put back"]);
eq(retiredWords({ name: "Shirt", isActive: true }), "Shirt is off the list. Dockets already written keep their own copy.");
eq(retiredWords({ name: "Shirt", isActive: false }), "Shirt is back on the list.");

/* Add. */
eq(addBody(NO_ITEM), { problem: "What is it called?" });
eq(addBody({ ...NO_ITEM, name: " Saree ", service: "dry_clean" }), { body: { name: "Saree", service: "dry_clean", price: null, free: false } }, "blank is null");
eq(addBody({ ...NO_ITEM, name: "Saree", price: "250" }), { body: { name: "Saree", service: "wash", price: 250, free: false } });
eq(addBody({ ...NO_ITEM, name: "Saree", price: "x" }), { problem: BAD_PRICE });
eq(addedWords("Bed sheet", false), "Bed sheet is on the list with no price. It reads \"-\" until somebody sets one.");

/* The export: a dash for none, 0 a price, paise kept. */
eq(priceRows([item(null), { ...item(0), name: "Towel" }, { ...item(62.5, false), name: "Sari", service: "dry_clean" }]),
  [["Shirt", "Wash", "-", "Yes"], ["Towel", "Wash", "₹0", "Yes"], ["Sari", "Dry-clean", "₹62.50", "No"]]);

/* Offline: no laundry path is on the web's list - refused, never held. */
eq(ruleFor("/api/hotels/5EL/laundry/price-list", "POST").tier, "refuse");
eq(ruleFor("/api/hotels/5EL/laundry/price-list/i1", "POST").tier, "refuse");

console.log("laundry prices.check: ok");
