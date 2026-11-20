/* Run: node --experimental-strip-types src/modules/pos/setup.check.ts
   Restaurant setup's rules (setup.ts): who may, the ticks, a blank is none,
   the KOT section's words, Taxes' bands - on made-up data whose figures no
   phone sum could reproduce. */
import {
  addTablesBody, addTablesDone, addTablesReady, allowanceLine, byHeading, designBody, kindLine, kindNameReady, kindPill, KOT_TODAY,
  orDash, orphaned, orphanedLine, paise, printsLine, readyTicks, routeChoices, routedWords, routingAbout, sacShown, sameDesign,
  seatsShown, sectionAway, seesProfit, seesWholeSetup, slabRows, slabsBad, slabsBody, slabWords, slotsLine, stationPill, stationPrints,
  tablesCount, taxHeadings, typed, whyNotAllowance, whyNotDesign, whyNotGst, whyNotHours, whyNotKot, whyNotMenu, whyNotModules, whyNotSetup,
  type KotKindFull, type KotSetupFull, type TaxKindRules, type TillSetup,
} from "./setup.ts";

const eq = (got: unknown, want: unknown, what = "") => {
  if (JSON.stringify(got) !== JSON.stringify(want)) throw new Error(`${what}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
};

/* Who may: the API's lists, its sentences (roleGate refusalFor, 19 Nov). */
eq(["owner", "admin", "gm", "kitchen_manager", "hotel_manager", "pos", null].map((r) => whyNotMenu(r) === null), [true, true, true, true, false, false, false], "menu");
eq(whyNotMenu("pos"), "Changing the menu is for the owner, an administrator, the general manager or the kitchen manager. Ask one of them.", "menu words");
eq(["owner", "admin", "gm", "kitchen_manager", "finance"].map((r) => whyNotSetup(r) === null), [true, true, true, false, false], "setup");
eq(whyNotSetup("kitchen_manager"), "Setting up the restaurant's tables is for the owner, an administrator or the general manager. Ask one of them.", "setup words");
eq(whyNotHours("hotel_manager"), "Setting the restaurant's table-booking hours is for the owner, an administrator or the general manager. Ask one of them.", "hours");
eq([whyNotKot("kitchen_manager"), whyNotKot("chef") !== null], [null, true], "kot");
eq([whyNotGst("finance"), whyNotGst("kitchen_manager") !== null], [null, true], "gst: the accountant by name");
eq([whyNotModules("gm") !== null, whyNotModules("admin")], [true, null], "the alcohol switch is the owner's or an admin's");
eq([whyNotDesign("gm"), whyNotDesign("kitchen_manager")], [null, "The KOT's design is set by the GM, the owner or an Admin."], "design");
eq([whyNotAllowance(true), whyNotAllowance(false)], [null, "The owner's allowance is set by the owner or an Admin."], "allowance: the server's mayEdit");
eq([seesWholeSetup("gm"), seesWholeSetup("kitchen_manager"), seesProfit("gm"), seesProfit("kitchen_manager")], [true, false, true, false], "whole, profit");

/* A blank is none, never 0; a typo is refused, never sent as null. */
eq([typed(""), typed("  "), typed("20"), typed("0"), typed("12.5"), typed("abc")],
  [{ value: null, bad: false }, { value: null, bad: false }, { value: 20, bad: false }, { value: 0, bad: false }, { value: 12.5, bad: false }, { value: null, bad: true }], "typed");

/* Paise kept, a dash for none (MEMORY 9). */
eq([paise(7582.5), paise(0.2), paise(null), paise(-30)], ["₹7,582.50", "₹0.20", "-", "-₹30.00"], "paise");

/* Ready to open: 20 tables in 3 sections, two dishes on sale of three, one with no rate. */
const setup: TillSetup = {
  restaurant: { name: "Fidato Restaurant", packingCharge: 20, serviceChargePct: null },
  sections: [
    { id: "a", name: "A/C", tables: Array.from({ length: 10 }, (_, i) => ({ id: `a${i}`, label: `AC${i + 1}`, seats: i % 3 ? 4 : 6, busy: i === 2 })) },
    { id: "n", name: "Non A/C", tables: Array.from({ length: 6 }, (_, i) => ({ id: `n${i}`, label: `N${i + 1}`, seats: null, busy: false })) },
    { id: "b", name: "Bar", tables: Array.from({ length: 4 }, (_, i) => ({ id: `b${i}`, label: `B${i + 1}`, seats: 4, busy: i < 2 })) },
  ],
  waiters: 1,
};
const menu = [{ isActive: true, taxRate: 5 }, { isActive: true, taxRate: null }, { isActive: false, taxRate: null }];
const ticks = readyTicks(setup, menu, null);
eq(ticks.map((t) => [t.done, t.detail]), [
  [true, "Fidato Restaurant"], [true, "20 tables in 3 sections"], [true, "2 dishes"],
  [false, "1 dish has none - they cannot be rung"], [true, "1 person with the Waiter role"], [true, "On - this screen opens only when it is"],
], "ticks");
eq(ticks.map((t) => t.to ?? null), [null, null, "/pos/:code/menu", "/settings/rates/taxes", "/people", "/settings/connections/modules"], "links");
eq(readyTicks({ restaurant: null, sections: [], waiters: 0 }, null, "Reading the menu").map((t) => t.detail),
  ["Not named yet - below", "None yet - below", "Reading the menu", "Reading the menu", "Nobody has the Waiter role yet", "On - this screen opens only when it is"], "a new hotel");

/* Sections and tables. */
eq([tablesCount(1), tablesCount(10), seatsShown(null), seatsShown(6)], ["1 table", "10 tables", "-", "6 seats"], "counts");
eq(sectionAway(setup.sections[2]!), { busy: ["B1", "B2"], line: "A bill still sits on B1, B2. Settle or clear those tables first." }, "busy section");
eq(sectionAway(setup.sections[1]!).line, "Non A/C has no bill on any table.", "free section");
const one = { mode: "one" as const, label: " 12 ", prefix: "", from: "", to: "", seats: "" };
const run = { mode: "run" as const, label: "", prefix: "AC", from: "11", to: "14", seats: "4" };
eq([addTablesReady(one), addTablesReady({ ...one, label: " " }), addTablesReady(run), addTablesReady({ ...run, to: "" })], [true, false, true, false], "ready");
eq([addTablesBody(one), addTablesBody(run)], [{ label: " 12 ", seats: "" }, { prefix: "AC", from: "11", to: "14", seats: "4" }], "the text typed, as typed");
eq([addTablesDone(one), addTablesDone(run)], ["12 added", "AC11 to AC14 added"], "done");

eq([slotsLine({ code: "R", name: "R", lunch: "", dinner: "", slots: [] }), slotsLine({ code: "R", name: "R", lunch: "12:30-13:30", dinner: "", slots: ["12:30", "13:00"] })],
  ["No table booking at this restaurant.", "Slots: 12:30, 13:00"], "slots");

/* The allowance: the server's figures, a dash where it sends none. */
eq(allowanceLine({ monthly: 500, offPct: 20, month: "2026-10", used: 500, left: 0, mayEdit: false, maySettle: true, bills: [] }),
  "This month (2026-10): ₹500.00 used, ₹0.00 left of ₹500.00.", "allowance");
eq(allowanceLine({ monthly: 500, offPct: null, month: "2026-11", used: 137.6, left: null, mayEdit: true, maySettle: true, bills: [] }),
  "This month (2026-11): ₹137.60 used, - left of ₹500.00.", "left not sent");
eq([orDash(32.76), orDash(0)], ["₹32.76", "-"], "a bill's figures");

/* The KOT section. */
const now = new Date("2026-10-31T12:00:00");
const kitchen: KotKindFull = { id: "k", name: "Kitchen", role: "food", fixed: true, sections: 5,
  station: { id: "s1", name: "Virtual Kitchen", mine: false, online: false, seenAt: "2026-10-31T07:35:00" } };
const bar: KotKindFull = { id: "b", name: "Bar", role: "bar", fixed: true, sections: 1, station: { id: "s2", name: "Bar PC", mine: false, online: true, seenAt: null } };
const tandoor: KotKindFull = { id: "t", name: "Tandoor", role: null, fixed: false, sections: 2, station: null };
const idle: KotKindFull = { ...tandoor, id: "d", name: "Desserts", sections: 0 };
eq(kindLine(kitchen, now), "Virtual Kitchen · not seen since 7:35 AM · 5 sections", "kind away");
eq(kindLine(bar, now), "Bar PC · online · 1 section", "kind online");
eq(kindLine(tandoor, now), "No computer prints it · 2 sections", "kind on nobody");
eq([kindPill(kitchen), kindPill(bar), kindPill(tandoor), kindPill(idle)],
  [{ tone: "warning", text: "Offline" }, null, { tone: "danger", text: "Not printing" }, null], "pills");
const kinds = [kitchen, bar, tandoor];
const station: KotSetupFull["stations"][number] = { id: "s1", name: "Virtual Kitchen", mine: false, online: false, seenAt: null, printsBills: true, kinds: ["k", "t", "gone"] };
eq(printsLine(stationPrints(station, kinds)), "Prints Kitchen KOTs, Tandoor KOTs, ? KOTs, bills", "prints");
eq(printsLine(stationPrints({ ...station, printsBills: false, kinds: [] }, kinds)), "Prints nothing", "prints nothing");
eq([stationPill({ ...station, online: true }, now).text, stationPill(station, now).text], ["Online", "Not seen since -"], "station pill");
eq([byHeading(kinds, "alcohol")?.name, byHeading(kinds, "bar")?.name, byHeading(kinds, null)?.name, byHeading(kinds, "banquet")?.name], ["Bar", "Bar", "Kitchen", "Kitchen"], "by heading");
eq(routeChoices(kinds, "bar").map((c) => c.label), ["Bar (by its heading)", "Kitchen", "Bar", "Tandoor"], "route choices");
eq([routedWords(kinds, { name: "A9 Bar", heading: "bar" }, null), routedWords(kinds, { name: "Starters", heading: "restaurant" }, "t")],
  ["A9 Bar prints on the Bar KOT", "Starters prints on the Tandoor KOT"], "routed");
eq(routingAbout([]), "Filled in from each section's tax heading: Bar and Alcohol to the Bar, the rest to the Kitchen. Change the odd one. Add-ons go with their dish.", "routing words");
eq([kindNameReady(" "), kindNameReady("Tandoor"), kindNameReady("x".repeat(31))], [false, true, false], "kind names");
eq([sameDesign(KOT_TODAY, { ...KOT_TODAY }), sameDesign(KOT_TODAY, { ...KOT_TODAY, widthMm: 58 })], [true, false], "design changed");
eq([designBody({ ...KOT_TODAY, heading: "  " }).heading, designBody({ ...KOT_TODAY, heading: " Fidato Kitchen " }).heading], [null, "Fidato Kitchen"], "a blank heading is none");

/* Taxes: a dash for no rate, never 0%; bands; the dates kept as they were. */
const rooms: TaxKindRules = { kind: "room", sac: null, slabs: [
  { id: "1", overAmount: 0, rate: 5, note: null, setBy: null, validFrom: null, validTo: null },
  { id: "2", overAmount: 7500, rate: 18, note: "Rooms above 7,500", setBy: null, validFrom: "2026-04-01", validTo: "2027-04-01" },
] };
const food: TaxKindRules = { kind: "restaurant", sac: "996331", slabs: [{ id: "3", overAmount: 0, rate: 5, note: null, setBy: null, validFrom: null, validTo: null }] };
eq([slabWords(rooms, rooms.slabs[0]!), slabWords(rooms, rooms.slabs[1]!), slabWords(food, food.slabs[0]!)],
  ["up to the next band", "above ₹7,500 from 1 Apr 2026 until 31 Mar 2027", "on everything"], "slab words");
eq([sacShown(rooms), sacShown(food), sacShown({ kind: "bar", sac: null })], ["996311", "996331", "-"], "sac");
const taxSetup = { servesAlcohol: false, kinds: [rooms, food, { kind: "bar" as const, sac: null, slabs: [] }],
  categories: [{ name: "Starters", kind: "restaurant" as const, items: 5 }, { name: "A9 Bar", kind: "bar" as const, items: 2 }, { name: "New", kind: null, items: 0 }] };
eq(orphaned(taxSetup), ["A9 Bar", "New"], "orphaned");
eq(orphanedLine(["A9 Bar"]), "One menu category sells under a heading with no rate set - A9 Bar. The till will refuse those items rather than bill them at nothing.", "orphaned line");
const rows = slabRows(rooms);
eq(slabsBody([...rows, { overAmount: "", rate: " ", note: "", validFrom: null, validTo: null }]), { slabs: [
  { overAmount: 0, rate: 5, note: null, validFrom: null, validTo: null },
  { overAmount: 7500, rate: 18, note: "Rooms above 7,500", validFrom: "2026-04-01", validTo: "2027-04-01" },
] }, "slabs body: blank rate left out, dates kept");
eq([slabsBad(rows), slabsBad([{ ...rows[0]!, rate: "5%" }])], [false, true], "a rate that is not a figure");
eq(slabRows({ kind: "bar", sac: null, slabs: [] }), [{ overAmount: "0", rate: "", note: "", validFrom: null, validTo: null }], "an unset kind: one empty row, no rate suggested");
eq(taxHeadings(false, "alcohol").map((h) => h.value), ["", "restaurant", "bar", "banquet", "alcohol", "other"], "alcohol still drawn when set");
eq(taxHeadings(false, null).some((h) => h.value === "alcohol"), false, "alcohol not offered where not served");

console.log("setup: all checks pass");
