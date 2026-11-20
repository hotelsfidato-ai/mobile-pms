/* Run: node --experimental-strip-types src/modules/purchasing/barBills.check.ts
   The bar's bills (barBills.ts) on data where a wrong rule gives another
   answer (MEMORY 11): loose bottles that a rate × cases would drop, a blank
   handling that a Number() would send as 0, an owed "0.00" that a truthy
   test would call unpaid, a printed total off by more than the round-off. */
import { DASH } from "../../core/format.ts";
import { formOffline } from "../../core/files.ts";
import { ruleFor } from "../../core/offline.ts";
import {
  BAR_BILL_REFUSED, billBody, billCheck, bottlesOf, casesText, creditWords, draftAmount, EMPTY_LINE, figures, lineAmount,
  lineFigures, whyNotRecordBar, type BarBill, type BillDraft, type LineDraft,
} from "./barBills.ts";

const eq = (got: unknown, want: unknown, what: string) => {
  if (JSON.stringify(got) !== JSON.stringify(want)) throw new Error(`${what}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
};

/* Who: the server's BAR_RECORDERS, the Bar role included; a viewer refused in its words. */
eq(whyNotRecordBar("bar"), null, "the bar manager records");
eq(whyNotRecordBar("stores"), null, "the Inventory Manager records");
eq(whyNotRecordBar("finance"), BAR_BILL_REFUSED, "the accountant sees, does not record");
eq(whyNotRecordBar(null), BAR_BILL_REFUSED, "no role, refused");

/* A line's amount: a loose bottle is a case's share (12,000 × 2.25), not dropped (24,000). */
eq(lineAmount({ perCase: 12, cases: 2, bottles: 3, ratePerCase: 12000 }), 27000, "loose bottles counted");
eq(lineAmount({ perCase: 48, cases: 0, bottles: 5, ratePerCase: 1999.99 }), 208.33, "paise, rounded as the server");
const line = (over: Partial<LineDraft>): LineDraft => ({ ...EMPTY_LINE, itemId: "d1", perCase: "12", cases: "2", bottles: "3", rate: "12000", ...over });
eq(figures(line({ cases: "", bottles: "" })), null, "nothing came: no figures");
eq(figures(line({ perCase: "" })), null, "bottles to a case missing");
eq(figures(line({ cases: "" })), { perCase: 12, cases: 0, bottles: 3, ratePerCase: 12000 }, "blank cases are none, loose only");
eq(draftAmount(line({ rate: "abc" })), DASH, "a rate that is not a number: a dash");
eq(draftAmount(line({})), "₹27,000.00", "a typed line's amount, paise shown");

/* The check of the typed figures: within ₹1 matches; more is said with its size. */
eq(billCheck([line({})], "150", "", "27150.80").words, { ok: true, text: "matches the bill" }, "round-off allowed");
eq(billCheck([line({})], "150", "", "27100").words, { ok: false, text: "₹50.00 more than the bill" }, "lines make more");
eq(billCheck([line({})], "", "", "").words, null, "no total typed: nothing said");
eq(billCheck([line({}), line({ rate: "" })], "", "270", "").made, "₹27,270.00", "an unfinished line adds nothing");

/* The body: the web's order of sentences, blanks as null (never 0), the credit only when on. */
const f: BillDraft = { supplierId: "s1", billNo: " 4411 ", billDate: "2026-11-18", tpNo: " ", handling: "", tcs: "270", printed: "27270", onCredit: false, dueOn: "2026-12-18" };
const ok = billBody(f, [line({ mrp: "" })]);
eq("body" in ok ? ok.body : ok, {
  supplierId: "s1", billNo: " 4411 ", billDate: "2026-11-18", tpNo: null, handling: null, tcs: 270, total: 27270,
  lines: [{ itemId: "d1", perCase: 12, cases: 2, bottles: 3, ratePerCase: 12000, mrp: null }],
}, "the bill as typed, blank handling null, no dueOn off credit");
const credit = billBody({ ...f, onCredit: true }, [line({})]);
eq("body" in credit ? credit.body.dueOn : credit, "2026-12-18", "on credit: its due date");
eq(billBody({ ...f, onCredit: true, dueOn: "" }, [line({})]), { problem: "Pick the date the bill is due." }, "on credit without a date");
eq(billBody(f, [line({ itemId: "" })]), { problem: "Pick each drink, or choose Add another drink." }, "a line not picked comes first");
eq(billBody({ ...f, supplierId: "" }, [line({})]), { problem: "Who is the bill from? Pick the supplier." }, "no supplier");
eq(billBody({ ...f, printed: " " }, [line({})]), { problem: "Type the bill's total, as printed on it." }, "no total");
const added = billBody(f, [line({ itemId: "new", name: " Old Monk ", sizeMl: "180", unit: "bottle" })]);
eq("body" in added ? added.body.lines[0] : added,
  { newDrink: { name: "Old Monk", unit: "bottle", sizeMl: 180 }, perCase: 12, cases: 2, bottles: 3, ratePerCase: 12000, mrp: null }, "another drink");

/* A box that is not a number is refused, never sent as null nor counted as 0 (the money review of 20 Nov). */
const COMMA_SAID = "Type the amount with a point for the paise, not a comma: 1500.50.";
eq(billBody({ ...f, handling: "1250,50" }, [line({})]), { problem: COMMA_SAID }, "a comma in the handling");
eq(billBody(f, [line({ mrp: "1,250" })]), { problem: COMMA_SAID }, "a comma in the MRP");
eq(billBody({ ...f, tcs: "270 rs" }, [line({})]), { problem: "TCS: type it as a number." }, "words in the TCS");
eq(billBody(f, [line({ itemId: "new", name: "Old Monk", sizeMl: "180ml" })]), { problem: "Size, line 1: type it as a number." }, "a size with letters");
eq(billBody({ ...f, printed: "27,270" }, [line({})]), { problem: COMMA_SAID }, "a comma in the total");
eq(billCheck([line({})], "150,00", "", "27150").words, null, "the check says nothing for a charge that is not a number");
eq(billCheck([line({})], "150,00", "", "27150").made, DASH, "and makes no figure");

/* A recorded bill: the server's figures, a dash where none. */
const bill = (over: Partial<BarBill>): BarBill => ({
  id: "b1", supplier: "Amit Traders", billNo: "4411", billDate: "2026-11-18", tpNo: null, handling: null, tcs: 270, total: 27270,
  recordedBy: null, recordedAt: "18 Nov, 11:05", photoId: null, credit: null,
  lines: [{ item: "Old Monk", unit: "bottle", sizeMl: 180, mrp: null, perCase: 12, cases: 2, bottles: 3, ratePerCase: 12000, amount: 27000 }], ...over,
});
eq(casesText({ cases: 1, bottles: 0 }), "1 case", "one case");
eq(bottlesOf({ cases: 2, perCase: 12, bottles: 3, unit: "bottle" }), "27 bottles", "bottles");
eq(lineFigures(bill({}).lines[0]!), "2 cases + 3 loose (27 bottles) at ₹12,000.00 a case of 12 · ₹27,000.00", "a line");
eq(creditWords(bill({})), null, "paid on the day");
eq(creditWords(bill({ credit: { dueOn: "2026-12-18", owed: "0.00" } })), "On credit, due 18 Dec 2026 - paid", "owed 0.00 is paid");
eq(creditWords(bill({ credit: { dueOn: "2026-12-18", owed: "7270.00" } })), "On credit, due 18 Dec 2026 - ₹7,270.00 left to pay", "part paid");
eq(creditWords(bill({ total: null, credit: { dueOn: "2026-12-18", owed: "7270.00" } })), "On credit, due 18 Dec 2026 - not paid yet", "no total: not paid yet");

/* Offline: the bill is refused (unlisted, nothing held); its photo in the web's own sentence. */
eq(ruleFor("/api/hotels/5EL/bar/purchases", "POST").tier, "refuse", "a bar bill is not held offline");
eq(formOffline("/api/hotels/5EL/bar/purchases/b1/photo"), "The photo needs the connection. Add it when you are back online.", "the photo's offline sentence");

console.log("barBills.check: all passed");
