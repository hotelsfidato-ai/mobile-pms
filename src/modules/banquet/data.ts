import { api, ApiError, currentSubject, send } from "../../core/api";
import { keyKeeper, type KeyKeeper } from "../../core/keys";
import type { CourseInput, Diary, Fn, RegisterInput, Setup, Window } from "./rules";

/* ══════════════════════════════════════════════════════════════════
   THE BANQUET DIARY'S CALLS — the web's src/modules/banquet/data/banquet.ts,
   through the core only. The server is api/src/modules/banquet/banquet.ts;
   nothing is priced, totalled or decided here.

   THE READS THROW (the web's BQ-3): a failed read must never draw "this
   property has no banquet hall" or "No such function". A 4xx is the server
   saying no - banquet switched off here (403), the role gate (403), no such
   function (404) - and comes back as `{ refused }` with its sentence, as the
   web's readProblem reads it, so the screen shows that and nothing else.

   WRITES go through `send`, the web's tiers (core offline.ts): an ENQUIRY
   (POST /banquet/events) is held offline and sent later with the key it
   was given at the tap, which the server reads (062: one call is one
   enquiry); CONFIRMING is refused with the web's sentence (two desks
   offline could both take the hall); every other banquet path is on no
   list, so it is refused with the UNLISTED sentence and nothing is held.

   KEYS: the server reads `idempotency-key` on registering and on a payment
   (finance's takeFolioPayment); confirm, cancel, the price, catering, the
   bill, reopening and the invoice do not (checked 4 Nov; MODULE.md).
   ══════════════════════════════════════════════════════════════════ */

const at = (code: string) => `/api/hotels/${encodeURIComponent(code)}/banquet`;
const fnAt = (code: string, id: string) => `${at(code)}/events/${encodeURIComponent(id)}`;

export type Refused = { refused: string };
async function read<T>(path: string): Promise<T | Refused> {
  try {
    return await api<T>(path);
  } catch (e) {
    if (e instanceof ApiError && e.status >= 400 && e.status < 500) return { refused: e.message };
    throw e;
  }
}
export const isRefused = (x: unknown): x is Refused => typeof x === "object" && x !== null && "refused" in x;

/** The diary over a window; none named, the server's own (the business date and 30 days). */
export const readDiary = (code: string, w: Window | null) =>
  read<Diary>(`${at(code)}${w ? `?from=${w.from}&to=${w.to}` : ""}`);

/** The halls and packages, for Register and Add a course (reservation or room_config view). */
export const readSetup = (code: string) => read<Setup>(`${at(code)}/setup`);

/** One keeper per function (core/keys.ts, MFIN-1): a payment, the bill or
    the invoice tapped again after a lost reply, before the function could be
    read, keeps its key; once it is read again (readFn) the person sees what
    was made, and a repeat is a new one. */
const keepers = new Map<string, KeyKeeper>();
const keysOf = (code: string, id: string) => {
  const k = `${code}/${id}`;
  let keeper = keepers.get(k);
  if (!keeper) { keeper = keyKeeper({ who: currentSubject }); keepers.set(k, keeper); }
  return keeper;
};

export async function readFn(code: string, id: string) {
  const keys = keysOf(code, id);
  const started = keys.mark();
  const fn = await read<Fn>(fnAt(code, id));
  keys.seen(started);
  return fn;
}

/* ── Writes ── */

type Ok = { ok: true };

/** An enquiry: holds nothing. Its warning (a clash, the banquet tax unset) is the server's. */
export const register = (code: string, body: RegisterInput) =>
  send<Ok & { id: string; reference: string; warning: string | null }>("POST", `${at(code)}/events`, body);

/** Takes the hall and opens its bill; a refusal names the function in the way. */
export const confirmFn = (code: string, id: string) => send<Ok & { folioId: string }>("POST", `${fnAt(code, id)}/confirm`);

export const cancelFn = (code: string, id: string, reason: string) => send<Ok>("POST", `${fnAt(code, id)}/cancel`, { reason });

/** The hall price only, as the web's PriceDialog: present and null CLEARS it. */
export const setPrice = (code: string, id: string, body: { agreedAmount: number | null; free: boolean }) =>
  send<Ok>("PATCH", fnAt(code, id), body);

export const addCourse = (code: string, id: string, body: CourseInput) => send<Ok>("POST", `${fnAt(code, id)}/catering`, body);

export const removeCourse = (code: string, id: string, lineId: string) =>
  send<Ok>("DELETE", `${fnAt(code, id)}/catering/${encodeURIComponent(lineId)}`);

/** The hall and every course onto the bill under the Banquet GST rule; price and courses then fixed. */
export const billFn = (code: string, id: string) => send<Ok>("POST", `${fnAt(code, id)}/bill`, undefined, keysOf(code, id));

/** Takes the billed hall and courses off again, with a reason, while no tax invoice stands (D27-154). */
export const reopenFn = (code: string, id: string, reason: string) =>
  send<Ok>("POST", `${fnAt(code, id)}/reopen`, { reason }, keysOf(code, id));

export interface FnPayment { method: string; amount: number; pan?: string; form97?: boolean; heldAsCredit?: boolean }
/** An advance before the bill, or settling after it. The server reads the key: one press, one payment. */
export const payFn = (code: string, id: string, body: FnPayment) =>
  send<Ok & { id: string }>("POST", `${fnAt(code, id)}/payments`, body, keysOf(code, id));

export const invoiceFn = (code: string, id: string) =>
  send<Ok & { number?: string }>("POST", `${fnAt(code, id)}/invoice`, undefined, keysOf(code, id));
