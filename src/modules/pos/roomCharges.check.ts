/* Run: node --experimental-strip-types src/modules/pos/roomCharges.check.ts
   Charges to rooms' rules, and the lane's rights (serviceRoles.ts). */
import { headPill, outletPill, refusals, refusedTitle, ticketPill, type PosTicket } from "./roomChargesRules.ts";
import {
  whyNotAnswerTable, whyNotCloseDay, whyNotReadBills, whyNotReadDay, whyNotReadRoomCharges, whyNotWideSearch,
} from "./serviceRoles.ts";

const eq = (got: unknown, want: unknown) => {
  if (JSON.stringify(got) !== JSON.stringify(want)) throw new Error(`got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
};
const t = (status: PosTicket["status"], ref = "R") => ({ id: ref, outlet: "REST", outletName: "Fidato Restaurant", ticketRef: ref, status,
  reason: status === "rejected" ? "No open folio for room 999." : null, amount: 280, tax: 14, businessDate: "2026-10-11",
  receivedAt: "22 Oct, 11:18", guest: null, room: null }) as PosTicket;

eq(outletPill({ isActive: false, hasKey: true }).words, "inactive");
eq(outletPill({ isActive: true, hasKey: true }), { words: "connected", tone: "success" });
eq(outletPill({ isActive: true, hasKey: false }).why, "No API key has been issued. This outlet cannot post a charge.");
eq(ticketPill(t("rejected")), { words: "refused", tone: "danger", why: "No open folio for room 999." });
eq(ticketPill({ status: "rejected", reason: null }).why, "Refused.");
eq(headPill([t("posted"), t("posted"), t("voided")]), { words: "2 on guest bills", tone: "success" });
eq(headPill([t("posted"), t("rejected")]), { words: "1 refused", tone: "danger" });
const r = refusals(["a", "b", "c", "d", "e", "f", "g"].map((x) => t("rejected", x)));
eq([r.count, r.first.length, r.more], [7, 5, 2]);
eq(refusedTitle(1), "1 bill did not reach a folio");

/* The rights, the API's lists and sentences (roleGate.ts, till.ts BILL_HISTORY_ROLES). */
eq(whyNotCloseDay("kitchen_manager"), null);
eq(whyNotCloseDay("bar"), null);
eq(whyNotCloseDay("read_only"), "Closing the restaurant's day is for the owner, an administrator, the general manager, the hotel manager, "
  + "reception, the kitchen manager, a waiter, a bar person or the accountant. Ask one of them.");
eq(whyNotReadDay("read_only"), null);
eq(whyNotReadDay("chef") !== null, true);
eq(whyNotReadBills("bar"), null);
eq(whyNotReadBills("kitchen_manager") !== null, true);
eq(whyNotWideSearch("pos"), "Bill history is for the managers, the Accountant and Reception. On the Till, look up one day's bills or a bill's number.");
eq(whyNotWideSearch("front_desk"), null);
eq(whyNotAnswerTable("read_only") !== null, true);
eq(whyNotAnswerTable("pos"), null);
eq(whyNotReadRoomCharges("pos") !== null, true);
eq(whyNotReadRoomCharges("read_only"), null);
eq(whyNotCloseDay(null) !== null, true);

console.log("roomCharges.check: ok");
