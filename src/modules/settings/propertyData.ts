import { api, ApiError, currentSubject, send } from "../../core/api";
import { keyKeeper, type KeyKeeper } from "../../core/keys";
import type {
  Amenity, Commissioning, GroupOffice, GroupRead, ImportsView, PropertyDetail, PropertyProfile, ProfileField,
  Registration, SetupView, StepChoice, StepId, TextKind,
} from "./propertyRules";

/* ══════════════════════════════════════════════════════════════════
   SETTINGS → PROPERTY'S CALLS (lane P) — the web's src/modules/admin/
   data/property.ts, admin.ts (getPropertyDetail, amendProperty, setFssai),
   commissioning.ts, groupSettings.ts, gallery.ts, setup.ts and oldSystem.ts,
   through the core only. The routes: api/src/modules/admin/property.ts,
   admin.ts, groupSettings.ts, gallery.ts, setup.ts, oldSystem.ts.

   WHO (roleGate.ts): every read here is `anyone` but the setup steps
   (`setting` view), the checklist (`room_config` view), a property's detail
   (app.require_hotel_admin) and the imports (the owner or an Admin,
   app.imports_old_data). The writes are `room_config` edit ("Changing the
   property's profile", "… the hotel's logo", "… the hotel's photos",
   "… the group's name / logo / office details", "Changing the hotel's
   setup", "Setting the FSSAI licence number") with app.manages_hotel behind
   them; the amenities LIST the owner or an Admin (app.keeps_amenities); a
   property's details app.manages_hotel, its name a group administrator.

   OFFLINE: none of these writes is on the web's list (src/lib/offline.ts),
   so `send` refuses each one with the web's sentence and holds nothing.
   KEYS: these routes read no idempotency key, so what stops a repeat after a
   lost reply is the page (propertyRules `doubt`); a keeper per page all the
   same, let go at each read, so the key is right once the PMS honours it.
   ══════════════════════════════════════════════════════════════════ */

const H = (code: string) => `/api/hotels/${encodeURIComponent(code)}`;
const enc = encodeURIComponent;
type Done = { ok: true };

const keepers = new Map<string, KeyKeeper>();
const keysOf = (what: string) => {
  let k = keepers.get(what);
  if (!k) { k = keyKeeper({ who: currentSubject }); keepers.set(what, k); }
  return k;
};
/** A page's read: its kept keys let go once it is back (keys.ts `seen`). */
async function read<T>(page: string, fn: () => Promise<T>): Promise<T> {
  const keys = keysOf(page);
  const started = keys.mark();
  const answer = await fn();
  keys.seen(started);
  return answer;
}
/** The web's "null, not an error worth a screen" readers (getPropertyDetail, getCommissioning). */
const orNothing = <T>(p: Promise<T>): Promise<T | null> => p.catch(() => null);

/* ── Reads, one per page (the page's doubt lifts on it) ───────────── */

export const readProfilePage = (code: string) => read(`${code} profile`, () => Promise.all([
  orNothing(api<Commissioning>(`${H(code)}/commissioning`)),
  orNothing(api<PropertyDetail>(`/api/admin/hotels/${enc(code)}`)),
  api<PropertyProfile>(`${H(code)}/property-profile`),
]));
export const readTexts = (code: string, page: string) => read(`${code} ${page}`, () => api<PropertyProfile>(`${H(code)}/property-profile`));
export const readPolicies = (code: string) => read(`${code} policies`, () => Promise.all([
  api<PropertyProfile>(`${H(code)}/property-profile`),
  orNothing(api<PropertyDetail>(`/api/admin/hotels/${enc(code)}`)),
]));
export const readAmenities = (code: string) =>
  read(`${code} amenities`, () => api<{ amenities: Amenity[]; mayKeep: boolean }>(`${H(code)}/amenities`));
export const readGroup = (code: string, page: string) => read(`${code} ${page}`, () => api<GroupRead>(`${H(code)}/group`));
export const readPhotos = (code: string) => read(`${code} photos`, () => Promise.all([
  api<GroupRead>(`${H(code)}/group`),
  api<{ photos: { id: string; caption: string | null; width: number; height: number }[]; most: number }>(`${H(code)}/gallery`),
]));
/** One photo, as the server kept it (a JPEG), for an Image. */
export const photoUri = async (code: string, id: string) => {
  const p = await api<{ type: string; data: string }>(`${H(code)}/gallery/${enc(id)}`);
  return `data:${p.type};base64,${p.data}`;
};
export const readSetup = (code: string) => read(`${code} setup`, () => api<SetupView>(`${H(code)}/setup`));
/** GET /imports: a refusal (403) is the page's answer, in the server's words (getImports). */
export const readImports = (code: string) => read(`${code} old-data`, async (): Promise<ImportsView> => {
  try {
    return await api<ImportsView>(`${H(code)}/imports`);
  } catch (e) {
    if (e instanceof ApiError && e.status === 403) return { may: false, reason: e.message };
    throw e;
  }
});

/* ── Profile ──────────────────────────────────────────────────────── */

/** PATCH /api/admin/hotels/:code: blank clears a profile field; the name a group administrator's. */
export const amendProperty = (code: string, input: Partial<Record<"name" | "city" | "state" | "gstin" | "phone" | "email" | "addressLine" | ProfileField, string>> & { housePolicies?: string[] }, page: string) =>
  send<Done>("PATCH", `/api/admin/hotels/${enc(code)}`, input, keysOf(`${code} ${page}`));
export const setFssai = (code: string, fssai: string) =>
  send<{ fssaiNumber: string | null }>("PUT", `${H(code)}/fssai`, { fssai }, keysOf(`${code} profile`));
export const saveRegistrations = (code: string, registrations: Registration[]) =>
  send<Done>("PUT", `${H(code)}/registrations`, { registrations }, keysOf(`${code} profile`));

/* ── Texts, child ages ────────────────────────────────────────────── */

export const saveText = (code: string, kind: TextKind, body: string, page: string) =>
  send<Done>("PUT", `${H(code)}/texts/${kind}`, { body }, keysOf(`${code} ${page}`));
export const saveChildAges = (code: string, free: number | string | null, max: number | string | null) =>
  send<Done>("PUT", `${H(code)}/child-ages`, { free, max }, keysOf(`${code} policies`));

/* ── Amenities ────────────────────────────────────────────────────── */

const A = (code: string) => keysOf(`${code} amenities`);
export const switchAmenity = (code: string, id: string, on: boolean) => send<Done>("PUT", `${H(code)}/amenities/${enc(id)}`, { on }, A(code));
export const addAmenity = (code: string, name: string) => send<Done & { id: string }>("POST", `${H(code)}/amenities`, { name }, A(code));
export const changeAmenity = (code: string, id: string, change: { name?: string; isActive?: boolean }) =>
  send<Done>("PATCH", `${H(code)}/amenities/${enc(id)}`, change, A(code));
export const orderAmenities = (code: string, ids: string[]) => send<Done>("PUT", `${H(code)}/amenities/order`, { ids }, A(code));
export const removeAmenity = (code: string, id: string) => send<Done>("DELETE", `${H(code)}/amenities/${enc(id)}`, undefined, A(code));

/* ── Logos, the group, the gallery ─────────────────────────────────── */

export const removeHotelLogo = (code: string) => send<Done>("DELETE", `${H(code)}/logo`, undefined, keysOf(`${code} photos`));
export const setGroupName = (code: string, name: string) =>
  send<{ ok: true; name: string | null }>("PUT", `${H(code)}/group/name`, { name }, keysOf(`${code} group`));
export const removeGroupLogo = (code: string) => send<Done>("DELETE", `${H(code)}/group/logo`, undefined, keysOf(`${code} group`));
export const setGroupOffice = (code: string, office: Record<keyof GroupOffice, string>) =>
  send<Done>("PUT", `${H(code)}/group/office`, office, keysOf(`${code} group`));
const G = (code: string) => keysOf(`${code} photos`);
export const captionPhoto = (code: string, id: string, caption: string) => send<Done>("PATCH", `${H(code)}/gallery/${enc(id)}`, { caption }, G(code));
export const orderPhotos = (code: string, ids: string[]) => send<Done>("PUT", `${H(code)}/gallery/order`, { ids }, G(code));
export const removePhoto = (code: string, id: string) => send<Done>("DELETE", `${H(code)}/gallery/${enc(id)}`, undefined, G(code));

/* ── Set up this hotel, Bring in old data ─────────────────────────── */

export const chooseStep = (code: string, id: StepId, choice: StepChoice) =>
  send<Done>("PUT", `${H(code)}/setup/${id}`, choice, keysOf(`${code} setup`));
export const undoImport = (code: string, id: string) =>
  send<Done>("POST", `${H(code)}/imports/${enc(id)}/undo`, {}, keysOf(`${code} old-data`));
