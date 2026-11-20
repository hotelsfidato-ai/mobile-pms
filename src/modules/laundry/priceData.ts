import { send } from "../../core/api";
import type { LaundryService } from "./docket";

/* ══════════════════════════════════════════════════════════════════
   THE PRICE LIST'S WRITES (lane U, 19 Nov) — the web's addPriceItem and
   setPriceItem (src/modules/laundry/data/laundry.ts lines 141-154), through
   the core's `send`. The read is data.ts's readPriceList (key
   ["laundry", code, "price-list"], shared with Collect a bag).

   OFFLINE: no laundry path is on the web's list: `send` refuses each with
   the UNLISTED sentence, nothing held (prices.check.ts). KEYS: none read. A
   line added twice is refused by the server ("… is already on the list for
   that service."); a price or a retirement sets a value.
   ══════════════════════════════════════════════════════════════════ */

const at = (code: string) => `/api/hotels/${encodeURIComponent(code)}/laundry/price-list`;

/** `price: null` is NOBODY HAS PRICED IT - a dash. Never 0 unless `free`. */
export const addItem = (code: string, body: { name: string; service: LaundryService; price: number | null; free: boolean }) =>
  send<{ ok: true; data: { id: string } }>("POST", at(code), body);

/** A price (null takes it back to unpriced), with Free. */
export const setPrice = (code: string, id: string, body: { price: number | null; free: boolean }) =>
  send<{ ok: true }>("POST", `${at(code)}/${encodeURIComponent(id)}`, body);

/** Retire, or put back: not deleting. */
export const setInUse = (code: string, id: string, isActive: boolean) =>
  send<{ ok: true }>("POST", `${at(code)}/${encodeURIComponent(id)}`, { isActive });
