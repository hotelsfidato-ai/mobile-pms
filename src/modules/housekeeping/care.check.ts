/* Run: node --experimental-strip-types src/modules/housekeeping/care.check.ts
   The minibar's and the checklists' rules (care.ts), on made-up data. */
import {
  changeItemBody, countedText, decideBody, failedText, guestText, itemsOf, lineText, listEmpty, money, newItemBody,
  newListBody, priceInput, recordedLine, recordedOf, recordedPill, runPill, runsEmptyTitle, runsPath, startStore, step,
  exportStatus, recordRow, runRow, stockText, takeBody, takeLines, takenWords, waitingOf, waitingPill, whatWasTaken, whyNotDecline, whyNotOpenTake,
  whyNotSaveItem, whyNotSaveList, whyNotTake, RECORD_REFUSED, SAY_WHY_NOT,
  type MinibarItem, type MinibarRecord,
} from "./care.ts";

/* No node:assert, so the app's own type check reads this file too. */
const eq = (got: unknown, want: unknown) => {
  if (JSON.stringify(got) !== JSON.stringify(want)) throw new Error(`got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
};

const item = (id: string, name: string, price: number | null, active = true): MinibarItem => ({
  id, stockItemId: `s-${id}`, name, unit: "bottle", price, storeId: "st1", store: "Main store", alcohol: false, active, onHand: 24,
});
const items = [item("a", "Water", 40), item("b", "Chips", 62.5), item("c", "Juice", null), item("d", "Old soda", 30, false)];

/* MONEY IS THE SERVER'S: shown as sent, paise kept, a dash for none - never ₹0 (MEMORY 9). */
eq(money(62.5), "₹62.50");
eq(money(120000), "₹1,20,000.00");
eq(money(null), "-");
eq(money(undefined), "-");
eq(money(0.2), "₹0.20");
/* A zero the server sent is a real zero: only a figure not sent is a dash. */
eq(money(0), "₹0.00");
/* A line shows the server's price for ONE; the phone multiplies nothing (2 x 40 is not shown as ₹80). */
eq(lineText({ item: "a", name: "Water", quantity: 2, price: 40, alcohol: false }), "Water x 2 · ₹40.00 each before tax");
eq(lineText({ item: "c", name: "Juice", quantity: 1, price: null, alcohol: false }), "Juice · - each before tax");

const rec = (over: Partial<MinibarRecord>): MinibarRecord => ({
  id: "r1", room: "204", recordedAt: "2026-11-19T04:30:00.000Z", recordedBy: "Test Housekeeper",
  status: "charged", waitingWhy: null, lines: [{ item: "a", name: "Water", quantity: 2, price: 40, alcohol: false },
    { item: "b", name: "Chips", quantity: 1, price: 62.5, alcohol: false }],
  reference: "FD-1042", guest: "Tanvi Bhide", stayStatus: "checked_in",
  decidedBy: null, decidedAt: null, decidedNote: null,
  /* The bill's figure WITH its tax: 151.73, never the phone's 2 x 40 + 62.50 = 142.50 (MEMORY 11). */
  charged: 151.73, reversed: false, ...over,
});
eq(whatWasTaken(rec({})), "Water x 2, Chips");
eq(money(rec({}).charged), "₹151.73");
eq(money(rec({ status: "not_charged", charged: null }).charged), "-");
eq(guestText(rec({})), "Tanvi Bhide (FD-1042)");
eq(guestText(rec({ guest: null, reference: null })), "-");
eq(waitingPill(rec({ waitingWhy: "after_checkout" })), "Found after check-out");
eq(waitingPill(rec({ waitingWhy: "disputed" })), "Not sure");
/* The bill's Reverse wins over "On the bill". */
eq(recordedPill(rec({ reversed: true })).label, "Taken off the bill");
eq(recordedPill(rec({})), { label: "On the bill", tone: "success" });
eq(recordedPill(rec({ status: "not_charged" })).label, "Not charged");
const when = (at: string | null) => (at ? "19 Nov 2026, 10:00 AM" : "-");
eq(recordedLine(rec({}), when), "Test Housekeeper, 19 Nov 2026, 10:00 AM");
eq(recordedLine(rec({ status: "not_charged", decidedAt: "x", decidedBy: null, decidedNote: "Guest's own" }), when),
  "Test Housekeeper, 19 Nov 2026, 10:00 AM · not charged by -: Guest's own");
const m = { records: [rec({ id: "w", status: "waiting", waitingWhy: "disputed" }), rec({ id: "c" })] };
eq(waitingOf(m).map((r) => r.id), ["w"]);
eq(recordedOf(m).map((r) => r.id), ["c"]);
eq(stockText(items[0]!), "Main store: 24 bottle");
eq(stockText({ store: "Bar", onHand: null, unit: "can" }), "Bar: - can");

/* Who may open the take: the server's flag first, then a list to count from. */
eq(whyNotOpenTake({ mayRecord: false, items }), RECORD_REFUSED);
eq(whyNotOpenTake({ mayRecord: true, items: [item("d", "Old", 30, false)] }), "This hotel has no minibar list yet.");
eq(whyNotOpenTake({ mayRecord: true, items }), null);

/* Counting: 0 to 99; an unpriced or switched-off item is never sent (no default prices). */
let n = step({}, "a", -1);
eq(n.a, 0);
for (let i = 0; i < 120; i += 1) n = step(n, "a", 1);
eq(n.a, 99);
eq(takeLines(items, { a: 2, b: 0, c: 3, d: 1 }), [{ itemId: "a", quantity: 2 }]);
eq(takeLines(items, {}), []);
eq(whyNotTake("", [1]), "Which room?");
eq(whyNotTake(" 204 ", []), "Count what was taken first.");
eq(whyNotTake("204", [1]), null);
eq(takeBody(" 204 ", [{ itemId: "a", quantity: 2 }], false), { room: "204", lines: [{ itemId: "a", quantity: 2 }], disputed: false });
eq(countedText([{ quantity: 2 }, { quantity: 1 }]), "3 counted");
eq(countedText([]), "Nothing counted yet");
eq(takenWords("204a", { status: "charged" }), "On room 204A's bill. The refill is out of the store.");
eq(takenWords("204", { status: "waiting", waitingWhy: "after_checkout" }), "Room 204's guest has left: the desk decides.");
eq(takenWords("204", { status: "waiting", waitingWhy: "disputed" }), "Sent to the desk to confirm.");

/* Not charged needs the reason, as the server says; Charge sends no note. */
eq(whyNotDecline("  "), SAY_WHY_NOT);
eq(whyNotDecline("Guest's own bottle"), null);
eq(decideBody(true, "ignored"), { charge: true });
eq(decideBody(false, " Guest's own "), { charge: false, note: "Guest's own" });

/* The list's dialog. */
const stores = [{ id: "m", name: "Main store", bar: false }, { id: "b", name: "Bar", bar: true }];
eq(startStore(stores, true), "b");
eq(startStore(stores, false), "m");
eq(startStore([{ id: "k", name: "Kitchen", bar: false }], true), "k");
eq(startStore([], false), "");
eq(whyNotSaveItem(true, "", "m"), "Which Store item is it?");
eq(whyNotSaveItem(false, "", ""), "Which store is it refilled from?");
eq(whyNotSaveItem(true, "s", "m"), null);
eq(priceInput({ price: null }), "");
eq(priceInput({ price: 62.5 }), "62.5");
eq(priceInput(null), "");
/* An empty price is sent empty: the server keeps "no price yet", never 0. */
eq(newItemBody("s", " ", "m"), { stockItemId: "s", price: "", storeId: "m" });
eq(changeItemBody("45", "b", false), { price: "45", storeId: "b", active: false });
eq(listEmpty({ mayKeep: true, stock: [] }), "Add the items to the Store first, then here.");
eq(listEmpty({ mayKeep: false, stock: [] }), "The owner, an administrator or the general manager adds it.");

/* Checklists. */
eq(itemsOf(" Bed made \n\n Towels \n"), ["Bed made", "Towels"]);
eq(whyNotSaveList([]), "A checklist has at least one item.");
eq(whyNotSaveList(["Bed", "bed"]), "Each item once.");
eq(whyNotSaveList(["x".repeat(121)]), "Keep each item under 120 letters.");
eq(whyNotSaveList(Array.from({ length: 61 }, (_, i) => `Item ${i}`)), "A checklist has at most 60 items.");
eq(whyNotSaveList(["Bed", "Towels"]), null);
eq(newListBody("deep", "", ["Bed"]), { job: "deep", roomTypeId: null, items: ["Bed"] });
eq(runPill({ passed: true, job: "inspection" }).label, "Passed");
eq(runPill({ passed: true, job: "checkout" }).label, "Done");
eq(runPill({ passed: false, job: "inspection" }), { label: "Failed", tone: "danger" });
eq(failedText({ item: "Towels", note: "Stained" }), "Towels - Stained");
eq(failedText({ item: "Towels", note: null }), "Towels");
eq(runsEmptyTitle(" 204a "), "Nothing ticked in room 204A yet");
eq(runsEmptyTitle(""), "Nothing ticked yet");
eq(runsPath("5EL", " 204 "), "/api/hotels/5EL/housekeeping/checklist-runs?room=204");
eq(runsPath("5EL", ""), "/api/hotels/5EL/housekeeping/checklist-runs");

console.log("care: all checks pass");

/* The files: the server's figure with its tax, a dash for none. */
eq(recordRow(rec({}), when), ["204", "FD-1042", "Tanvi Bhide", "Water x 2, Chips x 1", "On the bill", "₹151.73", "Test Housekeeper", "19 Nov 2026, 10:00 AM", "-", "-", "-"]);
eq(exportStatus(rec({ status: "waiting", waitingWhy: "after_checkout", charged: null })), "Waiting: found after check-out");
eq(recordRow(rec({ status: "waiting", charged: null }), when)[5], "-");
eq(runRow({ id: "k", room: "204", job: "inspection", doneAt: "x", doneBy: null, passed: false, failed: [{ item: "Towels", note: "Stained" }] }, when),
  ["204", "Inspection", "Failed", "-", "19 Nov 2026, 10:00 AM", "Towels - Stained"]);
console.log("care: the files pass");
