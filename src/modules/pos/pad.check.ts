/* Run: node --experimental-strip-types mobile/src/modules/pos/pad.check.ts
   The pad's rules: what a dish costs, the "before tax" figure (reference
   picture 05: ₹785 / 2 dishes), the dish sheet's Add rule, and Send's body. */
import {
  addNumbered, addToSent, batchBody, bump, chooseRule, clearDraft, customiseLine, customProblems, dishReady, draftCount,
  draftKey, draftTotal, draftedTables, drop, footerLine, lessNumbered, menuShown, nameWithAddons, pickedIds, priceWithAddons,
  putLine, saveDraft, toggleSide, typesOf, unitPriceOf, type DraftLine,
} from "./pad.ts";
import type { AddonGroup, MenuCategory, MenuItem, NumberedAddon, OrderLine } from "./types";

const eq = (got: unknown, want: unknown, what: string) => {
  if (JSON.stringify(got) !== JSON.stringify(want)) throw new Error(`${what}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
};

const dish = (id: string, name: string, price: number, more: Partial<MenuItem> = {}): MenuItem => ({
  id, name, price, taxRate: 5, isActive: true, shortCode: null, isVeg: null, isFavourite: false, offUntil: null, offReason: null,
  prepMinutes: null, ownPrepMinutes: null, course: null, ownCourse: null, variations: [], addonGroups: [], ...more,
});
const sides: AddonGroup = {
  id: "g", label: "Sides", minSelect: 0, maxSelect: 4,
  addons: ["Onions", "Coriander Chutney", "Curd", "Pudina Chutney", "Papad"].map((label, i) => ({ id: `s${i}`, label, price: 25, offUntil: null })),
};
/* Bhaaji Pau as the scratch menu has it: Oil ₹300 or Butter ₹400, sides ₹25, up to 4. */
const bhaaji = dish("bp", "Bhaaji Pau", 300, {
  variations: [{ id: "oil", label: "Oil", price: 300 }, { id: "butter", label: "Butter", price: 400 }],
  addonGroups: [sides],
});
const chicken = dish("c65", "Chicken 65", 360, { shortCode: "C65" });

/* What one costs: the variation carries the price, sides add; no variation is 0 (Add stays off). */
eq(unitPriceOf(bhaaji, "butter", ["s0"]), 425, "Butter + Onions");
eq(unitPriceOf(bhaaji, null, ["s0"]), 25, "no variation prices at zero plus sides");
eq(unitPriceOf(chicken, null, []), 360, "a plain dish is its own price");
const pizza = dish("pz", "Pizza", 0, { variations: [
  { id: "m", label: "Medium", price: 400, typeNo: 1, kind: "size" }, { id: "l", label: "Large", price: 600, typeNo: 1, kind: "size" },
  { id: "cheese", label: "Cheese burst", price: 90, typeNo: 2, kind: "option", heading: "Crust" },
] });
eq(unitPriceOf(pizza, "l", [], ["cheese"]), 690, "a later type adds to the first");
eq(typesOf(pizza).map((t) => t.heading), ["Size", "Crust"], "type headings in order");

/* The sheet's Add: one of each type, and every group's minimum. */
eq(dishReady(bhaaji, {}, new Set()), false, "no variation: Add off");
eq(dishReady(bhaaji, { 1: "butter" }, new Set()), true, "variation chosen: Add on");
eq(dishReady(pizza, { 1: "l" }, new Set()), false, "one type of two: Add off");
eq(pickedIds(pizza, { 1: "l", 2: "cheese" }), { variationId: "l", moreChoiceIds: ["cheese"] }, "the sheet's ids");
const needOne = dish("th", "Thali", 250, { addonGroups: [{ ...sides, minSelect: 1, maxSelect: 1 }] });
eq(dishReady(needOne, {}, new Set()), false, "a required group short: Add off");
eq(dishReady(needOne, {}, new Set(["s1"])), true, "a required group met");
/* Sides: up to 4 - the fifth tap does nothing; a group of one is a choice. */
let chosen: Set<string> = new Set();
for (const id of ["s0", "s1", "s2", "s3", "s4"]) chosen = toggleSide(chosen, id, sides);
eq([...chosen].sort(), ["s0", "s1", "s2", "s3"], "a full group takes no more");
eq([...toggleSide(new Set(["s0"]), "s1", needOne.addonGroups[0]!)], ["s1"], "a choice replaces");
eq(chooseRule(0, 4), "choose up to 4", "the sides' rule (picture 04)");
eq([chooseRule(1, 1), chooseRule(1, 3), chooseRule(2, null), chooseRule(0, null)], ["choose 1", "choose 1 to 3", "choose at least 2", ""], "rules");

/* The round of picture 05: Bhaaji Pau (Butter · Onions) and Chicken 65 = ₹785, 2 dishes · before tax. */
let pad: DraftLine[] = [];
({ lines: pad } = putLine(pad, bhaaji, 1, "", "butter", ["s0"]));
const added = putLine(pad, chicken, 1, "");
pad = added.lines;
eq(draftTotal(pad), 785, "the pad's figure");
eq(footerLine(pad), "2 dishes · before tax", "the footer's line");
eq(footerLine([]), "nothing on the pad", "an empty pad");
eq(pad[0]!.variationLabel + " · " + pad[0]!.addonLabels.join(" · "), "Butter · Onions", "the line's small print");
/* The same dish again is one more of it; another note is another line. */
const again = putLine(pad, chicken, 1, "");
eq([again.lines.length, again.lines[1]!.qty, again.uid], [2, 2, added.uid], "same dish joins");
eq(putLine(pad, chicken, 1, "Less Spicy").lines.length, 3, "another note is its own line");
eq(draftCount(again.lines), 3, "count by quantity");
eq(draftTotal(again.lines), 1145, "two Chicken 65 are ₹720");
/* − to none takes it off, as the bin. */
eq(bump(pad, added.uid, -1).length, 1, "one less of one is none");
eq(bump(pad, added.uid, 2)[1]!.qty, 3, "one more");
eq(drop(pad, added.uid).length, 1, "the bin");

/* Customise: the numbered add-ons on this line; Just 1 splits one off; a twin joins. */
const kebab: NumberedAddon = { id: "k", number: 2, name: "Kebab", description: null, price: 120, free: false, isActive: true, offUntil: null, offReason: null };
let picks = addNumbered([], kebab);
picks = addNumbered(picks, kebab);
eq(picks, [{ id: "k", number: 2, name: "Kebab", price: 120, qty: 2 }], "a second tap is ×2");
eq(lessNumbered(picks, "k")[0]!.qty, 1, "× takes one off");
const three = bump(pad, added.uid, 2);
const split = customiseLine(three, added.uid, [{ ...picks[0]!, qty: 1 }], "one");
eq(split.map((l) => [l.qty, l.unitPrice]), [[1, 425], [2, 360], [1, 480]], "Just 1: one of three with Kebab");
eq(nameWithAddons("Chicken 65", split[2]!.numberedAddons!), "Chicken 65 with add-on Kebab", "its name");
eq(customiseLine(split, split[2]!.uid, [], "all").map((l) => l.qty), [1, 3], "taken off again, it joins its twin");
eq(priceWithAddons(0.1, [{ price: 0.2, qty: 1 }]), 0.3, "in paise, as the server");
eq(draftTotal(customiseLine(pad, added.uid, [], "all", [{ name: "Extra papad", price: 40, qty: 2 }])), 865, "a typed add-on counts");
eq(customProblems("Extra papad", "", false).ready, false, "a blank price is not zero");
eq(customProblems("Extra papad", "", true).ready, true, "Free is chosen");
eq(customProblems("Extra papad", "40.505", false).priceBad, true, "paise, two at most");

/* Send's body, as the web's OrderPad builds it. */
const sent: OrderLine = {
  id: "L1", name: "Veg Biryani", qty: 1, unitPrice: 310, taxRate: 5, note: null, voided: false, kotStatus: "sent", addedBy: null,
  parentLineId: null, isAddon: false, variationId: null,
};
const round = addToSent(pad, sent, [{ ...picks[0]!, qty: 1 }], [{ name: "Raita", price: 0, qty: 1 }]);
eq(batchBody({ outlet: "REST", tableId: "t1" }, pad), {
  outlet: "REST", tableId: "t1",
  lines: [{ itemId: "bp", qty: 1, variationId: "butter", addonIds: ["s0"] }, { itemId: "c65", qty: 1 }],
  send: true,
}, "a first round: outlet and table");
eq(batchBody({ orderId: "o1", outlet: "REST", tableId: "t1" }, round.slice(2)), {
  orderId: "o1",
  lines: [{ qty: 1, extraFor: "L1", extras: [{ numberedId: "k", qty: 1 }] }, { qty: 1, extraFor: "L1", extras: [{ name: "Raita", free: true, qty: 1 }] }],
  send: true,
}, "another round: the order only; a sent dish's add-ons; a 0 goes as Free");
eq(Object.keys(batchBody({ outlet: "REST", table: "N1" }, pad)).slice(0, 2), ["outlet", "table"], "no id held: the table's name");

/* The menu: a search crosses sections; a section chip shows one. */
const menu: MenuCategory[] = [
  { id: "st", name: "Starters", prepMinutes: null, course: null, items: [bhaaji, chicken] },
  { id: "bv", name: "Beverages", prepMinutes: null, course: null, items: [dish("w", "Water", 20)] },
];
eq(menuShown(menu, "restaurant", null, "c65").filtered.map((c) => c.items.map((i) => i.name)), [["Chicken 65"]], "short code search");
eq(menuShown(menu, "restaurant", "bv", "").filtered.map((c) => c.name), ["Beverages"], "one section");
eq(menuShown(menu, "restaurant", null, "").split, false, "no bar, no tabs");

/* The draft: kept per table until Send; the floor marks the table. */
saveDraft({ key: draftKey("5EL", "REST", "N1"), table: "N1", lines: pad, updatedAt: "" });
eq([...draftedTables("5EL")], ["N1"], "the floor knows N1 has a round on a pad");
eq([...draftedTables("ABC")], [], "another hotel's drafts are not this one's");
clearDraft(draftKey("5EL", "REST", "N1"));
eq(draftedTables("5EL").size, 0, "sent, it goes");

console.log("pos pad: all checks pass");
