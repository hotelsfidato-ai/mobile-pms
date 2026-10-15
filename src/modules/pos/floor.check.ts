/* Run: node --experimental-strip-types mobile/src/modules/pos/floor.check.ts
   Tables' rules: what each tile offers in each state, where its tap goes,
   the KOT printer lines and the closed banner, in the web's words. */
import { closedLine, closure, finished, kotLines, padHref, since, tileLabel, tileOffers, type KotKind } from "./floor.ts";
import type { FloorTable, TableState } from "./types";

const eq = (got: unknown, want: unknown, what: string) => {
  if (JSON.stringify(got) !== JSON.stringify(want)) throw new Error(`${what}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
};

const table = (state: TableState, more: Partial<FloorTable> = {}): FloorTable => ({
  id: "t1", label: "N1", seats: 6, row: 0, col: 0, orderId: state === "blank" ? null : "o1", orderNo: null, state,
  minutes: state === "blank" ? null : 12, payable: state === "blank" ? null : 441, ready: 0, readyIds: [], ...more,
});

/* A free table opens a new order; a running one another round; a finished bill only Clear. */
eq(tileOffers(table("blank"), false), { tap: "new", ready: 0, actions: null }, "free");
for (const s of ["running", "kot", "printed"] as const) eq(tileOffers(table(s), false), { tap: "round", ready: 0, actions: "print-open" }, s);
for (const s of ["paid", "closed"] as const) eq(tileOffers(table(s), false), { tap: null, ready: 0, actions: "clear" }, s);
eq([finished("paid"), finished("closed"), finished("printed")], [true, true, false], "finished bills");
/* The outlet closed early: no new order and no new round; Clear and Print stay. */
eq(tileOffers(table("blank"), true).tap, null, "closed: a free table takes nothing");
eq(tileOffers(table("kot"), true), { tap: null, ready: 0, actions: "print-open" }, "closed: a bill still prints");
/* Food at the pass: "N ready" on any bill with an order. */
eq(tileOffers(table("kot", { ready: 3, readyIds: ["a", "b"] }), false).ready, 3, "3 ready");
eq(tileOffers(table("kot", { ready: 3, orderId: null }), false).ready, 0, "no order, no Taken");

/* Where the tap goes (MODULE.md, How the parts meet). */
eq(padHref("5EL", table("blank")), "/pos/5EL/pad?table=N1", "a free table");
eq(padHref("5EL", table("running")), "/pos/5EL/pad?order=o1&table=N1", "another round");
eq(padHref("5EL", table("blank", { label: "Bar 1" })), "/pos/5EL/pad?table=Bar%201", "a name with a space");
eq([tileLabel(table("kot")), tileLabel(table("paid")), tileLabel(table("closed"))],
  ["Add a round to N1", "N1, paid", "N1, closed unpaid"], "spoken names");

/* The KOT lines (KotStation.tsx statusOf): only kinds something prints to. */
const kind = (more: Partial<KotKind>): KotKind => ({ id: "k", name: "Kitchen", role: "food", fixed: true, station: null, sections: 4, ...more });
const now = new Date(2026, 9, 15, 13, 0);
eq(kotLines([kind({}), kind({ id: "b", name: "Bar", sections: 0 })], now),
  [{ id: "k", text: "No computer prints Kitchen KOTs - they are not printing", printing: false }], "no computer: the red line; Bar prints nothing");
eq(kotLines([kind({ station: { id: "s", name: "Virtual Kitchen", mine: false, online: true, seenAt: null } })], now)[0]!.text,
  "Kitchen KOTs: Virtual Kitchen - online", "online (picture 01)");
eq(kotLines([kind({ station: { id: "s", name: "Pass PC", mine: false, online: false, seenAt: new Date(2026, 9, 15, 9, 5).toISOString() } })], now)[0],
  { id: "k", text: "Kitchen KOTs wait: Pass PC not seen since 9:05 AM", printing: false }, "not seen today");
eq(since(new Date(2026, 9, 11, 21, 30).toISOString(), now), "11 Oct 2026, 9:30 PM", "not seen since another day");
eq(since(null, now), "-", "never seen");

/* Closed early: until when, and why when somebody said. */
const outlet = { code: "REST", name: "Fidato Restaurant", closedUntil: "2026-10-15T11:00:00.000Z", closedReason: "Power cut" };
eq(closure(outlet, Date.parse("2026-10-15T10:00:00Z")).closed, true, "closed until 11:00Z");
eq(closure(outlet, Date.parse("2026-10-15T12:00:00Z")), { closed: false, reopens: null }, "past its time it is open");
eq(closure(null).closed, false, "no outlet");
eq(closedLine(outlet, "04:30 pm"), "Fidato Restaurant is closed until 04:30 pm - Power cut.", "the banner");
eq(closedLine({ ...outlet, closedReason: null }, null), "Fidato Restaurant is closed.", "no reason given");

console.log("pos floor: all checks pass");
