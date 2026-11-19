import { api, ApiError } from "../../core/api";
import type { FeedbackPage } from "./feedback";

/* ══════════════════════════════════════════════════════════════════
   GUEST FEEDBACK'S ONE CALL (mobile/m13-sales, lane F) — the web's
   src/modules/reputation/data/feedback.ts getFeedback, through the core.
   The server, api/src/modules/reputation/feedback.ts, answers 403 with
   FEEDBACK_REFUSED to anybody outside the owner, an administrator and the
   GM: that comes back as `{ refused }` with its sentence. Any other failure
   throws and is shown as a failed read, never as "No answers yet". The
   answers carry the guest's name and comment: they live in react-query's
   memory only (nothing on disk, app/_layout.tsx), as the web's.
   ══════════════════════════════════════════════════════════════════ */

export type Refused = { refused: string };
export const isRefused = (x: unknown): x is Refused => typeof x === "object" && x !== null && "refused" in x;

export async function readFeedback(code: string): Promise<FeedbackPage | Refused> {
  try {
    return await api<FeedbackPage>(`/api/hotels/${encodeURIComponent(code)}/feedback`);
  } catch (e) {
    if (e instanceof ApiError && e.status === 403) return { refused: e.message };
    throw e;
  }
}
