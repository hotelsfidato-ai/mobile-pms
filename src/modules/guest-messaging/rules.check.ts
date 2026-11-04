/* Run: node --experimental-strip-types mobile/src/modules/guest-messaging/rules.check.ts
   The words Guest messages and Connection health put on a row, against
   the web's pages (GuestMessages.tsx, ConnectionHealth.tsx) read on 4 Nov. */
import {
  alertsLine, bookingOf, cameBack, dateTime, dayShort, emptyOf, lastLine, notConnectedOf, pillOf, sentByWord,
  statusTone, statusWord, underOf, unreachableTitle, wentTo, type Connection, type GuestMessages, type SentMessage,
} from "./rules.ts";

/* No node:assert, so the app's own type check reads this file too. */
const eq = (got: unknown, want: unknown, what: string) => {
  if (JSON.stringify(got) !== JSON.stringify(want)) throw new Error(`${what}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
};

/* The desk's clock: India (the web's dateTime is the browser's own zone). */
process.env.TZ = "Asia/Kolkata";

const msg = (over: Partial<SentMessage>): SentMessage => ({
  id: "m1", channel: "email", kind: "booking-confirmation", kindLabel: "Booking confirmation",
  to: { name: "A Guest", phone: "98765 00201", email: "a.guest@example.com" },
  about: { kind: "reservation", id: "r1", reference: "FH-5EL-2610-5054" }, document: null,
  sentAt: "2026-10-28T23:50", status: "sent", detail: "The receiver took it (200).", sentBy: null, byAPerson: false,
  ...over,
});

/* Where it went: the channel's own form first, then the other, then a dash. */
eq(wentTo(msg({})), "a.guest@example.com", "an email goes to the address");
eq(wentTo(msg({ channel: "whatsapp" })), "98765 00201", "a WhatsApp goes to the number");
eq(wentTo(msg({ channel: "whatsapp", to: { name: null, phone: null, email: "x@example.com" } })), "x@example.com", "the other when the channel's is missing");
eq(wentTo(msg({ to: { name: "A", phone: null, email: null } })), "-", "neither: a dash, never blank");

/* The state: the web's words; one it does not know is itself, neutral. */
eq([statusWord("sent"), statusTone("sent")], ["Delivered to the sender", "success"], "sent");
eq([statusWord("failed"), statusTone("failed")], ["Did not go", "danger"], "failed");
eq([statusWord("queued"), statusTone("queued")], ["queued", "neutral"], "an unknown state as itself");

/* Sent by: THREE answers (MSG-2) - a hidden colleague is never "The system". */
eq(sentByWord(msg({})), "The system", "nobody behind it");
eq(sentByWord(msg({ byAPerson: true })), "A member of staff", "a person this reader may not see");
eq(sentByWord(msg({ sentBy: "Test GM", byAPerson: true })), "Test GM", "a person by name");

eq(bookingOf(msg({ about: { kind: "invoice", id: "INV-1", reference: null } })), "-", "a bill has no booking reference");
eq(bookingOf(msg({ about: null })), "-", "about nothing");
eq(cameBack(msg({ detail: null })), "-", "nothing came back");

/* The property's own day, read as written: 23:50 on the 28th stays the 28th whatever the device's zone. */
eq(dayShort("2026-10-28T23:50"), "28 Oct 2026", "the message's day");
process.env.TZ = "America/Los_Angeles";
eq(dayShort("2026-10-28T23:50"), "28 Oct 2026", "not moved by the device's zone");
eq(dayShort("2026-10-31"), "31 Oct 2026", "an arrival day");
process.env.TZ = "Asia/Kolkata";
eq(dayShort(""), "-", "no day");
eq(dayShort("nonsense"), "-", "an unreadable day");

eq(underOf(undefined), "What this system sent guests, and whether it arrived", "the property's");
eq(underOf("r1"), "What this system sent about this booking", "one booking's");

/* Two different empties. */
eq(emptyOf(true).title, "Nothing has been sent yet", "connected and empty");
eq(emptyOf(false).title, "Nothing has been sent, because nothing can be yet", "not connected and empty");

const answer = (over: Partial<GuestMessages>): GuestMessages =>
  ({ connected: false, notConnected: "Sending is not set up yet.", onlineCheckIn: true, messages: [], unreachable: [], ...over });
eq(notConnectedOf(answer({})), "Sending is not set up yet.", "the sender's own sentence");
eq(notConnectedOf(answer({ connected: true })), null, "connected: no note");
eq(notConnectedOf(answer({ notConnected: null })), null, "no sentence: no note of our own");

eq(unreachableTitle(1), "1 booking no message can reach", "one");
eq(unreachableTitle(8), "8 bookings no message can reach", "many");

/* Connection health. */
eq(pillOf("green"), { tone: "success", words: "Working" }, "green");
eq(pillOf("amber"), { tone: "warning", words: "Needs a look" }, "amber");
eq(pillOf("red"), { tone: "danger", words: "Not working" }, "red");
eq(pillOf("grey"), { tone: "neutral", words: "Not set up" }, "grey");
eq(pillOf("blue"), { tone: "neutral", words: "blue" }, "an unknown colour as itself");

/* The web's dateTime on the device's clock; Postgres's text read as the phone's engine reads it (MEMORY 7). */
eq(dateTime("2026-10-31T02:05:00.000Z"), "31 Oct 2026, 7:35 AM", "ISO, in India");
eq(dateTime("2026-10-31T06:35:58.215147Z"), "31 Oct 2026, 12:05 PM", "noon is PM, microseconds read");
eq(dateTime("2026-10-31T18:45:00.000Z"), "1 Nov 2026, 12:15 AM", "after midnight in India is the next day, 12 AM");
const isoOnly = <T,>(fn: () => T): T => {
  const real = Date.parse;
  Date.parse = (text: string) => (/^\d{4}-\d{2}-\d{2}T/.test(text) ? real(text) : NaN);
  try { return fn(); } finally { Date.parse = real; }
};
eq(isoOnly(() => dateTime("2026-10-31 07:35:58.215147+05:30")), "31 Oct 2026, 7:35 AM", "Postgres's own text");
eq(dateTime(null), "-", "never");
eq(dateTime("nonsense"), "-", "unreadable");

const conn = (over: Partial<Connection>): Connection =>
  ({ key: "crs", label: "CRS bridge", status: "red", summary: "The last read from the CRS failed.", lastSuccess: null, lastError: null, ...over });
eq(lastLine(conn({})), "Last success: -", "never succeeded, no error");
eq(lastLine(conn({ lastSuccess: "2026-10-31T02:05:00.000Z", lastError: { at: "2026-10-31T06:35:00.000Z", detail: "fetch failed" } })),
  "Last success: 31 Oct 2026, 7:35 AM · Last error: 31 Oct 2026, 12:05 PM - fetch failed", "both, with the error's words");
eq(lastLine(conn({ lastError: { at: null, detail: null } })), "Last success: - · Last error: -", "an error with no time and no words");

eq(alertsLine(true).startsWith("When a connection turns red, the owner is emailed once"), true, "alerts on");
eq(alertsLine(false).startsWith("Alert emails are off"), true, "alerts off");

console.log("guest-messaging rules: ok");
