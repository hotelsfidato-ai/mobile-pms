/* Run: node --experimental-strip-types src/modules/stores/shelf.check.ts
   The Store's rules on a tiny store: a blank is never a zero, what is typed
   is what is sent, every figure is the server's (data where the server's
   figure differs from any sum the phone could make, MEMORY 11). */
import {
  averageText, belowLine, blankMove, byCategory, cardLine, countBody, countedOf, bookWords, correctionWords, depositLine,
  headline, heldText, inTile, moveBody, offeredFor, rebook, rowLine, rowQuantity, rowTitle, sheetFor, shownItems,
  shownOnHand, startingStore, storeLine, tileCounts, transferBody, typed, undoQuestion, undoable, levelText,
  type StockItem, type StockMovement, type StoreList, type StoreSummary,
} from "./shelf.ts";

const eq = (got: unknown, want: unknown, what: string) => {
  if (JSON.stringify(got) !== JSON.stringify(want)) throw new Error(`${what}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
};

const main: StoreSummary = { id: "m", name: "Main store", isActive: true, isMain: true };
const kitchen: StoreSummary = { id: "k", name: "Kitchen store", isActive: true, isMain: false };
const old: StoreSummary = { id: "o", name: "Old store", isActive: false, isMain: false };
const stores = [main, kitchen, old];

const item = (over: Partial<StockItem>): StockItem => ({
  id: "rice", name: "Basmati rice", unit: "kg", category: "Kitchen", onHand: 89, levels: {}, lowIn: [], low: false,
  cylinder: false, empties: 0, emptiesByStore: {}, cylindersOnDeposit: null, depositPerCylinder: null, depositHeld: null,
  inUse: null, sizeMl: null, unitCost: 81.13, value: 7220.57, byStore: { m: 85, k: 4 }, lastMovement: "2026-10-11",
  movements: 6, isActive: true, crockery: false, heldIn: ["m", "k"], today: {}, lastCounted: {}, onOrder: {}, ...over,
});
const rice = item({ levels: { m: 20, k: 4 }, lowIn: ["k"], low: true, lastCounted: { k: "2026-10-09" }, today: { issue: ["k"] } });
const gas = item({
  id: "gas", name: "LPG cylinder 19 kg", unit: "cylinder", onHand: 3, cylinder: true, empties: 1, emptiesByStore: { m: 1 },
  cylindersOnDeposit: 4, depositPerCylinder: 1700.5, depositHeld: 6801.99, inUse: 0, unitCost: 1850, value: 5550,
  byStore: { m: 3 }, heldIn: ["m"],
});
const butter = item({ id: "butter", name: "Butter", category: null, onHand: -0.05, unitCost: null, value: null, byStore: { k: -0.05 }, heldIn: ["k"] });
const rum = item({ id: "rum", name: "Old Monk 750 ml", unit: "bottle", category: "Bar", sizeMl: 750, onHand: 5.04, byStore: { m: 5.04 } });
const cup = item({ id: "cup", name: "Tea cup", unit: "piece", crockery: true, onHand: 22, byStore: { m: 22, r: 6 }, heldIn: ["m", "r"] });
const list: StoreList = {
  stores: [main, kitchen], items: [rum, rice, gas, cup, butter], outlets: [{ id: "rest", name: "Restaurant" }],
  businessDate: "2026-10-11", people: [], inUse: [{ id: "r", name: "Restaurant", kind: "restaurant", isActive: true }],
};

/* ── Held, a dash where none ── */
eq(heldText(undefined), "-", "none held is a dash");
eq(heldText(0), "0", "a real zero is a zero");
eq(heldText(55.04, 750), "55 + 30 ml", "a drink in bottles and ml");
eq(heldText(5, 750), "5", "full bottles only");
eq(shownOnHand(rice, kitchen), 4, "the picked store's");
eq(shownOnHand(gas, kitchen), null, "a store holding none: a dash, not 0");
eq(shownOnHand(rice, null), 89, "all stores: the server's total");

/* ── The line under the title adds no rupees up ── */
eq(headline([rice, gas, butter]), "3 items, 1 not yet valued", "the headline counts, never sums");
eq(headline([butter]), "1 item · nothing received yet, so nothing has a value", "nothing valued");
eq(headline([rice, gas]), "2 items", "all valued");
eq(/₹/.test(headline([rice, gas, butter])), false, "no rupees in the headline");

/* ── The card ── */
eq(levelText(rice, [main, kitchen], null), "Warn at Main 20 · Kitchen 4", "levels, only those set");
eq(levelText(gas, [main, kitchen], null), "No level set", "none set");
eq(levelText(rice, [main, kitchen], kitchen), "Warn at 4 kg", "one store's level");
eq(levelText(gas, [main, kitchen], kitchen), "No level in Kitchen store", "one store, none set");
eq(cardLine(rice, [main, kitchen], null), "Warn at Main 20 · Kitchen 4 · last moved 11 Oct 2026 · counted 9 Oct 2026", "the card's grey line");
eq(belowLine(rice, [main, kitchen], null), "Kitchen store: 4 kg, level 4", "below its level");
eq(belowLine(gas, [main, kitchen], null), null, "not below");
eq(storeLine(rice, [main, kitchen]), "Main 85 · Kitchen 4", "what each store holds");
eq(storeLine(rum, [main, kitchen]), "Main 5 + 30 ml · Kitchen -", "a drink, and a store holding none");
eq(depositLine(gas), "On deposit 4 · ₹1,700.50 each · ₹6,801.99 held · 0 in use at the kitchen", "the deposit: the server's figures, to the paisa");
eq(depositLine({ ...gas, inUse: -1 }).endsWith("more in the stores than on deposit - check the count or the deposit"), true, "never a minus");
eq(depositLine({ ...gas, cylindersOnDeposit: null, depositPerCylinder: null, depositHeld: null, inUse: null }),
  "On deposit - · - each · - held · - in use at the kitchen", "nothing typed: dashes");
eq(averageText(rice), "₹81.13/kg average", "the average to the paisa (MEMORY 9)");
eq(averageText(butter), null, "nothing received: no average");

/* ── The places, the list, the tiles ── */
eq(startingStore(stores, "k"), "k", "the picked store");
eq(startingStore(stores, null), "m", "else the Main store");
eq(offeredFor("receipt", stores, []).map((s) => s.id), ["m", "k"], "nothing received into a switched-off store");
eq(offeredFor("issue", stores, []).map((s) => s.id), ["m", "k", "o"], "a switched-off store may still be emptied");
eq(shownItems(list, { id: "r", name: "Restaurant", isActive: true, isMain: false }, null).map((i) => i.id), ["cup"], "a place in use holds crockery only");
eq(byCategory([rum, rice, butter]).map(([k, v]) => [k, v.length]), [["Bar", 1], ["Kitchen", 1], ["Everything else", 1]], "grouped, no category last");
eq(inTile("below", rice, null, "2026-10-11"), true, "below somewhere");
eq(inTile("below", rice, main, "2026-10-11"), false, "not below in the Main store");
eq(inTile("runOut", butter, null, "2026-10-11"), true, "had some, holds none");
eq(inTile("notValued", butter, null, "2026-10-11"), false, "not valued needs some held");
eq(inTile("notCounted", rice, kitchen, "2026-10-11"), false, "counted 2 days ago");
eq(inTile("notCounted", rice, kitchen, "2026-11-08"), true, "counted 30 days ago");
eq(inTile("notCounted", rice, main, "2026-10-11"), true, "never counted there");
eq(inTile("issued", rice, main, "2026-10-11"), false, "issued in another store");
eq(tileCounts(list.items, null, "2026-10-11").below, 1, "the Below level tile counts");

/* ── What is typed is what is sent ── */
eq(typed(""), null, "blank is not a figure");
eq(typed("  "), null, "spaces are blank");
eq(typed("0"), 0, "a typed 0 is 0");
eq(typed(" 2.5 "), 2.5, "a figure");
eq(typed(".5"), 0.5, "a point first");
for (const bad of ["1e2", "-3", "2,5", "0x10", "1.2.3", "five"]) eq(Number.isNaN(typed(bad)), true, `"${bad}" is not a figure`);

const issue = { ...blankMove("issue", "m"), qty: "5", outletId: "rest", department: " Banquets " };
eq(moveBody(issue, rice, true), { body: { itemId: "rice", kind: "issue", locationId: "m", quantity: 5, outletId: "rest", department: "Banquets" } }, "an issue, positive, its outlet and department");
eq(moveBody({ ...issue, outletId: "none" }, rice, true).hasOwnProperty("body") && (moveBody({ ...issue, outletId: "none" }, rice, true) as { body: { outletId: unknown } }).body.outletId, null, "Not an outlet is sent as null");
eq("missing" in moveBody({ ...issue, outletId: "" }, rice, true), true, "where an issue went is always said");
eq("outletId" in (moveBody({ ...issue, outletId: "" }, rice, false) as { body: object }).body, false, "no outlets at the hotel: none asked");
eq("missing" in moveBody({ ...issue, qty: "" }, rice, true), true, "a blank quantity is not sent");
eq("missing" in moveBody({ ...issue, qty: "0" }, rice, true), true, "a movement of nothing is not sent");
eq("missing" in moveBody({ ...issue, qty: "-5" }, rice, true), true, "no sign is typed");

/* A correction sends the difference from the book of THAT store, signed. */
const count = { ...blankMove("adjustment", "k"), qty: "2.5" };
eq((moveBody(count, rice, false) as { body: { quantity: number } }).body.quantity, -1.5, "the shelf holds 2.5, the book 4");
eq(correctionWords(count, rice), "That is 1.5 kg fewer than the book says.", "the difference, said");
eq("missing" in moveBody({ ...count, qty: "4" }, rice, false), true, "matches the book: nothing to record");
eq((moveBody({ ...count, qty: "0" }, rice, false) as { body: { quantity: number } }).body.quantity, -4, "a counted 0 is a real 0");

/* The swap, every time: blank is not 0 empties. */
const gasOut = { ...blankMove("issue", "m"), qty: "1", outletId: "rest" };
eq("missing" in moveBody(gasOut, gas, true), true, "empties back must be typed");
eq((moveBody({ ...gasOut, empties: "0" }, gas, true) as { body: { emptiesBack: number } }).body.emptiesBack, 0, "0 is an answer");
eq("missing" in moveBody({ ...gasOut, empties: "1.5" }, gas, true), true, "whole empties");

/* A delivery: the cost as typed, Free only ticked, GST all three or none - the amount from the bill. */
const delivery = { ...blankMove("receipt", "m"), qty: "10", cost: "81.75", supplier: "Kirana Bros", reference: "B-12" };
eq(moveBody(delivery, rice, false), { body: { itemId: "rice", kind: "receipt", locationId: "m", quantity: 10, unitCost: 81.75, supplier: "Kirana Bros", reference: "B-12" } }, "a delivery as typed");
eq("unitCost" in (moveBody({ ...delivery, cost: "" }, rice, false) as { body: object }).body, false, "no cost typed: none sent, never 0");
eq((moveBody({ ...delivery, free: true }, rice, false) as { body: { unitCost: number; unitCostFree: boolean } }).body, { itemId: "rice", kind: "receipt", locationId: "m", quantity: 10, unitCost: 0, unitCostFree: true, supplier: "Kirana Bros", reference: "B-12" }, "Free sends 0, ticked");
eq("missing" in moveBody({ ...delivery, gstRate: "5" }, rice, false), true, "GST: not one of three");
const gst = moveBody({ ...delivery, gstRate: "5", gstAmount: "40.88", claimable: "yes" }, rice, false) as { body: Record<string, unknown> };
eq([gst.body.gstRate, gst.body.gstAmount, gst.body.gstClaimable], [5, 40.88, true], "GST as the bill says, no amount worked out");
eq("note" in gst.body, false, "a delivery has no Why");

eq(transferBody(rice, "m", "k", "3", ""), { body: { itemId: "rice", fromId: "m", toId: "k", quantity: 3 } }, "a move");
eq("missing" in transferBody(rice, "m", "", "3", ""), true, "to where, chosen each time");

/* ── The count sheet: a blank line is not counted ── */
const lines = sheetFor([rice, gas, butter, rum], "m");
eq(lines.map((l) => [l.key, l.book]), [["rice", 85], ["gas", 3], ["gas:empty", 1], ["butter", 0], ["rum", 5.04]], "every item, a cylinder's empties too");
eq(countedOf(lines[0]!, "", ""), null, "blank: not counted");
eq(countedOf(lines[0]!, "0", ""), 0, "0 typed: counted as none");
eq(countedOf(lines[4]!, "5", "30"), 5.04, "bottles and ml");
eq(countedOf(lines[4]!, "", "375"), 0.5, "the open one alone");
eq(Number.isNaN(countedOf(lines[4]!, "5", "750")), true, "ml under the bottle's size");
eq(bookWords(lines[0]!, 84), "Book 85 kg · 1 fewer", "the book shows once a count is typed");
eq(bookWords(lines[4]!, 5.04), "Book 5 bottles + 30 ml · matches", "a drink matches");
eq(countBody(lines, { rice: "84", gas: "", butter: "0" }, {}, { rice: " spilt " }), {
  lines: [{ itemId: "rice", empty: false, book: 85, counted: 84, reason: "spilt" }, { itemId: "butter", empty: false, book: 0, counted: 0 }],
}, "only the lines typed are sent; a blank line is not 0");
eq("missing" in countBody(lines, {}, {}, {}), true, "nothing typed: nothing sent");
eq("missing" in countBody(lines, { rice: "8 4" }, {}, {}), true, "not a count: nothing sent");
const fresh = sheetFor([{ ...rice, byStore: { m: 80 } }, gas, butter, rum], "m");
eq(rebook(lines, fresh).moved, ["rice"], "the line whose book moved");
eq(rebook(lines, fresh).lines[0]!.book, 80, "takes the new book");

/* ── The history ── */
const row = (over: Partial<StockMovement>): StockMovement => ({
  id: "1", date: "2026-10-11", kind: "receipt", quantity: 10, unitCost: null, supplier: null, reference: null, note: null,
  outlet: null, who: null, store: "Main store", fromStore: null, toStore: null, isReversal: false, reversesKind: null,
  reversed: false, empty: false, gst: null, expiresOn: null, department: null, brokenBy: null, ...over,
});
eq(rowTitle(row({})), "Received", "a delivery");
eq(rowTitle(row({ isReversal: true, reversesKind: "issue", quantity: 2 })), "Undo of an issue", "an undo says what it undid");
eq(rowTitle(row({ kind: "transfer", fromStore: "Main store", toStore: "Kitchen store" })), "Moved from Main store to Kitchen store", "a move, one line");
eq(rowTitle(row({ empty: true })), "Empties back from the kitchen", "empties");
eq(rowQuantity(row({ kind: "issue", quantity: -5 }), "kg"), "-5 kg", "out, signed");
eq(rowQuantity(row({ kind: "transfer", quantity: 3 }), "kg"), "3 kg", "a move, no sign");
eq(rowLine(row({ who: "Asha", supplier: "Kirana Bros" })), "11 Oct 2026 · Asha · Main store · Kirana Bros", "the row's line");
eq(undoable(row({ reversed: true })), false, "undone once");
eq(undoable(row({ isReversal: true })), false, "an undo is not undone");
eq(undoQuestion(row({ kind: "issue", quantity: -5 }), "kg").title, "Undo this issue of 5 kg?", "undo asks first");

console.log("stores shelf: all checks pass");
