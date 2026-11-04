import { api, ApiError, send } from "../../core/api";
import type { Channel, ReviewsPage } from "./rules";

/* ══════════════════════════════════════════════════════════════════
   REVIEWS' CALLS — the web's src/modules/reputation/data/reputation.ts,
   through the core only. The server is api/src/modules/reputation/
   reputation.ts; who may, whether anything can send, and every refusal
   are its own.

   READ THROWS: a read that failed must never draw "Nobody has left" at a
   property with thirty departures. A 403 is the server saying no (its
   VIEW_ROLES) and comes back as `{ refused }` with its sentence.

   WRITES go through `send`. OFFLINE: no reviews path is on the web's list
   (src/lib/offline.ts), so `send` refuses both with the web's UNLISTED
   sentence and nothing is held (rules.check.ts holds it). Neither route
   reads an idempotency key, so no keeper: the ask is latched at the tap and
   stopped on an outcome nobody knows (Reviews.tsx, MEMORY 8 and 16).
   ══════════════════════════════════════════════════════════════════ */

const at = (code: string) => `/api/hotels/${encodeURIComponent(code)}/reviews`;

export type Refused = { refused: string };
export const isRefused = (x: unknown): x is Refused => typeof x === "object" && x !== null && "refused" in x;

/** The link, who may do what, whether anything can send, and the last 30 days' departures. */
export async function readReviews(code: string): Promise<ReviewsPage | Refused> {
  try {
    return await api<ReviewsPage>(at(code));
  } catch (e) {
    if (e instanceof ApiError && e.status === 403) return { refused: e.message };
    throw e;
  }
}

/** Type one in, or clear it back to nothing with "" (the server deletes the row). */
export const saveLink = (code: string, url: string) =>
  send<{ ok: true; link: string | null }>("PUT", `${at(code)}/link`, { url });

/** Ask one departed guest. The server refuses a stay not checked out, a room
    that is not its group's lead, no link, a sender not connected, a hotel
    with review requests switched off, and the sender refuses a test hotel - each in its own words. */
export const askForReview = (code: string, stayId: string, channel: Channel) =>
  send<{ ok: true; id: string }>("POST", `${at(code)}/${encodeURIComponent(stayId)}/ask`, { channel });
