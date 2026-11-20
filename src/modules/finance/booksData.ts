import { keyKeeper, type KeyKeeper } from "../../core/keys";
import { api, currentSubject, orNull, send } from "../../core/api";
import type { Stay } from "../../core/types";
import {
  BOOK_READS, BOOK_WRITES, groupBills, openFolios, type BillableRow, type FolioRow, type InvoiceDetail, type IssuedInvoice,
  type IssuedVatBill, type PaymentRow, type SeriesState, type VatBillDetail,
} from "./books";

/* ══════════════════════════════════════════════════════════════════
   FOLIOS, INVOICES, PAYMENTS — THE READS AND WRITES, through the core only:
   the web's src/modules/finance/data/folios.ts (listOpenFolios,
   listGroupBills), data/billing.ts (listPayments, listBillable,
   getInvoiceSeries, listInvoices, listVatBills, getInvoice, getVatBill,
   issueCreditNote, cancelVatBill). A 404 is "none here" (the web's
   fetchOr); any other refusal is the server's sentence. Nothing is added,
   taxed or rounded here. Issuing a tax invoice is data.ts's `issueInvoice`,
   imported, so it carries the stay's own key keeper (MFIN-1).
   ══════════════════════════════════════════════════════════════════ */

const H = (code: string) => `/api/hotels/${code}`;
const or = async <T>(path: string, empty: T) => (await orNull<T>(path)) ?? empty;

/** The open bills of the stays that owe, and the groups' master bills - one
    read of GET /folios for both (the web reads it twice), and the stays
    that owe (GET /stays?owing=1, D27-387). */
export async function readFolios(code: string) {
  const [folios, stays] = await Promise.all([
    or<FolioRow[]>(`${H(code)}/folios`, []),
    or<Stay[]>(`${H(code)}/stays?owing=1`, []),
  ]);
  return { rows: openFolios(folios, stays), groups: groupBills(folios) };
}

/** Every receipt against a folio, newest first; reversed ones stay. */
export const readPayments = (code: string) => or<PaymentRow[]>(`${H(code)}/payments`, []);

/** Departed stays' bills, the series, the numbers issued, the VAT bills. */
export async function readInvoices(code: string) {
  const [billable, series, issued, vat] = await Promise.all([
    or<BillableRow[]>(`${H(code)}/billable`, []),
    or<SeriesState[]>(`${H(code)}/invoice-series`, []),
    or<IssuedInvoice[]>(`${H(code)}/invoices`, []),
    or<IssuedVatBill[]>(`${H(code)}/vat-bills`, []),
  ]);
  return { billable, series, issued, vat };
}

/** One keeper per document (core/keys.ts): a credit note or a cancellation
    tapped again after a lost reply, before the document could be read, keeps
    its key; once the document is read again it is forgotten. The server
    also answers a repeat with the one already made (invoices.ts: "duplicate"). */
const keepers = new Map<string, KeyKeeper>();
const keysOf = (code: string, kind: string, number: string) => {
  const id = `${code}/${kind}/${number}`;
  let k = keepers.get(id);
  if (!k) { k = keyKeeper({ who: currentSubject }); keepers.set(id, k); }
  return k;
};

/** A tax invoice or credit note; null when there is none of that number. */
export async function readInvoice(code: string, number: string) {
  const keys = keysOf(code, "invoice", number);
  const started = keys.mark();
  const d = await orNull<InvoiceDetail>(BOOK_READS.invoice(code, number));
  keys.seen(started);
  return d;
}

export async function readVatBill(code: string, number: string) {
  const keys = keysOf(code, "vat", number);
  const started = keys.mark();
  const d = await orNull<VatBillDetail>(BOOK_READS.vatBill(code, number));
  keys.seen(started);
  return d;
}

/* ── Writes: refused offline by the web's tiers (books.check.ts) ── */

type Made = { ok: boolean; number?: string; duplicate?: boolean; reason?: string };

/** A credit note against a tax invoice, with the reason the server requires. */
export const issueCreditNote = (code: string, number: string, reason: string) =>
  send<Made>("POST", BOOK_WRITES.creditNote(code, number), { reason }, keysOf(code, "invoice", number));

/** A VAT bill's cancellation: a bill of its own from the VAT series. */
export const cancelVatBill = (code: string, number: string, reason: string) =>
  send<Made>("POST", BOOK_WRITES.cancelVat(code, number), { reason }, keysOf(code, "vat", number));
