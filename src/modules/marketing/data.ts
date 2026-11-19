import { api, ApiError } from "../../core/api";
import type { MarketingNumbers } from "./rules";

/* ══════════════════════════════════════════════════════════════════
   MARKETING'S ONE CALL — the web's src/modules/marketing/data/numbers.ts
   getNumbers, through the core. The server is
   api/src/modules/marketing/numbers.ts. A 403 is the gate's no (`marketing`
   view): `{ refused }` with its sentence. A leads app that could not be
   read is not a failure: the server answers 200 with `appError` and the
   spend as dashes. Read only: no write, nothing sent.
   ══════════════════════════════════════════════════════════════════ */

export type Refused = { refused: string };
export const isRefused = (x: unknown): x is Refused => typeof x === "object" && x !== null && "refused" in x;

export async function readNumbers(code: string, month: string): Promise<MarketingNumbers | Refused> {
  try {
    return await api<MarketingNumbers>(`/api/hotels/${encodeURIComponent(code)}/marketing/numbers?month=${encodeURIComponent(month)}`);
  } catch (e) {
    if (e instanceof ApiError && e.status === 403) return { refused: e.message };
    throw e;
  }
}
