/* Run: node --experimental-strip-types src/modules/marketing/rules.check.ts
   Marketing (Marketing.tsx): a figure nobody has is a dash, never ₹0; paise
   kept; the server's rows only; the months to choose from; who may read. */
import {
  campaignsTable, monthChoices, monthLabel, monthOf, platformWords, rupees, sourceName, sourcesTable, spendNote, whyNotMarketing,
} from "./rules.ts";

const eq = (got: unknown, want: unknown, what: string) => {
  if (JSON.stringify(got) !== JSON.stringify(want)) throw new Error(`${what}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
};

/* ── A dash, never a zero; paise kept ── */
eq(rupees(null), "-", "spend not read is a dash");
eq(rupees(""), "-", "empty text is a dash, not Number('') = 0");
eq(rupees("11097"), "₹11,097", "whole rupees as the web (the picture)");
eq(rupees("105505.50"), "₹1,05,505.50", "paise kept, Indian grouping (MEMORY 9)");
eq(rupees(0), "₹0", "a real zero spend recorded is ₹0");
eq(rupees("abc"), "-", "unreadable is a dash");

/* ── Words ── */
eq(platformWords("meta"), "Meta Ads", "a platform");
eq(platformWords(null), "-", "no platform is a dash");
eq(sourceName({ name: null }), "No source recorded", "a stay with no source");
eq(spendNote({ connected: false, inApp: false, appError: null }), "Spend is read from the leads app, which is not connected yet.", "not connected");
eq(spendNote({ connected: true, inApp: true, appError: null }), null, "read: nothing to say");
eq(spendNote({ connected: true, inApp: true, appError: "The leads app could not be reached, so spend is not shown." }),
  "The leads app could not be reached, so spend is not shown.", "the server's sentence");

/* ── Months ── */
eq(monthOf("2026-11-19"), "2026-11", "the property's today opens its month");
eq(monthLabel("2026-10"), "October 2026", "the label");
const ch = monthChoices("2026-11");
eq(ch.length, 37, "a year ahead, this month, two years back");
eq([ch[0]!.value, ch[12]!.value, ch[13]!.value, ch[36]!.value], ["2027-11", "2026-11", "2026-10", "2024-11"], "newest first, across a year's end");
eq(monthChoices("2026-01", 0, 1).map((m) => m.value), ["2026-01", "2025-12"], "January back to December");

/* ── The exports: the server's rows, no total line ── */
const d = { month: "2026-10", connected: false, inApp: false, appError: null,
  campaigns: [{ key: "diwali", name: null, platform: "google", spend: null, bookings: 2, revenue: "8198" }],
  sources: [{ id: null, name: null, bookings: 20, revenue: null }] };
eq(campaignsTable(d).rows, [["diwali", "Google Ads", "-", "2", "₹8,198"]], "a campaign's row");
eq(campaignsTable(d).totals, undefined, "no phone sum");
eq(sourcesTable(d).rows, [["No source recorded", "20", "-"]], "a source's row");

/* ── Who: the gate's `marketing` view ── */
eq(["owner", "admin", "gm"].map(whyNotMarketing), [null, null, null], "the three");
eq(whyNotMarketing("front_desk"), "Reading marketing numbers is for the owner, an administrator or the general manager. Ask one of them.", "the gate's sentence");

console.log("marketing: all checks pass");
