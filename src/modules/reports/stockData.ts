import { api, ApiError } from "../../core/api";
import { outcomeOf, queryText, type Outcome, type ReportDoc, type StockReportKey } from "./stockReports.ts";

/* The reads of the store, bar and supplier reports (lane m13-rep-stock). Read
   only: nothing here writes, so nothing is held or queued offline.

   GET /api/hotels/:code/reports/<key>?asOn&month&from&supplier - the web's
   getReport (src/modules/reports/data/document.ts). Who may: roleGate.ts
   STORE_REPORTS ("Reading the store's reports": `stock` export, the hotel
   manager and the viewer too) for the Store, equipment, Bar stock and FLR
   reports; SUPPLIER_DUES ("Reading what is owed to suppliers": `invoice`
   approve) for Supplier dues and the statement. Bar stock and the two FLR
   registers are refused where the property's Bar stock is switched off
   (documents.ts, BAR_STOCK_OFF). A refusal comes back as the server's
   sentence, a 404 as "no report"; nothing arriving or a 5xx throws, so the
   screen says the read failed (stockReports.ts outcomeOf). */
export async function readStockReport(code: string, key: StockReportKey, query: Record<string, string>): Promise<Outcome> {
  try {
    return { doc: await api<ReportDoc>(`/api/hotels/${code}/reports/${key}?${queryText(query)}`) };
  } catch (e) {
    const known = e instanceof ApiError ? outcomeOf(e.status, e.message) : null;
    if (known) return known;
    throw e;
  }
}

/** The supplier statement's list (Ledgers.tsx SupplierStatementPage): GET
    /purchasing/dues, whose `suppliers` are the hotel's active suppliers. Who:
    purchasing/supplierDues.ts DUES_ROLES - its refusal is its own sentence. */
export interface SupplierChoice { id: string; name: string }
export type SupplierList = { suppliers: SupplierChoice[] } | { refused: string };
export async function readSuppliers(code: string): Promise<SupplierList> {
  try {
    const body = await api<{ suppliers: SupplierChoice[] }>(`/api/hotels/${code}/purchasing/dues`);
    return { suppliers: body.suppliers };
  } catch (e) {
    if (e instanceof ApiError && e.status >= 400 && e.status < 500) return { refused: e.message };
    throw e;
  }
}
