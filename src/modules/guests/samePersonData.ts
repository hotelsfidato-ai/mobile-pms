import { api, ApiError, send } from "../../core/api";
import type { GuestJoin, NotSameAnswer, SamePersonPair } from "./samePerson";

/* ══════════════════════════════════════════════════════════════════
   POSSIBLE SAME PERSON'S CALLS (mobile/m13-sales, lane S) — the web's
   src/modules/crm/data/crm.ts (listSamePerson, listJoins, joinGuests,
   undoJoin, listNotSame, sayNotSame, undoNotSame), through the core only.
   The server is api/src/modules/guests/people.ts: the role gate lets
   Guests' readers through, then people.ts answers 403 MANAGERS_ONLY to
   anyone but the owner, an administrator or a GM: `{ refused }` with it.

   WRITES go through `send`. OFFLINE: no /crm path is on the web's list, so
   each is refused with the web's UNLISTED sentence and nothing is held
   (samePerson.check.ts). None reads an idempotency key: the screen latches
   each at the tap and stops on an outcome nobody knows (MEMORY 8, 16).
   A refusal is the server's own words (409 `reason`).
   ══════════════════════════════════════════════════════════════════ */

const at = (code: string) => `/api/hotels/${encodeURIComponent(code)}/crm`;

export type Refused = { refused: string };
export const isRefused = (x: unknown): x is Refused => typeof x === "object" && x !== null && "refused" in x;
async function read<T>(path: string): Promise<T | Refused> {
  try {
    return await api<T>(path);
  } catch (e) {
    if (e instanceof ApiError && e.status === 403) return { refused: e.message };
    throw e;
  }
}

export const readPairs = async (code: string) => {
  const r = await read<{ pairs: SamePersonPair[] }>(`${at(code)}/same-person`);
  return isRefused(r) ? r : r.pairs;
};
export const readJoins = async (code: string) => {
  const r = await read<{ joins: GuestJoin[] }>(`${at(code)}/joins`);
  return isRefused(r) ? r : r.joins;
};
export const readNotSame = async (code: string) => {
  const r = await read<{ answers: NotSameAnswer[] }>(`${at(code)}/not-same`);
  return isRefused(r) ? r : r.answers;
};

/** `keptId` stands for the person; `joinedId`'s stays move to it. Undoable. */
export const joinGuests = (code: string, keptId: string, joinedId: string) =>
  send<{ ok: true; joinId: string }>("POST", `${at(code)}/joins`, { keptId, joinedId });
export const undoJoin = (code: string, id: string) => send<{ ok: true }>("POST", `${at(code)}/joins/${encodeURIComponent(id)}/undo`);
/** CRM-2 (D22-8): two people, not one. Undoable. */
export const sayNotSame = (code: string, aId: string, bId: string) =>
  send<{ ok: true; id: string }>("POST", `${at(code)}/not-same`, { aId, bId });
export const undoNotSame = (code: string, id: string) => send<{ ok: true }>("POST", `${at(code)}/not-same/${encodeURIComponent(id)}/undo`);
