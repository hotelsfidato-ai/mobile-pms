import { api, ApiError, currentSubject, orNull, send } from "../../core/api";
import type { Stay } from "../../core/types";
import { chargeKeys, stayChoices, type SpaDiary, type SpaTherapist, type SpaTreatment } from "./diary";

/* ══════════════════════════════════════════════════════════════════
   THE SPA'S CALLS — the web's src/modules/spa/data/spa.ts, through the
   core only. The server is api/src/modules/spa/spa.ts; nothing is priced,
   totalled or decided here.

   READS THROW (the web's own warning): a read that failed must never draw
   "nothing booked today" at a property whose diary is full. A 403 is the
   server saying no - the spa switched off at this property, or its own
   role list - and comes back as `{ refused }` with its sentence, so the
   screen shows that and nothing else.

   WRITES go through `send`. OFFLINE: no spa path is on the web's list
   (src/lib/offline.ts), so `send` refuses every one with the web's
   UNLISTED sentence and nothing is held (diary.check.ts holds it). A
   refusal is the server's own words: 403 "you may not", 409 "that cannot
   be done" (the therapist busy, the guest not here that day, no spa tax
   rule, not checked in yet), both shown as they come.
   ══════════════════════════════════════════════════════════════════ */

const at = (code: string) => `/api/hotels/${encodeURIComponent(code)}/spa`;

export type Refused = { refused: string };
async function read<T>(path: string): Promise<T | Refused> {
  try {
    return await api<T>(path);
  } catch (e) {
    if (e instanceof ApiError && e.status === 403) return { refused: e.message };
    throw e;
  }
}
export const isRefused = (x: unknown): x is Refused => typeof x === "object" && x !== null && "refused" in x;

/** One keeper per appointment for Charge to room (core/keys.ts, MFIN-1). */
const keys = chargeKeys(currentSubject);

/** One day of the diary. `day` null on the first read: the server opens it
    on the PROPERTY's business date, never a date this phone picked. */
export async function readDiary(code: string, day: string | null) {
  const marks = keys.marks(code);
  const out = await read<SpaDiary>(`${at(code)}${day ? `?from=${day}&to=${day}` : ""}`);
  if (!isRefused(out)) keys.seen(code, marks, out);
  return out;
}

/** The price list, retired ones included (only the active are offered). */
export const readTreatments = async (code: string) => {
  const out = await read<{ treatments: SpaTreatment[] }>(`${at(code)}/treatments`);
  return isRefused(out) ? out : out.treatments;
};

export const readTherapists = async (code: string) => {
  const out = await read<{ therapists: SpaTherapist[] }>(`${at(code)}/therapists`);
  return isRefused(out) ? out : out.therapists;
};

/** Who is here or coming, over the front desk's own door (GET /stays, the
    web's listStays: every booking, sliced on the device). A property the
    caller cannot see is empty, as the web's fetchStays. */
export const readStays = async (code: string) =>
  stayChoices((await orNull<Stay[]>(`/api/hotels/${encodeURIComponent(code)}/stays`)) ?? []);

/* ── Writes ── */

/** Taken by the desk, against a stay, always (D18-6). */
export const book = (code: string, body: { stayId: string; treatmentId: string; therapistId: string; startsAt: string }) =>
  send<{ ok: true; id: string }>("POST", `${at(code)}/appointments`, body);

/** A cancellation says why; the server refuses an empty one. */
export const cancel = (code: string, id: string, reason: string) =>
  send<{ ok: true; id: string }>("POST", `${at(code)}/appointments/${encodeURIComponent(id)}/cancel`, { reason });

/** The treatment was given: onto the guest's room bill, through finance's
    door (D18-22). No settlement to choose: "settled at the spa" is set aside. */
export const charge = (code: string, id: string) =>
  send<{ ok: true; id: string; postingId: string | null }>(
    "POST", `${at(code)}/appointments/${encodeURIComponent(id)}/close`, {}, keys.of(code, id),
  );
