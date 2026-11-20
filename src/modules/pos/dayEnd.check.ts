/* Run: node --experimental-strip-types src/modules/pos/dayEnd.check.ts
   Close restaurant day's rules: the notes typed, the tin's words, the close's guards. */
import {
  approvalWords, closeBody, precise as exact, rupees as money, signed, dayAt, hotelNameOf, kept, methodsByAmount, mayRecord, movementBody, needsReason, rowFigure, seedCounts,
  typed, variance, waitsOrRefused, whyNotClose, type DayEnd,
} from "./dayEnd.ts";

const eq = (got: unknown, want: unknown) => {
  if (JSON.stringify(got) !== JSON.stringify(want)) throw new Error(`got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
};
const rupees = (n: number) => `₹${n.toFixed(2)}`;

/* The notes: whole notes only, a blank is nothing typed, integers so exact. */
eq(typed({}), { any: false, bad: null, total: 0, denominations: [] });
eq(typed({ 500: "3", 2: "7", 100: "" }), { any: true, bad: null, total: 1514, denominations: [{ value: 500, count: 3 }, { value: 2, count: 7 }] });
eq(typed({ 500: "0" }).any, true); // a typed 0 is an answer (the empty tin), unlike a blank
eq(typed({ 500: "0" }).total, 0);
eq(typed({ 500: "1.5" }).bad, 500); // the web's Number("1.5") would count 750; the server skips it
eq(typed({ 200: "-2", 500: "x" }).bad, 500); // the first row the grid shows
eq(typed({ 50: " 4 " }).total, 200);
eq(rowFigure(500, ""), null); // a dash, not a zero: nobody counted here
eq(rowFigure(500, "0"), null);
eq(rowFigure(20, "6"), 120);
eq(seedCounts([{ value: 500, count: 2 }]), { 500: "2" });

/* The tin: a paid-out waiting or refused is not taken off it. */
eq(waitsOrRefused({ approval: "pending" }), true);
eq(waitsOrRefused({ approval: "approved" }), false);
eq(waitsOrRefused({ approval: null }), false);
eq(approvalWords({ approval: "rejected", approvalNote: "No bill" }), "Not approved: No bill - not taken off the tin");
eq(approvalWords({ approval: "clarify" }), "Waiting for a yes - not taken off the tin yet");
eq(approvalWords({}), null);

/* Variance: the server's figure; the waiting part is one of the two figures sent, never a sum. */
eq(variance(null), { counted: false });
eq(variance(0.004), { counted: true, balanced: true, over: true, by: 0.004, waitingPart: null });
eq(variance(-250.5, 100), { counted: true, balanced: false, over: false, by: 250.5, waitingPart: 100 });
eq(variance(-50, 100).waitingPart, 50);
eq(variance(30, 100).waitingPart, null); // over: the paid-outs do not explain it

/* A reason only for what the paid-outs waiting do not explain (till.ts close). */
eq(needsReason({ variance: null, waiting: 0 }), false);
eq(needsReason({ variance: -100, waiting: 100 }), false);
eq(needsReason({ variance: -100.01, waiting: 100 }), true);
eq(needsReason({ variance: 0.1 + 0.2 - 0.3, waiting: 0 }), false); // float dust is not a difference

/* The float kept: blank is not zero; from ₹0 to the count, to the paisa. */
eq(kept("", 1000), { value: null, ok: false });
eq(kept("0", 1000), { value: 0, ok: true });
eq(kept("1000", 1000), { value: 1000, ok: true });
eq(kept("1000.01", 1000), { value: 1000.01, ok: false });
eq(kept("2,000", 5000).ok, false);
eq(kept("500", null).ok, false);

/* Close is grey with the server's own reason, in its order. */
const day = (over: Partial<DayEnd["cash"]>, blockers: DayEnd["blockers"] = [], closedAt: string | null = null) =>
  ({ blockers, closedAt, cash: { opening: 0, expected: 1200, counted: 1000, variance: -200, waiting: 0, varianceReason: null, denominations: [], ...over } });
eq(whyNotClose(day({}, [{ id: "a", reason: "Table T4 still has an open bill.", detail: "T4" }]), "x", "0", rupees), "Table T4 still has an open bill.");
eq(whyNotClose(day({ counted: null, variance: null }), "", "", rupees), "Count the drawer first.");
eq(whyNotClose(day({}), " ", "0", rupees), "The drawer does not balance. Say why, and it closes.");
eq(whyNotClose(day({}), "Change short", "", rupees), "Say what float is kept for the next day - from ₹0 to the ₹1000.00 counted.");
eq(whyNotClose(day({}), "Change short", "400", rupees), null);
eq(whyNotClose(day({ variance: -200, waiting: 200 }), "", "0", rupees), null); // explained by the paid-outs waiting
eq(whyNotClose(day({}, [], "12 Oct, 00:41"), "x", "0", rupees), "That day is already closed.");
eq(closeBody("Change short", " 400 "), { varianceReason: "Change short", keptCash: 400 });

/* Record: a category only on a paid-out, and asked for there. */
eq(movementBody("top_up", "500", "From the safe", "Kitchen"), { kind: "top_up", amount: 500, reason: "From the safe" });
eq(movementBody("expense", "120.50", "Vegetables", "Kitchen"), { kind: "expense", amount: 120.5, reason: "Vegetables", category: "Kitchen" });
eq(mayRecord("expense", "120", "Vegetables", ""), false);
eq(mayRecord("withdrawal", "120", "  ", ""), false);
eq(mayRecord("withdrawal", "120", "To the safe", ""), true);

eq(methodsByAmount({ upi: 2343, cash: 5901, card: 1291 }).map(([m]) => m), ["cash", "upi", "card"]);
eq(dayAt("Sunday, 11 October 2026", "5 Elements Akkalkot"), "Sunday, 11 October 2026 · 5 Elements Akkalkot");
eq(hotelNameOf([{ code: "AGR", name: "Fidato Agra" }], "5EL"), "5EL"); // never another hotel's name

/* Figures as sent: paise kept, never rounded (MEMORY 9); a dash for none. */
eq(money(12989), "₹12,989");
eq(money(7582.5), "₹7,582.50");
eq(money(null), "-");
eq(exact(336), "₹336.00");
eq(signed(-1, 120.5), "−₹120.50");
eq(signed(1, 500), "+₹500");

console.log("dayEnd.check: ok");
