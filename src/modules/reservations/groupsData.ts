import { api, ApiError, currentSubject, orNull, send } from "../../core/api";
import { keyKeeper, type KeyKeeper } from "../../core/keys";
import type { GroupDetail, Scope, StayGroup } from "./groupsRules";
import type { Waitlist, WaitlistInput } from "./waitlistRules";

/* ══════════════════════════════════════════════════════════════════
   GROUPS' AND THE WAITLIST'S READS AND WRITES — the web's calls, one file:
     src/modules/reservations/data/groups.ts    listGroups, getGroup,
                                                openMasterFolio, setGroupLead,
                                                routeRoomToGroup
     src/modules/finance/data/postings.ts       settleGroupBill
     src/modules/finance/data/billing.ts        issueGroupInvoice
     src/modules/reservations/data/waitlist.ts  listWaitlist, addToWaitlist,
                                                removeFromWaitlist
     src/modules/inventory/data/rates.ts        getInventory (the room types)
   Writes only through `send`; every one is REFUSED offline by the web's tiers
   (core/offline.ts: the payment and the invoice by name, routing as "This
   change", the rest unlisted), in the web's sentence, and nothing is held.
   Nothing is added, taxed or rounded here.
   ══════════════════════════════════════════════════════════════════ */

const H = (code: string) => `/api/hotels/${code}`;

/** GET /groups?scope= (stays.ts): 404 is none, as the web's listGroups. */
export async function readGroups(code: string, scope: Scope) {
  try {
    return await api<StayGroup[]>(`${H(code)}/groups?scope=${scope}`);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return [];
    throw e;
  }
}

/** One keeper per group's master bill (MFIN-1, core/keys.ts): a payment tapped
    again after a lost reply, before the group could be read, keeps its key, so
    the server (POST /groups/:id/payments reads the key) takes it once. Once the
    group is read again the person sees what was taken, and a repeat is new. */
const keepers = new Map<string, KeyKeeper>();
const keysOf = (code: string, groupId: string) => {
  const id = `${code}/${groupId}`;
  let k = keepers.get(id);
  if (!k) { k = keyKeeper({ who: currentSubject }); keepers.set(id, k); }
  return k;
};

/** GET /groups/:id. "No such group." comes back as a 409 (groups.ts): null, as a 404. */
export async function readGroup(code: string, groupId: string): Promise<GroupDetail | null> {
  const keys = keysOf(code, groupId);
  const started = keys.mark();
  const g = await orNull<GroupDetail>(`${H(code)}/groups/${encodeURIComponent(groupId)}`, [409]);
  keys.seen(started);
  return g;
}

/** Opens the host's account; a second call answers with the one already open (groups.ts). */
export const openHostAccount = (code: string, groupId: string) =>
  send<{ ok: true; id: string; created: boolean }>("POST", `${H(code)}/groups/${groupId}/master`, {}, keysOf(code, groupId));

/** Makes this room the group's lead (D22-52). Setting the same lead again changes nothing. */
export const setLead = (code: string, groupId: string, reservationId: string) =>
  send<{ ok: true; guest: string }>("POST", `${H(code)}/groups/${groupId}/lead`, { reservationId }, keysOf(code, groupId));

/** Whether this room's charge goes to the host: a setting, the same value twice is the same. */
export const routeRoom = (code: string, groupId: string, stayId: string, toGroup: boolean) =>
  send<{ ok: true; routed: boolean }>("POST", `${H(code)}/stays/${stayId}/routing`, { toGroup }, keysOf(code, groupId));

/** What Settle hands the server for the master bill (finance's SettleInput, cut). */
export interface GroupPayment {
  method: string; amount: number; businessDate: string;
  pan?: string; form97?: boolean; heldAsCredit?: boolean; overLimitReason?: string;
}
export const settleHost = (code: string, groupId: string, input: GroupPayment) =>
  send<{ ok: true; data?: { id: string; roundOff?: number } }>("POST", `${H(code)}/groups/${groupId}/payments`, input, keysOf(code, groupId));

/** The tax invoice of the master bill. Asked again, the server answers with the
    one already standing (`duplicate`, invoices.ts issueFolioInvoice). */
export const issueHostInvoice = (code: string, groupId: string) =>
  send<{ ok: boolean; number?: string; duplicate?: boolean }>("POST", `${H(code)}/groups/${groupId}/invoice`, undefined, keysOf(code, groupId));

/** The next number in the GST series, said before one is taken (IssueInvoiceDialog). */
export { readSeries } from "../finance/data";

/* ── The waitlist ── */

export const readWaitlist = (code: string) => api<Waitlist>(`${H(code)}/waitlist`);

/** The room types, from the inventory grid as the web reads them (no window: the
    server's own). Unreadable is none, as the web's getInventory. */
export const readTypes = (code: string) =>
  api<{ cells: Array<{ roomTypeId: string; roomType: string }> }>(`${H(code)}/inventory?`).then((r) => r.cells).catch(() => null);

/** POST /waitlist reads no key: a repeat makes a second entry (the screen stops it on an unknown outcome). */
export const addToWaitlist = (code: string, input: WaitlistInput) =>
  send<{ ok: true; id: string }>("POST", `${H(code)}/waitlist`, input);

/** Safe to repeat: a second answers "That guest is no longer on the waitlist." */
export const removeFromWaitlist = (code: string, id: string, reason: string) =>
  send<{ ok: true }>("POST", `${H(code)}/waitlist/${id}/remove`, { reason });
