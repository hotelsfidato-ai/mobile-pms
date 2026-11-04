import { api, ApiError, currentSubject, send } from "../../core/api";
import { keyKeeper, type KeyKeeper } from "../../core/keys";
import type { Stay } from "../../core/types";
import { readHouse, readRooms, type DeskStay } from "../front-desk/data";
import { buildChart, windowFrom, type NightPrice } from "./chart";

/* ══════════════════════════════════════════════════════════════════
   THE BOOK'S READS AND WRITES — the web's calls, one file:
     src/modules/front-desk/data/stayview.ts   getStayView, nightPrices
     src/modules/front-desk/data/stays.ts      fetchStays(…, board),
                                               fetchStaysWhere (since=, q=)
     src/data/repositories/me.ts               setMyPreferences
     src/modules/finance/data/postings.ts      settle (the advance)
   Front desk's reads and writes (rooms, house-now, the booking, the room,
   the check-in, every list New booking reads) are imported from
   front-desk/data.ts, never copied. Writes go through `send`.
   ══════════════════════════════════════════════════════════════════ */

const H = (code: string) => `/api/hotels/${code}`;

/** Each room type's price each night, one read; 404 (an older API) is no prices: dashes. */
async function nightPrices(code: string, from: string, days: number) {
  try {
    return await api<NightPrice[]>(`${H(code)}/calendar-prices?from=${from}&days=${days}`);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return null;
    throw e;
  }
}

/** The Calendar's fortnight: the rooms, the board's read of the window, who
    is in each room tonight (the server's, D21-36), the night prices. */
export async function readChart(code: string, start: string, businessDate: string) {
  const dates = windowFrom(start);
  const [rooms, stays, house, prices] = await Promise.all([
    readRooms(code),
    api<Stay[]>(`${H(code)}/stays?from=${dates[0]}&to=${dates[dates.length - 1]}&board=1`),
    readHouse(code),
    nightPrices(code, start, dates.length),
  ]);
  return buildChart({ rooms, stays, house: house.rooms, prices, start, businessDate });
}

/** Assign room's list: who is checked in and every booking still to arrive
    (no end date, D27-387), and the rooms. */
export async function readToPlace(code: string, businessDate: string) {
  const [stays, rooms] = await Promise.all([api<Stay[]>(`${H(code)}/stays?from=${businessDate}&to=9999-12-31`), readRooms(code)]);
  return { stays, rooms };
}

/** All bookings: the window (`since=`) or a search (`q=`), the web's fetchStaysWhere; 404 is none. */
export async function readBook(code: string, query: string) {
  try {
    return await api<DeskStay[]>(`${H(code)}/stays?${query}`);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return [];
    throw e;
  }
}

/** Room type or Floor, per person on the server (087). Not a held write:
    refused offline (not listed), as the web, which says "Not remembered". */
export const rememberGrouping = (roomGrouping: "type" | "floor") => send<{ ok: true }>("PUT", "/api/me/preferences", { roomGrouping });

/** One keeper per booking's bill (MFIN-1, core/keys.ts): the advance taken
    right after the booking is sent once from this page; a lost reply keeps
    its key while its outcome is unknown. A payment: refused offline. */
const keepers = new Map<string, KeyKeeper>();
const keysOf = (code: string, stayId: string) => {
  const id = `${code}/${stayId}`;
  let k = keepers.get(id);
  if (!k) { k = keyKeeper({ who: currentSubject }); keepers.set(id, k); }
  return k;
};
export const takeAdvance = (code: string, stayId: string, input: { method: string; amount: number; businessDate: string; heldAsCredit: true }) =>
  send("POST", `${H(code)}/stays/${stayId}/payments`, input, keysOf(code, stayId));
