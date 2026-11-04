/* Run: node --experimental-strip-types src/modules/stores/sheets.check.ts
   The kitchen's and the bar's counts: the same pattern as the Store's -
   only the typed lines are sent, each against the book the server sent, a
   blank line never a zero. */
import {
  askBody, barBody, barCountOf, barDifference, barLead, held, kitchenBody, kitchenDifference, morningText, moved, otherMoves,
  countSaidWords, dayStep, type BarSheet, type KitchenItem, type SheetDrink,
} from "./sheets.ts";

const eq = (got: unknown, want: unknown, what: string) => {
  if (JSON.stringify(got) !== JSON.stringify(want)) throw new Error(`${what}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
};

/* ── The kitchen ── */
const k = (over: Partial<KitchenItem>): KitchenItem => ({
  id: "dal", name: "Toor dal", unit: "kg", opening: 2, received: 5, movedIn: 0, movedOut: 0, used: 1.25, wasted: 0,
  corrected: 0, closing: 5.75, onHand: 5.7, counted: null, countBook: null, ...over,
});
/* The book is the server's onHand (5.7), not the day's closing (5.75) or any sum. */
const dal = k({});
const oil = k({ id: "oil", name: "Oil", unit: "litre", onHand: 3, counted: 2, countBook: 3 });
eq(kitchenBody([dal, oil], { dal: "5", oil: "" }), { lines: [{ itemId: "dal", book: 5.7, counted: 5 }] }, "only what is typed; against the book now");
eq(kitchenBody([dal, oil], { dal: "0" }), { lines: [{ itemId: "dal", book: 5.7, counted: 0 }] }, "a typed 0 is sent");
eq("missing" in kitchenBody([dal, oil], {}), true, "nothing typed: nothing sent");
eq("missing" in kitchenBody([dal, oil], { dal: "-1" }), true, "a minus is not a count");
eq(kitchenDifference(dal, "5"), { text: "-0.7", off: true }, "typed against the book");
eq(kitchenDifference(dal, "5.7"), { text: "matches", off: false }, "matches");
eq(kitchenDifference(oil, undefined), { text: "-1", off: true }, "the day's count against its book");
eq(kitchenDifference(dal, ""), { text: "-", off: false }, "nothing typed, none counted: a dash");
eq(moved(0), "", "nothing moved: blank");
eq(moved(1.25), "1.25", "a movement");
eq(countSaidWords({ recorded: 1, matched: 2 }), "1 difference corrected; 2 matched.", "the server's answer");

/* ── The bar ── */
const d = (over: Partial<SheetDrink>): SheetDrink => ({
  id: "ib", name: "Imperial Blue 180 ml", unit: "bottle", sizeMl: 180, countAs: "poured", packSize: null, poured: true,
  opening: 0, received: 10, moved: 0, sold: 0.83, other: 0, corrected: 0, closing: 9.17, sell: { nip: 1, p30: 2, p60: 0, p90: 0, ml: 150 },
  counted: null, countBook: null, morning: null, morningBook: null, rate: 900, amount: 780, onHand: 9.166, ...over,
});
const ib = d({});
const beer = d({ id: "kf", name: "Kingfisher", countAs: "whole", sizeMl: 650, poured: false, onHand: 10 });
const sheet = { mayCount: true, place: "counter" as const };
eq(held(9.166, ib, "counter"), "9 + 30 ml", "poured: bottles and ml at the counter");
eq(held(9.166, ib, "store"), "9.166", "counted whole in the store");
eq(held(-0.5, ib, "counter"), "-90 ml", "below nothing keeps its sign");
eq(barCountOf(ib, { nip: "9", ml: "30" }, "counter"), 9.167, "9 and 30 ml");
eq(barCountOf(ib, { nip: "", ml: "" }, "counter"), null, "blank: not counted");
eq(barCountOf(ib, { nip: "0", ml: "" }, "counter"), 0, "a typed 0 is counted");
eq(barCountOf(ib, { nip: "9.5", ml: "" }, "counter"), "Imperial Blue 180 ml: whole NIPs.", "whole NIPs");
eq(barCountOf(ib, { nip: "9", ml: "180" }, "counter"), "Imperial Blue 180 ml: whole NIPs, and the open one's ml under 180.", "ml under the size");
eq(barCountOf(beer, { nip: "10", ml: "5" }, "counter"), 10, "counted whole: no ml");
eq(barBody([ib, beer], { ib: { nip: "9", ml: "30" }, kf: { nip: "", ml: "" } }, "counter"),
  { lines: [{ itemId: "ib", book: 9.166, counted: 9.167 }] }, "only the typed drinks, against the book now");
eq("missing" in barBody([ib, beer], {}, "counter"), true, "nothing typed: nothing sent");
eq(barDifference(d({ onHand: 9.1667 }), { nip: "9", ml: "30" }, sheet).text, "matches", "under half a thousandth is no difference");
eq(barDifference(beer, { nip: "8", ml: "" }, sheet), { text: "-2", off: true }, "two short");
eq(barDifference(beer, undefined, { mayCount: false, place: "counter" }).text, "-", "not counted: a dash");
eq(morningText(d({ morning: 9, morningBook: 9.166 }), "counter"), { text: "-30 ml", off: true }, "the morning against the book");
eq(otherMoves(d({ other: -1, corrected: 0.5, moved: 2 }), "counter"), -2.5, "the counter's other moves");
eq(otherMoves(d({ other: 0, corrected: 0, sold: 3 }), "store"), -3, "the store's: its third column is what went to the counter");

const s = (over: Partial<BarSheet>): BarSheet => ({
  place: "counter", places: { counter: { id: "c", name: "Bar counter" }, store: { id: "s", name: "Bar store" } },
  store: { id: "s", name: "Bar store", isActive: true }, businessDate: "2026-10-11", date: "2026-10-11", format: "paper",
  mayCount: true, maySetFormat: false, mayApprove: true, mayCloseBar: false, closedToday: null, pendingRequests: 0, groups: [], ...over,
});
eq(barLead(s({}), "closing"), "Bar counter: the closing count, before the night audit. Type each drink you count; a blank line is not counted.", "the closing count's words");
eq(barLead(s({ date: "2026-10-10" }), "closing"), "Bar counter, an earlier day: the count is typed on today's sheet.", "an earlier day");
eq(barLead(s({ place: "store", mayCount: false }), "closing"), "Bar store, today.", "look only");

eq(askBody([{ itemId: "ib", qty: "3" }, { itemId: "", qty: "" }], "party"), { body: { lines: [{ itemId: "ib", quantity: 3 }], note: "party" } }, "an ask");
eq("missing" in askBody([{ itemId: "ib", qty: "1.5" }], ""), true, "whole NIPs, bottles or packets");
eq("missing" in askBody([{ itemId: "", qty: "" }], ""), true, "nothing asked");

eq(dayStep("2026-10-11", -1), "2026-10-10", "the day before");
eq(dayStep("2026-03-01", -1), "2026-02-28", "over a month");
eq(dayStep("2026-12-31", 1), "2027-01-01", "over a year");

console.log("stores sheets: all checks pass");
