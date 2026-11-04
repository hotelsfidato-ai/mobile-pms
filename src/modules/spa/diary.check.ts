/* Run: node --experimental-strip-types src/modules/spa/diary.check.ts
   The spa diary's rules on a phone (diary.ts), on data where a wrong rule
   gives a different answer (MEMORY 11). */
import { DASH } from "../../core/format.ts";
import { keyKeeper } from "../../core/keys.ts";
import { ruleFor } from "../../core/offline.ts";
import {
  actsOf, bandWords, bookBody, chargeKeys, chargedWords, clockDate, clockTime, countLine, rupees, shiftDay,
  stayChoices, stayWords, treatmentWords, whatAndWhen, type SpaAppointment, type SpaDiary,
} from "./diary.ts";

const eq = (got: unknown, want: unknown, what: string) => {
  if (JSON.stringify(got) !== JSON.stringify(want)) throw new Error(`${what}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
};

const appt = (over: Partial<SpaAppointment>): SpaAppointment => ({
  id: "a1", status: "booked", startsAt: "2026-10-11T16:00", endsAt: "2026-10-11T17:00", treatment: "Aromatherapy massage",
  minutes: 60, guestName: "Vikram Desai", room: "202", amount: 2500, settlement: null, ...over,
});

/* ── The property's clock, read as text: no Date, no zone ── */
eq(clockTime("2026-10-11T16:00"), "4:00 PM", "an afternoon");
eq(clockTime("2026-10-11T00:05"), "12:05 AM", "just after midnight is 12, not 0");
eq(clockTime("2026-10-11T12:30"), "12:30 PM", "noon is PM");
eq(clockTime("2026-10-11T11:00"), "11:00 AM", "a morning");
/* A zone-reading parse would move these by the phone's offset; the text is the hotel's. */
eq(clockTime("2026-10-11T23:30"), "11:30 PM", "late, never the next day");
eq(clockTime(null), DASH, "no time is a dash");
eq(clockTime("2026-10-11"), DASH, "a bare date has no time");
eq(clockTime("2026-10-11T25:00"), DASH, "an impossible hour is a dash, never thrown");
eq(clockDate("2026-10-11"), "11 Oct 2026", "a day");
eq(clockDate("2026-10-01T09:00"), "1 Oct 2026", "a diary time's day, no leading zero");
eq(clockDate("2026-13-01"), DASH, "a month that is not one");
eq(clockDate(undefined), DASH, "no day");
eq(shiftDay("2026-10-31", 1), "2026-11-01", "the day after, over a month");
eq(shiftDay("2026-01-01", -1), "2025-12-31", "the day before, over a year");
eq(shiftDay("2028-02-28", 1), "2028-02-29", "a leap day");
eq(shiftDay("junk", 1), "junk", "unreadable stays as it was");

/* ── The page's words ── */
const diary: SpaDiary = {
  businessDate: "2026-10-11", from: "2026-10-11", to: "2026-10-11",
  therapists: [
    { id: "t1", name: "Ravi Jadhav", appointments: [appt({ id: "a0", amount: null, treatment: "Head massage" })] },
    { id: "t2", name: "Sunita Patil", appointments: [appt({}), appt({ id: "a2", status: "completed", settlement: "room" })] },
    { id: "t3", name: "Meera Kulkarni", appointments: [] },
  ],
};
eq(countLine(diary), "3 treatments on 11 Oct 2026.", "every therapist's bookings counted");
eq(countLine({ from: "2026-10-12", therapists: [{ id: "t", name: "x", appointments: [appt({})] }] }), "1 treatment on 12 Oct 2026.", "one");
eq(countLine({ from: "2026-10-12", therapists: [{ id: "t", name: "x", appointments: [] }] }), "Nothing booked on 12 Oct 2026.", "none");
eq(bandWords(diary.therapists[1]!), "2 today", "a therapist's band");
eq(bandWords(diary.therapists[2]!), "nothing booked", "a free therapist is drawn, not dropped");

/* ── What a row offers: the server's facts, never a role ── */
eq(actsOf(appt({})), { pill: null, unpriced: false, cancel: true, charge: true }, "booked and priced: both");
eq(actsOf(appt({ amount: null })), { pill: null, unpriced: true, cancel: true, charge: false }, "unpriced: never charged, says why");
eq(actsOf(appt({ amount: 0 })), { pill: null, unpriced: false, cancel: true, charge: true }, "free (0) is a price, and may be closed");
eq(actsOf(appt({ status: "completed", settlement: "room" })), { pill: { label: "On the room", tone: "info" }, unpriced: false, cancel: false, charge: false }, "on the room: nothing more");
eq(actsOf(appt({ status: "completed", settlement: "spa", amount: null })).pill, { label: "Paid at the spa", tone: "success" }, "paid at the spa");
eq(actsOf(appt({ status: "completed", settlement: "elsewhere" })).pill, null, "a settlement it does not know: no pill");
eq(whatAndWhen(appt({})), "Aromatherapy massage for Vikram Desai at 4:00 PM", "the dialog's line");
eq(whatAndWhen(appt({ treatment: null, guestName: null })), "The treatment for the guest at 4:00 PM", "names not sent");
eq(chargedWords(appt({})), "Charged to room 202.", "the toast");
eq(chargedWords(appt({ room: null })), "Charged to the guest's bill.", "no room yet");

/* ── Figures: the server's, never rounded, a dash for "none" ── */
eq(rupees(2500), "₹2,500", "a whole price as the web writes it");
eq(rupees(1250.5), "₹1,250.50", "paise kept, never rounded to ₹1,251");
eq(rupees(150000), "₹1,50,000", "Indian grouping");
eq(rupees(0), "₹0", "free is a price");
eq(rupees(null), DASH, "unpriced is a dash, never ₹0");
eq(rupees(Number.NaN), DASH, "unreadable is a dash");
eq(treatmentWords({ name: "Head massage", minutes: 30, price: null }), "Head massage · 30 min · unpriced", "an unpriced option says so");
eq(treatmentWords({ name: "Facial", minutes: 45, price: 999.5 }), "Facial · 45 min · ₹999.50", "a priced option");

/* ── Taking a booking ── */
const stays = [
  { id: "s3", status: "due-in", arrival: "2026-10-12", roomNumber: "", guest: "Anil Sharma" },
  { id: "s1", status: "in-house", arrival: "2026-10-09", roomNumber: "205", guest: "Priya Menon" },
  { id: "s4", status: "checked-out", arrival: "2026-10-01", roomNumber: "101", guest: "Gone" },
  { id: "s5", status: "cancelled", arrival: "2026-10-11", roomNumber: "", guest: "Never" },
  { id: "s2", status: "due-out", arrival: "2026-10-10", roomNumber: "202", guest: "Vikram Desai" },
];
eq(stayChoices(stays).map((s) => s.id), ["s1", "s2", "s3"], "here or coming, by arrival; checked out and cancelled left out");
eq(stayWords(stays[1]!), "Room 205 · Priya Menon", "a guest in the house");
eq(stayWords(stays[0]!), "Anil Sharma · arriving 12 Oct 2026", "tomorrow's arrival says when, with no room yet");

const f = { stayId: "s1", treatmentId: "tr", therapistId: "th", time: "16:00" };
eq(bookBody("2026-10-12", f), { body: { stayId: "s1", treatmentId: "tr", therapistId: "th", startsAt: "2026-10-12T16:00" } },
  "the day looked at and the time as typed, no offset, no end");
eq(bookBody("2026-10-12", { ...f, time: "930" }), { body: { stayId: "s1", treatmentId: "tr", therapistId: "th", startsAt: "2026-10-12T09:30" } }, "930 is 09:30");
eq(bookBody("2026-10-12", { ...f, stayId: "", treatmentId: "" }), { problem: "Which guest is this for?" }, "the guest first");
eq(bookBody("2026-10-12", { ...f, treatmentId: "", therapistId: "" }), { problem: "Which treatment?" }, "then the treatment");
eq(bookBody("2026-10-12", { ...f, therapistId: "", time: "" }), { problem: "Which therapist?" }, "then the therapist");
eq(bookBody("2026-10-12", { ...f, time: "" }), { problem: "What time?" }, "then the time");
eq(bookBody("2026-10-12", { ...f, time: "25:00" }), { problem: "What time?" }, "a time that is not one is not sent");

/* ── Offline: no spa path is on the web's list, so every write is refused, never held ── */
for (const [path, label] of [
  ["/api/hotels/5EL/spa/appointments", "a booking"],
  ["/api/hotels/5EL/spa/appointments/a1/cancel", "a cancellation"],
  ["/api/hotels/5EL/spa/appointments/a1/close", "a charge to the room"],
] as const) eq(ruleFor(path, "POST", "{}").tier, "refuse", `${label} is refused offline`);

/* ── Charge to room's key: kept while unknown, let go once the diary shows it ── */
let clock = 1000;
let n = 0;
const keys = chargeKeys(() => "dev-desk", () => keyKeeper({ now: () => clock, make: () => `k${++n}`, who: () => "dev-desk" }));
const path = "/api/hotels/5EL/spa/appointments/a1/close";
const first = keys.of("5EL", "a1").begin("POST", path, "{}");
keys.of("5EL", "a1").failed(first, 0);
clock = 2000;
eq(keys.of("5EL", "a1").begin("POST", path, "{}").key, first.key, "tapped again before anything is known: the same key");
keys.of("5EL", "a1").failed(first, 0);
clock = 3000;
const other: SpaDiary = { ...diary, from: "2026-10-12", therapists: [{ id: "t2", name: "Sunita Patil", appointments: [appt({ id: "a9" })] }] };
keys.seen("5EL", keys.marks("5EL"), other);
eq(keys.of("5EL", "a1").begin("POST", path, "{}").key, first.key, "a read of another day does not show it: the key is kept");
keys.of("5EL", "a1").failed(first, 0);
clock = 4000;
keys.seen("6TG", keys.marks("6TG"), { therapists: [{ id: "t", name: "x", appointments: [appt({ id: "a1" })] }] });
eq(keys.of("5EL", "a1").begin("POST", path, "{}").key, first.key, "another hotel's read never lets it go");
keys.of("5EL", "a1").failed(first, 0);
clock = 5000;
keys.seen("5EL", keys.marks("5EL"), { therapists: [{ id: "t2", name: "Sunita Patil", appointments: [appt({ id: "a1", status: "completed", settlement: "room" })] }] });
eq(keys.of("5EL", "a1").begin("POST", path, "{}").key === first.key, false, "read again and shown: a new tap is a new key");

console.log("spa diary: all checks pass");
