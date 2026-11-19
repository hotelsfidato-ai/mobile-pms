/* Run: node --experimental-strip-types src/modules/leads/rules.check.ts
   Leads and WhatsApp (Leads.tsx): the chips count what was read, a lead's
   words, times through the one ISO conversion, the leads app's refusals said
   as states, and nothing of it writes. */
import {
  chipsOf, leadLine, leadsTable, leadTitle, messageWords, phoneWords, sentenceOf, shownOf, toneOf, valueWords, when, type Lead,
} from "./rules.ts";

const eq = (got: unknown, want: unknown, what: string) => {
  if (JSON.stringify(got) !== JSON.stringify(want)) throw new Error(`${what}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
};

const lead = (ref: string, status: string, over: Partial<Lead> = {}): Lead => ({
  ref, name: null, phone: null, status, category: null, channel: "meta_ads", bookingRef: null, bookingValue: null,
  doNotContact: false, receivedAt: null, lastMessageAt: null, lastMessage: null, ...over,
});
const read = [lead("1", "NEW"), lead("2", "BOOKED"), lead("3", "FOLLOW_UP"), lead("4", "NEW"), lead("5", "LOST")];

/* ── The chips: All, Open, then the statuses present in the app's order ── */
eq(chipsOf(read).map((c) => `${c.label} ${c.n}`), ["All 5", "Open 3", "New 2", "Follow-up 1", "Booked 1", "Lost 1"], "the chips");
eq(shownOf(read, "open").map((l) => l.ref), ["1", "3", "4"], "Open is the app's open statuses");
eq(shownOf(read, "BOOKED").map((l) => l.ref), ["2"], "one status");
eq(toneOf("OVERDUE"), "accent", "overdue stands out");
eq(toneOf("SOMETHING_NEW"), "neutral", "a status the phone does not know is grey, and its own word");

/* ── A lead's words ── */
eq(leadTitle({ name: null, phone: "9820011111" }), "9820011111", "no name: the phone");
eq(leadTitle({ name: null, phone: null }), "-", "neither: a dash");
eq(phoneWords("919820011111"), "+91 98200 11111", "91 and ten digits");
eq(phoneWords("+1 415 555 0100"), "+1 415 555 0100", "another country as sent");
eq(leadLine({ phone: "9820011111", channel: "direct_whatsapp" }), "+91 98200 11111 · Direct WhatsApp", "the panel's line");
eq(leadLine({ phone: null, channel: "odd" }), "odd", "an unknown channel in its own word");
eq(valueWords(null), "-", "no value typed is a dash, never ₹0");
eq(valueWords(12500.5).endsWith("12,500.50"), true, "paise kept (MEMORY 9)");
eq(messageWords({ body: "", kind: "image" }), "(image)", "a picture is said");
eq(messageWords({ body: "", kind: "text" }), "-", "an empty text is a dash");

/* ── Times: Hermes reads only ISO (MEMORY 7); the phone's clock, as the web's browser ── */
const tz = process.env.TZ;
process.env.TZ = "Asia/Kolkata";
const real = Date.parse;
Date.parse = (text: string) => (/^\d{4}-\d{2}-\d{2}T/.test(text) ? real(text) : NaN);
try {
  eq(when("2026-11-18T10:05:00.123Z"), "18 Nov 2026, 3:35 PM", "a Firestore instant in India");
  eq(when("2026-11-18 10:05:00.123456+00"), "18 Nov 2026, 3:35 PM", "Postgres's text through instant()");
  eq(when(null), "-", "no time is a dash");
  eq(when("yesterday"), "-", "unreadable is a dash, never NaN");
} finally { Date.parse = real; process.env.TZ = tz; }

/* ── The leads app's refusals are states, in the server's words ── */
eq(sentenceOf(429, "The leads app's free reads for today are used up."), "The leads app's free reads for today are used up.", "the cap");
eq(sentenceOf(502, "The leads app did not answer (500)."), "The leads app did not answer (500).", "the app down");
eq(sentenceOf(500, "boom"), null, "anything else is a failed read");

/* ── The export: what was read, as shown ── */
eq(leadsTable([lead("t1", "NEW", { name: "Ravi" })], "all read so far").rows[0]!.slice(0, 4), ["t1", "Ravi", "-", "New"], "a lead's row");

console.log("leads: all checks pass");
