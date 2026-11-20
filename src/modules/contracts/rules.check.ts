/* Run: node --experimental-strip-types src/modules/contracts/rules.check.ts
   Contracts (the web's contracts module): a price is sent as typed and a
   blank is not agreed - never a default, never 0; paise kept on screen; the
   forms refuse what the server would, in its words; every write refused
   offline (none held); an allotment read as the web reads it. */
import { ruleFor } from "../../core/offline.ts";
import {
  allotmentForm, allotmentRate, allotmentWrong, companyForm, companyInput, companyWrong, contractForm, contractHere, contractInput,
  contractsTable, contractWrong, creditLine, heldLine, leftIn, priceWords, ratesOf, releaseLine, type Allotment, type CompanyRow,
} from "./rules.ts";

const eq = (got: unknown, want: unknown, what: string) => {
  if (JSON.stringify(got) !== JSON.stringify(want)) throw new Error(`${what}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
};

/* ── Prices: typed as typed, blank is not agreed, never a default ── */
const blank = contractForm(undefined, "2026-11-20");
eq(blank.cells, {}, "a new contract has no price filled in");
eq(blank.validFrom, "2026-11-20", "it starts on the business date");
eq(ratesOf({ "rt1|EP": { single: "4500.50", double: "" }, "rt1|CP": { single: "", double: "" } }),
  [{ roomTypeId: "rt1", mealPlan: "EP", single: 4500.5, double: null }], "paise as typed; a blank is null; an empty row is left out");
eq(contractWrong({ ...blank, name: "Acme 2026-27", validTo: "2027-03-31" }), "Type at least one rate, or choose a discount off the day's rate.", "no rate typed is refused, not priced at 0");
eq(contractWrong({ ...blank, name: "Acme", validTo: "2027-03-31", cells: { "rt1|EP": { single: "0", double: "" } } }),
  "A contract rate is an amount above 0. Leave it blank where none is agreed.", "0 is refused");
eq(contractWrong({ ...blank, name: "Acme", validTo: "2027-03-31", cells: { "rt1|EP": { single: "4,500", double: "" } } }),
  "A contract rate is an amount above 0. Leave it blank where none is agreed.", "a figure that is not a number is refused, never guessed");
eq(contractWrong({ ...blank, name: "Acme", validTo: "2027-03-31", cells: { "rt1|EP": { single: "4500", double: "" } } }), null, "one rate is enough");
eq(contractWrong({ ...blank, name: "Acme", validTo: "31-03-2027", cells: { "rt1|EP": { single: "4500", double: "" } } }),
  "Valid to: type it as 2026-04-01.", "a date typed another way is refused");
eq(contractWrong({ ...blank, name: "Acme", validTo: "2026-11-19", cells: { "rt1|EP": { single: "4500", double: "" } } }),
  "A contract ends on or after the day it starts.", "the end before the start");
eq(contractWrong({ ...blank, name: "Acme", validTo: "2027-03-31", pricing: "discount", discountPercent: "" }),
  "The discount is a percentage above 0, at most 100.", "a discount must be typed");
const sent = contractInput({ ...blank, name: " Acme ", validTo: "2027-03-31", pricing: "discount", discountPercent: "12.5", commissionPct: "10",
  cells: { "rt1|EP": { single: "4500", double: "" } } }, false);
eq([sent.name, sent.discountPercent, sent.commissionPct, sent.rates], ["Acme", 12.5, null, []], "discount only, no commission for a corporate, no rates");
eq(contractInput({ ...blank, commissionPct: "" }, true).commissionPct, null, "an agent's blank commission is none agreed, not 0");
eq(priceWords(4500.5), "₹4,500.50", "a price on screen keeps its paise");
eq(priceWords(null), "-", "not agreed is a dash");

/* ── The company ── */
eq(creditLine({ creditAllowed: true, creditDays: 30, creditLimit: null }), "Allowed · 30 days · -", "the picture's A4 Test Traders");
eq(creditLine({ creditAllowed: true, creditDays: null, creditLimit: null }), "Allowed · - · -", "the picture's go-MMT");
eq(creditLine({ creditAllowed: true, creditDays: 45, creditLimit: 500000 }), "Allowed · 45 days · ₹5,00,000", "a limit in Indian figures");
eq(creditLine({ creditAllowed: false, creditDays: 30, creditLimit: 1 }), "No", "no credit");
eq(contractHere({ contractName: "Acme 2026-27", contractTo: "2027-03-31" }), "Acme 2026-27 to 31 Mar 2027", "the contract in force");
eq(contractHere({ contractName: null, contractTo: null }), "-", "none in force");
const cf = companyForm();
eq(companyWrong(cf), "A company has a name.", "a name first");
eq(companyWrong({ ...cf, name: "Acme", pincode: "41321" }), "A PIN code is 6 digits, e.g. 413216.", "a PIN code");
eq(companyWrong({ ...cf, name: "Acme", gstin: "27AAPFU0939F1ZX" }), "That GSTIN is not right - a character is mistyped. Check it against the company's GST certificate.", "GSTN's check digit");
eq(companyWrong({ ...cf, name: "Acme", creditAllowed: true, creditLimit: "0" }), "A credit limit is an amount above 0, in rupees.", "a limit of 0");
eq(companyInput({ ...cf, name: "Acme", creditAllowed: false, creditDays: "30", creditLimit: "1000" }).creditDays, null, "no credit, no terms");
eq(companyInput({ ...cf, name: "Acme", creditAllowed: true, creditDays: "", creditLimit: "" }).creditLimit, null, "a blank limit is not set, never 0");

/* ── Allotments ── */
const a: Allotment = {
  id: "a", contractId: "k", contractName: "Acme", companyId: "c", companyName: "Acme", companyKind: "corporate",
  roomTypeId: "rt1", roomType: "Deluxe", firstNight: "2026-11-18", lastNight: "2026-11-22", rooms: 4, releaseDays: 2, notes: null,
  rates: [{ mealPlan: "EP", single: 4500, double: null }], discountPercent: null,
  nights: [
    { night: "2026-11-18", picked: 1, held: 0, released: true, releasedRooms: 3, releasedOn: "2026-11-16" },
    { night: "2026-11-20", picked: 3, held: 1, released: false, releasedRooms: null, releasedOn: null },
    { night: "2026-11-21", picked: 0, held: 4, released: false, releasedRooms: null, releasedOn: null },
  ],
};
eq(leftIn(a, "2026-11-20"), 1, "the fewest still held on a night to come");
eq(leftIn(a, "2026-11-23"), null, "nothing ahead: none");
eq(heldLine(a, "2026-11-20"), "Booked from it 3 · Still held 1 (the fewest on a night) · Back on sale 3 over 1 night", "the counts line");
eq(releaseLine(a, "2026-11-20"), "Released 2 days before each night · next on 18 Nov 2026", "the next release");
eq(allotmentRate(a, { pricing: "rates", discountPercent: null }), "EP ₹4,500.00 / -", "the contract's rate for its room type");
eq(allotmentRate({ rates: [] }, { pricing: "discount", discountPercent: 10 }), "10% off the day's rate", "a discount contract");
const k = { validFrom: "2026-04-01", validTo: "2027-03-31" };
const af = allotmentForm(undefined, k, { roomTypes: [{ id: "rt1", name: "Deluxe" }], today: "2026-11-20" });
eq([af.firstNight, af.rooms, af.releaseDays], ["2026-11-20", "", ""], "a new hold starts today, its counts blank");
eq(allotmentWrong({ ...af, lastNight: "2027-04-02", rooms: "2", releaseDays: "1" }, k), "An allotment's nights are inside its contract.", "inside the contract");
eq(allotmentWrong({ ...af, lastNight: "2026-11-30", rooms: "", releaseDays: "1" }, k), "Rooms is a whole number from 1 to 500.", "rooms must be typed");
eq(allotmentWrong({ ...af, lastNight: "2026-11-30", rooms: "2", releaseDays: "0" }, k), null, "0 days' release is allowed");

/* ── Offline: every write refused, none held ── */
for (const [m, p] of [["POST", "/api/hotels/5EL/companies"], ["PATCH", "/api/hotels/5EL/companies/1"], ["POST", "/api/hotels/5EL/contracts"],
  ["PUT", "/api/hotels/5EL/contracts/1"], ["POST", "/api/hotels/5EL/allotments"], ["PUT", "/api/hotels/5EL/allotments/1"]] as const) {
  eq(ruleFor(p, m).tier, "refuse", `${m} ${p} is refused offline`);
}

/* ── The export ── */
const row: CompanyRow = { id: "1", name: "A4 Test Traders", kind: "corporate", gstin: null, contactName: null, phone: null, email: null,
  addressLine: null, city: "Solapur", state: null, pincode: null, creditAllowed: true, creditDays: 30, creditLimit: null, contractName: null, contractTo: null };
eq(contractsTable([row]).rows[0], ["A4 Test Traders", "Corporate", "-", "-", "-", "-", "Solapur", "-", "Yes", "30", "-", "-", "-"], "a row");

console.log("contracts: all checks pass");
