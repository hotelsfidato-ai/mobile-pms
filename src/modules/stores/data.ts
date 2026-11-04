import { api, ApiError, send } from "../../core/api";
import type { BarRequest, BarSheet, KitchenSheet, Moment, Place } from "./sheets";
import type { StockMovement, StoreList } from "./shelf";

/* ══════════════════════════════════════════════════════════════════
   THE STORE'S CALLS — the web's src/modules/stores/data/stores.ts,
   kitchen.ts, barSheet.ts and barPours.ts (its drinks list only), through
   the core only. The server is api/src/modules/stores/ (stores.ts,
   kitchenSheet.ts, barSheet.ts, barRequests.ts, barPours.ts); every route
   asks the role itself (roleGate.ts `own`), and nothing is priced,
   totalled or decided here.

   READS THROW (STO-2): a store that could not be read must never draw
   "Nothing in the store yet". A 403 is the server saying no - the role, or
   Bar stock switched off - and comes back as `{ refused }` with its
   sentence, so the screen shows that and nothing else.

   WRITES go through `send`. OFFLINE: no store, bar or kitchen-stock path is
   on the web's list (src/lib/offline.ts: `/kitchen(\/|$)` is the till's
   kitchen, not `/kitchen-stock/`), so `send` refuses every one with the
   web's sentence and nothing is held - the web's MODULE.md: "Offline, a
   store write is refused." A refusal is the server's own words (409
   `reason`). The store's routes do not read an idempotency key (MST-2), so
   a keeper would carry nothing; one tap is one write by the latch at the
   tap (MEMORY 8), and a count carries the book it was taken against, so a
   repeat after a lost reply is refused by the server ("moved since").
   ══════════════════════════════════════════════════════════════════ */

const at = (code: string) => `/api/hotels/${encodeURIComponent(code)}`;

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

/* ── Reads ── */

export const readStore = (code: string) => read<StoreList>(`${at(code)}/stores`);

export const readHistory = (code: string, itemId: string) =>
  read<{ movements: StockMovement[] }>(`${at(code)}/stores/items/${encodeURIComponent(itemId)}/movements`);

export const readKitchenSheet = (code: string, date?: string) =>
  read<KitchenSheet>(`${at(code)}/kitchen-stock/sheet${date ? `?date=${date}` : ""}`);

export const readBarSheet = (code: string, place: Place, date?: string) =>
  read<BarSheet>(`${at(code)}/bar/sheet?place=${place}${date ? `&date=${date}` : ""}`);

export const readBarRequests = (code: string) =>
  read<{ mayAsk: boolean; mayApprove: boolean; requests: BarRequest[] }>(`${at(code)}/bar/requests`);

/** The bar's drinks and what the bar store holds of each (GET /bar/pours),
    for Ask the store's picker; what each dish takes stays on the website. */
export const readBarDrinks = (code: string) =>
  read<{ drinks: { id: string; name: string; onHand: number | null }[] }>(`${at(code)}/bar/pours`);

/* ── Writes ── */

export type Moved = { ok: true; id: string; onHand: number; onHandHere: number; emptiesHere: number | null; store: string; unit: string; name: string };

/** receipt · issue · wastage · return · breakage (`create`), adjustment (`edit`). */
export const recordMovement = (code: string, body: Record<string, unknown>) =>
  send<Moved>("POST", `${at(code)}/stores/movements`, body);

export const moveStock = (code: string, body: Record<string, unknown>) =>
  send<{ ok: true; name: string; unit: string; from: { name: string; onHand: number }; to: { name: string; onHand: number } }>(
    "POST", `${at(code)}/stores/transfers`, body);

export const undoMovement = (code: string, movementId: string) =>
  send<{ ok: true; id: string }>("POST", `${at(code)}/stores/movements/${encodeURIComponent(movementId)}/reverse`, {});

export const saveStoreCount = (code: string, locationId: string, lines: unknown[]) =>
  send<{ ok: true; recorded: number; matched: number; store: string }>("POST", `${at(code)}/stores/counts`, { locationId, lines });

export const saveKitchenCount = (code: string, lines: unknown[]) =>
  send<{ ok: true; recorded: number; matched: number }>("POST", `${at(code)}/kitchen-stock/count`, { lines });

export const saveBarCount = (code: string, place: Place, moment: Moment, lines: unknown[]) =>
  send<{ ok: true; recorded: number; matched: number }>("POST", `${at(code)}/bar/count`, { place, moment, lines });

export const markBarClosed = (code: string, reason: string) =>
  send<{ ok: true }>("POST", `${at(code)}/bar/closed`, { reason });

export const undoBarClosed = (code: string) => send<{ ok: true }>("POST", `${at(code)}/bar/closed/undo`, {});

export const askTheStore = (code: string, body: { lines: { itemId: string; quantity: number }[]; note: string }) =>
  send<{ ok: true; id: string }>("POST", `${at(code)}/bar/requests`, body);

export const approveRequest = (code: string, id: string) =>
  send<{ ok: true; moved: number }>("POST", `${at(code)}/bar/requests/${encodeURIComponent(id)}/approve`, {});

export const rejectRequest = (code: string, id: string, note: string) =>
  send<{ ok: true }>("POST", `${at(code)}/bar/requests/${encodeURIComponent(id)}/reject`, { note });
