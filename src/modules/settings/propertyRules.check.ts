/* Run: node --experimental-strip-types src/modules/settings/propertyRules.check.ts
   Settings → Property's rules (lane P), on made-up data chosen so that a wrong rule gives a different
   answer (MEMORY 11): the child ages, a typed age, a row's move, a logo, the setup's open step, its
   summary and its words, the checklist, the documents' lines, the import's words, and the doubt
   that outlives a sheet (MEMORY 22). */
import {
  addDays, ageOf, broughtWords, checkAddress, checklistLine, childAgeWords, dayCompact, docWhen, doneIn, doubt,
  findAmenities, groupNameSaid, kindNote, logoOf, mapPoint, mayUndo, moved, openStep, rowOf, showsChecklist,
  stateText, STEPS, summaryOf, typedAgeWords, typeWord, voucherWords,
  type Commissioning, type ImportRecord, type SetupView,
} from "./propertyRules.ts";

const eq = (got: unknown, want: unknown, what: string) => {
  if (JSON.stringify(got) !== JSON.stringify(want)) throw new Error(`${what}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
};

/* Child ages: words only, the web's sentence. */
eq(childAgeWords(5, 12), "Children up to 5 stay free; 6 to 12 are children; 13 and over are adults.", "both ages");
eq(childAgeWords(null, 12), "up to 12 are children; 13 and over are adults.", "a child age alone");
eq(childAgeWords(4, null), "Children up to 4 stay free.", "a free age alone");
eq(childAgeWords(null, null), null, "neither");
/* A typed age: blank is null, digits a number, anything else as typed (never a quiet null, MSET-P1). */
eq([ageOf(""), ageOf(" 7 "), ageOf("0"), ageOf("7.5"), ageOf("abc")], [null, 7, 0, "7.5", "abc"], "ageOf");
eq(typedAgeWords("abc", "12"), "up to 12 are children; 13 and over are adults.", "a non-number free age is not worded");

/* A row moved: a swap with its neighbour, never past an end. */
eq(moved(["a", "b", "c"], 1, -1), ["b", "a", "c"], "up");
eq(moved(["a", "b", "c"], 1, 1), ["a", "c", "b"], "down");
eq([moved(["a", "b"], 0, -1), moved(["a", "b"], 1, 1)], [null, null], "past an end");
const am = (name: string) => ({ id: name, name, icon: "x", isActive: true, on: false, used: false });
eq(findAmenities([am("Wi-Fi"), am("Parking"), am("Pool")], " P").map((a) => a.id), ["Parking", "Pool"], "search ignores case and spaces");

/* Logos: a PNG is drawn, an SVG is not drawn here, anything else is none. */
eq(logoOf({ type: "image/png", data: "iVBORw0K" }), { kind: "png", uri: "data:image/png;base64,iVBORw0K" }, "png");
eq(logoOf({ type: "image/svg+xml", data: "PHN2Zz4=" }), { kind: "svg" }, "svg");
eq([logoOf({ type: "image/gif", data: "R0lG" }), logoOf({ type: "image/png", data: "<script>" }), logoOf(null)], [null, null, null], "refused");
eq([groupNameSaid("Fidato Hotels"), groupNameSaid(null)], ['Bills print "by Fidato Hotels" from now on.', "Bills print the hotel's name alone."], "group name words");

/* The profile's figures: a dash for unknown. */
eq([typeWord("boutique_hotel"), typeWord(null), typeWord("castle")], ["Boutique hotel", "-", "-"], "property type");
eq([mapPoint({ latitude: "17.5", longitude: "76.2" }), mapPoint({ latitude: "17.5", longitude: null })], ["17.5, 76.2", "-"], "map point");

/* Dates. */
eq([addDays("2026-02-27", 3), addDays("2026-12-31", 1), addDays("2026-11-20", 7)], ["2026-03-02", "2027-01-01", "2026-11-27"], "addDays");
eq(dayCompact("2026-11-05"), "5 Nov", "dateCompact");

/* Set up this hotel: 18 steps, in the owner's order; a step the server did not name is To do. */
eq([STEPS.length, STEPS[0]!.id, STEPS[17]!.id, STEPS[13]!.number], [18, "profile", "go-live", 14], "the steps");
const st = (id: string, state: string, over: object = {}) => ({ id, state, automatic: true, detail: null, remindOn: null, by: null, at: null, ...over });
const view = {
  ready: false,
  steps: [st("profile", "done"), st("taxes", "done"), st("room-types", "later", { automatic: false }), st("rooms", "done"),
    st("prices", "done"), st("payments", "remind", { remindOn: "2026-11-23", automatic: false }), st("people", "done", { automatic: false })],
} as SetupView;
eq(rowOf(view, "modules").state, "todo", "an unnamed step is To do");
eq(openStep(view), "front-desk", "the first To do - not a Later, not a Remind me");
eq(openStep(view, "people"), "people", "the step asked for");
eq(openStep(view, "nonsense"), "front-desk", "an unknown step asked for");
eq(openStep({ ready: true, steps: STEPS.map((s) => st(s.id, "done")) } as SetupView), "go-live", "all done: the summary");
eq([doneIn(view, "must"), doneIn(view, "opening")], [4, 1], "done in each group");
eq([stateText(rowOf(view, "payments")), stateText(rowOf(view, "room-types")), stateText({ state: "remind", remindOn: null })],
  ["Remind me 23 Nov", "Later", "Remind me"], "state words");
eq([mayUndo(rowOf(view, "people")), mayUndo(rowOf(view, "profile")), mayUndo(rowOf(view, "payments")), mayUndo(rowOf(view, "modules"))],
  [true, false, true, false], "Undo: ticked by hand or parked only");
const sum = summaryOf(view);
eq(sum.missing.map((s) => s.title), ["Room types"], "a first booking still needs");
eq(sum.left.slice(0, 3).map((s) => s.id), ["room-types", "payments", "front-desk"], "parked first, then in order");
eq([sum.left.length, sum.done.length], [12, 5], "left and done");

/* The checklist on Profile: hidden once everything is settled; its line counts the blocking. */
const ck = (blocking: boolean, done = false) => ({ id: String(Math.random()), label: "x", done, detail: "y", blocking, to: null });
const com = (checks: ReturnType<typeof ck>[], can: boolean): Commissioning =>
  ({ property: "5EL", checks, done: checks.filter((c) => c.done).length, total: checks.length, canTakeABooking: can, blockedBy: [] });
eq([showsChecklist(com([ck(true, true)], true)), showsChecklist(com([ck(false)], true)), showsChecklist(null)], [false, true, false], "shown while missing");
eq(checklistLine(com([ck(true), ck(true), ck(false)], false)).slice(0, 26), "2 things must be settled f", "blocking counted");
eq(checklistLine(com([ck(false)], true)).slice(0, 21), "Everything that stops", "nothing blocking");
eq([checkAddress("/settings/rates/taxes", "5EL"), checkAddress("/cancellation-terms", "5EL")], ["/settings/rates/taxes", "/h/5EL/cancellation-terms"], "a check's address");

/* Documents: the hotel's own rules say when the invoice prints. */
eq(docWhen("invoice", { invoiceAtCheckout: "offer", invoiceCopies: 1 }, "5EL").when,
  "Offered on the bill after check-out: Issue tax invoice. One copy.", "the invoice, offered, one copy");
eq(docWhen("invoice", undefined, "5EL").when.endsWith("DUPLICATE FOR SUPPLIER."), true, "the web's defaults: printed, two copies");
eq(docWhen("voucher", undefined, "5EL").where, { to: "/h/5EL/guest-messages", label: "Guest messages" }, "the voucher's place");

/* The import's words. */
const imp = { kind: "bookings", sendVouchers: false, guests: 0, filled: 2, bookings: 1, stays: 3, advances: 0 } as ImportRecord;
eq(broughtWords(imp), "2 filled in, 1 booking, 3 past stays", "brought in");
eq(broughtWords({ ...imp, filled: 0, bookings: 0, stays: 0 }), "-", "nothing brought in is a dash");
eq([voucherWords(imp), voucherWords({ ...imp, kind: "guests" })], ["Not sent", "-"], "vouchers");
eq(kindNote("bookings", "1 Oct 2026").includes("(before 1 Oct 2026)"), true, "the first day in the note");

/* The doubt: stuck after a loss, through any number of looks, until a read that BEGAN after it. */
const k = "5EL profile";
eq(doubt.stuck(k, 100), false, "no loss, no stop");
doubt.mark(k, 500);
eq(doubt.stuck(k), true, "a loss stops the page");
eq(doubt.stuck(k, 400), true, "a read that began before the loss does not free it");
eq(doubt.stuck(k, 500), true, "nor one that began at the same moment");
eq(doubt.stuck("5EL amenities", 0), false, "another page is not stopped");
eq(doubt.stuck("AGR profile"), false, "nor another hotel");
eq(doubt.stuck(k, 501), false, "a read that began after it frees it");
eq(doubt.stuck(k, 0), false, "and it stays freed");

console.log("propertyRules.check: ok");
