/* Run: node --experimental-strip-types src/modules/settings/propertyRules.check.ts
   Settings → Property's rules (lane P), on made-up data chosen so that a wrong rule gives a different
   answer (MEMORY 11): the child ages, a typed age, a row's move, a logo, the setup's open step, its
   summary and its words, the checklist, the documents' lines, the import's words. */
import {
  addDays, ageOf, broughtWords, checkAddress, checklistLine, childAgeWords, dayCompact, docWhen, doneIn,
  findAmenities, groupNameSaid, kindNote, logoOf, mapPoint, mayUndo, moved, openStep, rowOf, showsChecklist,
  stateText, STEPS, summaryOf, typedAgeWords, typeWord, voucherWords,
  broughtInWords, choiceOf, choiceValue, countsWords, everyDupe, rowProblems, rowResult, saveBlocked, savingOf,
  type Commissioning, type ImportCounts, type ImportRecord, type ImportRow, type SetupView,
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

/* The check before anything is saved, and Bring in (OldDataPage.tsx): counts chosen so a wrong sum differs. */
const counts: ImportCounts = { rows: 9, faults: 0, toChoose: 0, new: 2, merge: 1, skip: 1, bookings: 0, stays: 3, refused: 2, noRate: 0 };
eq(savingOf(counts), 6, "saved: new, merged, bookings and stays - never the skipped or refused");
eq(savingOf(undefined), 0, "no counts, nothing saved");
eq(saveBlocked(null, false), "Correct what the check lists first.", "no check yet");
eq(saveBlocked({ ok: false, counts }, false), "Correct what the check lists first.", "a check with faults");
eq(saveBlocked({ ok: true, counts }, true), "Check again: the columns or a choice changed.", "changed since the check");
eq(saveBlocked({ ok: true, counts: { ...counts, new: 0, merge: 0, stays: 0 } }, false), "Nothing in this file would be brought in.", "nothing to bring in");
eq(saveBlocked({ ok: true, counts }, false), null, "ready");
eq(countsWords(counts), "9 rows · 2 new guests · 1 to merge · 1 to skip · 3 past stays · 2 refused", "the rows card's line, nothing for a zero");
eq(broughtInWords(counts), "2 new guests, 1 merged, 3 past stays, 3 not brought in, listed", "the toast: refused and skipped together");
eq(broughtInWords(undefined), undefined, "no counts, no line");
const dupe = (line: number, ids: string[]): ImportRow => ({
  line, name: "Asha", what: "guest", action: "duplicate", problems: ["Already on file: choose keep, merge or skip."], notes: [],
  matches: ids.map((id) => ({ id, name: `Asha ${id}`, visits: 1 })),
});
eq(rowResult(dupe(2, ["g1"])), { tone: "warning", word: "Already on file" }, "a duplicate's own pill, though it has a problem");
eq(rowResult({ action: "booking", problems: ["No arrival"] }), { tone: "danger", word: "Fault in the file" }, "a fault wins");
eq(rowResult({ action: "odd", problems: [] }), { tone: "neutral", word: "odd" }, "an action the phone does not know is said as sent");
eq(rowProblems(dupe(2, ["g1"])), [], "the duplicate's line is said by its choice");
eq([choiceValue(undefined), choiceValue({ action: "merge", guestId: "g1" }), choiceValue({ action: "skip" })], ["", "merge:g1", "skip"], "choice to value");
eq([choiceOf("merge:g1"), choiceOf("skip"), choiceOf("keep")], [{ action: "merge", guestId: "g1" }, { action: "skip" }, { action: "keep" }], "value to choice");
const rows = [dupe(2, ["g1"]), dupe(3, ["g2", "g3"]), { ...dupe(4, []), matches: undefined }];
eq(everyDupe(rows, {}, "merge"), { 2: { action: "merge", guestId: "g1" }, 3: { action: "keep" } }, "merge where ONE matches; two matches keep, a non-duplicate untouched");
eq(everyDupe(rows, { 3: { action: "skip" } }, "merge")["3"], { action: "skip" }, "two matches keep the choice already made");
eq(everyDupe(rows, {}, "skip"), { 2: { action: "skip" }, 3: { action: "skip" } }, "skip them all");

console.log("propertyRules.check: ok");
