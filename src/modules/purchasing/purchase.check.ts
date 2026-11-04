/* Run: node --experimental-strip-types src/modules/purchasing/purchase.check.ts
   Purchasing's rules on a phone (purchase.ts), on data where a wrong rule
   gives a different answer (MEMORY 11): totals the phone could make that
   differ from the server's, blanks that a Number() would turn into 0. */
import { DASH } from "../../core/format.ts";
import { ruleFor } from "../../core/offline.ts";
import {
  approvalFor, askBody, askedDay, creditLine, decidedCard, deliveredTitle, deliveredWords, deliveryBody, deliveryStart,
  factsOf, figure, firstStore, gstParts, isFree, lineParts, mayCancel, mayDeliver, mayDownload, mayPrice, maySend,
  priceBody, raisedWords, rupees, sendProblem, cancelProblem, STATE_TONE, STATE_WORDS, suggestedDue, typed, unpricedTile,
  when, type AskDraft, type DeliveryDraft, type PurchaseRequest,
} from "./purchase.ts";

const eq = (got: unknown, want: unknown, what: string) => {
  if (JSON.stringify(got) !== JSON.stringify(want)) throw new Error(`${what}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
};

const request = (over: Partial<PurchaseRequest>): PurchaseRequest => ({
  id: "r1", reference: "PO-5EL-2610-0005", state: "ready", reason: "The rice is down to two days",
  store: { id: "s1", name: "Main store" }, supplier: null, approvalId: null,
  /* The server's total, deliberately not 40 × 51.25 (2050): the phone must show the server's. */
  total: "2152.50", lines: 1, unpriced: 0, requestedBy: "Test Inventory Manager",
  requestedAt: "2026-10-28 14:05:33.215147+05:30", decidedBy: null, decisionNote: null, orderedBy: null, orderedAt: null,
  receivedBy: null, receivedAt: null, deliveryNote: null, cancelledReason: null, ...over,
});

/* ── Words and tones, the web's ── */
eq(STATE_WORDS.received, "Delivered", "received reads Delivered");
eq(STATE_WORDS.ready, "Ready to order", "ready");
eq(STATE_TONE.refused, "danger", "refused is red");
eq(STATE_TONE.sent_back, "warning", "sent back waits on the asker: yellow");
eq(STATE_TONE.ordered, "info", "ordered is blue");

/* ── Figures: the server's text, never rounded, a dash for none ── */
eq(rupees("2050.00"), "₹2,050", "whole rupees as the picture");
eq(rupees("2152.50"), "₹2,152.50", "paise kept, never rounded to ₹2,153");
eq(rupees("125000.00"), "₹1,25,000", "Indian grouping");
eq(rupees("0.00"), "₹0", "free is a price");
eq(rupees(null), DASH, "not agreed is a dash");
eq(rupees(undefined), DASH, "not sent is a dash");
eq(rupees("abc"), DASH, "unreadable is a dash, never NaN");
eq(figure("40.000"), "40", "a quantity without its zeros");
eq(figure("2.500"), "2.5", "a part quantity");
eq(figure("0.000"), "0", "none came is 0");
eq(figure(null), DASH, "not received yet is a dash");
eq(lineParts({ quantity: "40.000", unitPrice: "51.25" }), "40 × ₹51.25", "a line's amount as its parts, not 2050");
eq(lineParts({ quantity: "40.000", unitPrice: null }), DASH, "an unpriced line has no amount");
eq(factsOf(request({})).find((f) => f.label === "Total")?.value, "₹2,152.50", "the total is the server's");
eq(factsOf(request({ total: null, unpriced: 1 })).find((f) => f.label === "Total")?.value, DASH, "a line unpriced: no total at all");
eq(factsOf(request({})).find((f) => f.label === "Supplier")?.value, DASH, "no supplier before the order goes: a dash");
eq(factsOf(request({})).map((f) => f.label), ["What it is for", "Deliver to", "Supplier", "Total", "Asked by", "Asked", "Decided by", "Ordered"], "the web's order");

/* ── Dates read as text (MEMORY 7): the server's own clock ── */
eq(askedDay(request({})), "28 Oct 2026", "the list's Asked, the web's dateShort");
eq(when("2026-10-28 14:05:33.215147+05:30"), "28 Oct 2026, 2:05 PM", "the web's dateTime");
eq(when(null), DASH, "not ordered is a dash");

/* ── What the order allows ── */
eq(maySend(request({})), true, "ready and priced");
eq(maySend(request({ unpriced: 1, total: null })), false, "a line unpriced: not sent (app.mark_purchase_ordered)");
eq(maySend(request({ state: "waiting" })), false, "not approved yet");
eq(mayDeliver("ordered"), true, "a delivery against an order sent");
eq(mayDeliver("ready"), false, "never against one not sent (app.mark_purchase_received)");
eq(mayCancel("ordered"), true, "cancelled before delivery");
eq(mayCancel("received"), false, "not once delivered");
eq(mayCancel("cancelled"), false, "not twice");
eq(mayPrice("refused"), true, "still requested on the server: priced");
eq(mayPrice("ordered"), false, "what a supplier was told does not change");
eq(mayDownload("waiting"), false, "no order on paper before it is approved");
eq(mayDownload("received"), true, "the document that went");
eq(unpricedTile(request({ unpriced: 1, total: null }))?.warm, true, "ready with a gap: warm");
eq(unpricedTile(request({ unpriced: 2, total: null, state: "refused" }))?.text.startsWith("2 lines have no agreed price."), true, "two");
eq(unpricedTile(request({ unpriced: 2, state: "refused" }))?.warm, false, "refused: the plain card");
eq(unpricedTile(request({ unpriced: 1, state: "received" })), null, "delivered: no card");
eq(unpricedTile(request({})), null, "all priced: no card");
eq(decidedCard(request({ state: "sent_back", decidedBy: "Test GM", decisionNote: "Which brand?" })),
  { title: "Sent back for something to be cleared up by Test GM", note: "Which brand?" }, "sent back");
eq(decidedCard(request({ state: "refused" })), { title: "Refused", note: DASH }, "refused with no name or note");
eq(decidedCard(request({})), null, "not decided against");
eq(deliveredTitle(request({ receivedBy: "Test Inventory Manager", receivedAt: "2026-10-29 09:00:00+05:30" })),
  "Delivered - received by Test Inventory Manager on 29 Oct 2026, 9:00 AM", "delivered");
eq(creditLine({ billNo: "KB-401", billDate: "2026-10-04", amount: "2152.50", dueOn: "2026-10-09", paidOn: null }),
  "On credit: bill KB-401 of 4 Oct 2026, ₹2,152.50, due 9 Oct 2026 - not paid yet.", "a bill on credit");

/* ── The approval from the one queue ── */
const row = (over: object) => ({ id: "a", kind: "purchase", subject: { table: "purchase_requests", id: "r1" }, status: "pending", amount: null, mayDecide: true, ...over });
eq(approvalFor([row({ id: "x", subject: { table: "purchase_requests", id: "r2" } }), row({ id: "y", kind: "cash_expense" }), row({ id: "z" })], "r1")?.id, "z", "its own row, of its own kind");
eq(approvalFor([], "r1"), null, "none");

/* ── A figure typed is sent as typed ── */
eq(typed("40"), 40, "a figure");
eq(typed(" 2.5 "), 2.5, "spaces round it");
eq(typed(""), null, "a blank is no figure, never 0");
eq(typed("0x10"), null, "not a hex 16");
eq(typed("1,000"), null, "not a grouped figure");
eq(typed("-3"), null, "never below zero");

/* ── Asking ── */
const d = (over: Partial<AskDraft>): AskDraft => ({ itemId: "i1", quantity: "40", unitPrice: "", free: false, ...over });
eq(askBody("", "x", [d({})]), { problem: "Which store is this for?" }, "the store first");
eq(askBody("s1", " ", [d({})]), { problem: "Say what this is for. Whoever approves it has to know what they are approving." }, "a reason");
eq(askBody("s1", "x", [d({ quantity: " " }), d({ itemId: "" })]), { problem: "What is being asked for?" }, "nothing filled");
eq(askBody("s1", "x", [d({}), d({ quantity: "2" })]), { problem: "The same item is on this request twice. Put it on one line." }, "twice");
eq(askBody("s1", "x", [d({ quantity: "0" })]), { problem: "How much of it? A line for nothing is not a line." }, "nothing is not a line");
eq(askBody("s1", "x", [d({ quantity: "lots" })]), { problem: "How much of it? A line for nothing is not a line." }, "words are not a figure");
eq(askBody("s1", " Rice ", [d({}), d({ itemId: "", quantity: "9" })]),
  { body: { storeId: "s1", reason: "Rice", lines: [{ itemId: "i1", quantity: 40, unitPrice: null }] } }, "blank price is null, never 0");
eq(askBody("s1", "x", [d({ unitPrice: "51.25" })]), { body: { storeId: "s1", reason: "x", lines: [{ itemId: "i1", quantity: 40, unitPrice: 51.25 }] } }, "an agreed price as typed");
eq(askBody("s1", "x", [d({ unitPrice: "0" })]), { problem: "0 is kept only when it is ticked Free. Leave it blank if nobody has priced it yet." }, "0 only when Free");
eq(askBody("s1", "x", [d({ unitPrice: "51.25", free: true })]),
  { body: { storeId: "s1", reason: "x", lines: [{ itemId: "i1", quantity: 40, unitPrice: 0, unitPriceFree: true }] } }, "Free is 0, said so");
eq(askBody("s1", "x", [d({ unitPrice: "abc" })]), { problem: "A price is zero or more, or nothing at all." }, "a price that is not one");
eq(firstStore([{ id: "a", name: "Bar", isMain: false }, { id: "b", name: "Main", isMain: true }]), "b", "the main store");
eq(firstStore([]), "", "no store");
eq(raisedWords({ reference: "PO-1", state: "waiting" }), "PO-1 is with the general manager to approve.", "waiting");
eq(raisedWords({ reference: "PO-1", state: "ready" }), "PO-1 is ready to order.", "no rule called for approval");

/* ── Pricing a line ── */
eq(priceBody("51.25", false, null), { body: { unitPrice: 51.25 } }, "a price agreed");
eq(priceBody(" ", false, "51.25"), { body: { unitPrice: null } }, "blank takes it back to not agreed");
eq(priceBody("", false, null), { same: true }, "blank and blank: nothing sent");
eq(priceBody("51.250", false, "51.25"), { same: true }, "the same price: nothing sent");
eq(priceBody("0", false, null), { problem: "0 is kept only when it is ticked Free. Leave it blank if nobody has priced it yet." }, "0 needs Free");
eq(priceBody("", true, null), { body: { unitPrice: 0, free: true } }, "ticked Free");
eq(priceBody("", true, "0.00"), { same: true }, "already free");
eq(isFree({ unitPrice: "0.00" }), true, "0 agreed is free");
eq(isFree({ unitPrice: null }), false, "not agreed is not free");

/* ── Sending, cancelling ── */
eq(sendProblem(""), "Who is this ordered from?", "a supplier");
eq(sendProblem("sup1"), null, "named");
eq(cancelProblem("  "), "Say why. Whoever asked for it has to know what to do next.", "a reason to cancel");

/* ── The delivery ── */
const lines = [{ id: "l1", item: "Rice" }, { id: "l2", item: "Dal" }];
const dd = (over: Partial<DeliveryDraft>): DeliveryDraft => ({ came: "40", cost: "51.25", rate: "", gst: "", claimable: "", useBy: "", ...over });
eq(deliveryStart({ quantity: "40.000", unitPrice: "51.25" }), dd({}), "starts from what was ordered, at the agreed price");
eq(deliveryStart({ quantity: "40.000", unitPrice: null }).cost, "", "no agreed price: blank, never 0");
eq(deliveryBody(lines, { l1: dd({}), l2: dd({ came: "" }) }, "", null),
  { problem: "How much of the Dal came? Nothing at all is 0, and it stays on the record beside what was ordered." }, "a blank is never 0");
eq(deliveryBody(lines, { l1: dd({}) }, "", null),
  { problem: "How much of the Dal came? Nothing at all is 0, and it stays on the record beside what was ordered." }, "a line not filled at all");
eq(deliveryBody(lines, { l1: dd({ cost: "cheap" }), l2: dd({}) }, "", null), { problem: "The cost of the Rice is zero or more, or nothing at all." }, "a cost that is not one");
eq(deliveryBody(lines, { l1: dd({ rate: "5" }), l2: dd({}) }, "", null),
  { problem: "GST on the Rice is the rate, the amount and whether it can be claimed - all three, or none." }, "all three or none");
eq(deliveryBody(lines, { l1: dd({ rate: "120", gst: "1", claimable: "no" }), l2: dd({}) }, "", null), { problem: "A GST rate is between 0 and 100 per cent." }, "a rate");
eq(deliveryBody(lines, { l1: dd({ useBy: "31/12/2026" }), l2: dd({}) }, "", null), { problem: "An expiry is a date." }, "a use-by is a date");
eq(deliveryBody(lines, { l1: dd({ useBy: "2026-02-30" }), l2: dd({}) }, "", null), { problem: "An expiry is a date." }, "a day that does not exist");
eq(deliveryBody(lines, { l1: dd({ came: "0", cost: "", rate: "5", gst: "102.50", claimable: "yes", useBy: "2027-01-31" }), l2: dd({ came: "38.5" }) }, " Short by two ", null), {
  body: {
    lines: [
      { lineId: "l1", receivedQuantity: 0, receivedUnitCost: null, gstRate: 5, gstAmount: 102.5, gstClaimable: true, expiresOn: "2027-01-31" },
      { lineId: "l2", receivedQuantity: 38.5, receivedUnitCost: 51.25 },
    ],
    note: "Short by two",
  },
}, "as typed: 0 typed is 0, a blank cost is null, GST as the bill says it");
const bill = { billNo: "KB-401", billDate: "2026-10-04", amount: "2152.50", dueOn: "2026-11-03" };
const ok = { l1: dd({}), l2: dd({}) };
eq(deliveryBody(lines, ok, "", { ...bill, billNo: " " }), { problem: "Type the supplier's bill number, as printed on it." }, "a bill number");
eq(deliveryBody(lines, ok, "", { ...bill, billDate: "" }), { problem: "Pick the date on the supplier's bill." }, "a bill date");
eq(deliveryBody(lines, ok, "", { ...bill, amount: "" }), { problem: "Type the bill's amount, as printed on it: more than zero." }, "a blank amount is no amount");
eq(deliveryBody(lines, ok, "", { ...bill, amount: "0" }), { problem: "Type the bill's amount, as printed on it: more than zero." }, "more than zero");
eq(deliveryBody(lines, ok, "", { ...bill, dueOn: "2026-10-01" }), { problem: "A bill is due on its own date or later, not before it." }, "due after its date");
eq((deliveryBody(lines, ok, "", bill) as { body: { credit: unknown } }).body.credit,
  { billNo: "KB-401", billDate: "2026-10-04", amount: 2152.5, dueOn: "2026-11-03" }, "the bill as printed");
eq(suggestedDue("2026-10-04"), "2026-11-03", "the bill's date + 30 days");
eq(suggestedDue("2026-12-15"), "2027-01-14", "across a year");
eq(suggestedDue(""), "", "no date, no suggestion");
eq(gstParts({ came: "40", cost: "51.25", rate: "5" }), "40 × ₹51.25 × 5%", "the parts, never a sum the phone made");
eq(gstParts({ came: "40", cost: "", rate: "5" }), null, "a part missing: none");
eq(deliveredWords(0, "Main store"), "Recorded. Nothing came, and that is on the order.", "nothing came");
eq(deliveredWords(1, "Main store"), "One item received into Main store.", "one");
eq(deliveredWords(3, "Main store"), "3 items received into Main store.", "three");

/* ── Offline: every purchasing write is refused, never held (the web's list has none) ── */
for (const [m, p] of [
  ["POST", "/api/hotels/5EL/purchasing/requests"], ["PUT", "/api/hotels/5EL/purchasing/requests/r1/lines/l1"],
  ["POST", "/api/hotels/5EL/purchasing/requests/r1/order"], ["POST", "/api/hotels/5EL/purchasing/requests/r1/cancel"],
  ["POST", "/api/hotels/5EL/purchasing/requests/r1/delivery"], ["POST", "/api/hotels/5EL/approvals/a1/approved"],
] as const) eq(ruleFor(p, m, "{}").tier, "refuse", `${m} ${p} is refused offline`);

console.log("purchasing rules: all checks pass");
