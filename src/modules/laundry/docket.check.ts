/* Run: node --experimental-strip-types src/modules/laundry/docket.check.ts
   The laundry's rules on a phone (docket.ts), on data where a wrong rule
   gives a different answer (MEMORY 11). */
import { DASH } from "../../core/format.ts";
import {
  backWords, byState, clockOf, collectBody, collectedDay, dayOf, itemWords, lineParts, mayCancel, mayCharge, mayReturn,
  returnBody, rupees, stayChoices, stayWords, stillOutWords, unpricedWords, whoseWords, type Docket,
} from "./docket.ts";

const eq = (got: unknown, want: unknown, what: string) => {
  if (JSON.stringify(got) !== JSON.stringify(want)) throw new Error(`${what}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
};

const docket = (over: Partial<Docket>): Docket => ({
  id: "d", number: "LD-0001", belongsTo: "guest", stayId: "s", stayReference: "FD-1", guestName: "Priya Menon",
  roomNumber: "205", status: "open", businessDate: "2026-10-11", collectedAt: "2026-10-13T14:05", returnedAt: null,
  notes: null, total: 430, pieces: 4, stillOut: 4, unpricedLines: 0, charged: false, ...over,
});

/* ── Figures: the server's, never rounded, never a zero for "not sent" ── */
eq(rupees(430), "₹430", "a whole figure as the web writes it");
eq(rupees(80.5), "₹80.50", "paise are kept, never rounded to a rupee");
eq(rupees(125000), "₹1,25,000", "Indian grouping");
eq(rupees(0), "₹0", "free is a price");
eq(rupees(null), DASH, "not priced is a dash");
eq(rupees(undefined), DASH, "not sent is a dash");
eq(rupees(Number.NaN), DASH, "unreadable is a dash, never NaN");
eq(lineParts({ quantity: 4, unitPrice: 60 }), "4 × ₹60", "a line's amount as its parts");
eq(lineParts({ quantity: 4, unitPrice: null }), DASH, "an unpriced line has no amount");
eq(itemWords({ name: "Shirt", service: "wash", price: 60 }), "Shirt · Wash · ₹60", "a priced item");
eq(itemWords({ name: "Bed sheet", service: "wash", price: null }), "Bed sheet · Wash · not priced", "unpriced says so");
eq(itemWords({ name: "Saree", service: "dry_clean", price: 0 }), "Saree · Dry-clean · ₹0", "free is not unpriced");

/* ── Dates on the property's clock, as text ── */
eq(dayOf("2026-10-13T14:05"), "13 Oct 2026", "the web's dateShort");
eq(dayOf("2026-10-03"), "3 Oct 2026", "no leading zero");
eq(clockOf("2026-10-13T14:05"), "13 Oct 2026, 2:05 PM", "the web's dateTime, afternoon");
eq(clockOf("2026-10-13T00:40"), "13 Oct 2026, 12:40 AM", "just after midnight");
eq(clockOf("2026-10-13T12:00"), "13 Oct 2026, 12:00 PM", "noon");
eq(clockOf(null), DASH, "no time is a dash");
eq(dayOf("soon"), DASH, "unreadable is a dash");
eq(collectedDay({ collectedAt: null, businessDate: "2026-10-11" }), "11 Oct 2026", "no moment: its business date");
eq(collectedDay({ collectedAt: "2026-10-13T23:50", businessDate: "2026-10-11" }), "13 Oct 2026", "the moment first");

/* ── Words ── */
eq(whoseWords(docket({ belongsTo: "hotel", guestName: null, roomNumber: null })), "The hotel's own linen", "the hotel's");
eq(whoseWords(docket({})), "Priya Menon · Room 205", "a guest's");
eq(whoseWords(docket({ roomNumber: null })), "Priya Menon · No room yet", "no room");
eq(whoseWords(docket({ guestName: null })), "Room 205", "no name");
eq(stillOutWords([docket({}), docket({ status: "returned" })]), "One bag is still out.", "one");
eq(stillOutWords([docket({}), docket({}), docket({ status: "cancelled" })]), "2 bags are still out.", "two");
eq(stillOutWords([]), "Nothing is still out.", "none");
eq(byState([
  docket({ id: "1", status: "returned" }), docket({ id: "2", status: "cancelled" }), docket({ id: "3" }), docket({ id: "4" }),
]).map((d) => d.id), ["3", "4", "1", "2"], "open first, the server's order kept inside each");

/* ── What the docket allows ── */
eq(mayCharge(docket({})), true, "a guest's priced bag");
eq(mayCharge(docket({ belongsTo: "hotel" })), false, "the hotel's linen is never charged");
eq(mayCharge(docket({ total: null, unpricedLines: 1 })), false, "no total, no charge");
eq(mayCharge(docket({ total: 0 })), true, "a free bag has a total");
eq(mayCharge(docket({ charged: true })), false, "only once");
eq(mayCharge(docket({ status: "cancelled" })), false, "not cancelled");
eq(mayCharge(docket({ status: "returned" })), true, "a bag back may still be charged");
eq(mayReturn(docket({ stillOut: 0, status: "returned" })), false, "nothing still out");
eq(mayReturn(docket({ status: "cancelled" })), false, "cancelled");
eq(mayReturn(docket({ stillOut: 1 })), true, "something still out");
eq(mayCancel(docket({ charged: true })), false, "on a bill: reversed on the folio");
eq(mayCancel(docket({ status: "returned" })), true, "back, not billed");
eq(unpricedWords(docket({ unpricedLines: 2, total: null }))?.slice(0, 41), "2 things in this bag have no price yet. I", "two unpriced");
eq(unpricedWords(docket({ unpricedLines: 1, total: null }))?.startsWith("One thing in this bag"), true, "one unpriced");
eq(unpricedWords(docket({ belongsTo: "hotel", unpricedLines: 3 })), null, "the hotel's linen is never priced: no card");
eq(unpricedWords(docket({ unpricedLines: 1, status: "cancelled" })), null, "cancelled: no card");

/* ── Collecting a bag: the web's checks in its order ── */
const line = (priceItemId: string, quantity: string) => ({ priceItemId, quantity });
eq(collectBody("", "", "", [line("a", "1")]), { problem: "Say whose this is: a guest's, or the hotel's own linen." }, "whose first, no default");
eq(collectBody("guest", "", "", [line("a", "1")]), { problem: "A guest's docket names the stay it belongs to." }, "a stay");
eq(collectBody("hotel", "", "", [line("", "3"), line("a", " ")]), { problem: "What is in the bag?" }, "nothing filled");
eq(collectBody("hotel", "", "", [line("a", "1"), line("a", "2")]), { problem: "The same thing is on this docket twice. Put it on one line." }, "twice");
eq(collectBody("hotel", "", "", [line("a", "1.5")]), { problem: "A count is a whole number, one or more." }, "a part");
eq(collectBody("hotel", "", "", [line("a", "0")]), { problem: "A count is a whole number, one or more." }, "none");
eq(collectBody("hotel", "s1", "  ", [line("a", "20"), line("", "")]),
  { body: { belongsTo: "hotel", lines: [{ priceItemId: "a", quantity: 20 }] } }, "the hotel's: no stay sent, blank note left off");
eq(collectBody("guest", "s1", " Ink on the cuff ", [line("a", "3"), line("b", "1")]),
  { body: { belongsTo: "guest", stayId: "s1", notes: "Ink on the cuff", lines: [{ priceItemId: "a", quantity: 3 }, { priceItemId: "b", quantity: 1 }] } }, "a guest's");

const stay = (roomNumber: string, status: string) => ({ roomNumber, status, guest: "G", reference: `R-${roomNumber}` });
eq(stayChoices([stay("110", "in-house"), stay("9", "due-out"), stay("101", "due-in"), stay("102", "checked-out"), stay("12", "in-house")])
  .map((s) => s.roomNumber), ["9", "12", "110"], "in the house only, by room as a number");
eq(stayWords({ roomNumber: "205", guest: "Priya Menon", reference: "FD-1042" }), "Room 205 · Priya Menon · FD-1042", "a stay's words");
eq(stayWords({ roomNumber: "", guest: "Priya Menon", reference: "FD-1042" }), "Priya Menon · FD-1042", "no room");

/* ── What came back ── */
const lines = [
  { id: "l1", quantity: 4, returnedQuantity: 1, description: "Shirt" },
  { id: "l2", quantity: 2, returnedQuantity: 0, description: "Bed sheet" },
];
eq(returnBody(lines, { l1: "4", l2: "2" }), { body: [{ lineId: "l1", quantity: 4 }, { lineId: "l2", quantity: 2 }] }, "all back");
eq(returnBody(lines, { l2: "1" }), { body: [{ lineId: "l1", quantity: 1 }, { lineId: "l2", quantity: 1 }] }, "untouched keeps what came back");
eq(returnBody(lines, { l1: "2.5", l2: "1" }), { problem: "A count is a whole number." }, "a part");
eq(returnBody(lines, { l1: "4", l2: "3" }), { problem: "Only 2 bed sheet went out." }, "more back than went");
eq(backWords(0), "Everything is back.", "done");
eq(backWords(3), "3 still out.", "still out");

console.log("laundry docket: all checks pass");
