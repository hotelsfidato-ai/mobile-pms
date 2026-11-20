/* Run: node --experimental-strip-types src/modules/settings/lists.check.ts
   Settings › Lists and Front desk (lane m13-set-lists): the table of kinds,
   the list editor's search, move and swap, colours, days, the desk's rules
   and hours, who may, and the unknown-outcome doubt. */
import { ROLES, mayReach } from "../../core/menu.ts";
import { SETUP_CHANGE, whoMay } from "../inventory/configRoles.ts";
import {
  AUDIT_TIME_REFUSED, COLOUR, FIELDS, LIST_PAGES, REASON_TABS, START, STATES, charge, doubtKey, doubts, emptyWords,
  hoursBody, hoursProblem, isDay, listPath, mayAddHoliday, mayMove, nextOff, ruleFigures, rulesBody, shownRows,
  stillUnknown, swapSorts, timeProblem, toggleDay, typedColour, whyNotAuditTime, withField, type ListItem,
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
/* The swap: a takes b's sort, one more when they tie (ListEditor), b takes a's. */
eq(swapSorts(items[0]!, items[1]!), [{ id: "a", sort: 11 }, { id: "b", sort: 10 }], "a tie");
eq(swapSorts(items[2]!, items[1]!), [{ id: "c", sort: 10 }, { id: "b", sort: 30 }], "a swap");
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

/* The doubt: kept by hotel and page (VIP by the group), lifted only by a read BEGUN after the loss. */
eq([doubtKey("5el", "holidays"), doubtKey("5EL", "vip"), doubtKey("AGR", "vip")], ["5EL:holidays", "group:vip", "group:vip"]);
eq([stillUnknown(null, undefined), stillUnknown(100, undefined), stillUnknown(100, 100), stillUnknown(100, 101)], [false, true, true, false], "still unknown");
doubts.lost("5EL:holidays", 100);
eq(doubts.settle("5EL:holidays", 90), false, "a read begun before the loss does not lift it");
eq(doubts.at("5EL:holidays"), 100);
eq(doubts.at("AGR:holidays"), null, "another hotel is not held");
eq(doubts.settle("5EL:holidays", 101), true, "a read begun after it does");
eq(doubts.at("5EL:holidays"), null);

console.log("settings lists: all checks pass");
