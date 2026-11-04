import { keyKeeper } from "../../core/keys";
import { api, currentSubject, orNull, send } from "../../core/api";
import type { Stay } from "../../core/types";
import type { Billable, BillLine, Folio, StayBill, StayFolio } from "./bill";
import { WRITES } from "./writes";

/* ══════════════════════════════════════════════════════════════════
   THE BILL'S READS AND WRITES — the web's src/modules/finance/data/*.ts
   and front desk's checkOut, through the core only. Nothing is added,
   taxed or rounded here. Every write is refused offline by the web's
   tiers (core offline.ts): `send` throws the web's sentence, nothing is
   held. An API refusal comes back as an ApiError in the server's words.
   ══════════════════════════════════════════════════════════════════ */

const at = (code: string, stayId: string) => `/api/hotels/${code}/stays/${stayId}`;

/** The stay itself (bookings: `reservation` view); null when not found. */
export const readStay = (code: string, stayId: string) => orNull<Stay>(at(code, stayId));

/** One keeper for every write on a bill (MFIN-1, core/keys.ts): the same
    payment, check-out or posting tapped again after a lost reply, before the
    bill could be read, keeps its key, so the server (finance postings honour
    the key, R-13) makes it once. Once the bill is read again (readBill, below)
    the person sees what was made and a repeat is a new one; each signed-in
    person has their own keys. */
const keys = keyKeeper({ who: currentSubject });

/** The whole bill in one read: every line, each bill's balance and the
    server's totals. No bill yet (404 `noBill`, FIN-2) is a null folio.
    Once it is back, every write that had failed before it began is known
    (keys.seen): tapped again, it is a new one. */
export async function readBill(code: string, stayId: string) {
  const started = Date.now();
  const [lines, folio, folios, bill] = await Promise.all([
    api<BillLine[]>(`${at(code, stayId)}/postings`),
    orNull<Folio>(`${at(code, stayId)}/folio`),
    api<StayFolio[]>(`${at(code, stayId)}/folios`),
    orNull<StayBill>(`${at(code, stayId)}/bill`),
  ]);
  keys.seen(started);
  return { lines, folio, folios, bill };
}
export type BillRead = Awaited<ReturnType<typeof readBill>>;

/** The property's clock and late charge, and whether THIS person may waive
    (GET /early-arrival, the server's own question). */
export interface Clock { checkOutTime: string; lateCharge: number | null; mayWaive: boolean }
export const readClock = (code: string) => api<Clock>(`/api/hotels/${code}/early-arrival`);

/** This stay's bills once departed, with the invoice standing on each. */
export const readBillable = async (code: string, stayId: string) =>
  (await api<Billable[]>(`/api/hotels/${code}/billable`)).filter((b) => b.stayId === stayId);

/** The next number in the GST series, to say before one is taken. */
export const readSeries = (code: string) =>
  api<Array<{ prefix: string; finYear: string; next: string }>>(`/api/hotels/${code}/invoice-series`);

export interface ListItem { id: string; label: string; active: boolean }
/** The hotel's ready reasons for a correction (D27-260). */
export const readReasons = async (code: string) =>
  (await api<ListItem[]>(`/api/hotels/${code}/lists/reason_correction`)).filter((r) => r.active);

/** What the desk may add from the hotel's list (065): those with a price. */
export const readChargeList = async (code: string) =>
  (await api<{ inclusions: Array<{ id: string; name: string; rate: number | null; category: string }> }>(`/api/hotels/${code}/inclusions`))
    .inclusions.filter((i) => i.rate !== null);

/** The rate one charge of this value will really carry, the server's one slab rule. */
export const readRoomRate = (code: string, amount: number) =>
  api<{ rate: number | null }>(`/api/hotels/${code}/tax/room/rate?amount=${encodeURIComponent(String(amount))}`);

/** A room rate that includes GST, split as the booking keeps it (D27-195). */
export const readBeforeGst = (code: string, gross: number) =>
  api<{ ok: true; pre: number; rate: number; total: number } | { ok: false; reason: string }>(
    `/api/hotels/${code}/tax/room/before-gst?gross=${encodeURIComponent(String(gross))}`);

export const readCompanies = (code: string) =>
  api<Array<{ id: string; name: string; gstin: string | null }>>(`/api/hotels/${code}/billing-companies`);

/* ── Writes ── */


/** POST /stays/:id/payments: what Settle hands the server (data/postings.ts SettleInput). */
export interface PaymentInput {
  method: string; amount: number; businessDate: string;
  pan?: string; form97?: boolean; heldAsCredit?: boolean; folioId?: string;
}
export const takePayment = (code: string, stayId: string, input: PaymentInput) =>
  send("POST", WRITES.payment(code, stayId), input, keys);

export const checkOut = (code: string, stayId: string, late: { lateReason?: string; waiveLate?: boolean }, nextDestination: string) =>
  send("POST", WRITES.checkOut(code, stayId), { ...late, ...(nextDestination ? { nextDestination } : {}) }, keys);

export const issueInvoice = (code: string, stayId: string, folioId: string) =>
  send<{ ok: boolean; number?: string; vatBill?: string | null }>("POST", WRITES.invoice(code, stayId), { folioId }, keys);

export const reverseLine = (code: string, stayId: string, lineId: string, reason: string) =>
  send("POST", WRITES.reverse(code, stayId, lineId), { reason }, keys);

export const editLine = (code: string, stayId: string, lineId: string, edit: { description: string; amount: number; reason: string }) =>
  send("POST", WRITES.edit(code, stayId, lineId), edit, keys);

export const postCharge = (code: string, stayId: string, input: {
  category: string; description: string; amount: number; taxable: boolean; businessDate: string; overLimitReason?: string;
}) => send<{ ok: boolean; data?: { id?: string } }>("POST", WRITES.charge(code, stayId), input, keys);

export const changeRate = (code: string, stayId: string, input: { rate: number; reason: string; includesGst?: boolean }) =>
  send<{ ok: boolean; data?: { corrected: number } }>("POST", WRITES.rate(code, stayId), input, keys);

export const openSecondBill = (code: string, stayId: string, companyId: string) =>
  send("POST", WRITES.secondBill(code, stayId), { billTo: "company", companyId }, keys);

export const moveLine = (code: string, lineId: string, toFolioId: string) =>
  send("POST", WRITES.move(code, lineId), { toFolioId }, keys);
