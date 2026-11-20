/* Run: node --experimental-strip-types mobile/src/modules/pos/till.check.ts
   The Till's and the Terminal's rules (./till.ts): who rings up, the two
   lists, a row's words and figure (the server's, paise kept, a dash for
   none), what Open and New parcel send, an earlier day's bill, the
   Terminal's outlet and lines, a room-service order, the guest's allergy. */
import {
  activeOutlets, declineTitle, earlierAsked, earlierNone, earlierPath, guestDishes, guestTitle, lockedLine, openBody, openPill,
  orderHref, outletKey, outletName, padHref, parcelBody, precise, RING_REFUSAL, ringWhy, roomLine, rowFigure, rowLabel, rowLine,
  rupees, SETTLED_SHOWN, terminalLine, terminalRowLine, tillLists, type TillRow,
} from "./till.ts";
import { whyNotRing } from "./roles.ts";

const eq = (got: unknown, want: unknown, what: string) => {
  if (JSON.stringify(got) !== JSON.stringify(want)) throw new Error(`${what}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
};

/* Who rings up: today's TILL (roleGate.ts 228) - roles.ts's list and the Bar person. */
const ROLES = ["owner", "admin", "gm", "hotel_manager", "revenue_manager", "front_desk", "housekeeping", "kitchen_manager",
  "chef", "pos", "bar", "stores", "finance", "read_only", "automation"];
eq(ROLES.filter((r) => ringWhy(r) === null), ["owner", "admin", "gm", "hotel_manager", "front_desk", "pos", "bar", "finance"], "who rings up");
eq(ringWhy(null), RING_REFUSAL, "nobody signed in rings nothing");
eq(ringWhy("read_only"), RING_REFUSAL, "a viewer reads the till, rings nothing");
/* Every role answers as roles.ts does: a drift shows here. */
for (const r of ROLES) eq(ringWhy(r), whyNotRing(r), `the same as roles.ts for ${r}`);
eq(RING_REFUSAL.includes("a waiter, a bar person or the accountant"), true, "today's words");

const row = (more: Partial<TillRow>): TillRow => ({
  id: "o1", orderNo: "20261011-136", outlet: "REST", table: "T4", status: "open", businessDate: "2026-10-11",
  gross: 672, net: 600, paymentMethod: null, openedAt: "12:23", lines: 1, ...more,
});

/* The lists: open of any day; finished but never joined; twelve shown. */
const rows: TillRow[] = [
  row({ id: "a" }), row({ id: "b", status: "joined" }), row({ id: "c", status: "settled" }), row({ id: "d", status: "void" }),
  row({ id: "e", status: "no_charge" }), row({ id: "f", status: "abandoned" }),
  ...Array.from({ length: 14 }, (_, i) => row({ id: `s${i}`, status: "settled" })),
];
const lists = tillLists(rows);
eq(lists.open.map((o) => o.id), ["a"], "open orders");
eq(lists.done.length, SETTLED_SHOWN, "twelve settled shown");
eq(lists.done.slice(0, 4).map((o) => o.id), ["c", "d", "e", "f"], "a joined bill is not with the day's bills");
eq(openPill(19), { text: "19 open", warning: true }, "the pill");
eq(openPill(0), { text: "0 open", warning: false }, "none open: neutral");

/* A row's words, as the picture's (all/43). */
eq(rowLine(row({})), "1 item · 12:23", "an open order");
eq(rowLine(row({ lines: 3, openedAt: "06:21", paymentMethod: "upi", status: "settled" })), "3 items · 06:21 · upi", "settled by UPI");
eq(rowLine(row({ lines: 0, openedAt: "11:17" })), "0 items · 11:17", "nothing on it yet");
eq(rowLine(row({ status: "void", paymentMethod: "cash" })), "1 item · 12:23 · cash · VOID", "a voided bill");
eq(rowLine(row({ businessDate: "2026-10-09" }), true), "9 Oct · 1 item · 12:23", "an earlier day's bill says its day");

/* The figure is the server's: gross, or NC with the net; paise kept; never ₹0 for not sent.
   (gross 1481.5 is no sum of net 1300: the row can only be showing the field.) */
eq(rowFigure(row({ gross: 1386 })), { text: "₹1,386", struck: false }, "whole rupees");
eq(rowFigure(row({ gross: 1481.5, net: 1300 })), { text: "₹1,481.50", struck: false }, "paise kept, the gross not the net");
eq(rowFigure(row({ status: "no_charge", gross: 0, net: 441 })), { text: "NC ₹441", struck: false }, "NC with its value, never a sale");
eq(rowFigure(row({ status: "no_charge", net: null })), { text: "NC -", struck: false }, "NC with no value sent: a dash");
eq(rowFigure(row({ status: "void", gross: 336 })), { text: "₹336", struck: true }, "a voided bill keeps its total, struck");
eq(rupees(null), "-", "not sent is a dash");
eq(rupees(0), "₹0", "a real zero bill is ₹0");
eq(precise(1386), "₹1,386.00", "the Terminal's precise money");
eq(precise(undefined), "-", "the Terminal: a dash");
eq(rowLabel(row({ table: null })), "20261011-136, 1 item · 12:23, ₹672", "spoken, with no table");

/* Open and New parcel: what goes to POST /till/orders. */
eq(openBody("REST", "  Table 4 "), { outlet: "REST", table: "Table 4" }, "a typed table");
eq(openBody("REST", "   "), { outlet: "REST" }, "no table typed");
eq(parcelBody("BAR", " Rahul ", " "), { outlet: "BAR", parcel: { name: "Rahul", phone: null } }, "a parcel, no phone");
eq(orderHref("5EL", "o1"), "/pos/5EL/order/o1", "the order");
eq(padHref("5EL", "o1", "Parcel · Rahul"), "/pos/5EL/pad?order=o1&table=Parcel%20%C2%B7%20Rahul", "its pad, by the order");
eq(padHref("5EL", "o1", null), "/pos/5EL/pad?order=o1", "no table: by the order alone");

/* An earlier day's bill: by its number, two characters at least. */
eq([earlierAsked("R"), earlierAsked(" R-"), earlierAsked("R-0012")], [false, true, true], "two characters ask");
eq(earlierPath("5EL", " R-0012 "), "/api/hotels/5EL/till/bills?no=R-0012", "the bills' question");
eq(earlierNone(" R-9 "), 'No paid bill with "R-9" in its number.', "none found");

/* The Terminal. */
const outlets = [{ code: "REST", name: "Fidato Restaurant", isActive: true }, { code: "OLD", name: "Old bar", isActive: false }];
eq(activeOutlets(outlets).map((o) => o.code), ["REST"], "only active outlets are offered");
eq(outletName(outlets, "REST"), "Fidato Restaurant", "the outlet's name");
eq(outletName(outlets, "OLD"), "OLD", "an outlet no longer active: its code");
eq(outletName(undefined, "REST"), "REST", "the list not in yet: its code");
eq(outletKey("5EL") === outletKey("AGR"), false, "one outlet per property");
eq(terminalLine(3, "2026-10-11"), "3 open · Sunday, 11 October 2026", "the header's line");
eq(terminalLine(3, null), "3 open · -", "no business date read: a dash");
eq(terminalRowLine(row({ table: null, lines: 2 })), "no table · 2 items", "a terminal row");
eq(lockedLine("Fidato Restaurant"), "This terminal is locked to Fidato Restaurant.", "the lock line");

/* A room-service order. */
const g = { id: "g", room: "203", note: null, createdAt: "", lines: [{ name: "Dal", qty: 2, unitPrice: 180 }, { name: "Roti", qty: 4, unitPrice: 20 }] };
eq(guestTitle("203"), "Room 203", "the room");
eq(guestTitle(null), "Room service", "no room");
eq(guestDishes(g), "2 × Dal, 4 × Roti", "the dishes");
eq(declineTitle("203"), "Decline Room 203's order?", "decline asks");
eq(declineTitle(null), "Decline this order?", "decline asks, no room");

/* The guest in that room: the allergy is never hidden; only an in-house guest. */
const stays = [
  { room: "203", inHouse: true, preferences: { allergies: "Peanuts", food: "jain" } },
  { room: "204", inHouse: false, preferences: { allergies: "Milk" } },
  { room: "205", inHouse: true, preferences: { food: "veg" } },
  { room: "206", inHouse: true, preferences: {} },
];
eq(roomLine(stays, " 203 "), { allergy: "Peanuts", words: ["Jain"] }, "allergy and food");
eq(roomLine(stays, "204"), null, "arriving, not in the room yet");
eq(roomLine(stays, "205"), { allergy: null, words: ["Vegetarian"] }, "food only");
eq(roomLine(stays, "206"), null, "nothing to say");
eq(roomLine({ error: "refused" }, "203"), null, "an answer not of this shape is no preferences");
eq(roomLine(stays, null), null, "no room");

console.log("till.check: ok");
