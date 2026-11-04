/* Run: node --experimental-strip-types mobile/src/modules/pos/PayRules.check.ts
   Paying a bill: the web's Till rules and words (Till.tsx, AskDialog.tsx roomAsk). */
import {
  anotherRow, asksCashId, billsOn, firstRow, partBody, partButton, partSums, roomAsk, setMethod, settleBody,
  settledWords, whyNotOtherWays, whyNotSettle, NOTHING_ON_IT, type PartRow,
} from "./PayRules.ts";
import type { OrderLine } from "./types.ts";

/* No node:assert, so the app's own type check reads this file too. */
const eq = (got: unknown, want: unknown, what: string) => {
  if (JSON.stringify(got) !== JSON.stringify(want)) throw new Error(`${what}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
};
const line = (voided: boolean) => ({ voided } as OrderLine);
const order = { lines: [line(false)], eventId: null, eventTitle: null };

/* Who may: the API's sentence for housekeeping; the waiter, reception and the accountant may. */
eq(whyNotSettle(order, "housekeeping"), "Ringing up an order is for the owner, an administrator, the general manager, the hotel manager, "
  + "reception, a till operator or the accountant. Ask one of them.", "housekeeping refused");
eq(whyNotSettle(order, null) != null, true, "no role");
for (const r of ["pos", "front_desk", "finance", "gm"]) eq(whyNotSettle(order, r), null, `${r} may`);
/* Nothing on it (every line struck): the server's sentence. */
eq(whyNotSettle({ lines: [line(true)] }, "pos"), NOTHING_ON_IT, "all struck");
eq(whyNotSettle({ lines: [] }, "pos"), NOTHING_ON_IT, "empty");

/* On a function: the other ways off with the web's sentence; the role comes first. */
const onFn = { ...order, eventId: "e1", eventTitle: "Patil wedding" };
eq(whyNotOtherWays(onFn, "pos"), "This order is on Patil wedding's bill, so the host pays for it there. "
  + "To take a room, cash, a card or UPI, choose \"Not for a function\" above first.", "function");
eq(whyNotOtherWays({ ...onFn, eventTitle: null }, "pos")!.startsWith("This order is on a function's bill"), true, "untitled function");
eq(whyNotOtherWays(order, "pos"), null, "not on a function");
eq(whyNotOtherWays(onFn, "housekeeping")!.startsWith("Ringing up"), true, "role before function");

/* The PAN box: above ₹1,00,000 only (Rule 159), as the web shows it. */
eq(asksCashId({ payable: 100_000 }), false, "exactly 1 lakh");
eq(asksCashId({ payable: 100_000.01 }), true, "above 1 lakh");

/* The bodies, as data/till.ts sends them; offline.ts reads `method` to hold a room charge. */
eq(settleBody("cash"), { method: "cash" }, "cash body");
eq(JSON.parse(JSON.stringify(settleBody("room", "201", "f2", { pan: "ABCDE1234F" }))),
  { method: "room", room: "201", folioId: "f2", pan: "ABCDE1234F" }, "room body");

/* Charge to room: the kept list names the bills; two ask whose. */
const rooms = [
  { room: "201", guest: "Tanvi Bhide", folioId: "f1" },
  { room: "201", guest: "Rekha Gaikwad", folioId: "f2", company: "Infosys" },
  { room: "202", guest: "Sameer Gokhale", folioId: "f3" },
];
eq(billsOn(rooms, " 201 ").length, 2, "two bills on 201");
eq(billsOn(undefined, "201"), [], "no list kept");
eq(roomAsk("202", "₹1,286", billsOn(rooms, "202")),
  { title: "Charge ₹1,286 to room 202?", body: "Sameer Gokhale will see it on their room bill." }, "one bill");
eq(roomAsk("201", "₹1,286", billsOn(rooms, "201")), {
  title: "Charge ₹1,286 to room 201?", body: "Room 201 has 2 open bills. Whose is it?",
  choices: [{ label: "Tanvi Bhide", folioId: "f1" }, { label: "Rekha Gaikwad - bill to Infosys", folioId: "f2" }],
}, "two bills: whose");
eq(roomAsk("999", "₹1,286", []), { title: "Charge ₹1,286 to room 999?" }, "unknown room: the server answers");

/* What is said after. */
eq(settledWords("room", { gross: 1286.2, eventTitle: null }, { payable: 1286.2, guest: "Tanvi Bhide" }), "₹1,286 to Tanvi Bhide", "room");
eq(settledWords("cash", { gross: 1286.2, eventTitle: null }, { payable: 1286 }), "₹1,286", "cash");
eq(settledWords("function", { gross: 5000, eventTitle: "Patil wedding" }, { payable: 5000 }), "₹5,000 on Patil wedding's bill", "function");

/* Part: must equal the payable exactly; all cash is whole rupees. */
const pay = { payable: 1286.2 };
const rows = (...r: Array<Partial<PartRow>>) => r.map((x) => ({ ...firstRow(), ...x }));
eq(partSums(pay, rows({ amount: "1286" })), { bill: 1286, taken: 1286, left: 0, balanced: true, change: null }, "all cash rounds");
eq(partSums(pay, rows({ amount: "1000" }, { method: "card", amount: "286.2" })).balanced, true, "cash + card exact");
eq(partSums(pay, rows({ amount: "1000" }, { method: "card", amount: "286" })).left, 0.2, "20 paise short");
eq(partButton(partSums(pay, rows({ amount: "1000" }, { method: "upi", amount: "200" }))), "₹86 short", "short words");
eq(partButton(partSums(pay, rows({ amount: "1000" }, { method: "upi", amount: "300" }))), "₹14 over", "over words");
eq(partSums(pay, rows({ amount: "abc" })).taken, 0, "not a number is nothing");
eq(partSums(pay, rows({ amount: "1000", tendered: "1100" }, { method: "card", amount: "286.2" })).change, 100, "change due");
eq(anotherRow(286.2), { method: "card", amount: "286.2", tendered: "" }, "another payment: what is left, on a card");
eq(anotherRow(0).amount, "", "nothing left: blank");
eq(setMethod({ method: "cash", amount: "10", tendered: "20" }, "upi"), { method: "upi", amount: "10", tendered: "" }, "card drops tendered");
eq(partBody(rows({ amount: "1000", tendered: "1100" }, { method: "card", amount: "286.2" }, { method: "upi", amount: "" }), { form97: true }), {
  tenders: [{ method: "cash", amount: 1000, tendered: 1100 }, { method: "card", amount: 286.2 }], form97: true,
}, "split body: blank rows dropped, tendered on cash only");

console.log("PayRules.check: all rules hold");
