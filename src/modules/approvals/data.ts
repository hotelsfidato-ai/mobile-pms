import { api, currentSubject, send } from "../../core/api";
import { keyKeeper, type KeyKeeper } from "../../core/keys";
import type { ApprovalsAnswer, Tab } from "./rules";

/* ══════════════════════════════════════════════════════════════════
   APPROVALS' CALLS — the web's src/data/repositories/approvals.ts, through
   the core only. No second engine: the same queue and the same decide the
   equipment register and purchasing post to (api/src/routes/approvals.ts).

   OFFLINE: POST /approvals/:id/:decision is not on the web's list
   (src/lib/offline.ts), so `send` refuses it with the web's sentence
   ("This cannot be done offline yet…") and holds nothing. A decision can
   DO the thing (a waiter's NC or void, performPosRequest), so it must
   never be replayed later on a guess.

   KEYS (MFIN-1): one keeper per property's queue. The route does not read
   the idempotency key today; what stops a second decision is the server's
   "a decision is final" (app.decide_approval). The keeper costs nothing
   and holds the moment the PMS honours the key (docs/api-requests.md).
   ══════════════════════════════════════════════════════════════════ */

const at = (code: string) => `/api/hotels/${encodeURIComponent(code)}/approvals`;

const keepers = new Map<string, KeyKeeper>();
const keysOf = (code: string) => {
  let k = keepers.get(code);
  if (!k) { k = keyKeeper({ who: currentSubject }); keepers.set(code, k); }
  return k;
};

/** Everything waiting, or everything with what was decided lately (200 at most, the server's). */
export async function listApprovals(code: string, tab: Tab) {
  const keys = keysOf(code);
  const started = keys.mark();
  const answer = await api<ApprovalsAnswer>(`${at(code)}?status=${tab}`);
  keys.seen(started);
  return answer;
}

/** Approve, or refuse with a note. A refusal without one is refused by the
    SERVER too; its sentence comes back as an ApiError. */
export const decide = (code: string, id: string, decision: "approved" | "rejected", note?: string) =>
  send<{ ok: true; status: string }>("POST", `${at(code)}/${encodeURIComponent(id)}/${decision}`, note ? { note } : {}, keysOf(code));
