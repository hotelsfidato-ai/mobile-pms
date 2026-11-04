import { api, orNull, send } from "../../core/api";
import type { BaseBody, BreakupDay, Inventory, Pricing, RateDay, RestrictionBody } from "./rates";

/* ══════════════════════════════════════════════════════════════════
   RATES' READS AND WRITES — the web's data/pricing.ts, data/rates.ts and
   data/rateGrid.ts (the PMS at a4527ea), every call through the core's
   api client. The hotel is in every path; the screen keys every read
   ["inventory", code, …] (AGENTS rule 5).

   Offline: no rate write is listed in the web's src/lib/offline.ts, so
   `send` refuses each with the web's own sentence for an unlisted write
   (an ApiError 503) - nothing is held (the web's MODULE.md: "Offline, a
   rate or room write is refused").

   A failed read is a failure, never an empty grid: the web's getInventory
   answers null on ANY error and the page then says "No room types" (a
   fault of the web's, reported for the PMS). A property the API does not
   know is a 404: null here, and the phone says "No room types" as the web.
   ══════════════════════════════════════════════════════════════════ */

const H = (code: string) => `/api/hotels/${encodeURIComponent(code)}`;
const q = (params: Record<string, string | number | undefined>) =>
  Object.entries(params).filter(([, v]) => v !== undefined).map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`).join("&");

/** GET /inventory: rooms left by type and day, and the restrictions. With
    no `from`, the server chooses the business date (Rates.tsx 107-115). */
export const readInventory = (code: string, from?: string, to?: string) =>
  orNull<Inventory>(`${H(code)}/inventory?${q({ from, to })}`);

/** GET /pricing?plan=EP: the setup and the base's cells (Rates.tsx 117-123). */
export const readPricing = (code: string, from: string, days: number) =>
  orNull<Pricing>(`${H(code)}/pricing?${q({ from, days, plan: "EP" })}`);

/** GET /pricing?breakup=: one room type's break-up rows (getBreakup). */
export const readBreakup = async (code: string, from: string, days: number, roomTypeId: string) =>
  (await orNull<{ breakup: BreakupDay[] }>(`${H(code)}/pricing?${q({ from, days, breakup: roomTypeId })}`))?.breakup ?? [];

/** GET /rates: how each day sold (getRateDays). */
export const readRateDays = (code: string, from: string, days: number) =>
  api<RateDay[]>(`${H(code)}/rates?${q({ from, days })}`);

/** PUT /pricing/base (setBasePrice): a base over a half-open range. */
export const setBase = (code: string, body: BaseBody) =>
  send<{ ok: true; cleared: boolean }>("PUT", `${H(code)}/pricing/base`, body);

/** POST /restrictions (setRestriction): one rule across an inclusive range. */
export const setRestriction = (code: string, body: RestrictionBody) =>
  send<{ ok: true; dates: number }>("POST", `${H(code)}/restrictions`, body);
