import { api, send } from "../../core/api";
import type { KeyKeeper } from "../../core/keys";
import {
  checklistPath, checklistsPath, minibarDecidePath, minibarItemPath, minibarItemsPath, minibarPath, minibarRecordsPath,
  requiredPath, runsPath, type ChecklistJob, type ChecklistRun, type ChecklistSetup, type Minibar, type MinibarRecord,
} from "./care";

/* ══════════════════════════════════════════════════════════════════
   THE MINIBAR'S AND THE CHECKLISTS' CALLS — the web's data/housekeeping.ts
   (getMinibar … listChecklistRuns), through the core only.

   A refusal is the server's: these routes answer 409 / 403 with
   { ok: false, reason }, which `send` throws as an ApiError with that
   sentence (the web's careCall turns it into { ok: false } instead).

   OFFLINE, the web's tiers (src/core/offline.ts): a tick of a room's
   checklist is under /housekeeping/ and would be held - it is the board's,
   not these screens'. Everything here - the take, the desk's decision,
   the list, the switch, the checklists - is on no list, so `send` refuses
   it with the web's sentence and holds nothing: a charge is never replayed
   on a guess.

   KEYS. POST /minibar/records reads the idempotency key as the record's
   id (D27-396): ONE KEY PER TAKE, minted when the dialog opens and sent
   with every tap, so a double tap or a try after a lost reply is answered
   with the first record and never charged twice - the dialog passes its
   own `formKeeper` (repair.ts). The other routes read no key: what stops a
   second write is the server's own state ("already decided", "already on
   the list"), and the screens latch each tap and stop on an unknown
   outcome (MEMORY 8, 16).
   ══════════════════════════════════════════════════════════════════ */

/** `duplicate`: the server answered a key it had already seen with the first write's answer. */
type Answer<T = unknown> = { ok: true; data?: T; duplicate?: boolean };

/** The list and the last fortnight's records, waiting ones first. */
export const readMinibar = (code: string) => api<Minibar>(minibarPath(code));

export const addMinibarItem = (code: string, body: { stockItemId: string; price: string; storeId: string }) =>
  send<Answer<{ id: string }>>("POST", minibarItemsPath(code), body);

export const changeMinibarItem = (code: string, id: string, body: { price: string; storeId: string; active: boolean }) =>
  send<Answer>("PATCH", minibarItemPath(code, id), body);

/** One take from a room's minibar, with the take's own keeper (one key per take). */
export const recordMinibar = (
  code: string, body: { room: string; lines: { itemId: string; quantity: number }[]; disputed: boolean }, keeper: KeyKeeper,
) => send<Answer<{ id: string; status: MinibarRecord["status"]; waitingWhy: MinibarRecord["waitingWhy"] }>>(
  "POST", minibarRecordsPath(code), body, keeper);

export const decideMinibar = (code: string, id: string, body: { charge: boolean; note?: string }) =>
  send<Answer>("POST", minibarDecidePath(code, id), body);

/** The lists, the switch and the room types. */
export const readChecklists = (code: string) => api<ChecklistSetup>(checklistsPath(code));

export const setChecklistsRequired = (code: string, required: boolean) =>
  send<Answer>("PUT", requiredPath(code), { required });

export const addChecklist = (code: string, body: { job: ChecklistJob; roomTypeId: string | null; items: string[] }) =>
  send<Answer<{ id: string }>>("POST", checklistsPath(code), body);

export const changeChecklist = (code: string, id: string, items: string[]) =>
  send<Answer>("PUT", checklistPath(code, id), { items });

export const removeChecklist = (code: string, id: string) => send<Answer>("DELETE", checklistPath(code, id));

/** The last hundred tickings, of one room or every room, newest first. */
export const readRuns = (code: string, room: string) => api<{ runs: ChecklistRun[] }>(runsPath(code, room));
