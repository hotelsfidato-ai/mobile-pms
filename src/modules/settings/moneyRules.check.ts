/* Run: node --experimental-strip-types src/modules/settings/moneyRules.check.ts
   Settings → Rates and tax, and Money (lane m13-set-money): blank is never
   0, paise kept, a dash for nothing, the API's own sentences and rights,
   the doubt outlives the screen, and the plans' tree as the web draws it. */
import {
  COMMISSION, GST, MONEY_READ, MONEY_SETTING, PRICE, SETUP_CHANGE, categoryChoices, chargeBody, chargeLine, chargePrice,
  commissionSaved, contractLine, dateShortOrNull, dayBefore, freshBook, discountBody, discountOff, discountProblem, discountReady, draftsOf, feesBody,
  feesChanged, flipDay, kindsFor, matches, planAsk, mealDaysInWords, moved, offsetWords, orphanLine, orphaned, planRows,
  planSteps, refusalFor, sacProblem, sacShown, slabWords, slabsBody, taxSaved, typedSigned, whyNot,
  type Discount, type ExtraCharge, type PlanSetting, type TaxKindRules, type TaxSetup,
} from "./moneyRules.ts";
import { refusalFor as configRefusal, SETUP_CHANGE as CONFIG_SETUP, COMMISSION as CONFIG_COMMISSION } from "../inventory/configRoles.ts";
import type { BreakupDay, Pricing } from "../inventory/rates.ts";
import { stopBook } from "../../core/stop.ts";

const eq = (got: unknown, want: unknown, what: string) => {
  if (JSON.stringify(got) !== JSON.stringify(want)) throw new Error(`${what}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
};

/* ── Who may: the API's sentence, the same as the set-up lane's port ── */
eq(refusalFor(SETUP_CHANGE), configRefusal(CONFIG_SETUP), "the setup sentence matches configRoles");
eq(refusalFor(COMMISSION), configRefusal(CONFIG_COMMISSION), "the commission sentence matches configRoles");
eq(whyNot(MONEY_SETTING, "gm"), null, "the GM changes the money settings");
eq(whyNot(MONEY_SETTING, "finance"), "Changing the hotel's money settings is for the owner, an administrator or the general manager. Ask one of them.", "not the accountant");
eq(whyNot(GST, "finance"), null, "the accountant sets GST (roleGate also)");
eq(whyNot(GST, "revenue_manager"), "Setting GST is for the owner, an administrator, the general manager or the accountant. Ask one of them.", "GST's sentence names the accountant");
eq(whyNot(PRICE, "revenue_manager"), null, "the revenue manager sets prices");
eq(whyNot(PRICE, "hotel_manager") !== null, true, "the hotel manager does not");
eq(whyNot(MONEY_READ, "front_desk"), "Reading the money settings is for the owner, an administrator or the general manager. Ask one of them.", "reading");
eq(whyNot(MONEY_SETTING, "nonsense"), refusalFor(MONEY_SETTING), "an unknown role is a viewer");

/* ── Fresh after a write: only a read begun after the write's end lets the page write again (MSET-M5) ── */
const book = stopBook({ now: () => 0 });
const fresh = freshBook(book);
const NAME = "settings/5EL/taxes";
eq(fresh.stale(NAME), false, "nothing written: not stale");
const before = book.begin();      // a read already on its way
fresh.wrote(NAME);
eq(fresh.stale(NAME), true, "just written: stale");
fresh.seen(NAME, before);
eq(fresh.stale(NAME), true, "a read begun before the write's end lets nothing go");
fresh.seen("settings/AGR/taxes", book.begin());
eq(fresh.stale(NAME), true, "another hotel's read lets nothing go");
fresh.seen(NAME, book.begin());
eq(fresh.stale(NAME), false, "a read begun after it does");
eq(fresh.stale("settings/AGR/taxes"), false, "another hotel was never stale");

/* ── Lists ── */
eq(matches("Agoda", "  ago "), true, "search ignores case and spaces");
eq(moved(["a", "b", "c"], "b", -1), ["b", "a", "c"], "one up");
eq(moved(["a", "b", "c"], "c", 1), null, "the last goes no lower");
eq(moved(["a", "b", "c"], "a", -1), null, "the first goes no higher");

/* ── Extra charges: blank is included, never ₹0; paise kept ── */
const charge = (rate: number | null, category = "misc"): ExtraCharge =>
  ({ id: "1", name: "Pickup", description: null, rate, category, isTransport: true, isActive: true, used: false });
eq(chargePrice(null), "Included, no charge", "blank is included at no charge");
eq(chargePrice(0), "₹0", "a typed 0 is the server's 0, said");
eq(chargeLine(charge(1000.5, "food")), "₹1,000.50 · Food", "paise kept, the bill's column");
eq(chargeLine(charge(1000, "nonsense")), "₹1,000 · nonsense", "an unknown column says the server's word");
eq(chargeBody(" Cake ", "", "food", false), { name: "Cake", rate: null, category: "food", isTransport: false }, "blank price sent as null");
eq(chargeBody("Cake", "0", "food", false).rate, 0, "a typed 0 is sent as 0");
eq(feesBody("", "500.25"), { earlyCheckinCharge: null, lateCheckoutCharge: 500.25 }, "a blank fee is no fee");
eq(feesChanged("", "", { earlyCheckinCharge: null, lateCheckoutCharge: null }), false, "blank against none: unchanged");
eq(feesChanged("0", "", { earlyCheckinCharge: null, lateCheckoutCharge: null }), true, "0 against none: changed");

/* ── Room discounts ── */
const d = (percent: number | null, amount: number | null): Discount => ({ id: "1", name: "x", percent, amount, isActive: true, used: false });
eq(discountOff(d(12.5, null)), "12.5% off each night", "percent");
eq(discountOff(d(null, 499.5)), "₹499.50 off each night", "rupees, paise kept");
eq(discountOff(d(null, null)), "-", "neither sent: a dash, never ₹0");
eq(discountProblem("percent", "100.01"), "A percentage is above 0 and at most 100.", "the API's words over 100");
eq(discountProblem("percent", "0"), "A percentage is above 0 and at most 100.", "zero percent");
eq(discountProblem("amount", "0"), "An amount is above ₹0.", "zero rupees");
eq(discountProblem("amount", ""), null, "blank: no problem, just not ready");
eq(discountReady("Monsoon", "amount", ""), false, "blank is not ready");
eq(discountBody("Monsoon", "amount", "750.5"), { name: "Monsoon", percent: null, amount: 750.5 }, "exactly one of the two");

/* ── Commission ── */
eq(contractLine({ id: "k", name: "Corporate 2026", companyId: "c", company: "Tata", validFrom: "2026-04-01", validTo: null, commissionPct: 10 }),
  "Corporate 2026 · from 1 Apr 2026", "an open contract");
eq(commissionSaved("Agoda", null), "Agoda: no commission", "blank is no commission");
eq(commissionSaved("Agoda", 0), "Agoda: 0%", "zero is a real answer");

/* ── Taxes ── */
const ROOM: TaxKindRules = { kind: "room", sac: null, slabs: [
  { id: "a", overAmount: 0, rate: 5, note: null, setBy: null, validFrom: null, validTo: null },
  { id: "b", overAmount: 7500.5, rate: 18, note: "Rooms above", setBy: null, validFrom: "2026-04-01", validTo: "2027-04-01" },
] };
eq(slabWords(ROOM.slabs[0]!, ROOM), { where: "up to the next band", when: null }, "the base band under another");
eq(slabWords(ROOM.slabs[1]!, ROOM), { where: "above ₹7,500.50", when: "from 1 Apr 2026 until 31 Mar 2027" }, "paise kept; the last day it applies");
eq(slabWords(ROOM.slabs[0]!, { ...ROOM, slabs: [ROOM.slabs[0]!] }), { where: "on everything", when: null }, "a lone base band");
eq(dayBefore("2026-03-01"), "2026-02-28", "the day before, across a month");
eq([dateShortOrNull(null), dateShortOrNull("2026-04-01"), dateShortOrNull("2027-04-01", true)], [null, "1 Apr 2026", "31 Mar 2027"], "a band's dates shown");
eq(sacShown(ROOM), "996311", "rooms keep 996311 when unsaid");
eq(sacShown({ kind: "bar", sac: null }), "-", "the others a dash");
eq(sacShown({ kind: "bar", sac: "996331" }), "996331", "a code said is shown");
eq(sacProblem(""), null, "blank clears it");
eq(sacProblem("99633"), "An HSN or SAC code is 4, 6 or 8 digits, like 996311.", "five digits refused, the API's words");
eq(sacProblem("22030000"), null, "eight digits");
const drafts = draftsOf(ROOM);
eq(drafts[1], { overAmount: "7500.5", rate: "18", note: "Rooms above", validFrom: "2026-04-01", validTo: "2027-04-01" }, "a band as typed, its dates kept");
eq(slabsBody("room", drafts), { slabs: [
  { overAmount: 0, rate: 5, note: null, validFrom: null, validTo: null },
  { overAmount: 7500.5, rate: 18, note: "Rooms above", validFrom: "2026-04-01", validTo: "2027-04-01" },
] }, "sent as typed, the period unmoved");
eq(slabsBody("room", [{ ...drafts[0]!, rate: "" }, drafts[1]!]), { problem: "Type the rate on every row, or remove the row." }, "a blank rate is never dropped quietly");
eq(slabsBody("room", [{ ...drafts[0]!, overAmount: "" }]), { problem: "Type the amount each band starts above - 0 for everything." }, "a blank amount is never sent as 0");
eq(slabsBody("alcohol", [{ ...drafts[0]!, rate: "100.5" }]), { problem: "A VAT rate is a percentage between 0 and 100." }, "VAT's words");
eq(slabsBody("room", []), { slabs: [] }, "no rows: the heading is cleared (asked first on the screen)");
eq(taxSaved("room", 0).body, "Cleared. Nothing under this heading can be billed until a rate is set.", "cleared words");
eq(taxSaved("alcohol", 1), { title: "Alcohol VAT saved", body: "1 rate." }, "VAT saved");
const SETUP: TaxSetup = { servesAlcohol: false, kinds: [ROOM, { kind: "bar", sac: null, slabs: [] }], categories: [
  { name: "Starters", kind: "room", items: 3 }, { name: "A9 Bar", kind: "bar", items: 2 }, { name: "Desserts", kind: null, items: 1 },
] };
eq(orphaned(SETUP).map((x) => x.name), ["A9 Bar", "Desserts"], "under an unset heading, or none");
eq(orphanLine(["A9 Bar"]), "One menu category sells under a heading with no rate set - A9 Bar. The till will refuse those items rather than bill them at nothing.", "one");
eq(categoryChoices(false, null).map((x) => x.value), ["", "restaurant", "bar", "banquet", "other"], "no alcohol where it is not served");
eq(categoryChoices(false, "alcohol").map((x) => x.value).includes("alcohol"), true, "but kept for a section set to it");

/* ── Meal plans ── */
const none = { breakfast: [], lunch: [], dinner: [] };
eq(mealDaysInWords(none), null, "nothing said");
eq(mealDaysInWords({ breakfast: ["departure", "stay"], lunch: [], dinner: ["arrival", "stay"] }),
  "Breakfast on stay-over and check-out days; dinner on check-in and stay-over days", "the web's sentence, in day order");
eq(flipDay(flipDay(none, "lunch", "stay"), "lunch", "stay"), none, "a tick and an untick");

/* ── Rate plans: the tree, from the server's figures alone ── */
const PRICING = {
  from: "2026-10-11", basis: { roomTypeId: "dlx", roomType: "Deluxe", mealPlan: "EP" },
  roomTypes: [
    { id: "dlx", name: "Deluxe", baseOccupancy: 2, maxOccupancy: 3, rack: null, difference: null },
    { id: "ste", name: "Suite", baseOccupancy: 2, maxOccupancy: 4, rack: null, difference: { amount: 1500, unit: "rupees" } },
    { id: "std", name: "Standard", baseOccupancy: 2, maxOccupancy: 2, rack: null, difference: null },
  ],
  addons: { CP: 300, MAP: null, AP: null, AI: null, double: null, extraAdult: null, extraChild: null },
  older: [], cells: [],
} as Pricing;
const day = (EP: number | null, CP: number | null): BreakupDay => ({ date: "2026-10-11", guests: 2, EP, CP, MAP: null, AP: null, AI: null, extraAdult: null, extraChild: null });
/* Prices whose differences show float error if done in rupees: 4099.7 - 3999.1 = 100.59999… */
const DAYS = [day(3999.1, 4599.1), day(4099.7, 4699.7), undefined];
const SETTINGS: PlanSetting[] = [{ roomTypeId: "std", mealPlan: "EP", isActive: false, position: 1, sources: [] }];
const rows = planRows(PRICING, DAYS, SETTINGS);
eq(rows.map((r) => r.key), ["dlx/EP", "std/EP", "dlx/CP", "ste/EP", "ste/CP", "std/CP"], "the master first, then a set position, then the type order");
eq(rows.map((r) => r.kind), ["master", "independent", "derived", "derived", "derived", "derived"], "the kinds");
eq(rows.find((r) => r.key === "ste/EP")!.offset, 100.6, "the offset in whole paise, no float error");
eq(offsetWords(rows.find((r) => r.key === "ste/EP")!.offset), "+₹100.60", "said with paise");
eq(rows.find((r) => r.key === "std/EP")!.price, null, "no break-up: a dash, never ₹0");
eq(rows.find((r) => r.key === "std/EP")!.offset, null, "and no offset");
eq(rows.find((r) => r.key === "dlx/EP")!.offset, null, "the master has none");
eq(offsetWords(0), null, "no difference, nothing said");
eq(rows.some((r) => r.plan === "MAP"), false, "a meal plan with no add-on is not sold");
eq(kindsFor(rows[0]!, PRICING.basis), ["master"], "the master stays master");
eq(kindsFor(rows[1]!, PRICING.basis), ["master", "derived", "independent"], "another room only");
eq(kindsFor(rows[2]!, PRICING.basis), ["derived"], "a meal plan is derived");
eq(kindsFor(rows[1]!, null), ["master", "independent"], "no master yet");
const ste = rows.find((r) => r.key === "ste/EP")!;
eq(planSteps(ste, { amount: 1500, unit: "rupees" }, "derived", "1500", "rupees", []), [], "nothing changed, nothing sent");
eq(planSteps(ste, { amount: 1500, unit: "rupees" }, "derived", "-250.5", "rupees", []),
  [{ what: "addon", body: { kind: "room_type", roomTypeId: "ste", amount: -250.5, unit: "rupees" } }], "a difference below, as typed");
eq(planSteps(ste, { amount: 1500, unit: "rupees" }, "derived", "", "rupees", [])[0],
  { what: "addon", body: { kind: "room_type", roomTypeId: "ste", amount: null, unit: "rupees" } }, "blank clears, never 0");
eq(planSteps(ste, { amount: 1500, unit: "rupees" }, "master", "1500", "rupees", ["s1"]),
  [{ what: "basis", roomTypeId: "ste" }, { what: "sources", sources: ["s1"] }], "made the master, sold by one source");
eq(planSteps(rows[1]!, null, "independent", "", "rupees", []), [], "independent stays independent");
eq(typedSigned(" -₹1,500.255"), "-1500.25", "a difference keeps its minus and two places");
/* What the editor asks first (MSET-M6). */
const was = { amount: 1500, unit: "rupees" as const };
eq(planAsk(ste, planSteps(ste, was, "master", "1500", "rupees", []))?.act, "Make it the master", "the master asks");
eq(planAsk(ste, planSteps(ste, was, "independent", "1500", "rupees", []))?.message,
  "Suite will no longer follow the master. Its plans lose their price unless Suite has its own base on Rates.", "Independent asks, in plain words");
eq(planAsk(ste, planSteps(ste, was, "derived", "", "rupees", []))?.act, "Clear the difference", "a blanked difference asks");
eq(planAsk(ste, planSteps(ste, was, "derived", "1750", "rupees", [])), null, "a new difference does not");
eq(planAsk(ste, planSteps(ste, was, "derived", "1500", "rupees", ["s1"])), null, "the sources alone do not");

console.log("settings moneyRules: all checks pass");
