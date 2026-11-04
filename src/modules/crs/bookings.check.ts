/* Run: node --experimental-strip-types mobile/src/modules/crs/bookings.check.ts
   CRS bookings' words and states, as the web's CrsBookings.tsx draws them,
   and the web's offline tier for its two writes. */
import { ruleFor } from "../../core/offline.ts";
import {
  connectionOf, dateTime, dayYear, factsOf, failedWords, formOf, noteOf, outcomeOf, readsAsLine, stayLines, stayOf, toldOf,
  type CrsBooking, type CrsConnection, type CrsSetup,
} from "./bookings.ts";

const eq = (got: unknown, want: unknown, what: string) => {
  if (JSON.stringify(got) !== JSON.stringify(want)) throw new Error(`${what}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
};

/* Read times as Hermes does (MEMORY 7): only ISO text, anything else NaN.
   Node alone reads Postgres's "2026-10-31 07:35:58.215147+05:30", so a
   dateTime that skipped instant() would pass here and say "-" on a phone. */
const parse = Date.parse;
const ISO = /^\d{4}-\d\d-\d\dT\d\d:\d\d(:\d\d(\.\d{1,3})?)?(Z|[+-]\d\d:\d\d)$/;
Date.parse = (text: string) => (ISO.test(text) ? parse(text) : NaN);

const booking = (patch: Partial<CrsBooking> = {}): CrsBooking => ({
  crsId: "aB3dE", crsReference: "FH-2026-00042", salesperson: "Asha", company: null, guestName: "R. Iyer",
  checkIn: "2026-10-11", checkOut: "2026-10-13", crsStatus: "confirmed", outcome: "booked", reason: null,
  readAt: "2026-10-31 07:35:58.215147+05:30", changeNote: null, changedAt: null, changeDone: false,
  answer: null, answerError: null, bookings: [], ...patch,
});

/* ── The Here pill: the web's words and tones; an unknown outcome as written ── */
eq(outcomeOf("booked"), { words: "Booked here", tone: "info" }, "booked");
eq(outcomeOf("full"), { words: "Hotel full - not booked", tone: "danger" }, "full");
eq(outcomeOf("needs_attention"), { words: "Needs attention", tone: "warning" }, "needs attention");
eq(outcomeOf("later_kind"), { words: "later_kind", tone: "neutral" }, "an outcome the web does not know");

/* ── The bookings it became, in the server's order, with the web's state words ── */
eq(stayLines(booking({ bookings: [
  { id: "r1", reference: "AKK-1042", status: "tentative" },
  { id: "r2", reference: "AKK-1043", status: "checked_in" },
  { id: "r3", reference: "AKK-1044", status: "on_hold" },
] })), ["AKK-1042 · Waiting for the hotel", "AKK-1043 · In house", "AKK-1044 · on_hold"], "the stays");
eq(stayLines(booking()), [], "none yet");

/* ── The CRS register ── */
eq(toldOf(booking({ answer: "partly" })), { text: "Told: partly confirmed", bad: false }, "partly");
eq(toldOf(booking({ answer: "confirmed", answerError: "stale" })), { text: "Told: confirmed", bad: false }, "an answer wins");
eq(toldOf(booking({ answerError: "n8n said 500" })), { text: "Not told: n8n said 500", bad: true }, "not told");
eq(toldOf(booking()), { text: "-", bad: false }, "nothing yet: a dash");

/* ── Changed in the CRS ── */
eq(noteOf(booking()), { kind: "none" }, "no note");
eq(noteOf(booking({ changeNote: "Cancelled in the CRS." })), { kind: "open", note: "Cancelled in the CRS." }, "open");
eq(noteOf(booking({ changeNote: "Cancelled in the CRS.", changeDone: true })), { kind: "done", note: "Cancelled in the CRS." }, "done");

/* ── The line above the list: the first reason wins, then the last error, then the last read ── */
const conn = (patch: Partial<CrsConnection> = {}): CrsConnection =>
  ({ settingsPresent: true, mapped: true, on: true, lastReadAt: null, lastError: null, ...patch });
eq(connectionOf(conn({ settingsPresent: false, mapped: false, on: false, lastError: "boom" })),
  { warn: true, text: "The CRS login is not in the server's settings yet, so nothing is read." }, "no settings (the picture)");
eq(connectionOf(conn({ mapped: false, on: false })), { warn: true, text: "This hotel is not connected to the CRS yet." }, "not mapped");
eq(connectionOf(conn({ on: false })), { warn: true, text: "Reading from the CRS is switched off for this hotel." }, "off");
eq(connectionOf(conn({ lastError: "PERMISSION_DENIED", lastReadAt: "2026-10-31 07:35:58+05:30" })),
  { warn: true, text: "The last read from the CRS failed: PERMISSION_DENIED" }, "the last read failed");
eq(connectionOf(conn()), null, "on, never read: nothing");
/* Postgres's text, the phone's engine reads only ISO (MEMORY 7): 02:05:58 UTC is 7:35 AM in India. */
eq(connectionOf(conn({ lastReadAt: "2026-10-31 07:35:58.215147+05:30" }), 330),
  { warn: false, text: "Last read from the CRS 31 Oct 2026, 7:35 AM." }, "the last read");
eq(dateTime("2026-10-31 19:05:00+05:30", 330), "31 Oct 2026, 7:05 PM", "an evening");
eq(dateTime("2026-10-31 00:00:00+00", 0), "31 Oct 2026, 12:00 AM", "midnight");
eq(dateTime(null), "-", "no time");
eq(dateTime("not a time"), "-", "unreadable");

/* ── Dates: the web's dateShort, a dash for a date not held ── */
eq(dayYear("2026-10-01"), "1 Oct 2026", "a date");
eq(dayYear(null), "-", "no date");
eq(stayOf(booking()), "11 Oct 2026 to 13 Oct 2026", "the stay");
eq(stayOf(booking({ checkOut: null })), "11 Oct 2026 to -", "no check-out");

/* ── The connection card's form ── */
const setup: CrsSetup = {
  crsHotelId: null, bookingSourceId: null, isOn: false, connectedAt: null, readsAs: null,
  roomTypes: [{ crsRoomTypeId: "rtA", roomTypeId: "u1" }], hotelRoomTypes: [], sources: [],
};
const form = formOf(setup);
eq(form, { crsHotelId: "", bookingSourceId: "", isOn: false, roomTypes: [{ crsRoomTypeId: "rtA", roomTypeId: "u1" }] }, "the form");
form.roomTypes[0]!.crsRoomTypeId = "typed";
eq(setup.roomTypes[0]!.crsRoomTypeId, "rtA", "typing never changes what was read");
eq(readsAsLine("CRS reader (AKK)"), "Reads as CRS reader (AKK).", "reads as");
eq(readsAsLine(null), "No service account to read as yet: it is set up at go-live, and nothing is read until it is.", "nobody yet");

/* ── A failed write: the server's words, the web's fallback, or not known ── */
eq(failedWords("done", { message: "That note is not here, or is already done." }, false, true),
  { title: "That note is not here, or is already done." }, "the server's no");
eq(failedWords("done", { message: "x" }, false, false), { title: "Not marked done." }, "the web's fallback");
eq(failedWords("saved", null, false, false), { title: "Not saved." }, "save's fallback");
eq(failedWords("done", { message: "Could not reach the server." }, true, true).title, "Not known whether it was marked done.", "unknown done");
eq(failedWords("saved", { message: "Bad gateway" }, true, true).title, "Not known whether the connection was saved.", "unknown save");

/* ── Offline: neither write is on the web's list, so both are refused, never held ── */
const UNLISTED = "This cannot be done offline yet. It has not been checked as safe to hold and send later, and guessing is how a guest gets charged twice.";
eq([ruleFor("/api/hotels/5EL/crs/bookings/aB3dE/done", "POST").tier, ruleFor("/api/hotels/5EL/crs/bookings/aB3dE/done", "POST").reason],
  ["refuse", UNLISTED], "Done is refused offline");
eq(ruleFor("/api/hotels/5EL/crs/setup", "PUT", JSON.stringify(form)).tier, "refuse", "Save is refused offline");

/* ── The front door (CrsFacts.tsx): nothing for a booking the CRS did not sell ── */
const of = (b: CrsBooking | null) => ({ connection: conn(), bookings: b ? [b] : [] });
eq(factsOf(undefined), null, "still reading: nothing");
eq(factsOf(of(null)), null, "not a CRS booking: nothing");
eq(factsOf(of(booking())), { line: "CRS FH-2026-00042 · sold by Asha · no company", change: null }, "the facts");
eq(factsOf(of(booking({ salesperson: null, company: "Tata", changeNote: "Dates moved." }))),
  { line: "CRS FH-2026-00042 · sold by - · Tata", change: "Changed in the CRS: Dates moved." }, "an open change");
eq(factsOf(of(booking({ changeNote: "Dates moved.", changeDone: true })))?.change, null, "a change done says nothing");

console.log("crs bookings: ok");
