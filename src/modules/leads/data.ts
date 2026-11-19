import { api, ApiError } from "../../core/api";
import type { Conversation, LeadsPage } from "./rules";

/* ══════════════════════════════════════════════════════════════════
   LEADS' CALLS — the web's src/modules/leads/data/leads.ts (getLeads,
   getConversation), through the core only. The server is
   api/src/modules/leads/leads.ts. A 403 is the role gate's no (GUESTS):
   `{ refused }` with its sentence. A 429 (the free reads used up) or a 502
   (the leads app down) is the server's sentence, thrown as its ApiError for
   the screen to say as a state (rules.ts sentenceOf). Read only: no write.
   ══════════════════════════════════════════════════════════════════ */

const at = (code: string) => `/api/hotels/${encodeURIComponent(code)}/leads`;

export type Refused = { refused: string };
export const isRefused = (x: unknown): x is Refused => typeof x === "object" && x !== null && "refused" in x;

/** One page of 50, newest message first; `before` the last one's lastMessageAt. */
export async function readLeads(code: string, before: string | null): Promise<LeadsPage | Refused> {
  try {
    return await api<LeadsPage>(`${at(code)}${before ? `?before=${encodeURIComponent(before)}` : ""}`);
  } catch (e) {
    if (e instanceof ApiError && e.status === 403) return { refused: e.message };
    throw e;
  }
}

/** One lead's conversation and the link to reply in the leads app. */
export const readConversation = (code: string, ref: string) => api<Conversation>(`${at(code)}/${encodeURIComponent(ref)}`);
