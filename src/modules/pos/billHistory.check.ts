/* Run: node --experimental-strip-types src/modules/pos/billHistory.check.ts
   Bill history's rules: the question, the words, the server's figures as sent. */
import {
  EMPTY, askPath, askProblem, countWords, guestOf, headingOf, isDay, modesWords, opening, stateOf, stepDay, totalCell,
} from "./billHistoryRules.ts";

const eq = (got: unknown, want: unknown) => {
  if (JSON.stringify(got) !== JSON.stringify(want)) throw new Error(`got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
};
const precise = (n: number) => `₹${n.toFixed(2)}`;

eq(askProblem(EMPTY), "Pick the dates, or type a bill number, a table or a guest.");
eq(askProblem({ ...EMPTY, guest: " " }), "Pick the dates, or type a bill number, a table or a guest.");
eq(askProblem({ ...EMPTY, no: "R-12" }), null);
eq(askProblem({ ...EMPTY, from: "2026-10-12", to: "2026-10-11" }), "The first date is after the last.");
eq(askProblem(opening("2026-10-11")), null);

/* Only what was typed, trimmed and encoded. */
eq(askPath("5EL", opening("2026-10-11")), "/api/hotels/5EL/till/bills?from=2026-10-11&to=2026-10-11");
eq(askPath("5EL", { ...EMPTY, guest: " 98765 43210 ", mode: "upi" }), "/api/hotels/5EL/till/bills?guest=98765%2043210&mode=upi");

eq(guestOf({ stayGuest: "Vikram Desai", guest: "walk-in" }), "Vikram Desai");
eq(guestOf({ stayGuest: null, guest: null }), null);
eq(modesWords({ modes: ["allowance", "upi"] }), "Owner's allowance, UPI");
eq(modesWords({ modes: [] }), "-");
eq(stateOf("void"), { words: "VOID", tone: "danger" });
eq(stateOf("odd").words, "odd");

/* Figures as the server sent them: an NC bill its value, never a sale; a void struck; paise kept. */
eq(totalCell({ status: "no_charge", payable: 0, net: 336, serviceCharge: 0, tip: null }, precise), { main: "NC ₹336.00", struck: false, notes: [] });
eq(totalCell({ status: "void", payable: 336, net: 320, serviceCharge: 0, tip: null }, precise), { main: "₹336.00", struck: true, notes: [] });
eq(totalCell({ status: "settled", payable: 383.2, net: 340, serviceCharge: 17, tip: 20 }, precise),
  { main: "₹383.20", struck: false, notes: ["incl. service ₹17.00", "+ tip ₹20.00"] });

eq(countWords({ bills: [{}] as never, capped: false, cap: 500 }), "1 bill.");
eq(countWords({ bills: [] as never, capped: false, cap: 500 }), "0 bills.");
eq(countWords({ bills: [] as never, capped: true, cap: 500 }), "Showing the first 500 bills. More matched: narrow the dates or add a filter to see the rest.");

eq(headingOf({ status: "settled", billsPrinted: 0 }), "Bill");
eq(headingOf({ status: "settled", billsPrinted: 2 }), "Bill · duplicate");
eq(headingOf({ status: "no_charge" }), "NC");

eq(isDay("2026-02-29"), false);
eq(isDay("2026-10-27"), true);
eq(stepDay("2026-10-31", 1, ""), "2026-11-01");
eq(stepDay("", -1, "2026-10-11"), "2026-10-10");
eq(stepDay("junk", 1, ""), "junk");

console.log("billHistory.check: ok");
