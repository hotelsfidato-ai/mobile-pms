/* Run: node --experimental-strip-types mobile/src/modules/pos/kitchen.check.ts
   The pass's rules: who moves a dish, the wait and its colours, by table,
   the kind filter, the KOT printer lines, a held Start. */
import type { OutboxEntry } from "../../core/offline.ts";
import {
  alarm, byTable, clock, columnOf, dish, estimate, heldMove, kindShown, maySetUpKots, movePath, ofKind, plusLine,
  printingKinds, since, statusOf, waited, waitNow, where, whyNotMove, working, type KitchenLine, type KotKind,
} from "./kitchen.ts";

/* No node:assert, so the app's own type check reads this file too. */
const eq = (got: unknown, want: unknown, what: string) => {
  if (JSON.stringify(got) !== JSON.stringify(want)) throw new Error(`${what}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
};

/* Who: the API's sentence, read back as dev-pos on 17 Oct, word for word. */
const PASS_REFUSAL = "Moving a dish along at the pass is for the owner, an administrator, the general manager, the hotel manager, "
  + "reception, the kitchen manager, a chef or the accountant. Ask one of them.";
eq(whyNotMove("pos"), PASS_REFUSAL, "the waiter moves");
for (const role of ["chef", "kitchen_manager", "owner", "gm", "hotel_manager", "front_desk", "finance", "admin"]) eq(whyNotMove(role), null, `${role} moves`);
for (const role of ["read_only", "housekeeping", "stores", "revenue_manager", null]) eq(whyNotMove(role), PASS_REFUSAL, `${role} may not move`);
eq([maySetUpKots("kitchen_manager"), maySetUpKots("chef"), maySetUpKots("gm")], [true, false, true], "who may set the KOTs up");

const line = (over: Partial<KitchenLine>): KitchenLine => ({
  id: "l1", orderNo: "DH-001", table: "AC1", orderType: "dine_in", outlet: "REST", name: "Veg Biryani", qty: 1, note: null,
  status: "sent", waitedSeconds: 0, prepMinutes: null, course: null, cancelled: false, ...over,
});

/* The two buttons, the path, the words. */
eq(columnOf(line({ status: "sent" }))?.action, "Start", "an ordered dish starts");
eq(columnOf(line({ status: "preparing" }))?.next, "ready", "a dish on the fire is made ready");
eq(columnOf(line({ status: "ready" })), undefined, "a ready dish is not the kitchen's");
eq(movePath("5EL", "l9", "preparing"), "/api/hotels/5EL/kitchen/lines/l9/preparing", "the path");

/* The wait: minutes and seconds, ticking from the read, red at ten, yellow at five. */
eq([waited(59), waited(60), waited(605)], ["59s", "1m 00s", "10m 05s"], "the wait in words");
eq(waitNow(290, 1_000, 13_500), 302, "the wait ticks from the read");
eq(waitNow(290, 5_000, 4_000), 290, "a clock behind the read does not go back");
eq([alarm(299), alarm(300), alarm(599), alarm(600)], [null, "warm", "warm", "late"], "the alarm");
eq([estimate(null), estimate(undefined), estimate(0), estimate(12)], ["- est", "- est", "0 min est", "12 min est"], "the estimate: a dash, never a zero");

/* What a ticket says. */
eq(where(line({})), "AC1 · DH-001", "a table");
eq(where(line({ table: null, orderType: "take_away" })), "take away · DH-001", "no table");
eq(dish(line({ qty: 2 })), "2 × Veg Biryani", "a dish");
eq(dish(line({ name: "Extra papad", forDish: "Veg Thali" })), "1 × + Extra papad", "an add-on line");
eq([plusLine({ name: "Kebab", qty: 1 }), plusLine({ name: "Kebab", qty: 2 })], ["+ Kebab", "+ Kebab ×2"], "numbered add-ons");

/* The kind filter and the count. */
const kind = (id: string, over: Partial<KotKind> = {}): KotKind =>
  ({ id, name: id === "k" ? "Kitchen" : "Bar", role: id === "k" ? "food" : "bar", fixed: true, station: null, sections: 1, ...over });
const lines = [line({ id: "a", kindId: "k" }), line({ id: "b", kindId: "b" }), line({ id: "c", kindId: "k", cancelled: true })];
eq(kindShown([kind("k"), kind("b")], "b"), "b", "a kind chosen");
eq(kindShown([kind("k")], "b"), "", "a kind that is gone reads as All");
eq(ofKind(lines, "k").map((l) => l.id), ["a", "c"], "the kitchen's lines");
eq(ofKind(lines, "").length, 3, "All");
eq(working(lines), 2, "a struck dish is not worked");

/* By table: oldest table first, a takeaway per order, courses in order and "Any time" last. */
const cards = byTable([
  line({ id: "1", table: "N1", waitedSeconds: 100, course: null }),
  line({ id: "2", table: "N1", waitedSeconds: 700, course: 2 }),
  line({ id: "3", table: "N1", waitedSeconds: 50, course: 1 }),
  line({ id: "4", table: "AC1", waitedSeconds: 400, course: 0 }),
  line({ id: "5", table: null, orderType: "take_away", orderNo: "DH-7", waitedSeconds: 900 }),
  line({ id: "6", table: null, orderType: "take_away", orderNo: "DH-8", waitedSeconds: 10 }),
]);
eq(cards.map((c) => [c.title, c.wait]), [["take away", 900], ["N1", 700], ["AC1", 400], ["take away", 10]], "oldest table first");
eq(cards[1]!.courses.map((c) => [c.course, c.lines.map((l) => l.id)]), [[1, ["3"]], [2, ["2"]], [null, ["1"]]], "courses, unsequenced last");
eq(cards[2]!.courses[0]!.course, 0, "course zero is a course");

/* The KOT printer lines, the web's words. */
const now = new Date(2026, 9, 17, 16, 5);
eq(clock(new Date(2026, 9, 17, 0, 7)), "12:07 AM", "midnight");
eq(clock(now), "4:05 PM", "the afternoon");
eq(since(null, now), "-", "never seen");
eq(since(new Date(2026, 9, 16, 9, 30).toISOString(), now), "16 Oct 2026, 9:30 AM", "another day");
eq(statusOf(kind("k"), now), { text: "No computer prints Kitchen KOTs - they are not printing", printing: false }, "no computer");
const pc = { id: "s", name: "Kitchen PC", mine: false, online: true, seenAt: null };
eq(statusOf(kind("k", { station: pc }), now), { text: "Kitchen KOTs: Kitchen PC - online", printing: true }, "printing");
eq(statusOf(kind("b", { station: { ...pc, online: false, seenAt: new Date(2026, 9, 17, 15, 0).toISOString() } }), now).text,
  "Bar KOTs wait: Kitchen PC not seen since 3:00 PM", "not seen today");
eq(printingKinds([kind("k"), kind("b", { sections: 0 })]).map((k) => k.id), ["k"], "only a kind something prints to");

/* A held Start shows on its dish, at its own hotel only. */
const held = (path: string, status: "waiting" | "rejected" = "waiting") => ({ path, status }) as OutboxEntry;
eq(heldMove([held("/api/hotels/5EL/kitchen/lines/a/preparing")], "5EL", "a"), "preparing", "a held Start");
eq(heldMove([held("/api/hotels/5EL/kitchen/lines/a/preparing"), held("/api/hotels/5EL/kitchen/lines/a/ready")], "5EL", "a"), "ready", "the last held move");
eq(heldMove([held("/api/hotels/XYZ/kitchen/lines/a/preparing")], "5EL", "a"), null, "another hotel's");
eq(heldMove([held("/api/hotels/5EL/kitchen/lines/ab/preparing")], "5EL", "a"), null, "another dish's");
eq(heldMove([held("/api/hotels/5EL/kitchen/lines/a/ready", "rejected")], "5EL", "a"), null, "a refused one is not held");

console.log("pos kitchen: all checks pass");
