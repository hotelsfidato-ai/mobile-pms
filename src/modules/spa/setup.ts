/* ══════════════════════════════════════════════════════════════════
   TREATMENTS AND THERAPISTS' RULES ON A PHONE (lane U, 19 Nov) — ported by
   hand from the web's src/modules/spa/pages/SpaSetup.tsx (a row's words,
   TreatmentDialog's and TherapistDialog's checks and bodies, the toasts,
   TREATMENT_EXPORT's columns) and data/spa.ts (the shapes, in ./diary.ts).
   The server is api/src/modules/spa/spa.ts lines 160-395 (GET, POST,
   PATCH /treatments; GET, POST, PATCH /therapists), its own role lists
   (SPA_READ_ROLES, SPA_LIST_ROLES: ./roles.ts) and its own refusals.

   NO TREATMENT IS SHIPPED and NO PRICE IS INVENTED: an empty price box is
   null - unpriced, "-", never ₹0 - and emptying a priced one takes it back
   to unpriced. 0 only with Free ticked (D27-120). A figure is sent as typed.

   NOTHING IS DELETED: a treatment or a therapist leaves by being taken off
   the list, and comes back the same way. Taking off asks first (M-13).

   Pure: no React Native, so setup.check.ts runs under node.
   ══════════════════════════════════════════════════════════════════ */

import { DASH } from "../../core/format.ts";
import { rupees, type SpaTherapist, type SpaTreatment } from "./diary.ts";

/* ── A row (SpaSetup.tsx) ─────────────────────────────────────── */

/** The price at the row's right: a dash, never ₹0 for unpriced; 0 is a price. */
export const priceWords = (price: number | null) => (price === null ? DASH : rupees(price));

/** The toggle's words, a treatment's and a therapist's alike. */
export const listAct = (isActive: boolean) => (isActive ? "Take off the list" : "Put back on the list");

/* ── Add a treatment, change one (TreatmentDialog) ────────────── */

export interface TreatmentDraft { name: string; minutes: string; price: string; free: boolean }
export interface TreatmentInput { name: string; minutes: number; price: number | null; free: boolean }

/** A treatment opened to change: an unpriced one opens EMPTY, a free one ticked. */
export function treatmentDraft(t: SpaTreatment | null): TreatmentDraft {
  return {
    name: t?.name ?? "", minutes: t ? String(t.minutes) : "",
    price: t?.price === null || t?.price === undefined ? "" : String(t.price), free: t?.price === 0,
  };
}

export const NO_NAME = "A treatment needs a name.";
export const NO_LENGTH = "How long does it take? The diary places a booking by its length.";
export const BAD_PRICE = "A price is a figure, and it cannot be less than nothing.";

/** The web's three checks, in its order, then the body; `problem` is the sentence to show.
    The length is whole minutes: the server stores it as a whole number (spa.ts `$6::int`). */
export function treatmentBody(d: TreatmentDraft): { body: TreatmentInput } | { problem: string } {
  if (!d.name.trim()) return { problem: NO_NAME };
  const minutes = Number(d.minutes);
  if (!d.minutes.trim() || !Number.isInteger(minutes) || minutes <= 0) return { problem: NO_LENGTH };
  const price = d.price.trim() === "" ? null : Number(d.price);
  if (price !== null && !(price >= 0)) return { problem: BAD_PRICE };
  return { body: { name: d.name.trim(), minutes, price, free: d.free } };
}

/** What the web says once it is saved (its toast). */
export const treatmentDone = (name: string, changed: boolean) => (changed ? `${name} is changed.` : `${name} is on the list.`);

/* ── Add a therapist (TherapistDialog) ────────────────────────── */

export const NO_THERAPIST = "A therapist needs a name.";
export const therapistBody = (name: string): { body: { name: string } } | { problem: string } =>
  name.trim() ? { body: { name: name.trim() } } : { problem: NO_THERAPIST };

/* ── Taking off the list: asked first, in the web's words for what it keeps ── */

export const treatmentOff = (t: Pick<SpaTreatment, "name">) => ({
  title: `Take ${t.name} off the list?`,
  body: "It is not offered for new bookings. Nothing is deleted: a booking that already happened still names what it was, and it can be put back on the list.",
});
export const therapistOff = (t: Pick<SpaTherapist, "name">) => ({
  title: `Take ${t.name} off the list?`,
  body: "They are not booked from now. Their past appointments stay exactly as they were, and they can be put back on the list.",
});

/* ── The export (TREATMENT_EXPORT, D27-383): what the list shows, every row ── */

export const TREATMENT_COLUMNS = ["Treatment", "Minutes", "Price", "Offered", "Notes"] as const;
export const treatmentRows = (list: readonly SpaTreatment[]) =>
  list.map((t) => [t.name, String(t.minutes), priceWords(t.price), t.isActive ? "Yes" : "No", t.notes ?? DASH]);
