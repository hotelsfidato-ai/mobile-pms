import { api, ApiError, send } from "../../core/api";
import type { RequesterSetting } from "./requesters";

/* ══════════════════════════════════════════════════════════════════
   WHO MAY ASK TO BUY: ITS CALLS (lane U, 19 Nov) — the web's getRequesters
   and setRequester (src/modules/purchasing/data/purchasing.ts lines
   179-189), through the core. The read throws on a fault (never draws an
   empty list); a 403 is the server's sentence, as `{ refused }`.

   OFFLINE: refused with the UNLISTED sentence, except Housekeeping's row,
   which the web's housekeeping rule holds (MPUR-U1, requesters.check.ts).
   KEYS: none read; the PUT sets a value, so a repeat sets the same.
   ══════════════════════════════════════════════════════════════════ */

const at = (code: string) => `/api/hotels/${encodeURIComponent(code)}/purchasing/requesters`;

export async function readRequesters(code: string): Promise<RequesterSetting | { refused: string }> {
  try {
    return await api<RequesterSetting>(at(code));
  } catch (e) {
    if (e instanceof ApiError && e.status === 403) return { refused: e.message };
    throw e;
  }
}

/** Switch a role's permission to raise a request on or off, for this property (D18-2). */
export const setRequester = (code: string, role: string, mayRaise: boolean) =>
  send<{ ok: true }>("PUT", `${at(code)}/${encodeURIComponent(role)}`, { mayRaise });
