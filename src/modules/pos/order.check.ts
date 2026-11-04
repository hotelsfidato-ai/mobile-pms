/* Run: node --experimental-strip-types mobile/src/modules/pos/order.check.ts
   The order's rules: the web's Till card, the API's sentences, the server's figures. */
import {
  SENT_STRIKE, closeButton, customiseAct, discountBody, fewerAct, figures, finished, headerBody, headerForm, headerSummary,
  kotWords, lineActs, roundAct, sendButton, strikeAct, takenAct, whyNotCustom,
} from "./order.ts";
import { whyNotRing, whyNotStrikeSent } from "./roles.ts";
import type { Order, OrderLine } from "./types.ts";

const eq = (got: unknown, want: unknown, what: string) => {
  if (JSON.stringify(got) !== JSON.stringify(want)) throw new Error(`${what}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
};

const line = (over: Partial<OrderLine>): OrderLine => ({
  id: "L1", name: "Paneer Tikka", qty: 2, unitPrice: 320, taxRate: 5, note: null, voided: false, kotStatus: "pending",
  addedBy: null, parentLineId: null, isAddon: false, variationId: null, ...over,
});
const order = (over: Partial<Order>): Order => ({
  id: "O1", orderNo: "20261011-1", outlet: "REST", outletName: "Fidato Restaurant", hotelName: "5 Elements", hotelCity: null,
  hotelGstin: null, table: "T9", status: "open", businessDate: "2026-10-11", paymentMethod: null, openedBy: null, settledBy: null,
  settledAt: null, abandonedReason: null, ticketId: null, eventId: null, eventTitle: null, lines: [], net: 0, discount: 0,
  discountType: null, discountValue: null, discountReason: null, promotionId: null, promotionName: null, taxable: 0, tax: 0,
  gross: 0, roundOff: 0, payable: 0, tenders: [], covers: null, waiter: null, orderType: "dine_in", customerName: null,
  customerPhone: null, customerAddress: null, customerLocality: null, heldAt: null, ...over,
});

const pending = line({ id: "P", kotStatus: "pending" });
const sent = line({ id: "S", kotStatus: "sent" });

/* Send: offered while anything is pending; "Kitchen has it all" and off when not. */
eq(sendButton(order({ lines: [pending, sent] }), "pos"), { label: "Send to the kitchen", off: false, why: null }, "send offered");
eq(sendButton(order({ lines: [sent, line({ voided: true })] }), "pos"), { label: "Kitchen has it all", off: true, why: null }, "nothing pending");
eq(sendButton(order({ lines: [pending] }), "housekeeping").why, whyNotRing("housekeeping"), "send refused in the API's words");

/* A settled or closed bill: no edits on any line. */
for (const status of ["settled", "abandoned"] as const) {
  const acts = lineActs(pending, order({ status, lines: [pending] }), "gm");
  eq([acts.dish, acts.strike], [false, false], `${status}: no edits`);
}
eq(lineActs(line({ voided: true }), order({}), "gm").strike, false, "a struck line is not struck twice");
eq(lineActs(line({ parentLineId: "P" }), order({}), "pos").dish, false, "a side has no − of its own");

/* The sent-dish rule (D27-119): the waiter and the accountant take off an
   unsent dish; a sent one only managers, else the API's own sentence. */
eq(lineActs(pending, order({}), "pos").whyNotTakeOff, null, "waiter, unsent");
eq(lineActs(sent, order({}), "pos").whyNotTakeOff, whyNotStrikeSent("pos"), "waiter, sent");
eq(lineActs(sent, order({}), "finance").whyNotTakeOff, whyNotStrikeSent("finance"), "accountant, sent");
eq(lineActs(sent, order({}), "gm").whyNotTakeOff, null, "GM, sent");
eq(lineActs(pending, order({}), "chef").whyNotTakeOff, whyNotRing("chef"), "no till right first");

/* Strike and fewer: a sent dish asks why first, an unsent one does not. */
eq(strikeAct("5EL", order({}), pending).ask, null, "unsent strike asks nothing");
eq(strikeAct("5EL", order({}), pending).body(), undefined, "unsent strike sends no body");
eq(strikeAct("5EL", order({}), sent).ask?.body, SENT_STRIKE, "sent strike asks why");
eq(strikeAct("5EL", order({}), sent).body("Guest left"), { reason: "Guest left" }, "sent strike's reason");
eq(strikeAct("5EL", order({}), sent).path, "/api/hotels/5EL/till/orders/O1/lines/S/void", "strike path");
eq(fewerAct("5EL", order({}), pending).body(), { qty: 1 }, "one fewer");
eq(fewerAct("5EL", order({}), sent).ask?.title, "1 fewer Paneer Tikka?", "one fewer sent asks");
eq(fewerAct("5EL", order({}), sent).body("Too much"), { qty: 1, reason: "Too much" }, "one fewer sent, reason");
eq(fewerAct("5EL", order({}), line({ qty: 1 })).path.endsWith("/void"), true, "the last one is a strike");

/* Taken: only a Ready dish; the kitchen's words otherwise. */
eq(lineActs(line({ kotStatus: "ready" }), order({}), "pos").taken, true, "ready: Taken");
eq(lineActs(line({ kotStatus: "sent" }), order({}), "pos").taken, false, "sent: no Taken");
eq(takenAct("5EL", order({}), line({ id: "R" })).body(), { lineIds: ["R"] }, "taken body");
eq([pending, sent, line({ kotStatus: "preparing" }), line({ kotStatus: "served" })].map(kotWords),
  [null, "with the kitchen", "on the fire", "served"], "the kitchen's words");

/* THE FIGURES ARE THE SERVER'S: a nonsense order is echoed, never re-added. */
eq(figures(order({ net: 100, tax: 5, payable: 999 })),
  [{ label: "Net", value: "₹100" }, { label: "Tax", value: "₹5" }, { label: "Total", value: "₹999", strong: true }], "echoed, not summed");
eq(figures(order({ net: 680, discount: 68, discountType: "percent", discountValue: 10, taxable: 612, tax: 35.28, payable: 647.28 })).map((f) => `${f.label} ${f.value}`),
  ["Net ₹680", "Discount 10% -₹68", "Taxable ₹612", "Tax ₹35", "Total ₹647"], "the reference picture 08");
eq(figures(order({ roundOff: -0.2, payable: 647 })).find((f) => f.label === "Round off")?.value, "-₹0.20", "a round off in paise");
eq(figures(order({ roundOff: 0.8 })).find((f) => f.label === "Round off")?.value, "+₹0.80", "a round off up");

/* Round off: apply when there is none, undo when there is. */
eq(roundAct("5EL", order({})).body(), { apply: true }, "apply");
eq(roundAct("5EL", order({ roundOff: 0.8 })).body(), { apply: false }, "undo");

/* Close unpaid: a reason always; once anything was sent, managers only. */
eq(closeButton(order({ lines: [pending] }), "pos").why, null, "waiter closes an unsent bill");
eq(closeButton(order({ lines: [sent] }), "pos").why, whyNotStrikeSent("pos"), "waiter may not close a sent bill");
eq(closeButton(order({ lines: [sent] }), "gm").act("5EL").ask?.body?.endsWith(SENT_STRIKE), true, "the GM is told");
eq(closeButton(order({ lines: [line({ kotStatus: "sent", voided: true })] }), "pos").why, null, "a struck sent dish does not count");

/* The discount: amount and reason required; no cap worked out here. */
eq(discountBody("percent", "10", " regular guest "), { type: "percent", value: 10, reason: "regular guest" }, "discount body");
eq(discountBody("percent", "50", "owner's friend"), { type: "percent", value: 50, reason: "owner's friend" }, "over the cap still goes: the server refuses");
eq(discountBody("fixed", "100", "  "), null, "no reason");
eq(discountBody("fixed", "0", "x"), null, "nothing off");
eq(discountBody("fixed", "", "x"), null, "blank amount");

/* The header: only what is answered; the waiter only when picked. */
eq(headerSummary(order({})), "Covers, waiter, customer", "empty header");
eq(headerSummary(order({ covers: 1, waiter: "Ravi", orderType: "takeaway", customerName: "Asha" })), "1 cover · Ravi · Take away · Asha", "full header");
eq(headerBody({ ...headerForm(order({ covers: 3 })), covers: "" }).covers, null, "blank covers is null");
eq("waiterId" in headerBody(headerForm(order({}))), false, "the waiter stays unless picked");

/* What a finished bill says. */
eq(finished(order({ status: "settled", paymentMethod: "cash", settledBy: "Ravi" })), "Paid by cash, taken by Ravi.", "settled");
eq(finished(order({ status: "abandoned", abandonedReason: "Walkout" })), "Closed unpaid - Walkout", "closed");

/* Customise: before Send folded in (one split off); after, lines of their own. */
eq(customiseAct("5EL", order({}), pending, [{ id: "A", qty: 2 }], "one", [{ name: "Extra papad", price: 0, qty: 1 }]).body(),
  { numberedAddons: [{ id: "A", qty: 2 }], just: 1, extras: [{ name: "Extra papad", free: true, qty: 1 }] }, "before Send");
eq(customiseAct("5EL", order({}), sent, [{ id: "A", qty: 1 }], "all", [{ name: "Papad", price: 40, qty: 2 }]).body(),
  { extras: [{ numberedId: "A", qty: 1 }, { name: "Papad", price: 40, qty: 2 }] }, "after Send");
eq(whyNotCustom("Papad", "", false), "Rupees, more than 0 - like 40 or 40.50. Or tick Free.", "no default price");
eq(whyNotCustom("Papad", "", true), null, "Free is chosen, not assumed");
eq(whyNotCustom("Papad", "40.505", false) != null, true, "paise only to two places");

console.log("pos order: all checks pass");
