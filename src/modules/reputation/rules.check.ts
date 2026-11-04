/* Run: node --experimental-strip-types src/modules/reputation/rules.check.ts
   What Reviews offers on each row and says above it (Reviews.tsx), the
   dates as the web writes them, and the offline tier of its two writes. */
import { ruleFor } from "../../core/offline.ts";
import { NOTHING_SENT } from "./roles.ts";
import {
  askState, day, linkLine, mayActuallySend, moment, NO_LINK, offerFor, savedWords, stayWords, topNote,
  unknownAsk, type Departure, type ReviewsPage,
} from "./rules.ts";

const eq = (got: unknown, want: unknown, what: string) => {
  if (JSON.stringify(got) !== JSON.stringify(want)) throw new Error(`${what}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
};

/* ── Dates: from the text, never moved by a zone ── */
eq(day("2026-10-12"), "12 Oct 2026", "a day, the web's d MMM yyyy (not the core's d MMM)");
eq(day("2026-09-01"), "1 Sep 2026", "no leading zero");
eq(day(null), "-", "no day is a dash");
eq(day("12/10/2026"), "-", "a shape not sent is a dash, not a guess");
eq(stayWords({ arrived: "2026-09-29", departed: "2026-10-02" }), "29 Sep 2026 - 2 Oct 2026", "the stay");
/* app.hotel_clock's "YYYY-MM-DDTHH:MI": midnight hour and noon are where a 24-hour clock goes wrong. */
eq(moment("2026-10-12T00:05"), "12 Oct 2026, 12:05 AM", "five past midnight");
eq(moment("2026-10-12T12:30"), "12 Oct 2026, 12:30 PM", "half past noon");
eq(moment("2026-10-12T23:59"), "12 Oct 2026, 11:59 PM", "a minute to midnight");
eq(moment("2026-10-12 09:07:33.2+05:30"), "12 Oct 2026, 9:07 AM", "Postgres's text: its wall clock as written");
eq(moment(null), "-", "never asked is a dash");
/* The zone of the phone must not move the property's clock: the same words under any TZ. */
const tz = process.env.TZ;
for (const zone of ["UTC", "America/Los_Angeles", "Asia/Kolkata"]) {
  process.env.TZ = zone;
  eq(moment("2026-10-12T00:05"), "12 Oct 2026, 12:05 AM", `the property's clock under ${zone}`);
}
process.env.TZ = tz;

/* ── The cards above ── */
const page = (over: Partial<ReviewsPage> = {}): ReviewsPage => ({
  link: "https://reviews.invalid/a", linkSetAt: "2026-10-01T18:40", linkSetBy: "Asha Rao",
  maySetLink: true, mayAsk: true, canSend: true, notConnected: null, daysBack: 30, departures: [], ...over,
});
const SENDER = "Sending is not set up yet.";
eq(topNote(page({ canSend: false, notConnected: SENDER }), false, NOTHING_SENT), SENDER, "the sender's own sentence while not connected");
eq(topNote(page({ canSend: false, notConnected: SENDER }), true, NOTHING_SENT), NOTHING_SENT, "a test hotel says its sentence instead");
eq(topNote(page(), false, NOTHING_SENT), null, "connected: no card");
eq(linkLine(page({ link: null, linkSetAt: null, linkSetBy: null })), NO_LINK, "no link: the sentence, never a guess");
eq(linkLine(page()), "Set by Asha Rao on 1 Oct 2026, 6:40 PM.", "who set it, on the property's clock");
eq(linkLine(page({ linkSetBy: null, linkSetAt: null })), "Set by -.", "who set it, not held: a dash");
eq(savedWords("  "), "The review link is cleared. Nothing will be sent until there is one.", "an empty box clears it");
eq(savedWords("https://x.example"), "The review link is saved.", "saved");

/* ── REVIEW ASKED ── */
eq(askState({ askStatus: null }), null, "nobody asked: a dash, not Pending");
eq(askState({ askStatus: "sent" }), { label: "Asked", tone: "success" }, "sent");
eq(askState({ askStatus: "failed" }), { label: "Did not go", tone: "danger" }, "failed");

/* ── The row's ways ── */
const row = (over: Partial<Departure> = {}): Departure => ({
  id: "r1", reference: "FH-1", arrived: "2026-10-09", departed: "2026-10-11", guest: "Tanvi Bhide",
  phone: "+91 98", email: "t@example.in", askStatus: null, askChannel: null, askedAt: null, askDetail: null,
  leadId: null, leadReference: null, ...over,
});
eq(offerFor(row(), page(), false, false), { kind: "ways", whatsapp: true, email: true }, "both ways, both held");
eq(offerFor(row({ phone: null }), page(), false, false), { kind: "ways", whatsapp: false, email: true }, "no phone: WhatsApp off");
eq(offerFor(row({ email: null }), page(), false, false), { kind: "ways", whatsapp: true, email: false }, "no email: Email off");
eq(offerFor(row(), page(), false, true), { kind: "ways", whatsapp: false, email: false }, "a send on its way, or not known: no tap");
/* A group's other rooms: the note, even where every way would be open (D22-10). */
eq(offerFor(row({ id: "r2", leadId: "r1", leadReference: "FH-1" }), page(), false, false), { kind: "group", words: "The group is asked once, at FH-1." }, "not the lead");
eq(offerFor(row({ id: "r2", leadId: "r1" }), page(), false, false), { kind: "group", words: "The group is asked once, at its lead room." }, "the lead out of sight");
eq(offerFor(row({ leadId: "r1" }), page(), false, false).kind, "ways", "the lead itself asks");
/* The two that stop a send, each drawing no button (the reason is the card above). */
eq(mayActuallySend(page({ link: null })), false, "no link, nothing sends");
eq(offerFor(row(), page({ link: null }), false, false), { kind: "none" }, "no link: no buttons");
eq(offerFor(row(), page({ canSend: false }), false, false), { kind: "none" }, "not connected: no buttons");
eq(offerFor(row(), page({ mayAsk: false }), false, false), { kind: "none" }, "may not ask: no buttons");
/* A test hotel: drawn off for whoever may ask, link or not, sender or not. */
eq(offerFor(row(), page({ link: null, canSend: false }), true, false), { kind: "ways", whatsapp: false, email: false }, "a test hotel: off, not hidden");
eq(offerFor(row(), page({ mayAsk: false }), true, false), { kind: "none" }, "a test hotel, a role that may not ask: nothing");

/* ── Not known: said, and the guest named ── */
eq(unknownAsk("Tanvi Bhide", "Could not reach the server.").title, "Not known whether Tanvi Bhide was asked for a review", "unknown, named");

/* ── Offline: neither write is on the web's list, so both are refused, never held ── */
for (const [method, path] of [["POST", "/api/hotels/5EL/reviews/abc/ask"], ["PUT", "/api/hotels/5EL/reviews/link"]] as const) {
  const rule = ruleFor(path, method, "{}");
  eq(rule.tier, "refuse", `${method} ${path} is refused offline`);
  eq(rule.reason?.startsWith("This cannot be done offline yet."), true, `${path}: the web's UNLISTED sentence`);
}

console.log("reputation rules: all checks pass");
