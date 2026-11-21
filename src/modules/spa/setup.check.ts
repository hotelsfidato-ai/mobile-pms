/* Run: node --experimental-strip-types src/modules/spa/setup.check.ts
   Treatments and therapists (lane U): a row's price words (a dash, never ₹0;
   0 a price; paise kept), the dialogs' checks in the web's order and their
   bodies (blank price null, 0 only with Free, minutes whole), the export's
   rows, and the offline tier (refused, nothing held). */
import { ruleFor } from "../../core/offline.ts";
import {
  BAD_PRICE, listAct, NO_LENGTH, NO_NAME, NO_THERAPIST, priceWords, therapistBody, treatmentBody, treatmentDone, treatmentDraft,
  treatmentRows, TREATMENT_COLUMNS,
} from "./setupRules.ts";
import { LIST_REFUSED, whyNotSetUp } from "./roles.ts";

const eq = (got: unknown, want: unknown, what = "") => {
  if (JSON.stringify(got) !== JSON.stringify(want)) throw new Error(`${what}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
};

eq([priceWords(null), priceWords(0), priceWords(2500), priceWords(1299.5)], ["-", "₹0", "₹2,500", "₹1,299.50"], "price words");
eq([listAct(true), listAct(false)], ["Take off the list", "Put back on the list"]);

const d = { name: " Head massage ", minutes: "30", price: "", free: false };
eq(treatmentBody(d), { body: { name: "Head massage", minutes: 30, price: null, free: false } }, "blank is unpriced");
eq(treatmentBody({ ...d, price: "2499.75" }), { body: { name: "Head massage", minutes: 30, price: 2499.75, free: false } }, "as typed");
eq(treatmentBody({ ...d, price: "0", free: true }), { body: { name: "Head massage", minutes: 30, price: 0, free: true } }, "Free is 0");
eq(treatmentBody({ ...d, name: " " }), { problem: NO_NAME }, "the name first");
eq(treatmentBody({ ...d, name: "", minutes: "" }), { problem: NO_NAME }, "the web's order");
eq(treatmentBody({ ...d, minutes: "0" }), { problem: NO_LENGTH });
eq(treatmentBody({ ...d, minutes: "abc" }), { problem: NO_LENGTH }, "a word is no length");
eq(treatmentBody({ ...d, minutes: "45.5" }), { problem: NO_LENGTH }, "whole minutes");
eq(treatmentBody({ ...d, price: "-1" }), { problem: BAD_PRICE });
eq(treatmentBody({ ...d, price: "free" }), { problem: BAD_PRICE });
eq(treatmentDone("Head massage", true), "Head massage is changed.");
eq(treatmentDone("Head massage", false), "Head massage is on the list.");

/* Opened to change: unpriced opens EMPTY (never "0"), free opens ticked. */
const t = { id: "t1", name: "Aromatherapy", minutes: 60, price: null, isActive: true, notes: null };
eq(treatmentDraft(t), { name: "Aromatherapy", minutes: "60", price: "", free: false }, "unpriced opens empty");
eq(treatmentDraft({ ...t, price: 0 }).free, true, "0 opens Free");
eq(treatmentDraft(null), { name: "", minutes: "", price: "", free: false });

eq(therapistBody("  "), { problem: NO_THERAPIST });
eq(therapistBody(" Priya "), { body: { name: "Priya" } });

/* The export: the columns the web's file has, a dash for unpriced. */
eq(TREATMENT_COLUMNS, ["Treatment", "Minutes", "Price", "Offered", "Notes"]);
eq(treatmentRows([t, { ...t, id: "t2", name: "Scrub", price: 1800, isActive: false, notes: "Sea salt" }]),
  [["Aromatherapy", "60", "-", "Yes", "-"], ["Scrub", "60", "₹1,800", "No", "Sea salt"]], "rows");

/* Rights: the list is the owner's, an administrator's and the GM's (SPA_LIST_ROLES). */
eq(whyNotSetUp("front_desk"), LIST_REFUSED, "reception books, does not set the list");
eq(whyNotSetUp("gm"), null);

/* Offline: no spa path is on the web's list - refused, never held. */
for (const [m, p] of [["POST", "/api/hotels/5EL/spa/treatments"], ["PATCH", "/api/hotels/5EL/spa/treatments/t1"],
  ["POST", "/api/hotels/5EL/spa/therapists"], ["PATCH", "/api/hotels/5EL/spa/therapists/h1"]] as const) {
  eq(ruleFor(p, m).tier, "refuse", `${m} ${p} offline`);
}

console.log("spa setup.check: ok");
