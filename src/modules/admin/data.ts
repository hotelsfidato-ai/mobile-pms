import { api, currentSubject, send } from "../../core/api";
import { keyKeeper, type KeyKeeper } from "../../core/keys";
import {
  queryOf, staffRecord, taxOf,
  type ActivityPage, type AdminProperty, type ApiStaff, type AuditEntry, type BackfillKind, type BackfillView,
  type BankDetails, type HereAnswer, type PeopleList, type Property, type SignIn, type SuAnswer, type SystemHealth,
} from "./rules";

/* ══════════════════════════════════════════════════════════════════
   ADMINISTRATION'S CALLS — the web's src/modules/admin/data/admin.ts,
   adminLists.ts, systemHealth.ts, backfill.ts and src/data/repositories/
   properties.ts (getModules, setModule), through the core only.

   OFFLINE: none of these writes is on the web's list (src/lib/offline.ts),
   so `send` refuses each one with the web's sentence ("This cannot be
   done offline yet…") and holds nothing. Who may do what changes only with
   the line up.

   KEYS: the admin routes read no idempotency key (api/src/server.ts only
   lets it through CORS), so what stops a repeat after a lost reply is the
   screen: on `outcomeUnknown` it takes no more taps until it is closed and
   the list read again (useStuck, MEMORY 16). One keeper per list all the
   same (MFIN-1), forgotten at each read, so the key is right the moment the
   PMS honours it (docs/api-requests.md).
   ══════════════════════════════════════════════════════════════════ */

const H = (code: string) => `/api/hotels/${encodeURIComponent(code)}`;
const enc = encodeURIComponent;

const keepers = new Map<string, KeyKeeper>();
const keysOf = (what: string) => {
  let k = keepers.get(what);
  if (!k) { k = keyKeeper({ who: currentSubject }); keepers.set(what, k); }
  return k;
};
/** A read that lets its list's kept keys go once it is back (keys.ts `seen`). */
async function read<T>(what: string, path: string): Promise<T> {
  const keys = keysOf(what);
  const started = keys.mark();
  const answer = await api<T>(path);
  keys.seen(started);
  return answer;
}

/** A write answers `{ ok: true, warning? }`, or the server's refusal as an ApiError (its `reason`). */
export type Done = { ok: true; warning?: string; existed?: boolean };

/* ── People ──────────────────────────────────────────────────────── */

/** GET /api/admin/staff: row security decides who comes back; each row the server's mayEdit/maySwitch/maySetPassword. */
export const listPeople = async (): Promise<PeopleList> => {
  const body = await read<Partial<PeopleList>>("people", "/api/admin/staff");
  return { staff: body.staff ?? [], rosterAt: body.rosterAt ?? [] };
};
const P = (staffId: string) => `/api/admin/staff/${enc(staffId)}`;
const people = () => keysOf("people");

export const createStaff = (input: { email: string; name: string; password: string; hotelCode?: string; role?: string }) =>
  send<Done & { id: string }>("POST", "/api/admin/staff", input, people());
export const grantAccess = (staffId: string, code: string, role: string) =>
  send<Done>("POST", `${P(staffId)}/access`, { code, role }, people());
export const revokeAccess = (staffId: string, code: string) =>
  send<Done>("DELETE", `${P(staffId)}/access/${enc(code)}`, undefined, people());
export const deactivateStaff = (staffId: string) => send<Done>("POST", `${P(staffId)}/deactivate`, {}, people());
export const reactivateStaff = (staffId: string) => send<Done>("POST", `${P(staffId)}/reactivate`, {}, people());
export const setStaffPassword = (staffId: string, password: string) =>
  send<Done>("POST", `${P(staffId)}/password`, { password }, people());
export const amendStaff = (staffId: string, input: { fullName: string; phone: string }) =>
  send<Done>("PATCH", P(staffId), input, people());
export const setHomeScreen = (staffId: string, homeScreen: string) =>
  send<Done>("PUT", `${P(staffId)}/home-screen`, { homeScreen }, people());
export const switchTwoStepOff = (staffId: string, reason: string) =>
  send<Done>("POST", `${P(staffId)}/two-step/off`, { reason }, people());

/* ── Users ───────────────────────────────────────────────────────── */

/** GET /:code/staff (see("user")): one row per person, a dash for a last-seen nobody recorded. */
export const listStaff = async (code: string) =>
  (await api<ApiStaff[]>(`${H(code)}/staff`)).map(staffRecord);

/* ── Sign-ins and devices ────────────────────────────────────────── */

export const listSignIns = (staffId: string) =>
  read<{ signIns: SignIn[] }>(`sign-ins ${staffId}`, `${P(staffId)}/sign-ins`);
export const signOutDevice = (staffId: string, signInId: string) =>
  send<Done>("POST", `/api/admin/sign-ins/${enc(signInId)}/sign-out`, {}, keysOf(`sign-ins ${staffId}`));

/* ── The two logs ────────────────────────────────────────────────── */

export const listAuditLog = (code: string, q: { who: string; from: string; to: string; offset: number; limit: number }) =>
  api<AuditEntry[]>(`${H(code)}/audit-log${queryOf(q)}`);
export const listActivity = (code: string, q: { scope: string; who: string; kind: string; from: string; to: string; offset: number; limit: number }) =>
  api<ActivityPage & { refused?: string }>(`${H(code)}/activity${queryOf(q)}`);

/* ── Integrations, System health ─────────────────────────────────── */

export const listIntegrations = (code: string) =>
  Promise.all([api<HereAnswer>(`${H(code)}/integrations`), api<SuAnswer>("/api/channel-manager/su")]);
export const getSystemHealth = (code: string) => api<SystemHealth>(`${H(code)}/system-health`);

/* ── Properties ──────────────────────────────────────────────────── */

/** listProperties: each property the person reaches, one request each (as the web); one it may not see is left out. */
export async function listProperties(codes: readonly string[]): Promise<Property[]> {
  const full = await Promise.all(codes.map((c) => api<Property>(H(c)).catch(() => null)));
  return full.filter((p): p is Property => p !== null);
}
/** GET /api/admin/hotels: a group administrator's, every property closed ones included. Refused for
    anybody else, which the web reads as the ordinary cards (listAdminProperties). */
export const listAdminProperties = async (): Promise<AdminProperty[] | null> => {
  try { return (await read<{ hotels: AdminProperty[] }>("properties", "/api/admin/hotels")).hotels; } catch { return null; }
};
export const getTaxInUse = async (code: string) => taxOf(await api<Parameters<typeof taxOf>[0]>(`${H(code)}/tax`));
/** Close, or reopen (a group administrator; the server refuses a close while anybody is checked in). */
export const setPropertyOpen = (code: string, open: boolean) =>
  send<Done>("POST", `/api/admin/hotels/${enc(code)}/${open ? "reopen" : "close"}`, {}, keysOf("properties"));

/* ── Modules ─────────────────────────────────────────────────────── */

export const getModules = async (code: string) =>
  (await read<{ modules: { module: string; enabled: boolean }[] }>(`modules ${code}`, `${H(code)}/modules`)).modules;
export const setModule = (code: string, module: string, enabled: boolean) =>
  send<Done>("POST", `${H(code)}/modules/${enc(module)}`, { enabled }, keysOf(`modules ${code}`));

/* ── Backfill ────────────────────────────────────────────────────── */

export const getBackfill = (code: string) => read<BackfillView>(`backfill ${code}`, `${H(code)}/backfill`);
export const removeBackfill = (code: string, kind: BackfillKind, id: string, reason: string) =>
  send<Done>("POST", `${H(code)}/backfill/${kind}/${enc(id)}/remove`, { reason }, keysOf(`backfill ${code}`));

/* ── Signing in (TwoStep.tsx TwoStepRequiredCard) ────────────────── */

/** GET /api/me/two-step (SELF): where the signed-in person stands, and the group's `required`. */
export const getTwoStep = () =>
  read<{ state: string; on: boolean; recoveryLeft: number | null; required: boolean }>("two-step", "/api/me/two-step");
export const setTwoStepRequired = (required: boolean) =>
  send<Done & { required: boolean }>("PUT", "/api/admin/two-step-required", { required }, keysOf("two-step"));

/* ── Bank details (VoucherSettings.tsx; api/src/modules/admin/bankDetails.ts) ── */

/** `bank` null: none set (the voucher prints none). */
export const getBankDetails = (code: string) => read<{ bank: BankDetails | null }>(`bank ${code}`, `${H(code)}/bank-details`);
export const setBankDetails = (code: string, input: { accountName: string; accountNumber: string; bankName: string; branch: string; ifsc: string; upi: string }) =>
  send<Done>("PUT", `${H(code)}/bank-details`, input, keysOf(`bank ${code}`));
export const removeBankDetails = (code: string) => send<Done>("DELETE", `${H(code)}/bank-details`, undefined, keysOf(`bank ${code}`));
