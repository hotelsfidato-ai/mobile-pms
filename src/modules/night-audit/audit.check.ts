/* Run: node --experimental-strip-types mobile/src/modules/night-audit/audit.check.ts
   The night audit's words and rules (audit.ts): what Run sends, when the
   window lets the close go, each blocking item, and every figure as the
   server sent it. The made-up figures do not add up on purpose (MEMORY 11):
   a phone that totalled anything would show a different number. */
import {
  alreadyMade, closeWords, closedDaysNote, dateTime, dateTimeAt, dayPills, dayRows, dayYear, earlyWords, firstCorrectable,
  headPill, lastRunWords, mayConfirm, openOf, recordLine, resultLines, rupees, runBody, stops, undoLines,
  type AuditCheck, type ClosedDay, type NightAuditState,
} from "./audit.ts";

const eq = (got: unknown, want: unknown, what: string) => {
  if (JSON.stringify(got) !== JSON.stringify(want)) throw new Error(`${what}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
};

const check = (id: string, state: "ok" | "attention", n: number, link?: string): AuditCheck =>
  ({ id, label: id, detail: "", state, count: n, ...(link ? { link } : {}) });

const DEPART = "1 room is still showing due out. Check them out, or extend the stay - the audit will not decide which.";
const DRAWER = "A front-desk drawer is still open. Count the cash and close the shift - the audit cannot say what was taken at the desk until somebody has.";
const EARLY = "The last night audit finished at 23:36 on 1 Nov, 0.1 hours ago. Another day closes only 16 hours after the last one - or sooner by the GM, the owner or an administrator, with a reason.";

const state = (over: Partial<NightAuditState> = {}): NightAuditState => ({
  businessDate: "2026-10-11", nextBusinessDate: "2026-10-12", checks: [], canRun: { allowed: true }, lastRun: "10 Oct 2026", ...over,
});

/* ── The pill ── */
eq(headPill([check("a", "attention", 5), check("b", "ok", 3), check("c", "attention", 0)]), { tone: "warning", words: "2 to look at" }, "two to look at");
eq(headPill([check("b", "ok", 3)]), { tone: "success", words: "Nothing outstanding" }, "nothing outstanding");

/* ── Open: a link and something to open; the phone's twin or none ── */
const twin = (to: string) => (to === "/h/5EL/arrivals" ? "/front-desk/5EL" : null);
eq(openOf(check("arrivals", "attention", 5, "/h/5EL/arrivals"), twin), { route: "/front-desk/5EL" }, "arrivals open on the phone");
eq(openOf(check("balances", "attention", 7, "/h/5EL/folios"), twin), { route: null }, "folios: on the website");
eq(openOf(check("arrivals", "ok", 0, "/h/5EL/arrivals"), twin), null, "nothing to open at 0");
eq(openOf(check("room-charges", "ok", 3), twin), null, "no link, no Open");

/* ── Each blocking item, in the server's order ── */
eq(stops({ allowed: false, reason: `${DEPART} ${DRAWER}`, blockers: [{ id: "departures", reason: DEPART, rooms: ["305 · A Guest"] }, { id: "front-desk-drawer", reason: DRAWER, rooms: [] }] }),
  [{ reason: DEPART, rooms: ["305 · A Guest"] }, { reason: DRAWER, rooms: [] }], "two blockers, each with its reason");
eq(stops({ allowed: false, reason: `${DEPART} ${EARLY}`, blockers: [{ id: "departures", reason: DEPART, rooms: [] }] }),
  [{ reason: DEPART, rooms: [] }, { reason: EARLY, rooms: [] }], "a blocker and the 16 hours for this person");
eq(stops({ allowed: false, reason: EARLY, blockers: [] }), [{ reason: EARLY, rooms: [] }], "the 16 hours alone");
eq(stops({ allowed: false, reason: DEPART }), [{ reason: DEPART, rooms: [] }], "an older server: its one sentence");
eq(stops({ allowed: true, blockers: [] }), [], "nothing stops it");
eq(lastRunWords(null), "Last run: never - this property has not closed a date in this system", "never run");
eq(lastRunWords("10 Oct 2026"), "Last run: 10 Oct 2026", "the server's own date text");

/* ── The window: the box, the reason, what Run sends ── */
const early = { lastAt: "2026-11-01T18:06:00.000Z", lastClock: "23:36 on 1 Nov", hours: 0.1, may: "warning" as const };
eq(mayConfirm(state(), false, ""), false, "not ticked");
eq(mayConfirm(state(), true, ""), true, "ticked, no 16 hours");
eq(mayConfirm(state({ early }), true, "   "), false, "16 hours: a reason of spaces is none");
eq(mayConfirm(state({ early }), true, "Shimla caught up"), true, "16 hours, ticked, a reason");
eq(runBody(state(), "ignored"), { businessDate: "2026-10-11" }, "the day the screen shows, no reason");
eq(runBody(state({ early }), "  Late check-outs  "), { businessDate: "2026-10-11", reason: "Late check-outs" }, "the reason when asked, trimmed");
eq(earlyWords(early), "Warning: the last audit finished at 23:36 on 1 Nov, 0.1 hours ago - less than 16. Say why this day closes so soon. The reason is kept with the audit.", "the GM is warned");
eq(earlyWords({ ...early, may: "reason" }).startsWith("The last audit finished"), true, "the owner is not warned");
eq(closeWords(state()), "The property moves to Monday, 12 October 2026. Tonight's room charges are posted to every guest in house and arrivals who did not come become no-shows. A closed day cannot be edited, only corrected afterwards.", "the window's words");

/* ── Figures: never rounded, a dash when not held ── */
eq(rupees(3699), "₹3,699", "whole rupees as the web");
eq(rupees(419578.76), "₹4,19,578.76", "paise kept, Indian grouping");
eq(rupees(0), "₹0", "a real zero");
eq(rupees(null), "-", "not held");
eq(dayYear("2026-10-09"), "9 Oct 2026", "the web's dateShort");
eq(dateTimeAt(Date.parse("2026-10-12T22:24:00Z"), 330), "13 Oct 2026, 3:54 AM", "IST, after midnight");
eq(dateTimeAt(Date.parse("2026-10-13T06:30:00Z"), 330), "13 Oct 2026, 12:00 PM", "noon");
eq(dateTimeAt(Date.parse("2026-10-12T18:40:00Z"), 330), "13 Oct 2026, 12:10 AM", "just after midnight");
eq(dateTime(null), "-", "no time");
eq(dateTime("not a time"), "-", "an unreadable time");
eq(dateTime("2026-10-12 22:24:00+00") === dateTime("2026-10-12T22:24:00.000Z"), true, "Postgres's text read as ISO");

/* ── A second press: the record that was made ── */
const day: ClosedDay = {
  businessDate: "2026-10-10", ranBy: null, startedAt: "2026-10-12T22:20:00Z", completedAt: "2026-10-12T22:24:00Z",
  roomsPosted: null, revenuePosted: null, noShows: 0, corrections: 2, correctedRevenue: 3100.5, earlyReason: null, earlyBy: null,
};
eq(alreadyMade(409, "2026-10-10", [day]), day, "already closed: the day's record");
eq(alreadyMade(409, "2026-10-11", [day]), null, "a 409 for another reason: not closed");
eq(alreadyMade(503, "2026-10-10", [day]), null, "offline is never 'already closed'");
eq(alreadyMade(409, "2026-10-10", undefined), null, "the list not read");
eq(recordLine({ ...day, completedAt: null }), "Ran by - · closed - · rooms posted - · room revenue - · no-shows 0", "dashes, never zeros");

/* ── The green card ── */
const r = resultLines({
  ok: true, businessDate: "2026-10-11", nextBusinessDate: "2026-10-12", roomsPosted: 1, revenuePosted: 3699.5, complimentary: 2, noShows: 3,
  restaurant: { orders: 4, covers: 9, net: 800, tax: 150, gross: 1000, byTender: [{ method: "cash", amount: 640 }, { method: "upi", amount: 410.25 }],
    voided: [{ orderNo: "R-12", amount: 220, method: null, reason: "Wrong table", by: "Test GM", at: "21:10" }] },
  drawers: { frontDesk: { shifts: 1, opening: 2000, counted: 5100, variances: 1 }, till: { outlets: 0, opening: 0, counted: 0, variances: 0 } },
});
eq(r.head, "Sunday, 11 October 2026 is closed. The property is now operating in Monday, 12 October 2026.", "closed");
eq(r.posted, "1 room posted · ₹3,699.50 · 2 complimentary, not charged · 3 no-shows", "the run's own figures");
eq(r.restaurant, [
  "Restaurant · 4 orders, 9 covers · ₹1,000 (₹800 + ₹150 tax)",
  "cash ₹640 · upi ₹410.25",
  "Voided: R-12 (₹220, -) · Test GM at 21:10 · Wrong table",
], "the till's day as the server read it, nothing added");
eq(r.drawers, [
  { label: "Front desk · 1 shift closed", line: "Opened ₹2,000 · counted ₹5,100 · 1 explained variance" },
  { label: "Till · 0 outlets closed", line: "Not used today." },
], "two drawers, never one figure");
eq(resultLines({ ok: true, businessDate: "2026-10-11" }).posted, "- rooms posted", "not sent: a dash, not 0");
eq(resultLines({ ok: true, businessDate: "2026-10-11", restaurant: { orders: 0, covers: 0, net: 0, tax: 0, gross: 0, byTender: [] } }).restaurant, [], "a till nobody used");

/* ── Closed days ── */
eq(firstCorrectable("2026-10-11"), "2026-09-01", "the 1st of last month");
eq(firstCorrectable("2026-01-05"), "2025-12-01", "over the year");
eq(firstCorrectable(undefined), null, "no date");
eq(closedDaysNote(true, "2026-09-01"), "Every night audit run at this property, newest first. Days from Tuesday, 1 September 2026 on can be corrected; older ones stay as they are.", "the corrector's note");
eq(closedDaysNote(false, "2026-09-01"), "Every night audit run at this property, newest first.", "anyone else");
eq(dayRows(day).map((x) => `${x.label}: ${x.value}`).filter((x) => !x.startsWith("Closed")), [
  "Ran by: -", "Rooms posted: -", "Room revenue: - → ₹3,100.50", "No-shows: 0",
], "a day's rows: dashes for what the record does not hold, the correction beside it");
eq(dayRows({ ...day, earlyReason: "Caught up", earlyBy: "Test GM" }).at(-1), { label: "Why early", value: "Caught up · Test GM" }, "why early, only when early");
eq(dayPills({ ...day, earlyReason: "x" }), [{ tone: "info", words: "Corrected" }, { tone: "warning", words: "Under 16 hours" }], "the pills");
eq(dayPills({ ...day, corrections: 0 }), [], "no pills");
eq(undoLines({ id: "1", backTo: "2026-10-09", lastDay: "2026-10-10", reason: "Closed twice", undoneBy: null, undoneAt: "2026-10-12T22:24:00Z", audits: 1 })[0],
  "Back to Friday, 9 October 2026 · 1 audit undone, to 10 Oct 2026", "a cancel");

console.log("night-audit audit: ok");
