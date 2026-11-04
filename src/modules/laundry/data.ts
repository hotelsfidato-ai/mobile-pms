import { api, ApiError, currentSubject, send } from "../../core/api";
import { keyKeeper, type KeyKeeper } from "../../core/keys";
import type { Stay } from "../../core/types";
import { stayChoices, type DocketDetail, type DocketList, type NewDocket, type PriceItem } from "./docket";

/* ══════════════════════════════════════════════════════════════════
   THE LAUNDRY'S CALLS — the web's src/modules/laundry/data/laundry.ts,
   through the core only. The server is api/src/modules/laundry/laundry.ts;
   nothing is priced, totalled or decided here.

   READS THROW (the web's own warning): a read that failed must never draw
   "nothing has gone to the laundry". A 403 is the server saying no - laundry
   switched off at this property, or the role gate - and comes back as
   `{ refused }` with its sentence, so the screen shows that and nothing else.

   WRITES go through `send`. OFFLINE: no laundry path is on the web's list
   (src/lib/offline.ts; its "Room charge" queue-warn is the till's settle to
   a room only), so `send` refuses every one with the web's sentence and
   nothing is held. A refusal is the server's own words (409 `reason`).
   ══════════════════════════════════════════════════════════════════ */

const at = (code: string) => `/api/hotels/${encodeURIComponent(code)}/laundry`;

export type Refused = { refused: string };
async function read<T>(path: string): Promise<T | Refused> {
  try {
    return await api<T>(path);
  } catch (e) {
    if (e instanceof ApiError && e.status === 403) return { refused: e.message };
    throw e;
  }
}
export const isRefused = (x: unknown): x is Refused => typeof x === "object" && x !== null && "refused" in x;

export type Whose = "all" | "guest" | "hotel";
export const readDockets = (code: string, whose: Whose) =>
  read<DocketList>(`${at(code)}/dockets${whose === "all" ? "" : `?whose=${whose}`}`);

export const readPriceList = (code: string) => read<{ items: PriceItem[] }>(`${at(code)}/price-list`);

/** The stays a guest's docket may name, over the front desk's own door
    (GET /stays, `reservation` view): guests in the house only. */
export const readStays = async (code: string) =>
  stayChoices(await api<Stay[]>(`/api/hotels/${encodeURIComponent(code)}/stays`));

/** One keeper per docket (core/keys.ts, MFIN-1): Charge to the room tapped
    again after a lost reply, before the docket could be read, keeps its key.
    Once the docket is read again (readDocket) the person sees whether it is
    on the bill. The server's own guard is the stronger one: it locks the
    docket and answers "already on the bill" to a second charge. */
const keepers = new Map<string, KeyKeeper>();
const keysOf = (code: string, id: string) => {
  const k = `${code}/${id}`;
  let keeper = keepers.get(k);
  if (!keeper) { keeper = keyKeeper({ who: currentSubject }); keepers.set(k, keeper); }
  return keeper;
};

export async function readDocket(code: string, id: string) {
  const keys = keysOf(code, id);
  const started = keys.mark();
  const docket = await read<DocketDetail>(`${at(code)}/dockets/${encodeURIComponent(id)}`);
  keys.seen(started);
  return docket;
}

/* ── Writes ── */

export const collect = (code: string, body: NewDocket) =>
  send<{ ok: true; data: { id: string; number: string } }>("POST", `${at(code)}/dockets`, body);

/** What came back, as counts in total; the server marks the docket back. */
export const recordReturn = (code: string, id: string, returned: { lineId: string; quantity: number }[]) =>
  send<{ ok: true; data: { stillOut: number } }>("POST", `${at(code)}/dockets/${encodeURIComponent(id)}/return`, { returned });

export const cancelDocket = (code: string, id: string) =>
  send<{ ok: true }>("POST", `${at(code)}/dockets/${encodeURIComponent(id)}/cancel`, {});

/** D18-7: onto the room's bill as its own line, through finance's door. */
export const chargeDocket = (code: string, id: string) =>
  send<{ ok: true; data: { postingId: string } }>("POST", `${at(code)}/dockets/${encodeURIComponent(id)}/charge`, {}, keysOf(code, id));
