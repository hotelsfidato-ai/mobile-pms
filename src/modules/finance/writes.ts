/* ══════════════════════════════════════════════════════════════════
   THE BILL'S WRITES, BY ADDRESS — every path data.ts sends to, in one
   place, so writes.check.ts can prove each is REFUSED offline by the web's
   tiers (core offline.ts) with the web's own sentence: money is never held
   on the phone to be sent later (AGENTS rule 6, M-1). The routes are the
   API's (api/src/modules/finance/postings.ts, folios.ts, invoices.ts,
   front-desk/operations.ts), as data.ts already called them.
   Pure: no React Native here, so the check runs under node.
   ══════════════════════════════════════════════════════════════════ */

const stay = (code: string, stayId: string) => `/api/hotels/${code}/stays/${stayId}`;

export const WRITES = {
  /** POST: take a payment (Settle). */
  payment: (code: string, stayId: string) => `${stay(code, stayId)}/payments`,
  /** POST: check the guest out. */
  checkOut: (code: string, stayId: string) => `${stay(code, stayId)}/check-out`,
  /** POST: a second bill for a company. */
  secondBill: (code: string, stayId: string) => `${stay(code, stayId)}/folios`,
  /** POST: the tax invoice of a departed stay. */
  invoice: (code: string, stayId: string) => `${stay(code, stayId)}/invoice`,
  /** POST: add a charge. */
  charge: (code: string, stayId: string) => `${stay(code, stayId)}/charges`,
  /** POST: reverse a line. */
  reverse: (code: string, stayId: string, lineId: string) => `${stay(code, stayId)}/charges/${lineId}/reverse`,
  /** POST: correct a charge (D27-157). */
  edit: (code: string, stayId: string, lineId: string) => `${stay(code, stayId)}/charges/${lineId}/edit`,
  /** POST: change the stay's rate. */
  rate: (code: string, stayId: string) => `${stay(code, stayId)}/rate`,
  /** POST: move a line to the stay's other bill. */
  move: (code: string, lineId: string) => `/api/hotels/${code}/postings/${lineId}/transfer`,
} as const;
