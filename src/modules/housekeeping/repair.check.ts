/* Run: node --experimental-strip-types mobile/src/modules/housekeeping/repair.check.ts
   Report a repair: the web's RepairFlow rules and the API's sentences. */
import { blankForm, blockBody, heldSentence, isDay, offerTakeOut, whyNotRaise, workOrderBody, type RepairForm } from "./repair.ts";

/* No node:assert, so the app's own type check reads this file too. */
const eq = (got: unknown, want: unknown, what: string) => {
  if (JSON.stringify(got) !== JSON.stringify(want)) throw new Error(`${what}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
};
const form = (over: Partial<RepairForm>): RepairForm => ({ ...blankForm("204", "2026-10-14"), ...over });
const house = { rooms: [{ number: "204", inHouse: true }, { number: "208", inHouse: false }] };

/* A fresh form: the web's and the API's defaults, the block unticked. */
eq(blankForm("", "2026-10-14"), { what: "", room: "", kind: "maintenance", priority: "normal", detail: "", takeOut: false, reason: "out_of_order", from: "2026-10-14", until: "" }, "blank");

/* Who may: the API's sentence for reception, before anything typed matters. */
eq(whyNotRaise(form({ what: "Tap drips" }), "front_desk", false), "Reporting a repair to a room or the building is for the owner, an administrator, the general manager, the hotel manager, the Inventory Manager or housekeeping. Ask one of them.", "reception");
eq(whyNotRaise(form({ what: "Tap drips" }), null, false) != null, true, "no role");
/* What needs fixing is required: the API's own question. */
eq(whyNotRaise(form({ what: "  " }), "housekeeping", false), "What needs fixing?", "blank title");
eq(whyNotRaise(form({ what: "Tap drips" }), "housekeeping", false), null, "housekeeping may");

/* Taking the room out: only a room nobody is in, and only when the house is known. */
eq(offerTakeOut("204", house), false, "occupied");
eq(offerTakeOut(" 208 ", house), true, "free");
eq(offerTakeOut("", house), false, "the building");
eq(offerTakeOut("208", null), false, "house unknown");
eq(offerTakeOut("999", house), false, "no such room");

/* The block's dates, checked only when it is ticked AND offered. */
const out = (over: Partial<RepairForm>) => form({ what: "AC dead", room: "208", takeOut: true, ...over });
eq(whyNotRaise(out({ from: "" }), "housekeeping", true), "From which date?", "no start");
eq(whyNotRaise(out({ from: "2026-02-30" }), "housekeeping", true), "From which date?", "no such day");
eq(whyNotRaise(out({ until: "20-10-2026" }), "housekeeping", true) != null, true, "until misspelt");
eq(whyNotRaise(out({ until: "2026-10-13" }), "housekeeping", true), "A block cannot end before it starts.", "ends before");
eq(whyNotRaise(out({ until: "2026-10-14" }), "housekeeping", true), null, "one day");
eq(whyNotRaise(out({ from: "" }), "housekeeping", false), null, "ticked, not offered: no block, no date asked");
eq([isDay("2028-02-29"), isDay("2026-02-29"), isDay("2026-1-01")], [true, false, false], "days");

/* The bodies, as the web sends them. */
eq(workOrderBody(form({ what: " Tap drips ", detail: " basin ", kind: "plumbing", priority: "high" })),
  { title: "Tap drips", detail: "basin", category: "plumbing", priority: "high", roomNumber: "204" }, "room repair");
eq("roomNumber" in workOrderBody(form({ what: "Lift stuck", room: " " })), false, "the building has no room");
eq(blockBody(out({ until: "" }), "wo-1"), { reason: "out_of_order", from: "2026-10-14", to: null, workOrderId: "wo-1", note: "AC dead" }, "block, no return date");
eq(blockBody(out({ until: "2026-10-20", reason: "refurbishment" }), "wo-1").to, "2026-10-20", "block until");

/* Held: a repair may wait; taking the room out may not, and is said out loud. */
const held = "Work order is held and will be sent when the connection is back.";
eq(heldSentence(held, out({}), true), `${held} Taking room 208 out of service needs the connection - do it when you are back online.`, "held + out");
eq(heldSentence(held, out({}), false), held, "held");

console.log("housekeeping repair: all checks pass");
