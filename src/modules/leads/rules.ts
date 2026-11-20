import type { ExportTable } from "../../core/exportDoc.ts";
import { DASH, msAt } from "../../core/format.ts";
import { moneyPrecise } from "../front-desk/desk.ts";

/* ══════════════════════════════════════════════════════════════════
   LEADS AND WHATSAPP — the shapes, the rules and the words
   (mobile/m13-sales, 19 Nov). Ported from the web's
   src/modules/leads/pages/Leads.tsx and data/leads.ts; the server is
   api/src/modules/leads/leads.ts (GET /:code/leads[?before=],
   GET /:code/leads/:ref), gated READ_RULES GUESTS (`customer` view,
   D27-170: whoever sees guests sees leads).

   Read LIVE from the leads app every time: the PMS keeps no copy (D27-170)
   and neither does the phone beyond react-query's memory. `ref` is a token
   the server hands out (two hours, this hotel only), never the app's id,
   which holds the guest's number. NOTHING HERE WRITES: staff reply in the
   leads app, and "Book this lead" opens New booking (on the website for
   now: the phone's New booking does not read a lead yet).
   ══════════════════════════════════════════════════════════════════ */

/** data/leads.ts Lead. */
export interface Lead {
  ref: string;
  name: string | null;
  phone: string | null;
  status: string;
  category: string | null;
  channel: string;
  bookingRef: string | null;
  /** As staff typed it in the leads app when they marked it booked. */
  bookingValue: number | null;
  doNotContact: boolean;
  receivedAt: string | null;
  lastMessageAt: string | null;
  lastMessage: string | null;
}

/** data/leads.ts LeadsPage. */
export interface LeadsPage {
  /** False until the owner's settings are on the server (OWNER-STEPS.md). */
  connected: boolean;
  /** False when this property is not one of the leads app's hotels. */
  inApp: boolean;
  leads: Lead[];
  /** Where the next, older page starts; null when there is none. */
  more: string | null;
}

export interface Message { direction: "in" | "out"; kind: string; body: string; at: string | null }
export interface Conversation { messages: Message[]; replyUrl: string | null }

/* ── The leads app's own words (its leads/model.js and leads/marketing.js) ── */

export const STATUS_LABELS: Readonly<Record<string, string>> = {
  NEW: "New", ASSIGNED: "Assigned", CLAIMED: "Claimed", CONTACTED: "Contacted",
  FOLLOW_UP: "Follow-up", QUOTED: "Quoted", BOOKED: "Booked", LOST: "Lost",
  LONG_TERM: "Long term", DEAD: "Dead", OVERDUE: "Overdue", CLOSED: "Closed",
};
export const CHANNEL_LABELS: Readonly<Record<string, string>> = {
  meta_ads: "Meta Ads", google_ads: "Google Ads", website: "Website organic",
  direct_whatsapp: "Direct WhatsApp", referral: "Referral", walk_in_phone: "Walk-in or phone",
  manual: "Manual entry", other: "Other",
};
export const statusWord = (s: string) => STATUS_LABELS[s] ?? s;
export const channelWord = (ch: string) => CHANNEL_LABELS[ch] ?? ch;

/** Leads.tsx OPEN and TONE. */
const OPEN = new Set(["NEW", "ASSIGNED", "CLAIMED", "OVERDUE", "CONTACTED", "FOLLOW_UP", "QUOTED"]);
export type LeadTone = "neutral" | "info" | "success" | "warning" | "accent";
const TONE: Record<string, LeadTone> = {
  NEW: "accent", OVERDUE: "accent", ASSIGNED: "info", CLAIMED: "info", CONTACTED: "info",
  FOLLOW_UP: "warning", QUOTED: "info", BOOKED: "success", LONG_TERM: "neutral",
  LOST: "neutral", DEAD: "neutral", CLOSED: "neutral",
};
export const toneOf = (status: string): LeadTone => TONE[status] ?? "neutral";

/* ── The chips and the list: counts of what was READ so far, as the web ── */

export interface Chip { key: string; label: string; n: number }
/** All, Open, then each status present, in the app's order. */
export function chipsOf(leads: readonly Lead[]): Chip[] {
  const counts = new Map<string, number>();
  for (const l of leads) counts.set(l.status, (counts.get(l.status) ?? 0) + 1);
  return [
    { key: "all", label: "All", n: leads.length },
    { key: "open", label: "Open", n: leads.filter((l) => OPEN.has(l.status)).length },
    ...Object.keys(STATUS_LABELS).filter((s) => counts.has(s)).map((s) => ({ key: s, label: statusWord(s), n: counts.get(s)! })),
  ];
}
export function shownOf(leads: readonly Lead[], filter: string): Lead[] {
  if (filter === "all") return [...leads];
  if (filter === "open") return leads.filter((l) => OPEN.has(l.status));
  return leads.filter((l) => l.status === filter);
}

/** A lead's name, else its phone, else a dash. */
export const leadTitle = (l: Pick<Lead, "name" | "phone">) => l.name ?? l.phone ?? DASH;

/** The web's `phone`: "+91 98200 11111" for a ten-digit or 91-prefixed number, else as sent. */
export function phoneWords(value: string): string {
  const d = value.replace(/\D/g, "");
  if (d.length === 12 && d.startsWith("91")) return `+91 ${d.slice(2, 7)} ${d.slice(7)}`;
  if (d.length === 10) return `+91 ${d.slice(0, 5)} ${d.slice(5)}`;
  return value;
}

/** The panel's line under the name: "+91 98200 11111 · Meta Ads". */
export const leadLine = (l: Pick<Lead, "phone" | "channel">) =>
  [l.phone && phoneWords(l.phone), channelWord(l.channel)].filter(Boolean).join(" · ");

const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** The web's dateTime ("18 Nov 2026, 3:35 PM") of an instant the leads app sent, on the phone's clock
    as the web's is on the browser's. Through the one ISO conversion (MEMORY 7); unreadable is a dash. */
export function when(v: string | null | undefined): string {
  const ms = msAt(v);
  if (ms === null) return DASH;
  const d = new Date(ms);
  const h = d.getHours();
  return `${d.getDate()} ${MON[d.getMonth()]} ${d.getFullYear()}, ${h % 12 || 12}:${String(d.getMinutes()).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}

/** "Value typed there": as staff typed it, paise kept (MEMORY 9); none is a dash. */
export const valueWords = (v: number | null) => (v === null ? DASH : moneyPrecise(v));

/** A message's words: its text, else "(image)" for what is not text; an empty text is a dash. */
export const messageWords = (m: Pick<Message, "body" | "kind">) => m.body || (m.kind === "text" ? DASH : `(${m.kind})`);
export const messageFoot = (m: Pick<Message, "direction" | "at">) => `${m.direction === "in" ? "Guest" : "Hotel"} · ${when(m.at)}`;

/** Leads.tsx sentenceOf: the cap (429) or the app refusing (502) is the server's own sentence, said
    as a state, not as a failure; anything else is a failed read. */
export const sentenceOf = (status: number | undefined, words: string) => (status === 429 || status === 502 ? words : null);

/* ── The words ───────────────────────────────────────────────────── */

export const TITLE = "Leads and WhatsApp";
export const UNDER = "Enquiries from the leads app, read as you open this page. Staff reply in the leads app.";
export const NOT_CONNECTED = {
  title: "Not connected yet",
  line: "The leads app is read with a read-only login the owner sets up on the server. Until then nothing is read and nothing is shown here.",
};
export const NOT_IN_APP = {
  title: "This property is not in the leads app",
  line: "The leads app has no hotel matched to this property, so it has no enquiries to show here.",
};
export const NOT_READ = "The leads app was not read";
export const emptyOf = (none: boolean) => (none
  ? { title: "No enquiries yet", line: "Enquiries arrive in the leads app from WhatsApp, the website and ads, and show here." }
  : { title: "None with this status", line: "Choose another status above." });
export const NO_CONTACT = "The guest asked not to be messaged. The leads app refuses replies to them.";
export const NEXT_FAILED = "The next enquiries did not load. Try again.";
export const NO_MESSAGES = "No messages in this enquiry.";

/** Leads.tsx LEAD_EXPORT: the leads read so far, as the list shows them. */
export const leadsTable = (leads: readonly Lead[], showing: string): ExportTable => ({
  title: TITLE,
  subtitle: `Showing ${showing}`,
  columns: ["Lead", "Name", "Phone", "Status", "Category", "Came from", "Received", "Last message", "Booking", "Booking value", "Do not contact"],
  rows: leads.map((l) => [
    l.ref, l.name ?? DASH, l.phone ?? DASH, statusWord(l.status), l.category ?? DASH, channelWord(l.channel),
    when(l.receivedAt), when(l.lastMessageAt), l.bookingRef ?? DASH, valueWords(l.bookingValue), l.doNotContact ? "Yes" : "No",
  ]),
});
export const showingWords = (filter: string) => (filter === "all" ? "all read so far" : filter === "open" ? "open" : statusWord(filter));
