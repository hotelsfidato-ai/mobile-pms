/* Run: node --experimental-strip-types mobile/src/modules/reservations/groups.check.ts
   Groups (Groups.tsx, GroupPanel.tsx), the Waitlist (Waitlist.tsx, WaitlistDialog.tsx)
   and who may (roleGate.ts): each rule the phone ported. */
import { dateDay } from "../finance/bill.ts";
import {
  billTo, chipsOf, emptyOf, groupLine, headLine, notYet, owed, routedNote, rowLine, settleOff, stateOf, whyNotLead, whyNotRoute,
  type GroupDetail, type GroupRoom, type StayGroup,
} from "./groups.ts";
import { whyNotChangeBill, whyNotChangeBooking, whyNotCharge, whyNotInvoice, whyNotPay, whyNotUnwaitlist, whyNotWaitlist } from "./groupRoles.ts";
import { bodyOf, freePill, nights, nightsWord, partsOf, typesOf, wrongOf, type WaitlistEntry } from "./waitlist.ts";

const eq = (got: unknown, want: unknown, what: string) => {
  if (JSON.stringify(got) !== JSON.stringify(want)) throw new Error(`${what}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
};

/* ── The list ── */
const g = (over: Partial<StayGroup> = {}): StayGroup => ({
  id: "g1", name: "Mehta wedding", reference: "MW", company: null, rooms: 2, nights: 4, arrival: "2026-10-24", departure: "2026-10-26",
  inHouse: 0, dueIn: 2, departed: 0, cancelled: 0, routedRooms: 0, masterBalance: null, guestBalance: 0, ...over,
});
eq(headLine([]), "A wedding, a conference, a family - one booking with several rooms.", "nothing yet: what a group is");
eq(headLine(undefined), "A wedding, a conference, a family - one booking with several rooms.", "not read yet: the same line");
eq(headLine([g(), g({ id: "g2", rooms: 3 })]), "2 groups · 5 rooms", "the picture's line: groups and their rooms");
eq(headLine([g({ rooms: 1 })]), "1 group · 1 room", "one of each, singular");
eq(rowLine(g(), dateDay), "2 rooms · 4 room-nights · 24 Oct 2026 to 26 Oct 2026", "the picture's row line");
eq(chipsOf(g()), [{ tone: "accent", label: "2 due in" }], "only the states that are there: due in orange");
eq(chipsOf(g({ inHouse: 1, dueIn: 0, departed: 2, cancelled: 1, routedRooms: 3 })).map((c) => `${c.tone}:${c.label}`),
  ["info:1 in house", "neutral:2 departed", "danger:1 cancelled", "neutral:3 billed to the host"], "in house blue, cancelled red, the host's rooms");
eq(chipsOf(g({ dueIn: 0 })), [], "a row of zeros says nothing");
eq(emptyOf("current").title, "No groups here or coming", "the scope's empty words");
eq(emptyOf("all").title, "No groups yet", "and All's");

/* TWO BALANCES, NEVER ONE; NULL IS NOT ZERO; THE PAISA KEPT (MEMORY 9). */
eq(owed(null), "-", "no host account: a dash, never ₹0");
eq(owed(undefined), "-", "withheld from this role: a dash");
eq(owed(0), "₹0.00", "a real zero is a figure");
eq(owed(7582.5), "₹7,582.50", "never rounded to whole rupees");
eq(owed(-784), "-₹784.00", "an overpaid bill is never clamped");
eq(owed(150000), "₹1,50,000.00", "Indian grouping");

/* ── One group ── */
const room = (over: Partial<GroupRoom> = {}): GroupRoom => ({
  reservationId: "r1", reference: "B-1", guest: "Asha Mehta", room: "201", roomType: "Deluxe", checkIn: "2026-10-24", checkOut: "2026-10-26",
  nights: 2, status: "confirmed", agreedRate: 3699, routed: false, balance: 0, adults: 2, children: 0, ...over,
});
const detail = (over: Partial<GroupDetail> = {}): GroupDetail => ({
  id: "g1", name: "Mehta wedding", blockCode: "MW", company: null, notes: null, leadId: "r1",
  rooms: [room(), room({ reservationId: "r2", guest: "Ravi Shah", room: null, routed: true })],
  master: null, guestBalance: 0, ...over,
});
const master = (over: Partial<NonNullable<GroupDetail["master"]>> = {}) => ({
  id: "f1", balance: 0, lines: [{ date: "2026-10-24", description: "Room", category: "room", amount: 3884, room: "201" }], company: null, invoice: null, ...over,
});

eq(stateOf(room(), "2026-10-24"), { tone: "accent", label: "Due in" }, "confirmed is due in, orange");
eq(stateOf(room({ status: "checked_in" }), "2026-10-25"), { tone: "info", label: "In house" }, "in house, blue");
eq(stateOf(room({ status: "checked_in" }), "2026-10-26"), { tone: "warning", label: "Due out" }, "in house and leaving on the business date: due out");
eq(stateOf(room({ status: "tentative" }), "2026-10-24").label, "Waiting for the hotel", "a booking waiting for the hotel");
eq(stateOf(room({ status: "odd_one" }), "2026-10-24"), { tone: "neutral", label: "odd one" }, "an unknown word as the web prints it");

eq(billTo(detail()), "Asha Mehta", "no company: the guest who leads");
eq(billTo(detail({ master: master({ company: "Acme Ltd" }) })), "Acme Ltd", "the bill's company first");
eq(billTo(detail({ leadId: null })), "Mehta wedding", "no lead: the group");
eq(groupLine(detail()), "MW · 2 rooms", "block code and rooms, no company");
eq(groupLine(detail({ blockCode: null, company: "Acme Ltd", rooms: [room()] })), "Acme Ltd · 1 room", "company, one room");
eq(routedNote(detail()), "1 of 2 room routed here", "one routed: the web's singular words");
eq(routedNote(detail({ rooms: [room({ routed: true }), room({ routed: true }), room()] })), "2 of 3 rooms routed here", "the count of routed rooms");

eq(notYet(detail()), "", "no host account: nothing to invoice, nothing said");
eq(notYet(detail({ master: master({ lines: [] }) })), "Nothing has been charged to the host yet.", "an empty bill");
eq(notYet(detail({ master: master() })), "Every room checks out first: a night still to come would land on this bill.", "a room still due in");
const gone = [room({ status: "checked_out" }), room({ reservationId: "r2", status: "cancelled" })];
eq(notYet(detail({ rooms: gone, master: master({ balance: 120.25 }) })),
  "The bill still carries a balance. Settle it, or send it to the city ledger, before invoicing.", "a balance left");
eq(notYet(detail({ rooms: gone, master: master({ balance: -3 }) })), "The bill is overpaid. Refund the difference before invoicing.", "overpaid");
eq(notYet(detail({ rooms: gone, master: master({ balance: 0.4 }) })), "", "within the web's half a rupee: ready");

eq(whyNotLead(room(), "r1"), "Asha Mehta leads the group.", "the lead is the lead already");
eq(whyNotLead(room({ status: "cancelled" }), "r9"), "Asha Mehta's booking no longer stands, so it cannot lead the group.", "the server's sentence");
eq(whyNotLead(room({ status: "no_show" }), "r9") !== null, true, "a no show cannot lead");
eq(whyNotLead(room(), "r9"), null, "a standing room may lead");
eq(whyNotRoute(detail(), room()), "This group has no open master folio yet. Open one, and the room charges will go to it.", "no host: the server's refusal");
eq(whyNotRoute(detail(), room({ routed: true })), null, "taking a room off the host needs no host account");
eq(whyNotRoute(detail({ master: master() }), room()), null, "with a host account it may be routed");
eq([settleOff(master({ balance: 0 })), settleOff(master({ balance: -5 })), settleOff(master({ balance: 0.01 }))], [true, true, false], "Settle only while the host owes");

/* ── Who may (roleGate.ts refusalFor, over permissions.ts) ── */
const ALL5 = "the owner, an administrator, the general manager, the hotel manager or reception";
eq(whyNotWaitlist("front_desk"), null, "reception puts a guest on the waitlist");
eq(whyNotWaitlist("finance"), `Putting a guest on the waitlist is for ${ALL5}. Ask one of them.`, "the accountant may not: the API's sentence");
eq(whyNotUnwaitlist("revenue"), `Taking a guest off the waitlist is for ${ALL5}. Ask one of them.`, "nor the revenue manager");
eq(whyNotWaitlist(null), `Putting a guest on the waitlist is for ${ALL5}. Ask one of them.`, "no role here");
eq(whyNotCharge("finance"), null, "the accountant opens a host account (invoice create)");
eq(whyNotCharge("revenue") !== null, true, "the revenue manager does not");
eq(whyNotChangeBill("front_desk"), null, "reception routes a room (invoice edit)");
eq(whyNotChangeBooking("finance") !== null, true, "the accountant may not change the lead (reservation edit)");
eq(whyNotPay("finance"), null, "the accountant settles");
eq(whyNotInvoice("read_only") !== null, true, "a viewer issues no invoice");

/* ── The waitlist ── */
const e = (id: string, free: number | null): WaitlistEntry => ({
  id, guestName: "N", phone: null, roomTypeId: "t", roomType: "Deluxe", arrival: "2026-11-20", departure: "2026-11-22",
  note: null, createdAt: "2026-11-16T10:00:00Z", addedBy: null, free,
});
const parts = partsOf([e("a", 0), e("b", 2), e("c", null), e("d", 1), e("f", 0)]);
eq([parts.free.map((x) => x.id), parts.full.map((x) => x.id), parts.passed.map((x) => x.id)], [["b", "d"], ["a", "f"], ["c"]],
  "three parts, the server's order kept in each; null (passed) is never full");
eq(freePill(1), { tone: "success", label: "1 room free now" }, "one room, green");
eq(freePill(3)?.label, "3 rooms free now", "rooms");
eq(freePill(0), { tone: "neutral", label: "Still full" }, "the server's zero is still full");
eq(freePill(null), null, "arrival passed: no pill");
eq([nights("2026-11-20", "2026-11-22"), nightsWord("2026-11-20", "2026-11-21")], [2, "1 night"], "the nights");
eq(nights("2026-03-28", "2026-03-30"), 2, "no clock change in a date");
const form = { guestName: " Anil ", phone: " 98 ", roomTypeId: "t", arrival: "2026-11-20", departure: "2026-11-21", note: "" };
eq(wrongOf(form), null, "a full form may be sent");
eq(wrongOf({ ...form, guestName: "  " }), "Whose name goes on the waitlist?", "a name first");
eq(wrongOf({ ...form, departure: "" }), "Choose the arrival and the departure.", "both dates");
eq(wrongOf({ ...form, departure: "2026-11-20" }), "The departure is after the arrival.", "a night at least");
eq(wrongOf({ ...form, roomTypeId: "" }), "Which room type are they waiting for?", "a room type");
eq(bodyOf(form).guestName + bodyOf(form).phone, "Anil98", "trimmed as the web sends");
eq(typesOf([{ roomTypeId: "s", roomType: "Superior" }, { roomTypeId: "d", roomType: "Deluxe" }, { roomTypeId: "s", roomType: "Superior" }]),
  [{ id: "s", name: "Superior" }, { id: "d", name: "Deluxe" }], "each type once, in the grid's order");
eq(typesOf(null), [], "no inventory: no types");

console.log("groups.check: ok");
