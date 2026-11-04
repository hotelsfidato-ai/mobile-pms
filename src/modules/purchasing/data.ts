import { api, ApiError, currentSubject, send } from "../../core/api";
import { keyKeeper, type KeyKeeper } from "../../core/keys";
import {
  approvalFor, type AskBody, type DeliveryBody, type PurchaseApproval, type PurchaseRequest, type PurchasingList, type RequestDetail,
} from "./purchase";

/* ══════════════════════════════════════════════════════════════════
   PURCHASING'S CALLS — the web's src/modules/purchasing/data/purchasing.ts,
   through the core only. The server is api/src/modules/purchasing/
   purchasing.ts; nothing is priced, totalled or decided here.

   READS THROW (the web's own warning): a read that failed must never draw
   "Nothing has been asked for yet". A 403 is the server saying no (the
   role gate) and comes back as `{ refused }` with its sentence.

   WRITES go through `send`. OFFLINE: no purchasing path is on the web's
   list (src/lib/offline.ts), so `send` refuses every one with the web's
   UNLISTED sentence and nothing is held (purchase.check.ts holds it). A
   refusal is the server's own words (its 409 / 403 `reason`).

   KEYS (core/keys.ts, MFIN-1): one keeper per request for everything done
   to it (a price, the order, the delivery - stock and a supplier's bill -
   and a cancellation), forgotten after each read of the request; one per
   property for asking, forgotten after each read of the list. The
   purchasing routes do not read the idempotency key today; what stops a
   second delivery is the server's own state check ("A delivery is received
   against an order that has been sent…"), and nothing stops a second
   request (docs/api-requests.md, the report).
   ══════════════════════════════════════════════════════════════════ */

const at = (code: string) => `/api/hotels/${encodeURIComponent(code)}`;
const one = (code: string, id: string) => `${at(code)}/purchasing/requests/${encodeURIComponent(id)}`;

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

const keepers = new Map<string, KeyKeeper>();
const keysOf = (k: string) => {
  let keeper = keepers.get(k);
  if (!keeper) { keeper = keyKeeper({ who: currentSubject }); keepers.set(k, keeper); }
  return keeper;
};

/** The list, the stores, the suppliers, the Store's items, and whether this person may raise one. */
export async function readPurchasing(code: string) {
  const keys = keysOf(code);
  const started = keys.mark();
  const answer = await read<PurchasingList>(`${at(code)}/purchasing`);
  keys.seen(started);
  return answer;
}

export async function readRequest(code: string, id: string) {
  const keys = keysOf(`${code}/${id}`);
  const started = keys.mark();
  const answer = await read<RequestDetail>(one(code, id));
  keys.seen(started);
  return answer;
}

/** The approval waiting on this request, from the ONE queue (the web's getPurchaseApproval). */
export async function readApproval(code: string, id: string): Promise<PurchaseApproval | null> {
  const out = await api<{ rows: PurchaseApproval[] }>(`${at(code)}/approvals?status=all`);
  return approvalFor(out.rows, id);
}

/* ── Writes ── */

export const raise = (code: string, body: AskBody) =>
  send<{ ok: true; request: PurchaseRequest }>("POST", `${at(code)}/purchasing/requests`, body, keysOf(code));

/** The agreed price of one line; null takes it back to "not agreed". */
export const priceLine = (code: string, id: string, lineId: string, body: { unitPrice: number | null; free?: true }) =>
  send<{ ok: true }>("PUT", `${one(code, id)}/lines/${encodeURIComponent(lineId)}`, body, keysOf(`${code}/${id}`));

export const sendOrder = (code: string, id: string, supplierId: string) =>
  send<{ ok: true; request: PurchaseRequest }>("POST", `${one(code, id)}/order`, { supplierId }, keysOf(`${code}/${id}`));

export const cancelRequest = (code: string, id: string, reason: string) =>
  send<{ ok: true }>("POST", `${one(code, id)}/cancel`, { reason }, keysOf(`${code}/${id}`));

/** What came, as typed; the stock lands in the Store through its own door, a bill on credit on the dues. */
export const recordDelivery = (code: string, id: string, body: DeliveryBody) =>
  send<{ ok: true; received: { item: string; quantity: number; store: string; onHandHere: number }[] }>(
    "POST", `${one(code, id)}/delivery`, body, keysOf(`${code}/${id}`));
