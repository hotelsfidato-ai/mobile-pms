/* Run: node --experimental-strip-types src/modules/inventory/rates.check.ts
   Rates' rules on a phone (rates.ts): a dash never a zero, the server's
   figures drawn as sent, what is typed is what is sent, the web's ranges. */
import {
  addDays, baseBody, breakupRows, cellsByDay, dateShort, dayHead, daysThrough, differenceOf, figure, fillOf, lookOf,
  nightsMark, occupancyOf, offered, priceOf, rangeOf, restrictionBody, rupees, spanWords, tappedPrice, typedNights,
  typedPrice, typesOf, typesOwnBase, toneOf, windowOf, type Pricing, type PricingCell,
} from "./rates.ts";
import { ruleFor } from "../../core/offline.ts";

const eq = (got: unknown, want: unknown, what: string) => {
  if (JSON.stringify(got) !== JSON.stringify(want)) throw new Error(`${what}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
};

/* ── A missing figure is a dash; a figure is never rounded ── */
eq(rupees(null), "-", "null is a dash");
eq(rupees(undefined), "-", "undefined is a dash");
eq(rupees(Number.NaN), "-", "NaN is a dash, not ₹NaN");
eq(rupees(4099), "₹4,099", "a whole price");
eq(rupees(4099.5), "₹4,099.50", "paise kept, never rounded to ₹4,100 (MEMORY 9)");
eq(rupees(172972), "₹1,72,972", "Indian grouping");
eq(rupees(0), "₹0", "a real zero from the server (revenue) stays a zero");
eq(figure(null), "-", "an add-on not set is a dash");
eq(figure(0), "Free", "a typed 0 is Free (X-1)");
eq(figure(250.25), "₹250.25", "an add-on to the paisa");
eq(occupancyOf(null), "-", "no rooms to sell: a dash");
eq(occupancyOf(105.88), "106%", "the web's percent(x, 0)");
eq(fillOf(105.88), 100, "the capsule fills no further than full");
eq(fillOf(null), 0, "an empty capsule for no figure (its words say the dash)");
eq(differenceOf(null), "-", "a difference never set");
eq(differenceOf({ amount: 500, unit: "rupees" }), "+₹500", "rupees up");
eq(differenceOf({ amount: -250.5, unit: "rupees" }), "-₹250.50", "rupees down, to the paisa");
eq(differenceOf({ amount: 12.5, unit: "percent" }), "+12.5%", "percent");

/* ── The fortnight ── */
eq(addDays("2026-10-31", 1), "2026-11-01", "a month turns");
eq(windowOf("2026-10-11").length, 14, "fourteen days");
eq(windowOf("2026-10-11")[13], "2026-10-24", "the last day");
eq(rangeOf("2026-10-11"), "11 Oct 2026 – 24 Oct 2026", "the toolbar's range");
eq(dayHead("2026-10-11"), { dow: "SUN", day: 11, weekend: true }, "a Sunday is the default weekend");
eq(dayHead("2026-10-16", { weekendDays: [5, 6] }).weekend, true, "the hotel's own weekend (Friday)");
eq(dayHead("2026-10-11", { weekendDays: [5, 6] }).weekend, false, "Sunday is not this hotel's weekend");
eq(dayHead("2026-10-14", { weekendDays: [], holidays: [{ day: "2026-10-14" }] }).weekend, true, "a holiday is shaded");

/* ── The base row: what each cell is, and what a tap starts on ── */
const cell = (over: Partial<PricingCell>): PricingCell =>
  ({ date: "2026-10-11", roomTypeId: "t1", mealPlan: "EP", price: 4099, covers: 1, source: "typed", ...over });
eq(lookOf(undefined), "none", "no cell");
eq(lookOf(cell({ price: null, source: null })), "none", "not priced");
eq(lookOf(cell({})), "base", "a base");
eq(lookOf(cell({ source: "derived" })), "derived", "from the base room type");
eq(lookOf(cell({ source: "rack" })), "older", "the old rack");
eq(lookOf(cell({ covers: 2 })), "older", "a price set before 162 covering two");
eq(tappedPrice(cell({ price: 3999.5 })), 3999.5, "a base opens on itself, exactly");
eq(tappedPrice(cell({ covers: 2 })), null, "an older price opens empty: the base is typed afresh");
eq(tappedPrice(cell({ source: "derived" })), null, "a derived price opens empty");
eq(tappedPrice(cell({ price: null, source: null })), null, "nothing set opens empty, not on ₹0");

const type = (id: string, difference: Pricing["roomTypes"][number]["difference"]) =>
  ({ id, name: id, baseOccupancy: 1, maxOccupancy: 3, rack: null, difference });
const own: Pricing = { from: "2026-10-11", basis: null, roomTypes: [type("a", null), type("b", null)], addons: {} as never, older: [], cells: [] };
eq(offered(own).map((t) => t.id), ["a", "b"], "each type its own base: all offered");
const derived: Pricing = { ...own, basis: { roomTypeId: "a", roomType: "a", mealPlan: "EP" }, roomTypes: [type("a", null), type("b", { amount: 400, unit: "rupees" }), type("c", null)] };
eq(offered(derived).map((t) => t.id), ["a", "c"], "derived: the base type and an Independent one");
eq(typesOwnBase(derived, "b"), false, "a derived type is not typed on the calendar");
eq(cellsByDay({ ...own, cells: [cell({ mealPlan: "CP", price: 1 }), cell({ price: 2 })] }).get("t1/2026-10-11")?.price, 2, "the base row reads EP only");

/* ── The break-up rows ── */
eq(breakupRows(2, 3).map((r) => r.label),
  ["2 guests", "CP · 2 guests", "MAP · 2 guests", "AP · 2 guests", "AI · 2 guests", "+ per extra adult", "+ per extra child"], "a room for three");
eq(breakupRows(2, 2).map((r) => r.label), ["2 guests", "CP · 2 guests", "MAP · 2 guests", "AP · 2 guests", "AI · 2 guests"],
  "no extra guest where none fits (D27-206)");
eq(breakupRows(1, 1).map((r) => r.label), ["CP · 1 guest", "MAP · 1 guest", "AP · 1 guest", "AI · 1 guest"], "a single: its base line is the row");

/* ── Rooms left ── */
const inv = (roomTypeId: string, roomType: string, available: number) =>
  ({ roomTypeId, roomType, date: "2026-10-11", sellable: 5, occupied: 5 - available, sold: 1, available });
eq(typesOf([inv("d", "Deluxe", 1), inv("s", "Superior", 2), inv("d", "Deluxe", 3)]), [{ id: "d", name: "Deluxe" }, { id: "s", name: "Superior" }], "types in the server's order");
const rule = { roomTypeId: "d", date: "2026-10-11", stopSell: true, closedArrival: false, closedDeparture: false, minNights: null, maxNights: null };
eq(toneOf(inv("d", "Deluxe", 3), rule), "closed", "a stop sell wins");
eq(toneOf(inv("d", "Deluxe", 0), undefined), "none", "nothing left");
eq(toneOf(inv("d", "Deluxe", 2), { ...rule, stopSell: false }), "open", "open");
eq(nightsMark({ ...rule, minNights: 2, maxNights: 5 }), "2–5", "min and max");
eq(nightsMark({ ...rule, minNights: null, maxNights: 7 }), "7", "max only, as the web writes it");
eq(nightsMark(rule), "", "no nights rule");

/* ── What is typed is what is sent ── */
eq(typedPrice("4099"), "4099", "digits");
eq(typedPrice("₹4,099.505"), "4099.50", "the field keeps only what can be sent");
eq(typedPrice("40.9.9"), "40.99", "one point");
eq(typedNights("2 nights"), "2", "nights are digits");
eq(priceOf(""), null, "empty is not a price");
eq(priceOf("."), null, "a point alone is not a price");
eq(priceOf("4099.50"), 4099.5, "the typed figure");
eq(daysThrough("2026-10-11", "2026-10-11"), 1, "one day");
eq(daysThrough("2026-10-30", "2026-11-02"), 4, "through a month's end, both counted");
eq(spanWords("2026-10-11", "2026-10-11"), "11 Oct 2026 only.", "one day's words");
eq(spanWords("2026-10-11", "2026-10-13"), "3 days, 11 Oct 2026 through 13 Oct 2026.", "a range's words");
eq(dateShort("2026-01-05"), "5 Jan 2026", "the web's dateShort");

const tap = { roomTypeId: "t1", from: "2026-10-11", until: "2026-10-13", text: "4099.50", free: false, clearing: false };
eq(baseBody(tap), { roomTypeId: "t1", from: "2026-10-11", to: "2026-10-14", price: 4099.5 },
  "the typed figure, and `to` the first day NOT covered");
/* MINV-1: what a phone can type never becomes NaN, which JSON writes as null - the API's Clear. */
eq(JSON.stringify(baseBody({ ...tap, text: typedPrice("4,099") })), JSON.stringify({ roomTypeId: "t1", from: "2026-10-11", to: "2026-10-14", price: 4099 }),
  "a comma never clears the base");
eq(baseBody({ ...tap, text: "" }), undefined, "empty sends nothing: never a zero, never a clear");
eq(baseBody({ ...tap, text: "0" }), { roomTypeId: "t1", from: "2026-10-11", to: "2026-10-14", price: 0 },
  "a typed 0 not ticked Free is sent as typed - the server refuses it in its own words");
eq(baseBody({ ...tap, text: "", free: true }), { roomTypeId: "t1", from: "2026-10-11", to: "2026-10-14", price: 0, free: true }, "Free");
eq(baseBody({ ...tap, clearing: true }), { roomTypeId: "t1", from: "2026-10-11", to: "2026-10-14", price: null }, "Clear sends null");

eq(restrictionBody({ roomTypeId: "d", from: "2026-10-11", until: "2026-10-13", stopSell: true, closedArrival: false, closedDeparture: true, min: "", max: "5" }),
  { roomTypeId: "d", from: "2026-10-11", to: "2026-10-13", stopSell: true, closedArrival: false, closedDeparture: true, minNights: null, maxNights: 5 },
  "a restriction's range is inclusive; an empty field is no rule, not zero");

/* ── Offline: the web holds no rate write (offline.ts lists none) - each is refused, with its words ── */
for (const [method, path] of [["PUT", "/api/hotels/5EL/pricing/base"], ["POST", "/api/hotels/5EL/restrictions"]] as const) {
  const r = ruleFor(path, method, "{}");
  eq(r.tier, "refuse", `${method} ${path} is refused offline`);
  eq(r.reason?.startsWith("This cannot be done offline yet."), true, `${path}: the web's sentence for an unlisted write`);
}

console.log("inventory rates: ok");
