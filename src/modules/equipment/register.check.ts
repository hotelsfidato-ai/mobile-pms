/* Run: node --experimental-strip-types src/modules/equipment/register.check.ts
   The equipment register's rules (register.ts), on made-up data. */
import {
  actsOf, addBody, changesOf, costText, dayText, decisionLine, detailsOf, endsText, headLine, heldText, historyLine, historyNote,
  itemRow, leaves, may, movedWords, notesOf, pillsOf, placesOf, retireWaits, rupees, shownOf, waitingOf, whoMay, whyNotAdd,
  whyNotMove, whyNotReport, whyNotRetire, ADD_REFUSED, REPORT_REFUSED, RETIRED_LOCK, WAITING_LOCK,
  type AddForm, type EquipmentItem, type HistoryEntry,
} from "./register.ts";

/* No node:assert, so the app's own type check reads this file too. */
const eq = (got: unknown, want: unknown) => {
  if (JSON.stringify(got) !== JSON.stringify(want)) throw new Error(`got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
};

const item = (over: Partial<EquipmentItem>): EquipmentItem => ({
  id: "i1", name: "Split AC 1.5 ton", categoryId: null, category: "Appliance", heldAs: "tagged", tag: "EQ-0001", quantity: 1,
  roomId: "r205", locationId: null, place: "Room 205", supplierId: null, supplier: null, purchaseDate: null,
  unitCost: 38000, totalCost: 38000, warrantyEnds: null, amcEnds: null, placeKind: "room", status: "in_use",
  leaving: null, leavingRefused: null, retireRequest: null, retireRefused: null, retired: null, splitFrom: null,
  createdAt: "2026-10-31 07:35:58.215147+05:30", ...over,
});

/* Who may: from the permissions table, in the web's words (words.ts whoMay). */
eq(whoMay("create"), "Owner, Admin, General Manager, Hotel Manager or Inventory Manager");
eq(whoMay("approve"), "Owner, Admin, General Manager or Inventory Manager");
eq(whoMay("export"), "Owner, Admin, General Manager or Accountant");
eq(ADD_REFUSED(), "Adding and changing equipment is for the Owner, Admin, General Manager, Hotel Manager or Inventory Manager.");
eq(may("stores", "approve"), true);
eq(may("hotel_manager", "approve"), false);
eq(may("front_desk", "view"), true);
eq(may("revenue_manager", "view"), false);
eq(may(null, "view"), false);
eq(may("nobody", "view"), false);

/* A figure nobody typed is a dash; a cost keeps its paise; a count's total is the SERVER's
   (a made-up total that is not cost x count shows as sent: MEMORY 11). */
eq(costText(item({})), "₹38,000");
eq(costText(item({ unitCost: null, totalCost: null })), "-");
eq(costText(item({ heldAs: "counted", tag: null, quantity: 12, unitCost: 450.5, totalCost: 5400 })), "₹5,400 · ₹450.50 each");
eq(costText(item({ heldAs: "counted", tag: null, quantity: 12, unitCost: 450, totalCost: null })), "- · ₹450 each");
eq(rupees(0), "₹0");
eq(heldText(item({})), "EQ-0001");
eq(heldText(item({ heldAs: "counted", tag: null, quantity: 1 })), "1 piece");
eq(heldText(item({ heldAs: "counted", tag: null, quantity: 12 })), "12 pieces");
eq(endsText(null, "2026-11-20"), "-");
eq(endsText("2026-03-31", "2026-11-20"), "ended 31 Mar 2026");
eq(endsText("2027-03-31", "2026-11-20"), "31 Mar 2027");
eq(dayText("2026-10-31 07:35:58.215147+05:30"), "31 Oct 2026");
eq(dayText("nonsense"), "-");

/* The head, the pills, the filters, the waiting tile. */
const store = item({ id: "s1", name: "Kettle", heldAs: "counted", tag: null, quantity: 12, roomId: null, locationId: "L1", place: "Main store", placeKind: "store",
  leaving: { moveId: "m", approvalId: "a1", to: "Room 104", reason: "For the room", by: "Test Desk", at: "2026-11-19T04:00:00Z" } });
const broken = item({ id: "b1", status: "under_repair", roomId: "r104", place: "Room 104" });
const gone = item({ id: "g1", status: "retired", roomId: "r9", place: "Room 9" });
const all = [store, broken, gone, item({})];
eq(headLine(all), "3 lines in the hotel · 1 under repair · 1 retired");
eq(headLine([]), "Everything durable in the hotel, the restaurant and the rooms.");
eq(pillsOf(store).map((p) => p.label), ["In use", "Waiting to leave the store"]);
eq(pillsOf(item({ leavingRefused: { to: "Room 1", note: null, at: null, sentBack: false } })).map((p) => p.label), ["In use", "Taking it out refused"]);
eq(placesOf(all).map((p) => p.label), ["Main store", "Room 9", "Room 104", "Room 205"]);
eq(shownOf(all, "r104", "all").map((i) => i.id), ["b1"]);
eq(shownOf(all, "all", "retired").map((i) => i.id), ["g1"]);
eq(waitingOf(all).map((w) => [w.approvalId, w.what]), [["a1", "to leave the store for Room 104"]]);

/* One item: locked while retired or waiting; Ask to take out for somebody who may only look. */
eq(actsOf(gone, "gm").edit, RETIRED_LOCK);
eq(actsOf(store, "gm").move, WAITING_LOCK);
const inStore = item({ placeKind: "store", place: "Main store", roomId: null, locationId: "L1" });
eq(actsOf(inStore, "front_desk").move, null);
eq(actsOf(inStore, "front_desk").moveLabel, "Ask to take out");
eq(actsOf(inStore, "front_desk").edit !== null, true);
eq(actsOf(item({}), "front_desk").move !== null, true);
eq(actsOf(item({}), "gm"), { edit: null, move: null, moveLabel: "Move", statusLabel: "Under repair", line: null });
eq(actsOf(broken, "gm").statusLabel, "Back in use");
eq(notesOf(store).map((n) => [n.title, n.text]), [["Waiting to leave the store", "for Room 104 - asked by Test Desk on 19 Nov 2026: For the room"]]);
eq(notesOf(item({ status: "retired", retired: { by: null, at: "2026-11-01 10:00:00+05:30", reason: "Broken", requestedBy: "Test HM" } }))[0],
  { key: "retired", warm: false, title: "Retired on 1 Nov 2026", text: "by -, asked for by Test HM - Broken" });
eq(detailsOf(item({}), "2026-11-20").map((d) => d.value), ["EQ-0001", "Room 205", "Appliance", "-", "-", "₹38,000", "-", "-"]);

/* Leaving the store is asked, with a reason (the server's sentence). */
eq(leaves(inStore, "room", true, true), true);
eq(leaves(inStore, "store", true, true), false);
eq(leaves(inStore, null, false, false), true);
eq(leaves(item({}), "room", true, false), false);
eq(whyNotMove(false, false, ""), "Choose where it goes first.");
eq(whyNotMove(true, true, " "), "Why is it leaving the store? The Inventory Manager decides on it.");
eq(whyNotMove(true, false, ""), null);
eq(movedWords({ requested: true }), "Asked - it moves when the Inventory Manager approves it");
eq(movedWords({ split: true, quantity: 3 }), "3 moved, as their own line");
eq(whyNotRetire(""), "Why is it being retired? Broken beyond repair, lost, sold, given away.");
eq(retireWaits(item({}), "hotel_manager"), true);
eq(retireWaits(item({}), "stores"), false);
eq(retireWaits(item({ heldAs: "counted" }), "hotel_manager"), false);

/* Only what changed is sent; an emptied cost is null, never zero. */
eq(changesOf(item({}), { name: "Split AC 1.5 ton", category: "Appliance", tag: "EQ-0001", supplierId: "", unitCost: "38000", purchaseDate: "", warrantyEnds: "", amcEnds: "" }), {});
eq(changesOf(item({}), { name: "AC", category: "", tag: "EQ-0001", supplierId: "", unitCost: "", purchaseDate: "", warrantyEnds: "", amcEnds: "" }), { name: "AC", category: null, unitCost: null });

const f: AddForm = { name: " Kettle ", category: "", heldAs: "counted", tag: "EQ-0002", quantity: "12", whereKind: "room", roomId: "", locationId: "", supplierId: "", unitCost: "", status: "in_use", purchaseDate: "", warrantyEnds: "", amcEnds: "" };
eq(whyNotAdd(f), "Where is it? Choose a room or a place - one of the two.");
eq(whyNotAdd({ ...f, roomId: "r1" }), null);
eq(whyNotAdd({ ...f, name: " " }), "What is it called?");
/* A blank cost stays blank (the server keeps null), never 0; no tag on a count. */
eq(addBody({ ...f, roomId: "r1" }), { name: "Kettle", heldAs: "counted", quantity: 12, roomId: "r1", status: "in_use" });

/* Repairs: only a tagged thing; never the accountant or a viewer. */
eq(whyNotReport(item({}), "front_desk"), null);
eq(whyNotReport(item({}), "finance"), REPORT_REFUSED);
eq(whyNotReport(item({ heldAs: "counted" }), "gm"), "A counted line is retired or replaced, not repaired.");
eq(whyNotReport(gone, "gm"), RETIRED_LOCK);

/* The history, in words. */
const h = (over: Partial<HistoryEntry>): HistoryEntry => ({
  id: "h", kind: "added", quantity: 1, from: null, to: null, place: "Room 205", fromStatus: null, toStatus: "in_use",
  related: null, changes: null, note: null, who: null, at: "2026-11-19T04:00:00Z", decision: null, ...over,
});
eq(historyLine(h({}), item({})), "Added in Room 205, in use");
eq(historyLine(h({ kind: "moved", quantity: 3, from: "Main store", to: "Room 104" }), item({ heldAs: "counted" })), "Moved 3 from Main store to Room 104");
eq(historyLine(h({ kind: "edited", changes: { unitCost: { from: null, to: "450.5" }, purchaseDate: { from: "2026-01-02", to: null } } }), item({})),
  "Changed cost from - to ₹450.50; bought on from 2 Jan 2026 to -");
eq(historyLine(h({ kind: "split", quantity: 3, related: { id: "p", name: null, place: "Main store" } }), item({ splitFrom: "p" })), "3 taken from the line in Main store");
eq(historyNote(h({ kind: "retired", note: "x" })), null);
eq(historyNote(h({ kind: "moved", note: "x" })), "x");
eq(decisionLine(h({ decision: { status: "pending", by: null, at: null, note: null } }), () => "-"), { text: "Waiting in the approvals inbox", waiting: true });
eq(decisionLine(h({ decision: { status: "clarify", by: null, at: "x", note: "Which room?" } }), () => "19 Nov 2026, 9:30 AM")?.text, "Sent back 19 Nov 2026, 9:30 AM · - - Which room?");

/* The file: as the screen writes it, a dash for nothing typed. */
eq(itemRow(item({ unitCost: null, totalCost: null })), ["Split AC 1.5 ton", "Appliance", "Tag", "EQ-0001", "1", "Room 205", "In use", "-", "-", "-", "-", "-", "-"]);

console.log("register: all checks pass");

/* The import (M-16, PICKERS 2.11): the web's columns read back from the template whole; a cost or a date left blank stays blank. */
{
  const { EQUIPMENT_SPEC } = await import("./importSpec.ts");
  const { parseCsv, templateCsv } = await import("../../core/importSpec.ts");
  const back = parseCsv(templateCsv(EQUIPMENT_SPEC), EQUIPMENT_SPEC);
  eq([back.missing, back.unknown, back.rows.length], [[], [], 3]);
  eq(back.rows[2], { name: "Sofa, three seater", category: "Furniture", heldAs: "tag", tag: "", quantity: "", room: "", place: "Example lobby",
    supplier: "", purchaseDate: "", unitCost: "", warrantyEnds: "", amcEnds: "", status: "under repair" });
}

/* The three days (M-16, PICKERS 2.12, 2.13): sent in Add when chosen, left out when blank; Edit sends only a changed
   day, and an emptied one as null ("nobody knows"), never anything else. */
eq(addBody({ ...f, roomId: "r1", purchaseDate: "2025-03-14", amcEnds: "2027-03-31" }),
  { name: "Kettle", heldAs: "counted", quantity: 12, roomId: "r1", purchaseDate: "2025-03-14", amcEnds: "2027-03-31", status: "in_use" });
{
  const { changesOf } = await import("./register.ts");
  const item = { name: "AC", category: null, heldAs: "tagged", tag: "EQ-1", supplierId: null, unitCost: null,
    purchaseDate: "2025-03-14", warrantyEnds: null, amcEnds: "2026-01-01" } as unknown as EquipmentItem;
  const same = { name: "AC", category: "", tag: "EQ-1", supplierId: "", unitCost: "", purchaseDate: "2025-03-14", warrantyEnds: "", amcEnds: "2026-01-01" };
  eq(changesOf(item, same), {});
  eq(changesOf(item, { ...same, purchaseDate: "", warrantyEnds: "2028-03-14" }), { purchaseDate: null, warrantyEnds: "2028-03-14" });
}
