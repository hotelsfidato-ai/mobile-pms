/* Run: node --experimental-strip-types mobile/src/modules/housekeeping/workOrders.check.ts
   Work orders' rules: the card's pills and line, held Start / Close, who may, the words. */
import type { OutboxEntry } from "../../core/offline.ts";
import {
  closeBody, closedWords, COST_REFUSED, day, empty, foot, heldStatus, meta, ON_WEBSITE, orderPath, paise, pills,
  startBody, startLabel, UPDATE_REFUSED, whyNotCancel, whyNotRecord, whyNotUpdate, type WorkOrder, type WorkOrderList,
} from "./workOrders.ts";

/* No node:assert, so the app's own type check reads this file too. */
const eq = (got: unknown, want: unknown, what: string) => {
  if (JSON.stringify(got) !== JSON.stringify(want)) throw new Error(`${what}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
};

const order = (o: Partial<WorkOrder>): WorkOrder => ({
  id: "w1", room: "204", title: "Dripping tap", detail: null, category: "plumbing", priority: "normal", status: "open",
  raisedBy: "Asha", raisedAt: "2026-10-10", assignedTo: null, daysOpen: 0, blocksRoom: false,
  closedBy: null, closedAt: null, resolution: null, equipment: null, ...o,
});

/* The API's sentences, word for word (read back from it on 17 Oct). */
eq(UPDATE_REFUSED, "Updating a repair is for the owner, an administrator, the general manager, the hotel manager, the Inventory Manager or housekeeping. Ask one of them.", "update refused");
eq(COST_REFUSED, "Recording a repair cost is for the owner, an administrator, the general manager, the hotel manager or the Inventory Manager. Ask one of them.", "cost refused");

/* Pills: priority while open; the closing word once closed; "Room is out" said only when it is. */
eq(pills(order({ priority: "urgent" }), "open").map((p) => p.label), ["Urgent"], "urgent open");
eq(pills(order({}), "in_progress").map((p) => p.label), ["Normal", "Being fixed"], "being fixed");
eq(pills(order({ priority: "urgent" }), "done").map((p) => p.label), ["Fixed"], "fixed has no priority");
eq(pills(order({ blocksRoom: true }), "cancelled").map((p) => p.label), ["Not needed", "Room is out"], "not needed, room out");
eq(pills(order({ priority: "odd" }), "open")[0], { label: "Normal", tone: "neutral" }, "an unknown priority reads Normal");

/* The line: a dash for no room, the web's dates, the age amber at a week. */
eq(day("2026-09-17"), "17 Sep 2026", "the web's dateShort");
eq(day(null), "-", "no date");
eq(meta(order({ room: null, raisedBy: null })), { head: "- · plumbing · raised 10 Oct 2026 · ", age: "today", late: false, tail: " · nobody has picked it up" }, "a lift");
eq(meta(order({ daysOpen: 1, assignedTo: "Ravi" })).age + meta(order({ daysOpen: 1, assignedTo: "Ravi" })).tail, "1 day open · Ravi", "one day");
eq([meta(order({ daysOpen: 6 })).late, meta(order({ daysOpen: 7 })).late], [false, true], "late at seven days");
eq(meta(order({ status: "done", closedAt: "2026-10-12", closedBy: "Ravi" })).head,
  "Room 204 · plumbing · raised 10 Oct 2026 by Asha · closed 12 Oct 2026 by Ravi", "closed line");

/* Held: the last waiting change on THIS order at THIS hotel. */
const held = (path: string, body: object, status: "waiting" | "rejected" = "waiting") =>
  ({ path, body: JSON.stringify(body), status }) as OutboxEntry;
const q = [
  held(orderPath("5EL", "w1"), { status: "in_progress" }),
  held(orderPath("5EL", "w1"), { status: "open" }),
  held(orderPath("5EL", "w2"), { status: "done", resolution: "x" }, "rejected"),
  held(orderPath("OTHER", "w3"), { status: "done", resolution: "x" }),
];
eq(heldStatus(q, "5EL", "w1"), "open", "the last held wins");
eq(heldStatus(q, "5EL", "w2"), null, "a refused one is not held");
eq(heldStatus(q, "5EL", "w3"), null, "another hotel's is not this one's");

/* Start and Put back. */
eq([startLabel("open"), startBody("open")], ["Start", { status: "in_progress" }], "start");
eq([startLabel("in_progress"), startBody("in_progress")], ["Put back", { status: "open" }], "put back");

/* Who may: the API first, then a close still on this phone. */
eq(whyNotUpdate(false, "open"), UPDATE_REFUSED, "refused person");
eq(whyNotUpdate(true, "open"), null, "may update");
eq(whyNotUpdate(true, "done"), "Closed on this phone, waiting to sync.", "held close");

/* Close: nothing said is nothing sent. */
eq(closeBody("done", "  "), null, "empty resolution");
eq(closeBody("cancelled", " Washer replaced. "), { status: "cancelled", resolution: "Washer replaced." }, "trimmed");
eq(closedWords(order({ equipment: { id: "e", name: "Geyser", tag: "T-1" } }), "done"),
  { title: "Closed", body: "Dripping tap. Geyser is back in use once no other repair on it is open." }, "equipment back in use");
eq(closedWords(order({}), "cancelled"), { title: "Cancelled", body: "Dripping tap" }, "not needed");

/* The list's words. */
const list = (closed: number, closedShown = 100) => ({ orders: [], open: 0, closed, closedShown } as unknown as WorkOrderList);
eq(empty("open", list(0)).body, "Raise one when something needs fixing.", "empty open");
eq(empty("open", list(3)).body, `3 closed and kept - "how many times have we fixed this room" needs them.`, "empty open with closed");
eq(empty("closed", list(0)).title, "Nothing closed yet", "empty closed");
eq(foot("open", list(1))?.startsWith("1 closed order is kept"), true, "one kept");
eq(foot("open", list(0)), null, "none kept");
eq(foot("closed", list(150)), "The 100 most recently closed, of 150.", "closed cut");
eq(foot("closed", list(100)), null, "closed whole");

/* Costs: paise shown; recording never on the phone; cancelling for the five only. */
eq(paise(1800), "₹1,800.00", "paise");
eq(paise(120000.5), "₹1,20,000.50", "lakh grouping");
eq([whyNotRecord(true), whyNotRecord(false)], [ON_WEBSITE, COST_REFUSED], "record");
eq([whyNotCancel(true), whyNotCancel(false)], [null, COST_REFUSED], "cancel");

console.log("work orders: all checks pass");
