/* Run: node --experimental-strip-types src/modules/settings/lists.check.ts
   Settings › Lists and Front desk (lane m13-set-lists): the table of kinds,
   the list editor's search, move and swap, colours, days, the desk's rules
   and hours, who may, and the unknown-outcome doubt. */
import { ROLES, mayReach } from "../../core/menu.ts";
import { SETUP_CHANGE, whoMay } from "../inventory/configRoles.ts";
import { SETTLE_MS, stopBook } from "../../core/stop.ts";
import {
  AUDIT_TIME_REFUSED, COLOUR, FIELDS, LIST_PAGES, REASON_TABS, START, STATES, charge, emptyWords, freshName, pageName,
  hoursBody, hoursProblem, isDay, listPath, mayAddHoliday, mayMove, nextOff, ruleFigures, rulesBody, shownRows,
  pageStuck, pageSending, pageUnknown, swapSorts, timeProblem, watchPage, writeOnce, toggleDay, typedColour, whyNotAuditTime, withField, type ListItem,
} from "./lists.ts";

const eq = (got: unknown, want: unknown, what = "") => {
  if (JSON.stringify(got) !== JSON.stringify(want)) throw new Error(`${what}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
};

/* The table of kinds: three pages of the list pattern, the reasons as four tabs in the web's order. */
eq(Object.keys(LIST_PAGES), ["market-segments", "reasons", "vip"], "list pages");
eq(LIST_PAGES.reasons.panes.map((p) => [p.tab, "kind" in p.pane.source ? p.pane.source.kind : "vip"]),
  REASON_TABS.map(([k, l]) => [l, k]), "reason tabs");
eq(LIST_PAGES.vip.panes[0]!.pane.withColour, true, "VIP levels carry a colour");
eq(LIST_PAGES["market-segments"].panes[0]!.pane.withColour, false, "segments do not");
eq(listPath("5el", { kind: "reason_void" }), "/api/hotels/5el/lists/reason_void");
eq(listPath("5EL", { vip: true }), "/api/hotels/5EL/vip-levels");

/* The editor: search case-blind; no moving while searching or past either end. */
const items: ListItem[] = [
  { id: "a", label: "Corporate", colour: null, sort: 10, active: true },
  { id: "b", label: "Leisure", colour: null, sort: 10, active: false },
  { id: "c", label: "Government", colour: null, sort: 30, active: true },
];
eq(shownRows(items, "  corp ").map((r) => r.id), ["a"], "search");
eq(shownRows(items, "").length, 3, "no search shows all");
eq([mayMove(0, 3, "", true), mayMove(0, 3, "", false), mayMove(2, 3, "", false), mayMove(1, 3, "x", true)], [false, true, false, false], "moves");
/* A move: two sorts traded (the web's swap); on a tie (the server orders it by name) the row to come
   first keeps the sort and the other takes one more - so Move up on a tie moves (MSET-L3). */
eq(swapSorts(items[2]!, items[1]!, true), [{ id: "c", sort: 10 }, { id: "b", sort: 30 }], "a swap");
eq(swapSorts(items[1]!, items[0]!, true), [{ id: "a", sort: 11 }], "up on a tie: the other goes after");
eq(swapSorts(items[0]!, items[1]!, false), [{ id: "a", sort: 11 }], "down on a tie: the mover goes after");
/* Applied to the server's order (sort, then name), each move does what it says. */
const order = (l: ListItem[]) => [...l].sort((x, y) => x.sort - y.sort || x.label.localeCompare(y.label)).map((x) => x.id);
const apply = (l: ListItem[], sent: { id: string; sort: number }[]) => l.map((x) => ({ ...x, sort: sent.find((y) => y.id === x.id)?.sort ?? x.sort }));
const tied = items.slice(0, 2); // Corporate, Leisure: both 10, Corporate first by name
eq(order(apply(tied, swapSorts(tied[1]!, tied[0]!, true))), ["b", "a"], "Leisure moved up");
eq(order(apply(tied, swapSorts(tied[0]!, tied[1]!, false))), ["b", "a"], "Corporate moved down");
eq([emptyWords(0, "segment"), emptyWords(3, "reason")], ["No segments yet.", "Nothing matches."], "empty");

/* Colours: typed, sent as the web's colour box gives them (capitals, "#"). */
eq([typedColour("#df6128"), typedColour("df6128 "), typedColour("#DF612"), typedColour("red"), typedColour("")],
  ["#DF6128", "#DF6128", null, null, null], "typed colours");
for (const [, , built] of STATES) eq(COLOUR.test(built), true, `built-in ${built}`);
eq(STATES.map(([k]) => k), ["confirmed", "waiting", "in-house", "due-out", "departed", "no-show"], "the states the API takes");

/* Days: typed YYYY-MM-DD, and real. */
eq([isDay("2026-11-08"), isDay("2028-02-29"), isDay("2026-02-29"), isDay("2026-02-30"), isDay("8/11/2026"), isDay("2026-1-8")],
  [true, true, false, false, false, false], "days");
eq([mayAddHoliday("2026-11-08", "Diwali"), mayAddHoliday("2026-11-08", "  "), mayAddHoliday("", "Diwali")], [true, false, false], "add a holiday");

/* ID types: the list sent whole. */
eq(nextOff(["voter"], "passport", false), ["voter", "passport"], "switch one off");
eq(nextOff(["voter", "passport"], "voter", true), ["passport"], "switch one on");
eq(withField(["phone"], "email", true), ["phone", "email"], "a field required");
eq(withField(["phone", "email"], "phone", false), ["email"], "a field not required");
eq(FIELDS.length, 8, "the eight fields the API takes");

/* The rules card: a dash for no title, the weekend in the week's order, None for no ID. */
eq(ruleFigures(START), [
  ["Way of paying", "Cash"], ["Desk may overbook", "Yes"], ["Advance before check-in", "None"],
  ["Weekend", "Sun, Sat"], ["ID starts on", "None"], ["Nationality", "IN"], ["Title", "-"], ["GM may undo a check-in", "Yes"],
], "START's figures");
eq(ruleFigures({ ...START, weekendDays: [], gmMayUndoCheckIn: false, defaultIdType: "voter", advanceBeforeCheckIn: "whole_stay" })
  .filter(([l]) => ["Weekend", "GM may undo a check-in", "ID starts on", "Advance before check-in"].includes(l)).map(([, v]) => v),
["The whole stay", "-", "Voter ID", "No"], "figures");
eq(toggleDay([0, 6], 5), [0, 5, 6], "a day in, in order");
eq(toggleDay([0, 5, 6], 0), [5, 6], "a day out");
eq(rulesBody({ ...START, defaultTitle: "", defaultIdType: "" }), {
  deskMayOverbook: true, advanceBeforeCheckIn: "none", weekendDays: [0, 6], defaultIdType: null,
  defaultNationality: "IN", defaultTitle: null, gmMayUndoCheckIn: true,
}, "the rules sent; never the way of paying");
eq("defaultPaymentMethod" in rulesBody(START), false, "the way of paying is Money's");

/* The hours: a charge as the server sent it, paise kept, a dash for none (never ₹0). */
eq([charge(500), charge(1250.5), charge(null), charge(0)], ["₹500", "₹1,250.50", "-", "₹0"], "charges");
eq(timeProblem("Check-in time", "13:00"), null);
eq(timeProblem("Check-in time", "1:00"), "Check-in time is a 24-hour time, like 13:00.");
eq(hoursProblem("14:00", "24:00", "01:00"), "Check-out time is a 24-hour time, like 13:00.", "the route's order");
eq(hoursBody({ nightAuditOpensAt: "01:00" }, "14:00", "11:00", "01:00"), { checkInTime: "14:00", checkOutTime: "11:00" }, "the audit time unchanged is not sent");
eq(hoursBody({ nightAuditOpensAt: "01:00" }, "14:00", "11:00", "02:00"), { checkInTime: "14:00", checkOutTime: "11:00", nightAuditOpensAt: "02:00" });

/* Who may: every page is reached by exactly the people the API lets change the set-up (SETUP_CHANGE:
   room_config edit) - so no page is drawn that would refuse every control, nor a control hidden. */
const pages = ["lists/market-segments", "lists/reservation-types", "lists/reasons", "lists/holidays", "lists/id-types", "lists/vip",
  "front-desk/front-desk", "front-desk/times-and-rules"];
for (const p of pages) eq(ROLES.filter((r) => mayReach(r, `/settings/${p}`)), whoMay(SETUP_CHANGE), p);
eq(ROLES.filter((r) => whyNotAuditTime(r) === null), ["owner", "admin"], "the night audit's time");
eq(whyNotAuditTime("gm"), AUDIT_TIME_REFUSED);

/* The page's stop, in the core's book (names settings/<code>/<page>, the VIP levels by the group). */
eq([pageName("5el", "holidays"), pageName("5EL", "vip"), pageName("AGR", "vip")], ["settings/5EL/holidays", "settings/group/vip", "settings/group/vip"]);
{
  let now = 1_000;
  const book = stopBook({ now: () => now });
  const names = ["settings/5EL/desk-rules"];
  const [n] = names as [string];
  const unknownOf = (e: unknown) => ((e as { status?: number }).status === 409 ? null : (e as { status?: number }).status === 0 ? SETTLE_MS : 0);
  const reads = (name: string) => watchPage(book, name, async () => "read");
  /* A write on its way stops the page: a second tap is refused, a sheet cannot close. */
  let land!: (v: string) => void;
  const first = writeOnce(book, names, n, () => new Promise<string>((r) => { land = r; }), unknownOf);
  eq([pageStuck(book, names), pageSending(book, names), pageUnknown(book, names)], [true, true, false], "on its way");
  eq((await writeOnce(book, names, n, async () => "second", unknownOf)).kind, "stopped", "no second write while one is out");
  /* MSET-L1: a read already on its way when the write lands does not free the page... */
  const early = reads(n);
  land("ok");
  eq((await first).kind, "ok");
  eq([pageStuck(book, names), pageSending(book, names), pageUnknown(book, names)], [true, false, false], "landed, not yet read again");
  await early;
  eq(pageStuck(book, names), true, "a read begun before the write's end lets nothing go");
  eq((await writeOnce(book, names, n, async () => "too soon", unknownOf)).kind, "stopped", "a second whole list waits for the read");
  /* ...one begun after it does. */
  await reads(n)();
  eq(pageStuck(book, names), false, "read again: live");
  /* The server's own no stops nothing. */
  eq((await writeOnce(book, names, n, async () => { throw { status: 409 }; }, unknownOf)).kind, "no");
  eq(pageStuck(book, names), false, "a refusal leaves the page live");
  /* Nothing came back: lost, and only a read begun SETTLE_MS later lets it go. */
  eq((await writeOnce(book, names, n, async () => { throw { status: 0 }; }, unknownOf)).kind, "unknown");
  eq([pageStuck(book, names), pageUnknown(book, names)], [true, true], "lost");
  await reads(n)();
  eq(pageUnknown(book, names), true, "a read at once may miss a write still committing");
  now += SETTLE_MS;
  await reads(n)();
  eq([pageStuck(book, names), pageUnknown(book, names)], [false, false], "read after the wait: live");
  /* Another page's name is not stopped by this one. */
  book.lost("settings/AGR/desk-rules");
  eq(pageStuck(book, names), false, "another hotel is not held");
  eq(book.stuck(freshName("settings/AGR/desk-rules")), false);
}

console.log("settings lists: all checks pass");
