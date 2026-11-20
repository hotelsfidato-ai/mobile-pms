/* Run: node --experimental-strip-types src/modules/settings/msgRules.check.ts
   Settings → Messages and Rivals' prices (lane m13-set-messages): who may, the addresses, the
   schedules' bodies and words, the invoice's moment, and the page's stop. Made-up rows chosen so a
   wrong rule gives a different answer (MEMORY 11). */
import {
  NEW, addressesIn, catchUpLine, dayShort, draftOf, emailsBody, emailsDraftOf, lastLine, mayAdd, onSince, pageStops, pausedInput,
  periodLine, periodsFor, periodsHint, pickReport, refusedPage, refusedWrite, removeWords, schedulable, sendToHint, stampIn, toInput,
  toLine, type MessageSwitch, type Schedule, type Schedules,
} from "./msgRules.ts";

const eq = (got: unknown, want: unknown, what: string) => {
  if (JSON.stringify(got) !== JSON.stringify(want)) throw new Error(`${what}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
};
/* Hermes reads only ISO (MEMORY 7, 17): every time below is read as the phone reads it. */
const realParse = Date.parse;
Date.parse = (text: string) => (/^\d{4}-\d{2}-\d{2}(T|$)/.test(text) ? realParse(text) : NaN);

/* ── Who may: the console's navigation opens it; room_config edit writes ── */
eq(refusedPage("gm", "switches"), null, "the GM opens Guest messages on/off");
eq(refusedPage("owner", "rivals"), null, "the owner opens Rivals' prices");
eq(refusedPage("admin", "schedules"), null, "an administrator opens Scheduled reports");
eq(refusedPage("hotel_manager", "reportEmails"),
  "You are signed in as Hotel Manager, which does not include Daily report emails. If you need it, the person who set up your account can change your role.",
  "the hotel manager is not let in, in RequireAccess's words");
eq(refusedPage("front_desk", "switches") !== null, true, "reception is not let in");
eq([refusedWrite("owner", "switches"), refusedWrite("admin", "rivals"), refusedWrite("gm", "schedules")], [null, null, null], "the three who set the hotel up may change");
eq(refusedWrite("read_only", "rivals"),
  "Switching rivals' prices is for the owner, an administrator or the general manager. Ask one of them.",
  "the gate's own sentence (roleGate refusalFor)");

/* ── Addresses: one a line, or with commas or semicolons; blanks dropped ── */
eq(addressesIn(" a@x.in\n\nb@y.in, c@z.in;d@w.in  "), ["a@x.in", "b@y.in", "c@z.in", "d@w.in"], "addressesIn");
eq(addressesIn("   \n "), [], "nothing typed is no address");
eq(sendToHint(true, " \n"), "On, but nobody gets it until an address is typed.", "on with no address");
eq(sendToHint(false, ""), "One email address a line.", "off with no address");
eq(sendToHint(true, "a@x.in"), "One email address a line.", "on with an address");

const emails = {
  reports: [
    { key: "night-audit", title: "Night audit report", contains: "c", isOn: true, addresses: ["a@x.in", "b@x.in"], changedBy: null, changedAt: null },
    { key: "ledger", title: "Ledger", contains: "c", isOn: false, addresses: [], changedBy: "Asha", changedAt: "2026-11-19T10:00:00Z" },
  ],
  notConnected: null,
};
const d = emailsDraftOf(emails);
eq(d, { "night-audit": { isOn: true, text: "a@x.in\nb@x.in" }, ledger: { isOn: false, text: "" } }, "the draft from the server");
eq(emailsBody({ ...d, ledger: { isOn: true, text: "c@y.in, d@y.in" } }),
  { reports: [{ key: "night-audit", isOn: true, addresses: ["a@x.in", "b@x.in"] }, { key: "ledger", isOn: true, addresses: ["c@y.in", "d@y.in"] }] },
  "PUT /report-emails sends all of them, as a whole");

/* ── Scheduled reports ── */
const reports: Schedules["reports"] = [
  { key: "manager", title: "Manager report", periods: ["yesterday", "last-week", "last-month", "month-to-date"] },
  { key: "gst-monthly", title: "GST monthly", periods: ["last-month"] },
  { key: "yearly", title: "Yearly statistics", periods: [] },
];
eq(schedulable(reports).map((r) => r.key), ["manager", "gst-monthly"], "a yearly report cannot go on a schedule");
eq(pickReport(NEW, reports, "gst-monthly").period, "last-month", "a whole month's report takes its only period");
eq(pickReport({ ...NEW, period: "yesterday" }, reports, "manager").period, "yesterday", "a period the report allows is kept");
eq(periodsFor(reports, ""), ["yesterday", "last-week", "last-month", "month-to-date"], "every period while no report is chosen");
eq(periodsFor(reports, "gst-monthly"), ["last-month"], "the report's own periods");
eq(periodsHint(reports, "gst-monthly"), "A report of a whole month goes for last month only: this month is not closed yet.", "the month hint");
eq(periodsHint(reports, "manager"), undefined, "no hint for a report of any period");
eq([mayAdd(NEW), mayAdd({ ...NEW, report: "manager" }), mayAdd({ ...NEW, report: "manager", text: " , " }), mayAdd({ ...NEW, report: "manager", text: "a@x.in" })],
  [false, false, false, true], "Save needs a report and an address");
eq(toInput({ ...NEW, report: "manager", frequency: "monthly", weekday: 3, dayOfMonth: 15, text: "a@x.in\nb@x.in" }),
  { report: "manager", period: "last-week", frequency: "monthly", weekday: null, dayOfMonth: 15, fileType: "pdf", addresses: ["a@x.in", "b@x.in"], isPaused: false },
  "only the day the frequency uses is sent");
eq(toInput({ ...NEW, report: "manager", frequency: "daily", text: "a@x.in" }).weekday, null, "every day sends no weekday");

const s: Schedule = {
  id: "s1", report: "manager", title: "Manager report", period: "last-week", frequency: "weekly", weekday: 7, dayOfMonth: null,
  fileType: "xlsx", addresses: ["a@x.in", "b@x.in"], isPaused: false, when: "every Sunday", changedBy: "Asha",
  changedAt: "2026-11-19 10:00:00.123456+05:30", last: { date: "2026-11-16", status: "refused", detail: "No address", at: "2026-11-17T00:30:00Z" },
};
eq(periodLine(s), "Last week, Monday to Sunday, every Sunday after the night audit, as Excel", "the period line");
eq(toLine(s), "To a@x.in, b@x.in", "the addresses line");
eq(lastLine(s), "Last: Not sent for the day 16 Nov 2026 - No address", "the last send, in the web's words");
eq(lastLine({ ...s, last: null }), "Not sent yet.", "never sent");
eq(lastLine({ ...s, last: { ...s.last!, status: "sent", detail: null } }), "Last: Sent for the day 16 Nov 2026", "sent, no detail");
eq(pausedInput(s), { report: "manager", period: "last-week", frequency: "weekly", weekday: 7, dayOfMonth: null, fileType: "xlsx",
  addresses: ["a@x.in", "b@x.in"], isPaused: true }, "Pause sends the schedule as it is, paused");
eq(pausedInput({ ...s, isPaused: true }).isPaused, false, "Resume");
eq(draftOf({ ...s, frequency: "monthly", weekday: null, dayOfMonth: 9 }).weekday, 1, "a missing weekday becomes Monday in the form");
eq(removeWords(s).title, "Take this schedule off?", "the dialog's title");
eq(removeWords(s).body.startsWith("Manager report, every Sunday. Nothing more is sent by it"), true, "the dialog's sentence");
eq(dayShort(null), "-", "no date is a dash");

/* ── The invoice's moment, as en-IN writes it, in the phone's own time ── */
const inv = (over: Partial<MessageSwitch>): MessageSwitch =>
  ({ kind: "invoice", label: "Tax invoice", when: "w", isOn: true, switchedOnAt: "2026-11-20 08:05:09.5+05:30", changedBy: null, changedAt: null, ...over });
const local = new Date(Date.parse("2026-11-20T08:05:09.500+05:30"));
const h = local.getHours();
eq(onSince(inv({})), `On since ${String(local.getDate()).padStart(2, "0")}/11/2026, ${h % 12 || 12}:${String(local.getMinutes()).padStart(2, "0")}:09 ${h < 12 ? "am" : "pm"}.`,
  "Postgres's text read as Hermes reads it, the hour not padded");
eq(stampIn("not a time"), "-", "an unreadable time is a dash, never NaN");
eq([onSince(inv({ isOn: false })), onSince(inv({ switchedOnAt: null })), onSince(inv({ kind: "review" }))], [null, null, null], "On since only for the invoice, on, with a moment");
eq(catchUpLine({ from: "09:00", until: "21:00" }),
  "A booking made before sending was first switched on is confirmed only from 09:00 to 21:00, the hotel's time (fixed).", "the catch-up line");

/* ── The page's stop (MEMORY 16, 22) ── */
let clock = 100;
const st = pageStops(() => clock);
const k = "5EL/schedules";
let heard = 0;
const stopWatching = st.watch(() => { heard += 1; });
st.begin(k);
eq(st.flying(k), true, "a write on its way");
clock = 200; st.lose(k); st.end(k);
eq([st.flying(k), st.lost(k)], [false, true], "lost when nothing came back");
st.seen(k, 150);
eq(st.lost(k), true, "a read that began BEFORE the loss, though it came back after, does not lift it");
st.seen(k, 200);
eq(st.lost(k), true, "nor one begun the same moment");
st.seen(k, 201);
eq(st.lost(k), false, "a read begun after the loss lifts it");
st.lose("AGR/schedules");
eq([st.lost("AGR/schedules"), st.lost(k)], [true, false], "kept by hotel and page");
eq(heard, 5, "a page coming back hears each change: begin, lose, end, the lift, the other hotel's loss");
stopWatching(); st.lose(k);
eq(heard, 5, "a page gone hears nothing");

console.log("msgRules.check: ok");
