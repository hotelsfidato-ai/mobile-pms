import { whyNot } from "../inventory/roles";

/* ══════════════════════════════════════════════════════════════════
   WHO MAY READ AND KEEP CONTRACTS. The API decides (AGENTS rule 1); the
   sentences are its own, from api/src/roleGate.ts (19 Nov):
     GET  /company-records, /companies/:id/contracts   see("company", "companies")
     POST /companies          grant("company", "create", "Adding a company")  (C-7: reception too, without credit)
     PATCH /companies/:id     grant("company", "edit", "Changing a company")
     POST, PUT /contracts     grant("company", "edit", "Setting a company's contract")
     POST /allotments         grant("company", "edit", "Holding rooms in an allotment")
     PUT  /allotments/:id     grant("company", "edit", "Changing an allotment")
   Read and Add come from the guests module (the same gate, the same words:
   src/modules/guests/roles.ts); the keepers' grants are asked of the core's
   matrix through inventory's port of refusalFor (imported, never edited).
   The web hides a keeper's buttons from everyone else; the phone draws them
   greyed with the API's sentence (AGENTS rule 1). No API runs in the cloud,
   so these were read from the PMS's code, not from a refused request.
   ══════════════════════════════════════════════════════════════════ */

export { whyNotAddCompany, whyNotCompanies as whyNotContracts } from "../guests/roles";

const keep = (doing: string) => (role: string | null) => whyNot({ resource: ["company"], action: "edit", doing }, role);
export const whyNotChangeCompany = keep("Changing a company");
export const whyNotSetContract = keep("Setting a company's contract");
export const whyNotHold = keep("Holding rooms in an allotment");
export const whyNotChangeAllotment = keep("Changing an allotment");

/** contracts.ts: credit is given by the three; reception adds a company without it (C-7). */
export const CREDIT_KEEPERS = "Credit is given by the owner, an administrator or the general manager.";
