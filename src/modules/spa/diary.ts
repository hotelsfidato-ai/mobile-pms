/* ══════════════════════════════════════════════════════════════════
   THE SPA DIARY'S RULES ON A PHONE — ported by hand from the web's
   src/modules/spa/data/spa.ts (the shapes; clockTime 103-109, clockDate
   112-118, shiftDay 123-127) and pages/SpaDiary.tsx (the count line
   107-111, SETTLEMENT 49-52, TherapistDay 211-285, BookDialog's checks
   337-342, its guest list 312-315 and options 380-390, the treatment
   option 405-408). The server is api/src/modules/spa/spa.ts; every shape
   is its answer.

   NULL IS A REAL ANSWER. A treatment nobody priced is `price: null`, and a
   booking taken for it `amount: null`: a dash, never ₹0, and it cannot be
   charged to a room (the server refuses; the web leaves the button out and
   says why). 0 is a price (ticked Free, D27-120). Nothing here totals
   money: the diary has no total, and the amount is the server's
   `agreed_amount`, shown as it was sent.

   A TIME BELONGS TO THE PROPERTY. The diary's times are
   "YYYY-MM-DDTHH:MM" on the hotel's clock (app.hotel_clock), no zone: read
   as text, never through `Date` (MEMORY 7; the web's own reason, BQ-8).

   Pure: no React Native, so diary.check.ts runs under node.
   ══════════════════════════════════════════════════════════════════ */

import { DASH } from "../../core/format.ts";
import { keyKeeper, type KeyKeeper } from "../../core/keys.ts";
import { timeOf } from "../guest-services/rules.ts";

/* ── The shapes (data/spa.ts) ─────────────────────────────────────── */

export interface SpaTreatment {
  id: string;
  name: string;
  minutes: number;
  /** Null: nobody has priced it - a dash, never 0. */
  price: number | null;
  isActive: boolean;
  notes: string | null;
}

export interface SpaTherapist { id: string; name: string; isActive: boolean }

export interface SpaAppointment {
  id: string;
  /** "booked" or "completed"; the diary leaves cancelled ones out (app.spa_diary). */
  status: string;
  /** "YYYY-MM-DDTHH:MM" on the PROPERTY's clock. Read it, never parse it. */
  startsAt: string;
  endsAt: string;
  treatment: string | null;
  minutes: number | null;
  guestName: string | null;
  room: string | null;
  /** What was agreed when it was booked. Null is unpriced. */
  amount: number | null;
  /** "room" or "spa" once it is closed; null while it is still to happen. */
  settlement: string | null;
}

export interface SpaDiaryTherapist {
  id: string;
  name: string;
  /** Empty for a therapist with nothing booked: "Free all day" is an answer. */
  appointments: SpaAppointment[];
}

export interface SpaDiary { businessDate: string; from: string; to: string; therapists: SpaDiaryTherapist[] }

/* ── The property's clock, read as text (data/spa.ts) ─────────────── */

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "…T16:00" at the hotel → "4:00 PM"; anything else a dash. */
export function clockTime(at: string | null | undefined): string {
  if (!at || at.length < 16) return DASH;
  const hours = Number(at.slice(11, 13));
  const minutes = at.slice(14, 16);
  if (!Number.isInteger(hours) || hours < 0 || hours > 23) return DASH;
  return `${hours % 12 === 0 ? 12 : hours % 12}:${minutes} ${hours < 12 ? "AM" : "PM"}`;
}

/** "2026-10-11" → "11 Oct 2026". Takes a diary time or a bare date. */
export function clockDate(on: string | null | undefined): string {
  if (!on || on.length < 10) return DASH;
  const month = MONTHS[Number(on.slice(5, 7)) - 1];
  const day = Number(on.slice(8, 10));
  if (!month || !Number.isInteger(day)) return DASH;
  return `${day} ${month} ${on.slice(0, 4)}`;
}

/** The day before or after, in UTC arithmetic only (a local midnight's
    toISOString hands back the day before east of Greenwich). */
export function shiftDay(on: string, days: number): string {
  const at = new Date(Date.UTC(Number(on.slice(0, 4)), Number(on.slice(5, 7)) - 1, Number(on.slice(8, 10)) + days));
  return Number.isNaN(at.getTime()) ? on : at.toISOString().slice(0, 10);
}

/* ── The page (SpaDiary.tsx) ──────────────────────────────────────── */

/** Under the title: "2 treatments on 11 Oct 2026." - a count of what the
    server sent, never money. */
export function countLine(d: Pick<SpaDiary, "from" | "therapists">): string {
  const booked = d.therapists.reduce((n, t) => n + t.appointments.length, 0);
  return booked === 0
    ? `Nothing booked on ${clockDate(d.from)}.`
    : `${booked} ${booked === 1 ? "treatment" : "treatments"} on ${clockDate(d.from)}.`;
}

/** The band over a therapist's day: "1 today", or "nothing booked". The
    web says "today" on every day it shows; kept as its words. */
export const bandWords = (t: SpaDiaryTherapist) =>
  t.appointments.length === 0 ? "nothing booked" : `${t.appointments.length} today`;

/** How it was closed (D18-6); nothing while it is still to happen. */
export const SETTLEMENT: Readonly<Record<string, { label: string; tone: "info" | "success" }>> = {
  room: { label: "On the room", tone: "info" },
  spa: { label: "Paid at the spa", tone: "success" },
};

export const UNPRICED_LINE = "Unpriced - it cannot be closed for money. A price added to the treatment later applies "
  + "to new bookings only: cancel this one and book it again.";

/** What a row offers, by the SERVER's facts on it (TherapistDay): Cancel
    and Charge to room only while it is booked; Charge to room never for an
    unpriced one (the web leaves it out, and the unpriced line says why).
    Who may is roles.ts: a role the API refuses sees them grey. */
export function actsOf(a: Pick<SpaAppointment, "status" | "amount" | "settlement">) {
  const booked = a.status === "booked";
  return {
    pill: a.settlement ? SETTLEMENT[a.settlement] ?? null : null,
    unpriced: a.amount === null,
    cancel: booked,
    charge: booked && a.amount !== null,
  };
}

/** "Head massage for Priya Menon at 11:00 AM" (CancelDialog, CloseDialog). */
export const whatAndWhen = (a: Pick<SpaAppointment, "treatment" | "guestName" | "startsAt">) =>
  `${a.treatment ?? "The treatment"} for ${a.guestName ?? "the guest"} at ${clockTime(a.startsAt)}`;

/** The toast after Charge to room. */
export const chargedWords = (a: Pick<SpaAppointment, "room">) =>
  a.room ? `Charged to room ${a.room}.` : "Charged to the guest's bill.";

/* ── Taking a booking (BookDialog) ────────────────────────────────── */

/** Who is here or coming: the front desk's own list (GET /stays), due in,
    in house or due out, by arrival - not "in house" only: the server takes
    a booking for tomorrow's arrival (the web's own note). */
export function stayChoices<S extends { status: string; arrival: string }>(stays: readonly S[]): S[] {
  return stays
    .filter((s) => s.status === "due-in" || s.status === "in-house" || s.status === "due-out")
    .sort((a, b) => a.arrival.localeCompare(b.arrival));
}

/** "Room 205 · Priya Menon", and a booking still to arrive says when. */
export const stayWords = (s: { roomNumber: string; guest: string; status: string; arrival: string }) =>
  `${s.roomNumber ? `Room ${s.roomNumber} · ` : ""}${s.guest}${s.status === "due-in" ? ` · arriving ${clockDate(s.arrival)}` : ""}`;

/** "Aromatherapy massage · 60 min · ₹2,500", or "· unpriced". */
export const treatmentWords = (t: Pick<SpaTreatment, "name" | "minutes" | "price">) =>
  `${t.name} · ${t.minutes} min · ${t.price === null ? "unpriced" : rupees(t.price)}`;

/** The four answers in the web's order, each with its sentence (the
    server's own words too). The time is typed on the property's clock and
    sent as typed with the day being looked at - "2026-10-11T16:00", no
    offset; the length comes from the treatment, so nothing asks when it ends. */
export function bookBody(
  day: string, f: { stayId: string; treatmentId: string; therapistId: string; time: string },
): { problem: string } | { body: { stayId: string; treatmentId: string; therapistId: string; startsAt: string } } {
  if (!f.stayId) return { problem: "Which guest is this for?" };
  if (!f.treatmentId) return { problem: "Which treatment?" };
  if (!f.therapistId) return { problem: "Which therapist?" };
  const at = timeOf(f.time);
  if (!at) return { problem: "What time?" };
  return { body: { stayId: f.stayId, treatmentId: f.treatmentId, therapistId: f.therapistId, startsAt: `${day}T${at}` } };
}

/* ── Figures ──────────────────────────────────────────────────────── */

const whole = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const paise = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2, maximumFractionDigits: 2 });
/** The server's figure as it sent it: "₹2,500" as the web's money() writes a
    whole one, "₹1,250.50" where it carries paise (the web's would round:
    MEMORY 9). Not sent or unpriced: a dash. */
export const rupees = (n: number | null | undefined) =>
  n == null || !Number.isFinite(n) ? DASH : Number.isInteger(n) ? whole.format(n) : paise.format(n);

/* ── One key per Charge to room while its outcome is unknown ──────────
   core/keys.ts (MFIN-1, MEMORY 13): a keeper per appointment. A diary read
   that began after a charge failed, and that SHOWS that appointment, lets
   its key go - the person now sees whether it is on the bill. A read of
   another day does not show it, so it keeps the key. */
export function chargeKeys(who: () => string = () => "", make?: () => KeyKeeper) {
  const keepers = new Map<string, KeyKeeper>();
  const name = (code: string, id: string) => `${code}/${id}`;
  return {
    of(code: string, id: string): KeyKeeper {
      let k = keepers.get(name(code, id));
      if (!k) { k = make ? make() : keyKeeper({ who }); keepers.set(name(code, id), k); }
      return k;
    },
    /** Before a diary read: each of this hotel's keepers' clock. */
    marks(code: string): Map<string, number> {
      const out = new Map<string, number>();
      for (const [n, k] of keepers) if (n.startsWith(`${code}/`)) out.set(n, k.mark());
      return out;
    },
    /** The read came back: forget what it showed. */
    seen(code: string, marks: Map<string, number>, diary: Pick<SpaDiary, "therapists">) {
      for (const t of diary.therapists) {
        for (const a of t.appointments) {
          const n = name(code, a.id);
          const m = marks.get(n);
          if (m !== undefined) keepers.get(n)?.seen(m);
        }
      }
    },
  };
}
