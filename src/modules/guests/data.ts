import { api, ApiError, send } from "../../core/api";
import { WRITES, type CompanyName, type CompanyRecord, type Guest360, type GuestFound, type GuestRecord, type OffersYes } from "./lookup";

/* ══════════════════════════════════════════════════════════════════
   THE LOOKUP'S CALLS — the web's src/modules/guests/data/directory.ts
   (listGuests, listCompanies), src/modules/contracts/data/contracts.ts
   (listCompanyRecords) and src/modules/crm/data/crm.ts (searchGuests,
   getGuest360, the blacklist and offers), through the core only. The
   servers are api/src/modules/guests/directory.ts and people.ts.

   READS: "no such thing here" (404) is empty, as the web's fetchOr; a 403
   is the server saying no (the role gate, or people.ts's managers-only)
   and comes back as `{ refused }` with its sentence, so the screen shows
   that and nothing else; anything else throws, and is shown as a failed
   read - never as "no guests". Each read is the screen's own: react-query's
   cache, cleared at sign-out (session.tsx), is the only place a guest is
   kept (DPDP).

   WRITES (Guest 360's blacklist and offers, the managers') go through
   `send`. OFFLINE: no /crm path is on the web's list (src/lib/offline.ts),
   so `send` refuses each with the web's sentence and nothing is held. A
   refusal is the server's own words (409 `reason`, 403 `error`). They move
   no money: no keeper.
   ══════════════════════════════════════════════════════════════════ */

const at = (code: string) => `/api/hotels/${encodeURIComponent(code)}`;

export type Refused = { refused: string };
async function read<T>(path: string, empty: T): Promise<T | Refused> {
  try {
    return await api<T>(path);
  } catch (e) {
    if (e instanceof ApiError && e.status === 403) return { refused: e.message };
    if (e instanceof ApiError && e.status === 404) return empty;
    throw e;
  }
}
export const isRefused = (x: unknown): x is Refused => typeof x === "object" && x !== null && "refused" in x;

/** Everyone who has stayed here, by name, as on the property's business date (the web's asOn). */
export const readGuests = (code: string, businessDate: string) =>
  read<GuestRecord[]>(`${at(code)}/guests?asOn=${encodeURIComponent(businessDate)}`, []);

export const readCompanies = (code: string) => read<CompanyRecord[]>(`${at(code)}/companies`, []);

/** The companies on record, for their names alone (which rows have a record,
    and the ones with no booking here). The record carries credit and contact
    details the phone never shows: only id and name are kept. A failed read
    leaves the bookings' rows alone, as the web's second query does. */
export async function readCompanyNames(code: string): Promise<CompanyName[]> {
  const rows = await api<Array<{ id: string; name: string }>>(`${at(code)}/company-records`);
  return rows.map((r) => ({ id: r.id, name: r.name }));
}

/** Guest 360's search: from two letters of a name, or a whole phone or email. */
export const searchGuests = async (code: string, q: string) =>
  read<{ guests: GuestFound[] }>(`${at(code)}/crm/guests?q=${encodeURIComponent(q.trim())}`, { guests: [] });

/** One guest, across the group; null: no such guest (the link may be old). */
export const readGuest360 = (code: string, id: string) =>
  read<Guest360 | null>(`${at(code)}/crm/guests/${encodeURIComponent(id)}`, null);

/** The phones and emails that said yes to offers, as keys (D25-39). */
export const readOffersYes = (code: string) => api<OffersYes>(`${at(code)}/crm/offers-yes`);

/* ── Writes (the owner, an administrator, the GM) ── */

/** D21-21: a reason is required; the desk is shown it at the next booking. */
export const blacklist = (code: string, id: string, reason: string) =>
  send<{ ok: true; guest: string }>("POST", WRITES.blacklist(code, id), { reason });
export const clearBlacklist = (code: string, id: string) => send<{ ok: true; guest: string }>("DELETE", WRITES.blacklist(code, id));

type Contact = { phone: string | null; email: string | null };
/** D21-22: against the phone and email themselves, at every hotel. */
export const recordNoOffers = (code: string, contact: Contact) => send<{ ok: true }>("POST", WRITES.noOffers(code), contact);
export const clearNoOffers = (code: string, id: string) => send<{ ok: true }>("DELETE", WRITES.noOffer(code, id));
/** D25-39: the guest's yes, which takes away a no. */
export const recordOffersYes = (code: string, contact: Contact) => send<{ ok: true }>("POST", WRITES.offersYes(code), contact);
