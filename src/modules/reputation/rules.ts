/* ══════════════════════════════════════════════════════════════════
   REVIEWS' SHAPES, WORDS AND RULES — ported from the web, each with its
   source; nothing here is the phone's own unless it says so.
     src/modules/reputation/data/reputation.ts   the shapes (Departure, ReviewsPage)
     src/modules/reputation/pages/Reviews.tsx    what the screen offers and says
     src/lib/format.ts dateShort ("d MMM yyyy"), dateTime ("d MMM yyyy, h:mm a"), NO_DATE "-"

   NOTHING COMES BACK FROM GOOGLE OR THE BOOKING SITES (the owner's
   D18-14): there is no score, no average, no source and no reply in the
   system, so none is drawn here. "What came back" is the state of the ASK.
   Pure: no React Native here, so `rules.check.ts` runs under node.
   ══════════════════════════════════════════════════════════════════ */

import { DASH } from "../../core/format.ts";

/** One departure, and whether anybody asked them (data/reputation.ts Departure). */
export interface Departure {
  id: string;
  reference: string;
  /** "YYYY-MM-DD" (to_char of the booking's dates). */
  arrived: string;
  departed: string;
  guest: string;
  /** Null where the booking carries none. Never drawn: only whether there is one (DPDP: no more than the web shows). */
  phone: string | null;
  email: string | null;
  /** Null means NOBODY HAS ASKED - a dash, never "Pending". */
  askStatus: "sent" | "failed" | null;
  askChannel: "whatsapp" | "email" | null;
  /** app.hotel_clock: the PROPERTY's wall clock, "YYYY-MM-DDTHH:MI". */
  askedAt: string | null;
  askDetail: string | null;
  /** The group's lead room, null for a stay in no group (D22-10, D22-52). */
  leadId: string | null;
  /** Null where the lead is at a property this reader cannot see. */
  leadReference: string | null;
}

/** GET /api/hotels/:code/reviews (data/reputation.ts ReviewsPage). */
export interface ReviewsPage {
  link: string | null;
  linkSetAt: string | null;
  linkSetBy: string | null;
  maySetLink: boolean;
  mayAsk: boolean;
  canSend: boolean;
  notConnected: string | null;
  daysBack: number;
  departures: Departure[];
}

export type Channel = "whatsapp" | "email";

/* ── Dates, as the web writes them, read as TEXT ────────────────────
   The server sends days as "YYYY-MM-DD" and moments through
   app.hotel_clock, already on the property's own clock with no zone. So
   both are written from their digits and never pass through Date: the
   phone's own zone cannot move them, and Hermes has nothing to misread
   (MEMORY 7). The phone's own choice; the web's browser lands on the same
   words in India. */

const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "12 Oct 2026" (the web's dateShort); a dash for nothing or for what cannot be read. */
export function day(v: string | null | undefined): string {
  const m = v ? /^(\d{4})-(\d{2})-(\d{2})/.exec(v) : null;
  if (!m) return DASH;
  const month = MON[Number(m[2]) - 1];
  const date = Number(m[3]);
  return month && date >= 1 && date <= 31 ? `${date} ${month} ${m[1]}` : DASH;
}

/** "12 Oct 2026, 2:05 PM" (the web's dateTime); a dash for nothing. */
export function moment(v: string | null | undefined): string {
  const m = v ? /^(\d{4}-\d{2}-\d{2})[T ](\d{2}):(\d{2})/.exec(v) : null;
  if (!m) return DASH;
  const date = day(m[1]);
  const h = Number(m[2]);
  if (date === DASH || h > 23 || Number(m[3]) > 59) return DASH;
  return `${date}, ${h % 12 || 12}:${m[3]} ${h < 12 ? "AM" : "PM"}`;
}

/** The STAY column: "11 Oct 2026 - 12 Oct 2026". */
export const stayWords = (r: Pick<Departure, "arrived" | "departed">) => `${day(r.arrived)} - ${day(r.departed)}`;

/* ── What the screen says ───────────────────────────────────────── */

export const TITLE = "Reviews";
export const UNDER = "Ask a guest for a review after they have left, and see who has been asked.";
export const LINK_NOTE = "The address a guest is sent to leave their review.";
export const NO_LINK =
  "No review link has been set for this property, so nobody can be asked for a review yet. "
  + "This hotel's own Google review link has not been given. Nothing is sent until somebody pastes one here.";
export const departuresNote = (daysBack: number) =>
  `Guests who left in the last ${daysBack} days. A guest is asked after they have gone, never before.`;
/* The web writes 30 in the empty state, not daysBack: copied as it is. */
export const EMPTY_TITLE = "Nobody has left in the last 30 days";
export const EMPTY_LINE = "A guest can be asked for a review once they have checked out.";
export const WROTE_TITLE = "What guests wrote";
export const WROTE =
  "Reviews left on Google, TripAdvisor and the booking sites are not read into this system. "
  + "Nothing is pulled in from anywhere, so this screen can say who was asked and cannot say what they wrote. "
  + "Open the site itself to read them.";

/** The card at the top: a test hotel's sentence, else the sender's own while it is not connected, else none. */
export function topNote(page: Pick<ReviewsPage, "canSend" | "notConnected">, test: boolean, nothingSent: string): string | null {
  if (test) return nothingSent;
  return !page.canSend && page.notConnected ? page.notConnected : null;
}

/** Under the link: who set it and when, or the sentence that there is none. */
export function linkLine(page: Pick<ReviewsPage, "link" | "linkSetAt" | "linkSetBy">): string {
  if (page.link === null) return NO_LINK;
  return `Set by ${page.linkSetBy ?? DASH}${page.linkSetAt ? ` on ${moment(page.linkSetAt)}` : ""}.`;
}

/** The web's toast after a save; "" clears it (the server deletes the row). */
export const savedWords = (url: string) =>
  url.trim() === ""
    ? "The review link is cleared. Nothing will be sent until there is one."
    : "The review link is saved.";

export const askedWords = (guest: string) => `${guest} has been asked for a review.`;

/** REVIEW ASKED: a dash for nobody asked, else the web's pill. */
export function askState(r: Pick<Departure, "askStatus">): { label: string; tone: "success" | "danger" } | null {
  if (r.askStatus === null) return null;
  return r.askStatus === "sent" ? { label: "Asked", tone: "success" } : { label: "Did not go", tone: "danger" };
}

/** Reviews.tsx mayActuallySend: the two things that stop a send, asked before a button is drawn. */
export const mayActuallySend = (page: Pick<ReviewsPage, "mayAsk" | "canSend" | "link">) =>
  page.mayAsk && page.canSend && page.link !== null;

export type Offer =
  /** Not the group's lead: its note, and no button (D22-10). */
  | { kind: "group"; words: string }
  /** Nothing to offer here; the reason is said once, above (the top card, the link card, or the ask's sentence). */
  | { kind: "none" }
  /** The two ways, each on only where the booking carries an address for it. */
  | { kind: "ways"; whatsapp: boolean; email: boolean };

/** The row's last cell (Reviews.tsx, the "ask" column). `held`: a send on its
    way, or one whose outcome is not known yet (MEMORY 16) - no way takes a tap. */
export function offerFor(
  row: Pick<Departure, "id" | "leadId" | "leadReference" | "phone" | "email">,
  page: Pick<ReviewsPage, "mayAsk" | "canSend" | "link">,
  test: boolean,
  held: boolean,
): Offer {
  if (row.leadId && row.leadId !== row.id) {
    return { kind: "group", words: `The group is asked once, at ${row.leadReference ?? "its lead room"}.` };
  }
  /* In a test hotel, drawn off for whoever may ask, rather than hidden. */
  if (!mayActuallySend(page) && !(test && page.mayAsk)) return { kind: "none" };
  const off = test || held;
  return { kind: "ways", whatsapp: !off && Boolean(row.phone), email: !off && Boolean(row.email) };
}

/* ── An outcome nobody knows (BRIEF-T2, MEMORY 16) ──────────────────
   The ask's route reads no idempotency key, so a send whose reply was lost
   and tapped again could message the guest twice. The phone's own rule:
   it says so, and no way takes a tap until the list has been read again
   and the guest's row is in view. */

export const unknownAsk = (guest: string, said: string) => ({
  title: `Not known whether ${guest} was asked for a review`,
  body: `${said} Read the list again and look at ${guest}'s row before asking again.`,
});

/** A link save repeats harmlessly (the server keeps one row per property), so it only says so and reads again. */
export const unknownLink = (url: string, said: string) => ({
  title: url.trim() === "" ? "Not known whether the review link was cleared" : "Not known whether the review link was saved",
  body: `${said} The link is read again; look at it before saving again.`,
});
