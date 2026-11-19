/* Run: node --experimental-strip-types src/modules/pos/menuEdit.check.ts
   The Menu's rules (menuEdit.ts): a price is typed, never defaulted; a dash
   for what is not set; variations, sides, add-ons and promotions as the web
   takes them. Server times read the way the phone's engine reads them. */
import {
  couponLine, courseShown, customLine, dishesByGroup, dishesSaved, dishRows, firstRange, groupForm, groupOn, groupRule, marginPctShown, menuHeadings,
  mrpShown, newDish, nextNumber, numberedForm, numberedPrice, numberedState, offAbout, offDone, offTill, optionForm, ownText, parseCourse,
  parseMrp, parsePrep, pickKind, prepShown, priceShown, profitLine, promoForm, promoValue, rateShown, removeType, typeRows, usedLine,
  variationLine, variationsBody, variationsReady, type Dish, type Section,
} from "./menuEdit.ts";
import type { NumberedAddon } from "./types";

const eq = (got: unknown, want: unknown, what = "") => {
  if (JSON.stringify(got) !== JSON.stringify(want)) throw new Error(`${what}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
};
/* Hermes reads ISO only (MEMORY 7, 17): Date.parse made ISO-only inside. */
const isoOnly = <T,>(fn: () => T): T => {
  const real = Date.parse;
  Date.parse = (text: string) => (/^\d{4}-\d{2}-\d{2}T/.test(text) ? real(text) : NaN);
  try { return fn(); } finally { Date.parse = real; }
};

/* A new dish: a blank price is refused, never ₹0; 0 only when Free. */
eq(newDish("c", " ", "100", false, "5"), null, "no name: nothing");
eq(newDish("c", "Tea", "", false, "5"), { ok: false, reason: "Type a price. A blank is not zero - tick Free for a dish that costs nothing." }, "blank price");
eq(newDish("c", "Tea", "-1", false, "5"), { ok: false, reason: "A price must be zero or more." }, "negative");
eq(newDish("c", "Tea", "abc", false, "5"), { ok: false, reason: "A price must be zero or more." }, "not a figure");
eq(newDish("c", " Tea ", "37.50", false, "18"), { ok: true, body: { categoryId: "c", name: "Tea", price: 37.5, taxRate: 18 } }, "as typed");
eq(newDish("c", "Water", "", true, "0"), { ok: true, body: { categoryId: "c", name: "Water", price: 0, taxRate: 0, free: true } }, "free");

const plain: Dish = { id: "p", name: "Paneer Tikka", price: 320.5, mrp: 350, taxRate: null, isActive: true, shortCode: null, isVeg: true, isFavourite: false,
  offUntil: null, offReason: null, prepMinutes: 12, ownPrepMinutes: null, course: 2, ownCourse: 2, variations: [], addonGroups: [] };
const varied: Dish = { ...plain, id: "v", name: "Bhaaji Pau", price: 0, mrp: null, taxRate: 5, isVeg: null, prepMinutes: null, course: null, ownCourse: null,
  variations: [
    { id: "o", label: "Oil", price: 300, mrp: null, typeNo: 1, kind: null, heading: null },
    { id: "b", label: "Butter", price: 400, mrp: 420, typeNo: 1, kind: null, heading: null },
    { id: "x", label: "Extra pau", price: 30, typeNo: 2, kind: "option", heading: "Pau" },
    { id: "n", label: "No pau", price: 0, typeNo: 2, kind: "option", heading: "Pau" },
  ],
  addonGroups: [{ id: "g", label: "Sides", minSelect: 0, maxSelect: 4, addons: [] }] };
eq([priceShown(plain), priceShown(varied), rateShown(plain), rateShown(varied)], ["₹320.50", "-", "-", "5%"], "row figures: a dash, never 0% or ₹0");
eq(variationLine(varied), [
  { heading: "Variation", text: "Oil ₹300.00 (MRP -) · Butter ₹400.00 (MRP ₹420.00)" },
  { heading: "Pau", text: "Extra pau +₹30.00 · No pau Free" },
], "variation lines");

/* Minutes, course, MRP: empty clears; a dash or Any for not set; inherited starred. */
eq([parsePrep(""), parsePrep("15"), parsePrep("0").ok, parsePrep("481").ok, parsePrep("2.5").ok], [{ ok: true, value: null }, { ok: true, value: 15 }, false, false, false], "prep");
eq([parseCourse("3"), parseCourse("10").ok, parseCourse("")], [{ ok: true, value: 3 }, false, { ok: true, value: null }], "course");
eq([parseMrp("₹1,250"), parseMrp("0").ok, parseMrp("")], [{ ok: true, value: 1250 }, false, { ok: true, value: null }], "mrp");
eq([prepShown(null, null), prepShown(undefined, undefined), prepShown(12, null), prepShown(12, 12)], ["-", "-", "12* min", "12 min"], "prep shown");
eq([courseShown(null, null), courseShown(2, null), courseShown(2, 2)], ["Any", "2*", "2"], "course shown");
eq([mrpShown(null), mrpShown(350)], ["MRP -", "MRP ₹350.00"], "mrp shown");
eq([ownText(null), ownText(0), ownText(12)], ["", "0", "12"], "own text");

/* Off for a while: a time still to come, read from Postgres's own text. */
const now = Date.parse("2026-10-31T10:00:00+05:30");
isoOnly(() => {
  const pg = "2026-10-31 16:46:00.123456+05:30";
  const got = offTill(pg, now);
  /* 16:46 in India is 11:16 UTC: the phone writes it in its own time, two-digit hour as en-IN. */
  const d = new Date(Date.UTC(2026, 9, 31, 11, 16));
  const want = `Off till ${String(d.getHours() % 12 || 12).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")} ${d.getHours() < 12 ? "am" : "pm"} - put back`;
  eq(got, want, "off till, from Postgres's text");
  eq(offTill("2026-10-31 09:00:00+05:30", now), null, "past: on again");
  eq(offTill(null, now), null, "never off");
});
eq(offDone("Paneer Tikka", "next_business_day"), { title: "Paneer Tikka is off", body: "Back in tomorrow." }, "off words");
eq([offAbout(["Bhaaji Pau"]), offAbout(["Bhaaji Pau", "Misal"])],
  ["For how long? It comes back on by itself.", "For how long? It comes back on by itself. It goes off on every dish that offers it: Bhaaji Pau, Misal."], "off about");

const sections: Section[] = [
  { id: "s", name: "Starters", taxKind: "restaurant", prepMinutes: null, course: 1, items: [plain, varied] },
  { id: "m", name: "Mains", taxKind: null, prepMinutes: 20, course: null, items: [{ ...varied, id: "v2", name: "Misal", isActive: false }] },
];
eq([...dishesByGroup(sections)], [["g", ["Bhaaji Pau", "Misal"]]], "a shared side");
eq(menuHeadings(false, null).map((h) => [h.value, h.off ?? false]), [["", true], ["restaurant", false], ["bar", false], ["banquet", false], ["other", false]], "not set shown, not chosen");
eq(menuHeadings(false, "alcohol").find((h) => h.value === "alcohol"), { value: "alcohol", label: "Alcohol (VAT)", off: true }, "alcohol no longer served");

/* Variations: picking a type names the choices, never prices them. */
const rows = typeRows(varied);
eq(rows[0]!.choices.map((c) => [c.price, c.free, c.mrp]), [["300", false, ""], ["400", false, "420"]], "rows");
eq(rows[1]!.choices[1], { id: "n", label: "No pau", price: "", free: true, mrp: "" }, "a ₹0 choice was ticked Free");
const blank = [{ kind: null, heading: "", choices: [{ label: "", price: "", free: false, mrp: "" }] }];
eq(pickKind(blank, 0, "size")[0]!.choices.map((c) => [c.label, c.price]), [["Small", ""], ["Medium", ""], ["Large", ""]], "names only");
eq(pickKind(rows, 0, "size")[0]!.choices.map((c) => c.label), ["Oil", "Butter"], "a typed list is kept");
const moved = removeType(rows, 0);
eq([moved.moved, moved.types.length, moved.types[0]!.choices.map((c) => [c.price, c.free])], [true, 1, [["", false], ["", false]]], "the first type gone: prices typed again");
eq([variationsReady(rows, true, "", false), variationsReady(pickKind(rows, 0, "size"), true, "", false), variationsReady(moved.types, true, "", false)],
  [false, true, false], "a type must be picked; every choice priced");
eq([variationsReady([], true, "", false), variationsReady([], true, "250", false), variationsReady([], true, "", true), variationsReady([], false, "250", false)],
  [false, true, true, false], "no types: the dish's own price, typed");
eq(variationsBody(pickKind(rows, 0, "size"), "", false).types[0], { kind: "size", choices: [
  { id: "o", label: "Oil", price: "300", free: false, mrp: "" }, { id: "b", label: "Butter", price: "400", free: false, mrp: "420" }] }, "the text typed");
eq(variationsBody([], "250", false), { types: [], dishPrice: "250", dishFree: false }, "back to one price");

/* A side, a group, the dishes. */
eq([optionForm("Naan", "", false).ready, optionForm("Naan", "", true).body, optionForm("Naan", "-5", false).bad, optionForm("Naan", " 40 ", false).body],
  [false, { label: "Naan", price: "", free: true }, true, { label: "Naan", price: "40", free: false }], "option");
eq([groupForm("Bread", "1", "").ready, groupForm("Bread", "x", "").minError, groupForm("Bread", "2", "0").maxError, groupForm("Bread", "3", "2").maxError, groupForm("Bread", "0", "4").body],
  [true, "A whole number.", "A whole number from 1.", "Not fewer than at least.", { label: "Bread", minSelect: 0, maxSelect: 4 }], "group");
eq([groupRule(0, 4), groupRule(0, null), groupRule(1, 1)], ["Choose up to 4", "Any number, or none", "Choose 1"], "rule");
eq([groupOn([]), groupOn(["Tea", "Coffee"]), dishesSaved("Sides", 1), dishesSaved("Sides", 3)],
  ["Not on any dish yet.", "On Tea, Coffee", "Sides is on 1 dish", "Sides is on 3 dishes"], "group words");

/* A numbered add-on: rupees and paise as typed; the number a suggestion. */
const kebab: NumberedAddon = { id: "k", number: 2, name: "Kebab", description: null, price: 120.5, free: false, isActive: true, offUntil: null, offReason: null };
eq(nextNumber([kebab, { ...kebab, id: "z", number: 9, isActive: false }]), 3, "the next number ignores a switched-off one");
eq(nextNumber([]), 1, "the first");
const f = numberedForm(true, "4", " Egg ", "", "", false);
eq([f.ready, f.priceError], [false, undefined], "a blank price: not ready, no word yet");
eq([numberedForm(true, "4", "Egg", "", "12.345", false).priceError, numberedForm(true, "1000", "Egg", "", "20", false).numberError],
  ["Rupees, more than 0 - like 120 or 120.50. Or tick Free.", "A whole number from 1 to 999."], "add-on errors");
eq(numberedForm(true, "4", "Egg", " two ", "20.50", false).body, { name: "Egg", description: "two", price: 20.5, free: false, number: 4 }, "add-on body");
eq(numberedForm(false, "", "Egg", "", "", true).body, { name: "Egg", description: null, price: 0, free: true }, "a change: no number; free is 0");
eq([numberedPrice(kebab), numberedPrice({ ...kebab, free: true, price: 0 })], ["+₹120.50", "Free"], "add-on price");
eq([numberedState({ ...kebab, isActive: false }).text, numberedState(kebab).text], ["Switched off", "In use"], "state");
eq(customLine({ name: "Cheese", price: 30, times: 1, qty: 3, lastAt: "", by: "Ramesh" }), "1 time, 3 in all · by Ramesh", "custom");

/* Promotions. */
eq([promoForm(true, "", "House", "percent", "50").ready, promoForm(true, "HOUSE", "House", "percent", "150").error,
  promoForm(false, "", "House", "fixed", "0").error, promoForm(true, "HOUSE", "House", "fixed", "200").ready],
  [false, "Between 0 and 100.", "More than nothing.", true], "promotion");
const promo = { id: "1", code: "HOUSE", name: "House guests", kind: "fixed" as const, value: 1500, isActive: true, used: 1,
  coupon: { from: "2026-11-01", to: "2026-11-30", maxUses: 40, minBill: 2000 } };
eq([promoValue(promo), promoValue({ ...promo, kind: "percent", value: 12.5 }), usedLine(1), usedLine(0)], ["₹1,500", "12.5%", "1 bill", "0 bills"], "promotion row");
eq(couponLine(promo), "Coupon · 1 Nov 2026 to 30 Nov 2026 · 1 of 40 used · bills from ₹2,000", "coupon");
eq(couponLine({ ...promo, coupon: null }), null, "a plain promotion");

/* Profit per dish: the server's totals, a dash for no cost. */
eq([marginPctShown(null), marginPctShown(41.3)], ["-", "41.3%"], "margin %");
eq(firstRange("2026-10-11"), { from: "2026-10-01", to: "2026-10-11" }, "first range");
eq(profitLine({ sales: 1234.5, costedSales: 1000.25, cost: 400.1, margin: 600.15, uncostedSales: 234.25 }), {
  line: "Sales ₹1,234.50. Of the dishes with a cost: sales ₹1,000.25, cost ₹400.10, margin ₹600.15.",
  uncosted: "₹234.25 was sold of dishes with no cost." }, "the server's totals, as sent");

/* The export: the web's columns, a dash for none. */
eq(dishRows(sections)[0], ["Starters", "Paneer Tikka", "-", "₹320.50", "-", "₹350.00", "-", "Veg", "12", "2", "Yes"], "a plain dish");
eq(dishRows(sections)[1]!.slice(3, 8), ["-", "Oil 300, Butter 400, Extra pau 30, No pau 0", "-", "5%", "-"], "a varied dish");
eq(dishRows(sections)[2]!.at(-1), "No", "taken off the card");

console.log("menuEdit: all checks pass");
