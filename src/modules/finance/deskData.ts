import { keyKeeper, type KeyKeeper } from "../../core/keys";
import { api, currentSubject, send } from "../../core/api";
import type {
  CashDeposits, CashierDrawerView, CompanyPaymentsView, FilingKind, FormCRegister, ReportDoc, SupplierDues,
} from "./desk";

/* ══════════════════════════════════════════════════════════════════
   THE FINANCE DESK'S READS AND WRITES — the web's data files, through the
   core only (finance/data/cashier.ts, deposits.ts, companyPayments.ts;
   guests/data/formC.ts; purchasing/data/purchasing.ts; reports' getReport).
   Every write goes through `send()`: offline it is refused by the web's
   tiers (core offline.ts: /cashier-shift is a Payment's, /form-c "This
   change", the rest unlisted), nothing held. The server's refusal (409 or
   403, `reason`) comes back as an ApiError in its own words.
   KEYS (MFIN-1): one keeper per screen per hotel. None of these routes
   reads an idempotency key today, so the screens also stop a write whose
   outcome is unknown (core useStuck, MEMORY 16) until the record is read
   again; the keeper is there for the day the server does read it.
   ══════════════════════════════════════════════════════════════════ */

const H = (code: string) => `/api/hotels/${code}`;

const keepers = new Map<string, KeyKeeper>();
const keysOf = (code: string, what: string) => {
  const id = `${code}/${what}`;
  let k = keepers.get(id);
  if (!k) { k = keyKeeper({ who: currentSubject }); keepers.set(id, k); }
  return k;
};
/** A read that lets its keeper forget what is now seen. */
async function seen<T>(code: string, what: string, read: () => Promise<T>): Promise<T> {
  const keys = keysOf(code, what);
  const started = keys.mark();
  const out = await read();
  keys.seen(started);
  return out;
}

/* ── Cashiering ── */
export const readDrawer = (code: string) => seen(code, "drawer", () => api<CashierDrawerView>(`${H(code)}/cashier-shift`));
const drawer = <T = { ok: true }>(code: string, path: string, body: unknown) =>
  send<T>("POST", `${H(code)}/cashier-shift/${path}`, body, keysOf(code, "drawer"));
export const openDrawer = (code: string, opening: number) => drawer(code, "open", { opening });
export const countDrawer = (code: string, body: { denominations: { value: number; count: number }[] }) =>
  drawer<{ ok: true; counted: number }>(code, "count", body);
export const recordMovement = (code: string, body: { kind: string; amount: number; reason: string; category?: string }) =>
  drawer<{ ok: true; id?: string }>(code, "movements", body);
export const closeDrawer = (code: string, body: { varianceReason: string; handOverTo: string | null; keptCash: number }) =>
  drawer<{ ok: true; variance: number; toDeposit: number }>(code, "close", body);

/* ── Cash deposits ── */
export const readDeposits = (code: string) => seen(code, "deposits", () => api<CashDeposits>(`${H(code)}/cash-deposits`));
const deposit = (code: string, path: string, body: unknown) =>
  send<{ ok: true; id?: string }>("POST", `${H(code)}/cash-deposits${path}`, body, keysOf(code, "deposits"));
export const recordDeposit = (code: string, body: { businessDate: string; amount: number; depositedOn: string; bank: string; slipNo: string }) =>
  deposit(code, "", body);
export const reverseDeposit = (code: string, id: string, reason: string) => deposit(code, `/${id}/reverse`, { reason });
export const verifyDeposit = (code: string, id: string) => deposit(code, `/${id}/verify`, {});
export const explainDay = (code: string, date: string, reason: string) => deposit(code, `/days/${date}/explain`, { reason });

/* ── Company accounts ── */
/** The City ledger report for the period (Billing.tsx: the month of the business date to it). */
export const readLedger = (code: string, from: string, asOn: string) =>
  api<ReportDoc>(`${H(code)}/reports/city-ledger?asOn=${asOn}&from=${from}`);
export const readCompanyPayments = (code: string) =>
  seen(code, "company-payments", () => api<CompanyPaymentsView>(`${H(code)}/company-payments`));
export const recordCompanyPayment = (code: string, body: object) =>
  send<{ ok: true; id?: string }>("POST", `${H(code)}/company-payments`, body, keysOf(code, "company-payments"));
export const reverseCompanyPayment = (code: string, id: string, reason: string) =>
  send<{ ok: true }>("POST", `${H(code)}/company-payments/${id}/reverse`, { reason }, keysOf(code, "company-payments"));

/* ── Form III ── */
export const readFormC = (code: string) => seen(code, "form-c", () => api<FormCRegister>(`${H(code)}/form-c`));
export const recordFiling = (code: string, reservationId: string, body: { reference: string; kind: FilingKind; guestId?: string }) =>
  send<{ ok: true; reference: string }>("POST", `${H(code)}/form-c/${reservationId}`, body, keysOf(code, "form-c"));
export const completeDetails = (code: string, reservationId: string, body: object) =>
  send<{ ok: true }>("PUT", `${H(code)}/form-c/${reservationId}/details`, body, keysOf(code, "form-c"));

/* ── Supplier dues ── */
export const readDues = (code: string) => seen(code, "dues", () => api<SupplierDues>(`${H(code)}/purchasing/dues`));
/** The Supplier dues report on the same day: its total rows are the server's sums. */
export const readDuesReport = (code: string, day: string) =>
  api<ReportDoc>(`${H(code)}/reports/supplier-dues?asOn=${day}&from=${day}`);
const dues = (code: string, path: string, body: unknown) =>
  send<{ ok: true }>("POST", `${H(code)}/purchasing/dues/${path}`, body, keysOf(code, "dues"));
export const paySupplier = (code: string, billId: string, body: object) => dues(code, `${billId}/payment`, body);
export const addCreditNote = (code: string, body: object) => dues(code, "credit-notes", body);
export const reverseDueEntry = (code: string, body: object) => dues(code, "reverse", body);
