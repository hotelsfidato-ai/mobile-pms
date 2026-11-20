import { api, ApiError, send } from "../../core/api";
import type { AllotmentInput, CompanyContracts, CompanyInput, CompanyRow, ContractInput } from "./rules";

/* ══════════════════════════════════════════════════════════════════
   CONTRACTS' CALLS — the web's src/modules/contracts/data/contracts.ts,
   through the core only. The server is api/src/modules/contracts/
   contracts.ts and allotments.ts. A 403 on a read is the gate's no:
   `{ refused }` with its sentence; a 404 on a company is "no such company"
   (null). A refusal of a write is the server's own `reason` (409), said
   in the dialog.

   WRITES go through `send`. OFFLINE: no companies, contracts or allotments
   path is on the web's list, so each is refused with the UNLISTED sentence
   and nothing is held (rules.check.ts). None reads an idempotency key and
   none moves money (a contract's prices price the NEXT booking), so no
   keeper. Each sheet takes one tap at a time and cannot be closed while a
   write is on its way; on an outcome nobody knows the COMPANY page greys
   every write (a new sheet included) until a read of the company made
   after that moment has landed (rules.ts stillUnknown, MEMORY 16, MCON-1):
   POST /allotments has no duplicate check, so a retype would hold twice.
   ══════════════════════════════════════════════════════════════════ */

const at = (code: string) => `/api/hotels/${encodeURIComponent(code)}`;

export type Refused = { refused: string };
export const isRefused = (x: unknown): x is Refused => typeof x === "object" && x !== null && "refused" in x;

export async function readCompanyRecords(code: string): Promise<CompanyRow[] | Refused> {
  try {
    return await api<CompanyRow[]>(`${at(code)}/company-records`);
  } catch (e) {
    if (e instanceof ApiError && e.status === 403) return { refused: e.message };
    throw e;
  }
}

/** One company, its contracts and allotments here; null: no such company (an old link). */
export async function readCompanyContracts(code: string, id: string): Promise<CompanyContracts | Refused | null> {
  try {
    return await api<CompanyContracts>(`${at(code)}/companies/${encodeURIComponent(id)}/contracts`);
  } catch (e) {
    if (e instanceof ApiError && e.status === 403) return { refused: e.message };
    if (e instanceof ApiError && e.status === 404) return null;
    throw e;
  }
}

type Saved = { ok: true; id: string };
export const addCompany = (code: string, c: CompanyInput) => send<Saved>("POST", `${at(code)}/companies`, c);
export const saveCompany = (code: string, id: string, c: CompanyInput) => send<Saved>("PATCH", `${at(code)}/companies/${encodeURIComponent(id)}`, c);
export const addContract = (code: string, companyId: string, k: ContractInput) => send<Saved>("POST", `${at(code)}/contracts`, { ...k, companyId });
export const saveContract = (code: string, id: string, k: ContractInput) => send<Saved>("PUT", `${at(code)}/contracts/${encodeURIComponent(id)}`, k);
export const addAllotment = (code: string, input: AllotmentInput) => send<Saved>("POST", `${at(code)}/allotments`, input);
export const saveAllotment = (code: string, id: string, input: AllotmentInput) => send<Saved>("PUT", `${at(code)}/allotments/${encodeURIComponent(id)}`, input);
/** Stop holding: what it holds goes back on sale at once; bookings made from it stand. */
export const stopAllotment = (code: string, id: string) => send<Saved>("PUT", `${at(code)}/allotments/${encodeURIComponent(id)}`, { active: false });
