import { api, send, type HotelsResponse } from "../../core/api";
import { listPath, type DeskRules, type FrontDeskHours, type Holiday, type ListItem, type ListSource } from "./listsRules";

/* ══════════════════════════════════════════════════════════════════
   SETTINGS › LISTS AND FRONT DESK — the calls (lane m13-set-lists),
   ported from src/modules/front-desk/data/lists.ts, operations.ts
   saveDeskRules and inventory/data/roomSetup.ts amendFrontDesk. Reads
   through `api`, writes through `send` (the web's offline tiers: every
   one of these is refused offline, "This cannot be done offline yet").
   The server answers a refusal 409 { ok: false, reason }: `send` throws
   it as an ApiError with the server's sentence. None of these routes
   reads an idempotency key (the page's stop is the core's book: lists.ts pageName).

   Who (api/src/roleGate.ts): every read below is `anyone` at the hotel
   (GET room-setup is SETUP, room_config view); every write is
   SETUP_CHANGE, room_config edit - the owner, an administrator or the
   GM. The VIP levels' rows also ask app.sets_group_settings (192), the
   same three at any hotel; PATCH /front-desk's night audit time asks the
   owner or an administrator.
   ══════════════════════════════════════════════════════════════════ */

const H = (code: string) => `/api/hotels/${encodeURIComponent(code)}`;
type Saved = { ok: true; id?: string };

/* ── The lists, and the group's VIP levels ───────────────────────── */

export const readList = (code: string, source: ListSource) => api<ListItem[]>(listPath(code, source));
export const addToList = (code: string, source: ListSource, item: { label: string; colour?: string | null }) =>
  send<Saved>("POST", listPath(code, source), item);
export const changeListItem = (code: string, source: ListSource, id: string, change: Partial<Omit<ListItem, "id">>) =>
  send<Saved>("PATCH", `${listPath(code, source)}/${encodeURIComponent(id)}`, change);
export const removeListItem = (code: string, source: ListSource, id: string) =>
  send<Saved>("DELETE", `${listPath(code, source)}/${encodeURIComponent(id)}`);

/* ── Holidays ────────────────────────────────────────────────────── */

export const readHolidays = (code: string) => api<Holiday[]>(`${H(code)}/holidays`);
export const addHoliday = (code: string, h: { day: string; name: string; colour?: string | null }) =>
  send<Saved>("POST", `${H(code)}/holidays`, h);
export const removeHoliday = (code: string, id: string) =>
  send<Saved>("DELETE", `${H(code)}/holidays/${encodeURIComponent(id)}`);

/* ── The desk's rules, as GET /api/hotels sends them with the hotel ── */

/** The hotel's rules, read again (the web reads them from its hotel list, fetched again after a save). */
export const readDeskRules = async (code: string) => {
  const who = await api<HotelsResponse>("/api/hotels");
  const hotel = who.hotels.find((h) => h.code === code) as (HotelsResponse["hotels"][number] & { deskRules?: DeskRules }) | undefined;
  return hotel?.deskRules ?? null;
};

/** PATCH /desk-settings (lists.ts saveDeskSettings): only what is sent changes. */
export const saveDeskSettings = (code: string, change: Partial<DeskRules>) =>
  send<Saved>("PATCH", `${H(code)}/desk-settings`, change);

/** PATCH /front-desk: the rules (operations.ts saveDeskRules) or the hours (roomSetup.ts amendFrontDesk). */
export const saveFrontDesk = (code: string, change: object) => send<Saved>("PATCH", `${H(code)}/front-desk`, change);

/** GET /room-setup's frontDesk (inventorySetup.ts): the hours and the two charges. */
export const readHours = async (code: string) => (await api<{ frontDesk: FrontDeskHours }>(`${H(code)}/room-setup`)).frontDesk;
