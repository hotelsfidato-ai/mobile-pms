/* ══════════════════════════════════════════════════════════════════
   CRS BOOKINGS' RULES — ported by hand from the PMS's
   src/modules/crs/pages/CrsBookings.tsx (OUTCOME 32-36, ANSWER 38-43,
   STAY_WORDS 45-53, Connection 55-75, the columns 214-280) and the shapes
   of src/modules/crs/data/crs.ts (11-46), trimmed to what the phone draws.

   The PMS only ever READS the CRS; this page shows what the reader did with
   each booking the CRS sold, and a change made in the CRS afterwards as a
   note with Done. Nothing here accepts, declines or prices a booking: a
   waiting booking is confirmed where every booking is (the front desk).
   NO MONEY: the server's answer carries no rate and no deposit, so the
   phone draws none.

   Pure: no React Native here, so `bookings.check.ts` runs under node.
   ══════════════════════════════════════════════════════════════════ */

import { DASH, instant } from "../../core/format.ts";

/** data/crs.ts CrsBooking, as GET /crs/bookings answers (api/src/modules/crs/routes.ts 60-87). */
export interface CrsBooking {
  /** The CRS's document id: the key that never repeats. */
  crsId: string;
  /** The CRS's booking number (FH-2026-00042). It can repeat. */
  crsReference: string;
  salesperson: string | null;
  company: string | null;
  guestName: string | null;
  /** Dates (`date::text`): "2026-10-11". */
  checkIn: string | null;
  checkOut: string | null;
  crsStatus: string;
  /** booked · full · needs_attention */
  outcome: string;
  reason: string | null;
  readAt: string;
  changeNote: string | null;
  changedAt: string | null;
  changeDone: boolean;
  /** confirmed · refused · full · partly, once the register was told. */
  answer: string | null;
  answerError: string | null;
  /** The reservations it became, with their own references and states. */
  bookings: Array<{ id: string; reference: string; status: string }>;
}

export interface CrsConnection {
  /** The CRS settings are on the server (never their values). */
  settingsPresent: boolean;
  mapped: boolean;
  on: boolean;
  /** Postgres's text (`timestamptz::text`): through instant() first (MEMORY 7). */
  lastReadAt: string | null;
  lastError: string | null;
}

export interface CrsBookings { connection: CrsConnection; bookings: CrsBooking[] }

/** data/crs.ts CrsSetup, GET /crs/setup (api/src/modules/crs/setup.ts 56-86). */
export interface CrsSetup {
  crsHotelId: string | null;
  bookingSourceId: string | null;
  isOn: boolean;
  connectedAt: string | null;
  readsAs: string | null;
  roomTypes: Array<{ crsRoomTypeId: string; roomTypeId: string }>;
  hotelRoomTypes: Array<{ id: string; name: string }>;
  sources: Array<{ id: string; name: string }>;
}

/** What PUT /crs/setup takes: the web's form, sent as it stands (the server trims and checks). */
export interface SetupForm {
  crsHotelId: string;
  bookingSourceId: string;
  isOn: boolean;
  roomTypes: Array<{ crsRoomTypeId: string; roomTypeId: string }>;
}

export type Tone = "info" | "danger" | "warning" | "neutral";

/* ── The words (CrsBookings.tsx 32-53) ──────────────────────────── */

const OUTCOME: Record<string, { words: string; tone: Tone }> = {
  booked: { words: "Booked here", tone: "info" },
  full: { words: "Hotel full - not booked", tone: "danger" },
  needs_attention: { words: "Needs attention", tone: "warning" },
};

const ANSWER: Record<string, string> = {
  confirmed: "Told: confirmed",
  refused: "Told: refused",
  full: "Told: hotel full",
  partly: "Told: partly confirmed",
};

const STAY_WORDS: Record<string, string> = {
  tentative: "Waiting for the hotel",
  confirmed: "Confirmed",
  checked_in: "In house",
  checked_out: "Checked out",
  cancelled: "Cancelled",
  void: "Void",
  no_show: "No show",
};

/** The "Here" pill: the web's words and tone; an outcome it does not know, as the server wrote it. */
export const outcomeOf = (outcome: string): { words: string; tone: Tone } =>
  OUTCOME[outcome] ?? { words: outcome, tone: "neutral" };

/** "PMS-1042 · Waiting for the hotel", one line per booking it became. */
export const stayLines = (b: CrsBooking): string[] =>
  b.bookings.map((s) => `${s.reference} · ${STAY_WORDS[s.status] ?? s.status}`);

/** "The CRS register": what it was told, why it was not, or a dash. */
export function toldOf(b: CrsBooking): { text: string; bad: boolean } {
  if (b.answer) return { text: ANSWER[b.answer] ?? b.answer, bad: false };
  if (b.answerError) return { text: `Not told: ${b.answerError}`, bad: true };
  return { text: DASH, bad: false };
}

/** "Changed in the CRS": nothing, a note still to act on, or one done. */
export type NoteState = { kind: "none" } | { kind: "open"; note: string } | { kind: "done"; note: string };
export const noteOf = (b: CrsBooking): NoteState =>
  !b.changeNote ? { kind: "none" } : b.changeDone ? { kind: "done", note: b.changeNote } : { kind: "open", note: b.changeNote };

/** What the line above the list says (Connection, 55-75): a warning, the last read, or nothing. */
export function connectionOf(c: CrsConnection, offsetMinutes?: number): { warn: boolean; text: string } | null {
  const why = !c.settingsPresent
    ? "The CRS login is not in the server's settings yet, so nothing is read."
    : !c.mapped ? "This hotel is not connected to the CRS yet."
    : !c.on ? "Reading from the CRS is switched off for this hotel."
    : null;
  if (!why && !c.lastError) {
    return c.lastReadAt ? { warn: false, text: `Last read from the CRS ${dateTime(c.lastReadAt, offsetMinutes)}.` } : null;
  }
  return { warn: true, text: why ?? `The last read from the CRS failed: ${c.lastError}` };
}

/* ── Dates, as the web writes them (src/lib/format.ts 131, 146) ─── */

const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "11 Oct 2026" (the web's dateShort, "d MMM yyyy"); a dash for a date not held. */
export function dayYear(date: string | null | undefined): string {
  if (!date || !/^\d{4}-\d{2}-\d{2}/.test(date)) return DASH;
  return `${Number(date.slice(8, 10))} ${MON[Number(date.slice(5, 7)) - 1]} ${date.slice(0, 4)}`;
}

/** The Stay column: "11 Oct 2026 to 13 Oct 2026", each side a dash when not held. */
export const stayOf = (b: CrsBooking) => `${dayYear(b.checkIn)} to ${dayYear(b.checkOut)}`;

/** "31 Oct 2026, 7:35 AM" (the web's dateTime, on the phone's own clock as the
    browser's): a server time through instant() first (MEMORY 7); a dash when
    none or unreadable. `offsetMinutes` (east of UTC) for the check only. */
export function dateTime(text: string | null | undefined, offsetMinutes?: number): string {
  if (!text) return DASH;
  const ms = Date.parse(instant(text));
  if (Number.isNaN(ms)) return DASH;
  const d = new Date(ms + (offsetMinutes ?? -new Date(ms).getTimezoneOffset()) * 60_000);
  const h = d.getUTCHours(), m = d.getUTCMinutes();
  return `${d.getUTCDate()} ${MON[d.getUTCMonth()]} ${d.getUTCFullYear()}, ${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}

/* ── The connection card's form (Setup, 77-196) ─────────────────── */

/** The form as the web first fills it from the server (85-94). */
export const formOf = (s: CrsSetup): SetupForm => ({
  crsHotelId: s.crsHotelId ?? "",
  bookingSourceId: s.bookingSourceId ?? "",
  isOn: s.isOn,
  roomTypes: s.roomTypes.map((r) => ({ ...r })),
});

/** The web's "Reads as …" line (183-185). */
export const readsAsLine = (readsAs: string | null) =>
  readsAs
    ? `Reads as ${readsAs}.`
    : "No service account to read as yet: it is set up at go-live, and nothing is read until it is.";

/* ── What a write's failure says (the web's toasts, MEMORY 16) ──── */

/** The web's words when a write fails: the server's sentence, else its own
    fallback; and when nothing came back (or a 5xx), that it is not known. */
export function failedWords(
  what: "done" | "saved", e: { message: string } | null, unknown: boolean, fromServer: boolean,
): { title: string; body?: string } {
  if (unknown) {
    return {
      title: what === "done" ? "Not known whether it was marked done." : "Not known whether the connection was saved.",
      body: what === "done"
        ? `${e?.message ?? ""} Read again below: a note still standing was not marked.`.trim()
        : `${e?.message ?? ""} Saving again is safe: it sends the whole connection as it stands here.`.trim(),
    };
  }
  if (fromServer && e) return { title: e.message };
  return { title: what === "done" ? "Not marked done." : "Not saved." };
}

/* ── The front door: a booking's CRS facts (the web's CrsFacts.tsx) ─ */

/** For the screen that owns a booking's panel (the front desk places it, as
    on the web's StayDrawer): "CRS FH-2026-00042 · sold by Asha · no company",
    and a change made in the CRS not yet done. Null for a booking the CRS did
    not sell, so the panel draws nothing. */
export function factsOf(answer: CrsBookings | undefined): { line: string; change: string | null } | null {
  const b = answer?.bookings[0];
  if (!b) return null;
  return {
    line: `CRS ${b.crsReference} · sold by ${b.salesperson ?? DASH} · ${b.company ?? "no company"}`,
    change: b.changeNote && !b.changeDone ? `Changed in the CRS: ${b.changeNote}` : null,
  };
}
