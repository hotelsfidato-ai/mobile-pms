import { api, ApiError, currentSubject, send } from "../../core/api";
import { redeemKeys, type HotelMonth, type LoyaltyCard, type LoyaltyScreen } from "./loyalty";

/* ══════════════════════════════════════════════════════════════════
   LOYALTY'S CALLS — the web's src/modules/loyalty/data/loyalty.ts, through
   the core only. The server is api/src/modules/loyalty/loyalty.ts; its
   rules are the database's (migration 178, 213): nothing is priced,
   totalled or decided here.

   READS THROW: a read that failed never draws "Nobody is checked in". A
   403 on the card or the month (MANAGERS_ONLY) comes back as `{ refused }`
   with its sentence, so the screen shows that and nothing else.

   WRITES go through `send`. A refusal is the server's own sentence: 403
   "you may not", 409 `{ok: false, reason}` "that cannot be done" (the
   programme has no name, no mobile number, from 500, more than the room
   charges, a tax invoice already made). OFFLINE: no loyalty path is on the
   web's list (src/lib/offline.ts), so `send` refuses each with the web's
   UNLISTED sentence and nothing is held (loyalty.check.ts holds it).
   KEYS: the redeem route reads the idempotency key (R-13: checked in
   app.loyalty_redeem), so Use points has a keeper per stay; join, leave,
   adjust and the rules read none (R-30), so their screens stop on an
   unknown outcome (MEMORY 16).
   ══════════════════════════════════════════════════════════════════ */

const at = (code: string) => `/api/hotels/${encodeURIComponent(code)}/loyalty`;

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

/** One keeper per stay for Use points (core/keys.ts, MFIN-1). */
const keys = redeemKeys(currentSubject);

/** The screen: the rules, this hotel's switch, who is in house. Once it is
    back, a Use points that failed before it began is known (keys.seen). */
export async function readLoyalty(code: string) {
  const marks = keys.marks(code);
  const out = await read<LoyaltyScreen>(at(code));
  if (!isRefused(out)) keys.seen(code, marks, out);
  return out;
}

/** A member's card and statement, at every hotel (the owner, an administrator, the GM). */
export const readCard = (code: string, guestId: string) =>
  read<LoyaltyCard>(`${at(code)}/guests/${encodeURIComponent(guestId)}`);

/** Points earned and used at each hotel in one month, in rupees (L18). */
export const readByHotel = (code: string, month: string) =>
  read<HotelMonth[]>(`${at(code)}/by-hotel?month=${encodeURIComponent(month)}`);

/* ── Writes ── */

type Done = { ok: true };

/** The guest's own yes, never assumed (L4): `agreed: true` only from the tick. */
export const join = (code: string, guestId: string) =>
  send<Done>("POST", `${at(code)}/guests/${encodeURIComponent(guestId)}/join`, { agreed: true });

/** As easy as joining; what is left lapses (L5). */
export const leave = (code: string, guestId: string) =>
  send<Done>("POST", `${at(code)}/guests/${encodeURIComponent(guestId)}/leave`, {});

/** Points off the stay's room charges, from 500 (L13), with the stay's keeper. */
export const redeem = (code: string, stayId: string, points: number) =>
  send<Done>("POST", `${at(code)}/stays/${encodeURIComponent(stayId)}/redeem`, { points }, keys.of(code, stayId));

/** The group's name and earn rate. `pointsPer100` as typed: null for none. */
export const saveRules = (code: string, name: string, pointsPer100: string | null) =>
  send<Done>("PUT", `${at(code)}/rules`, { name, pointsPer100 });

/** Points added (plus) or taken (minus) by hand, with a reason that stays on the statement (L6). */
export const adjust = (code: string, guestId: string, points: number, reason: string) =>
  send<Done>("POST", `${at(code)}/guests/${encodeURIComponent(guestId)}/adjust`, { points, reason });
