import { api, ApiError, currentSubject, send } from "../../core/api";
import { keyKeeper, type KeyKeeper } from "../../core/keys";
import type { Picked } from "../../core/files";
import { filePart, sendForm } from "../../core/upload";
import type { BarBill, BarBillBody, BarDrinks } from "./barBills";
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

/** The name of the list's stop (core useScreenStop, MPUR-U2). POST …/purchasing/requests reads no key
    (the keeper here is not read by this server), so an Ask whose outcome is unknown greys Ask to buy
    until a read of the list begun after the loss is back - kept outside the dialog. */
export const listStop = (code: string) => `purchasing/${code}/list`;
export const ASK_UNKNOWN = "Not known whether the ask was sent: look at the list before asking again.";

/* ── Writes ── */

/** The order as a PDF (the web's downloadOrder): GET, saved under `${reference}.pdf` as the server names it. */
export const orderPdfPath = (code: string, id: string) => `${at(code)}/purchasing/orders/${encodeURIComponent(id)}.pdf`;

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

/* ── The bar's bills (D27-354; M-16 row 1.9): purchasing/data/barBills.ts. BAR_VIEW reads them (a 403 is
   the server's sentence, as the list's); BAR_RECORDERS records. The bill is JSON (send(): unlisted,
   refused offline); its photo a form after it, to the new bill's id, never held (core upload.ts).
   POST /bar/purchases reads no key; a repeat of the same supplier and number is refused by the server. ── */
export const barStop = (code: string) => `purchasing/${code}/bar`;
export const readBarDrinks = (code: string) => read<BarDrinks>(`${at(code)}/bar/drinks`);
export async function readBarBills(code: string) {
  const out = await read<{ purchases: BarBill[] }>(`${at(code)}/bar/purchases`);
  return isRefused(out) ? out : out.purchases;
}
export const recordBarBill = (code: string, body: BarBillBody) =>
  send<{ ok: true; id: string }>("POST", `${at(code)}/bar/purchases`, body, keysOf(`${code}/bar`));
/** The bill's photo: POST to add, GET to open (the newest). */
export const barPhotoPath = (code: string, billId: string) => `${at(code)}/bar/purchases/${encodeURIComponent(billId)}/photo`;
export const addBarPhoto = (code: string, billId: string, file: Picked) =>
  sendForm<{ ok: true; id: string }>("POST", barPhotoPath(code, billId), [filePart("file", file)]);
